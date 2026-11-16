// Welcome illustration: a class board and a phone that has just sent its first sats.
// Flat style, same palette as the mascot, but a scene rather than the logo itself.
export function HeroArt({ fr = false }: { fr?: boolean }) {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="hero-bg" viewBox="0 0 320 220" fontFamily="inherit">
        <circle cx="160" cy="112" r="100" fill="#FFE7CC" />
        <ellipse cx="166" cy="208" rx="96" ry="7" fill="#101735" opacity="0.08" />

        {/* class board */}
        <g transform="translate(40 46) rotate(-4)">
          <line x1="20" y1="76" x2="12" y2="128" stroke="#101735" strokeWidth="5" strokeLinecap="round" />
          <line x1="96" y1="76" x2="104" y2="128" stroke="#101735" strokeWidth="5" strokeLinecap="round" />
          <rect x="0" y="0" width="116" height="82" rx="10" fill="#101735" />
          <rect x="7" y="7" width="102" height="68" rx="6" fill="#1F2A55" />
          <text x="18" y="40" fill="#FFFFFF" fontSize="22" fontWeight="700">₿ 101</text>
          <path d="M18 54 h46 M18 63 h30" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="58" r="7" fill="#F7931A" />
        </g>

        {/* dotted path of the payment */}
        <path d="M232 64 C 252 34, 280 36, 288 58" fill="none" stroke="#101735" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />

        {/* phone */}
        <g transform="translate(158 26) rotate(5)">
          <rect x="0" y="0" width="94" height="170" rx="18" fill="#101735" />
          <rect x="6" y="8" width="82" height="154" rx="13" fill="#FFFFFF" />
          <rect x="34" y="14" width="26" height="5" rx="2.5" fill="#101735" opacity="0.15" />
          {/* balance card */}
          <rect x="13" y="28" width="68" height="46" rx="10" fill="#101735" />
          <text x="21" y="41" fill="#FFFFFF" fillOpacity="0.6" fontSize="8" fontWeight="600">{fr ? "Solde" : "Balance"}</text>
          <text x="21" y="58" fill="#FFFFFF" fontSize="14" fontWeight="700">{fr ? "10 000" : "10,000"}</text>
          <text x="21" y="68" fill="#F7931A" fontSize="7.5" fontWeight="700">sats</text>
          {/* buttons */}
          <rect x="13" y="82" width="32" height="14" rx="7" fill="#F7931A" />
          <rect x="49" y="82" width="32" height="14" rx="7" fill="#E7EAF6" />
          {/* sent toast */}
          <rect x="13" y="106" width="68" height="24" rx="12" fill="#E3F6EA" />
          <circle cx="26" cy="118" r="7" fill="#1FA055" />
          <path d="M22.8 118.2 l2.3 2.3 4-4.4" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="38" y="121.5" fill="#146B39" fontSize="9" fontWeight="700">{fr ? "Envoyé" : "Sent"}</text>
          <rect x="13" y="140" width="50" height="5" rx="2.5" fill="#101735" opacity="0.1" />
        </g>

        {/* flying sat */}
        <g className="hero-coin">
          <g transform="translate(290 64)">
            <ellipse cx="0" cy="2" rx="15" ry="14" fill="#E27A08" />
            <ellipse cx="0" cy="0" rx="15" ry="14" fill="#F7931A" />
            <ellipse cx="0" cy="0" rx="10" ry="9.3" fill="none" stroke="#FFB04A" strokeWidth="1.6" />
          </g>
        </g>
        <circle cx="60" cy="30" r="4" fill="#101735" opacity="0.25" />
        <circle cx="140" cy="20" r="5" fill="#F7931A" />
      </svg>
    </div>
  );
}
