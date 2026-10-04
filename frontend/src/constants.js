// Shared status color definitions and mappings for Truck ELD Planner

export const STATUS_COLORS = {
  DRIVING: {
    bg: "bg-orange-500",
    text: "text-orange-700",
    badgeBg: "bg-orange-100",
    border: "border-orange-500",
    hex: "#ea580c", // Orange
    dotHex: "#ea580c",
    label: "Driving",
  },
  ON_DUTY: {
    bg: "bg-blue-600",
    text: "text-blue-700",
    badgeBg: "bg-blue-100",
    border: "border-blue-500",
    hex: "#2563eb", // Blue
    dotHex: "#2563eb",
    label: "On Duty",
  },
  SLEEPER: {
    bg: "bg-purple-600",
    text: "text-purple-700",
    badgeBg: "bg-purple-100",
    border: "border-purple-500",
    hex: "#9333ea", // Purple
    dotHex: "#9333ea",
    label: "Sleeper Berth",
  },
  OFF_DUTY: {
    bg: "bg-slate-500",
    text: "text-slate-700",
    badgeBg: "bg-slate-100",
    border: "border-slate-400",
    hex: "#64748b", // Gray / Slate
    dotHex: "#64748b",
    label: "Off Duty",
  },
};

// Map event types to core ELD statuses
export const EVENT_STATUS_MAP = {
  DRIVING: "DRIVING",
  BREAK: "OFF_DUTY",
  REST: "SLEEPER",
  RESTART: "OFF_DUTY",
  FUEL: "ON_DUTY",
  PICKUP: "ON_DUTY",
  DROPOFF: "ON_DUTY",
  OFF_DUTY: "OFF_DUTY",
  SLEEPER: "SLEEPER",
  ON_DUTY: "ON_DUTY",
};

export function getStatusCategory(eventType) {
  return EVENT_STATUS_MAP[eventType] || "OFF_DUTY";
}

export function getStatusConfig(typeOrCategory) {
  const category = getStatusCategory(typeOrCategory);
  return STATUS_COLORS[category] || STATUS_COLORS.OFF_DUTY;
}

// Format decimal hours as e.g. "7 h 47 min" or "30 min" or "8 h"
export function formatHoursAndMinutes(hours) {
  if (hours == null) return "";
  const num = Number(hours);
  if (isNaN(num) || num <= 0) return "0 min";

  const totalMinutes = Math.round(num * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h} h ${m} min`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

// Format ISO string or HH:MM string to 12-hour AM/PM time (e.g. 10:00 AM)
export function formatAMPMTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${mins} ${ampm}`;
  } catch {
    return isoString;
  }
}
