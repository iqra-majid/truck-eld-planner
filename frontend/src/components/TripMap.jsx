import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { getStatusConfig } from "../constants";

// High-definition, bold, instantly readable 24x24 SVG graphic icons
const ICON_SVGS = {
  START: `
    <!-- Truck Icon -->
    <g fill="currentColor">
      <path d="M2 5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>
      <path d="M15 8h4.5a1 1 0 0 1 .8.4l2.7 3.6a1 1 0 0 1 .2.6V14a1 1 0 0 1-1 1H15V8z"/>
      <circle cx="6" cy="16" r="2.2" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="18" cy="16" r="2.2" fill="#ffffff" stroke="currentColor" stroke-width="1.8"/>
    </g>
  `,
  PICKUP: `
    <!-- 3D Cargo Box Icon -->
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6.5L12 2l8 4.5V16.5L12 21L4 16.5V6.5z" fill="currentColor" fill-opacity="0.15"/>
      <path d="M12 2v19"/>
      <path d="M12 11.5L4 7"/>
      <path d="M12 11.5L20 7"/>
    </g>
  `,
  DROPOFF: `
    <!-- Destination Finish Flag -->
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 22V4"/>
      <path d="M4 4c3-2 6 2 9 0s6 2 9 0v9c-3 2-6-2-9 0s-6-2-9 0V4z" fill="currentColor" fill-opacity="0.25"/>
    </g>
  `,
  FUEL: `
    <!-- Detailed Gas Pump Dispenser & Nozzle -->
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="10" height="17" rx="2" fill="currentColor" fill-opacity="0.2"/>
      <rect x="5" y="6" width="6" height="4" rx="1" fill="#ffffff"/>
      <path d="M13 8h2a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5v-5l-2-2.5"/>
    </g>
  `,
  REST: `
    <!-- Hotel Bed & Pillow Icon -->
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 4v16"/>
      <path d="M2 13h20v7"/>
      <path d="M22 10v10"/>
      <path d="M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/>
      <path d="M10 9h10a2 2 0 0 1 2 2v2H10V9z" fill="currentColor" fill-opacity="0.25"/>
    </g>
  `,
  BREAK: `
    <!-- Steaming Coffee Mug Icon -->
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" fill="currentColor" fill-opacity="0.2"/>
      <path d="M16 10h2.5a2 2 0 0 1 0 4H16"/>
      <path d="M6 2c.5.8.5 1.5 0 2.2"/>
      <path d="M10 2c.5.8.5 1.5 0 2.2"/>
      <path d="M14 2c.5.8.5 1.5 0 2.2"/>
    </g>
  `,
  RESTART: `
    <!-- Circular Arrow Refresh Icon -->
    <g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 11A8 8 0 1 1 17 5.3L21 9"/>
      <path d="M21 4v5h-5"/>
    </g>
  `,
};

