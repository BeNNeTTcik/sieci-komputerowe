// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Opisy na obszarze roboczym: napisy i obszary (prostokąty z etykietą, np. „Sieć A · 192.168.1.0/24”).
// Są tylko rysunkiem dla ucznia – silnik symulacji ich nie widzi.
import React, { useEffect, useRef, useState } from 'react';
import type { Network, Note, NoteColor } from './model';
import styles from './styles.module.css';

export const NOTE_COLORS: { id: NoteColor; label: string }[] = [
  { id: 'ink', label: 'Domyślny' },
  { id: 'blue', label: 'Niebieski' },
  { id: 'green', label: 'Zielony' },
  { id: 'amber', label: 'Pomarańczowy' },
  { id: 'red', label: 'Czerwony' },
  { id: 'violet', label: 'Fioletowy' },
];

export const TEXT_SIZES = [14, 18, 24, 32, 44];
export const ZONE_LABEL = 14;
const LINE = 1.25;

export const colorClass = (c: NoteColor) => styles[`nc_${c}`] ?? '';

export function notesOf(net: Network): Note[] {
  if (!net.notes) net.notes = [];
  return net.notes;
}

export function newNote(net: Network, kind: Note['kind'], x: number, y: number, extra: Partial<Note> = {}): Note {
  const n: Note = {
    id: 'n' + net.nextId++,
    kind,
    x: Math.round(x),
    y: Math.round(y),
    w: kind === 'zone' ? 360 : 0,
    h: kind === 'zone' ? 240 : 0,
    text: kind === 'zone' ? nextZoneName(net) : 'Tekst',
    color: kind === 'zone' ? zoneColor(net) : 'ink',
    size: 18,
    bold: kind === 'zone',
    dashed: true,
    ...extra,
  };
  notesOf(net).push(n);
  return n;
}

/** Kolejna nazwa: Sieć A, Sieć B, … */
export function nextZoneName(net: Network): string {
  const used = new Set(notesOf(net).filter((n) => n.kind === 'zone').map((n) => n.text));
  for (let i = 0; i < 26; i++) {
    const name = `Sieć ${String.fromCharCode(65 + i)}`;
    if (![...used].some((u) => u === name || u.startsWith(name + ' '))) return name;
  }
  return 'Sieć';
}

function zoneColor(net: Network): NoteColor {
  const cycle: NoteColor[] = ['blue', 'green', 'amber', 'violet', 'red'];
  return cycle[notesOf(net).filter((n) => n.kind === 'zone').length % cycle.length];
}

// ---------- pomiar tekstu ----------

