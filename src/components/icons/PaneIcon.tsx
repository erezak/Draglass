type PaneSide = "left" | "right";
type PaneState = "open" | "closed";

export function PaneIcon({
  side,
  state,
  size = 20,
  className,
}: {
  side: PaneSide;
  state: PaneState;
  size?: number;
  className?: string;
}) {
  const stroke = "currentColor";
  const outer = { x: 2.5, y: 2.5, w: 19, h: 19, r: 4.5 };

  const barW = 3;
  const barInsetOpen = 5.5;
  const barInsetClosed = 2.5;

  const inset = state === "open" ? barInsetOpen : barInsetClosed;

  const barXRight = outer.x + outer.w - inset - barW;
  const barXLeft = outer.x + inset;

  const barX = side === "right" ? barXRight : barXLeft;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x={outer.x}
        y={outer.y}
        width={outer.w}
        height={outer.h}
        rx={outer.r}
        stroke={stroke}
        strokeWidth={1.75}
      />
      <rect
        x={barX}
        y={6}
        width={barW}
        height={12}
        rx={1.5}
        fill={stroke}
      />
    </svg>
  );
}
