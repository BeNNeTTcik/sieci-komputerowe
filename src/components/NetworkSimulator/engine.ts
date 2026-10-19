// SPDX-License-Identifier: MIT
// Dyskretny silnik symulacji. Jeden „krok” czasu to przejście ramki przez jedno łącze
// (w obliczeniach czasu – NTP, ping – krok liczymy jako 1 ms).
// Silnik liczy cały przebieg od razu, a interfejs odtwarza go jako animację.

import {
  BCAST_MAC,
  DEFAULT_TTL,
  Device,
  DhcpPool,
  DnsRecord,
  Iface,
  Network,
  PROTO_LABEL,
  Protocol,
  RecordType,
  addressesOf,
  broadcastOf,
  clone,
  fam,
  getDev,
  getIface,
  globals6,
  hasIp,
  inPrefix,
  inSubnet,
  intToIp,
  ipToInt,
  isIp,
  linkAt,
  linkLocalOf,
  lookupRoute,
  maskToPrefix,
  networkOf,
  peerOf,
  routingTable,
  sameIp,
} from './model';
import { ALL_NODES, ALL_ROUTERS, isLinkLocal6, isMcastMac, isMulticast6, mcastMac, net6, norm6, solicitedNode, withIid } from './ipv6';
import { serverListener } from './apps';
import { ALL_PACKS, PackId, PackSet } from './packs';

// ---------- jednostki danych (PDU) ----------

export interface ArpPdu {
  op: 'request' | 'reply';
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
}
export interface IcmpPdu {
  type: number;
  code: number;
  id: number;
  seq: number;
  orig?: { src: string; dst: string; id: number; seq: number };
  /** NDP */
  target?: string;
  lladdr?: string;
  prefixes?: { prefix: string; len: number }[];
  router?: boolean;
  solicited?: boolean;
}
export type DhcpMsg = 'DISCOVER' | 'OFFER' | 'REQUEST' | 'ACK' | 'NAK';
export interface DhcpPdu {
  msg: DhcpMsg;
  xid: number;
  chaddr: string;
  ciaddr: string;
  yiaddr: string;
  siaddr: string;
  giaddr: string;
  requested?: string;
  mask?: string;
  router?: string;
  dns?: string;
  lease?: number;
}
export interface DnsPdu {
  id: number;
  qr: 'query' | 'response';
  name: string;
  qtype: RecordType;
  answers: DnsRecord[];
  rcode: 'NOERROR' | 'NXDOMAIN';
}
export interface NtpPdu {
  mode: 3 | 4;
  stratum: number;
  t1: number;
  t2?: number;
  t3?: number;
  ref?: string;
}
export interface UdpPdu {
  srcPort: number;
  dstPort: number;
  dhcp?: DhcpPdu;
  dns?: DnsPdu;
  ntp?: NtpPdu;
}
export interface AppData {
  proto: Protocol;
  text: string;
  len: number;
  /** dane zaszyfrowane (TLS) – obserwator widzi tylko długość */
  enc?: boolean;
  /** opis rekordu TLS */
  tls?: string;
}
export interface TcpPdu {
  srcPort: number;
  dstPort: number;
  flags: string[];
  seq: number;
  ack: number;
  len: number;
  app?: AppData;
}
export interface IpPacket {
  v: 4 | 6;
  src: string;
  dst: string;
  ttl: number;
  id: number;
  proto: 'ICMP' | 'UDP' | 'TCP';
  icmp?: IcmpPdu;
  udp?: UdpPdu;
  tcp?: TcpPdu;
}
export interface Frame {
  src: string;
  dst: string;
  etherType: 'ARP' | 'IPv4' | 'IPv6';
  arp?: ArpPdu;
  ip?: IpPacket;
}

export interface SimEvent {
  id: number;
  run: number;
  t: number;
  kind: 'hop' | 'drop';
  from: string;
  fromIface: string;
  to: string;
  toIface: string;
  linkId: string | null;
  frame: Frame;
  protocol: Protocol;
  summary: string;
  why: string[];
  notes: string[];
  dropped: boolean;
}

export interface OutputLine {
  t: number;
  dev: string;
  text: string;
  kind: 'cmd' | 'out' | 'hint' | 'err';
}

// ---------- stałe i nazwy ----------

const inPrefixNet = (addr: string, prefix = 64) => net6(addr, prefix);

export const IPP_PORT = 631;
export const FTP_PASV_MIN = 50000;
export const FTP_PASV_MAX = 50999;
export const EPOCH = Date.UTC(2026, 9, 19, 8, 0, 0);

const T = {
  echoReq: { 4: 8, 6: 128 },
  echoRep: { 4: 0, 6: 129 },
  unreach: { 4: 3, 6: 1 },
  timex: { 4: 11, 6: 3 },
} as const;

const ICMP4: Record<number, string> = { 0: 'Echo Reply', 3: 'Destination Unreachable', 8: 'Echo Request', 11: 'Time Exceeded' };
const ICMP6: Record<number, string> = {
  1: 'Destination Unreachable',
  3: 'Time Exceeded',
  128: 'Echo Request',
  129: 'Echo Reply',
  133: 'Router Solicitation',
  134: 'Router Advertisement',
  135: 'Neighbor Solicitation',
  136: 'Neighbor Advertisement',
};
export const icmpName = (v: 4 | 6, type: number) => (v === 6 ? ICMP6 : ICMP4)[type] ?? `typ ${type}`;
const isNdp = (p: IpPacket) => p.v === 6 && !!p.icmp && p.icmp.type >= 133 && p.icmp.type <= 137;

export function portProto(port: number): Protocol | null {
  if (port === 80) return 'HTTP';
  if (port === 443) return 'HTTPS';
  if (port === 21 || (port >= FTP_PASV_MIN && port <= FTP_PASV_MAX)) return 'FTP';
  if (port === 25 || port === 110) return 'EMAIL';
  if (port === IPP_PORT) return 'IPP';
  return null;
}

export function protocolOf(f: Frame): Protocol {
  if (f.etherType === 'ARP') return 'ARP';
  const p = f.ip!;
  if (p.icmp) return isNdp(p) ? 'NDP' : 'ICMP';
  if (p.udp) {
    if (p.udp.dhcp) return 'DHCP';
    if (p.udp.dns) return 'DNS';
    if (p.udp.ntp) return 'NTP';
    return 'TCP';
  }
  if (p.tcp) return p.tcp.app?.proto ?? portProto(p.tcp.dstPort) ?? portProto(p.tcp.srcPort) ?? 'TCP';
  return 'TCP';
}

