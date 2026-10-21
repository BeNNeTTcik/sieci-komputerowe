// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Rejestr scenariuszy i budowanie sieci z ich opisu.
// Nowy scenariusz: utwórz plik w tym folderze (wzór: dhcp.ts), zaimportuj go poniżej i dopisz do SCENARIOS.

import { runCommand, CliActions } from '../cli';
import { Device, Network, connect, createDevice, emptyNetwork } from '../model';
import { Sim } from '../engine';
import { ALL_PACKS, PackSet, packSet } from '../packs';
import { startFtp, startHttp, startMailCheck, startMailSend, startPrint } from '../apps';
import { newNote } from '../notes';
import type { Scenario, Variant } from './types';

import lan from './lan';
import routing from './routing';
import dhcp from './dhcp';
import staticRoutes from './static';
import vlan from './vlan';
import services from './services';
import relay from './relay';
import ipv6 from './ipv6';
import dual from './dual';
import tunnel from './tunnel';
import nat64 from './nat64';
import security from './security';
import transport from './transport';
import empty from './empty';

export type { CheckCtx, Task, Scenario, Variant, DeviceSpec, DeviceConfig, ZoneSpec } from './types';
export { defineScenario } from './types';
export { EXTRA_SCENARIOS } from './config';

/** kolejność na pasku („Pusty projekt” na końcu) */
export const SCENARIOS: Scenario[] = [lan, routing, dhcp, staticRoutes, vlan, services, relay, ipv6, dual, transport, tunnel, nat64, security, empty];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

/** wariant scenariusza: podany (jeśli istnieje), w przeciwnym razie `start`, a w ostateczności pierwszy */
export function variantOf(sc: Scenario, id?: string): Variant | undefined {
  const vs = sc.variants ?? [];
  return vs.find((v) => v.id === id) ?? vs.find((v) => v.id === sc.start) ?? vs[0];
}

/** podpis stanu początkowego – gdy plik scenariusza się zmieni, zapisany w przeglądarce stan jest porzucany */
export function scenarioSig(id: string, variant?: string) {
  const sc = scenarioById(id);
  const v = variantOf(sc, variant);
  const text = JSON.stringify({ d: sc.devices, l: sc.links, z: sc.zones, p: sc.packs, v });
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return `${v?.id ?? '-'}:${(h >>> 0).toString(36)}`;
}

