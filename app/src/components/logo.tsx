// SatsClass mark: a friendly sat-coin wearing a graduation cap.
// Coin = sats, cap = class. Rounded shapes to match the app's soft UI.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="SatsClass">
      <defs>
        <radialGradient id="lm-coin" cx="0.35" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#FFD18C" />
          <stop offset="0.55" stopColor="#F7931A" />
          <stop offset="1" stopColor="#D9730A" />
        </radialGradient>
        <linearGradient id="lm-cap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2A3A7C" />
          <stop offset="1" stopColor="#101735" />
        </linearGradient>
      </defs>
      {/* coin edge + face */}
      <circle cx="24" cy="27.5" r="17" fill="#C2650A" />
      <circle cx="24" cy="26" r="17" fill="url(#lm-coin)" />
      <circle cx="24" cy="26" r="12.5" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.6" />
      {/* happy face */}
      <circle cx="19.3" cy="26" r="1.9" fill="#101735" />
      <circle cx="28.7" cy="26" r="1.9" fill="#101735" />
      <path d="M20.6 30.6c2 1.8 4.8 1.8 6.8 0" fill="none" stroke="#101735" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="16.4" cy="29.6" r="1.6" fill="#ffffff" fillOpacity="0.35" />
      <circle cx="31.6" cy="29.6" r="1.6" fill="#ffffff" fillOpacity="0.35" />
      {/* graduation cap, slightly tilted */}
      <g transform="rotate(-10 24 10)">
        <path d="M15.5 12.2v4.3c0 1.6 3.8 3 8.5 3s8.5-1.4 8.5-3v-4.3" fill="#1A2550" />
        <path d="M24 3.5 41 10.5 24 17.5 7 10.5Z" fill="url(#lm-cap)" stroke="#101735" strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M24 10.5 36.5 13v6.2" fill="none" stroke="#FFB547" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="36.5" cy="20.4" r="1.9" fill="#FFB547" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark size={34} />
      <span className="logo-word">SatsClass</span>
    </span>
  );
}
