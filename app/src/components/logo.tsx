// SatsClass mascot: a little sat-coin in a graduation cap.
// Flat shapes, no gloss: friendly at 30px and on a projector.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="SatsClass">
  {/* feet */}
  <ellipse cx="18.5" cy="43.6" rx="3.6" ry="2.2" fill="#101735"/>
  <ellipse cx="29.5" cy="43.6" rx="3.6" ry="2.2" fill="#101735"/>
  {/* body: flat coin with flat lower shade */}
  <ellipse cx="24" cy="27.5" rx="16.5" ry="15.5" fill="#F7931A"/>
  <path d="M8.2 31.5c1.8 6.6 8.2 11.5 15.8 11.5s14-4.9 15.8-11.5c-3.4 4.2-9.2 7-15.8 7s-12.4-2.8-15.8-7Z" fill="#E27A08"/>
  {/* coin rim */}
  <ellipse cx="24" cy="27.3" rx="13.4" ry="12.5" fill="none" stroke="#FFB04A" strokeWidth="1.6"/>
  <path d="M24 13.4v2.2M24 39v2.2" stroke="#FFB04A" strokeWidth="1.6" strokeLinecap="round"/>
  {/* face, set low for a baby-face proportion */}
  <ellipse cx="18.6" cy="29.2" rx="2.3" ry="2.7" fill="#101735"/>
  <ellipse cx="29.4" cy="29.2" rx="2.3" ry="2.7" fill="#101735"/>
  <circle cx="19.4" cy="28.2" r="0.85" fill="#fff"/>
  <circle cx="30.2" cy="28.2" r="0.85" fill="#fff"/>
  <path d="M22.3 32.9c.9 1 2.5 1 3.4 0" fill="none" stroke="#101735" strokeWidth="1.6" strokeLinecap="round"/>
  <ellipse cx="14.6" cy="32.6" rx="2.3" ry="1.4" fill="#FF8F6B" opacity="0.75"/>
  <ellipse cx="33.4" cy="32.6" rx="2.3" ry="1.4" fill="#FF8F6B" opacity="0.75"/>
  {/* tiny cap, tilted */}
  <g transform="rotate(-14 26 12)">
    <path d="M18.5 12.6v3.2c0 1.2 3.4 2.2 7.5 2.2s7.5-1 7.5-2.2v-3.2" fill="#1E2A5A"/>
    <path d="M26 5.2 38.5 10.6 26 16 13.5 10.6Z" fill="#101735"/>
    <path d="M26 10.6 35.6 12.4v5.4" fill="none" stroke="#FFC857" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="35.6" cy="18.6" r="1.7" fill="#FFC857"/>
  </g>
</svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <LogoMark size={36} />
      <span className="logo-word">SatsClass</span>
    </span>
  );
}
