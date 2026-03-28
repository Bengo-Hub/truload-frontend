"use client";

import { cn } from '@/lib/utils';

type TyreType = 'S' | 'D' | 'W' | 'L';

interface TyreTypeIconProps {
  tyreType: TyreType;
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'active' | 'captured' | 'current' | 'pending';
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { width: 28, height: 40, tyreW: 6, tyreH: 28, gap: 3, axleH: 2, lScale: 0.8 },
  md: { width: 40, height: 56, tyreW: 8, tyreH: 36, gap: 4, axleH: 3, lScale: 0.8 },
  lg: { width: 56, height: 72, tyreW: 10, tyreH: 46, gap: 5, axleH: 4, lScale: 0.8 },
};

const STATE_COLORS = {
  default: { tyre: '#6B7280', axle: '#9CA3AF', rim: '#D1D5DB' },
  active: { tyre: '#2563EB', axle: '#60A5FA', rim: '#93C5FD' },
  captured: { tyre: '#16A34A', axle: '#4ADE80', rim: '#86EFAC' },
  current: { tyre: '#CA8A04', axle: '#FACC15', rim: '#FDE68A' },
  pending: { tyre: '#D1D5DB', axle: '#E5E7EB', rim: '#F3F4F6' },
};

const TYRE_LABELS: Record<TyreType, string> = {
  S: 'Single',
  D: 'Dual',
  W: 'Wide',
  L: 'Low-profile',
};

/**
 * TyreTypeIcon — SVG icon for vehicle tyre configurations.
 * Shows a top-down axle view with tyre(s):
 * - S (Single): One narrow tyre
 * - D (Dual): Two narrow tyres side-by-side
 * - W (Wide): One wide/super-single tyre
 */
export function TyreTypeIcon({
  tyreType,
  size = 'md',
  state = 'default',
  showLabel = false,
  className,
}: TyreTypeIconProps) {
  const s = SIZE_MAP[size];
  const c = STATE_COLORS[state];

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <svg
        width={s.width}
        height={s.height}
        viewBox={`0 0 ${s.width} ${s.height}`}
        className="drop-shadow-sm"
      >
        {/* Axle bar (horizontal center line) */}
        <rect
          x={0}
          y={(s.height - s.axleH) / 2}
          width={s.width}
          height={s.axleH}
          rx={1}
          fill={c.axle}
        />

        {tyreType === 'S' && (
          /* Single tyre — one narrow tyre centered */
          <>
            <rect
              x={(s.width - s.tyreW) / 2}
              y={(s.height - s.tyreH) / 2}
              width={s.tyreW}
              height={s.tyreH}
              rx={2}
              fill={c.tyre}
              stroke={c.rim}
              strokeWidth={1}
            />
            {/* Tread pattern */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1={(s.width - s.tyreW) / 2 + 1}
                y1={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                x2={(s.width + s.tyreW) / 2 - 1}
                y2={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                stroke={c.rim}
                strokeWidth={0.5}
              />
            ))}
          </>
        )}

        {tyreType === 'D' && (
          /* Dual tyres — two narrow tyres side-by-side */
          <>
            <rect
              x={(s.width - s.tyreW * 2 - s.gap) / 2}
              y={(s.height - s.tyreH) / 2}
              width={s.tyreW}
              height={s.tyreH}
              rx={2}
              fill={c.tyre}
              stroke={c.rim}
              strokeWidth={1}
            />
            <rect
              x={(s.width + s.gap) / 2}
              y={(s.height - s.tyreH) / 2}
              width={s.tyreW}
              height={s.tyreH}
              rx={2}
              fill={c.tyre}
              stroke={c.rim}
              strokeWidth={1}
            />
            {/* Tread pattern on both */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <g key={pct}>
                <line
                  x1={(s.width - s.tyreW * 2 - s.gap) / 2 + 1}
                  y1={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                  x2={(s.width - s.tyreW * 2 - s.gap) / 2 + s.tyreW - 1}
                  y2={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                  stroke={c.rim}
                  strokeWidth={0.5}
                />
                <line
                  x1={(s.width + s.gap) / 2 + 1}
                  y1={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                  x2={(s.width + s.gap) / 2 + s.tyreW - 1}
                  y2={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                  stroke={c.rim}
                  strokeWidth={0.5}
                />
              </g>
            ))}
          </>
        )}

        {tyreType === 'L' && (
          /* Low-profile tyre — smaller version of single */
          <>
            <rect
              x={(s.width - s.tyreW * 0.7) / 2}
              y={(s.height - s.tyreH * 0.7) / 2}
              width={s.tyreW * 0.7}
              height={s.tyreH * 0.7}
              rx={1}
              fill={c.tyre}
              stroke={c.rim}
              strokeWidth={1}
            />
          </>
        )}

        {tyreType === 'W' && (
          /* Wide single — one fat super-single tyre */
          <>
            <rect
              x={(s.width - s.tyreW * 1.8) / 2}
              y={(s.height - s.tyreH) / 2}
              width={s.tyreW * 1.8}
              height={s.tyreH}
              rx={3}
              fill={c.tyre}
              stroke={c.rim}
              strokeWidth={1}
            />
            {/* Wide tread pattern */}
            {[0.2, 0.4, 0.6, 0.8].map((pct) => (
              <line
                key={pct}
                x1={(s.width - s.tyreW * 1.8) / 2 + 2}
                y1={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                x2={(s.width + s.tyreW * 1.8) / 2 - 2}
                y2={(s.height - s.tyreH) / 2 + s.tyreH * pct}
                stroke={c.rim}
                strokeWidth={0.8}
              />
            ))}
          </>
        )}
      </svg>
      {showLabel && (
        <span className="text-[10px] font-medium text-muted-foreground">{TYRE_LABELS[tyreType]}</span>
      )}
    </div>
  );
}

/**
 * EmptyAxleSlot — placeholder for an empty group slot that can be clicked to add axles
 */
export function EmptyAxleSlot({
  size = 'md',
  onClick,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}) {
  const s = SIZE_MAP[size];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-md border-2 border-dashed border-gray-300',
        'hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer',
        className
      )}
      style={{ width: s.width + 8, height: s.height + 8 }}
      title="Click to add axle to this group"
    >
      <svg width={s.width} height={s.height} viewBox={`0 0 ${s.width} ${s.height}`}>
        <text
          x={s.width / 2}
          y={s.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#9CA3AF"
          fontSize={s.width * 0.4}
          fontWeight="bold"
        >
          +
        </text>
      </svg>
    </button>
  );
}

export default TyreTypeIcon;
