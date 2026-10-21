// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Widok „TCP / UDP”: diagram drabinkowy jednego przepływu warstwy transportowej między dwoma hostami.
// Routery i przełączniki po drodze są pominięte – widać tylko to, co wysyła i odbiera warstwa 4:
// uzgadnianie, numery sekwencyjne, okno, potwierdzenia, straty i retransmisje (TCP) albo ich brak (UDP).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { IpPacket, SimEvent, TcpPdu, UdpPdu } from './engine';
import { TCP_TIME_WAIT } from './engine';
import { Network, PROTO_COLORS, addressesOf, getDev, sameIp } from './model';
import styles from './styles.module.css';

// ---------- dane: segmenty i przepływy ----------

interface Seg {
  key: string;
  proto: 'TCP' | 'UDP';
  /** urządzenie nadawcy i odbiorcy (hosty końcowe) */
  from: string;
  to: string;
  src: string;
  dst: string;
  t0: number;
  /** chwila dotarcia (gdy dotarł) */
  t1?: number;
  /** chwila i miejsce zgubienia */
  tLost?: number;
  lostWhere?: string;
  first: SimEvent;
  /** zdarzenie do pokazania po kliknięciu (dotarcie albo zgubienie) */
  focus: SimEvent;
  ip: IpPacket;
  tcp?: TcpPdu;
  udp?: UdpPdu;
  summary: string;
}

export interface Flow {
  key: string;
  proto: 'TCP' | 'UDP';
  run: number;
  /** strona inicjująca (klient) i druga strona */
  a: { dev: string; ip: string; port: number };
  b: { dev: string; ip: string; port: number };
  segs: Seg[];
}

const l4 = (e: SimEvent): IpPacket | undefined => {
  const p = e.frame.ip;
  if (!p) return undefined;
  const q = p.proto === 'ENCAP' && p.inner ? p.inner : p;
  return q.tcp || q.udp ? q : undefined;
};

const isLoss = (e: SimEvent) => e.dropped && e.notes.some((n) => n.startsWith('Ramka zginęła'));

function ownerOf(net: Network, ip: string): string | undefined {
  return net.devices.find((d) => addressesOf(d).some((a) => sameIp(a, ip)))?.id;
}

export function buildFlows(events: SimEvent[], net: Network): Flow[] {
  // 1. zdarzenia → segmenty (jeden pakiet IP = jeden segment, niezależnie od liczby skoków)
  const bySeg = new Map<string, SimEvent[]>();
  for (const e of events) {
    if (e.kind !== 'hop' && !e.dropped) continue;
    const p = l4(e);
    if (!p) continue;
    const k = `${e.run}|${p.src}|${p.dst}|${p.id}|${p.tcp ? 'T' : 'U'}`;
    const list = bySeg.get(k);
    if (list) list.push(e);
    else bySeg.set(k, [e]);
  }
  const segs: (Seg & { run: number })[] = [];
  for (const [k, list] of bySeg) {
    list.sort((x, y) => x.id - y.id);
    const first = list[0];
    const p = l4(first)!;
    const dstDev = ownerOf(net, p.dst);
    const srcDev = first.from;
    const arrive = list.find((e) => e.kind === 'hop' && e.to === dstDev && !isLoss(e));
    const loss = list.find(isLoss);
    const s: Seg & { run: number } = {
      key: k,
      run: first.run,
      proto: p.tcp ? 'TCP' : 'UDP',
      from: srcDev,
      to: dstDev ?? list[list.length - 1].to,
      src: p.src,
      dst: p.dst,
      t0: first.t,
      first,
      focus: arrive ?? loss ?? list[list.length - 1],
      ip: p,
      tcp: p.tcp,
      udp: p.udp,
      summary: first.summary,
    };
    if (arrive) s.t1 = arrive.t + 1;
    else {
      const last = loss ?? list[list.length - 1];
      s.tLost = last.t + 0.5;
      const fa = getDev(net, last.from)?.name ?? '?';
      const fb = getDev(net, last.to)?.name ?? '?';
      s.lostWhere = loss ? `zginął na łączu ${fa} – ${fb}` : `nie dotarł (${fa}: ${last.notes[last.notes.length - 1] ?? 'odrzucony'})`;
    }
    segs.push(s);
  }
  // 2. segmenty → przepływy (para gniazd adres:port po obu stronach)
  const flows = new Map<string, Flow>();
  segs.sort((x, y) => x.t0 - y.t0 || x.first.id - y.first.id);
  for (const s of segs) {
    const sp = (s.tcp ?? s.udp)!.srcPort;
    const dp = (s.tcp ?? s.udp)!.dstPort;
    const e1 = `${s.src}:${sp}`;
    const e2 = `${s.dst}:${dp}`;
    const key = `${s.run}|${s.proto}|${[e1, e2].sort().join('|')}`;
    let f = flows.get(key);
    if (!f) {
      f = { key, proto: s.proto, run: s.run, a: { dev: s.from, ip: s.src, port: sp }, b: { dev: s.to, ip: s.dst, port: dp }, segs: [] };
      flows.set(key, f);
    }
    f.segs.push(s);
  }
  return [...flows.values()];
}

