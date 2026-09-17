const STAY = "#E4A3B8";
const MOVE = "#8FBFD4";

function Chair({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <rect
      x={x}
      y={y}
      width={17}
      height={12}
      rx={2}
      fill={color}
      fillOpacity={0.14}
      stroke={color}
      strokeOpacity={0.58}
      strokeWidth={1.15}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function Desk({
  x,
  y,
  color,
  arrow,
}: {
  x: number;
  y: number;
  color: string;
  arrow?: boolean;
}) {
  const seats = [0, 1, 2, 3].map((i) => x + 5 + i * 27);
  return (
    <g>
      {arrow ? (
        <path
          d={`M ${x - 20} ${y + 10} H ${x - 8} M ${x - 8} ${y + 10} l -6 -4.5 M ${x - 8} ${y + 10} l -6 4.5`}
          fill="none"
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <rect
        x={x}
        y={y}
        width={112}
        height={20}
        rx={3}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeOpacity={0.84}
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
      />
      {seats.map((cx) => (
        <Chair key={cx} x={cx} y={y + 24} color={color} />
      ))}
    </g>
  );
}

function Cart({ x, y }: { x: number; y: number }) {
  const wheels = [8, 26];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={34}
        height={20}
        rx={3}
        fill={MOVE}
        fillOpacity={0.18}
        stroke={MOVE}
        strokeOpacity={0.84}
        strokeWidth={1.3}
        vectorEffect="non-scaling-stroke"
      />
      {wheels.map((dx) => (
        <circle
          key={dx}
          cx={x + dx}
          cy={y + 21}
          r={2.4}
          fill="none"
          stroke={MOVE}
          strokeOpacity={0.7}
          strokeWidth={1.1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function PayneRoomPlan() {
  const rows = [102, 172, 242, 312];
  return (
    <svg
      viewBox="0 0 340 400"
      className="mx-auto block w-full max-w-[22rem]"
      role="img"
      aria-label="Payne Hall 213 target layout. Pink tables stay. Cyan tables on the left with arrows move to Sun Devil Hall."
    >
      <rect
        x="18"
        y="14"
        width="304"
        height="372"
        rx="16"
        fill="none"
        stroke="var(--mkt-canvas)"
        strokeOpacity={0.22}
        strokeWidth={1.15}
        vectorEffect="non-scaling-stroke"
      />
      <Cart x={48} y={36} />
      <Desk x={42} y={rows[0]} color={MOVE} arrow />
      <Desk x={42} y={rows[1]} color={STAY} />
      <Desk x={42} y={rows[2]} color={MOVE} arrow />
      <Desk x={42} y={rows[3]} color={STAY} />
      <Desk x={186} y={rows[0]} color={STAY} />
      <Desk x={186} y={rows[1]} color={STAY} />
      <Desk x={186} y={rows[2]} color={STAY} />
      <Desk x={186} y={rows[3]} color={STAY} />
    </svg>
  );
}
