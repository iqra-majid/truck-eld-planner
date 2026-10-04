import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";

function TripForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    currentLocation: null,
    pickupLocation: null,
    dropoffLocation: null,
    cycleHoursUsed: "0",
  });

  const [validationError, setValidationError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleLocationChange = (name, value) => {
    setValidationError("");
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError("");

    // Validate that all 3 locations were picked from autocomplete list (have valid coordinates array)
    const hasCurrent = Array.isArray(formData.currentLocation?.coordinates) && formData.currentLocation.coordinates.length === 2;
    const hasPickup = Array.isArray(formData.pickupLocation?.coordinates) && formData.pickupLocation.coordinates.length === 2;
    const hasDropoff = Array.isArray(formData.dropoffLocation?.coordinates) && formData.dropoffLocation.coordinates.length === 2;

    if (!hasCurrent || !hasPickup || !hasDropoff) {
      setValidationError("Please select all three locations from the autocomplete dropdown list to get coordinates.");
      return;
    }

    onSubmit(formData);
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
          {/* Current Location */}
          <div>
            <LocationAutocomplete
              label="Current Location"
              name="currentLocation"
              value={formData.currentLocation}
              onChange={handleLocationChange}
            />
          </div>

          {/* Pickup */}
          <div>
            <LocationAutocomplete
              label="Pickup Location"
              name="pickupLocation"
              value={formData.pickupLocation}
              onChange={handleLocationChange}
            />
          </div>

          {/* Drop-off */}
          <div>
            <LocationAutocomplete
              label="Drop-off Location"
              name="dropoffLocation"
              value={formData.dropoffLocation}
              onChange={handleLocationChange}
            />
          </div>

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
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
            className="w-full rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
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