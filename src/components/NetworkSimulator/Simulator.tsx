// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Główny komponent symulatora sieci: układ aplikacji, schemat, animacja, panele.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  DeviceType,
  Network,
  PROTO_COLORS,
  PROTO_LABEL,
  Protocol,
  TYPE_LABEL,
  clone,
  connect,
  createDevice,
  firstIp,
  firstIp6,
  getDev,
  getIface,
  ifaceStatus,
  linkAt,
  emptyNetwork,
  normalizeNet,
  peerOf,
  removeDevice,
  sameIp,
} from './model';
import { OutputLine, Sim, SimEvent } from './engine';
import { startFtp, startHttp, startMailCheck, startMailSend, startPrint } from './apps';
import { CliActions, CliResult, commandsFor, prompt, runCommand } from './cli';
// jawnie folder scenarios/ – stary plik scenarios.ts (z poprzedniej wersji) nie może go przesłonić
import { EXTRA_SCENARIOS, buildScenario, scenarioById, scenarioSig, variantOf, visibleScenarios } from './scenarios/index';
import { COPYRIGHT } from './license';
import { TransportView } from './transport';
import { PACKS, PROFILES, PackId, PackSet, devicesFor, matchProfile, packSet, protocolsFor, withDeps, without } from './packs';
import { DeviceGlyph, DeviceIcon, UiIcon, UiIconName } from './icons';
import { DeviceWindow, LastCmd, Win, tabsFor } from './DeviceWindow';
import { EventDetails, SequenceDiagram } from './Details';
import { Handle, NoteEditor, NoteToolbar, NotesLayer, newNote, noteBox, notesOf } from './notes';
import type { Note } from './model';
import styles from './styles.module.css';

export interface SimulatorProps {
  /** id scenariusza startowego: lan | routing | dhcp | static | vlan | services | relay | ipv6 | dual | tunnel | nat64 | security | empty */
  scenario?: string;
  /** dodatkowe scenariusze na pasku (obok bazowych); bez tej właściwości obowiązuje lista z scenarios/config.ts */
  scenarios?: string[];
  /** wariant stanu początkowego scenariusza startowego (id z pliku scenariusza); domyślnie `start` z tego pliku */
  variant?: string;
  /** wysokość komponentu w pikselach (gdy nie używasz `fill`) */
  height?: number;
  /** ukrywa wybór scenariusza – przydatne w lekcji o jednym temacie */
  lockScenario?: boolean;
  /** zapisywanie stanu w localStorage przeglądarki */
  persist?: boolean;
  /** wypełnia całą wysokość rodzica (strona pełnoekranowa) */
  fill?: boolean;
  /** pokazuje listę zadań scenariusza (domyślnie wyłączona – symulator jest samym narzędziem, a zadania są osobno) */
  showTasks?: boolean;
}

/** minimalny rozmiar obszaru roboczego (jednostki schematu); rośnie, gdy urządzenia zbliżają się do krawędzi */
const MIN_W = 2400;
const MIN_H = 1600;
const GROW = 480;
const ZMIN = 0.35;
const ZMAX = 2;
const round120 = (v: number) => Math.ceil(v / 120) * 120;

/** Starsze zapisy miały schemat w lewym górnym rogu – przesuwamy go na środek większego obszaru. */
function shiftOld(n: Network): Network {
  if (!n.devices.length) return n;
  const minX = Math.min(...n.devices.map((d) => d.x));
  const minY = Math.min(...n.devices.map((d) => d.y));
  if (minX < 300 && minY < 260) {
    for (const d of n.devices) {
      d.x += 720;
      d.y += 520;
    }
    for (const o of n.notes ?? []) {
      o.x += 720;
      o.y += 520;
    }
  }
  return n;
}
const STEPS_PER_SEC = 1.6;
const STORE = 'netsim:v2:';
const LAYOUT = 'netsim:layout';

type Tool = 'select' | 'link' | 'delete' | 'text' | 'zone';
const SNAP = 12;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
type Job = (s: Sim) => void;

interface Saved {
  net: Network;
  done: Record<number, boolean>;
  packs: PackSet;
  /** podpis stanu początkowego scenariusza (scenarioSig) */
  sig?: string;
  /** wariant stanu początkowego */
  variant?: string;
}

function load(id: string, persist: boolean, variant?: string): Saved {
  const sc = scenarioById(id);
  if (persist) {
    try {
      const raw = window.localStorage.getItem(STORE + id);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        if (s?.net?.devices && s.sig === scenarioSig(id, s.variant)) return { net: shiftOld(normalizeNet(s.net)), done: s.done ?? {}, packs: withDeps({ ...packSet(sc.packs), ...s.packs }), variant: s.variant };
      }
    } catch {
      /* brak dostępu do pamięci przeglądarki */
    }
  }
  return fresh(sc.id, variant);
}

/** buduje scenariusz od nowa; błąd w pliku scenariusza nie wyłącza symulatora – zostaje pusta sieć i komunikat w konsoli */
function fresh(id: string, variant?: string): Saved {
  const sc = scenarioById(id);
  try {
    const v = variantOf(sc, variant)?.id;
    return { net: buildScenario(sc.id, v), done: {}, packs: packSet(sc.packs), variant: v };
  } catch (e) {
    console.error(`[symulator] nie udało się zbudować scenariusza „${sc.id}”:`, e);
    return { net: emptyNetwork(), done: {}, packs: packSet(sc.packs) };
  }
}

function loadLayout() {
  try {
    const raw = window.localStorage.getItem(LAYOUT);
    if (raw) return JSON.parse(raw) as { side: number; bottom: number; list: number };
  } catch {
    /* ignoruj */
  }
  return { side: 360, bottom: 300, list: 0.55 };
}

