export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="-4 -6 174 162"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(-12 58 60)">
        <rect className="brand-mark-canvas" x="8" y="10" width="100" height="100" />
        <path
          className="brand-mark-letter"
          transform="translate(18 20) scale(.8)"
          d="M15 10 H31 L50 43 L69 10 H85 V90 H68 V43 L50 72 L32 43 V90 H15 Z"
        />
      </g>
      <rect
        className="brand-mark-blue"
        x="0" y="116" width="90" height="25"
        transform="rotate(-12 45 128.5)"
      />
      <rect
        className="brand-mark-red"
        x="112" y="0" width="42" height="126"
        transform="rotate(12 133 63)"
      />
    </svg>
  );
}
