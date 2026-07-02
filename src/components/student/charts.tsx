/* 순수 SVG 차트 (서버 컴포넌트) */

export function LineChart({
  points, labels, color, min = 60, max = 100,
}: {
  points: number[];
  labels: string[];
  color: string;
  min?: number;
  max?: number;
}) {
  const W = 320, H = 150, padX = 14, padTop = 12, padBottom = 26;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = points.length;
  const x = (i: number) => padX + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => padTop + innerH * (1 - (v - min) / (max - min));
  const gid = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  const line = points.map((p, i) => `${x(i)},${y(p)}`).join(" ");
  const area = `${padX},${padTop + innerH} ${line} ${x(n - 1)},${padTop + innerH}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="점수 추이">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 가로 그리드 */}
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={padTop + innerH * g} y2={padTop + innerH * g} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p)} r="3.2" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">{l}</text>
      ))}
    </svg>
  );
}

export function Donut({ value, color, size = 96 }: { value: number; color: string; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(value, 100) / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold" style={{ color }}>{value}%</span>
        <span className="text-[10px] text-slate-400">진행도</span>
      </div>
    </div>
  );
}
