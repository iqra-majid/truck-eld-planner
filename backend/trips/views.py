from .services.route_service import parse_route
import requests
from datetime import datetime

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services.ors_service import get_route_from_ors
from .services.eld_service import create_eld_schedule

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


# Plan trip
@api_view(["POST"])
def plan_trip(request):
    current_location = request.data.get("currentLocation")
    pickup_location = request.data.get("pickupLocation")
    dropoff_location = request.data.get("dropoffLocation")
    cycle_hours_used = request.data.get("cycleHoursUsed")
    start_date_time = request.data.get("startDateTime")

    if not current_location or not pickup_location or not dropoff_location:
        return Response(
            {"error": "Current, pickup, and drop-off locations are required."},
            status=400,
        )

    if cycle_hours_used is None:
        return Response(
            {"error": "Cycle hours used are required."},
            status=400,
        )

    if start_date_time is None:
        return Response(
            {"error": "Start date and time are required."},
            status=400,
        )


    # Validate cycle hours. 
    try: 
        cycle_hours_used = float(cycle_hours_used)
    except (TypeError, ValueError): 
        return Response( {"error": "Cycle hours used must be a number."}, status=400, )
    if cycle_hours_used < 0 or cycle_hours_used > 70: 
        return Response( {"error": "Cycle hours used must be between 0 and 70."}, status=400, )
    
    # Validate start date and time.
    try:
        datetime.fromisoformat(start_date_time)
    except (TypeError, ValueError):
        return Response( {"error": "Start date and time must be valid."}, status=400, )

    current_coordinates = current_location.get("coordinates")
    pickup_coordinates = pickup_location.get("coordinates")
    dropoff_coordinates = dropoff_location.get("coordinates")

    if not current_coordinates or not pickup_coordinates or not dropoff_coordinates:
        return Response(
            {"error": "All locations must have coordinates."},
            status=400,
        )

    coordinates = [
        current_coordinates,
        pickup_coordinates,
        dropoff_coordinates,
    ]

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
            # "route": {
            #     "geometry": route["geometry"],
            # },
           "schedule": eld_data["schedule"],
           "daily_logs": eld_data["daily_logs"],
        }
    )