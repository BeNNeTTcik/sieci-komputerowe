// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Opisy i strefy na planie – dane bez React i bez stylów, żeby można było ich używać w scenariuszach i testach.
import type { Network, Note, NoteColor } from './model';

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
