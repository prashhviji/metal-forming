import { useId } from 'react';

/** Tiny dependency-free trend line used inside stat cards. */
export function Sparkline({
  values,
  color,
  limit,
  height = 44,
}: {
  values: number[];
  color: string;
  /** Optional limit drawn as a dashed line when it falls inside the plotted range. */
  limit?: number;
  height?: number;
}) {
  const id = useId().replace(/:/g, '');
  if (values.length < 2) return <div style={{ height }} aria-hidden />;

  const W = 200;
  const lo = Math.min(...values, limit ?? Infinity);
  const hi = Math.max(...values, limit ?? -Infinity);
  const span = hi - lo || 1;
  const pad = 3;
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {limit !== undefined && (
        <line x1="0" x2={W} y1={y(limit)} y2={y(limit)} stroke="#f87171" strokeOpacity="0.5" strokeDasharray="4 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      )}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
