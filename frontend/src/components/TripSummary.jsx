import { formatHoursAndMinutes } from "../constants";

function TripSummary({ tripPlan }) {
  if (!tripPlan) return null;

  const { schedule = [], daily_logs = [] } = tripPlan;

  // 1. Total Miles
  const totalMiles = daily_logs.length > 0
    ? daily_logs.reduce((sum, day) => sum + (Number(day.total_miles) || 0), 0)
    : schedule
        .filter((e) => e.type === "DRIVING")
        .reduce((sum, e) => sum + (Number(e.miles) || 0), 0);

  // 2. Driving Time (Hours)
  const totalDrivingHours = schedule
    .filter((e) => e.type === "DRIVING")
    .reduce((sum, e) => sum + (Number(e.duration_hours) || 0), 0);

  // 3. Number of Days (computed from daily_logs.length)
  const numberOfDays = daily_logs.length > 0 ? daily_logs.length : 1;

  // 4. Number of Stops (Rest, Break, Fuel, Pickup, Drop-off, Restart)
  const numberOfStops = schedule.filter((e) =>
    ["REST", "BREAK", "FUEL", "PICKUP", "DROPOFF", "RESTART"].includes(e.type)
  ).length;

  const cards = [
    {
      id: "miles",
      label: "Total Miles",
      value: `${totalMiles.toLocaleString("en-US", { maximumFractionDigits: 1 })} mi`,
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "driving",
      label: "Driving Time",
      value: formatHoursAndMinutes(totalDrivingHours),
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "days",
      label: "Number of Days",
      value: `${numberOfDays} ${numberOfDays === 1 ? "Day" : "Days"}`,
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "stops",
      label: "Number of Stops",
      value: `${numberOfStops} ${numberOfStops === 1 ? "Stop" : "Stops"}`,
      icon: (
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="w-full">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div className="rounded-lg bg-orange-50 p-2">{card.icon}</div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TripSummary;
