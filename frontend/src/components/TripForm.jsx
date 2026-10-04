import { useState } from "react";

const LOCATION_FIELDS = [
  { name: "currentLocation", label: "Current Location", placeholder: "e.g. Dallas, TX" },
  { name: "pickupLocation", label: "Pickup Location", placeholder: "e.g. Atlanta, GA" },
  { name: "dropoffLocation", label: "Drop-off Location", placeholder: "e.g. New York, NY" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

function TripForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    currentLocation: "",
    pickupLocation: "",
    dropoffLocation: "",
    cycleHoursUsed: "0",
  });

  const [validationError, setValidationError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValidationError("");
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError("");

    const cleaned = {
      ...formData,
      currentLocation: formData.currentLocation.trim(),
      pickupLocation: formData.pickupLocation.trim(),
      dropoffLocation: formData.dropoffLocation.trim(),
    };

    // All three places must be typed
    if (!cleaned.currentLocation || !cleaned.pickupLocation || !cleaned.dropoffLocation) {
      setValidationError("Please type all three locations, for example: Dallas, TX");
      return;
    }

    // Cycle hours: a number from 0 to 70
    const cycle = Number(cleaned.cycleHoursUsed);
    if (cleaned.cycleHoursUsed === "" || Number.isNaN(cycle) || cycle < 0 || cycle > 70) {
      setValidationError("Cycle hours used must be a number between 0 and 70.");
      return;
    }

    onSubmit(cleaned);
  };

  return (
    <section className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Plan Your Trip
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter trip details to calculate route and driver daily logs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current, Pickup and Drop-off: typed by the driver */}
          {LOCATION_FIELDS.map(({ name, label, placeholder }) => (
            <div key={name}>
              <label
                htmlFor={name}
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {label}
              </label>

              <input
                id={name}
                name={name}
                type="text"
                value={formData[name]}
                onChange={handleChange}
                placeholder={placeholder}
                autoComplete="off"
                required
                className={INPUT_CLASS}
              />
            </div>
          ))}

          <p className="-mt-2 text-xs text-slate-400">
            Type the city and state, like “Dallas, TX”.
          </p>

          {/* Cycle Hours */}
          <div>
            <label
              htmlFor="cycleHoursUsed"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Cycle Hours Already Used (0 - 70)
            </label>

            <input
              id="cycleHoursUsed"
              name="cycleHoursUsed"
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={formData.cycleHoursUsed}
              onChange={handleChange}
              placeholder="e.g. 15"
              required
              className={INPUT_CLASS}
            />

            <p className="mt-1.5 text-xs text-slate-400">
              70-hour / 8-day limit under US FMCSA rules
            </p>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
              {validationError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Planning your route...
              </span>
            ) : (
              "Plan Trip"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default TripForm;