// Simple authored line icons (24x24, 1.6px stroke, round caps) for the step
// sidebar -- kept as plain components rather than a font/emoji so the stroke
// weight and alignment stay consistent with the rest of the UI.
const common = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function CustomerIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function OrderIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <path d="M4 7h16l-1.4 10.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8 7V5.5A3.5 3.5 0 0 1 11.5 2h1A3.5 3.5 0 0 1 16 5.5V7" />
    </svg>
  );
}

export function BillIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <path d="M6 2.5h12v19l-2.5-1.5L13 21.5 10.5 20 8 21.5 5.5 20V2.5Z" transform="translate(0.5 0)" />
      <path d="M9 8h6M9 12h6M9 16h3.5" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
