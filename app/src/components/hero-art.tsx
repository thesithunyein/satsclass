import { LogoMark } from "./logo";

// Welcome illustration in the mascot's flat style: the coin character on a soft disc,
// with two small sats floating nearby.
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="hero-bg" viewBox="0 0 320 220">
        <circle cx="160" cy="118" r="96" fill="#FFE7CC" />
        <circle cx="160" cy="118" r="70" fill="#FFD9AE" />
        {/* small floating sats */}
        <g transform="translate(64 70) rotate(-12)">
          <ellipse cx="0" cy="2" rx="15" ry="14" fill="#E27A08" />
          <ellipse cx="0" cy="0" rx="15" ry="14" fill="#F7931A" />
          <ellipse cx="0" cy="0" rx="10" ry="9.3" fill="none" stroke="#FFB04A" strokeWidth="1.6" />
        </g>
        <g transform="translate(262 150) rotate(10)">
          <ellipse cx="0" cy="2" rx="11" ry="10.4" fill="#E27A08" />
          <ellipse cx="0" cy="0" rx="11" ry="10.4" fill="#F7931A" />
          <ellipse cx="0" cy="0" rx="7.2" ry="6.8" fill="none" stroke="#FFB04A" strokeWidth="1.4" />
        </g>
        <circle cx="250" cy="62" r="5" fill="#101735" />
        <circle cx="86" cy="168" r="4" fill="#101735" opacity="0.25" />
        <ellipse cx="160" cy="206" rx="54" ry="7" fill="#101735" opacity="0.08" />
      </svg>
      <div className="hero-mascot"><LogoMark size={168} /></div>
    </div>
  );
}
