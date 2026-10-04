import { useState } from "react";
import TripForm from "./components/TripForm";
import TripMap from "./components/TripMap";
import TripSummary from "./components/TripSummary";
import StopTimeline from "./components/StopTimeline";
import LogSheet from "./components/LogSheet";
import { planTrip } from "./services/api";

function defaultStart() {
  const now = new Date();
  // Round up to next full hour in user's local timezone
  now.setHours(now.getHours() + 1, 0, 0, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:00`;
}

function App() {
  const [tripPlan, setTripPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTripSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      const data = await planTrip({
        currentLocation: formData.currentLocation,
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        cycleHoursUsed: Number(formData.cycleHoursUsed),
        startDateTime: defaultStart(),
      });

      setTripPlan(data);
    } catch (err) {
      setError(err.message || "Failed to calculate route from backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white font-bold shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Truck ELD Planner
              </h1>
              <p className="text-[11px] font-medium text-orange-600">Route & driver log planner</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <strong className="font-semibold">Error: </strong>
            <span>{error}</span>
          </div>
        )}

        {/* Responsive Grid Layout
            Left: TripForm (5 cols on lg)
            Right: TripMap (7 cols on lg)
            On mobile: Form first, Map below it. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-5 flex">
            <TripForm onSubmit={handleTripSubmit} loading={loading} />
          </div>
          <div className="lg:col-span-7 flex">
            <TripMap tripPlan={tripPlan} />
          </div>
        </div>

        {/* Results Section below both Form and Map */}
        {tripPlan && (
          <div className="space-y-8 animate-fadeIn">
            {/* 1. Trip Summary (4 cards) */}
            <TripSummary tripPlan={tripPlan} />

            {/* 2. SVG Log Sheet with Daily Logs Tabs */}
            <LogSheet dailyLogs={tripPlan.daily_logs} />

            {/* 3. Stop Timeline */}
            <StopTimeline schedule={tripPlan.schedule} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>Truck ELD Planner &copy; 2026. Built according to FMCSA Hours of Service Regulations.</p>
      </footer>
    </div>
  );
}

export default App;