export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(d.getUTCMilliseconds(), 3)}`;
}

export function summarize(f: Frame): string {
  if (f.arp) {
    return f.arp.op === 'request' ? `Kto ma ${f.arp.targetIp}? (pyta ${f.arp.senderIp})` : `${f.arp.senderIp} to ${f.arp.senderMac}`;
  }
  const p = f.ip!;
  if (p.icmp) {
    const ic = p.icmp;
    if (p.v === 6) {
      if (ic.type === 135) return `NS: kto ma ${ic.target}?`;
      if (ic.type === 136) return `NA: ${ic.target} to ${ic.lladdr}`;
      if (ic.type === 133) return 'RS: szukam routera';
      if (ic.type === 134) return `RA: prefiks ${ic.prefixes?.map((x) => `${x.prefix}/${x.len}`).join(', ') || '(brak)'}`;
    }
    const n = icmpName(p.v, ic.type);
    const echo = ic.type === T.echoReq[p.v] || ic.type === T.echoRep[p.v];
    return `${p.v === 6 ? 'ICMPv6 ' : ''}${n}${echo ? ` seq=${ic.seq}` : ''} (${p.src} → ${p.dst})`;
  }
  if (p.udp?.dhcp) {
    const d = p.udp.dhcp;
    const addr = d.yiaddr !== '0.0.0.0' ? d.yiaddr : d.requested;
    return `DHCP ${d.msg}${addr ? ` – ${addr}` : ''}${d.giaddr && d.giaddr !== '0.0.0.0' ? ' (przez relay)' : ''}`;
  }
  if (p.udp?.dns) {
    const q = p.udp.dns;
    if (q.qr === 'query') return `DNS: pytanie ${q.qtype} ${q.name}`;
    return q.rcode === 'NXDOMAIN' ? `DNS: ${q.name} – nie istnieje` : `DNS: ${q.name} → ${q.answers.map((a) => a.value).join(', ') || 'brak rekordu'}`;
  }
  if (p.udp?.ntp) {
    const n = p.udp.ntp;
    return n.mode === 3 ? 'NTP: prośba o czas' : `NTP: czas serwera ${fmtClock(n.t3 ?? 0).slice(11)}`;
  }
  if (p.tcp) {
    const t = p.tcp;
    const fl = `[${t.flags.join(', ')}]`;
    if (t.app) {
      if (t.app.enc) return `${fl} 🔒 TLS ${t.app.tls ?? 'Application Data'} (${t.app.len} B)`;
      const head = t.app.tls ? `TLS ${t.app.tls}` : t.app.text.split('\n')[0];
      return `${fl} ${head}`;
    }
    return `TCP ${fl} ${t.srcPort} → ${t.dstPort}`;
  }
  return p.v === 6 ? 'IPv6' : 'IPv4';
}

// ---------- silnik ----------

const ARP_TIMEOUT = 24;
const PING_TIMEOUT = 40;
const DHCP_TIMEOUT = 50;
const DNS_TIMEOUT = 40;
const TCP_TIMEOUT = 60;
const TRACE_MAX_HOPS = 8;

let ipId = 1;
let icmpId = 1;
let connId = 1;

interface PingJob {
  kind: 'ping' | 'trace';
  dev: string;
  dst: string;
  v: 4 | 6;
  count: number;
  sent: number;
  ok: number;
  id: number;
  seq: number;
  sentAt: number;
  waiting: boolean;
  hop: number;
  done: boolean;
}

export interface ConnHandlers {
  proto: Protocol;
  open?(c: Conn): void;
  data?(c: Conn, a: AppData, ev: SimEvent): void;
  closed?(c: Conn): void;
  fail?(c: Conn, why: string): void;
}

export interface Conn {
  id: number;
  dev: string;
  role: 'client' | 'server';
  local: number;
  lip: string;
  remote: string;
  rport: number;
  state: 'SYN_SENT' | 'SYN_RCVD' | 'EST' | 'FIN_WAIT' | 'LAST_ACK' | 'CLOSED';
  seq: number;
  ack: number;
  proto: Protocol;
  h: ConnHandlers;
  ctx: Record<string, unknown>;
  sent: boolean;
}

interface Pending {
  p: IpPacket;
  iface: string;
  why: string[];
}

type RouteResult =
  | { ok: true; iface: string; nextHop: string; mcast?: boolean; broadcast?: boolean; notes: string[] }
  | { ok: false; error: string };


export class Sim {
  t: number;
  readonly start: number;
  events: SimEvent[] = [];
  outputs: OutputLine[] = [];
  private q: { t: number; s: number; fn: () => void }[] = [];
  private seqNo = 0;
  private pending = new Map<string, Pending[]>();
  private jobs = new Map<number, PingJob>();
  private dhcpClients = new Map<string, { xid: number; bound: boolean; offered: boolean }>();
  private dnsQ = new Map<number, { dev: string; name: string; type: RecordType; cb: (v: string | null, err?: string) => void; done: boolean }>();
  private ntpQ = new Map<string, { t1: number; done: boolean }>();
  private rsWait = new Map<string, boolean>();
  conns: Conn[] = [];
  /** włączone pakiety protokołów */
  packs: PackSet = ALL_PACKS;
  private passive = new Map<string, ConnHandlers>();

  constructor(
    public net: Network,
    start: number,
    public run: number,
    private idRef: { current: number },
  ) {
    this.t = start;
    this.start = start;
  }

  // ----- harmonogram -----

  at(dt: number, fn: () => void) {
    this.q.push({ t: this.t + dt, s: this.seqNo++, fn });
  }

  runAll(maxSteps = 20000) {
    let n = 0;
    while (this.q.length && n++ < maxSteps) {
      let bi = 0;
      for (let i = 1; i < this.q.length; i++) {
        const a = this.q[i];
        const b = this.q[bi];
        if (a.t < b.t || (a.t === b.t && a.s < b.s)) bi = i;
      }
      const it = this.q.splice(bi, 1)[0];
      if (it.t - this.start > 4000) break;
      if (it.t > this.t) this.t = it.t;
      it.fn();
    }
  }

  get endTime(): number {
    let m = this.start;
    for (const e of this.events) m = Math.max(m, e.t + (e.kind === 'hop' ? (e.dropped ? 1.8 : 1) : 1));
    for (const o of this.outputs) m = Math.max(m, o.t);
    return m;
  }

  out(dev: string, text: string, kind: OutputLine['kind'] = 'out') {
    this.outputs.push({ t: this.t, dev, text, kind });
  }

  has(id: PackId) {
    return this.packs[id];
  }

  dev(id: string) {
    return getDev(this.net, id);
  }

  clockOf(d: Device) {
    return EPOCH + this.t + d.clock;
  }

  // ----- warstwa 2 -----

  private mk(kind: SimEvent['kind'], from: Device, fromIface: string, to: Device, toIface: string, linkId: string | null, frame: Frame, why: string[]): SimEvent {
    const ev: SimEvent = {
      id: this.idRef.current++,
      run: this.run,
      t: this.t,
      kind,
      from: from.id,
      fromIface,
      to: to.id,
      toIface,
      linkId,
      frame: clone(frame),
      protocol: protocolOf(frame),
      summary: summarize(frame),
      why: [...why],
      notes: [],
      dropped: false,
    };
    this.events.push(ev);
    return ev;
  }

  private dropAt(d: Device, ifName: string, frame: Frame, why: string[], reason: string) {
    const ev = this.mk('drop', d, ifName, d, ifName, null, frame, why);
    ev.notes.push(reason);
    ev.dropped = true;
  }

  private drop(ev: SimEvent, reason: string) {
    ev.notes.push(reason);
    ev.dropped = true;
  }

  transmit(d: Device, ifName: string, frame: Frame, why: string[] = []) {
    const ifc = getIface(d, ifName)!;
    if (!ifc.up) return this.dropAt(d, ifName, frame, why, `Interfejs ${ifName} jest wyłączony – ramka nie może zostać wysłana.`);
    const peer = peerOf(this.net, d.id, ifName);
    if (!peer) return this.dropAt(d, ifName, frame, why, `Do interfejsu ${ifName} nie podłączono kabla.`);
    const pd = getDev(this.net, peer.dev)!;
    const pi = getIface(pd, peer.iface)!;
    if (!pi.up) return this.dropAt(d, ifName, frame, why, `Brak łącza: interfejs ${pi.name} na ${pd.name} jest wyłączony.`);
    const link = linkAt(this.net, d.id, ifName)!;
    const ev = this.mk('hop', d, ifName, pd, pi.name, link.id, frame, why);
    const copy = clone(frame);
    this.at(1, () => this.receive(pd, pi.name, copy, ev));
  }

  /** Czy karta sieciowa przyjmuje ramkę wysłaną na ten adres multicast? */
  private listens(d: Device, ifc: Iface, mac: string) {
    if (mac === mcastMac(ALL_NODES)) return true;
    if (d.type === 'router' && mac === mcastMac(ALL_ROUTERS)) return true;
    return ifc.ip6.some((a) => mcastMac(solicitedNode(a.addr)) === mac);
  }

  private receive(d: Device, ifName: string, f: Frame, ev: SimEvent) {
    if (!getDev(this.net, d.id)) return;
    if (d.type === 'switch') return this.switchRx(d, ifName, f, ev);
    const ifc = getIface(d, ifName)!;
    if ((f.arp || f.ip?.v === 4) && !this.has('ipv4')) return this.drop(ev, 'Stos IPv4 jest wyłączony (pakiet IPv4 nieaktywny w tym projekcie) – ramka ignorowana.');
    if (f.ip?.v === 6 && !this.has('ipv6')) return this.drop(ev, 'Stos IPv6 jest wyłączony (pakiet IPv6 nieaktywny w tym projekcie) – ramka ignorowana.');
    const mc = isMcastMac(f.dst);
    if (f.dst !== ifc.mac && f.dst !== BCAST_MAC && !(mc && this.listens(d, ifc, f.dst))) {
      return this.drop(
        ev,
        mc
          ? `Ramka multicast ${f.dst} – karta sieciowa nie należy do tej grupy, więc odrzuca ją sprzętowo (system nawet jej nie widzi).`
          : `Docelowy MAC ${f.dst} nie jest moim adresem (${ifc.mac}) – karta sieciowa odrzuca ramkę.`,
      );
    }
    ev.notes.push(
      f.dst === BCAST_MAC
        ? 'Ramka rozgłoszeniowa (FF:FF:FF:FF:FF:FF) – odbiera ją każde urządzenie w sieci lokalnej.'
        : mc
          ? `Ramka multicast ${f.dst} – należę do tej grupy, więc ją przyjmuję.`
          : 'Docelowy MAC zgadza się z moim – przyjmuję ramkę i zaglądam do środka.',
    );
    if (f.arp) return this.arpRx(d, ifc, f.arp, ev);
    if (f.ip) {
      if (f.ip.v === 6 && isNdp(f.ip)) return this.ndpRx(d, ifc, f.ip, ev);
      if (f.ip.proto === 'UDP' && f.ip.udp?.dstPort === 68 && f.ip.udp.dhcp && d.type !== 'router') return this.dhcpClientRx(d, ifc, f.ip.udp.dhcp, ev);
      return d.type === 'router' ? this.routerIpRx(d, ifc, f.ip, ev) : this.hostIpRx(d, ifc, f.ip, ev);
    }
  }

  /** Przełącznik uczący się (IEEE 802.1D) z VLAN-ami portów dostępowych (IEEE 802.1Q). */
  private switchRx(sw: Device, port: string, f: Frame, ev: SimEvent) {
    const inP = getIface(sw, port)!;
    const vlan = inP.vlan;
    const known = sw.macTable.find((m) => m.mac === f.src && m.vlan === vlan);
    if (!known) {
      sw.macTable.push({ mac: f.src, port, vlan });
      ev.notes.push(`Uczenie się: zapisuję w tablicy MAC ${f.src} → ${port} (VLAN ${vlan}).`);
    } else if (known.port !== port) {
      known.port = port;
      ev.notes.push(`Aktualizacja tablicy MAC: ${f.src} jest teraz za portem ${port}.`);
    } else {
      ev.notes.push(`Adres źródłowy ${f.src} jest już w tablicy MAC (${port}).`);
    }
    const flood = (reason: string) => {
      const outs = sw.ifaces.filter((i) => i.name !== port && i.vlan === vlan && i.up && peerOf(this.net, sw.id, i.name));
      ev.notes.push(
        `${reason} → zalewanie: kopia ramki na ${outs.length ? outs.map((o) => o.name).join(', ') : 'żaden port'} (tylko porty VLAN ${vlan}, bez portu wejściowego).`,
      );
      if (!outs.length) ev.dropped = true;
      for (const o of outs) this.transmit(sw, o.name, f, [`Kopia ramki zalewanej przez ${sw.name} w VLAN ${vlan}.`]);
    };
    if (f.dst === BCAST_MAC) return flood('Adres docelowy to broadcast');
    if (isMcastMac(f.dst)) return flood(`Adres docelowy ${f.dst} to multicast IPv6 – przełącznik bez MLD snooping traktuje go jak broadcast`);
    const dst = sw.macTable.find((m) => m.mac === f.dst && m.vlan === vlan);
    if (!dst) return flood(`Adresu ${f.dst} nie ma w tablicy MAC (nieznany unicast)`);
    if (dst.port === port) {
      ev.notes.push('Odbiorca jest za tym samym portem – filtrowanie, ramka nie jest przekazywana dalej.');
      ev.dropped = true;
      return;
    }
    ev.notes.push(`Tablica MAC: ${f.dst} → ${dst.port}. Przekazuję ramkę tylko na ten port.`);
    this.transmit(sw, dst.port, f, [`Przekazanie zgodnie z tablicą MAC przełącznika ${sw.name}.`]);
  }

  // ----- ARP (RFC 826) i NDP (RFC 4861) -----

  private learn(table: 'arp' | 'nd', d: Device, ip: string, mac: string, iface: string, ev: SimEvent) {
    if (!ip || ip === '0.0.0.0' || ip === '::' || !mac) return;
    const e = d[table].find((x) => sameIp(x.ip, ip));
    if (e) {
      e.mac = mac;
      e.iface = iface;
    } else d[table].push({ ip, mac, iface });
    ev.notes.push(`Zapisuję w tablicy ${table === 'arp' ? 'ARP' : 'sąsiadów (NDP)'}: ${ip} → ${mac}.`);
  }

  private flushPending(d: Device, ip: string, mac: string, ev: SimEvent, how: string) {
    const key = d.id + '|' + ip;
    const q = this.pending.get(key);
    if (!q?.length) return;
    this.pending.delete(key);
    ev.notes.push(`Adres rozwiązany – wysyłam ${q.length} pakiet(y), które czekały w kolejce.`);
    for (const it of q) {
      const oi = getIface(d, it.iface)!;
      this.transmit(d, oi.name, { src: oi.mac, dst: mac, etherType: it.p.v === 6 ? 'IPv6' : 'IPv4', ip: it.p }, [
        ...it.why,
        `${how} rozwiązał ${ip} → ${mac}; wysyłam oczekujący pakiet.`,
      ]);
    }
  }

  private arpRx(d: Device, ifc: Iface, a: ArpPdu, ev: SimEvent) {
    if (a.op === 'request') {
      if (!hasIp(ifc) || a.targetIp !== ifc.ip) {
        return this.drop(ev, `Zapytanie dotyczy ${a.targetIp}, a mój adres to ${ifc.ip || '(brak)'} – nie odpowiadam.`);
      }
      this.learn('arp', d, a.senderIp, a.senderMac, ifc.name, ev);
      ev.notes.push(`To pytanie o mój adres – odsyłam odpowiedź ARP bezpośrednio (unicast) do ${a.senderMac}.`);
      this.transmit(
        d,
        ifc.name,
        { src: ifc.mac, dst: a.senderMac, etherType: 'ARP', arp: { op: 'reply', senderMac: ifc.mac, senderIp: ifc.ip, targetMac: a.senderMac, targetIp: a.senderIp } },
        [`Odpowiedź na zapytanie ARP od ${a.senderIp}: „${ifc.ip} to ja, mój MAC to ${ifc.mac}”.`],
      );
      return;
    }
    this.learn('arp', d, a.senderIp, a.senderMac, ifc.name, ev);
    this.flushPending(d, a.senderIp, a.senderMac, ev, 'ARP');
  }

  private ownsIp6(d: Device, ip: string) {
    return d.ifaces.some((i) => i.ip6.some((a) => sameIp(a.addr, ip)));
  }

  private ndpRx(d: Device, ifc: Iface, p: IpPacket, ev: SimEvent) {
    const ic = p.icmp!;
    if (ic.type === 135) {
      if (!ic.target || !ifc.ip6.some((a) => sameIp(a.addr, ic.target!))) {
        return this.drop(ev, `Neighbor Solicitation dotyczy ${ic.target}, a to nie mój adres – nie odpowiadam.`);
      }
      if (ic.lladdr) this.learn('nd', d, p.src, ic.lladdr, ifc.name, ev);
      ev.notes.push(`Ktoś pyta o mój adres ${ic.target} – odsyłam Neighbor Advertisement bezpośrednio do pytającego.`);
      const dst = p.src === '::' ? ALL_NODES : p.src;
      this.transmit(
        d,
        ifc.name,
        {
          src: ifc.mac,
          dst: p.src === '::' ? mcastMac(ALL_NODES) : ic.lladdr ?? mcastMac(ALL_NODES),
          etherType: 'IPv6',
          ip: { v: 6, src: ic.target, dst, ttl: 255, id: ipId++, proto: 'ICMP', icmp: { type: 136, code: 0, id: 0, seq: 0, target: ic.target, lladdr: ifc.mac, solicited: true, router: d.type === 'router' } },
        },
        [`Neighbor Advertisement: „${ic.target} to ja, mój MAC to ${ifc.mac}” (flaga S – odpowiedź na pytanie${d.type === 'router' ? ', flaga R – jestem routerem' : ''}).`],
      );
      return;
    }
    if (ic.type === 136) {
      if (ic.target && ic.lladdr) {
        this.learn('nd', d, ic.target, ic.lladdr, ifc.name, ev);
        this.flushPending(d, ic.target, ic.lladdr, ev, 'NDP');
      }
      return;
    }
    if (ic.type === 133) {
      if (d.type !== 'router') return this.drop(ev, 'Router Solicitation jest skierowane do routerów – host je ignoruje.');
      const pref = globals6(ifc).filter((a) => a.prefix === 64);
      if (!pref.length) return this.drop(ev, `Interfejs ${ifc.name} nie ma globalnego prefiksu /64 – nie mam czego ogłosić.`);
      if (ic.lladdr) this.learn('nd', d, p.src, ic.lladdr, ifc.name, ev);
      ev.notes.push(`Host szuka routera – ogłaszam prefiks ${pref.map((a) => `${inPrefixNet(a.addr)}/64`).join(', ')} komunikatem Router Advertisement do wszystkich węzłów (ff02::1).`);
      this.sendRa(d, ifc);
      return;
    }
    if (ic.type === 134) {
      if (d.type === 'router') return this.drop(ev, 'Router nie konfiguruje się z ogłoszeń innych routerów.');
      if (!d.slaac) return this.drop(ev, 'Autokonfiguracja IPv6 jest wyłączona – ignoruję ogłoszenie routera.');
      if (ic.lladdr) this.learn('nd', d, p.src, ic.lladdr, ifc.name, ev);
      const lines: string[] = [];
      for (const pr of ic.prefixes ?? []) {
        if (pr.len !== 64) continue;
        const addr = withIid(pr.prefix, ifc.mac);
        ifc.ip6 = ifc.ip6.filter((a) => !(a.origin === 'auto' && inPrefix(a.addr, pr.prefix, 64)));
        ifc.ip6.push({ addr, prefix: 64, origin: 'auto' });
        lines.push(addr);
        ev.notes.push(`SLAAC: prefiks ${pr.prefix}/64 + identyfikator EUI-64 z mojego MAC (${ifc.mac}) = ${addr}.`);
      }
      d.gateway6 = p.src;
      ev.notes.push(`Brama domyślna IPv6 = adres link-local routera ${p.src}.`);
      this.rsWait.set(d.id, true);
      for (const a of lines) this.out(d.id, `IPv6: skonfigurowano adres ${a}/64 (SLAAC)`);
      this.out(d.id, `IPv6: brama domyślna ${p.src}`);
    }
  }

  private sendRa(d: Device, ifc: Iface) {
    const pref = globals6(ifc).filter((a) => a.prefix === 64);
    const ll = linkLocalOf(ifc);
    this.transmit(
      d,
      ifc.name,
      {
        src: ifc.mac,
        dst: mcastMac(ALL_NODES),
        etherType: 'IPv6',
        ip: {
          v: 6,
          src: ll,
          dst: ALL_NODES,
          ttl: 255,
          id: ipId++,
          proto: 'ICMP',
          icmp: { type: 134, code: 0, id: 0, seq: 0, lladdr: ifc.mac, router: true, prefixes: pref.map((a) => ({ prefix: inPrefixNet(a.addr), len: 64 })) },
        },
      },
      [`Router Advertisement z adresu link-local ${ll}: „w tej sieci obowiązuje prefiks ${pref.map((a) => `${inPrefixNet(a.addr)}/64`).join(', ')}, a ja mogę być bramą”.`],
    );
  }

  startAutoconf(d: Device) {
    const ifc = d.ifaces[0];
    d.slaac = true;
    const ll = linkLocalOf(ifc);
    this.rsWait.set(d.id, false);
    this.out(d.id, `IPv6: adres link-local ${ll} (fe80::/64 + EUI-64), wysyłam Router Solicitation`);
    this.transmit(
      d,
      ifc.name,
      {
        src: ifc.mac,
        dst: mcastMac(ALL_ROUTERS),
        etherType: 'IPv6',
        ip: { v: 6, src: ll, dst: ALL_ROUTERS, ttl: 255, id: ipId++, proto: 'ICMP', icmp: { type: 133, code: 0, id: 0, seq: 0, lladdr: ifc.mac } },
      },
      ['SLAAC krok 1: host ma tylko adres link-local, więc pyta wszystkie routery w sieci (ff02::2) o prefiks.'],
    );
    this.at(DHCP_TIMEOUT, () => {
      if (this.rsWait.get(d.id) === false) {
        this.out(d.id, 'IPv6: brak ogłoszenia routera', 'err');
        this.out(d.id, 'Czy router ma na tym interfejsie adres IPv6 z prefiksem /64 i jest włączony?', 'hint');
      }
    });
  }

  // ----- warstwa 3: routing -----

  private srcFor(d: Device, ifc: Iface, dst: string, v: 4 | 6): string {
    if (v === 4) return ifc.ip;
    if (isLinkLocal6(dst) || isMulticast6(dst)) return linkLocalOf(ifc);
    const g = globals6(ifc);
    return (g.find((a) => inPrefix(dst, a.addr, a.prefix)) ?? g[0])?.addr ?? linkLocalOf(ifc);
  }

  route(d: Device, dst: string): RouteResult {
    const v = fam(dst);
    if (!v) return { ok: false, error: `Niepoprawny adres docelowy ${dst}.` };
    if (d.type !== 'router') {
      const ifc = d.ifaces[0];
      if (!ifc.up) return { ok: false, error: 'Interfejs sieciowy jest wyłączony.' };
      if (v === 4) {
        if (dst === '255.255.255.255') return { ok: true, iface: ifc.name, nextHop: dst, broadcast: true, notes: ['Cel 255.255.255.255 – rozgłoszenie w sieci lokalnej.'] };
        if (!hasIp(ifc)) return { ok: false, error: 'Brak adresu IPv4 na interfejsie.' };
        const net = networkOf(ifc.ip, ifc.mask)!;
        const pfx = maskToPrefix(ifc.mask)!;
        if (inSubnet(dst, ifc.ip, ifc.mask)) return { ok: true, iface: ifc.name, nextHop: dst, notes: [`${dst} należy do mojej sieci ${net}/${pfx} – dostarczam bezpośrednio.`] };
        if (!isIp(d.gateway)) return { ok: false, error: `${dst} leży poza moją siecią ${net}/${pfx}, a brama domyślna nie jest ustawiona.` };
        if (!inSubnet(d.gateway, ifc.ip, ifc.mask)) return { ok: false, error: `Brama ${d.gateway} nie należy do mojej sieci ${net}/${pfx}.` };
        return { ok: true, iface: ifc.name, nextHop: d.gateway, notes: [`${dst} leży poza moją siecią ${net}/${pfx} – wysyłam pakiet do bramy domyślnej ${d.gateway}.`] };
      }
      if (isMulticast6(dst)) return { ok: true, iface: ifc.name, nextHop: dst, mcast: true, notes: [`Cel ${dst} to adres multicast.`] };
      if (isLinkLocal6(dst)) return { ok: true, iface: ifc.name, nextHop: dst, notes: [`${dst} to adres link-local – jest w tym samym łączu.`] };
      const on = globals6(ifc).find((a) => inPrefix(dst, a.addr, a.prefix));
      if (on) return { ok: true, iface: ifc.name, nextHop: dst, notes: [`${dst} należy do mojego prefiksu ${inPrefixNet(on.addr, on.prefix)}/${on.prefix} – dostarczam bezpośrednio.`] };
      if (!d.gateway6) {
        return { ok: false, error: `${dst} jest poza moimi prefiksami IPv6, a nie znam bramy IPv6 (uruchom „ipv6 autoconf” albo „route add default via <adres>”).` };
      }
      return { ok: true, iface: ifc.name, nextHop: d.gateway6, notes: [`${dst} jest poza moimi prefiksami – wysyłam do bramy IPv6 ${d.gateway6}.`] };
    }
    if (v === 6 && (isLinkLocal6(dst) || isMulticast6(dst))) return { ok: false, error: `${dst} to adres lokalny dla łącza – router go nie przekazuje.` };
    const e = lookupRoute(routingTable(this.net, d), dst);
    if (!e) return { ok: false, error: `Brak trasy do ${dst} w tablicy routingu.` };
    const nh = e.kind === 'connected' ? dst : e.nextHop;
    const desc =
      e.kind === 'connected'
        ? `sieć bezpośrednio podłączona ${e.network}/${e.prefix}`
        : e.kind === 'default'
          ? `trasa domyślna ${v === 6 ? '::/0' : '0.0.0.0/0'} przez ${e.nextHop}`
          : `trasa statyczna ${e.network}/${e.prefix} przez ${e.nextHop}`;
    return {
      ok: true,
      iface: e.iface,
      nextHop: nh,
      notes: [`Tablica routingu (najdłuższe dopasowanie prefiksu): ${dst} → ${desc}; wyjście ${e.iface}${e.kind === 'connected' ? '' : `, następny skok ${nh}`}.`],
    };
  }

  /** Zwraca komunikat błędu albo null. */
  sendIp(d: Device, p: IpPacket, why: string[] = []): string | null {
    const off = p.v === 4 ? !this.has('ipv4') : !this.has('ipv6');
    const r: RouteResult = off ? { ok: false, error: `Pakiet IPv${p.v} jest wyłączony w tym projekcie.` } : this.route(d, p.dst);
    if (!r.ok) {
      const i0 = d.ifaces[0];
      this.dropAt(d, i0.name, { src: i0.mac, dst: '??:??:??:??:??:??', etherType: p.v === 6 ? 'IPv6' : 'IPv4', ip: p }, why, r.error);
      return r.error;
    }
    const ifc = getIface(d, r.iface)!;
    if (!p.src) p.src = this.srcFor(d, ifc, p.dst, p.v);
    const w = [...why, ...r.notes];
    if (r.broadcast) {
      this.transmit(d, ifc.name, { src: ifc.mac, dst: BCAST_MAC, etherType: 'IPv4', ip: p }, w);
      return null;
    }
    if (r.mcast) {
      this.transmit(d, ifc.name, { src: ifc.mac, dst: mcastMac(p.dst), etherType: 'IPv6', ip: p }, w);
      return null;
    }
    this.toNextHop(d, ifc, r.nextHop, p, w);
    return null;
  }

  private toNextHop(d: Device, ifc: Iface, nh: string, p: IpPacket, why: string[]) {
    const v6 = p.v === 6;
    const table = v6 ? d.nd : d.arp;
    const e = table.find((a) => sameIp(a.ip, nh));
    if (e) {
      this.transmit(d, ifc.name, { src: ifc.mac, dst: e.mac, etherType: v6 ? 'IPv6' : 'IPv4', ip: p }, [
        ...why,
        `MAC następnego skoku ${nh} jest w tablicy ${v6 ? 'sąsiadów' : 'ARP'}: ${e.mac}.`,
      ]);
      return;
    }
    const key = d.id + '|' + nh;
    const q = this.pending.get(key) ?? [];
    q.push({ p, iface: ifc.name, why });
    this.pending.set(key, q);
    if (q.length > 1) return;
    if (v6) {
      const sn = solicitedNode(nh);
      this.transmit(
        d,
        ifc.name,
        {
          src: ifc.mac,
          dst: mcastMac(sn),
          etherType: 'IPv6',
          ip: { v: 6, src: this.srcFor(d, ifc, nh, 6), dst: sn, ttl: 255, id: ipId++, proto: 'ICMP', icmp: { type: 135, code: 0, id: 0, seq: 0, target: nh, lladdr: ifc.mac } },
        },
        [
          ...why,
          `Nie znam MAC adresu ${nh} (brak w tablicy sąsiadów). Pakiet czeka, a ja wysyłam Neighbor Solicitation na adres multicast węzła żądanego ${sn} – w IPv6 nie ma broadcastu, więc odbierze go praktycznie tylko właściciel adresu.`,
        ],
      );
    } else {
      this.transmit(
        d,
        ifc.name,
        { src: ifc.mac, dst: BCAST_MAC, etherType: 'ARP', arp: { op: 'request', senderMac: ifc.mac, senderIp: ifc.ip, targetMac: '00:00:00:00:00:00', targetIp: nh } },
        [...why, `Nie znam MAC adresu ${nh} (brak w tablicy ARP). Pakiet IP czeka, a ja rozgłaszam zapytanie ARP.`],
      );
    }
    this.at(ARP_TIMEOUT, () => {
      const left = this.pending.get(key);
      if (!left?.length) return;
      this.pending.delete(key);
      for (const it of left) {
        const oi = getIface(d, it.iface)!;
        this.dropAt(d, oi.name, { src: oi.mac, dst: '??:??:??:??:??:??', etherType: v6 ? 'IPv6' : 'IPv4', ip: it.p }, it.why,
          `Nikt nie odpowiedział na ${v6 ? 'Neighbor Solicitation' : 'zapytanie ARP'} o ${nh} – pakiet odrzucony.`);
      }
    });
  }

  private hostIpRx(d: Device, ifc: Iface, p: IpPacket, ev: SimEvent) {
    const mine = p.v === 4 ? hasIp(ifc) && p.dst === ifc.ip : ifc.ip6.some((a) => sameIp(a.addr, p.dst));
    const bcast =
      p.v === 4
        ? p.dst === '255.255.255.255' || (hasIp(ifc) && p.dst === broadcastOf(ifc.ip, ifc.mask))
        : sameIp(p.dst, ALL_NODES);
    if (!mine && !bcast) {
      return this.drop(ev, `Pakiet jest adresowany do ${p.dst}, a to nie mój adres. Host nie przekazuje cudzych pakietów (RFC 1122).`);
    }
    if (p.proto === 'UDP') return this.udpRx(d, ifc, p, ev);
    if (p.proto === 'ICMP') return this.icmpRx(d, p, ev);
    if (p.proto === 'TCP') return this.tcpRx(d, p, ev);
  }

  private routerIpRx(d: Device, ifc: Iface, p: IpPacket, ev: SimEvent) {
    if (p.proto === 'UDP' && p.udp?.dhcp && p.udp.dstPort === 67) return this.routerDhcp(d, ifc, p, ev);
    const own = p.v === 4 ? d.ifaces.some((i) => hasIp(i) && i.ip === p.dst) : this.ownsIp6(d, p.dst) || sameIp(p.dst, ALL_NODES);
    if (own) {
      ev.notes.push(`Pakiet jest adresowany do mnie (${p.dst}).`);
      if (p.proto === 'ICMP') return this.icmpRx(d, p, ev);
      if (p.proto === 'TCP') return this.tcpRx(d, p, ev);
      return this.udpRx(d, ifc, p, ev);
    }
    if (p.v === 4 && (p.dst === '255.255.255.255' || (hasIp(ifc) && p.dst === broadcastOf(ifc.ip, ifc.mask)))) {
      return this.drop(ev, 'Pakiet rozgłoszeniowy – router nie przekazuje broadcastów do innych sieci. Tu kończy się domena rozgłoszeniowa.');
    }
    if (p.v === 6 && (isLinkLocal6(p.dst) || isMulticast6(p.dst))) {
      return this.drop(ev, `Adres ${p.dst} jest ważny tylko w obrębie łącza – router go nie przekazuje.`);
    }
    const field = p.v === 6 ? 'Hop Limit' : 'TTL';
    const old = p.ttl;
    p.ttl -= 1;
    if (p.ttl <= 0) {
      this.drop(ev, `${field} ${old} → ${p.ttl}. Spadł do zera, więc pakiet jest odrzucany, a nadawca ${p.src} dostaje ${p.v === 6 ? 'ICMPv6' : 'ICMP'} Time Exceeded.`);
      this.icmpError(d, ifc, p, 'timex');
      return;
    }
    ev.notes.push(`Zmniejszam ${field}: ${old} → ${p.ttl}.`);
    const r = this.route(d, p.dst);
    if (!r.ok) {
      this.drop(ev, `${r.error} Pakiet odrzucony – odsyłam Destination Unreachable do ${p.src}.`);
      this.icmpError(d, ifc, p, 'unreach');
      return;
    }
    ev.notes.push(...r.notes);
    const out = getIface(d, r.iface)!;
    this.toNextHop(d, out, r.nextHop, p, [
      `Router ${d.name} przekazuje pakiet ${p.src} → ${p.dst}. Buduje NOWĄ ramkę: MAC źródłowy = ${out.mac} (${out.name}); adresy IP się nie zmieniają.`,
    ]);
  }

  private icmpError(d: Device, inIfc: Iface, p: IpPacket, kind: 'unreach' | 'timex') {
    if (p.icmp && (p.icmp.type === T.unreach[p.v] || p.icmp.type === T.timex[p.v])) return; // nie odpowiadamy błędem na błąd
    if (p.src === '0.0.0.0' || p.src === '::') return;
    const src = this.srcFor(d, inIfc, p.src, p.v);
    if (!src) return;
    const err: IpPacket = {
      v: p.v,
      src,
      dst: p.src,
      ttl: DEFAULT_TTL,
      id: ipId++,
      proto: 'ICMP',
      icmp: { type: T[kind][p.v], code: 0, id: 0, seq: 0, orig: { src: p.src, dst: p.dst, id: p.icmp?.id ?? -1, seq: p.icmp?.seq ?? -1 } },
    };
    this.sendIp(d, err, [kind === 'timex' ? `Raport: ${p.v === 6 ? 'Hop Limit' : 'TTL'} pakietu ${p.src} → ${p.dst} wygasł na routerze ${d.name}.` : `Raport: brak trasy do ${p.dst}.`]);
  }

  // ----- ICMP: ping i trace -----

  private icmpRx(d: Device, p: IpPacket, ev: SimEvent) {
    const ic = p.icmp!;
    if (ic.type === T.echoReq[p.v]) {
      ev.notes.push(`Echo Request od ${p.src} – odpowiadam komunikatem Echo Reply.`);
      const err = this.sendIp(d, { v: p.v, src: p.dst, dst: p.src, ttl: DEFAULT_TTL, id: ipId++, proto: 'ICMP', icmp: { type: T.echoRep[p.v], code: 0, id: ic.id, seq: ic.seq } }, [
        `Odpowiedź na ping od ${p.src} (Echo Reply z tym samym id i seq).`,
      ]);
      if (err) ev.notes.push(`Nie mogę odesłać odpowiedzi: ${err}`);
      return;
    }
    const isRep = ic.type === T.echoRep[p.v];
    const jobId = isRep ? ic.id : ic.orig?.id;
    const seq = isRep ? ic.seq : ic.orig?.seq;
    const job = jobId !== undefined ? this.jobs.get(jobId) : undefined;
    if (!job || job.dev !== d.id) {
      ev.notes.push('Komunikat ICMP nie pasuje do żadnego polecenia, które na niego czeka.');
      return;
    }
    if (!job.waiting || seq !== job.seq) {
      ev.notes.push('Spóźniona odpowiedź – polecenie już na nią nie czeka.');
      return;
    }
    this.jobReply(d, job, p, ev);
  }

  private jobReply(d: Device, job: PingJob, p: IpPacket, ev: SimEvent) {
    const ic = p.icmp!;
    const rtt = Math.max(1, this.t - job.sentAt);
    const v = p.v;
    job.waiting = false;
    if (job.kind === 'ping') {
      if (ic.type === T.echoRep[v]) {
        job.ok++;
        ev.notes.push(`Echo Reply dotarło – ping nr ${job.seq} udany (czas: ${rtt} kroków).`);
        this.out(d.id, `odpowiedź od ${p.src}: seq=${ic.seq} ${v === 6 ? 'hlim' : 'ttl'}=${p.ttl} czas=${rtt}`);
      } else if (ic.type === T.unreach[v]) {
        ev.notes.push(`Router ${p.src} zgłasza brak trasy do celu.`);
        this.out(d.id, `od ${p.src}: cel nieosiągalny (brak trasy)`, 'err');
      } else if (ic.type === T.timex[v]) {
        ev.notes.push(`Router ${p.src} zgłasza wygaśnięcie TTL – możliwa pętla routingu.`);
        this.out(d.id, `od ${p.src}: TTL wygasł po drodze`, 'err');
      }
      this.at(2, () => this.nextProbe(job));
      return;
    }
    const hop = String(job.hop).padStart(2, ' ');
    if (ic.type === T.timex[v]) {
      ev.notes.push(`Skok ${job.hop}: router ${p.src} odesłał Time Exceeded – tak trace poznaje kolejne routery.`);
      this.out(d.id, `${hop}  ${p.src.padEnd(16)} czas=${rtt}`);
    } else if (ic.type === T.echoRep[v]) {
      ev.notes.push(`Skok ${job.hop}: odpowiedział sam cel – trasa ustalona.`);
      this.out(d.id, `${hop}  ${p.src.padEnd(16)} czas=${rtt}  ← cel`);
      this.out(d.id, 'Śledzenie zakończone.');
      job.done = true;
      return;
    } else {
      this.out(d.id, `${hop}  ${p.src.padEnd(16)} cel nieosiągalny`, 'err');
      job.done = true;
      return;
    }
    this.at(2, () => this.nextProbe(job));
  }

  /** Ping lub trace do adresu albo nazwy (nazwę rozwiązuje DNS). */
  startPing(d: Device, host: string, count = 4, want: 4 | 6 = 4, kind: 'ping' | 'trace' = 'ping') {
    this.resolveHost(d, host, want, (ip) => {
      if (!ip) return;
      const v = fam(ip) as 4 | 6;
      const job: PingJob = { kind, dev: d.id, dst: v === 6 ? norm6(ip) : ip, v, count, sent: 0, ok: 0, id: icmpId++, seq: 0, sentAt: 0, waiting: false, hop: 0, done: false };
      this.jobs.set(job.id, job);
      this.out(d.id, kind === 'ping' ? `PING ${host}${host !== ip ? ` (${ip})` : ''}: ${count} × ${v === 6 ? 'ICMPv6' : 'ICMP'} Echo Request` : `TRACE ${host}${host !== ip ? ` (${ip})` : ''} (maks. ${TRACE_MAX_HOPS} skoków)`);
      this.nextProbe(job);
    });
  }

  startTrace(d: Device, host: string, want: 4 | 6 = 4) {
    this.startPing(d, host, 0, want, 'trace');
  }

  private nextProbe(job: PingJob) {
    const d = getDev(this.net, job.dev);
    if (!d) return;
    if (job.kind === 'ping' && job.sent >= job.count) {
      const lost = job.sent - job.ok;
      this.out(d.id, `--- ${job.dst}: wysłano ${job.sent}, odebrano ${job.ok}, utracono ${Math.round((lost / job.sent) * 100)}% ---`);
      return;
    }
    if (job.kind === 'trace' && (job.done || job.hop >= TRACE_MAX_HOPS)) {
      if (!job.done) this.out(d.id, 'Osiągnięto limit skoków.');
      return;
    }
    job.seq++;
    job.sent++;
    if (job.kind === 'trace') job.hop++;
    const ttl = job.kind === 'trace' ? job.hop : DEFAULT_TTL;
    const p: IpPacket = { v: job.v, src: '', dst: job.dst, ttl, id: ipId++, proto: 'ICMP', icmp: { type: T.echoReq[job.v], code: 0, id: job.id, seq: job.seq } };
    job.sentAt = this.t;
    job.waiting = true;
    const why =
      job.kind === 'ping'
        ? [`Polecenie ping ${job.dst}: wysyłam Echo Request nr ${job.seq}.`]
        : [`trace: sonda z ${job.v === 6 ? 'Hop Limit' : 'TTL'}=${ttl}. Pakiet „wygaśnie” na ${ttl}. routerze po drodze, a ten odeśle Time Exceeded.`];
    const err = this.sendIp(d, p, why);
    if (err) {
      job.waiting = false;
      this.out(d.id, 'błąd wysyłania: pakiet nie opuścił urządzenia', 'err');
      this.out(d.id, err, 'hint');
      if (job.kind === 'trace') job.done = true;
      this.at(2, () => this.nextProbe(job));
      return;
    }
    const seq = job.seq;
    this.at(PING_TIMEOUT, () => {
      if (job.waiting && job.seq === seq) {
        job.waiting = false;
        this.out(d.id, job.kind === 'ping' ? `brak odpowiedzi: seq=${seq} (upłynął czas oczekiwania)` : `${String(job.hop).padStart(2, ' ')}  *                brak odpowiedzi`, 'err');
        this.nextProbe(job);
      }
    });
  }

  // ----- UDP: DHCP, DNS, NTP -----

  private udpRx(d: Device, ifc: Iface, p: IpPacket, ev: SimEvent) {
    const u = p.udp!;
    if (u.dhcp && u.dstPort === 67) {
      if (d.type === 'server' && d.services.dhcp && this.has('dhcp')) return this.dhcpServerRx(d, ifc, u.dhcp, ev);
      return this.drop(ev, 'Komunikat do serwera DHCP (UDP 67) – na tym urządzeniu nie działa serwer DHCP, ignoruję.');
    }
    if (u.dns) {
      if (u.dns.qr === 'query') {
        if (d.type === 'server' && d.services.dns && this.has('dns')) return this.dnsServe(d, p, ev);
        return this.drop(ev, 'Port UDP 53 jest zamknięty – nie działa tu serwer DNS.');
      }
      return this.dnsAnswer(d, u.dns, ev);
    }
    if (u.ntp) {
      if (u.ntp.mode === 3) {
        if (d.type === 'server' && d.services.ntp && this.has('ntp')) return this.ntpServe(d, p, ev);
        return this.drop(ev, 'Port UDP 123 jest zamknięty – nie działa tu serwer NTP.');
      }
      return this.ntpAnswer(d, p, ev);
    }
    this.drop(ev, `Brak usługi na porcie UDP ${u.dstPort}.`);
  }

  // DHCP (RFC 2131) – klient

  startDhcp(d: Device) {
    const ifc = d.ifaces[0];
    d.dhcp = true;
    ifc.ip = '';
    ifc.mask = '';
    d.gateway = '';
    d.arp = [];
    const xid = Math.floor(Math.random() * 0x7fffffff);
    this.dhcpClients.set(d.id, { xid, bound: false, offered: false });
    this.out(d.id, `DHCP: wysyłam DHCPDISCOVER (xid=0x${xid.toString(16)})`);
    this.transmit(
      d,
      ifc.name,
      {
        src: ifc.mac,
        dst: BCAST_MAC,
        etherType: 'IPv4',
        ip: {
          v: 4,
          src: '0.0.0.0',
          dst: '255.255.255.255',
          ttl: DEFAULT_TTL,
          id: ipId++,
          proto: 'UDP',
          udp: { srcPort: 68, dstPort: 67, dhcp: { msg: 'DISCOVER', xid, chaddr: ifc.mac, ciaddr: '0.0.0.0', yiaddr: '0.0.0.0', siaddr: '0.0.0.0', giaddr: '0.0.0.0' } },
        },
      },
      ['Host nie ma jeszcze adresu IP, więc szuka serwera DHCP rozgłoszeniem: IP źródłowe 0.0.0.0, docelowe 255.255.255.255.'],
    );
    this.at(DHCP_TIMEOUT, () => {
      const c = this.dhcpClients.get(d.id);
      if (c && c.xid === xid && !c.bound) {
        this.out(d.id, 'DHCP: brak odpowiedzi serwera', 'err');
        this.out(d.id, 'Czy w tej sieci działa serwer DHCP z pulą (albo router z przekaźnikiem DHCP)?', 'hint');
      }
    });
  }

  private dhcpClientRx(d: Device, ifc: Iface, m: DhcpPdu, ev: SimEvent) {
    const c = this.dhcpClients.get(d.id);
    if (m.chaddr !== ifc.mac || !c || c.xid !== m.xid) return this.drop(ev, 'Komunikat DHCP przeznaczony dla innego klienta – ignoruję.');
    if (m.msg === 'OFFER') {
      if (c.offered) return this.drop(ev, 'Przyjąłem już inną ofertę – tę ignoruję.');
      c.offered = true;
      ev.notes.push(`Oferta: adres ${m.yiaddr} od serwera ${m.siaddr}. Rozgłaszam DHCPREQUEST – tak wszystkie serwery dowiadują się, którą ofertę wybrałem.`);
      this.out(d.id, `DHCP: oferta ${m.yiaddr} od ${m.siaddr}, wysyłam DHCPREQUEST`);
      this.transmit(
        d,
        ifc.name,
        {
          src: ifc.mac,
          dst: BCAST_MAC,
          etherType: 'IPv4',
          ip: {
            v: 4,
            src: '0.0.0.0',
            dst: '255.255.255.255',
            ttl: DEFAULT_TTL,
            id: ipId++,
            proto: 'UDP',
            udp: { srcPort: 68, dstPort: 67, dhcp: { msg: 'REQUEST', xid: m.xid, chaddr: ifc.mac, ciaddr: '0.0.0.0', yiaddr: '0.0.0.0', siaddr: m.siaddr, giaddr: '0.0.0.0', requested: m.yiaddr } },
          },
        },
        [`Krok 3 (Request): proszę o adres ${m.yiaddr} od serwera ${m.siaddr}.`],
      );
      return;
    }
    if (m.msg === 'ACK') {
      ifc.ip = m.yiaddr;
      ifc.mask = m.mask ?? '';
      d.gateway = m.router ?? '';
      if (m.dns) d.dns = m.dns;
      c.bound = true;
      ev.notes.push(`DHCPACK – konfiguruję interfejs: IP ${m.yiaddr}, maska ${m.mask}, brama ${m.router || '(brak)'}, DNS ${m.dns || '(brak)'}.`);
      this.out(d.id, `DHCP: przydzielono ${m.yiaddr}/${maskToPrefix(m.mask ?? '') ?? '?'}, brama ${m.router || '-'}, DNS ${m.dns || '-'}, dzierżawa ${m.lease ?? 0} s`);
      return;
    }
    this.drop(ev, `Komunikat ${m.msg} – serwer odmówił.`);
  }

  // DHCP – serwer (router albo serwer z usługą DHCP) i przekaźnik (RFC 1542)

  private allocate(d: Device, pool: DhcpPool, mac: string): string | null {
    const lease = d.leases.find((l) => l.mac === mac && inSubnet(l.ip, pool.network, pool.mask));
    if (lease) return lease.ip;
    const a = ipToInt(pool.start);
    const b = ipToInt(pool.end);
    if (a === null || b === null) return null;
    const used = new Set<string>([...d.leases.map((l) => l.ip), pool.gateway]);
    for (const dev of this.net.devices) for (const i of dev.ifaces) if (i.ip) used.add(i.ip);
    for (let x = a; x <= b; x++) {
      const ip = intToIp(x);
      if (!used.has(ip)) return ip;
    }
    return null;
  }

  private routerDhcp(d: Device, ifc: Iface, p: IpPacket, ev: SimEvent) {
    const m = p.udp!.dhcp!;
    if (!this.has('dhcp')) return this.drop(ev, 'Pakiet DHCP jest wyłączony – router nie obsługuje DHCP.');
    const relayed = m.giaddr && m.giaddr !== '0.0.0.0';
    if ((m.msg === 'OFFER' || m.msg === 'ACK' || m.msg === 'NAK') && relayed) {
      const out = d.ifaces.find((i) => i.ip === m.giaddr);
      if (!out) return this.drop(ev, `Odpowiedź DHCP dla sieci ${m.giaddr}, która nie jest moja – odrzucam.`);
      ev.notes.push(`Przekaźnik DHCP: odpowiedź serwera dla klienta ${m.chaddr} przesyłam do sieci interfejsu ${out.name} (giaddr = ${m.giaddr}).`);
      this.transmit(
        d,
        out.name,
        { src: out.mac, dst: m.chaddr, etherType: 'IPv4', ip: { v: 4, src: out.ip, dst: m.yiaddr, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 67, dstPort: 68, dhcp: { ...m } } } },
        [`Relay oddaje klientowi DHCP${m.msg} od serwera ${m.siaddr}.`],
      );
      return;
    }
    if (ifc.relay && isIp(ifc.relay)) {
      if (!hasIp(ifc)) return this.drop(ev, `Interfejs ${ifc.name} nie ma adresu IP – przekaźnik nie ma czego wpisać w giaddr.`);
      const fwd: DhcpPdu = { ...m, giaddr: relayed ? m.giaddr : ifc.ip };
      ev.notes.push(
        `Przekaźnik DHCP na ${ifc.name}: broadcast nie przejdzie przez router, więc przesyłam DHCP${m.msg} unicastem do serwera ${ifc.relay}, wpisując giaddr = ${fwd.giaddr} – po tym adresie serwer pozna sieć klienta.`,
      );
      const err = this.sendIp(d, { v: 4, src: ifc.ip, dst: ifc.relay, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 67, dstPort: 67, dhcp: fwd } }, [
        `Relay: DHCP${m.msg} klienta ${m.chaddr} → serwer ${ifc.relay}.`,
      ]);
      if (err) ev.notes.push(`Nie można przekazać: ${err}`);
      return;
    }
    if (d.pools.length) return this.dhcpServerRx(d, ifc, m, ev);
    return this.drop(ev, `Router nie ma puli DHCP ani przekaźnika na ${ifc.name} – broadcast DHCP kończy się tutaj.`);
  }

  private dhcpServerRx(d: Device, ifc: Iface, m: DhcpPdu, ev: SimEvent) {
    const relayed = !!m.giaddr && m.giaddr !== '0.0.0.0';
    const subnetIp = relayed ? m.giaddr : ifc.ip;
    if (!hasIp(ifc)) return this.drop(ev, `Interfejs ${ifc.name} nie ma adresu IP – serwer nie wie, z jakiej sieci przydzielić adres.`);
    const pool = d.pools.find((pl) => inSubnet(subnetIp, pl.network, pl.mask));
    if (!pool) return this.drop(ev, `Brak puli DHCP dla sieci adresu ${subnetIp}${relayed ? ' (giaddr od przekaźnika)' : ''} – ignoruję.`);
    const reply = (msg: DhcpMsg, ip: string, why: string) => {
      const dhcp: DhcpPdu = { msg, xid: m.xid, chaddr: m.chaddr, ciaddr: '0.0.0.0', yiaddr: ip, siaddr: ifc.ip, giaddr: m.giaddr, mask: pool.mask, router: pool.gateway, dns: pool.dns, lease: 86400 };
      if (relayed) {
        const err = this.sendIp(d, { v: 4, src: ifc.ip, dst: m.giaddr, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 67, dstPort: 67, dhcp } }, [
          why,
          `Klient jest w innej sieci – odpowiedź idzie unicastem do przekaźnika ${m.giaddr}.`,
        ]);
        if (err) ev.notes.push(`Nie mogę odpowiedzieć przekaźnikowi: ${err}`);
        return;
      }
      this.transmit(d, ifc.name, { src: ifc.mac, dst: m.chaddr, etherType: 'IPv4', ip: { v: 4, src: ifc.ip, dst: ip, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 67, dstPort: 68, dhcp } } }, [why]);
    };
    if (m.msg === 'DISCOVER') {
      const ip = this.allocate(d, pool, m.chaddr);
      if (!ip) return this.drop(ev, `Pula „${pool.name}” jest wyczerpana – brak wolnych adresów w zakresie ${pool.start}–${pool.end}.`);
      ev.notes.push(`DHCPDISCOVER od ${m.chaddr}. W puli „${pool.name}” wolny jest ${ip} (pomijam adresy już używane w sieci) – wysyłam ofertę.`);
      reply('OFFER', ip, `Krok 2 (Offer): proponuję ${ip}${relayed ? '' : '. Klient nie ma jeszcze IP, więc ramka idzie wprost na jego MAC'}.`);
      return;
    }
    if (m.msg === 'REQUEST') {
      if (m.siaddr && m.siaddr !== ifc.ip) return this.drop(ev, `Klient wybrał ofertę innego serwera (${m.siaddr}) – zwalniam rezerwację.`);
      const ip = m.requested!;
      const host = this.net.devices.find((x) => x.ifaces.some((i) => i.mac === m.chaddr))?.name ?? '?';
      const ex = d.leases.find((l) => l.mac === m.chaddr);
      if (ex) Object.assign(ex, { ip, pool: pool.name, host });
      else d.leases.push({ ip, mac: m.chaddr, pool: pool.name, host });
      ev.notes.push(`DHCPREQUEST: klient prosi o ${ip}. Zapisuję dzierżawę i potwierdzam.`);
      reply('ACK', ip, `Krok 4 (Ack): dzierżawa ${ip} potwierdzona; w opcjach maska ${pool.mask}, brama ${pool.gateway}${pool.dns ? `, DNS ${pool.dns}` : ''}.`);
      return;
    }
    this.drop(ev, 'Nieobsługiwany komunikat DHCP.');
  }

  // DNS (RFC 1034/1035)

  /** Rozwiązuje nazwę. Dla adresu literalnego wywołuje cb od razu. */
  resolve(d: Device, name: string, type: RecordType, cb: (v: string | null, err?: string) => void) {
    const n = name.toLowerCase().replace(/\.$/, '');
    const hit = d.dnsCache.find((r) => r.name === n && r.type === type);
    if (hit) {
      this.out(d.id, `DNS: ${n} (${type}) → ${hit.value} – z pamięci podręcznej, bez zapytania`, 'hint');
      return cb(hit.value);
    }
    if (!fam(d.dns)) return cb(null, 'Brak serwera DNS. Ustaw go poleceniem „dns set <adres>” albo pobierz przez DHCP.');
    const id = Math.floor(Math.random() * 0xffff);
    const q = { dev: d.id, name: n, type, cb, done: false };
    this.dnsQ.set(id, q);
    const err = this.sendIp(
      d,
      { v: fam(d.dns) as 4 | 6, src: '', dst: d.dns, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 49152 + Math.floor(Math.random() * 16000), dstPort: 53, dns: { id, qr: 'query', name: n, qtype: type, answers: [], rcode: 'NOERROR' } } },
      [`Rozwiązywanie nazwy: pytam serwer DNS ${d.dns} o rekord ${type} dla „${n}”.`],
    );
    if (err) {
      q.done = true;
      return cb(null, err);
    }
    this.at(DNS_TIMEOUT, () => {
      if (!q.done) {
        q.done = true;
        cb(null, `Serwer DNS ${d.dns} nie odpowiada.`);
      }
    });
  }

  /** Nazwa → adres wybranej rodziny (A albo AAAA). Błąd wypisuje na terminal i nie wywołuje cb. */
  resolveHost(d: Device, host: string, want: 4 | 6, cb: (ip: string | null) => void) {
    if (fam(host)) return cb(host);
    this.resolve(d, host, want === 6 ? 'AAAA' : 'A', (ip, err) => {
      if (!ip) {
        this.out(d.id, `nie można rozwiązać nazwy ${host}`, 'err');
        if (err) this.out(d.id, err, 'hint');
        return cb(null);
      }
      cb(ip);
    });
  }

  startLookup(d: Device, name: string, type: RecordType) {
    this.out(d.id, `Serwer: ${d.dns || '(brak)'}`);
    this.resolve(d, name, type, (v, err) => {
      if (v) this.out(d.id, `${name}  ${type}  ${v}`);
      else this.out(d.id, err ?? 'brak odpowiedzi', 'err');
    });
  }

  private dnsServe(d: Device, p: IpPacket, ev: SimEvent) {
    const q = p.udp!.dns!;
    const all = d.records.filter((r) => r.name.toLowerCase() === q.name);
    const answers = all.filter((r) => r.type === q.qtype);
    const rcode = all.length ? 'NOERROR' : 'NXDOMAIN';
    ev.notes.push(
      rcode === 'NXDOMAIN'
        ? `Nie mam w strefie nazwy „${q.name}” – odpowiadam NXDOMAIN.`
        : answers.length
          ? `Znalazłem rekord(y) ${q.qtype}: ${answers.map((a) => a.value).join(', ')} – odsyłam odpowiedź.`
          : `Nazwa istnieje, ale nie ma rekordu typu ${q.qtype} – odpowiedź bez danych.`,
    );
    this.sendIp(
      d,
      { v: p.v, src: p.dst, dst: p.src, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 53, dstPort: p.udp!.srcPort, dns: { ...q, qr: 'response', answers, rcode } } },
      ['Odpowiedź serwera DNS z tym samym identyfikatorem zapytania.'],
    );
  }

  private dnsAnswer(d: Device, r: DnsPdu, ev: SimEvent) {
    const q = this.dnsQ.get(r.id);
    if (!q || q.dev !== d.id || q.done) return this.drop(ev, 'Odpowiedź DNS nie pasuje do żadnego oczekującego zapytania.');
    q.done = true;
    if (r.rcode === 'NXDOMAIN') {
      ev.notes.push(`Serwer odpowiedział NXDOMAIN – nazwa ${r.name} nie istnieje.`);
      return q.cb(null, `Nazwa ${r.name} nie istnieje (NXDOMAIN).`);
    }
    if (!r.answers.length) {
      ev.notes.push(`Brak rekordu ${r.qtype} dla ${r.name}.`);
      return q.cb(null, `Nazwa ${r.name} nie ma rekordu ${r.qtype}.`);
    }
    for (const a of r.answers) {
      const n = { name: a.name.toLowerCase(), type: a.type, value: a.value };
      if (!d.dnsCache.some((x) => x.name === n.name && x.type === n.type && x.value === n.value)) d.dnsCache.push(n);
    }
    ev.notes.push(`Odpowiedź DNS: ${r.name} → ${r.answers.map((a) => a.value).join(', ')}. Zapisuję w pamięci podręcznej.`);
    q.cb(r.answers[0].value);
  }

  // NTP (RFC 5905)

  startNtp(d: Device, host: string) {
    this.resolveHost(d, host, 4, (ip) => {
      if (!ip) return;
      const t1 = this.clockOf(d);
      this.ntpQ.set(d.id, { t1, done: false });
      this.out(d.id, `NTP: pytam ${host} o czas (zegar lokalny ${fmtClock(t1).slice(11)})`);
      const err = this.sendIp(
        d,
        { v: fam(ip) as 4 | 6, src: '', dst: ip, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 123, dstPort: 123, ntp: { mode: 3, stratum: 0, t1 } } },
        [`Prośba NTP (tryb 3 – klient) ze znacznikiem czasu wysłania t1 = ${fmtClock(t1).slice(11)}.`],
      );
      if (err) this.out(d.id, err, 'hint');
      this.at(DNS_TIMEOUT, () => {
        const s = this.ntpQ.get(d.id);
        if (s && !s.done) this.out(d.id, 'NTP: serwer nie odpowiada', 'err');
      });
    });
  }

  private ntpServe(d: Device, p: IpPacket, ev: SimEvent) {
    const r = p.udp!.ntp!;
    const now = this.clockOf(d);
    ev.notes.push(`Serwer czasu: zapisuję czas odbioru t2 i wysłania t3 = ${fmtClock(now).slice(11)} i odsyłam odpowiedź (tryb 4).`);
    this.sendIp(
      d,
      { v: p.v, src: p.dst, dst: p.src, ttl: DEFAULT_TTL, id: ipId++, proto: 'UDP', udp: { srcPort: 123, dstPort: 123, ntp: { mode: 4, stratum: 1, t1: r.t1, t2: now, t3: now, ref: 'GPS (symulowany)' } } },
      ['Odpowiedź NTP z czasem serwera wzorcowego (stratum 1).'],
    );
  }

  private ntpAnswer(d: Device, p: IpPacket, ev: SimEvent) {
    const s = this.ntpQ.get(d.id);
    const r = p.udp!.ntp!;
    if (!s || s.done) return this.drop(ev, 'Nieoczekiwana odpowiedź NTP.');
    s.done = true;
    const t4 = this.clockOf(d);
    const offset = Math.round(((r.t2! - r.t1) + (r.t3! - t4)) / 2);
    const delay = t4 - r.t1 - (r.t3! - r.t2!);
    d.clock += offset;
    ev.notes.push(`t1=${fmtClock(r.t1).slice(11)}, t2=t3=${fmtClock(r.t2!).slice(11)}, t4=${fmtClock(t4).slice(11)} → przesunięcie ((t2−t1)+(t3−t4))/2 = ${(offset / 1000).toFixed(3)} s, opóźnienie ${delay} ms. Koryguję zegar.`);
    this.out(d.id, `NTP: przesunięcie ${(offset / 1000).toFixed(3)} s, opóźnienie ${delay} ms, stratum ${r.stratum}`);
    this.out(d.id, `NTP: zegar ustawiony na ${fmtClock(this.clockOf(d))}`);
  }

  // ----- TCP (RFC 9293) -----

  private tcpSeg(d: Device, c: Conn, flags: string[], why: string[], app?: AppData): string | null {
    return this.sendIp(
      d,
      {
        v: fam(c.remote) as 4 | 6,
        src: c.lip,
        dst: c.remote,
        ttl: DEFAULT_TTL,
        id: ipId++,
        proto: 'TCP',
        tcp: { srcPort: c.local, dstPort: c.rport, flags, seq: c.seq, ack: c.ack, len: app?.len ?? 0, app },
      },
      why,
    );
  }

  tcpConnect(d: Device, dst: string, port: number, h: ConnHandlers, why: string[] = []): Conn | null {
    const remote = fam(dst) === 6 ? norm6(dst) : dst;
    const c: Conn = {
      id: connId++,
      dev: d.id,
      role: 'client',
      local: 49152 + Math.floor(Math.random() * 16000),
      lip: '',
      remote,
      rport: port,
      state: 'SYN_SENT',
      seq: 1000 + Math.floor(Math.random() * 9000),
      ack: 0,
      proto: h.proto,
      h,
      ctx: {},
      sent: false,
    };
    this.conns.push(c);
    const err = this.tcpSeg(d, c, ['SYN'], [...why, `Krok 1/3 uzgadniania TCP: SYN do portu ${port} (numer początkowy ISN=${c.seq}).`]);
    if (err) {
      c.state = 'CLOSED';
      this.out(d.id, err, 'hint');
      h.fail?.(c, 'nie można wysłać segmentu');
      return null;
    }
    c.seq += 1;
    this.at(TCP_TIMEOUT, () => {
      if (c.state === 'SYN_SENT') {
        c.state = 'CLOSED';
        h.fail?.(c, 'brak odpowiedzi (upłynął czas)');
      }
    });
    return c;
  }

  tcpSend(c: Conn, app: AppData, why: string[] = []) {
    const d = this.dev(c.dev);
    if (!d || c.state === 'CLOSED') return;
    c.sent = true;
    this.tcpSeg(d, c, ['PSH', 'ACK'], why, app);
    c.seq += app.len;
  }

  tcpClose(c: Conn, why: string[] = ['Koniec wymiany – zamykam połączenie (FIN).']) {
    const d = this.dev(c.dev);
    if (!d || c.state !== 'EST') return;
    c.sent = true;
    this.tcpSeg(d, c, ['FIN', 'ACK'], why);
    c.seq += 1;
    c.state = 'FIN_WAIT';
  }

  /** Rejestruje jednorazowe nasłuchiwanie (np. port danych FTP w trybie EPSV). */
  listen(d: Device, port: number, h: ConnHandlers) {
    this.passive.set(`${d.id}:${port}`, h);
  }

  private listener(d: Device, port: number): ConnHandlers | null {
    const key = `${d.id}:${port}`;
    const p = this.passive.get(key);
    if (p) {
      this.passive.delete(key);
      return p;
    }
    return serverListener(this, d, port);
  }

  private tcpRx(d: Device, p: IpPacket, ev: SimEvent) {
    const t = p.tcp!;
    const has = (f: string) => t.flags.includes(f);
    const c = this.conns.find((x) => x.dev === d.id && x.local === t.dstPort && sameIp(x.remote, p.src) && x.rport === t.srcPort && x.state !== 'CLOSED');
    if (!c) {
      if (has('SYN') && !has('ACK')) {
        const L = this.listener(d, t.dstPort);
        if (L) {
          const s: Conn = {
            id: connId++,
            dev: d.id,
            role: 'server',
            local: t.dstPort,
            lip: p.dst,
            remote: p.src,
            rport: t.srcPort,
            state: 'SYN_RCVD',
            seq: 5000 + Math.floor(Math.random() * 9000),
            ack: t.seq + 1,
            proto: L.proto,
            h: L,
            ctx: {},
            sent: false,
          };
          this.conns.push(s);
          ev.notes.push(`Port ${t.dstPort} (${PROTO_LABEL[L.proto]}) nasłuchuje – odpowiadam SYN-ACK (krok 2/3).`);
          this.tcpSeg(d, s, ['SYN', 'ACK'], [`Krok 2/3: potwierdzam SYN klienta (ack=${s.ack}) i wysyłam własny SYN (ISN=${s.seq}).`]);
          s.seq += 1;
          return;
        }
        ev.notes.push(`Port TCP ${t.dstPort} jest zamknięty – odpowiadam RST (odmowa połączenia).`);
        const tmp = { local: t.dstPort, rport: t.srcPort, remote: p.src, lip: p.dst, seq: 0, ack: t.seq + 1 } as Conn;
        this.tcpSeg(d, tmp, ['RST', 'ACK'], ['Brak usługi na tym porcie – RST zamyka próbę połączenia.']);
        return;
      }
      return this.drop(ev, 'Segment TCP nie należy do żadnego połączenia – odrzucam.');
    }
    if (has('RST')) {
      c.state = 'CLOSED';
      ev.notes.push('Otrzymano RST – druga strona odmówiła połączenia (na porcie nic nie nasłuchuje).');
      c.h.fail?.(c, 'połączenie odrzucone (RST)');
      return;
    }
    if (c.state === 'SYN_SENT' && has('SYN') && has('ACK')) {
      c.ack = t.seq + 1;
      c.state = 'EST';
      ev.notes.push('Otrzymano SYN-ACK. Wysyłam ACK (krok 3/3) – połączenie nawiązane (ESTABLISHED).');
      this.tcpSeg(d, c, ['ACK'], ['Krok 3/3 uzgadniania trójetapowego.']);
      this.at(1, () => c.h.open?.(c));
      return;
    }
    if (c.state === 'SYN_RCVD' && has('ACK')) {
      c.state = 'EST';
      ev.notes.push('Krok 3/3: ACK od klienta – połączenie ESTABLISHED.');
      if (!t.len) {
        c.sent = false;
        c.h.open?.(c);
        return;
      }
    }
    if (t.len > 0 && t.app) {
      c.ack = t.seq + t.len;
      ev.notes.push(
        t.app.enc
          ? `Odebrano ${t.len} B zaszyfrowanych danych – odszyfrowuje je tylko ${d.name} (klucz sesji TLS).`
          : `Odebrano ${t.len} B danych aplikacji ${PROTO_LABEL[c.proto]} (ack = ${c.ack}).`,
      );
      c.sent = false;
      c.h.data?.(c, t.app, ev);
      if (!c.sent && (c.state === 'EST' || c.state === 'FIN_WAIT')) {
        this.tcpSeg(d, c, ['ACK'], ['Potwierdzam odebrane dane (ACK bez danych).']);
      }
      return;
    }
    if (has('FIN')) {
      c.ack = t.seq + 1;
      if (c.state === 'FIN_WAIT') {
        c.state = 'CLOSED';
        ev.notes.push('Druga strona też zamknęła połączenie (FIN). Wysyłam ostatnie ACK – połączenie zamknięte.');
        this.tcpSeg(d, c, ['ACK'], ['Potwierdzenie FIN – koniec połączenia.']);
        c.h.closed?.(c);
        return;
      }
      ev.notes.push('Druga strona zamyka połączenie – odpowiadam FIN-ACK.');
      this.tcpSeg(d, c, ['FIN', 'ACK'], ['Zamykam swoją stronę połączenia.']);
      c.seq += 1;
      c.state = 'LAST_ACK';
      c.h.closed?.(c);
      return;
    }
    if (c.state === 'LAST_ACK' && has('ACK')) {
      c.state = 'CLOSED';
      ev.notes.push('Ostatnie ACK – połączenie zamknięte po obu stronach.');
      return;
    }
    ev.notes.push('Potwierdzenie (ACK) – segment nie zmienia stanu połączenia.');
  }

  ownAddresses(d: Device) {
    return addressesOf(d);
  }
}
