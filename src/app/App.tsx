export default function App() {
  return (
    <div
      style={{ background: '#1a0533', minHeight: '100vh' }}
      className="flex items-center justify-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width="320"
        height="320"
      >
        <defs>
          {/* Tile background gradient */}
          <linearGradient id="tile-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B0764" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>

          {/* Shield fill — subtle lighter purple */}
          <linearGradient id="shield-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>

          {/* Clip the two figures inside the shield */}
          <clipPath id="shield-clip">
            <path d="M256 108 L352 148 L352 268 Q352 330 256 368 Q160 330 160 268 L160 148 Z" />
          </clipPath>
        </defs>

        {/* ── Tile background ── */}
        <rect width="512" height="512" rx="112" fill="url(#tile-bg)" />

        {/* ── Subtle inner glow ring ── */}
        <rect
          width="512"
          height="512"
          rx="112"
          fill="none"
          stroke="white"
          strokeOpacity="0.07"
          strokeWidth="2"
        />

        {/* ── Shield body ── */}
        <path
          d="M256 108 L356 150 L356 272 Q356 338 256 378 Q156 338 156 272 L156 150 Z"
          fill="url(#shield-fill)"
          stroke="white"
          strokeOpacity="0.9"
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* ── Vertical dividing line inside shield ── */}
        <line
          x1="256" y1="158"
          x2="256" y2="360"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeDasharray="6 5"
          clipPath="url(#shield-clip)"
        />

        {/* ══ LEFT FIGURE ══ */}
        {/* Head */}
        <circle cx="210" cy="210" r="26" fill="white" fillOpacity="0.92" clipPath="url(#shield-clip)" />
        {/* Body */}
        <path
          d="M184 248 Q184 238 210 238 Q236 238 236 248 L236 300 Q236 308 228 308 L192 308 Q184 308 184 300 Z"
          fill="white"
          fillOpacity="0.92"
          clipPath="url(#shield-clip)"
        />
        {/* Mask bar — anonymity symbol over face */}
        <rect
          x="187" y="207" width="46" height="14"
          rx="7"
          fill="#6D28D9"
          fillOpacity="0.85"
          clipPath="url(#shield-clip)"
        />

        {/* ══ RIGHT FIGURE ══ */}
        {/* Head */}
        <circle cx="302" cy="210" r="26" fill="white" fillOpacity="0.92" clipPath="url(#shield-clip)" />
        {/* Body */}
        <path
          d="M276 248 Q276 238 302 238 Q328 238 328 248 L328 300 Q328 308 320 308 L284 308 Q276 308 276 300 Z"
          fill="white"
          fillOpacity="0.92"
          clipPath="url(#shield-clip)"
        />
        {/* Mask bar */}
        <rect
          x="279" y="207" width="46" height="14"
          rx="7"
          fill="#6D28D9"
          fillOpacity="0.85"
          clipPath="url(#shield-clip)"
        />

        {/* ── VS badge centered on divider ── */}
        <circle cx="256" cy="300" r="22" fill="#7C3AED" clipPath="url(#shield-clip)" />
        <circle
          cx="256" cy="300" r="22"
          fill="none"
          stroke="white"
          strokeOpacity="0.9"
          strokeWidth="2.5"
          clipPath="url(#shield-clip)"
        />
        {/* "VS" text */}
        <text
          x="256" y="306"
          textAnchor="middle"
          fill="white"
          fontSize="15"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5"
          clipPath="url(#shield-clip)"
        >
          VS
        </text>

        {/* ── Lock shackle at top of shield (privacy metaphor) ── */}
        <path
          d="M238 120 A18 18 0 0 1 274 120"
          fill="none"
          stroke="white"
          strokeOpacity="0.85"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* ── Small lock body on shield apex ── */}
        <rect
          x="228" y="117" width="56" height="38"
          rx="9"
          fill="#4C1D95"
          stroke="white"
          strokeOpacity="0.85"
          strokeWidth="5"
        />
        {/* Keyhole dot */}
        <circle cx="256" cy="131" r="6" fill="white" fillOpacity="0.9" />
        {/* Keyhole slot */}
        <rect x="252" y="131" width="8" height="10" rx="2" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  );
}
