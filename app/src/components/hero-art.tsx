// Layered illustration for the welcome screen: a wallet card with a coin resting on it.
// Pure SVG with gradients for depth; scales cleanly and weighs ~2 kB.
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 320 220" role="img" aria-label="A wallet card with a bitcoin coin">
      <defs>
        <linearGradient id="ha-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#24316A" />
          <stop offset="1" stopColor="#0F1633" />
        </linearGradient>
        <linearGradient id="ha-card2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9ECF5" />
          <stop offset="1" stopColor="#D5DAE8" />
        </linearGradient>
        <radialGradient id="ha-coin" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFD08A" />
          <stop offset="0.55" stopColor="#F7931A" />
          <stop offset="1" stopColor="#C96A00" />
        </radialGradient>
        <linearGradient id="ha-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B85F00" />
          <stop offset="1" stopColor="#8A4500" />
        </linearGradient>
        <filter id="ha-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#101735" floodOpacity="0.22" />
        </filter>
        <pattern id="ha-rings" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="9" r="7" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>

      {/* back card */}
      <g transform="rotate(-8 170 110)">
        <rect x="70" y="40" width="200" height="124" rx="18" fill="url(#ha-card2)" />
      </g>

      {/* front card */}
      <g filter="url(#ha-shadow)">
        <rect x="40" y="62" width="220" height="136" rx="20" fill="url(#ha-card)" />
        <rect x="40" y="62" width="220" height="136" rx="20" fill="url(#ha-rings)" />
        <rect x="62" y="86" width="56" height="7" rx="3.5" fill="#ffffff" fillOpacity="0.35" />
        <rect x="62" y="104" width="112" height="16" rx="8" fill="#ffffff" fillOpacity="0.92" />
        <rect x="62" y="166" width="38" height="7" rx="3.5" fill="#ffffff" fillOpacity="0.25" />
        <rect x="106" y="166" width="38" height="7" rx="3.5" fill="#ffffff" fillOpacity="0.25" />
      </g>

      {/* coin */}
      <g transform="translate(232 70)">
        <ellipse cx="0" cy="40" rx="34" ry="8" fill="#101735" fillOpacity="0.18" />
        <ellipse cx="0" cy="6" rx="36" ry="36" fill="url(#ha-edge)" />
        <circle cx="0" cy="0" r="36" fill="url(#ha-coin)" />
        <circle cx="0" cy="0" r="27" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
        <path
          d="M-6 -15v30M2 -15v30M-10 -11h11a6 6 0 0 1 0 12h-11h12a6.5 6.5 0 0 1 0 13h-12"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