// ---------- opisy segmentów ----------

interface Isn {
  a?: number;
  b?: number;
}

function isnOf(f: Flow): Isn {
  const out: Isn = {};
  for (const s of f.segs) {
    if (!s.tcp?.flags.includes('SYN')) continue;
    if (s.from === f.a.dev && out.a === undefined) out.a = s.tcp.seq;
    if (s.from === f.b.dev && out.b === undefined) out.b = s.tcp.seq;
  }
  return out;
}

function segLabel(f: Flow, s: Seg, rel: boolean, isn: Isn): string {
  if (s.udp) {
    if (s.udp.data) return `datagram ${s.udp.data.part}/${s.udp.data.total} · ${s.udp.data.len} B`;
    return s.summary.length > 40 ? s.summary.slice(0, 39) + '…' : s.summary;
  }
  const t = s.tcp!;
  const fromA = s.from === f.a.dev;
  const mine = fromA ? isn.a : isn.b;
  const theirs = fromA ? isn.b : isn.a;
  const sq = rel && mine !== undefined ? t.seq - mine : t.seq;
  const ak = rel && theirs !== undefined ? t.ack - theirs : t.ack;
  const fl = t.flags.filter((x) => x !== 'PSH' && !(x === 'ACK' && t.len > 0 && !t.flags.includes('FIN')));
  const parts: string[] = [];
  if (t.len > 0) parts.push(`seq=${sq} · ${t.len} B`);
  else {
    if (fl.length) parts.push(fl.join(', '));
    if (t.flags.includes('SYN') || t.flags.includes('FIN')) parts.push(`seq=${sq}`);
  }
  if (t.flags.includes('ACK') && !(t.len > 0 && !t.flags.includes('FIN'))) parts.push(`ack=${ak}`);
  if (t.flags.includes('SYN')) parts.push(`win=${t.win ?? 4000}`);
  return `${t.retx ? '↻ ' : ''}${parts.join(' ')}`;
}

// ---------- stany połączenia TCP (RFC 9293, rys. 5) ----------

interface StateMark {
  t: number;
  s: string;
}