/** polecenia z bloku tekstu: jedno w wierszu, bez pustych wierszy i komentarzy (#) */
export const commandLines = (text?: string) =>
  (text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

/** scenariusze projektowano na płótnie 960×560 – umieszczamy je na środku większego obszaru roboczego */
const OX = 720;
const OY = 520;

/**
 * Buduje sieć scenariusza: urządzenia, kable, obszary, konfiguracja bazowa, potem wariant.
 * Polecenia wywołujące ruch (dhcp-client start, ipv6 autoconf, ping…) wykonują się „po cichu” –
 * zostaje ich skutek (adresy, tablice ARP i MAC), a zdarzenia nie trafiają na listę.
 * Zwraca też ostrzeżenia o błędnych poleceniach (symulator wypisuje je w konsoli przeglądarki).
 */
export function buildScenarioChecked(id: string, variant?: string): { net: Network; warnings: string[] } {
  const sc = scenarioById(id);
  const net = emptyNetwork();
  const warnings: string[] = [];
  const where = `scenarios/${sc.id}`;
  const byName = new Map<string, Device>();

  for (const [name, spec] of Object.entries(sc.devices)) {
    const d = createDevice(net, spec.type, spec.x + OX, spec.y + OY, name);
    if (spec.dhcp) d.dhcp = true;
    byName.set(name, d);
  }
  for (const z of sc.zones ?? []) newNote(net, 'zone', z.x + OX, z.y + OY, { w: z.w, h: z.h, text: z.text, color: z.color });
  for (const [a, b] of sc.links ?? []) {
    const [an, ai] = a.split(':');
    const [bn, bi] = b.split(':');
    const da = byName.get(an);
    const db = byName.get(bn);
    if (!da || !db) {
      warnings.push(`${where}: kabel ${a} – ${b}: nie ma urządzenia ${da ? bn : an}`);
      continue;
    }
    const r = connect(net, da.id, db.id, ai, bi);
    if (typeof r === 'string') warnings.push(`${where}: kabel ${a} – ${b}: ${r}`);
  }

  const packs: PackSet = packSet(sc.packs);
  const idRef = { current: 1 };
  let t = 0;
  const exec = (name: string, text: string | undefined, label: string) => {
    const d = byName.get(name);
    if (!d) {
      warnings.push(`${label}: nie ma urządzenia „${name}”`);
      return;
    }
    for (const line of commandLines(text)) {
      const jobs: ((s: Sim) => void)[] = [];
      const act: CliActions = {
        ping: (dd, h, n, v) => jobs.push((s) => s.startPing(dd, h, n, v)),
        trace: (dd, h, v) => jobs.push((s) => s.startTrace(dd, h, v)),
        dhcp: (dd) => jobs.push((s) => s.startDhcp(dd)),
        autoconf: (dd) => jobs.push((s) => s.startAutoconf(dd)),
        dot1x: (dd, u, pw) => jobs.push((s) => s.startDot1x(dd, u, pw)),
        dot1xOff: (dd) => jobs.push((s) => s.stopDot1x(dd)),
        lookup: (dd, n, ty) => jobs.push((s) => s.startLookup(dd, n, ty)),
        http: (dd, h, p, sec, v) => jobs.push((s) => startHttp(s, dd, h, p, sec, v)),
        ftp: (dd, h, op, v) => jobs.push((s) => startFtp(s, dd, h, op, v)),
        mailSend: (dd, to, subj) => jobs.push((s) => startMailSend(s, dd, to, subj, `Wiadomość od ${dd.name}`)),
        mailCheck: (dd) => jobs.push((s) => startMailCheck(s, dd)),
        ntp: (dd, h) => jobs.push((s) => s.startNtp(dd, h)),
        print: (dd, h, doc, v) => jobs.push((s) => startPrint(s, dd, h, doc, v)),
        tcpSend: (dd, h, port, size, v) => jobs.push((s) => s.startTcpSend(dd, h, port, size, v)),
        udpSend: (dd, h, port, size, v) => jobs.push((s) => s.startUdpSend(dd, h, port, size, v)),
      };
      const r = runCommand(net, d, line, act, ALL_PACKS);
      if (r.error) warnings.push(`${label}, ${name}: „${line}” – ${r.lines.map((l) => l.text).join(' ')}`);
      if (jobs.length) {
        const s = new Sim(net, t, 0, idRef);
        s.packs = packs;
        jobs.forEach((j) => j(s));
        s.runAll();
        t = Math.ceil(s.endTime);
      }
    }
  };

  for (const [name, spec] of Object.entries(sc.devices)) exec(name, spec.config, where);
  const v = variantOf(sc, variant);
  if (v?.config) for (const [name, text] of Object.entries(v.config)) exec(name, text, `${where}, wariant „${v.id}”`);
  return { net, warnings };
}

export function buildScenario(id: string, variant?: string): Network {
  const { net, warnings } = buildScenarioChecked(id, variant);
  for (const w of warnings) console.warn(`[symulator] ${w}`);
  return net;
}

/**
 * Scenariusze widoczne na pasku: bazowe + wskazane w `extra` (oraz `current`, jeśli strona otwiera ukryty scenariusz).
 * Kolejność zawsze jak w SCENARIOS.
 */
export function visibleScenarios(extra: readonly string[], current?: string): Scenario[] {
  const want = new Set([...extra, ...(current ? [current] : [])]);
  return SCENARIOS.filter((s) => s.base || want.has(s.id));
}
