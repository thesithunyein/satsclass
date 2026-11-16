// Hand-drawn 24px line icons (1.75 stroke). No icon library: smaller bundle, consistent style.
type P = { size?: number; className?: string };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconReceive = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M17 7 7 17" /><path d="M16 17H7V8" /></svg>
);
export const IconSend = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
);
export const IconDrop = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3.5c3.2 3.6 5.5 6.7 5.5 9.6a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-9.6Z" /><path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" /></svg>
);
export const IconCopy = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></svg>
);
export const IconLock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
);
export const IconKey = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.7-8.7" /><path d="m16.5 6.5 2.5 2.5" /><path d="m14.5 8.5 2 2" /></svg>
);
export const IconShield = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6l-7-2.5Z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
);
export const IconPhone = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>
);
export const IconSignal = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 18v-2" /><path d="M9.5 18v-5" /><path d="M14 18V9.5" /><path d="M18.5 18V6" /></svg>
);
export const IconClose = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="m9.5 6 6 6-6 6" /></svg>
);
export const IconExternal = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M18 14v4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10" /></svg>
);
export const IconRefresh = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></svg>
);
export const IconTrash = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4.5 7h15" /><path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" /><path d="m6.5 7 .9 11.6A2 2 0 0 0 9.4 20.5h5.2a2 2 0 0 0 2-1.9L17.5 7" /></svg>
);
export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconAlert = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5" /><path d="M12 16h.01" /></svg>
);
