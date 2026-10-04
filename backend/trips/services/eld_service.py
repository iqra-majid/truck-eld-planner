from datetime import datetime, timedelta

from trips.services.route_service import (
    get_coordinate_at_distance,
)

from trips.services.location_service import (
    get_location_name,
)


MAX_DRIVING_HOURS_PER_DAY = 11
MAX_DUTY_HOURS_PER_DAY = 14
MAX_CYCLE_HOURS = 70
CYCLE_RESTART_HOURS = 34
FUEL_STOP_INTERVAL_MILES = 1000
FUEL_STOP_DURATION_HOURS = 0.5


def round_to_minute(value):

    """
    Remove seconds and microseconds from a datetime
    for cleaner schedule display.
    """

    return value.replace(
        second=0,
        microsecond=0,
    )


def create_eld_schedule(
    route,
    cycle_hours_used,
    start_date_time,
):

    current_time = datetime.fromisoformat(start_date_time)

    driving_today = 0
    driving_since_break = 0
    miles_since_fuel = 0

    # The 14-hour duty window starts when the driver starts work.
    duty_window_end = current_time + timedelta(
        hours=MAX_DUTY_HOURS_PER_DAY
    )

    cycle_hours = float(cycle_hours_used)

    schedule = []


    def get_current_location(leg):

        """
        Find the truck's current real-world location
        along the current route leg.
        """

        # If the truck is at the beginning of the leg,
        # use the known starting location directly.
        if leg["distance_driven"] == 0:

            return {
                "name": leg["from"],
                "short_name": leg["from"],
                "lat": leg["route_points"][0]["latitude"],
                "lng": leg["route_points"][0]["longitude"],
            }

        coordinate = get_coordinate_at_distance(
            leg["route_points"],
            leg["distance_driven"],
        )

        if coordinate is None:

            return {
                "name": leg["from"],
                "short_name": leg["from"],
                "lat": None,
                "lng": None,
            }

        location_data = get_location_name(coordinate)

        return {
            "name": location_data["name"],
            "short_name": location_data["short_name"],
            "lat": coordinate[1],
            "lng": coordinate[0],
        }


    def get_endpoint_location(leg):

        """
        Get the real-world location of the end
        of a route leg.
        """

        coordinate = get_coordinate_at_distance(
            leg["route_points"],
            leg["distance_miles"],
        )

        if coordinate is None:

            return {
                "name": leg["to"],
                "short_name": leg["to"],
                "lat": None,
                "lng": None,
            }

        location_data = get_location_name(coordinate)

        return {
            "name": location_data["name"],
            "short_name": location_data["short_name"],
            "lat": coordinate[1],
            "lng": coordinate[0],
        }


    def process_leg(leg):

        nonlocal current_time
        nonlocal driving_today
        nonlocal driving_since_break
        nonlocal miles_since_fuel
        nonlocal duty_window_end
        nonlocal cycle_hours

        remaining_leg_driving = leg["duration_hours"]
        remaining_leg_miles = leg["distance_miles"]

        # Track how far the truck has traveled
        # along this specific leg.
        leg["distance_driven"] = 0

        loop_count = 0

        # Keep driving until the destination is reached.
        while remaining_leg_driving > 0.001:

            loop_count += 1

            if loop_count > 500:

                raise Exception(
                    "ELD scheduling exceeded the maximum number of iterations."
                )

            # If the driver has reached the 70-hour cycle limit,
            # take a 34-hour restart before continuing.
            if cycle_hours >= MAX_CYCLE_HOURS:

                restart_location = get_current_location(leg)

                restart_end_time = current_time + timedelta(
                    hours=CYCLE_RESTART_HOURS
                )

                schedule.append(
                    {
                        "type": "RESTART",
                        "start": round_to_minute(
                            current_time
                        ).isoformat(),
                        "end": round_to_minute(
                            restart_end_time
                        ).isoformat(),
                        "duration_hours": CYCLE_RESTART_HOURS,
                        "location": restart_location,
                        "reason": "34-hour restart after reaching the 70-hour cycle limit.",
                    }
                )

                current_time = restart_end_time

                # Reset the cycle.
                cycle_hours = 0

                # A 34-hour restart also provides
                # the required daily rest.
                driving_today = 0
                driving_since_break = 0

                # Start a new 14-hour duty window.
                duty_window_end = current_time + timedelta(
                    hours=MAX_DUTY_HOURS_PER_DAY
                )

                continue

            # If the driver has reached the 11-hour daily
            # driving limit, take a 10-hour rest.
            if driving_today >= MAX_DRIVING_HOURS_PER_DAY:

                rest_location = get_current_location(leg)

                rest_end_time = current_time + timedelta(
                    hours=10
                )

                schedule.append(
                    {
                        "type": "REST",
                        "start": round_to_minute(
                            current_time
                        ).isoformat(),
                        "end": round_to_minute(
                            rest_end_time
                        ).isoformat(),
                        "duration_hours": 10,
                        "location": rest_location,
                        "reason": "10-hour daily rest after reaching the 11-hour driving limit.",
                    }
                )

                current_time = rest_end_time

                driving_today = 0
                driving_since_break = 0

                duty_window_end = current_time + timedelta(
                    hours=MAX_DUTY_HOURS_PER_DAY
                )

                continue

            # If the driver has reached 8 hours of driving
            # since the last break, take a 30-minute break.
            if driving_since_break >= 8:

                break_location = get_current_location(leg)

                break_end_time = current_time + timedelta(
                    minutes=30
                )

                schedule.append(
                    {
                        "type": "BREAK",
                        "start": round_to_minute(
                            current_time
                        ).isoformat(),
                        "end": round_to_minute(
                            break_end_time
                        ).isoformat(),
                        "duration_hours": 0.5,
                        "location": break_location,
                    }
                )

                current_time = break_end_time

                driving_since_break = 0

                continue

            # If the 14-hour duty window has ended,
            # take a 10-hour rest before starting
            # a new workday.
            if current_time >= duty_window_end:

                rest_location = get_current_location(leg)

                rest_end_time = current_time + timedelta(
                    hours=10
                )

                schedule.append(
                    {
                        "type": "REST",
                        "start": round_to_minute(
                            current_time
                        ).isoformat(),
                        "end": round_to_minute(
                            rest_end_time
                        ).isoformat(),
                        "duration_hours": 10,
                        "location": rest_location,
                        "reason": "10-hour daily rest after reaching the 14-hour duty window.",
                    }
                )

                current_time = rest_end_time

                driving_today = 0
                driving_since_break = 0

                duty_window_end = current_time + timedelta(
                    hours=MAX_DUTY_HOURS_PER_DAY
                )

                continue

            # Calculate how much driving can happen before
            # reaching any of the driving, duty, or cycle limits.
            remaining_daily_driving = (
                MAX_DRIVING_HOURS_PER_DAY
                - driving_today
            )

            remaining_break_driving = (
                8 - driving_since_break
            )

            remaining_duty_hours = (
                duty_window_end - current_time
            ).total_seconds() / 3600

            remaining_cycle_hours = (
                MAX_CYCLE_HOURS - cycle_hours
            )

            driving_allowed = min(
                remaining_leg_driving,
                remaining_daily_driving,
                remaining_break_driving,
                remaining_duty_hours,
                remaining_cycle_hours,
            )

            # Calculate how many miles this driving segment represents.
            miles_per_hour = (
                leg["distance_miles"]
                / leg["duration_hours"]
            )

            driving_miles = (
                driving_allowed * miles_per_hour
            )

            # If the next fuel stop would happen before
            # the end of this driving segment, shorten
            # the segment so that it ends exactly at
            # the fuel stop.
            remaining_fuel_miles = (
                FUEL_STOP_INTERVAL_MILES
                - miles_since_fuel
            )

            fuel_driving_hours = (
                remaining_fuel_miles
                / miles_per_hour
            )

            if fuel_driving_hours < driving_allowed:

                driving_allowed = fuel_driving_hours

                driving_miles = remaining_fuel_miles

            # Safety check in case a limit leaves no driving time.
            if driving_allowed <= 0:

                raise Exception(
                    "ELD scheduling could not make progress."
                )

            # Get the truck's location at the beginning
            # of this driving segment.
            driving_location = get_current_location(leg)

            driving_end_time = current_time + timedelta(
                hours=driving_allowed
            )

            schedule.append(
                {
                    "type": "DRIVING",
                    "start": round_to_minute(
                        current_time
                    ).isoformat(),
                    "end": round_to_minute(
                        driving_end_time
                    ).isoformat(),
                    "location": driving_location,
                    "destination": leg["to"],
                    "duration_hours": round(
                        driving_allowed,
                        2,
                    ),
                    "miles": round(
                        driving_miles,
                        1,
                    ),
                }
            )

            driving_today += driving_allowed
            driving_since_break += driving_allowed
            cycle_hours += driving_allowed
            miles_since_fuel += driving_miles

            leg["distance_driven"] += driving_miles

            remaining_leg_driving -= driving_allowed
            remaining_leg_miles -= driving_miles

            current_time = driving_end_time

            # If the driver has reached 1,000 miles
            # since the last fuel stop, schedule a
            # 30-minute fuel stop.
            if miles_since_fuel >= FUEL_STOP_INTERVAL_MILES:

                # The truck's current location is now
                # the fuel-stop location.
                fuel_location = get_current_location(leg)

                fuel_end_time = current_time + timedelta(
                    hours=FUEL_STOP_DURATION_HOURS
                )

                # Make sure the fuel stop itself does not
                # exceed the 70-hour cycle limit.
                if (
                    cycle_hours
                    + FUEL_STOP_DURATION_HOURS
                    > MAX_CYCLE_HOURS
                ):

                    restart_location = fuel_location

                    restart_end_time = current_time + timedelta(
                        hours=CYCLE_RESTART_HOURS
                    )

                    schedule.append(
                        {
                            "type": "RESTART",
                            "start": round_to_minute(
                                current_time
                            ).isoformat(),
                            "end": round_to_minute(
                                restart_end_time
                            ).isoformat(),
                            "duration_hours": CYCLE_RESTART_HOURS,
                            "location": restart_location,
                            "reason": "34-hour restart required before continuing work because the 70-hour cycle limit would be exceeded.",
                        }
                    )

                    current_time = restart_end_time

                    cycle_hours = 0
                    driving_today = 0
                    driving_since_break = 0

                    duty_window_end = current_time + timedelta(
                        hours=MAX_DUTY_HOURS_PER_DAY
                    )

                    # Recalculate the fuel stop end time
                    # because the restart changed current_time.
                    fuel_end_time = current_time + timedelta(
                        hours=FUEL_STOP_DURATION_HOURS
                    )

                schedule.append(
                    {
                        "type": "FUEL",
                        "start": round_to_minute(
                            current_time
                        ).isoformat(),
                        "end": round_to_minute(
                            fuel_end_time
                        ).isoformat(),
                        "duration_hours": FUEL_STOP_DURATION_HOURS,
                        "location": fuel_location,
                    }
                )

                current_time = fuel_end_time

                cycle_hours += FUEL_STOP_DURATION_HOURS

                # Fuel stop is 30 minutes, so it resets
                # the driving time since the last break.
                driving_since_break = 0

                miles_since_fuel = 0


    # First leg: Current location → Pickup

    first_leg = route["legs"][0]

    process_leg(first_leg)


    # Pickup

    # Pickup is on-duty time, so it counts toward
    # the 70-hour cycle.

    if cycle_hours + 1 > MAX_CYCLE_HOURS:

        restart_location = get_current_location(first_leg)

        restart_end_time = current_time + timedelta(
            hours=CYCLE_RESTART_HOURS
        )

        schedule.append(
            {
                "type": "RESTART",
                "start": round_to_minute(
                    current_time
                ).isoformat(),
                "end": round_to_minute(
                    restart_end_time
                ).isoformat(),
                "duration_hours": CYCLE_RESTART_HOURS,
                "location": restart_location,
                "reason": "34-hour restart required before pickup because the 70-hour cycle limit would be exceeded.",
            }
        )

        current_time = restart_end_time

        cycle_hours = 0
        driving_today = 0
        driving_since_break = 0

        duty_window_end = current_time + timedelta(
            hours=MAX_DUTY_HOURS_PER_DAY
        )

    pickup_location = get_endpoint_location(first_leg)

    pickup_end_time = current_time + timedelta(
        hours=1
    )

    schedule.append(
        {
            "type": "PICKUP",
            "start": round_to_minute(
                current_time
            ).isoformat(),
            "end": round_to_minute(
                pickup_end_time
            ).isoformat(),
            "location": pickup_location,
            "duration_hours": 1,
        }
    )

    current_time = pickup_end_time

    cycle_hours += 1

    # Pickup lasts 1 hour, so it resets
    # the driving time since the last break.

    driving_since_break = 0


    # Second leg: Pickup → Drop-off

    second_leg = route["legs"][1]

    process_leg(second_leg)


    # Drop-off

    # Drop-off is on-duty time, so it counts toward
    # the 70-hour cycle.

    if cycle_hours + 1 > MAX_CYCLE_HOURS:

        restart_location = get_current_location(second_leg)

        restart_end_time = current_time + timedelta(
            hours=CYCLE_RESTART_HOURS
        )

        schedule.append(
            {
                "type": "RESTART",
                "start": round_to_minute(
                    current_time
                ).isoformat(),
                "end": round_to_minute(
                    restart_end_time
                ).isoformat(),
                "duration_hours": CYCLE_RESTART_HOURS,
                "location": restart_location,
                "reason": "34-hour restart required before drop-off because the 70-hour cycle limit would be exceeded.",
            }
        )

        current_time = restart_end_time

        cycle_hours = 0
        driving_today = 0
        driving_since_break = 0

        duty_window_end = current_time + timedelta(
            hours=MAX_DUTY_HOURS_PER_DAY
        )

    dropoff_location = get_endpoint_location(second_leg)

    dropoff_end_time = current_time + timedelta(
        hours=1
    )

    schedule.append(
        {
            "type": "DROPOFF",
            "start": round_to_minute(
                current_time
            ).isoformat(),
            "end": round_to_minute(
                dropoff_end_time
            ).isoformat(),
            "location": dropoff_location,
            "duration_hours": 1,
        }
    )

    # Drop-off is 1 hour, so it also qualifies as a break.

    driving_since_break = 0

    daily_logs = create_daily_logs(schedule)

    return {
    "schedule": schedule,
    "daily_logs": daily_logs,
    }