function tcpStates(f: Flow): { a: StateMark[]; b: StateMark[] } {
  const st = { a: [] as StateMark[], b: [] as StateMark[] };
  const cur = { a: 'CLOSED', b: 'LISTEN' };
  const set = (side: 'a' | 'b', t: number, s: string) => {
    if (cur[side] === s) return;
    cur[side] = s;
    st[side].push({ t, s });
  };
  st.a.push({ t: f.segs[0]?.t0 ?? 0, s: 'CLOSED' });
  st.b.push({ t: f.segs[0]?.t0 ?? 0, s: 'LISTEN' });
  // zdarzenia w kolejności czasu: wysłanie (t0) i odebranie (t1)
  const evs: { t: number; side: 'a' | 'b'; dir: 'tx' | 'rx'; s: Seg }[] = [];
  for (const s of f.segs) {
    const side = s.from === f.a.dev ? 'a' : 'b';
    const other = side === 'a' ? 'b' : 'a';
    evs.push({ t: s.t0, side, dir: 'tx', s });
    if (s.t1 !== undefined) evs.push({ t: s.t1, side: other, dir: 'rx', s });
  }
  evs.sort((x, y) => x.t - y.t || (x.dir === 'rx' ? 1 : -1));
  for (const e of evs) {
    const t = e.s.tcp!;
    const has = (x: string) => t.flags.includes(x);
    const c = cur[e.side];
    if (has('RST')) {
      if (e.dir === 'rx') set(e.side, e.t, 'CLOSED');
      continue;
    }
    if (e.dir === 'tx') {
      if (has('SYN') && !has('ACK') && c === 'CLOSED') set(e.side, e.t, 'SYN-SENT');
      if (has('FIN') && c === 'ESTABLISHED') set(e.side, e.t, 'FIN-WAIT-1');
      if (has('FIN') && c === 'CLOSE-WAIT') set(e.side, e.t, 'LAST-ACK');
      continue;
    }
    if (has('SYN') && !has('ACK') && c === 'LISTEN') set(e.side, e.t, 'SYN-RCVD');
    else if (has('SYN') && has('ACK') && c === 'SYN-SENT') set(e.side, e.t, 'ESTABLISHED');
    else if (has('ACK') && c === 'SYN-RCVD') set(e.side, e.t, 'ESTABLISHED');
    if (has('FIN')) {
      if (cur[e.side] === 'FIN-WAIT-1' || cur[e.side] === 'FIN-WAIT-2') {
        set(e.side, e.t, 'TIME-WAIT');
        set(e.side, e.t + TCP_TIME_WAIT, 'CLOSED');
      } else if (cur[e.side] === 'ESTABLISHED') {
        set(e.side, e.t, 'CLOSE-WAIT');
        // w symulatorze druga strona od razu odsyła swój FIN
        set(e.side, e.t, 'LAST-ACK');
      }
    } else if (has('ACK') && cur[e.side] === 'LAST-ACK') set(e.side, e.t, 'CLOSED');
    else if (has('ACK') && cur[e.side] === 'FIN-WAIT-1' && !t.len) set(e.side, e.t, 'FIN-WAIT-2');
  }
  // dwa stany w tej samej chwili – zostaw ostatni
  for (const k of ['a', 'b'] as const) st[k] = st[k].filter((m, i, arr) => !(arr[i + 1] && arr[i + 1].t === m.t));
  return st;
}

const STATE_TIP: Record<string, string> = {
  CLOSED: 'brak połączenia',
  LISTEN: 'usługa czeka na połączenia',
  'SYN-SENT': 'wysłano SYN, czekam na SYN-ACK',
  'SYN-RCVD': 'odebrano SYN, wysłano SYN-ACK',
  ESTABLISHED: 'połączenie nawiązane – można przesyłać dane',
  'FIN-WAIT-1': 'wysłano FIN, czekam na potwierdzenie',
  'FIN-WAIT-2': 'mój FIN potwierdzony, czekam na FIN drugiej strony',
  'CLOSE-WAIT': 'druga strona zamknęła swój kierunek',
  'LAST-ACK': 'wysłano własny FIN, czekam na ostatnie ACK',
  'TIME-WAIT': 'czekam 2×MSL na wypadek powtórzonego FIN',
};

// ---------- statystyki ----------