let ctx: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, bold: boolean): number {
  try {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `${bold ? 700 : 500} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      return ctx.measureText(text).width;
    }
  } catch {
    /* brak canvasu */
  }
  return text.length * size * 0.56;
}

/** Prostokąt zajmowany przez opis (dla napisu – obliczony z treści). */
export function noteBox(n: Note): { x: number; y: number; w: number; h: number } {
  if (n.kind === 'zone') return { x: n.x, y: n.y, w: n.w, h: n.h };
  const lines = (n.text || ' ').split('\n');
  const w = Math.max(24, ...lines.map((l) => measure(l, n.size, n.bold))) + 8;
  return { x: n.x - 4, y: n.y - 2, w, h: lines.length * n.size * LINE + 4 };
}

// ---------- rysowanie w SVG ----------

export type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface LayerProps {
  notes: Note[];
  kind: Note['kind'];
  selected: string | null;
  editing: string | null;
  zoom: number;
  interactive: boolean;
  onDown: (e: React.PointerEvent, id: string, h: Handle) => void;
}

export function NotesLayer({ notes, kind, selected, editing, zoom, interactive, onDown }: LayerProps) {
  const hs = 10 / zoom;
  return (
    <g className={interactive ? styles.notesOn : styles.notesOff}>
      {notes
        .filter((n) => n.kind === kind)
        .map((n) => {
          const sel = n.id === selected;
          const b = noteBox(n);
          return (
            <g key={n.id} className={`${colorClass(n.color)} ${styles.note}`} onPointerDown={(e) => onDown(e, n.id, 'move')}>
              {n.kind === 'zone' ? (
                <>
                  <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={14} className={styles.zoneRect} strokeDasharray={n.dashed ? '9 6' : undefined} />
                  {editing !== n.id && (
                    <text x={n.x + 14} y={n.y + 24} className={styles.zoneLabel} fontWeight={n.bold ? 700 : 500}>
                      {n.text}
                    </text>
                  )}
                </>
              ) : (
                <>
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" />
                  {editing !== n.id && (
                    <text className={styles.noteText} fontSize={n.size} fontWeight={n.bold ? 700 : 500}>
                      {n.text.split('\n').map((l, i) => (
                        <tspan key={i} x={n.x} y={n.y + n.size * 0.92 + i * n.size * LINE}>
                          {l || ' '}
                        </tspan>
                      ))}
                    </text>
                  )}
                </>
              )}
              {sel && (
                <>
                  <rect x={b.x - 3} y={b.y - 3} width={b.w + 6} height={b.h + 6} rx={n.kind === 'zone' ? 16 : 4} className={styles.noteSel} />
                  {n.kind === 'zone' &&
                    (['nw', 'ne', 'sw', 'se'] as Handle[]).map((h) => (
                      <rect
                        key={h}
                        x={(h.includes('w') ? n.x : n.x + n.w) - hs / 2}
                        y={(h.includes('n') ? n.y : n.y + n.h) - hs / 2}
                        width={hs}
                        height={hs}
                        className={`${styles.noteHandle} ${h === 'nw' || h === 'se' ? styles.hNwse : styles.hNesw}`}
                        onPointerDown={(e) => onDown(e, n.id, h)}
                      />
                    ))}
                </>
              )}
            </g>
          );
        })}
    </g>
  );
}

// ---------- edycja treści (nakładka HTML nad schematem) ----------

export function NoteEditor({ note, zoom, onDone }: { note: Note; zoom: number; onDone: (text: string | null) => void }) {
  const [v, setV] = useState(note.text);
  const ta = useRef<HTMLTextAreaElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ta.current ?? inp.current;
    el?.focus();
    el?.select();
  }, []);
  const finish = (t: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(t);
  };
  if (note.kind === 'zone') {
    return (
      <input
        ref={inp}
        className={`${styles.noteEdit} ${colorClass(note.color)}`}
        style={{ left: (note.x + 8) * zoom, top: (note.y + 6) * zoom, fontSize: ZONE_LABEL * zoom, width: Math.max(160, (note.w - 20) * zoom), fontWeight: note.bold ? 700 : 500 }}
        value={v}
        aria-label="Etykieta obszaru"
        placeholder="np. Sieć A · 192.168.1.0/24"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => finish(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(v);
          if (e.key === 'Escape') finish(note.text);
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    );
  }
  const lines = v.split('\n');
  return (
    <textarea
      ref={ta}
      className={`${styles.noteEdit} ${colorClass(note.color)}`}
      style={{
        left: (note.x - 4) * zoom,
        top: (note.y - 2) * zoom,
        fontSize: note.size * zoom,
        lineHeight: LINE,
        fontWeight: note.bold ? 700 : 500,
        width: `${Math.max(8, ...lines.map((l) => l.length + 2))}ch`,
      }}
      rows={Math.max(1, lines.length)}
      value={v}
      aria-label="Treść napisu"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => finish(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finish(v);
        if (e.key === 'Escape') finish(v);
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}

// ---------- pasek właściwości zaznaczonego opisu ----------

interface BarProps {
  note: Note;
  zoom: number;
  onChange: (p: Partial<Note>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onOrder: (where: 'front' | 'back') => void;
}

export function NoteToolbar({ note, zoom, onChange, onEdit, onDelete, onOrder }: BarProps) {
  const b = noteBox(note);
  const above = b.y * zoom > 52;
  const style: React.CSSProperties = { left: Math.max(4, b.x * zoom), top: above ? b.y * zoom - 46 : (b.y + b.h) * zoom + 10 };
  const sizeIdx = TEXT_SIZES.indexOf(note.size);
  return (
    <div className={styles.noteBar} style={style} onPointerDown={(e) => e.stopPropagation()} role="toolbar" aria-label="Właściwości opisu">
      {NOTE_COLORS.map((c) => (
        <button
          type="button"
          key={c.id}
          className={`${styles.swatch} ${colorClass(c.id)} ${note.color === c.id ? styles.swatchOn : ''}`}
          title={c.label}
          aria-label={`Kolor: ${c.label}`}
          aria-pressed={note.color === c.id}
          onClick={() => onChange({ color: c.id })}
        />
      ))}
      <span className={styles.barSep} />
      {note.kind === 'text' && (
        <>
          <button type="button" title="Mniejszy tekst" disabled={sizeIdx <= 0} onClick={() => onChange({ size: TEXT_SIZES[Math.max(0, sizeIdx - 1)] })}>A−</button>
          <button type="button" title="Większy tekst" disabled={sizeIdx >= TEXT_SIZES.length - 1} onClick={() => onChange({ size: TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, (sizeIdx < 0 ? 1 : sizeIdx) + 1)] })}>A+</button>
        </>
      )}
      <button type="button" title="Pogrubienie" aria-pressed={note.bold} className={note.bold ? styles.barOn : ''} onClick={() => onChange({ bold: !note.bold })}>
        <strong>B</strong>
      </button>
      {note.kind === 'zone' && (
        <>
          <button type="button" title={note.dashed ? 'Linia ciągła' : 'Linia przerywana'} onClick={() => onChange({ dashed: !note.dashed })}>
            {note.dashed ? '┅' : '━'}
          </button>
          <button type="button" title="Przenieś na spód (pod inne obszary)" onClick={() => onOrder('back')}>⤓</button>
          <button type="button" title="Przenieś na wierzch" onClick={() => onOrder('front')}>⤒</button>
        </>
      )}
      <span className={styles.barSep} />
      <button type="button" title={note.kind === 'zone' ? 'Zmień etykietę (Enter)' : 'Edytuj tekst (Enter)'} onClick={onEdit}>✎</button>
      <button type="button" title="Usuń (Delete)" onClick={onDelete}>🗑</button>
    </div>
  );
}
