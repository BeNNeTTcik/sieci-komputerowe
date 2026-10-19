// SPDX-License-Identifier: MIT
// Własne, proste ikony urządzeń (SVG) – bez grafik producentów.
import React from 'react';
import type { DeviceType } from './model';

export const DEVICE_COLORS: Record<DeviceType, string> = {
  pc: '#2563eb',
  server: '#334155',
  router: '#0d9488',
  switch: '#4f46e5',
  printer: '#c2410c',
};

export function DeviceGlyph({ type, scale = 1 }: { type: DeviceType; scale?: number }) {
  const c = DEVICE_COLORS[type];
  const w = '#ffffff';
  return (
    <g transform={`scale(${scale})`}>
      {type === 'pc' && (
        <>
          <rect x={-22} y={-21} width={44} height={30} rx={4} fill={c} />
          <rect x={-18} y={-17} width={36} height={22} rx={2} fill="#dbeafe" />
          <path d="M-12 -6 h10 M-12 -1 h18 M-12 -11 h14" stroke={c} strokeWidth={2} strokeLinecap="round" />
          <rect x={-4} y={9} width={8} height={6} fill={c} />
          <rect x={-13} y={15} width={26} height={4} rx={2} fill={c} />
        </>
      )}
      {type === 'server' && (
        <>
          <rect x={-17} y={-24} width={34} height={46} rx={4} fill={c} />
          {[-17, -6, 5].map((y) => (
            <g key={y}>
              <rect x={-12} y={y} width={24} height={8} rx={1.5} fill="#e2e8f0" />
              <circle cx={7} cy={y + 4} r={1.6} fill="#22c55e" />
              <path d={`M-9 ${y + 4} h10`} stroke="#64748b" strokeWidth={1.5} />
            </g>
          ))}
        </>
      )}
      {type === 'router' && (
        <>
          <ellipse cx={0} cy={8} rx={25} ry={9} fill={c} />
          <rect x={-25} y={-6} width={50} height={14} fill={c} />
          <ellipse cx={0} cy={-6} rx={25} ry={9} fill="#14b8a6" />
          <g stroke={w} strokeWidth={2.2} strokeLinecap="round" fill="none">
            <path d="M-15 -9 l7 3 M-15 -9 l3 -4" transform="translate(-1,0)" />
            <path d="M-6 -6 L-15 -9" />
            <path d="M15 -3 l-7 -3 M15 -3 l-3 4" transform="translate(1,0)" />
            <path d="M6 -6 L15 -3" />
          </g>
        </>
      )}
      {type === 'switch' && (
        <>
          <rect x={-30} y={-13} width={60} height={26} rx={5} fill={c} />
          <g stroke={w} strokeWidth={2.2} strokeLinecap="round" fill="none">
            <path d="M-16 -4 h30 m-5 -4 l5 4 l-5 4" />
            <path d="M16 5 h-30 m5 -4 l-5 4 l5 4" />
          </g>
        </>
      )}
      {type === 'printer' && (
        <>
          <rect x={-13} y={-21} width={26} height={14} rx={1} fill="#fff7ed" stroke={c} strokeWidth={2} />
          <rect x={-24} y={-9} width={48} height={20} rx={4} fill={c} />
          <circle cx={16} cy={-2} r={2.2} fill="#fed7aa" />
          <rect x={-13} y={7} width={26} height={12} rx={1} fill="#ffffff" stroke={c} strokeWidth={2} />
          <path d="M-8 12 h16 M-8 16 h10" stroke={c} strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

export function DeviceIcon({ type, size = 22 }: { type: DeviceType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-32 -26 64 52" aria-hidden="true">
      <DeviceGlyph type={type} />
    </svg>
  );
}
