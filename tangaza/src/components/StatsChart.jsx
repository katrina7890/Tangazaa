import { useEffect, useState } from 'react';

/**
 * Lightweight, dependency-free SVG bar chart for comparing a handful of category
 * totals. Value labels are always shown (per the skill's "Compare Categories"
 * guidance); bars grow in once on mount. Colours are passed per datum.
 *
 * @param {{ data: { label: string, value: number, color: string }[], title?: string }} props
 */
export default function StatsChart({ data, title }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const W = 520;
  const H = 240;
  const pad = { top: 28, right: 12, bottom: 38, left: 12 };
  const innerH = H - pad.top - pad.bottom;
  const innerW = W - pad.left - pad.right;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = innerW / data.length;
  const barW = Math.min(64, slot * 0.5);
  const baseline = H - pad.bottom;

  return (
    <div className="rounded-3xl border border-sand bg-white p-6 shadow-sm">
      {title && <h2 className="mb-4 font-serif text-lg font-semibold text-forest">{title}</h2>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title || 'Statistics'}>
        {/* horizontal guide lines */}
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad.left}
            x2={W - pad.right}
            y1={baseline - innerH * t}
            y2={baseline - innerH * t}
            stroke="#efe4cd"
            strokeWidth="1"
          />
        ))}
        <line x1={pad.left} x2={W - pad.right} y1={baseline} y2={baseline} stroke="#e0cda6" strokeWidth="1.5" />

        {data.map((d, i) => {
          const fullH = (d.value / max) * innerH;
          const h = grown ? fullH : 0;
          const x = pad.left + slot * i + (slot - barW) / 2;
          const y = baseline - h;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="7"
                fill={d.color}
                style={{ transition: 'y 0.7s ease, height 0.7s ease' }}
              />
              <text
                x={x + barW / 2}
                y={y - 9}
                textAnchor="middle"
                fill="#1c2c24"
                style={{ fontSize: 15, fontWeight: 700, opacity: grown ? 1 : 0, transition: 'opacity 0.7s ease 0.3s' }}
              >
                {d.value}
              </text>
              <text x={x + barW / 2} y={baseline + 20} textAnchor="middle" fill="#78716c" style={{ fontSize: 12 }}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