function stats(f: Flow) {
  const n = f.segs.length;
  const lost = f.segs.filter((s) => s.t1 === undefined).length;
  const t0 = Math.min(...f.segs.map((s) => s.t0));
  const t1 = Math.max(...f.segs.map((s) => s.t1 ?? s.tLost ?? s.t0));
  if (f.proto === 'UDP') {
    const data = f.segs.filter((s) => s.udp?.data);
    const sent = data.reduce((x, s) => x + s.udp!.data!.len, 0);
    const got = data.filter((s) => s.t1 !== undefined);
    return {
      n,
      lost,
      retx: 0,
      hdr: n * 8,
      sent,
      delivered: got.reduce((x, s) => x + s.udp!.data!.len, 0),
      parts: data.length ? `${got.length}/${data.length}` : '',
      time: Math.round(t1 - t0),
      ctrl: 0,
    };
  }
  const fromA = f.segs.filter((s) => s.from === f.a.dev && s.tcp!.len > 0);
  const uniq = new Map<number, number>();
  for (const s of fromA) uniq.set(s.tcp!.seq, s.tcp!.len);
  const sent = [...uniq.values()].reduce((x, y) => x + y, 0);
  const got = new Map<number, number>();
  for (const s of fromA) if (s.t1 !== undefined) got.set(s.tcp!.seq, s.tcp!.len);
  return {
    n,
    lost,
    retx: f.segs.filter((s) => s.tcp?.retx).length,
    hdr: n * 20,
    sent,
    delivered: [...got.values()].reduce((x, y) => x + y, 0),
    parts: '',
    time: Math.round(t1 - t0),
    ctrl: f.segs.filter((s) => !s.tcp!.len).length,
  };
}

// ---------- oś czasu z kompresją przerw ----------

/**
 * Długie przerwy, w których nic nie jest w drodze (np. czekanie na RTO), są skracane,
 * żeby diagram mieścił się na ekranie. Czas przelotu segmentów zostaje w skali.
 */
function timeAxis(times: number[], busy: [number, number][], row: number, why: (t: number) => string, gapMax = 3) {
  const ts = [...new Set(times.map((t) => Math.round(t * 2) / 2))].sort((a, b) => a - b);
  const knots: { t: number; y: number }[] = [];
  const breaks: { y: number; gap: number; why: string }[] = [];
  let y = 0;
  for (let i = 0; i < ts.length; i++) {
    if (i) {
      const d = ts[i] - ts[i - 1];
      const mid = (ts[i] + ts[i - 1]) / 2;
      const idle = !busy.some(([a, b]) => a < mid && mid < b);
      if (idle && d > gapMax + 1) {
        y += (gapMax + 0.6) * row;
        breaks.push({ y: y - ((gapMax + 0.6) * row) / 2, gap: Math.round(d), why: why(ts[i]) });
      } else y += d * row;
    }
    knots.push({ t: ts[i], y });
  }
  const at = (t: number) => {
    if (!knots.length) return 0;
    if (t <= knots[0].t) return knots[0].y - (knots[0].t - t) * row;
    for (let i = 1; i < knots.length; i++) {
      const k0 = knots[i - 1];
      const k1 = knots[i];
      if (t <= k1.t) return k0.y + ((t - k0.t) / (k1.t - k0.t || 1)) * (k1.y - k0.y);
    }
    const kl = knots[knots.length - 1];
    return kl.y + (t - kl.t) * row;
  };
  return { at, breaks, height: y };
}

// ---------- rysunek jednego przepływu ----------

