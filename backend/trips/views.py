from .services.route_service import parse_route
import requests
from datetime import datetime

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services.ors_service import get_route_from_ors
from .services.eld_service import create_eld_schedule
from .services.location_service import geocode_place

# Autocomplete location
@api_view(["GET"])
def autocomplete_location(request):
    search_text = request.GET.get("text", "").strip()

    if len(search_text) < 2:
        return Response([])

    url = "https://api.openrouteservice.org/geocode/autocomplete"

    params = {
        "text": search_text,
        "boundary.country": "USA",
        "size": 5,
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

        return Response(
            {
                "error": "Location autocomplete failed.",
                "details": details,
            },
            status=response.status_code,
        )

    data = response.json()

    locations = []

    for feature in data.get("features", []):
        locations.append(
            {
                "name": feature["properties"].get("label"),
                "coordinates": feature["geometry"].get("coordinates"),
            }
        )

    return Response(locations)


def thin_geometry(points, max_points=2000):
    if len(points) <= max_points:
        return points
    step = -(-len(points) // max_points)   # round up
    thinned = points[::step]
    if thinned[-1] != points[-1]:
        thinned.append(points[-1])         # keep the real end of the route
    return thinned

def resolve_location(value):
    """Accept typed text, or an object that already has coordinates."""
    if isinstance(value, dict) and value.get("coordinates"):
        return value
    if isinstance(value, dict):
        value = value.get("name")
    if not isinstance(value, str):
        raise ValueError("Please enter all three locations.")
    return geocode_place(value)
 
 
# Plan trip
@api_view(["POST"])
def plan_trip(request):
    # 1. Read the request
    current_location = request.data.get("currentLocation")
    pickup_location = request.data.get("pickupLocation")
    dropoff_location = request.data.get("dropoffLocation")
    cycle_hours_used = request.data.get("cycleHoursUsed")
    start_date_time = request.data.get("startDateTime")
 
    # 2. Check that everything is there
    if not current_location or not pickup_location or not dropoff_location:
        return Response(
            {"error": "Current, pickup, and drop-off locations are required."},
            status=400,
        )
 
    if cycle_hours_used is None or cycle_hours_used == "":
        return Response(
            {"error": "Cycle hours used are required."},
            status=400,
        )
 
    if not start_date_time:
        return Response(
            {"error": "Start date and time are required."},
            status=400,
        )
 
    # 3. Check the cycle hours: a number from 0 to 70
    try:
        cycle_hours_used = float(cycle_hours_used)
    except (TypeError, ValueError):
        return Response(
            {"error": "Cycle hours used must be a number."},
            status=400,
        )
 
    # `not 0 <= x <= 70` also rejects NaN, which `x < 0 or x > 70` would let through
    if not 0 <= cycle_hours_used <= 70:
        return Response(
            {"error": "Cycle hours used must be between 0 and 70."},
            status=400,
        )
 
    # 4. Check the start date and time
    try:
        datetime.fromisoformat(start_date_time)
    except (TypeError, ValueError):
        return Response(
            {"error": "Start date and time must be valid."},
            status=400,
        )
 
    # 5. Find the position of each typed place (3 lookups in total)
    try:
        current_location = resolve_location(current_location)
        pickup_location = resolve_location(pickup_location)
        dropoff_location = resolve_location(dropoff_location)
    except ValueError as error:
        return Response({"error": str(error)}, status=400)
    except RuntimeError as error:
        return Response({"error": str(error)}, status=502)
 
    coordinates = [
        current_location["coordinates"],
        pickup_location["coordinates"],
        dropoff_location["coordinates"],
    ]
 
    # 6. Route and schedule
    try:
        route_response = get_route_from_ors(coordinates)
 
        route = parse_route(
            route_response,
            current_location,
            pickup_location,
            dropoff_location,
        )
 
        eld_data = create_eld_schedule(
            route,
            cycle_hours_used,
            start_date_time,
        )
 
    except Exception as error:
        return Response(
            {"error": str(error)},
            status=502,
        )
 
    return Response(
        {
            "message": "Trip data received successfully.",
            "currentLocation": current_location,
            "pickupLocation": pickup_location,
            "dropoffLocation": dropoff_location,
            "cycleHoursUsed": cycle_hours_used,
            "startDateTime": start_date_time,
            "route": {
                "geometry": thin_geometry(route["geometry"]),
            },
            "schedule": eld_data["schedule"],
            "daily_logs": eld_data["daily_logs"],
        }
    )
 