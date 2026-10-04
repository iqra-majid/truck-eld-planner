import { useState } from "react";

import { formatHoursAndMinutes } from "../constants";

const ROW_KEYS = ["OFF_DUTY", "SLEEPER", "DRIVING", "ON_DUTY"];

const ROW_LABELS = {
  OFF_DUTY: "1. OFF DUTY",
  SLEEPER: "2. SLEEPER BERTH",
  DRIVING: "3. DRIVING",
  ON_DUTY: "4. ON DUTY (NOT DRIVING)",
};

function formatShortDate(dateStr) {
  if (!dateStr) return "";

  try {
    const d = new Date(dateStr + "T00:00:00");

    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatHourToAMPM(hourNum) {
  const totalMins = Math.round(Number(hourNum || 0) * 60);

  let h = Math.floor(totalMins / 60) % 24;

  const m = String(totalMins % 60).padStart(2, "0");

  const ampm = h >= 12 ? "PM" : "AM";

  h = h % 12 || 12;

  return `${h}:${m} ${ampm} `;
}

// "6:00 PM" + "6:30 PM" -> "6:00 – 6:30 PM"
function formatTimeRange(startHour, endHour) {
  const start = formatHourToAMPM(startHour);
  const end = formatHourToAMPM(endHour);

  if (start.slice(-2) === end.slice(-2)) {
    return `${start.slice(0, -3)} – ${end} `;
  }

  return `${start} – ${end} `;
}

// ---------------------------------------------------------------
// REMARKS HELPERS
// ---------------------------------------------------------------

// Approximate width of one character in the SVG font.
const CHAR_WIDTH = 5.6;

// Diagonal projection factor for -45 degree text.
const DIAGONAL = 0.707;

// Remarks are merged only when:
// 1. They have the same location.
// 2. They are within this many minutes of each other.
const REMARK_MERGE_MINUTES = 30;

const cleanLocation = (name) =>
  (name || "").replace(/,\s*USA$/i, "").trim();

const truncate = (text, maxChars) =>
  text.length > maxChars
    ? `${text.slice(0, Math.max(maxChars - 1, 1))}…`
    : text;

/**
 * Convert hour value into minutes.
 *
 * Example:
 * 18.5 -> 1110 minutes
 */
function hourToMinutes(hour) {
  return Number(hour || 0) * 60;
}

/**
 * Merge remarks using BOTH location AND time.
 *
 * IMPORTANT:
 *
 * Same location + close in time:
 *   18:00 Atlanta
 *   18:20 Atlanta
 *   -> one group
 *
 * Same location + far apart:
 *   18:00 Atlanta
 *   22:00 Atlanta
 *   -> two groups
 *
 * Different locations + close in time:
 *   18:00 Atlanta
 *   18:15 Marietta
 *   -> two groups
 *
 * Text-only remarks are attached to a location group when they
 * occur at one of that group's event times.
 */
function groupRemarks(remarks) {
  if (!Array.isArray(remarks)) return [];

  // Always process remarks chronologically.
  const sortedRemarks = [...remarks].sort(
    (a, b) => Number(a.hour || 0) - Number(b.hour || 0)
  );

  const groups = [];

  for (const remark of sortedRemarks) {
    const hour = Number(remark.hour || 0);

    const minutes = hour * 60;

    const location = remark.location
      ? cleanLocation(remark.location)
      : "";

    const text = remark.text
      ? String(remark.text).trim()
      : "";

    if (!location && !text) {
      continue;
    }

    const last = groups[groups.length - 1];

    // -----------------------------------------------------------
    // LOCATION EVENT
    // -----------------------------------------------------------

    if (location) {
      if (last && last.location === location) {
        const lastHour =
          last.hours[last.hours.length - 1];

        const lastMinutes = lastHour * 60;

        const differenceMinutes =
          minutes - lastMinutes;

        // Same location AND within 30 minutes:
        // merge into the same label.
        if (
          differenceMinutes >= 0 &&
          differenceMinutes <= REMARK_MERGE_MINUTES
        ) {
          if (!last.hours.includes(hour)) {
            last.hours.push(hour);
          }

          // If this event also has text, preserve it.
          if (
            text &&
            !last.notes.includes(text)
          ) {
            last.notes.push(text);
          }

          continue;
        }
      }

      // Different location OR more than 30 minutes apart:
      // always create a new group.
      groups.push({
        location,
        hours: [hour],
        notes: text ? [text] : [],
      });

      continue;
    }

    // -----------------------------------------------------------
    // TEXT-ONLY EVENT
    // -----------------------------------------------------------

    if (text) {
      // Attach text to a location event only when it happens
      // at exactly the same time.
      if (
        last &&
        last.hours.includes(hour)
      ) {
        if (!last.notes.includes(text)) {
          last.notes.push(text);
        }

        continue;
      }

      // Otherwise create an independent remark.
      groups.push({
        location: "",
        hours: [hour],
        notes: [text],
      });
    }
  }

  return groups;
}

/**
 * Build the visible remark label.
 */
function buildLabel(group, availablePx) {
  const first = group.hours[0];

  const last =
    group.hours[group.hours.length - 1];

  const time =
    first === last
      ? formatHourToAMPM(first)
      : formatTimeRange(first, last);

  const note = group.notes.join(", ");

  const maxChars = Math.max(
    14,
    Math.min(
      48,
      Math.floor(
        availablePx / DIAGONAL / CHAR_WIDTH
      )
    )
  );

  const fixedChars =
    time.length +
    3 +
    (note ? note.length + 3 : 0);

  const locationMax = Math.max(
    8,
    maxChars - fixedChars
  );

  const location = group.location
    ? truncate(group.location, locationMax)
    : "";

  const body = [location, note]
    .filter(Boolean)
    .join(" — ");

  return `${time} · ${body} `;
}

function LogSheet({ dailyLogs = [] }) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  if (
    !Array.isArray(dailyLogs) ||
    dailyLogs.length === 0
  ) {
    return null;
  }

  // If a new trip has fewer days, go back to Day 1.
  const safeIndex =
    activeDayIndex < dailyLogs.length
      ? activeDayIndex
      : 0;

  const currentLog =
    dailyLogs[safeIndex] || dailyLogs[0];

  const {
    date = "",
    total_miles = 0,
    totals = {
      OFF_DUTY: 24,
      SLEEPER: 0,
      DRIVING: 0,
      ON_DUTY: 0,
    },
    segments = [],
    remarks = [],
  } = currentLog;

  // ---------------------------------------------------------------
  // SVG DIMENSIONS
  // ---------------------------------------------------------------

  const leftMargin = 160;

  const gridWidth = 720; // 30px per hour

  const hourWidth = gridWidth / 24;

  const rowHeight = 30;

  const gridY = 85;

  const totalWidth =
    leftMargin + gridWidth + 90;

  const gridBottomY =
    gridY + 4 * rowHeight;

  // ---------------------------------------------------------------
  // ROW HELPERS
  // ---------------------------------------------------------------

  const getRowYCenter = (rowIndex) =>
    gridY +
    rowIndex * rowHeight +
    rowHeight / 2;

  const getRowIndexForStatus = (status) => {
    switch (status) {
      case "OFF_DUTY":
        return 0;

      case "SLEEPER":
        return 1;

      case "DRIVING":
        return 2;

      case "ON_DUTY":
        return 3;

      default:
        return 0;
    }
  };

  // ---------------------------------------------------------------
  // STATUS SEGMENT PATHS
  // ---------------------------------------------------------------

  const segmentPaths = [];

  if (segments.length > 0) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      const rIdx =
        getRowIndexForStatus(seg.status);

      const x1 =
        leftMargin +
        seg.start_hour * hourWidth;

      const x2 =
        leftMargin +
        seg.end_hour * hourWidth;

      const y =
        getRowYCenter(rIdx);

      const strokeColor =
        seg.status === "DRIVING"
          ? "#ea580c"
          : "#1e293b";

      // Horizontal segment.
      segmentPaths.push({
        d: `M ${x1} ${y} L ${x2} ${y} `,
        stroke: strokeColor,
      });

      // Vertical connecting line to next segment.
      if (i < segments.length - 1) {
        const nextSeg =
          segments[i + 1];

        const nextRIdx =
          getRowIndexForStatus(
            nextSeg.status
          );

        if (rIdx !== nextRIdx) {
          const nextY =
            getRowYCenter(nextRIdx);

          segmentPaths.push({
            d: `M ${x2} ${y} L ${x2} ${nextY} `,
            stroke: "#1e293b",
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // TOTALS
  // ---------------------------------------------------------------

  const totalSum = ROW_KEYS.reduce(
    (sum, key) =>
      sum +
      (Number(totals[key]) || 0),
    0
  );

  // ---------------------------------------------------------------
  // REMARKS
  // ---------------------------------------------------------------

  const remarkGroups = groupRemarks(
    Array.isArray(remarks)
      ? remarks
      : []
  );

  /**
   * Create visible remark items.
   *
   * IMPORTANT:
   * The labels are rotated -45 degrees.
   *
   * Because of that rotation, a long label can extend backwards
   * and visually cover the label before it.
   *
   * When the NEXT label would overlap the PREVIOUS label,
   * we move ONLY the next label down to level 1.
   *
   * The tick for that label also becomes longer.
   */
  // ---------------------------------------------------------------
  // INTELLIGENT REMARK LABEL LAYOUT
  // ---------------------------------------------------------------

  const BASE_LINE_LENGTH = 8;
  const EXTENDED_LINE_LENGTH = 30;
  const EXTRA_LINE_LENGTH = 52;

  const REMARK_LABEL_GAP = 14;

  /**
   * Estimate the diagonal footprint of a label.
   */
  function estimateLabelWidth(label) {
    return label.length * CHAR_WIDTH * DIAGONAL;
  }

  /**
   * Check whether two labels occupy overlapping horizontal space.
   *
   * Labels use textAnchor="end", so they extend to the LEFT
   * from their tick position.
   */
  function labelsOverlap(
    currentX,
    currentWidth,
    previousX,
    previousWidth
  ) {
    const currentLeft =
      currentX - currentWidth;

    const previousLeft =
      previousX - previousWidth;

    const currentRight =
      currentX;

    const previousRight =
      previousX;

    return (
      currentLeft <
      previousRight + REMARK_LABEL_GAP &&
      currentRight >
      previousLeft - REMARK_LABEL_GAP
    );
  }

  // Build this separately so we can safely compare
  // each new label with labels already processed.
  const calculatedRemarkItems = [];

  remarkGroups.forEach(
    (group, i) => {
      const labelX =
        group.hours[0] * hourWidth;

      const availablePx =
        leftMargin +
        labelX -
        6;

      const label = buildLabel(
        group,
        availablePx
      );

      const labelWidth =
        estimateLabelWidth(label);

      let level = 0;

      // -----------------------------------------------------------
      // Compare with ALL previous labels.
      // -----------------------------------------------------------

      for (
        let previousIndex = 0;
        previousIndex <
        calculatedRemarkItems.length;
        previousIndex++
      ) {
        const previous =
          calculatedRemarkItems[
          previousIndex
          ];

        const overlap =
          labelsOverlap(
            labelX,
            labelWidth,
            previous.labelX,
            previous.labelWidth
          );

        if (!overlap) {
          continue;
        }

        // If another label occupies the same level,
        // move this one down.
        if (
          previous.level === level
        ) {
          level =
            previous.level + 1;
        }
      }

      calculatedRemarkItems.push({
        group,
        label,
        labelX,
        labelWidth,
        level,
      });
    }
  );

  const remarkItems =
    calculatedRemarkItems;

  // ---------------------------------------------------------------
  // SVG HEIGHT
  // ---------------------------------------------------------------

  const longestLabelChars =
    remarkItems.reduce(
      (max, item) =>
        Math.max(
          max,
          item.label.length
        ),
      0
    );

  const tallestLabel =
    longestLabelChars *
    CHAR_WIDTH *
    DIAGONAL;

  const maxRemarkLevel =
    remarkItems.reduce(
      (max, item) =>
        Math.max(max, item.level),
      0
    );

  const remarkExtraHeight =
    maxRemarkLevel * 28;

  const svgHeight = Math.max(
    270,
    Math.ceil(
      gridBottomY +
      16 +
      6 +
      14 +
      remarkExtraHeight +
      tallestLabel +
      24
    )
  );

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

      {/* Header with Day Selector Tabs */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Driver's Daily Log
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            24-hour driver daily log grid.
          </p>
        </div>

        {/* Scrollable Single-Row Day Tabs */}


        <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap rounded-lg border border-slate-200 bg-slate-100 p-1">

          <span className="shrink-0 px-2 text-xs font-semibold text-slate-500">

            Daily Logs:

          </span>

          {dailyLogs.map((log, index) => {

            const isActive = index === safeIndex;

            const shortLabel = `Day ${index + 1} · ${formatShortDate(log.date)}`;

            return (

              <button

                key={log.date || index}

                type="button"

                onClick={() => setActiveDayIndex(index)}

                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition ${isActive

                  ? "bg-orange-600 text-white shadow-sm"

                  : "text-slate-700 hover:bg-slate-200"

                  }`}

              >

                {shortLabel}

              </button>

            );

          })}

        </div>
      </div>

      {/* SVG Container */}

      <div className="w-full overflow-x-auto rounded-xl border border-slate-300 bg-slate-50/50 p-2">

        <svg
          viewBox={`0 0 ${totalWidth} ${svgHeight} `}
          className="w-full min-w-[850px] font-sans"
        >

          {/* 1. PAPER FORM HEADER DATA */}

          <g transform="translate(10, 15)">

            <rect
              x="0"
              y="0"
              width={totalWidth - 20}
              height="52"
              fill="#ffffff"
              stroke="#cbd5e1"
              rx="6"
            />

            <text
              x="15"
              y="22"
              fontSize="11"
              fontWeight="bold"
              fill="#0f172a"
            >
              DATE:{" "}
              <tspan fill="#ea580c">
                {date}
              </tspan>
            </text>

            <text
              x="180"
              y="22"
              fontSize="11"
              fontWeight="bold"
              fill="#0f172a"
            >
              TOTAL MILES TODAY:{" "}
              <tspan fill="#ea580c">
                {total_miles} mi
              </tspan>
            </text>

            <text
              x="420"
              y="22"
              fontSize="11"
              fontWeight="bold"
              fill="#0f172a"
            >
              TRUCK #:{" "}
              <tspan
                fill="#94a3b8"
                letterSpacing="1"
              >
                . . . . . . . . . . . . . . . .
              </tspan>
            </text>

            <text
              x="630"
              y="22"
              fontSize="11"
              fontWeight="bold"
              fill="#0f172a"
            >
              CARRIER:{" "}
              <tspan
                fill="#94a3b8"
                letterSpacing="1"
              >
                . . . . . . . . . . . . . . . .
              </tspan>
            </text>

            <text
              x="15"
              y="42"
              fontSize="10"
              fill="#64748b"
            >
              MAIN OFFICE:{" "}
              <tspan
                fill="#94a3b8"
                letterSpacing="1"
              >
                . . . . . . . . . . . . . . . . . .
              </tspan>
            </text>

            <text
              x="630"
              y="42"
              fontSize="10"
              fill="#64748b"
            >
              RULE:{" "}
              <tspan fill="#334155">
                US 70hr / 8day
              </tspan>
            </text>

          </g>

          {/* 2. GRID HEADER HOURLY NUMBERS */}

          <g
            transform={`translate(${leftMargin}, ${gridY - 8
              })`}
          >
            {Array.from({
              length: 25,
            }).map((_, h) => {
              let label =
                h === 0 || h === 24
                  ? "M"
                  : h === 12
                    ? "N"
                    : h > 12
                      ? h - 12
                      : h;

              return (
                <text
                  key={h}
                  x={h * hourWidth}
                  y="0"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#475569"
                  textAnchor="middle"
                >
                  {label}
                </text>
              );
            })}
          </g>

          {/* 3. ROW LABELS ON LEFT */}

          {ROW_KEYS.map(
            (key, rIdx) => {
              const yCenter =
                getRowYCenter(
                  rIdx
                );

              return (
                <g key={key}>

                  <rect
                    x={leftMargin}
                    y={
                      gridY +
                      rIdx *
                      rowHeight
                    }
                    width={gridWidth}
                    height={rowHeight}
                    fill={
                      rIdx % 2 === 0
                        ? "#ffffff"
                        : "#f8fafc"
                    }
                  />

                  <text
                    x={
                      leftMargin -
                      12
                    }
                    y={
                      yCenter + 4
                    }
                    fontSize="11"
                    fontWeight="bold"
                    fill="#334155"
                    textAnchor="end"
                  >
                    {ROW_LABELS[key]}
                  </text>

                </g>
              );
            }
          )}

          {/* 4. GRID LINES & 15-MIN TICK MARKS */}

          <rect
            x={leftMargin}
            y={gridY}
            width={gridWidth}
            height={
              4 * rowHeight
            }
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />

          {/* Horizontal Row Dividers */}

          {[1, 2, 3].map(
            (r) => (
              <line
                key={r}
                x1={leftMargin}
                y1={
                  gridY +
                  r * rowHeight
                }
                x2={
                  leftMargin +
                  gridWidth
                }
                y2={
                  gridY +
                  r * rowHeight
                }
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            )
          )}

          {/* Vertical Hour & Quarter-Hour Ticks */}

          {Array.from({
            length: 24,
          }).map((_, h) => {
            const hourX =
              leftMargin +
              h * hourWidth;

            return (
              <g key={h}>

                {/* Full Hour Vertical Divider */}

                <line
                  x1={hourX}
                  y1={gridY}
                  x2={hourX}
                  y2={
                    gridBottomY
                  }
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />

                {/* 15-min, 30-min, 45-min Tick Marks */}

                {[0, 1, 2, 3].map(
                  (rIdx) => {
                    const rTop =
                      gridY +
                      rIdx *
                      rowHeight;

                    return (
                      <g
                        key={
                          rIdx
                        }
                      >

                        {/* 15 min tick */}

                        <line
                          x1={
                            hourX +
                            hourWidth *
                            0.25
                          }
                          y1={
                            rTop
                          }
                          x2={
                            hourX +
                            hourWidth *
                            0.25
                          }
                          y2={
                            rTop + 4
                          }
                          stroke="#94a3b8"
                          strokeWidth="0.75"
                        />

                        {/* 30 min tick */}

                        <line
                          x1={
                            hourX +
                            hourWidth *
                            0.5
                          }
                          y1={
                            rTop
                          }
                          x2={
                            hourX +
                            hourWidth *
                            0.5
                          }
                          y2={
                            rTop + 8
                          }
                          stroke="#64748b"
                          strokeWidth="1"
                        />

                        {/* 45 min tick */}

                        <line
                          x1={
                            hourX +
                            hourWidth *
                            0.75
                          }
                          y1={
                            rTop
                          }
                          x2={
                            hourX +
                            hourWidth *
                            0.75
                          }
                          y2={
                            rTop + 4
                          }
                          stroke="#94a3b8"
                          strokeWidth="0.75"
                        />

                      </g>
                    );
                  }
                )}

              </g>
            );
          })}

          {/* 5. DRAW THE ELD STATUS CONNECTING LINE */}

          {segmentPaths.map(
            (item, i) => (
              <path
                key={i}
                d={item.d}
                stroke={item.stroke}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            )
          )}

          {/* 6. TOTALS COLUMN ON THE RIGHT */}

          <g
            transform={`translate(${leftMargin +
              gridWidth
              }, ${gridY})`}
          >

            <text
              x="45"
              y="-8"
              fontSize="10"
              fontWeight="bold"
              fill="#475569"
              textAnchor="middle"
            >
              TOTAL
            </text>

            <rect
              x="0"
              y="0"
              width="85"
              height={
                4 * rowHeight
              }
              fill="#f1f5f9"
              stroke="#cbd5e1"
            />

            {ROW_KEYS.map(
              (key, rIdx) => {
                const yCenter =
                  rIdx *
                  rowHeight +
                  rowHeight /
                  2;

                const valFormatted =
                  formatHoursAndMinutes(
                    totals[key]
                  );

                return (
                  <g key={key}>

                    {rIdx > 0 && (
                      <line
                        x1="0"
                        y1={
                          rIdx *
                          rowHeight
                        }
                        x2="85"
                        y2={
                          rIdx *
                          rowHeight
                        }
                        stroke="#cbd5e1"
                      />
                    )}

                    <text
                      x="42"
                      y={
                        yCenter + 4
                      }
                      fontSize="10"
                      fontWeight="bold"
                      fill="#0f172a"
                      textAnchor="middle"
                    >
                      {
                        valFormatted
                      }
                    </text>

                  </g>
                );
              }
            )}

            {/* Grand Total */}

            <rect
              x="0"
              y={
                4 *
                rowHeight +
                4
              }
              width="85"
              height="22"
              fill="#ea580c"
              rx="4"
            />

            <text
              x="42"
              y={
                4 *
                rowHeight +
                19
              }
              fontSize="10"
              fontWeight="bold"
              fill="#ffffff"
              textAnchor="middle"
            >
              {formatHoursAndMinutes(
                totalSum
              )}
            </text>

          </g>

          {/* 7. REMARKS / LOCATION CHANGE LABELS */}

          <g
            transform={`translate(${leftMargin}, ${gridBottomY + 16
              })`}
          >

            <text
              x="-12"
              y="10"
              fontSize="11"
              fontWeight="bold"
              fill="#334155"
              textAnchor="end"
            >
              REMARKS:
            </text>

            <line
              x1="0"
              y1="0"
              x2={gridWidth}
              y2="0"
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3,3"
            />

            {remarkItems.map(
              (item, idx) => {

                // Each level is 26px lower.
                const levelGap = 28;

                // Each level gets progressively more vertical space.
                const lineLength =
                  item.level === 0
                    ? BASE_LINE_LENGTH
                    : item.level === 1
                      ? EXTENDED_LINE_LENGTH
                      : EXTRA_LINE_LENGTH;

                const tickEnd =
                  4 + lineLength;

                const textY =
                  lineLength + 10;

                return (
                  <g
                    key={idx}
                    transform="translate(0, 6)"
                  >

                    {/* One tick for every event in the group */}

                    {item.group.hours.map(
                      (
                        hour,
                        tickIdx
                      ) => (
                        <line
                          key={
                            tickIdx
                          }
                          x1={
                            hour *
                            hourWidth
                          }
                          y1="-6"
                          x2={
                            hour *
                            hourWidth
                          }
                          y2={
                            tickIdx ===
                              0
                              ? tickEnd
                              : 4
                          }
                          stroke="#ea580c"
                          strokeWidth="1.5"
                        />
                      )
                    )}

                    {/* Label with white visual padding */}

                    <g
                      transform={`translate(${item.labelX}, 0)`}
                    >

                      <text
                        transform={`rotate(-45, 0, ${textY})`}
                        x="0"
                        y={textY}
                        fontSize="9.5"
                        fontWeight="600"
                        fill="#ea580c"
                        textAnchor="end"
                        paintOrder="stroke"
                        stroke="#ffffff"
                        strokeWidth="4"
                        strokeLinejoin="round"
                      >
                        {item.label}
                      </text>

                      {/* Actual label text on top */}

                      <text
                        transform={`rotate(-45, 0, ${textY})`}
                        x="0"
                        y={textY}
                        fontSize="9.5"
                        fontWeight="600"
                        fill="#ea580c"
                        textAnchor="end"
                      >
                        {item.label}
                      </text>

                    </g>

                  </g>
                );
              }
            )}

          </g>

        </svg>

      </div>

    </section >
  );
}

export default LogSheet;