export default function Simulator({ scenario = 'lan', scenarios, variant: startVariant, height = 860, lockScenario = false, persist = true, fill = false, showTasks = false }: SimulatorProps) {
  const [scenarioId, setScenarioId] = useState(scenarioById(scenario).id);
  const initial = useMemo(() => load(scenarioId, persist, startVariant), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [variant, setVariant] = useState<string | undefined>(initial.variant);
  const netRef = useRef<Network>(initial.net);
  const net = netRef.current;
  const [ver, bump] = useReducer((x: number) => x + 1, 0);
  const [packs, setPacksState] = useState<PackSet>(initial.packs);
  const packsRef = useRef(packs);
  packsRef.current = packs;

  const [tool, setTool] = useState<Tool>('select');
  const [linkStart, setLinkStart] = useState<{ dev: string; iface: string } | null>(null);
  const [portPick, setPortPick] = useState<{ dev: string; x: number; y: number } | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [wins, setWins] = useState<Win[]>([]);
  const zTop = useRef(10);
  const [lastCmd, setLastCmd] = useState<Record<string, LastCmd>>({});

  const [events, setEvents] = useState<SimEvent[]>([]);
  const [outputs, setOutputs] = useState<OutputLine[]>([]);
  const [runLabels, setRunLabels] = useState<Record<number, string>>({});
  const [seqRun, setSeqRun] = useState<number | null>(null);
  /** prawy dolny panel: diagram sekwencji (wszystkie urządzenia) albo widok warstwy transportowej */
  const [diagTab, setDiagTab] = useState<'seq' | 'transport'>(initial.packs.transport ? 'transport' : 'seq');
  const [mode, setMode] = useState<'sim' | 'realtime'>('sim');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [filters, setFilters] = useState<Record<Protocol, boolean>>(() => Object.fromEntries(Object.keys(PROTO_COLORS).map((k) => [k, true])) as Record<Protocol, boolean>);
  const [selEvent, setSelEvent] = useState<number | null>(null);
  const [sideTab, setSideTab] = useState<'packet' | 'tasks' | 'help'>('tasks');
  const [done, setDone] = useState<Record<number, boolean>>(initial.done);
  const [toast, setToast] = useState('');
  const [compact, setCompact] = useState(false);
  const [armReset, setArmReset] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [layout, setLayout] = useState(loadLayout);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const zoomAnchor = useRef<{ wx: number; wy: number; cx: number; cy: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [selNote, setSelNote] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const noteDrag = useRef<{ id: string; h: Handle; sx: number; sy: number; o: { x: number; y: number; w: number; h: number }; moved: boolean; dbl: boolean } | null>(null);
  const lastNoteDown = useRef<{ id: string; t: number }>({ id: '', t: 0 });

  const phRef = useRef(0);
  const endRef = useRef(0);
  const playingRef = useRef(false);
  const modeRef = useRef(mode);
  const runCounter = useRef(1);
  const idRef = useRef(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const packsBtnRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  modeRef.current = mode;
  playingRef.current = playing;

  const allNotes = notesOf(net);
  const W = round120(Math.max(MIN_W, ...net.devices.map((d) => d.x + GROW), ...allNotes.map((o) => noteBox(o).x + noteBox(o).w + GROW / 2)));
  const H = round120(Math.max(MIN_H, ...net.devices.map((d) => d.y + GROW), ...allNotes.map((o) => noteBox(o).y + noteBox(o).h + GROW / 2)));
  const sc = scenarioById(scenarioId);
  const shown = useMemo(() => visibleScenarios(scenarios ?? EXTRA_SCENARIOS, scenario), [scenarios, scenario]);
  const activeProtos = protocolsFor(packs);
  const deviceTypes = devicesFor(packs);
  const profile = matchProfile(packs);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? '' : t)), 3500);
  }, []);

  const seek = (v: number) => {
    phRef.current = v;
    setPlayhead(v);
  };

  // ----- animacja -----
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let np = phRef.current + dt * speed * STEPS_PER_SEC;
      if (np >= endRef.current) {
        np = endRef.current;
        seek(np);
        setPlaying(false);
        return;
      }
      seek(np);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // ----- zapis w przeglądarce -----
  useEffect(() => {
    if (!persist) return;
    const h = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORE + scenarioId, JSON.stringify({ net: netRef.current, done, packs, variant, sig: scenarioSig(scenarioId, variant) }));
      } catch {
        /* pamięć niedostępna */
      }
    }, 400);
    return () => window.clearTimeout(h);
  }, [ver, done, scenarioId, persist, packs, variant]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LAYOUT, JSON.stringify(layout));
    } catch {
      /* ignoruj */
    }
  }, [layout]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setCompact(el.clientWidth < 620));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // pełny ekran: symulator przykrywa całe okno, strona pod nim się nie przewija
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  // zamykanie menu pakietów kliknięciem obok
  useEffect(() => {
    if (!packsOpen) return;
    const h = (e: PointerEvent) => {
      if (packsBtnRef.current && !packsBtnRef.current.contains(e.target as Node)) setPacksOpen(false);
    };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [packsOpen]);

  // ----- automatyczne sprawdzanie zadań -----
  useEffect(() => {
    if (playing || !showTasks) return;
    const upd: Record<number, boolean> = {};
    sc.tasks.forEach((t, i) => {
      if (t.check && !done[i]) {
        try {
          if (t.check({ net: netRef.current, events: events.filter((e) => e.t + 1 <= phRef.current + 1e-6) })) upd[i] = true;
        } catch {
          /* ignoruj */
        }
      }
    });
    if (Object.keys(upd).length) {
      setDone((d) => ({ ...d, ...upd }));
      say('✓ Zadanie wykonane!');
    }
  }, [ver, events, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- symulacja -----
  const nextBase = () => Math.ceil(Math.max(endRef.current, phRef.current));

  const runSim = (label: string, jobs: Job[], base: number) => {
    const run = runCounter.current++;
    const sim = new Sim(netRef.current, base, run, idRef);
    sim.packs = packsRef.current;
    jobs.forEach((j) => j(sim));
    sim.runAll();
    const end = Math.max(sim.endTime, base);
    endRef.current = Math.max(endRef.current, end);
    setEvents((e) => e.concat(sim.events));
    setOutputs((o) => o.concat(sim.outputs));
    setRunLabels((r) => ({ ...r, [run]: label }));
    setSeqRun(run);
    if (modeRef.current === 'realtime') {
      seek(endRef.current);
      setPlaying(false);
    } else {
      if (!playingRef.current) seek(base);
      setPlaying(true);
    }
  };

  const exec = (devId: string, line: string, source: 'gui' | 'cli'): CliResult | null => {
    const d = getDev(netRef.current, devId);
    if (!d) return null;
    const jobs: Job[] = [];
    const act: CliActions = {
      ping: (x, h, n, v) => jobs.push((s) => s.startPing(x, h, n, v)),
      trace: (x, h, v) => jobs.push((s) => s.startTrace(x, h, v)),
      dhcp: (x) => jobs.push((s) => s.startDhcp(x)),
      autoconf: (x) => jobs.push((s) => s.startAutoconf(x)),
      dot1x: (x, u, pw) => jobs.push((s) => s.startDot1x(x, u, pw)),
      dot1xOff: (x) => jobs.push((s) => s.stopDot1x(x)),
      lookup: (x, n, t) => jobs.push((s) => s.startLookup(x, n, t)),
      http: (x, h, p, sec, v) => jobs.push((s) => startHttp(s, x, h, p, sec, v)),
      ftp: (x, h, op, v) => jobs.push((s) => startFtp(s, x, h, op, v)),
      mailSend: (x, to, subj) => jobs.push((s) => startMailSend(s, x, to, subj, `Wiadomość wysłana z komputera ${x.name}.`)),
      mailCheck: (x) => jobs.push((s) => startMailCheck(s, x)),
      ntp: (x, h) => jobs.push((s) => s.startNtp(x, h)),
      print: (x, h, doc, v) => jobs.push((s) => startPrint(s, x, h, doc, v)),
      tcpSend: (x, h, port, size, v) => jobs.push((s) => s.startTcpSend(x, h, port, size, v)),
      udpSend: (x, h, port, size, v) => jobs.push((s) => s.startUdpSend(x, h, port, size, v)),
    };
    const pr = prompt(d);
    const r = runCommand(netRef.current, d, line, act, packsRef.current);
    if (source === 'gui') setLastCmd((m) => ({ ...m, [devId]: { line, res: r } }));
    if (r.clear) {
      setOutputs((o) => o.filter((x) => x.dev !== devId || x.t > phRef.current));
      return r;
    }
    const base = jobs.length ? nextBase() : phRef.current;
    const lines: OutputLine[] = [
      { t: base, dev: devId, text: `${pr} ${line}${source === 'gui' ? '    # z okna' : ''}`, kind: 'cmd' },
      ...r.lines.map((l) => ({ t: base, dev: devId, text: l.text, kind: l.kind })),
    ];
    setOutputs((o) => o.concat(lines));
    if (jobs.length) runSim(`${d.name}: ${line}`, jobs, base);
    bump();
    return r;
  };

  const clearEvents = () => {
    setEvents([]);
    setOutputs((o) => o.map((x) => ({ ...x, t: 0 })));
    setRunLabels({});
    setSeqRun(null);
    setSelEvent(null);
    setPlaying(false);
    endRef.current = 0;
    seek(0);
  };

  /** `fresh` – zbuduj od nowa (Reset, zmiana wariantu); `v` – wariant stanu początkowego */
  const loadScenario = (id: string, isFresh: boolean, v?: string) => {
    const s: Saved = isFresh ? fresh(id, v) : load(id, persist);
    netRef.current = s.net;
    setVariant(s.variant);
    setSelNote(null);
    setEditNote(null);
    setDraft(null);
    setDone(s.done);
    setPacksState(s.packs);
    setDiagTab(s.packs.transport ? 'transport' : 'seq');
    setScenarioId(id);
    setWins([]);
    setOutputs([]);
    clearEvents();
    setSideTab('tasks');
    bump();
  };

  const setPacks = (next: PackSet, msg?: string) => {
    setPacksState(next);
    if (msg) say(msg);
  };

  const togglePack = (id: PackId) => {
    const on = !packs[id];
    const next = on ? withDeps({ ...packs, [id]: true }) : without(packs, id);
    const changed = PACKS.filter((p) => next[p.id] !== packs[p.id] && p.id !== id).map((p) => p.name);
    setPacks(next, changed.length ? `${on ? 'Włączono także' : 'Wyłączono także'}: ${changed.join(', ')}.` : undefined);
  };

  // ----- edycja topologii -----
  const toSvg = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const r = m ? pt.matrixTransform(m.inverse()) : pt;
    return { x: r.x, y: r.y };
  };

  /** Środek widocznego fragmentu obszaru roboczego (w jednostkach schematu). */
  const viewCenter = () => {
    const sc2 = scrollRef.current;
    if (!sc2) return { x: W / 2, y: H / 2, w: 800, h: 500 };
    const z = zoomRef.current;
    return { x: (sc2.scrollLeft + sc2.clientWidth / 2) / z, y: (sc2.scrollTop + sc2.clientHeight / 2) / z, w: sc2.clientWidth / z, h: sc2.clientHeight / z };
  };

  /** Ustawia widok tak, by cała sieć była widoczna (zmniejsza tylko wtedy, gdy trzeba – albo zawsze przy fitZoom). */
  const fitView = (fitZoom: boolean) => {
    const sc2 = scrollRef.current;
    const n = netRef.current;
    if (!sc2 || !sc2.clientWidth) return;
    const boxes = [
      ...n.devices.map((d) => ({ x: d.x - 110, y: d.y - 80, w: 220, h: 190 })),
      ...notesOf(n).map((o) => {
        const b = noteBox(o);
        return { x: b.x - 30, y: b.y - 30, w: b.w + 60, h: b.h + 60 };
      }),
    ];
    if (!boxes.length) {
      zoomAnchor.current = { wx: W / 2, wy: H / 2, cx: sc2.clientWidth / 2, cy: sc2.clientHeight / 2 };
      if (zoomRef.current !== 1) setZoom(1);
      else applyAnchor();
      return;
    }
    const bx = Math.min(...boxes.map((b) => b.x));
    const by = Math.min(...boxes.map((b) => b.y));
    const bw = Math.max(...boxes.map((b) => b.x + b.w)) - bx;
    const bh = Math.max(...boxes.map((b) => b.y + b.h)) - by;
    const fz = Math.min(sc2.clientWidth / bw, sc2.clientHeight / bh);
    const z = Math.max(ZMIN, Math.min(fitZoom ? Math.min(fz, 1.4) : Math.min(fz, 1), ZMAX));
    zoomAnchor.current = { wx: bx + bw / 2, wy: by + bh / 2, cx: sc2.clientWidth / 2, cy: sc2.clientHeight / 2 };
    if (Math.abs(z - zoomRef.current) > 1e-3) setZoom(z);
    else applyAnchor();
  };

  const applyAnchor = () => {
    const a = zoomAnchor.current;
    const sc2 = scrollRef.current;
    if (!a || !sc2) return;
    zoomAnchor.current = null;
    sc2.scrollLeft = a.wx * zoomRef.current - a.cx;
    sc2.scrollTop = a.wy * zoomRef.current - a.cy;
  };

  const zoomTo = (z: number, at?: { clientX: number; clientY: number }) => {
    const sc2 = scrollRef.current;
    if (!sc2) return;
    const nz = Math.max(ZMIN, Math.min(ZMAX, Math.round(z * 100) / 100));
    const r = sc2.getBoundingClientRect();
    const cx = at ? at.clientX - r.left : sc2.clientWidth / 2;
    const cy = at ? at.clientY - r.top : sc2.clientHeight / 2;
    zoomAnchor.current = { wx: (sc2.scrollLeft + cx) / zoomRef.current, wy: (sc2.scrollTop + cy) / zoomRef.current, cx, cy };
    setZoom(nz);
  };

  useLayoutEffect(applyAnchor, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // wyśrodkowanie widoku po wczytaniu scenariusza
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => fitView(false));
    return () => cancelAnimationFrame(id);
  }, [scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl/⌘ + kółko = powiększenie wokół kursora (zwykłe kółko przewija)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e);
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const placeDevice = (type: DeviceType, at?: { x: number; y: number }) => {
    const n = netRef.current;
    let x = at?.x ?? W / 2;
    let y = at?.y ?? H / 2;
    if (!at) {
      const v = viewCenter();
      const rx = Math.max(60, Math.min(260, v.w / 2 - 80));
      const ry = Math.max(50, Math.min(180, v.h / 2 - 80));
      for (let i = 0; i < 40; i++) {
        x = v.x + (Math.random() * 2 - 1) * rx;
        y = v.y + (Math.random() * 2 - 1) * ry;
        if (n.devices.every((d) => Math.hypot(d.x - x, d.y - y) > 110)) break;
      }
    }
    const d = createDevice(n, type, Math.round(Math.max(40, x)), Math.round(Math.max(36, y)));
    say(`Dodano ${TYPE_LABEL[type].toLowerCase()} ${d.name}. Połącz go narzędziem „Kabel”.`);
    bump();
  };

  const openWin = (id: string) => {
    const d = getDev(netRef.current, id);
    if (!d) return;
    zTop.current++;
    setWins((ws) => {
      const ex = ws.find((w) => w.id === id);
      if (ex) return ws.map((w) => (w.id === id ? { ...w, z: zTop.current } : w));
      const n = ws.length;
      return [...ws, { id, x: 24 + (n % 5) * 30, y: 18 + (n % 5) * 28, z: zTop.current, tab: tabsFor(d, packsRef.current)[0] }];
    });
  };

  const onDevDown = (e: React.PointerEvent, id: string) => {
    if (tool === 'text' || tool === 'zone') return; // narzędzia opisu działają także nad urządzeniami
    e.stopPropagation();
    setSelNote(null);
    const d = getDev(net, id)!;
    if (tool === 'delete') {
      removeDevice(net, id);
      setWins((ws) => ws.filter((w) => w.id !== id));
      say(`Usunięto ${d.name}.`);
      bump();
      return;
    }
    if (tool === 'link') {
      if (linkStart?.dev === id) {
        setLinkStart(null);
        setPortPick(null);
        return;
      }
      const r = wrapRef.current!.getBoundingClientRect();
      setPortPick({ dev: id, x: e.clientX - r.left, y: e.clientY - r.top });
      return;
    }
    const p = toSvg(e);
    drag.current = { id, dx: p.x - d.x, dy: p.y - d.y, moved: false };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onSvgMove = (e: React.PointerEvent) => {
    const sc2 = scrollRef.current;
    if (pan.current && sc2) {
      sc2.scrollLeft = pan.current.sl - (e.clientX - pan.current.x);
      sc2.scrollTop = pan.current.st - (e.clientY - pan.current.y);
      return;
    }
    const p = toSvg(e);
    if (tool === 'link' && linkStart) setMouse(p);
    if (draft) {
      setDraft({ ...draft, x1: p.x, y1: p.y });
      return;
    }
    const nd = noteDrag.current;
    if (nd) {
      const o = notesOf(netRef.current).find((x) => x.id === nd.id);
      if (!o) return;
      const dx = p.x - nd.sx;
      const dy = p.y - nd.sy;
      if (!nd.moved && Math.hypot(dx, dy) < 3) return;
      nd.moved = true;
      if (nd.h === 'move') {
        o.x = Math.max(0, snap(nd.o.x + dx));
        o.y = Math.max(0, snap(nd.o.y + dy));
      } else {
        let { x, y, w, h } = nd.o;
        const MIN = 60;
        if (nd.h.includes('w')) {
          const nx = Math.min(x + w - MIN, snap(x + dx));
          w += x - nx;
          x = nx;
        } else w = Math.max(MIN, snap(w + dx));
        if (nd.h.includes('n')) {
          const ny = Math.min(y + h - MIN, snap(y + dy));
          h += y - ny;
          y = ny;
        } else h = Math.max(MIN, snap(h + dy));
        Object.assign(o, { x: Math.max(0, x), y: Math.max(0, y), w, h });
      }
      bump();
      return;
    }
    const dr = drag.current;
    if (!dr) return;
    const d = getDev(net, dr.id);
    if (!d) return;
    if (sc2) {
      // przeciąganie przy krawędzi przewija obszar roboczy
      const r = sc2.getBoundingClientRect();
      const edge = 36;
      const dx = e.clientX < r.left + edge ? -14 : e.clientX > r.right - edge ? 14 : 0;
      const dy = e.clientY < r.top + edge ? -14 : e.clientY > r.bottom - edge ? 14 : 0;
      if (dx || dy) {
        sc2.scrollLeft += dx;
        sc2.scrollTop += dy;
      }
    }
    const nx = Math.min(W + GROW, Math.max(40, p.x - dr.dx));
    const ny = Math.min(H + GROW, Math.max(36, p.y - dr.dy));
    if (Math.hypot(nx - d.x, ny - d.y) > 2 || dr.moved) {
      dr.moved = true;
      d.x = Math.round(nx);
      d.y = Math.round(ny);
      bump();
    }
  };

  const onSvgUp = () => {
    if (pan.current) {
      pan.current = null;
      setPanning(false);
      return;
    }
    if (draft) {
      const n = netRef.current;
      const x = snap(Math.min(draft.x0, draft.x1));
      const y = snap(Math.min(draft.y0, draft.y1));
      const w = snap(Math.abs(draft.x1 - draft.x0));
      const h = snap(Math.abs(draft.y1 - draft.y0));
      const o = w >= 48 && h >= 48 ? newNote(n, 'zone', x, y, { w, h }) : newNote(n, 'zone', snap(draft.x0 - 180), snap(draft.y0 - 120));
      setDraft(null);
      setTool('select');
      setSelNote(o.id);
      setEditNote(o.id);
      bump();
      return;
    }
    const nd = noteDrag.current;
    if (nd) {
      noteDrag.current = null;
      if (!nd.moved && nd.dbl) setEditNote(nd.id);
      return;
    }
    const dr = drag.current;
    drag.current = null;
    if (dr && !dr.moved) openWin(dr.id);
  };

  const onBgDown = (e: React.PointerEvent) => {
    if (portPick) setPortPick(null);
    else if (tool === 'link') setLinkStart(null);
    if (editNote) return; // kliknięcie obok kończy edycję (blur)
    if (e.button === 0 && (tool === 'text' || tool === 'zone')) {
      e.preventDefault();
      const p = toSvg(e);
      svgRef.current?.setPointerCapture(e.pointerId);
      if (tool === 'zone') {
        setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
        return;
      }
      const o = newNote(netRef.current, 'text', snap(p.x), snap(p.y - 10));
      setTool('select');
      setSelNote(o.id);
      setEditNote(o.id);
      bump();
      return;
    }
    if (e.button === 0) setSelNote(null);
    const sc2 = scrollRef.current;
    // przesuwanie widoku: lewy przycisk na tle (narzędzie Wskaż) albo środkowy przycisk zawsze
    if (sc2 && ((tool === 'select' && e.button === 0) || e.button === 1)) {
      e.preventDefault();
      pan.current = { x: e.clientX, y: e.clientY, sl: sc2.scrollLeft, st: sc2.scrollTop };
      setPanning(true);
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const onNoteDown = (e: React.PointerEvent, id: string, h: Handle) => {
    if (tool !== 'select' && tool !== 'delete') return; // przekaż dalej (np. rysowanie obszaru w obszarze)
    if (e.button !== 0) return;
    e.stopPropagation();
    const n = netRef.current;
    if (tool === 'delete') {
      n.notes = notesOf(n).filter((o) => o.id !== id);
      setSelNote(null);
      say('Usunięto opis.');
      bump();
      return;
    }
    const o = notesOf(n).find((x) => x.id === id);
    if (!o) return;
    const p = toSvg(e);
    const now = performance.now();
    const dbl = lastNoteDown.current.id === id && now - lastNoteDown.current.t < 400;
    lastNoteDown.current = { id, t: now };
    setSelNote(id);
    noteDrag.current = { id, h, sx: p.x, sy: p.y, o: { x: o.x, y: o.y, w: o.w, h: o.h }, moved: false, dbl };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    const o = notesOf(netRef.current).find((x) => x.id === id);
    if (!o) return;
    Object.assign(o, patch);
    bump();
  };

  const deleteNote = (id: string) => {
    netRef.current.notes = notesOf(netRef.current).filter((o) => o.id !== id);
    setSelNote(null);
    setEditNote(null);
    bump();
  };

  const orderNote = (id: string, where: 'front' | 'back') => {
    const list = notesOf(netRef.current);
    const o = list.find((x) => x.id === id);
    if (!o) return;
    const rest = list.filter((x) => x !== o);
    netRef.current.notes = where === 'front' ? [...rest, o] : [o, ...rest];
    bump();
  };

  const finishEdit = (id: string, text: string | null) => {
    setEditNote(null);
    const o = notesOf(netRef.current).find((x) => x.id === id);
    if (!o || text === null) return;
    const t = o.kind === 'zone' ? text.trim() : text.replace(/\s+$/, '');
    if (!t && o.kind === 'text') return deleteNote(id);
    o.text = t || o.text;
    bump();
  };

  // Delete / Enter dla zaznaczonego opisu
  useEffect(() => {
    if (!selNote || editNote) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteNote(selNote);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setEditNote(selNote);
      } else if (e.key === 'Escape') setSelNote(null);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [selNote, editNote]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPort = (devId: string, iface: string) => {
    const d = getDev(netRef.current, devId);
    if (!d) return;
    const chosen = iface || d.ifaces.find((i) => !i.tunnel && !linkAt(netRef.current, devId, i.name))?.name || '';
    setPortPick(null);
    if (!chosen) {
      say(`${d.name}: wszystkie porty są zajęte.`);
      return;
    }
    if (!linkStart) {
      setLinkStart({ dev: devId, iface: chosen });
      return;
    }
    const r = connect(netRef.current, linkStart.dev, devId, linkStart.iface, chosen);
    if (typeof r === 'string') say(r);
    else say(`Połączono ${getDev(netRef.current, r.a.dev)!.name} ${r.a.iface} ↔ ${getDev(netRef.current, r.b.dev)!.name} ${r.b.iface}.`);
    setLinkStart(null);
    bump();
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setLinkStart(null);
      setPortPick(null);
      setPacksOpen(false);
      setTool('select');
      const t = e.target as HTMLElement | null;
      if (!t || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) setExpanded(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const clearTables = () => {
    for (const d of netRef.current.devices) {
      d.arp = [];
      d.nd = [];
      d.macTable = [];
      d.dnsCache = [];
    }
    say('Wyczyszczono tablice ARP, sąsiadów, MAC i pamięć DNS we wszystkich urządzeniach.');
    bump();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ format: 'netsim', version: 2, scenario: scenarioId, packs, net: netRef.current }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `siec-${scenarioId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (f: File) => {
    f.text().then((txt) => {
      try {
        const o = JSON.parse(txt);
        const n: Network = o.net ?? o;
        if (!Array.isArray(n.devices) || !Array.isArray(n.links)) throw new Error();
        netRef.current = normalizeNet(clone(n));
        setSelNote(null);
        setEditNote(null);
        if (o.packs) setPacksState(withDeps({ ...packs, ...o.packs }));
        setWins([]);
        clearEvents();
        say('Wczytano topologię z pliku.');
        bump();
      } catch {
        say('To nie jest poprawny plik topologii.');
      }
    });
  };

  // ----- podziałki -----
  const startSplit = (kind: 'side' | 'bottom' | 'list') => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const fr = frameRef.current!.getBoundingClientRect();
    const sp = splitRef.current?.getBoundingClientRect();
    el.onpointermove = (ev) => {
      setLayout((l) => {
        if (kind === 'side') return { ...l, side: Math.round(Math.min(fr.width * 0.55, Math.max(260, fr.right - ev.clientX))) };
        if (kind === 'bottom') return { ...l, bottom: Math.round(Math.min(fr.height * 0.65, Math.max(150, fr.bottom - ev.clientY))) };
        if (!sp) return l;
        return { ...l, list: Math.min(0.8, Math.max(0.25, (ev.clientX - sp.left) / sp.width)) };
      });
    };
    el.onpointerup = () => {
      el.onpointermove = null;
      el.onpointerup = null;
    };
  };

  // ----- dane widoku -----
  const chipProtos = useMemo(() => [...activeProtos, ...(Object.keys(PROTO_COLORS) as Protocol[]).filter((p) => !activeProtos.includes(p) && events.some((e) => e.protocol === p))], [events, activeProtos.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => events.filter((e) => filters[e.protocol]), [events, filters]);
  const started = useMemo(() => visible.filter((e) => e.t <= playhead + 1e-6), [visible, Math.floor(playhead * 4)]); // eslint-disable-line react-hooks/exhaustive-deps
  const moving = visible.filter((e) => e.kind === 'hop' && e.t <= playhead && playhead < e.t + 1);
  const drops = visible.filter((e) => e.dropped && ((e.kind === 'hop' && playhead >= e.t + 1 && playhead < e.t + 1.8) || (e.kind === 'drop' && playhead >= e.t && playhead < e.t + 1)));
  const hotLinks = new Map<string, string>();
  moving.forEach((e) => e.linkId && hotLinks.set(e.linkId, PROTO_COLORS[e.protocol]));
  const selected = events.find((e) => e.id === selEvent) ?? null;
  const runs = Object.keys(runLabels).map(Number).sort((a, b) => a - b);
  const seqEvents = visible.filter((e) => e.run === (seqRun ?? runs[runs.length - 1]));
  const endT = endRef.current;

  useEffect(() => {
    const el = listRef.current;
    if (el && playing) el.scrollTop = el.scrollHeight;
  }, [started.length, playing]);

  const selectEvent = (e: SimEvent) => {
    setSelEvent(e.id);
    setSideTab('packet');
    setPlaying(false);
    setSeqRun(e.run);
    if (modeRef.current === 'sim') seek(e.kind === 'hop' ? e.t + 0.5 : e.t + 0.3);
  };

  const togglePlay = () => {
    if (playing) setPlaying(false);
    else {
      if (phRef.current >= endRef.current) seek(0);
      setPlaying(true);
    }
  };
  const step = (dir: 1 | -1) => {
    setPlaying(false);
    const v = dir > 0 ? Math.floor(phRef.current + 1e-6) + 1 : Math.ceil(phRef.current - 1e-6) - 1;
    seek(Math.max(0, Math.min(endRef.current, v)));
  };

  const termLines = (id: string) => outputs.filter((o) => o.dev === id && o.t <= playhead + 1e-6);
  const pos = (id: string) => {
    const d = getDev(net, id);
    return d ? { x: d.x, y: d.y } : null;
  };
  const doneCount = sc.tasks.filter((_, i) => done[i]).length;
  const resetBtn = (
    <button
      type="button"
      className={`${styles.tbtn} ${armReset ? styles.tbtnWarn : ''}`}
      onClick={() => {
        if (!armReset) {
          setArmReset(true);
          window.setTimeout(() => setArmReset(false), 3000);
          return;
        }
        setArmReset(false);
        loadScenario(scenarioId, true, variant);
      }}
      title="Przywraca scenariusz do stanu początkowego"
    >
      {armReset ? 'Na pewno? Kliknij ponownie' : 'Reset'}
    </button>
  );

  const frameStyle = {
    '--sim-h': `${height}px`,
    '--side-w': `${layout.side}px`,
    '--bottom-h': `${layout.bottom}px`,
  } as React.CSSProperties;

  return (
    <div className={`${styles.root} ${fill ? styles.fill : ''} ${expanded ? styles.expanded : ''}`}>
      <div className={styles.frame} ref={frameRef} style={frameStyle}>
        {/* ---------- góra: scenariusze, pakiety, tryb ---------- */}
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="3" fill="currentColor" />
              <circle cx="19" cy="5" r="3" fill="currentColor" />
              <circle cx="19" cy="19" r="3" fill="currentColor" />
              <path d="M7.5 10.8 16.5 6.2M7.5 13.2l9 4.6" stroke="currentColor" strokeWidth="2" />
            </svg>
            <strong>Symulator sieci</strong>
          </div>
          {lockScenario ? (
            <span className={styles.lockedTitle}>{sc.title}</span>
          ) : (
            <nav className={styles.cases} aria-label="Scenariusze">
              <span className={styles.barLabel}>Scenariusz</span>
              {shown.map((s, i) => (
                <button
                  type="button"
                  key={s.id}
                  className={`${styles.case} ${s.id === scenarioId ? styles.caseOn : ''}`}
                  onClick={() => s.id !== scenarioId && loadScenario(s.id, false)}
                  title={s.id === 'empty' ? s.title : `${i + 1}. ${s.title}`}
                  aria-pressed={s.id === scenarioId}
                >
                  {s.id !== 'empty' && <span className={styles.caseNo}>{i + 1}</span>}
                  {s.short}
                </button>
              ))}
            </nav>
          )}
          <span className={styles.spacer} />
          <div className={styles.packsWrap} ref={packsBtnRef}>
            <button type="button" className={`${styles.tbtn} ${packsOpen ? styles.tbtnOn : ''}`} onClick={() => setPacksOpen((o) => !o)} aria-expanded={packsOpen}>
              <span aria-hidden="true">▦</span>
              <span>Pakiety: {profile ? profile.name : 'własny zestaw'}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {packsOpen && (
              <div className={styles.packsPop} role="dialog" aria-label="Pakiety protokołów">
                <h4>Gotowe profile</h4>
                <div className={styles.profiles}>
                  {PROFILES.map((pr) => (
                    <button type="button" key={pr.id} className={`${styles.profile} ${profile?.id === pr.id ? styles.profileOn : ''}`} onClick={() => setPacks(packSet(pr.packs), `Profil: ${pr.name}.`)}>
                      <strong>{pr.name}</strong>
                      <span>{pr.desc}</span>
                    </button>
                  ))}
                </div>
                <h4>Pakiety protokołów</h4>
                <div className={styles.packList}>
                  {PACKS.map((p) => (
                    <label key={p.id} className={styles.packItem}>
                      <input type="checkbox" checked={packs[p.id]} onChange={() => togglePack(p.id)} />
                      <span>
                        <strong>{p.name}</strong>
                        {p.requires && <em> · wymaga: {p.requires.map((r) => PACKS.find((x) => x.id === r)!.name).join(', ')}</em>}
                        <br />
                        <span className={styles.muted}>{p.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className={styles.muted}>Wyłączony pakiet znika z palety, okien, CLI i filtrów, a urządzenia przestają obsługiwać jego protokoły. Scenariusz zapamiętuje swój zestaw.</p>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${styles.tbtn} ${expanded ? styles.tbtnOn : ''}`}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Wróć do widoku na stronie (Esc)' : 'Rozciągnij symulator na całe okno'}
            aria-pressed={expanded}
          >
            <span aria-hidden="true">{expanded ? '⤡' : '⤢'}</span>
            <span className={styles.tlabel}>Pełny ekran</span>
          </button>
        </header>

        {/* ---------- druga linia: urządzenia i narzędzia ---------- */}
        <div className={styles.devbar}>
          <span className={styles.barLabel}>Urządzenia</span>
          <div className={styles.tiles}>
            {deviceTypes.map((t) => (
              <button
                type="button"
                key={t}
                className={styles.tile}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-netsim', t);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => placeDevice(t)}
                title={`${TYPE_LABEL[t]} – kliknij albo przeciągnij na schemat`}
              >
                <DeviceIcon type={t} size={26} />
                <span>{TYPE_LABEL[t]}</span>
              </button>
            ))}
          </div>
          <span className={styles.sep} />
          <span className={styles.barLabel}>Narzędzie</span>
          <div className={styles.group} role="group" aria-label="Narzędzie">
            {([['select', 'pointer', 'Wskaż'], ['link', 'cable', 'Kabel'], ['delete', 'trash', 'Usuń']] as [Tool, UiIconName, string][]).map(([t, ic, l]) => (
              <button
                type="button"
                key={t}
                className={`${styles.tbtn} ${tool === t ? styles.tbtnOn : ''}`}
                onClick={() => {
                  setTool(t);
                  setLinkStart(null);
                  setPortPick(null);
                }}
              >
                <UiIcon name={ic} />
                <span className={styles.tlabel}>{l}</span>
              </button>
            ))}
          </div>
          <span className={styles.barLabel}>Opisy</span>
          <div className={styles.group} role="group" aria-label="Opisy">
            {([['text', 'T', 'Tekst', 'Kliknij w obszarze roboczym, aby wstawić napis'], ['zone', '▭', 'Obszar', 'Przeciągnij, aby narysować obszar, np. „Sieć A”']] as [Tool, string, string, string][]).map(([t, ic, l, tip]) => (
              <button
                type="button"
                key={t}
                title={tip}
                className={`${styles.tbtn} ${tool === t ? styles.tbtnOn : ''}`}
                onClick={() => {
                  setTool(tool === t ? 'select' : t);
                  setLinkStart(null);
                  setPortPick(null);
                }}
              >
                <span aria-hidden="true" className={t === 'text' ? styles.toolT : undefined}>{ic}</span>
                <span className={styles.tlabel}>{l}</span>
              </button>
            ))}
          </div>
          <span className={styles.spacer} />
          <div className={styles.group}>
            <button type="button" className={styles.tbtn} onClick={clearTables} title="Czyści tablice ARP, sąsiadów, MAC i pamięć DNS">Wyczyść tablice</button>
            <button type="button" className={styles.tbtn} onClick={exportJson} title="Zapisz topologię do pliku JSON">Eksport</button>
            <button type="button" className={styles.tbtn} onClick={() => fileRef.current?.click()} title="Wczytaj topologię z pliku JSON">Import</button>
            {resetBtn}
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </div>
        </div>

        {/* ---------- środek: obszar roboczy + panel boczny ---------- */}
        <div className={styles.middle}>
          <div
            className={styles.canvasWrap}
            ref={wrapRef}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('application/x-netsim')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(e) => {
              const t = e.dataTransfer.getData('application/x-netsim') as DeviceType;
              if (!t) return;
              e.preventDefault();
              placeDevice(t, toSvg(e));
            }}
          >
            <div className={styles.scroller} ref={scrollRef}>
            <svg
              ref={svgRef}
              className={`${styles.canvas} ${tool !== 'select' ? styles.canvasTool : ''} ${panning ? styles.canvasPan : ''}`}
              width={W * zoom}
              height={H * zoom}
              viewBox={`0 0 ${W} ${H}`}
              onPointerMove={onSvgMove}
              onPointerUp={onSvgUp}
              onPointerDown={onBgDown}
              onAuxClick={(e) => e.preventDefault()}
              role="img"
              aria-label="Schemat sieci"
            >
              <defs>
                <pattern id="nsgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M24 0H0V24" fill="none" className={styles.gridLine} />
                </pattern>
                <pattern id="nsgrid5" width="120" height="120" patternUnits="userSpaceOnUse">
                  <rect width="120" height="120" fill="url(#nsgrid)" />
                  <path d="M120 0H0V120" fill="none" className={styles.gridMajor} />
                </pattern>
              </defs>
              <rect width={W} height={H} fill="url(#nsgrid5)" />
              <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" className={styles.gridEdge} />

              <NotesLayer notes={allNotes} kind="zone" selected={selNote} editing={editNote} zoom={zoom} interactive={tool === 'select' || tool === 'delete'} onDown={onNoteDown} />

              {net.links.map((l) => {
                const a = getDev(net, l.a.dev);
                const b = getDev(net, l.b.dev);
                if (!a || !b) return null;
                const sa = ifaceStatus(net, a, getIface(a, l.a.iface)!);
                const sb = ifaceStatus(net, b, getIface(b, l.b.iface)!);
                const hot = hotLinks.get(l.id);
                const lerp = (t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
                const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const pa = lerp(Math.min(0.4, 44 / len));
                const pb = lerp(1 - Math.min(0.4, 44 / len));
                const la = lerp(Math.min(0.3, 60 / len));
                const lb = lerp(1 - Math.min(0.3, 60 / len));
                const nx = (-(b.y - a.y) / len) * 11;
                const ny = ((b.x - a.x) / len) * 11 + 3;
                const col = (s: string) => (s === 'up' ? '#16a34a' : s === 'disabled' ? '#dc2626' : '#f59e0b');
                return (
                  <g
                    key={l.id}
                    className={tool === 'delete' ? styles.linkDel : undefined}
                    onPointerDown={(e) => {
                      if (tool !== 'delete') return;
                      e.stopPropagation();
                      netRef.current.links = netRef.current.links.filter((x) => x.id !== l.id);
                      say('Usunięto kabel.');
                      bump();
                    }}
                  >
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} />
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`${styles.link} ${l.loss ? styles.linkLossy : ''}`} style={hot ? { stroke: hot, strokeWidth: 4 } : undefined} strokeDasharray={sa === 'up' && sb === 'up' ? (l.loss ? '10 3 2 3' : undefined) : '6 5'} />
                    <circle cx={pa.x} cy={pa.y} r={5} fill={col(sa)} />
                    <circle cx={pb.x} cy={pb.y} r={5} fill={col(sb)} />
                    <text x={la.x + nx} y={la.y + ny} className={styles.portLabel} textAnchor="middle">{l.a.iface}</text>
                    <text x={lb.x + nx} y={lb.y + ny} className={styles.portLabel} textAnchor="middle">{l.b.iface}</text>
                    {!!l.loss && (
                      <g className={styles.lossTag} transform={`translate(${(a.x + b.x) / 2 - nx * 1.6} ${(a.y + b.y) / 2 - ny * 1.6 + 4})`}>
                        <title>{`Na tym kablu ginie średnio ${l.loss}% ramek`}</title>
                        <rect x={-38} y={-10} width={76} height={19} rx={9.5} />
                        <text x={0} y={4} textAnchor="middle">{`utrata ${l.loss}%`}</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {packs.transition &&
                net.devices.flatMap((d) =>
                  d.ifaces
                    .filter((i) => i.tunnel)
                    .map((i) => {
                      const t = i.tunnel!;
                      const far = net.devices.find((x) => x.id !== d.id && x.ifaces.some((j) => !j.tunnel && (sameIp(j.ip, t.remote) || j.ip6.some((a) => sameIp(a.addr, t.remote)))));
                      if (!far) return null;
                      const back = far.ifaces.find((j) => j.tunnel && sameIp(j.tunnel.remote, t.local) && sameIp(j.tunnel.local, t.remote));
                      if (back && far.id < d.id) return null; // para rysowana raz
                      const mx = (d.x + far.x) / 2;
                      const my = Math.min(d.y, far.y) - 70 - Math.abs(far.x - d.x) * 0.12;
                      return (
                        <g key={`tun-${d.id}-${i.name}`} style={{ ['--tc' as string]: PROTO_COLORS.TUNNEL }}>
                          <path d={`M${d.x} ${d.y - 28} Q ${mx} ${my} ${far.x} ${far.y - 28}`} className={`${styles.tunnelArc} ${back ? '' : styles.tunnelArcHalf}`} />
                          <text x={mx} y={(Math.min(d.y, far.y) - 28 + my) / 2 + 4} textAnchor="middle" className={styles.tunnelLabel}>
                            {back ? `tunel ${t.mode}: ${i.name} ↔ ${back.name}` : `tunel ${t.mode} ${i.name} – drugi koniec nieskonfigurowany`}
                          </text>
                        </g>
                      );
                    }),
                )}

              {tool === 'link' && linkStart && mouse && pos(linkStart.dev) && (
                <line x1={pos(linkStart.dev)!.x} y1={pos(linkStart.dev)!.y} x2={mouse.x} y2={mouse.y} className={styles.linkGhost} />
              )}

              {net.devices.map((d) => {
                const busy = moving.some((e) => e.to === d.id && playhead - e.t > 0.85);
                const ip4 = packs.ipv4 ? firstIp(d) : '';
                const ip6 = packs.ipv6 ? firstIp6(d) : '';
                return (
                  <g
                    key={d.id}
                    transform={`translate(${d.x},${d.y})`}
                    className={`${styles.dev} ${linkStart?.dev === d.id ? styles.devLinking : ''} ${tool === 'delete' ? styles.devDel : ''}`}
                    onPointerDown={(e) => onDevDown(e, d.id)}
                  >
                    <rect x={-36} y={-30} width={72} height={60} rx={10} className={`${styles.devHalo} ${busy ? styles.devBusy : ''}`} />
                    <DeviceGlyph type={d.type} />
                    <text y={42} textAnchor="middle" className={styles.devName}>{d.name}</text>
                    {d.type !== 'switch' && (
                      <>
                        <text y={56} textAnchor="middle" className={styles.devIp}>
                          {ip4 || ip6 || (d.dhcp && packs.dhcp ? 'DHCP…' : d.slaac ? 'SLAAC…' : 'brak adresu')}
                        </text>
                        {ip4 && ip6 && <text y={69} textAnchor="middle" className={styles.devIp}>{ip6}</text>}
                      </>
                    )}
                  </g>
                );
              })}

              <NotesLayer notes={allNotes} kind="text" selected={selNote} editing={editNote} zoom={zoom} interactive={tool === 'select' || tool === 'delete'} onDown={onNoteDown} />

              {draft && (
                <rect
                  x={Math.min(draft.x0, draft.x1)}
                  y={Math.min(draft.y0, draft.y1)}
                  width={Math.abs(draft.x1 - draft.x0)}
                  height={Math.abs(draft.y1 - draft.y0)}
                  rx={14}
                  className={styles.zoneDraft}
                />
              )}

              {moving.map((e) => {
                const a = pos(e.from);
                const b = pos(e.to);
                if (!a || !b) return null;
                const f = Math.min(1, Math.max(0, playhead - e.t));
                const s = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
                const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const x = a.x + (b.x - a.x) * s + (-(b.y - a.y) / len) * 7;
                const y = a.y + (b.y - a.y) * s + ((b.x - a.x) / len) * 7;
                const c = PROTO_COLORS[e.protocol];
                const enc = !!e.frame.ip?.tcp?.app?.enc;
                return (
                  <g key={e.id} transform={`translate(${x},${y})`} className={styles.packet} onPointerDown={(ev) => { ev.stopPropagation(); selectEvent(e); }}>
                    <title>{e.summary}</title>
                    <rect x={-13} y={-9} width={26} height={18} rx={3} fill={c} stroke="#fff" strokeWidth={1.5} />
                    <path d="M-13 -9 L0 1 L13 -9" fill="none" stroke="#fff" strokeWidth={1.5} />
                    {enc && <text x={9} y={-8} fontSize={11}>🔒</text>}
                    {e.id === selEvent && <rect x={-17} y={-13} width={34} height={26} rx={5} fill="none" stroke={c} strokeWidth={2} />}
                    <text y={22} textAnchor="middle" className={styles.packetLabel} fill={c}>{PROTO_LABEL[e.protocol]}</text>
                  </g>
                );
              })}

              {drops.map((e) => {
                const p = pos(e.kind === 'hop' ? e.to : e.from);
                if (!p) return null;
                return (
                  <g key={'x' + e.id} transform={`translate(${p.x + 26},${p.y - 26})`} className={styles.packet} onPointerDown={(ev) => { ev.stopPropagation(); selectEvent(e); }}>
                    <title>{e.notes[e.notes.length - 1]}</title>
                    <circle r={10} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
                    <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
                  </g>
                );
              })}
            </svg>
            {(() => {
              const sn = allNotes.find((o) => o.id === selNote);
              const en = allNotes.find((o) => o.id === editNote);
              return (
                <>
                  {sn && !en && (
                    <NoteToolbar
                      note={sn}
                      zoom={zoom}
                      onChange={(p) => updateNote(sn.id, p)}
                      onEdit={() => setEditNote(sn.id)}
                      onDelete={() => deleteNote(sn.id)}
                      onOrder={(w) => orderNote(sn.id, w)}
                    />
                  )}
                  {en && <NoteEditor key={en.id} note={en} zoom={zoom} onDone={(t) => finishEdit(en.id, t)} />}
                </>
              );
            })()}
            </div>

            <div className={styles.zoomBar} role="group" aria-label="Widok obszaru roboczego">
              <button type="button" onClick={() => zoomTo(zoomRef.current / 1.2)} title="Pomniejsz (Ctrl + kółko)" aria-label="Pomniejsz">−</button>
              <button type="button" onClick={() => zoomTo(1)} title="Rzeczywisty rozmiar" className={styles.zoomVal}>{Math.round(zoom * 100)}%</button>
              <button type="button" onClick={() => zoomTo(zoomRef.current * 1.2)} title="Powiększ (Ctrl + kółko)" aria-label="Powiększ">+</button>
              <button type="button" onClick={() => fitView(true)} title="Pokaż całą sieć">Dopasuj</button>
            </div>

            {!net.devices.length && (
              <div className={styles.emptyCanvas}>
                <strong>Pusty obszar roboczy</strong>
                <span>Przeciągnij urządzenie z paska u góry albo kliknij jego ikonę. Potrzebne protokoły włączysz w menu „Pakiety”.</span>
              </div>
            )}

            <div className={styles.hintBar}>
              {toast ||
                (tool === 'link'
                  ? linkStart
                    ? `Kabel z ${getDev(net, linkStart.dev)?.name ?? '?'} ${linkStart.iface}. Kliknij drugie urządzenie i wybierz port (Esc – anuluj).`
                    : 'Kliknij pierwsze urządzenie i wybierz port, do którego wepniesz kabel.'
                  : tool === 'delete'
                    ? 'Kliknij urządzenie, kabel albo opis, aby je usunąć.'
                    : tool === 'text'
                      ? 'Kliknij w miejscu, gdzie ma się pojawić napis. Ctrl + Enter albo kliknięcie obok kończy edycję.'
                      : tool === 'zone'
                        ? 'Przeciągnij, aby narysować obszar (np. Sieć A). Samo kliknięcie wstawia obszar domyślnej wielkości.'
                        : selNote
                          ? 'Opis zaznaczony: przeciągnij, aby przesunąć; narożniki zmieniają rozmiar obszaru; Enter – edycja, Delete – usunięcie.'
                    : 'Kliknij urządzenie, aby otworzyć jego okno. Przeciągnij tło (albo użyj pasków), aby przesunąć widok; Ctrl + kółko – powiększenie.')}
            </div>

            {portPick && getDev(net, portPick.dev) && (
              <PortPicker
                net={net}
                devId={portPick.dev}
                x={portPick.x}
                y={portPick.y}
                bounds={wrapRef.current}
                step={linkStart ? 2 : 1}
                packs={packs}
                onPick={(iface) => pickPort(portPick.dev, iface)}
                onClose={() => setPortPick(null)}
              />
            )}

            {wins.map((w) => {
              const d = getDev(net, w.id);
              if (!d) return null;
              return (
                <DeviceWindow
                  key={w.id}
                  net={net}
                  dev={d}
                  win={w}
                  packs={packs}
                  compact={compact}
                  lines={termLines(w.id)}
                  last={lastCmd[w.id]}
                  exec={(l, s) => exec(w.id, l, s)}
                  onFocus={() => {
                    if (w.z === zTop.current) return;
                    zTop.current++;
                    setWins((ws) => ws.map((x) => (x.id === w.id ? { ...x, z: zTop.current } : x)));
                  }}
                  onClose={() => setWins((ws) => ws.filter((x) => x.id !== w.id))}
                  onMove={(x, y) => setWins((ws) => ws.map((v) => (v.id === w.id ? { ...v, x, y } : v)))}
                  onTab={(t) => setWins((ws) => ws.map((v) => (v.id === w.id ? { ...v, tab: t } : v)))}
                />
              );
            })}
          </div>

          <div className={styles.vsplit} onPointerDown={startSplit('side')} role="separator" aria-orientation="vertical" aria-label="Zmień szerokość panelu bocznego" />

          <aside className={styles.side}>
            <div className={styles.tabs} role="tablist">
              {([['packet', 'Pakiet'], ['tasks', showTasks ? `Zadania${sc.tasks.length ? ` ${doneCount}/${sc.tasks.length}` : ''}` : 'Scenariusz'], ['help', 'Pomoc']] as const).map(([k, l]) => (
                <button type="button" role="tab" aria-selected={sideTab === k} key={k} className={sideTab === k ? styles.tabOn : ''} onClick={() => setSideTab(k)}>
                  {l}
                </button>
              ))}
            </div>
            <div className={styles.sideBody}>
              {sideTab === 'packet' && <EventDetails ev={selected} net={net} />}
              {sideTab === 'tasks' && (
                <div className={styles.tasks}>
                  <h3>{sc.title}</h3>
                  <p className={styles.muted}>{showTasks ? `Poziom: ${sc.level} · ` : ''}pakiety: {PACKS.filter((p) => packs[p.id]).map((p) => p.name).join(', ')}</p>
                  <p>{sc.description}</p>
                  {(sc.variants?.length ?? 0) > 1 && (
                    <div className={styles.variantBox}>
                      <label className={styles.variantLabel}>
                        <span>Stan początkowy</span>
                        <select value={variant ?? ''} onChange={(e) => loadScenario(scenarioId, true, e.target.value)}>
                          {sc.variants!.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                              {v.id === (sc.start ?? sc.variants![0].id) ? ' (domyślny)' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                      {variantOf(sc, variant)?.description && <p className={styles.muted}>{variantOf(sc, variant)!.description}</p>}
                      <p className={styles.muted}>Zmiana wariantu wczytuje scenariusz od nowa.</p>
                    </div>
                  )}
                  {showTasks && (
                  <ol>
                    {sc.tasks.map((t, i) => (
                      <li key={i} className={done[i] ? styles.taskDone : ''}>
                        <label>
                          <input type="checkbox" checked={!!done[i]} disabled={!!t.check} onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))} />
                          <span>{t.text}</span>
                          {t.check && <span className={styles.auto} title="Sprawdzane automatycznie">auto</span>}
                        </label>
                        {t.hint && (
                          <details>
                            <summary>Podpowiedź</summary>
                            {t.hint}
                          </details>
                        )}
                      </li>
                    ))}
                  </ol>
                  )}
                  {showTasks && !sc.tasks.length && <p className={styles.muted}>Ten scenariusz nie ma zadań – eksperymentuj swobodnie.</p>}
                  {!showTasks && (
                    <p className={styles.muted}>
                      Scenariusz to gotowa topologia startowa. Zmieniaj ją dowolnie – przycisk „Reset” przywraca stan początkowy, a „Pusty projekt” daje czystą kartkę.
                    </p>
                  )}
                </div>
              )}
              {sideTab === 'help' && <Help packs={packs} />}
            </div>
          </aside>
        </div>

        <div className={styles.hsplit} onPointerDown={startSplit('bottom')} role="separator" aria-orientation="horizontal" aria-label="Zmień wysokość dolnego panelu" />

        {/* ---------- dół: odtwarzanie, lista zdarzeń i diagram ---------- */}
        <section className={styles.bottom}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="Tryb">
            <button type="button" className={`${styles.tbtn} ${mode === 'sim' ? styles.tbtnOn : ''}`} onClick={() => setMode('sim')}>Symulacja</button>
            <button
              type="button"
              className={`${styles.tbtn} ${mode === 'realtime' ? styles.tbtnOn : ''}`}
              onClick={() => {
                setMode('realtime');
                setPlaying(false);
                seek(endRef.current);
              }}
            >
              Czas rzeczywisty
            </button>
          </div>
            <button type="button" className={styles.tbtn} onClick={() => { setPlaying(false); seek(0); }} title="Na początek" aria-label="Na początek"><UiIcon name="first" /></button>
            <button type="button" className={styles.tbtn} onClick={() => step(-1)} title="Krok wstecz" aria-label="Krok wstecz"><UiIcon name="back" /></button>
            <button type="button" className={`${styles.tbtn} ${styles.play}`} onClick={togglePlay} disabled={!events.length} title={playing ? 'Pauza' : 'Odtwórz'} aria-label={playing ? 'Pauza' : 'Odtwórz'}>
              <UiIcon name={playing ? 'pause' : 'play'} />
            </button>
            <button type="button" className={styles.tbtn} onClick={() => step(1)} title="Krok naprzód" aria-label="Krok naprzód"><UiIcon name="step" /></button>
            <button type="button" className={styles.tbtn} onClick={() => { setPlaying(false); seek(endRef.current); }} title="Na koniec" aria-label="Na koniec"><UiIcon name="last" /></button>
            <label className={styles.speed}>
              tempo
              <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              <span>{speed}×</span>
            </label>
            <span className={styles.clock}>krok {playhead.toFixed(1)} / {endT.toFixed(0)}</span>
            <span className={styles.spacer} />
            {chipProtos.map((p) => (
              <label key={p} className={styles.filter} style={{ ['--c' as string]: PROTO_COLORS[p] }}>
                <input type="checkbox" checked={filters[p]} onChange={() => setFilters((f) => ({ ...f, [p]: !f[p] }))} />
                {PROTO_LABEL[p]}
              </label>
            ))}
            <button type="button" className={styles.tbtn} onClick={clearEvents} disabled={!events.length}>Wyczyść zdarzenia</button>
          </div>
          <div className={styles.bottomSplit} ref={splitRef}>
            <div className={styles.pane} style={{ flexGrow: layout.list, flexBasis: 0 }}>
              <div className={styles.paneHead}>Lista zdarzeń <span className={styles.muted}>({started.length})</span></div>
              <div className={styles.events} ref={listRef}>
                {!started.length ? (
                  <div className={styles.empty}>Wykonaj polecenie (np. ping) w oknie urządzenia – tu pojawi się każda ramka: skąd, dokąd i co z nią zrobiono.</div>
                ) : (
                  <table className={styles.evTable}>
                    <thead>
                      <tr>
                        <th>Krok</th>
                        <th>Skąd</th>
                        <th>Dokąd</th>
                        <th>Protokół</th>
                        <th>Opis</th>
                        <th>Wynik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {started.slice(-400).map((e) => {
                        const live = e.kind === 'hop' && e.t <= playhead && playhead < e.t + 1;
                        return (
                          <tr key={e.id} className={`${e.id === selEvent ? styles.evSel : ''} ${live ? styles.evLive : ''}`} onClick={() => selectEvent(e)}>
                            <td>{e.t}</td>
                            <td>{getDev(net, e.from)?.name ?? '?'}</td>
                            <td>{e.kind === 'drop' ? '—' : getDev(net, e.to)?.name ?? '?'}</td>
                            <td><span className={styles.chip} style={{ background: PROTO_COLORS[e.protocol] }}>{PROTO_LABEL[e.protocol]}</span></td>
                            <td className={styles.evSum}>{e.summary}</td>
                            <td>{e.dropped ? <span className={styles.bad} title={e.notes[e.notes.length - 1]}>✗</span> : <span className={styles.good}>✓</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className={styles.vsplit} onPointerDown={startSplit('list')} role="separator" aria-orientation="vertical" aria-label="Zmień proporcje listy i diagramu" />
            <div className={styles.pane} style={{ flexGrow: 1 - layout.list, flexBasis: 0 }}>
              <div className={styles.paneHead}>
                <div className={styles.paneTabs} role="tablist" aria-label="Rodzaj diagramu">
                  {([['seq', 'Diagram sekwencji'], ['transport', 'TCP / UDP']] as const).map(([k, l]) => (
                    <button key={k} type="button" role="tab" aria-selected={diagTab === k} className={diagTab === k ? styles.paneTabOn : undefined} onClick={() => setDiagTab(k)}>
                      {l}
                    </button>
                  ))}
                </div>
                <span className={styles.spacer} />
                {diagTab === 'seq' && runs.length > 0 && (
                  <select className={styles.runSel} value={seqRun ?? runs[runs.length - 1]} onChange={(e) => setSeqRun(Number(e.target.value))} aria-label="Przebieg na diagramie">
                    {runs.map((r) => <option key={r} value={r}>{runLabels[r]}</option>)}
                  </select>
                )}
              </div>
              <div className={styles.events}>
                {diagTab === 'seq' ? (
                  <SequenceDiagram events={seqEvents} net={net} playhead={playhead} selected={selEvent} onSelect={selectEvent} />
                ) : (
                  <TransportView events={events} net={net} playhead={playhead} selected={selEvent} onSelect={selectEvent} />
                )}
              </div>
            </div>
          </div>
        </section>
        <footer className={styles.footer}>{COPYRIGHT}</footer>
      </div>
    </div>
  );
}

function PortPicker({
  net,
  devId,
  x,
  y,
  bounds,
  step,
  packs,
  onPick,
  onClose,
}: {
  net: Network;
  devId: string;
  x: number;
  y: number;
  bounds: HTMLElement | null;
  step: 1 | 2;
  packs: PackSet;
  onPick: (iface: string) => void;
  onClose: () => void;
}) {
  const d = getDev(net, devId)!;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), [devId]);
  const w = 260;
  const h = Math.min(360, 92 + d.ifaces.filter((i) => !i.tunnel).length * 34);
  const bw = bounds?.clientWidth ?? 800;
  const bh = bounds?.clientHeight ?? 600;
  const left = Math.max(6, Math.min(x + 14, bw - w - 6));
  const top = Math.max(6, Math.min(y - 20, bh - h - 6));
  const phys = d.ifaces.filter((i) => !i.tunnel);
  const anyFree = phys.some((i) => !linkAt(net, d.id, i.name));
  return (
    <div className={styles.portPick} style={{ left, top, width: w, maxHeight: h }} role="dialog" aria-label={`Wybór portu: ${d.name}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className={styles.portHead}>
        <DeviceIcon type={d.type} size={18} />
        <strong>{d.name}</strong>
        <span className={styles.muted}>{step === 1 ? 'początek kabla' : 'koniec kabla'}</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.winBtn} onClick={onClose} title="Anuluj (Esc)">✕</button>
      </div>
      <div className={styles.portList}>
        <button type="button" ref={first} className={styles.portAuto} disabled={!anyFree} onClick={() => onPick('')}>
          Pierwszy wolny port
        </button>
        {phys.map((i) => {
          const peer = peerOf(net, d.id, i.name);
          const pd = peer && getDev(net, peer.dev);
          const st = ifaceStatus(net, d, i);
          return (
            <button type="button" key={i.name} className={styles.portItem} disabled={!!peer} onClick={() => onPick(i.name)}>
              <span className={`${styles.dot} ${!i.up ? styles.dotOff : peer ? (st === 'up' ? styles.dotUp : styles.dotWarn) : styles.dotIdle}`} />
              <strong>{i.name}</strong>
              <span className={styles.portInfo}>
                {pd ? `zajęty → ${pd.name} ${peer!.iface}` : i.up ? 'wolny' : 'wolny · wyłączony'}
                {d.type === 'switch' && packs.vlan && i.vlan !== 1 ? ` · VLAN ${i.vlan}` : ''}
                {d.type === 'router' && packs.ipv4 && i.ip ? ` · ${i.ip}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Help({ packs }: { packs: PackSet }) {
  const types: DeviceType[] = ['pc', 'server', 'router', 'switch', 'printer'];
  const seen = new Set<string>();
  const cmds = types
    .flatMap((t) => commandsFor({ type: t } as Parameters<typeof commandsFor>[0], packs))
    .filter((c) => {
      if (seen.has(c.verb)) return false;
      seen.add(c.verb);
      return true;
    });
  return (
    <div className={styles.help}>
      <h3>Jak zacząć</h3>
      <ol>
        <li>Wybierz scenariusz u góry albo „Pusty projekt”. Każdy scenariusz włącza tylko potrzebne pakiety protokołów – zmienisz je w menu „Pakiety”.</li>
        <li>Przeciągnij urządzenia na obszar roboczy i połącz je narzędziem <strong>Kabel</strong> (wybierasz porty po obu stronach).</li>
        <li>Kliknij urządzenie – otworzy się jego okno. Każda zmiana w oknie wykonuje się jako polecenie CLI (widać je w stopce okna).</li>
        <li>W trybie <strong>Symulacja</strong> ruch jest odtwarzany krok po kroku. Kliknij kopertę, wiersz listy albo strzałkę na diagramie, by zobaczyć ramkę warstwa po warstwie.</li>
      </ol>
      <h3>Kolory</h3>
      <p>
        <span className={styles.dot + ' ' + styles.dotUp} /> łącze aktywne · <span className={styles.dot + ' ' + styles.dotWarn} /> brak łącza · <span className={styles.dot + ' ' + styles.dotOff} /> interfejs wyłączony
      </p>
      <p className={styles.chips}>
        {protocolsFor(packs).map((p) => (
          <span key={p} className={styles.chip} style={{ background: PROTO_COLORS[p] }}>{PROTO_LABEL[p]}</span>
        ))}
      </p>
      <h3>Polecenia CLI (włączone pakiety)</h3>
      <table className={styles.fields}>
        <tbody>
          {cmds.map((c) => (
            <tr key={c.verb}>
              <th>{c.verb}</th>
              <td>{c.syntax.map((s) => <div key={s}><code>{s}</code></div>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.muted}>Słowa kluczowe można skracać (np. <code>sh int</code>). W terminalu: <code>help</code> albo <code>help route</code>.</p>
    </div>
  );
}