function createCustomIcon(colorHex, iconType, label) {
  const svgContent = ICON_SVGS[iconType] || ICON_SVGS.START;

  const html = `
    <div style="position: relative; width: 42px; height: 54px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: pointer;" title="${label || ""}">
      <svg xmlns="http://www.w3.org/2000/svg" width="42" height="54" viewBox="0 0 42 54">
        <!-- Marker Teardrop Pin -->
        <path d="M21 0C9.402 0 0 9.402 0 21c0 15.75 21 33 21 33s21-17.25 21-33C42 9.402 32.598 0 21 0z" fill="${colorHex}" stroke="#ffffff" stroke-width="2.5"/>
        <!-- Inner White Circle Badge -->
        <circle cx="21" cy="20" r="14" fill="#ffffff"/>
      </svg>
      <!-- Embedded High-Contrast Graphic Icon -->
      <div style="position: absolute; top: 8px; left: 9px; width: 24px; height: 24px; color: ${colorHex}; display: flex; align-items: center; justify-content: center;">
        <svg width="22" height="22" viewBox="0 0 24 24" style="display: block;">
          ${svgContent}
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "custom-map-marker-container",
    html: html,
    iconSize: [42, 54],
    iconAnchor: [21, 54],
    popupAnchor: [0, -50],
  });
}

function TripMap({ tripPlan }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [39.8283, -98.5795], // US Center
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = L.latLngBounds();

    if (tripPlan) {
      const { currentLocation, pickupLocation, dropoffLocation, schedule } = tripPlan;

      // Add Start Marker (Truck Icon, Green)
      if (currentLocation?.coordinates) {
        const [lon, lat] = currentLocation.coordinates;
        const startIcon = createCustomIcon("#16a34a", "START", "Start Location");
        const marker = L.marker([lat, lon], { icon: startIcon }).bindPopup(
          `<div class="p-1">
             <div class="flex items-center gap-1.5 font-bold text-green-700 text-xs uppercase mb-1">
               <span>🚚</span> Start Location
             </div>
             <p class="text-sm font-semibold text-slate-900">${currentLocation.name || currentLocation.short_name || "Start Location"}</p>
             <p class="text-xs text-slate-500 mt-1">Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}</p>
           </div>`
        );
        layerGroup.addLayer(marker);
        bounds.extend([lat, lon]);
      }

      // Add Pickup Marker (Cargo Box Icon, Blue)
      if (pickupLocation?.coordinates) {
        const [lon, lat] = pickupLocation.coordinates;
        const pickupIcon = createCustomIcon("#2563eb", "PICKUP", "Pickup Location");
        const marker = L.marker([lat, lon], { icon: pickupIcon }).bindPopup(
          `<div class="p-1">
             <div class="flex items-center gap-1.5 font-bold text-blue-700 text-xs uppercase mb-1">
               <span>📦</span> Pickup Location
             </div>
             <p class="text-sm font-semibold text-slate-900">${pickupLocation.name || pickupLocation.short_name || "Pickup"}</p>
             <p class="text-xs text-slate-500 mt-1">Cargo Loading Point (1.0 hr duty)</p>
           </div>`
        );
        layerGroup.addLayer(marker);
        bounds.extend([lat, lon]);
      }

      // Add Dropoff Marker (Unload Box Icon, Orange)
      if (dropoffLocation?.coordinates) {
        const [lon, lat] = dropoffLocation.coordinates;
        const dropoffIcon = createCustomIcon("#ea580c", "DROPOFF", "Drop-off Location");
        const marker = L.marker([lat, lon], { icon: dropoffIcon }).bindPopup(
          `<div class="p-1">
             <div class="flex items-center gap-1.5 font-bold text-orange-700 text-xs uppercase mb-1">
               <span>🏁</span> Drop-off Location
             </div>
             <p class="text-sm font-semibold text-slate-900">${dropoffLocation.name || dropoffLocation.short_name || "Drop-off"}</p>
             <p class="text-xs text-slate-500 mt-1">Final Destination (1.0 hr duty)</p>
           </div>`
        );
        layerGroup.addLayer(marker);
        bounds.extend([lat, lon]);
      }

      // Add Intermediate Schedule Stops (REST, BREAK, RESTART, FUEL)
      if (Array.isArray(schedule)) {
        schedule.forEach((event, idx) => {
          if (["REST", "BREAK", "RESTART", "FUEL"].includes(event.type) && event.location) {
            const loc = event.location;
            let lat = loc.lat;
            let lng = loc.lng;

            if ((lat === undefined || lng === undefined) && Array.isArray(loc.coordinates)) {
              lng = loc.coordinates[0];
              lat = loc.coordinates[1];
            }

            if (lat != null && lng != null) {
              const statusCfg = getStatusConfig(event.type);
              const iconType = event.type; // REST, BREAK, RESTART, FUEL
              const stopIcon = createCustomIcon(statusCfg.hex, iconType, `${event.type} Stop`);

              let titleEmoji = "🛑";
              if (event.type === "REST") titleEmoji = "🛏️";
              if (event.type === "BREAK") titleEmoji = "☕";
              if (event.type === "FUEL") titleEmoji = "⛽";
              if (event.type === "RESTART") titleEmoji = "🔄";

              const marker = L.marker([lat, lng], { icon: stopIcon }).bindPopup(
                `<div class="p-1">
                   <div class="flex items-center gap-1.5 font-bold text-xs uppercase mb-1" style="color: ${statusCfg.hex}">
                     <span>${titleEmoji}</span> ${event.type} Stop (#${idx + 1})
                   </div>
                   <p class="text-sm font-semibold text-slate-900">${loc.short_name || loc.name || "Stop Location"}</p>
                   <p class="text-xs text-slate-600 mt-1 font-medium">Duration: ${event.duration_hours} hrs</p>
                   ${event.reason ? `<p class="text-[11px] text-slate-500 italic mt-0.5">${event.reason}</p>` : ""}
                 </div>`
              );
              layerGroup.addLayer(marker);
              bounds.extend([lat, lng]);
            }
          }
        });
      }

      // Draw polyline connecting route points
      const lineCoords = [];
      if (currentLocation?.coordinates) lineCoords.push([currentLocation.coordinates[1], currentLocation.coordinates[0]]);
      if (pickupLocation?.coordinates) lineCoords.push([pickupLocation.coordinates[1], pickupLocation.coordinates[0]]);
      if (dropoffLocation?.coordinates) lineCoords.push([dropoffLocation.coordinates[1], dropoffLocation.coordinates[0]]);

      if (lineCoords.length >= 2) {
        const polyline = L.polyline(lineCoords, {
          color: "#ea580c", // Orange route line
          weight: 4,
          opacity: 0.8,
          dashArray: "6, 8",
        });
        layerGroup.addLayer(polyline);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [tripPlan]);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm lg:h-full lg:min-h-[460px]">
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Map Legend Overlay */}
      {tripPlan && (
        <div className="absolute top-3 right-3 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm max-w-[210px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Map Pin Icons</span>
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="text-[10px] text-slate-400 hover:text-slate-700"
            >
              {showLegend ? "Hide" : "Show"}
            </button>
          </div>

          {showLegend && (
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-[10px]">🚚</span>
                <span className="font-medium text-slate-800">Start Location</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">📦</span>
                <span className="font-medium text-slate-800">Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-bold text-[10px]">🏁</span>
                <span className="font-medium text-slate-800">Drop-off</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-[10px]">⛽</span>
                <span>Fuel Stop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">🛏️</span>
                <span>10h Rest</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">☕</span>
                <span>30m Break</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">🔄</span>
                <span>34h Restart</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State Overlay */}
      {!tripPlan && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/10 p-6 text-center backdrop-blur-[2px]">
          <div className="rounded-xl bg-white/90 p-4 shadow-lg border border-slate-200">
            <span className="inline-block rounded-full bg-orange-100 p-2 text-orange-600 mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-slate-800">Trip Route Map</p>
            <p className="text-xs text-slate-500 mt-1">Submit your trip locations to visualize the complete route and ELD stops.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripMap;
