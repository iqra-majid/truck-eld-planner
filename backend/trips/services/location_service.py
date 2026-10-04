import requests

from django.conf import settings


def get_location_name(coordinates):

    """
    Convert longitude/latitude coordinates into
    a human-readable location with both a full
    name and a short city/state name.
    """

    longitude = coordinates[0]
    latitude = coordinates[1]

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

    return {
        "name": label or "Unknown location",
        "short_name": short_name,
    }