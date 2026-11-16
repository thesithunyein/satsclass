// SatsClass mark: a navy tile with three rising orange steps that read as an "S".
// Steps = learning one move at a time; orange = sats.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="SatsClass">
      <defs>
        <linearGradient id="sc-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E2A5A" />
          <stop offset="1" stopColor="#101735" />
        </linearGradient>
        <linearGradient id="sc-step" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFB547" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#sc-tile)" />
      <path d="M11 27.5h7.5v-5H26" stroke="url(#sc-step)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M14 17.5h7.5v-5H29" stroke="url(#sc-step)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.55" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark size={30} />
      <span className="logo-word">SatsClass</span>
    </span>
  );
}
