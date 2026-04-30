"use client";

/**
 * PitchSVG — Base SVG pitch drawing for a 120×80 yard football pitch.
 * Renders lines, center circle, penalty areas, goal areas, and corner arcs.
 * Designed to be overlaid with interactive elements.
 */
export default function PitchSVG({ width = 600, height = 400 }) {
  // Scale factors: SVG viewBox is 120×80, rendered at aspect ratio 3:2
  const strokeWidth = 0.5;
  const strokeColor = "rgba(255,255,255,0.7)";

  return (
    <svg
      viewBox="0 0 120 80"
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Pitch outline */}
      <rect
        x="0" y="0" width="120" height="80"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Center line */}
      <line
        x1="60" y1="0" x2="60" y2="80"
        stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Center circle */}
      <circle
        cx="60" cy="40" r="9.15"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Center spot */}
      <circle cx="60" cy="40" r="0.5" fill={strokeColor} />

      {/* Left penalty area */}
      <rect
        x="0" y="18" width="18" height="44"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Left goal area */}
      <rect
        x="0" y="30" width="6" height="20"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Left penalty spot */}
      <circle cx="12" cy="40" r="0.5" fill={strokeColor} />

      {/* Left penalty arc */}
      <path
        d="M 18 33.5 A 9.15 9.15 0 0 1 18 46.5"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Right penalty area */}
      <rect
        x="102" y="18" width="18" height="44"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Right goal area */}
      <rect
        x="114" y="30" width="6" height="20"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Right penalty spot */}
      <circle cx="108" cy="40" r="0.5" fill={strokeColor} />

      {/* Right penalty arc */}
      <path
        d="M 102 33.5 A 9.15 9.15 0 0 0 102 46.5"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
      />

      {/* Corner arcs */}
      <path d="M 0 2 A 2 2 0 0 0 2 0" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
      <path d="M 118 0 A 2 2 0 0 0 120 2" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
      <path d="M 0 78 A 2 2 0 0 1 2 80" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
      <path d="M 118 80 A 2 2 0 0 1 120 78" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />

      {/* Goal mouths (thin rectangles behind the line) */}
      <rect
        x="-2" y="36" width="2" height="8"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 0.7}
      />
      <rect
        x="120" y="36" width="2" height="8"
        fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 0.7}
      />
    </svg>
  );
}