function Ladder({
  f,
  net,
  width,
  rel,
  playhead,
  selected,
  onSelect,
}: {
  f: Flow;
  net: Network;
  width: number;
  rel: boolean;
  playhead: number;
  selected: number | null;
  onSelect: (e: SimEvent) => void;
}) {
  const isn = isnOf(f);
  const states = f.proto === 'TCP' ? tcpStates(f) : null;
  const row = 20;
  const times = f.segs.flatMap((s) => [s.t0, s.t1 ?? s.tLost ?? s.t0]);
  if (states) for (const m of [...states.a, ...states.b]) times.push(m.t);
  const busy = f.segs.map((s) => [s.t0, s.t1 ?? s.tLost ?? s.t0] as [number, number]);
  const ax = timeAxis(times, busy, row, (t) => {
    const next = f.segs.find((s) => Math.abs(s.t0 - t) < 0.6);
    if (next?.tcp?.retx) return 'czekanie na RTO';
    if (next?.tcp?.flags.includes('FIN')) return 'aplikacja kończy';
    return 'bez ruchu';
  });
  const top = 54;
  const H = top + ax.height + 30;
  const W = Math.max(300, width);
  const margin = Math.min(118, Math.max(86, W * 0.24));
  const xa = margin;
  const xb = W - margin;
  const Y = (t: number) => top + ax.at(t);
  // typowy czas przejścia w każdą stronę – do zaznaczenia miejsca zgubienia
  const oneWay = (dir: 'ab' | 'ba') => {
    const d = f.segs.filter((s) => s.t1 !== undefined && (s.from === f.a.dev) === (dir === 'ab')).map((s) => s.t1! - s.t0);
    return d.length ? d.sort((a, b) => a - b)[Math.floor(d.length / 2)] : 4;
  };
  const ow = { ab: oneWay('ab'), ba: oneWay('ba') };
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const name = (id: string) => getDev(net, id)?.name ?? '?';
  const color = PROTO_COLORS[f.proto];
  const geom = (s: Seg) => {
    const ab = s.from === f.a.dev;
    const x1 = ab ? xa : xb;
    const x2full = ab ? xb : xa;
    const y1 = Y(s.t0);
    const lost = s.t1 === undefined;
    const frac = lost ? Math.min(0.82, Math.max(0.18, ((s.tLost ?? s.t0) - s.t0) / (ab ? ow.ab : ow.ba))) : 1;
    const x2 = x1 + (x2full - x1) * frac;
    const y2 = lost ? Y(s.t0) + (Y(s.t0 + (ab ? ow.ab : ow.ba)) - Y(s.t0)) * frac : Y(s.t1!);
    return { ab, x1, y1, x2, y2, lost };
  };
  const stateCol = (s: string) => (s === 'ESTABLISHED' ? 'var(--sim-good, #16a34a)' : s === 'CLOSED' || s === 'LISTEN' ? 'var(--sim-border)' : '#f59e0b');

  const lane = (x: number, marks: StateMark[] | null, side: 'a' | 'b') => (
    <g>
      <line x1={x} x2={x} y1={top - 6} y2={H - 10} className={styles.seqLane} />
      {marks &&
        marks.map((m, i) => {
          const y1 = Y(m.t);
          const y2 = i + 1 < marks.length ? Y(marks[i + 1].t) : H - 10;
          const left = side === 'a';
          return (
            <g key={i}>
              <title>{`${m.s} – ${STATE_TIP[m.s] ?? ''}`}</title>
              <rect x={x - 3} y={y1} width={6} height={Math.max(2, y2 - y1)} rx={3} fill={stateCol(m.s)} opacity={m.s === 'CLOSED' || m.s === 'LISTEN' ? 0.6 : 0.9} />
              <text x={left ? x - 8 : x + 8} y={y1 - 4} textAnchor={left ? 'end' : 'start'} className={styles.tvState}>
                {m.s}
              </text>
            </g>
          );
        })}
    </g>
  );

  return (
    <svg className={styles.tvSvg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Diagram ${f.proto} między ${name(f.a.dev)} a ${name(f.b.dev)}`}>
      <defs>
        <marker id={`tv-arr-${f.proto}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={color} />
        </marker>
        <marker id="tv-arr-retx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#ea580c" />
        </marker>
      </defs>
      {[
        [xa, f.a],
        [xb, f.b],
      ].map(([x, e], i) => {
        const ep = e as Flow['a'];
        return (
          <g key={i}>
            <rect x={(x as number) - 62} y={4} width={124} height={36} rx={7} className={styles.seqHead} />
            <text x={x as number} y={19} textAnchor="middle" className={styles.seqHeadText}>
              {name(ep.dev)}
            </text>
            <text x={x as number} y={33} textAnchor="middle" className={styles.tvSock}>
              {ep.ip.includes(':') ? `[${ep.ip}]` : ep.ip}:{ep.port}
            </text>
          </g>
        );
      })}
      {lane(xa, states?.a ?? null, 'a')}
      {lane(xb, states?.b ?? null, 'b')}
      {ax.breaks.map((b, i) => (
        <g key={`b${i}`}>
          <line x1={xa + 8} x2={xb - 8} y1={top + b.y} y2={top + b.y} className={styles.tvBreak} />
          <text x={(xa + xb) / 2} y={top + b.y - 3} textAnchor="middle" className={styles.tvBreakText}>
            ⋯ {b.gap} kroków: {b.why} ⋯
          </text>
        </g>
      ))}
      {playhead >= tMin && playhead <= tMax + 1 && <line x1={0} x2={W} y1={Y(playhead)} y2={Y(playhead)} className={styles.seqPlay} />}
      {f.segs.map((s) => {
        const g = geom(s);
        const ab = g.ab;
        const { x1, y1, x2, y2, lost } = g;
        const retx = !!s.tcp?.retx;
        const c = retx ? '#ea580c' : color;
        const sel = selected === s.focus.id || selected === s.first.id;
        const label = segLabel(f, s, rel, isn);
        const lx = ab ? x1 + 8 : x1 - 8;
        return (
          <g key={s.key} className={styles.seqItem} onClick={() => onSelect(s.focus)}>
            <title>{`${label}${lost ? ` – ${s.lostWhere}` : ''}\nkrok ${Math.round(s.t0)}${s.t1 !== undefined ? ` → ${Math.round(s.t1)}` : ''}`}</title>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={c}
              strokeWidth={sel ? 3.2 : s.tcp && !s.tcp.len ? 1.4 : 2.2}
              strokeDasharray={lost ? '5 4' : undefined}
              markerEnd={lost ? undefined : `url(#tv-arr-${retx ? 'retx' : f.proto})`}
            />
            <text x={lx} y={y1 - 3} textAnchor={ab ? 'start' : 'end'} className={`${styles.seqLabel} ${retx ? styles.tvRetx : ''}`} fontWeight={sel ? 700 : s.tcp && !s.tcp.len ? 400 : 600}>
              {label}
            </text>
            <text x={ab ? x1 - 6 : x1 + 6} y={y1 + 3} textAnchor={ab ? 'end' : 'start'} className={styles.tvTime}>
              {Math.round(s.t0)}
            </text>
          </g>
        );
      })}
      {f.segs
        .filter((s) => s.t1 === undefined)
        .map((s) => {
          const g = geom(s);
          return (
            <g key={`x${s.key}`} transform={`translate(${g.x2} ${g.y2})`} className={styles.seqItem} onClick={() => onSelect(s.focus)}>
              <title>{s.lostWhere}</title>
              <circle r={7.5} fill="#dc2626" stroke="var(--sim-bg)" strokeWidth={1.5} />
              <path d="M-3.2 -3.2 l6.4 6.4 m0 -6.4 l-6.4 6.4" stroke="#fff" strokeWidth={2} />
            </g>
          );
        })}
    </svg>
  );
}

function Summary({ f }: { f: Flow }) {
  const s = stats(f);
  const tcp = f.proto === 'TCP';
  const ok = s.delivered === s.sent && s.sent > 0;
  return (
    <div className={styles.tvStats}>
      <span className={styles.tvChip} style={{ background: PROTO_COLORS[f.proto] }}>
        {f.proto}
      </span>
      {s.sent > 0 && (
        <span className={ok ? styles.good : styles.bad}>
          dostarczono {s.delivered} z {s.sent} B{s.parts ? ` (${s.parts} datagramów)` : ''}
        </span>
      )}
      <span>
        {tcp ? 'segmenty' : 'datagramy'}: <b>{s.n}</b>
        {tcp ? ` (w tym ${s.ctrl} bez danych)` : ''}
      </span>
      <span>
        nagłówki: <b>{s.hdr} B</b> ({tcp ? '20' : '8'} B × {s.n})
      </span>
      <span className={s.lost ? styles.bad : undefined}>zgubione: {s.lost}</span>
      <span>retransmisje: {tcp ? <b>{s.retx}</b> : 'brak – UDP nie powtarza'}</span>
      <span>czas: {s.time} kroków</span>
    </div>
  );
}

const flowName = (f: Flow, net: Network) => {
  const n = (id: string) => getDev(net, id)?.name ?? '?';
  const port = f.b.port;
  const svc = { 9: 'Discard', 53: 'DNS', 67: 'DHCP', 123: 'NTP', 80: 'HTTP', 443: 'HTTPS', 21: 'FTP', 25: 'SMTP', 110: 'POP3', 631: 'IPP' }[port];
  return `${f.proto} ${n(f.a.dev)} → ${n(f.b.dev)}:${port}${svc ? ` (${svc})` : ''}`;
};

/** szerokość kontenera (do rozmieszczenia linii życia) */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function TransportView({
  events,
  net,
  playhead,
  selected,
  onSelect,
}: {
  events: SimEvent[];
  net: Network;
  playhead: number;
  selected: number | null;
  onSelect: (e: SimEvent) => void;
}) {
  const flows = useMemo(() => buildFlows(events, net).reverse(), [events, net]);
  const [pick, setPick] = useState<string>('auto');
  const [rel, setRel] = useState(true);
  const [ref, width] = useWidth();
  const lastTcp = flows.find((f) => f.proto === 'TCP' && f.segs.some((s) => (s.tcp?.len ?? 0) > 0)) ?? flows.find((f) => f.proto === 'TCP');
  const lastUdp = flows.find((f) => f.proto === 'UDP' && f.segs.some((s) => s.udp?.data)) ?? flows.find((f) => f.proto === 'UDP');
  const compare = pick === 'compare' && !!lastTcp && !!lastUdp;
  const one = pick === 'auto' || pick === 'compare' ? flows[0] : flows.find((f) => f.key === pick) ?? flows[0];
  const shown = compare ? [lastTcp!, lastUdp!] : one ? [one] : [];

  if (!flows.length) {
    return (
      <div className={styles.tv} ref={ref}>
        <div className={styles.empty}>
          Tu pojawi się przebieg warstwy transportowej: segmenty TCP (uzgadnianie, numery sekwencyjne, okno, potwierdzenia, retransmisje) i datagramy UDP. Wyślij
          coś – np. <code>tcp-send</code> i <code>udp-send</code> w pakiecie „TCP i UDP”, otwórz stronę WWW albo zapytaj DNS.
        </div>
      </div>
    );
  }
  return (
    <div className={styles.tv} ref={ref}>
      <div className={styles.tvBar}>
        <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Przepływ warstwy transportowej">
          <option value="auto">Ostatni przepływ</option>
          {lastTcp && lastUdp && <option value="compare">Porównanie: ostatni TCP i ostatni UDP</option>}
          {flows.map((f) => (
            <option key={f.key} value={f.key}>
              {flowName(f, net)}
            </option>
          ))}
        </select>
        {shown.some((f) => f.proto === 'TCP') && (
          <label className={styles.tvToggle} title="Względne: liczone od numeru początkowego (ISN) każdej strony, jak w analizatorach ruchu">
            <input type="checkbox" checked={rel} onChange={(e) => setRel(e.target.checked)} /> numery względne
          </label>
        )}
        <span className={styles.tvLegend}>
          <i style={{ background: PROTO_COLORS.TCP }} /> segment <i style={{ background: '#ea580c' }} /> retransmisja <i className={styles.tvLost} /> zgubiony
        </span>
      </div>
      <div className={styles.tvCols} style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((f) => (
          <div key={f.key} className={styles.tvCol}>
            <div className={styles.tvTitle}>{flowName(f, net)}</div>
            <Summary f={f} />
            <Ladder f={f} net={net} width={Math.floor((width - 12 * (shown.length - 1)) / shown.length) - 4} rel={rel} playhead={playhead} selected={selected} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
