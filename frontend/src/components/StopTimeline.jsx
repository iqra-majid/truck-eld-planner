import { STATUS_COLORS, getStatusCategory, formatHoursAndMinutes, formatAMPMTime } from "../constants";

function formatDateHeader(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return isoString;
  }
}

function getLocationName(location) {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.short_name || location.name || "";
}

function getDateRange(start, end) {
  const dates = [];

  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (current <= last) {
    dates.push(
      current.toISOString().slice(0, 10)
    );

    current.setDate(
      current.getDate() + 1
    );
  }

  return dates;
}

function StopTimeline({ schedule }) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;

  // Group schedule events by Date (YYYY-MM-DD)
  // Group schedule events by Date (YYYY-MM-DD)
  // Group schedule events by Date (YYYY-MM-DD)
  // Also create empty date groups for calendar days
  // crossed by long-duration events.
  const groupedEvents = {};

  schedule.forEach((event) => {
    if (!event.start) return;

    const startDate = event.start.slice(0, 10);

    const start = new Date(event.start);

    const durationMs =
      (Number(event.duration_hours) || 0) *
      60 *
      60 *
      1000;

    const end = new Date(
      start.getTime() + durationMs
    );

    // Always make sure the event's starting
    // date exists before pushing.
    if (!groupedEvents[startDate]) {
      groupedEvents[startDate] = [];
    }

    groupedEvents[startDate].push(event);

    // Create empty groups for every calendar
    // day crossed by this event.
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    const last = new Date(end);
    last.setHours(0, 0, 0, 0);

    current.setDate(
      current.getDate() + 1
    );

    while (current <= last) {
      const year = current.getFullYear();
      const month = String(
        current.getMonth() + 1
      ).padStart(2, "0");
      const day = String(
        current.getDate()
      ).padStart(2, "0");

      const dateStr =
        `${year}-${month}-${day}`;

      if (!groupedEvents[dateStr]) {
        groupedEvents[dateStr] = [];
      }

      current.setDate(
        current.getDate() + 1
      );
    }
  });

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Stop Timeline & ELD Schedule</h3>
          <p className="mt-1 text-xs text-slate-500">
            Chronological breakdown of driving segments, required 30-min breaks, 10-hour rest stops, and duty changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span> Driving
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span> On Duty
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-600"></span> Sleeper
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500"></span> Off Duty
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([dateStr, events]) => (
          <div key={dateStr} className="space-y-3">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-slate-50 py-1.5 px-3 rounded-md border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {formatDateHeader(events[0]?.start || dateStr)}
              </span>
            </div>

            {/* Event List */}
            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
              {events.map((event, index) => {
                const category = getStatusCategory(event.type);
                const statusCfg = STATUS_COLORS[category] || STATUS_COLORS.OFF_DUTY;
                const locName = getLocationName(event.location);

                return (
                  <div key={index} className="relative flex items-start justify-between gap-4 group">
                    {/* Colored Dot on Timeline */}
                    <div
                      className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ring-2 ring-white ${statusCfg.bg}`}
                    />

                    {/* Left: Time & Event Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatAMPMTime(event.start)}
                        </span>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusCfg.badgeBg} ${statusCfg.text}`}
                        >
                          {event.type}
                        </span>
                        {event.destination && (
                          <span className="text-xs font-medium text-slate-600">
                            → {event.destination}
                          </span>
                        )}
                      </div>

                      {/* Location & Reason */}
                      {(locName || event.reason) && (
                        <div className="mt-1 text-xs text-slate-500">
                          {locName && <span className="font-medium text-slate-700">{locName}</span>}
                          {event.reason && <span className="ml-2 italic text-slate-400">({event.reason})</span>}
                        </div>
                      )}
                    </div>

                    {/* Right: Duration & Miles */}
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {formatHoursAndMinutes(event.duration_hours)}
                      </span>
                      {event.miles > 0 && (
                        <p className="text-[11px] text-slate-400">{event.miles} mi</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StopTimeline;
