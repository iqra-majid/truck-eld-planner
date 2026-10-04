import requests
from django.conf import settings


def get_route_from_ors(coordinates):
    url = "https://api.heigit.org/openrouteservice/v2/directions/driving-hgv"

    headers = {
        "Authorization": settings.OPENROUTESERVICE_API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "coordinates": coordinates,
        "radiuses": [-1, -1, -1],
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=30,
    )

    if response.status_code != 200:
        try:
            details = response.json()
        except Exception:
            details = response.text

        raise Exception(f"OpenRouteService request failed: {details}")

    return response.json()