def create_daily_logs(schedule):

    """
    Split the ELD schedule into one log for each
    calendar day.

    Each day contains:
    - total miles
    - ELD status segments
    - status totals
    - location remarks

    Every day's totals must add up to 24 hours.
    """

    if not schedule:
        return []

    daily_logs = {}

    def get_status(event):

        event_type = event["type"]

        if event_type == "DRIVING":
            return "DRIVING"

        if event_type == "BREAK":
            return "OFF_DUTY"

        if event_type == "REST":
            return "SLEEPER"

        if event_type == "RESTART":
            return "OFF_DUTY"

        if event_type in [
            "PICKUP",
            "DROPOFF",
            "FUEL",
        ]:
            return "ON_DUTY"

        return "OFF_DUTY"

    def add_day(date):

        date_string = date.strftime("%Y-%m-%d")

        if date_string not in daily_logs:

            daily_logs[date_string] = {
                "date": date_string,
                "total_miles": 0,
                "segments": [],
                "totals": {
                    "OFF_DUTY": 0,
                    "SLEEPER": 0,
                    "DRIVING": 0,
                    "ON_DUTY": 0,
                },
                "remarks": [],
            }

        return daily_logs[date_string]

    def add_segment(
        day,
        status,
        start_hour,
        end_hour,
    ):

        if end_hour <= start_hour:
            return

        duration = end_hour - start_hour

        day["segments"].append(
            {
                "status": status,
                "start_hour": round(
                    start_hour,
                    2,
                ),
                "end_hour": round(
                    end_hour,
                    2,
                ),
            }
        )

        day["totals"][status] += duration

    # Process every scheduled event.
    for event in schedule:

        start_time = datetime.fromisoformat(
            event["start"]
        )

        end_time = datetime.fromisoformat(
            event["end"]
        )

        status = get_status(event)

        current_time = start_time

        while current_time < end_time:

            current_date = current_time.date()

            midnight = datetime.combine(
                current_date + timedelta(days=1),
                datetime.min.time(),
            )

            segment_end = min(
                end_time,
                midnight,
            )

            day = add_day(current_date)

            start_hour = (
                current_time.hour
                + current_time.minute / 60
            )

            end_hour = (
                segment_end.hour
                + segment_end.minute / 60
            )

            if segment_end == midnight:
                end_hour = 24

            duration_hours = (
                segment_end - current_time
            ).total_seconds() / 3600

            add_segment(
                day,
                status,
                start_hour,
                end_hour,
            )

            # Distribute driving miles across
            # the portion of the event belonging
            # to this day.
            if status == "DRIVING":

                total_event_hours = (
                    end_time - start_time
                ).total_seconds() / 3600

                if total_event_hours > 0:

                    event_miles = event.get(
                        "miles",
                        0,
                    )

                    miles_for_segment = (
                        event_miles
                        * duration_hours
                        / total_event_hours
                    )

                    day["total_miles"] += (
                        miles_for_segment
                    )

            # Add a remark at the beginning
            # of each scheduled event.
            if current_time == start_time:

                location = event.get(
                    "location"
                )

                if location:

                    if isinstance(
                        location,
                        dict,
                    ):

                        location_name = (
                            location.get(
                                "short_name"
                            )
                            or location.get(
                                "name"
                            )
                        )

                    else:
                        location_name = location

                    day["remarks"].append(
                        {
                            "hour": round(
                                start_hour,
                                2,
                            ),
                            "location": location_name,
                        }
                    )

                if event["type"] == "RESTART":

                    day["remarks"].append(
                        {
                            "hour": round(
                                start_hour,
                                2,
                            ),
                            "text": "34-hour restart",
                        }
                    )

            current_time = segment_end

    # Make every calendar day from the first
    # scheduled event through the last event.
    first_date = datetime.fromisoformat(
        schedule[0]["start"]
    ).date()

    last_date = datetime.fromisoformat(
        schedule[-1]["end"]
    ).date()

    current_date = first_date

    while current_date <= last_date:

        add_day(current_date)

        current_date += timedelta(days=1)

    # Fill all gaps with OFF_DUTY.
    for day in daily_logs.values():

        existing_segments = sorted(
            day["segments"],
            key=lambda segment: segment[
                "start_hour"
            ],
        )

        filled_segments = []

        current_hour = 0

        for segment in existing_segments:

            segment_start = segment[
                "start_hour"
            ]

            segment_end = segment[
                "end_hour"
            ]

            # Gap before this segment.
            if segment_start > current_hour:

                filled_segments.append(
                    {
                        "status": "OFF_DUTY",
                        "start_hour": round(
                            current_hour,
                            2,
                        ),
                        "end_hour": round(
                            segment_start,
                            2,
                        ),
                    }
                )

                day["totals"]["OFF_DUTY"] += (
                    segment_start - current_hour
                )

            filled_segments.append(
                segment
            )

            current_hour = segment_end

        # Gap after the final segment.
        if current_hour < 24:

            filled_segments.append(
                {
                    "status": "OFF_DUTY",
                    "start_hour": round(
                        current_hour,
                        2,
                    ),
                    "end_hour": 24,
                }
            )

            day["totals"]["OFF_DUTY"] += (
                24 - current_hour
            )

        day["segments"] = filled_segments

    # Round totals and miles.
    for day in daily_logs.values():

        day["total_miles"] = round(
            day["total_miles"],
            1,
        )

        for status in day["totals"]:

            day["totals"][status] = round(
                day["totals"][status],
                2,
            )

        # Every ELD day must contain exactly
        # 24 hours.
        total_hours = sum(
            day["totals"].values()
        )

        if round(total_hours, 2) != 24:

            raise Exception(
                f"Daily log for {day['date']} "
                f"does not add up to 24 hours. "
                f"Got {total_hours} hours."
            )

    return list(daily_logs.values())
