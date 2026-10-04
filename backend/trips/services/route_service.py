from django.conf import global_settings
import polyline


METERS_PER_MILE = 1609.344


def calculate_distance_miles(point_one, point_two):
    """
    Calculate the approximate distance between two nearby
    latitude/longitude points.
    """

    from math import cos, radians, sqrt

    latitude_one, longitude_one = point_one
    latitude_two, longitude_two = point_two

    average_latitude = radians(
        (latitude_one + latitude_two) / 2
    )

    latitude_distance = latitude_two - latitude_one

    longitude_distance = (
        longitude_two - longitude_one
    ) * cos(average_latitude)

    miles_per_degree = 69

    distance = sqrt(
        latitude_distance ** 2
        + longitude_distance ** 2
    ) * miles_per_degree

    return distance


def build_route_points(geometry):
    """
    Add cumulative distance information to a route geometry.

    Each point contains:
    - latitude
    - longitude
    - distance from the beginning of this route section
    """

    route_points = []

    cumulative_distance = 0

    for index, point in enumerate(geometry):

        if index > 0:
            cumulative_distance += calculate_distance_miles(
                geometry[index - 1],
                point,
            )

        route_points.append(
            {
                "latitude": point[0],
                "longitude": point[1],
                "distance_miles": cumulative_distance,
            }
        )

    return route_points


def get_coordinate_at_distance(
    route_points,
    target_distance_miles,
):
    """
    Find the approximate coordinate at a given distance
    from the beginning of the route section.
    """

    if not route_points:
        return None

    if target_distance_miles <= 0:
        return [
            route_points[0]["longitude"],
            route_points[0]["latitude"],
        ]

    for index in range(1, len(route_points)):

        current_point = route_points[index]

        if (
            current_point["distance_miles"]
            >= target_distance_miles
        ):

            previous_point = route_points[index - 1]

            previous_distance = previous_point[
                "distance_miles"
            ]

            current_distance = current_point[
                "distance_miles"
            ]

            distance_difference = (
                current_distance
                - previous_distance
            )

            if distance_difference == 0:
                return [
                    current_point["longitude"],
                    current_point["latitude"],
                ]

            ratio = (
                target_distance_miles
                - previous_distance
            ) / distance_difference

            latitude = (
                previous_point["latitude"]
                + (
                    current_point["latitude"]
                    - previous_point["latitude"]
                )
                * ratio
            )

            longitude = (
                previous_point["longitude"]
                + (
                    current_point["longitude"]
                    - previous_point["longitude"]
                )
                * ratio
            )

            return [longitude, latitude]

    last_point = route_points[-1]

    return [
        last_point["longitude"],
        last_point["latitude"],
    ]


def parse_route(
    ors_response,
    current_location,
    pickup_location,
    dropoff_location,
):
    route = ors_response["routes"][0]

    total_distance_miles = (
        route["summary"]["distance"]
        / METERS_PER_MILE
    )

    total_duration_hours = (
        route["summary"]["duration"]
        / 3600
    )

    geometry = polyline.decode(
        route["geometry"]
    )

    waypoint_indexes = route["way_points"]

    location_names = [
        current_location["name"],
        pickup_location["name"],
        dropoff_location["name"],
    ]

    legs = []

    for index, segment in enumerate(
        route["segments"]
    ):

        start_index = waypoint_indexes[index]
        end_index = waypoint_indexes[index + 1]

        leg_geometry = geometry[
            start_index:end_index + 1
        ]

        leg_route_points = build_route_points(
            leg_geometry
        )

        legs.append(
            {
                "from": location_names[index],
                "to": location_names[index + 1],
                "distance_miles": round(
                    segment["distance"]
                    / METERS_PER_MILE,
                    1,
                ),
                "duration_hours": round(
                    segment["duration"]
                    / 3600,
                    2,
                ),
                "geometry": leg_geometry,
                "route_points": leg_route_points,
            }
        )

    instructions = []

    for segment in route["segments"]:

        for step in segment["steps"]:

            instructions.append(
                {
                    "instruction": step["instruction"],
                    "distance_miles": round(
                        step["distance"]
                        / METERS_PER_MILE,
                        1,
                    ),
                    "duration_hours": round(
                        step["duration"]
                        / 3600,
                        2,
                    ),
                }
            )

    return {
        "total_distance_miles": round(
            total_distance_miles,
            1,
        ),
        "total_duration_hours": round(
            total_duration_hours,
            2,
        ),
        "legs": legs,
        "geometry": geometry,
        "waypoint_indexes": waypoint_indexes,
        "instructions": instructions,
    }
