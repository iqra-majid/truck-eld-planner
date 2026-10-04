import requests

from django.conf import settings

_reverse_geocode_cache = {}

def get_location_name(coordinates):

    """
    Convert longitude/latitude coordinates into
    a human-readable location with both a full
    name and a short city/state name.
    """

    longitude = coordinates[0]
    latitude = coordinates[1]

    cache_key = (
        round(longitude, 5),
        round(latitude, 5),
    )

    if cache_key in _reverse_geocode_cache:
        return _reverse_geocode_cache[cache_key]

    url = "https://api.heigit.org/pelias/v1/reverse"

    params = {
        "point.lon": longitude,
        "point.lat": latitude,
        "size": 1,
    }

    headers = {
        "Authorization": settings.OPENROUTESERVICE_API_KEY,
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=10,
    )

    if response.status_code != 200:

        try:
            details = response.json()
        except Exception:
            details = response.text

        raise Exception(
            f"Reverse geocoding failed: {details}"
        )

    data = response.json()

    features = data.get("features", [])

    if not features:
        return {
            "name": "Unknown location",
            "short_name": "Unknown location",
        }

    properties = features[0].get(
        "properties",
        {}
    )

    label = properties.get("label")

    locality = properties.get("locality")
    region = properties.get("region_a")
    county = properties.get("county")

    if locality and region:
        short_name = f"{locality}, {region}"

    elif county and region:
        short_name = f"{county}, {region}"

    elif region:
        short_name = region

    else:
        short_name = "Unknown location"

    result = {
        "name": label or "Unknown location",
        "short_name": short_name,
    }

    _reverse_geocode_cache[cache_key] = result

    return result


_geocode_cache = {}

def geocode_place(text):
    """Turn typed text like 'Dallas, TX' into {name, coordinates}."""
    text = (text or "").strip()
    if len(text) < 2:
        raise ValueError("Please enter all three locations.")

    key = text.lower()
    if key in _geocode_cache:
        return _geocode_cache[key]

    response = requests.get(
        "https://api.openrouteservice.org/geocode/search",
        params={"text": text, "boundary.country": "USA", "size": 1},
        headers={"Authorization": settings.OPENROUTESERVICE_API_KEY},
        timeout=10,
    )
    if response.status_code != 200:
        raise RuntimeError("Location search is unavailable right now. Please try again in a minute.")

    features = response.json().get("features", [])
    if not features:
        raise ValueError(f"Could not find '{text}'. Try the format 'City, ST'.")

    feature = features[0]
    place = {
        "name": feature["properties"].get("label") or text,
        "coordinates": feature["geometry"]["coordinates"],
    }
    _geocode_cache[key] = place
    return place