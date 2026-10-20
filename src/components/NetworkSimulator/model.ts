// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Model sieci: urządzenia, interfejsy, łącza, usługi serwera oraz adresacja IPv4/IPv6.
// Mechanizmy opisano na podstawie otwartych standardów (RFC, IEEE 802).

import { fmt6, inPrefix6, isIp6, isLinkLocal6, linkLocal, net6, norm6, parse6 } from './ipv6';

export type DeviceType = 'pc' | 'server' | 'router' | 'switch' | 'printer';

export type Protocol = 'ARP' | 'NDP' | 'ICMP' | 'TUNNEL' | 'EAP' | 'DHCP' | 'DNS' | 'NTP' | 'HTTP' | 'HTTPS' | 'FTP' | 'EMAIL' | 'IPP' | 'TCP';
export const PROTOCOLS: Protocol[] = ['ARP', 'NDP', 'ICMP', 'TUNNEL', 'EAP', 'DHCP', 'DNS', 'NTP', 'HTTP', 'HTTPS', 'FTP', 'EMAIL', 'IPP', 'TCP'];

export const PROTO_COLORS: Record<Protocol, string> = {
  ARP: '#d97706',
  NDP: '#a16207',
  ICMP: '#7c3aed',
  TUNNEL: '#0f766e',
  EAP: '#be123c',
  DHCP: '#059669',
  DNS: '#0891b2',
  NTP: '#475569',
  HTTP: '#2563eb',
  HTTPS: '#db2777',
  FTP: '#65a30d',
  EMAIL: '#9a3412',
  IPP: '#4f46e5',
  TCP: '#6b7280',
};

export const PROTO_LABEL: Record<Protocol, string> = {
  ARP: 'ARP',
  NDP: 'NDP',
  ICMP: 'ICMP',
  TUNNEL: 'Tunel',
  EAP: '802.1X',
  DHCP: 'DHCP',
  DNS: 'DNS',
  NTP: 'NTP',
  HTTP: 'HTTP',
  HTTPS: 'HTTPS',
  FTP: 'FTP',
  EMAIL: 'E-mail',
  IPP: 'Druk',
  TCP: 'TCP',
};

export interface StdRef {
  id: string;
  title: string;
}

export function stdUrl(id: string): string | null {
  const m = /^RFC (\d+)$/.exec(id);
  return m ? `https://www.rfc-editor.org/rfc/rfc${m[1]}` : null;
}

export const PROTO_INFO: Record<Protocol, { name: string; layer: string; text: string; refs: StdRef[] }> = {
  ARP: {
    name: 'ARP – Address Resolution Protocol',
    layer: 'między warstwą 2 a 3 (tylko IPv4)',
    text: 'Zamienia adres IPv4 na adres MAC w obrębie sieci lokalnej. Zapytanie wysyłane jest rozgłoszeniowo do wszystkich, odpowiedź wraca bezpośrednio do pytającego. Obie strony zapisują wynik w tablicy ARP.',
    refs: [
      { id: 'RFC 826', title: 'An Ethernet Address Resolution Protocol' },
      { id: 'RFC 894', title: 'IP datagrams over Ethernet' },
    ],
  },
  NDP: {
    name: 'NDP – Neighbor Discovery Protocol (IPv6)',
    layer: 'warstwa 3, komunikaty ICMPv6',
    text: 'Zastępuje ARP w IPv6. Neighbor Solicitation trafia na adres multicast „węzła żądanego”, więc odbiera go praktycznie tylko właściciel adresu – IPv6 nie ma broadcastu. Router Solicitation / Advertisement pozwalają hostowi samemu zbudować adres z prefiksu routera (SLAAC).',
    refs: [
      { id: 'RFC 4861', title: 'Neighbor Discovery for IPv6' },
      { id: 'RFC 4862', title: 'IPv6 Stateless Address Autoconfiguration' },
      { id: 'RFC 4291', title: 'IPv6 Addressing Architecture' },
    ],
  },
  ICMP: {
    name: 'ICMP / ICMPv6 – komunikaty kontrolne',
    layer: 'warstwa 3 (sieciowa)',
    text: 'Polecenie ping wysyła Echo Request i czeka na Echo Reply. Routery zgłaszają błędy: Destination Unreachable (brak trasy) i Time Exceeded (TTL lub Hop Limit spadł do zera) – na tym drugim opiera się polecenie trace.',
    refs: [
      { id: 'RFC 792', title: 'Internet Control Message Protocol' },
      { id: 'RFC 4443', title: 'ICMPv6' },
      { id: 'RFC 1812', title: 'Requirements for IP Version 4 Routers' },
    ],
  },
  TUNNEL: {
    name: 'Tunelowanie – 6in4 i 4in6',
    layer: 'warstwa 3 w warstwie 3',
    text: 'Router na początku tunelu wkłada cały pakiet jednej rodziny w nowy pakiet drugiej rodziny: w 6in4 pakiet IPv6 jedzie w IPv4 z numerem protokołu 41, w 4in6 – IPv4 w IPv6 (Next Header 4). Routery po drodze widzą tylko zewnętrzny nagłówek, a koniec tunelu go zdejmuje. Nagłówek kosztuje 20 B (IPv4) albo 40 B (IPv6) z MTU. Starsze automatyczne mechanizmy – 6to4 i Teredo – zostały wycofane albo nie są już stosowane.',
    refs: [
      { id: 'RFC 4213', title: 'Basic Transition Mechanisms for IPv6 Hosts and Routers (6in4)' },
      { id: 'RFC 2473', title: 'Generic Packet Tunneling in IPv6 (4in6)' },
      { id: 'RFC 7526', title: 'Deprecating the Anycast Prefix for 6to4 Relay Routers' },
    ],
  },
  EAP: {
    name: 'IEEE 802.1X – uwierzytelnianie na porcie (EAP)',
    layer: 'warstwa 2 (ramki EAPOL, EtherType 0x888E)',
    text: 'Port przełącznika z włączonym 802.1X jest najpierw „nieautoryzowany”: przepuszcza tylko ramki EAPOL. Komputer (suplikant) podaje tożsamość, przełącznik (uwierzytelniający) wysyła wyzwanie, komputer odpowiada skrótem z hasła, a po EAP-Success port zaczyna przekazywać ruch. W sieciach firmowych decyzję podejmuje serwer RADIUS (RFC 2865); w symulatorze baza kont jest w przełączniku.',
    refs: [
      { id: 'IEEE 802.1X-2020', title: 'Port-Based Network Access Control' },
      { id: 'RFC 3748', title: 'Extensible Authentication Protocol (EAP)' },
      { id: 'RFC 3579', title: 'RADIUS Support for EAP' },
    ],
  },
  DHCP: {
    name: 'DHCP – Dynamic Host Configuration Protocol',
    layer: 'warstwa aplikacji (UDP 67/68)',
    text: 'Przydziela hostowi adres IP, maskę, bramę i serwer DNS. Cztery kroki „DORA”: Discover, Offer, Request, Ack. Gdy serwer stoi w innej sieci, router działa jako przekaźnik (relay) i przesyła komunikaty dalej, wpisując swój adres w pole giaddr.',
    refs: [
      { id: 'RFC 2131', title: 'Dynamic Host Configuration Protocol' },
      { id: 'RFC 2132', title: 'DHCP Options' },
      { id: 'RFC 1542', title: 'BOOTP relay agents' },
    ],
  },
  DNS: {
    name: 'DNS – Domain Name System',
    layer: 'warstwa aplikacji (UDP 53)',
    text: 'Tłumaczy nazwy na adresy. Rekord A zawiera adres IPv4, AAAA – adres IPv6, MX wskazuje serwer poczty domeny. Odpowiedź trafia do pamięci podręcznej klienta, więc kolejne zapytanie o tę samą nazwę nie wychodzi do sieci.',
    refs: [
      { id: 'RFC 1034', title: 'Domain Names – Concepts and Facilities' },
      { id: 'RFC 1035', title: 'Domain Names – Implementation and Specification' },
      { id: 'RFC 3596', title: 'DNS Extensions to Support IPv6 (AAAA)' },
    ],
  },
  NTP: {
    name: 'NTP – Network Time Protocol',
    layer: 'warstwa aplikacji (UDP 123)',
    text: 'Synchronizuje zegary. Klient zapisuje czas wysłania (t1), serwer czas odbioru (t2) i wysłania odpowiedzi (t3), klient czas jej odbioru (t4). Przesunięcie zegara = ((t2 − t1) + (t3 − t4)) / 2.',
    refs: [{ id: 'RFC 5905', title: 'Network Time Protocol Version 4' }],
  },
  HTTP: {
    name: 'HTTP – Hypertext Transfer Protocol',
    layer: 'warstwa aplikacji (TCP 80)',
    text: 'Klient wysyła żądanie (np. GET /), serwer odpowiada kodem stanu (200 OK, 404 Not Found) i treścią. Całość płynie jawnym tekstem – każdy, kto widzi ruch, może ją odczytać.',
    refs: [
      { id: 'RFC 9110', title: 'HTTP Semantics' },
      { id: 'RFC 9112', title: 'HTTP/1.1' },
    ],
  },
  HTTPS: {
    name: 'HTTPS – HTTP w tunelu TLS',
    layer: 'warstwa aplikacji (TCP 443)',
    text: 'Przed wysłaniem żądania klient i serwer wykonują uzgodnienie TLS: ClientHello, ServerHello z certyfikatem i Finished. Od tego momentu dane aplikacji są zaszyfrowane – obserwator widzi tylko adresy, porty i długość.',
    refs: [
      { id: 'RFC 8446', title: 'TLS 1.3' },
      { id: 'RFC 9110', title: 'HTTP Semantics' },
      { id: 'RFC 2818', title: 'HTTP Over TLS' },
    ],
  },
  FTP: {
    name: 'FTP – File Transfer Protocol',
    layer: 'warstwa aplikacji (TCP 21 + osobne połączenie danych)',
    text: 'Polecenia (USER, PASS, RETR, LIST) idą połączeniem sterującym na port 21, a plik osobnym połączeniem danych. W trybie EPSV serwer podaje port, z którym łączy się klient – działa to także w IPv6. Hasło płynie jawnym tekstem.',
    refs: [
      { id: 'RFC 959', title: 'File Transfer Protocol' },
      { id: 'RFC 2428', title: 'FTP Extensions for IPv6 and NATs (EPSV)' },
    ],
  },
  EMAIL: {
    name: 'Poczta – SMTP i POP3',
    layer: 'warstwa aplikacji (TCP 25 i 110)',
    text: 'SMTP przekazuje wiadomość do serwera domeny odbiorcy (adres serwera wskazuje rekord MX w DNS). POP3 pobiera wiadomości ze skrzynki. Oba protokoły są tekstowe: polecenie – odpowiedź z kodem.',
    refs: [
      { id: 'RFC 5321', title: 'Simple Mail Transfer Protocol' },
      { id: 'RFC 1939', title: 'Post Office Protocol – Version 3' },
      { id: 'RFC 5322', title: 'Internet Message Format' },
    ],
  },
  IPP: {
    name: 'IPP – Internet Printing Protocol',
    layer: 'warstwa aplikacji (TCP 631)',
    text: 'Zadanie drukowania (Print-Job) wysyłane jest w treści żądania HTTP POST na port 631. Drukarka odpowiada statusem i numerem zadania.',
    refs: [
      { id: 'RFC 8011', title: 'IPP/1.1: Model and Semantics' },
      { id: 'RFC 8010', title: 'IPP/1.1: Encoding and Transport' },
    ],
  },
  TCP: {
    name: 'TCP – Transmission Control Protocol',
    layer: 'warstwa 4 (transportowa)',
    text: 'Niezawodny transport z połączeniem: uzgadnianie SYN → SYN-ACK → ACK, numery sekwencyjne i potwierdzenia, zamknięcie FIN/ACK. Segment RST oznacza, że na porcie nic nie nasłuchuje.',
    refs: [{ id: 'RFC 9293', title: 'Transmission Control Protocol' }],
  },
};

export const BCAST_MAC = 'FF:FF:FF:FF:FF:FF';
export const DEFAULT_TTL = 64;

export interface Ip6Addr {
  addr: string;
  prefix: number;
  origin: 'link' | 'static' | 'auto';
}

export interface Tunnel {
  /** 6in4: IPv6 w IPv4 (protokół 41); 4in6: IPv4 w IPv6 (Next Header 4) */
  mode: '6in4' | '4in6';
  local: string;
  remote: string;
}

export interface Iface {
  name: string;
  /** interfejs wirtualny – koniec tunelu */
  tunnel?: Tunnel;
  mac: string;
  ip: string;
  mask: string;
  ip6: Ip6Addr[];
  up: boolean;
  vlan: number;
  /** adres serwera DHCP, do którego router przekazuje komunikaty z tej sieci (relay) */
  relay: string;
  // bezpieczeństwo portu przełącznika
  /** port zaufany: wolno z niego wysyłać odpowiedzi DHCP i ogłoszenia routera; nie podlega SAVI */
  trusted?: boolean;
  /** limit adresów MAC uczonych na porcie */
  maxMac?: number;
  onViolation?: 'drop' | 'shutdown';
  violations?: number;
  /** port wyłączony po naruszeniu */
  errDisabled?: boolean;
  /** IEEE 802.1X na porcie i MAC uwierzytelnionego suplikanta */
  dot1x?: boolean;
  authMac?: string;
  authUser?: string;
}

export interface StaticRoute {
  network: string;
  prefix: number;
  nextHop: string;
}

export interface DhcpPool {
  name: string;
  network: string;
  mask: string;
  gateway: string;
  start: string;
  end: string;
  dns: string;
}

export interface DhcpLease {
  ip: string;
  mac: string;
  pool: string;
  host: string;
}

export interface ArpEntry {
  ip: string;
  mac: string;
  iface: string;
}

export interface MacEntry {
  mac: string;
  port: string;
  vlan: number;
}

export interface PrintJob {
  id: number;
  from: string;
  doc: string;
  t: number;
}

export type ServiceName = 'dhcp' | 'dns' | 'http' | 'https' | 'ftp' | 'mail' | 'ntp';
export const SERVICES: ServiceName[] = ['dhcp', 'dns', 'http', 'https', 'ftp', 'mail', 'ntp'];
export const SERVICE_LABEL: Record<ServiceName, string> = {
  dhcp: 'DHCP (UDP 67)',
  dns: 'DNS (UDP 53)',
  http: 'HTTP (TCP 80)',
  https: 'HTTPS (TCP 443)',
  ftp: 'FTP (TCP 21)',
  mail: 'Poczta: SMTP 25 / POP3 110',
  ntp: 'NTP (UDP 123)',
};

export type RecordType = 'A' | 'AAAA' | 'MX';
export interface DnsRecord {
  name: string;
  type: RecordType;
  value: string;
  /** rekord AAAA złożony przez DNS64 z rekordu A */
  synth?: boolean;
}

/** Powiązanie adres IP ↔ MAC ↔ port (z obserwacji DHCP albo wpisane ręcznie) – podstawa SAVI (RFC 7039, RFC 7513). */
export interface Binding {
  mac: string;
  ip: string;
  port: string;
  vlan: number;
  origin: 'dhcp' | 'static';
}

export interface SwitchSecurity {
  /** ochrona DHCP: odpowiedzi serwerów tylko z portów zaufanych */
  dhcpGuard: boolean;
  /** weryfikacja adresu źródłowego IPv4 i ARP na podstawie powiązań */
  savi: boolean;
  /** RFC 6105: Router Advertisement tylko z portów zaufanych */
  raGuard: boolean;
  /** konta 802.1X (w praktyce: serwer RADIUS) */
  users: { name: string; pass: string }[];
}

export interface Nat64 {
  prefix: string;
  len: number;
  /** adres IPv4 routera używany po stronie IPv4 */
  pool: string;
}

export interface NatEntry {
  proto: 'TCP' | 'UDP' | 'ICMP';
  v6: string;
  v6port: number;
  v4port: number;
  v4: string;
  port: number;
}

export interface Mail {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface UserAccount {
  name: string;
  pass: string;
  mail: Mail[];
}

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  x: number;
  y: number;
  ifaces: Iface[];
  gateway: string;
  gateway6: string;
  dns: string;
  dhcp: boolean;
  slaac: boolean;
  routes: StaticRoute[];
  pools: DhcpPool[];
  leases: DhcpLease[];
  vlans: { id: number; name: string }[];
  arp: ArpEntry[];
  nd: ArpEntry[];
  macTable: MacEntry[];
  dnsCache: DnsRecord[];
  jobs: PrintJob[];
  /** przesunięcie zegara urządzenia w ms względem czasu wzorcowego */
  clock: number;
  // translacja IPv6 ↔ IPv4
  nat64: Nat64 | null;
  natTable: NatEntry[];
  dns64: { prefix: string; len: number } | null;
  // bezpieczeństwo (przełącznik)
  security: SwitchSecurity;
  bindings: Binding[];
  // serwer
  services: Record<ServiceName, boolean>;
  records: DnsRecord[];
  web: { path: string; body: string }[];
  files: { name: string; body: string }[];
  users: UserAccount[];
  mailDomain: string;
  certName: string;
  // klient
  mailAccount: { addr: string; pass: string };
  inbox: Mail[];
  downloads: { name: string; from: string; body: string }[];
  page: { url: string; status: string; body: string; secure: boolean; warning?: string } | null;
}

export interface LinkEnd {
  dev: string;
  iface: string;
}

export interface Link {
  id: string;
  a: LinkEnd;
  b: LinkEnd;
}

export type NoteColor = 'ink' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

/** Opis na obszarze roboczym: napis albo obszar (prostokąt z etykietą, np. „Sieć A”). Nie bierze udziału w symulacji. */
export interface Note {
  id: string;
  kind: 'text' | 'zone';
  x: number;
  y: number;
  /** szerokość i wysokość – tylko dla obszaru */
  w: number;
  h: number;
  text: string;
  color: NoteColor;
  /** rozmiar czcionki napisu */
  size: number;
  bold: boolean;
  /** obszar: linia przerywana (true) albo ciągła */
  dashed: boolean;
}

export interface Network {
  devices: Device[];
  links: Link[];
  notes?: Note[];
  nextId: number;
}

export const TYPE_LABEL: Record<DeviceType, string> = {
  pc: 'Komputer',
  server: 'Serwer',
  router: 'Router',
  switch: 'Przełącznik',
  printer: 'Drukarka',
};

// ---------- IPv4 (RFC 791, CIDR – RFC 4632) ----------

export function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec((ip ?? '').trim());
  if (!m) return null;
  const p = m.slice(1).map(Number);
  if (p.some((x) => x > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

export function intToIp(n: number): string {
  n >>>= 0;
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export const isIp = (s: string) => ipToInt(s) !== null;

export function maskToPrefix(mask: string): number | null {
  const n = ipToInt(mask);
  if (n === null) return null;
  let p = 0;
  let zero = false;
  for (let i = 31; i >= 0; i--) {
    if ((n >>> i) & 1) {
      if (zero) return null;
      p++;
    } else zero = true;
  }
  return p;
}

export function prefixToMask(p: number): string {
  if (p <= 0) return '0.0.0.0';
  return intToIp((0xffffffff << (32 - p)) >>> 0);
}

export const isMask = (s: string) => maskToPrefix(s) !== null;

export function networkOf(ip: string, mask: string): string | null {
  const a = ipToInt(ip);
  const m = ipToInt(mask);
  if (a === null || m === null) return null;
  return intToIp((a & m) >>> 0);
}

export function broadcastOf(ip: string, mask: string): string | null {
  const a = ipToInt(ip);
  const m = ipToInt(mask);
  if (a === null || m === null) return null;
  return intToIp((a | ~m) >>> 0);
}

export function inSubnet(ip: string, net: string, mask: string): boolean {
  const a = ipToInt(ip);
  const n = ipToInt(net);
  const m = ipToInt(mask);
  if (a === null || n === null || m === null) return false;
  return ((a & m) >>> 0) === ((n & m) >>> 0);
}

export const hasIp = (i: Iface) => isIp(i.ip) && isMask(i.mask);

export function cidr(ip: string, mask: string): string {
  const p = maskToPrefix(mask);
  return p === null ? ip : `${ip}/${p}`;
}

// ---------- obie rodziny adresów ----------

export { isIp6, norm6, isLinkLocal6 };

export function fam(ip: string): 4 | 6 | 0 {
  if (isIp(ip)) return 4;
  if (isIp6(ip)) return 6;
  return 0;
}

export function sameIp(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const x = parse6(a);
  const y = parse6(b);
  return x !== null && y !== null && x === y;
}

export function inPrefix(ip: string, net: string, prefix: number): boolean {
  if (fam(ip) === 4 && fam(net) === 4) return inSubnet(ip, net, prefixToMask(prefix));
  if (fam(ip) === 6 && fam(net) === 6) return inPrefix6(ip, net, prefix);
  return false;
}

export function netOf(ip: string, prefix: number): string {
  return fam(ip) === 6 ? net6(ip, prefix) : networkOf(ip, prefixToMask(prefix)) ?? ip;
}

/** Parsuje „10.0.0.1/24”, „2001:db8::1/64” albo parę „10.0.0.1 255.255.255.0”. */
export function parseAddr(a: string | undefined, b?: string): { ip: string; prefix: number; fam: 4 | 6; used: number } | null {
  if (!a) return null;
  const m = /^([0-9a-fA-F:.]+)\/(\d{1,3})$/.exec(a);
  if (m) {
    const f = fam(m[1]);
    const p = Number(m[2]);
    if (f === 4 && p <= 32) return { ip: m[1], prefix: p, fam: 4, used: 1 };
    if (f === 6 && p <= 128) return { ip: norm6(m[1]), prefix: p, fam: 6, used: 1 };
    return null;
  }
  if (isIp(a) && b && isMask(b)) return { ip: a, prefix: maskToPrefix(b)!, fam: 4, used: 2 };
  return null;
}

/** Zgodność wstecz: dawny parser tylko IPv4 z maską. */
export function parseCidr(a: string | undefined, b?: string): { ip: string; mask: string; used: number } | null {
  const r = parseAddr(a, b);
  return r && r.fam === 4 ? { ip: r.ip, mask: prefixToMask(r.prefix), used: r.used } : null;
}

export const globals6 = (i: Iface) => i.ip6.filter((a) => a.origin !== 'link');
export const linkLocalOf = (i: Iface) => i.ip6.find((a) => a.origin === 'link')?.addr ?? linkLocal(i.mac);

// ---------- urządzenia ----------

let macSeq = Math.floor(Math.random() * 0xffff);

/** Adres MAC administrowany lokalnie (IEEE 802: bit U/L = 1, bit I/G = 0). */
export function newMac(): string {
  macSeq = (macSeq + 1) & 0xffff;
  const r = () => Math.floor(Math.random() * 256);
  const bytes = [0x02, r(), r(), r(), (macSeq >> 8) & 255, macSeq & 255];
  return bytes.map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

const NAME_PREFIX: Record<DeviceType, string> = { pc: 'PC', server: 'SRV', router: 'R', switch: 'SW', printer: 'DRUK' };

function defaultName(net: Network, type: DeviceType) {
  let i = 1;
  while (net.devices.some((d) => d.name === NAME_PREFIX[type] + i)) i++;
  return NAME_PREFIX[type] + i;
}

export const noServices = (): Record<ServiceName, boolean> => ({ dhcp: false, dns: false, http: false, https: false, ftp: false, mail: false, ntp: false });

export function newIface(name: string, up: boolean, l3: boolean): Iface {
  const mac = newMac();
  return { name, mac, ip: '', mask: '', ip6: l3 ? [{ addr: linkLocal(mac), prefix: 64, origin: 'link' }] : [], up, vlan: 1, relay: '' };
}

export function createDevice(net: Network, type: DeviceType, x: number, y: number, name?: string): Device {
  let ifaces: Iface[];
  if (type === 'router') ifaces = ['eth0', 'eth1', 'eth2', 'eth3'].map((n) => newIface(n, false, true));
  else if (type === 'switch') ifaces = Array.from({ length: 8 }, (_, i) => newIface(`port${i + 1}`, true, false));
  else ifaces = [newIface('eth0', true, true)];
  const server = type === 'server';
  const d: Device = {
    id: 'd' + net.nextId++,
    type,
    name: name ?? defaultName(net, type),
    x,
    y,
    ifaces,
    gateway: '',
    gateway6: '',
    dns: '',
    dhcp: false,
    slaac: false,
    routes: [],
    pools: [],
    leases: [],
    vlans: type === 'switch' ? [{ id: 1, name: 'domyslny' }] : [],
    arp: [],
    nd: [],
    macTable: [],
    dnsCache: [],
    jobs: [],
    clock: server ? 0 : Math.round((Math.random() * 2 - 1) * 240000),
    nat64: null,
    natTable: [],
    dns64: null,
    security: { dhcpGuard: false, savi: false, raGuard: false, users: [] },
    bindings: [],
    services: server ? { dhcp: false, dns: true, http: true, https: true, ftp: true, mail: true, ntp: true } : noServices(),
    records: [],
    web: server
      ? [
          { path: '/', body: 'Witaj na serwerze szkolnym!\nStronę wysłał serwer WWW – porównaj, jak wygląda w pakietach HTTP, a jak w HTTPS.' },
          { path: '/plan', body: 'Plan lekcji: poniedziałek 8:00 – sieci komputerowe.' },
        ]
      : [],
    files: server ? [{ name: 'zadanie.txt', body: 'Zadanie: narysuj schemat sieci i opisz adresację.' }] : [],
    users: server ? [{ name: 'uczen', pass: 'haslo123', mail: [] }] : [],
    mailDomain: server ? 'szkola.lab' : '',
    certName: server ? 'www.szkola.lab' : '',
    mailAccount: { addr: '', pass: '' },
    inbox: [],
    downloads: [],
    page: null,
  };
  net.devices.push(d);
  return d;
}

/** Uzupełnia pola brakujące w starszych zapisach i importach. */
export function normalizeNet(net: Network): Network {
  if (!Array.isArray(net.notes)) net.notes = [];
  for (const d of net.devices) {
    const base = createDevice({ devices: [], links: [], nextId: 0 }, d.type, 0, 0, d.name);
    for (const k of Object.keys(base) as (keyof Device)[]) {
      if ((d as unknown as Record<string, unknown>)[k] === undefined) (d as unknown as Record<string, unknown>)[k] = base[k];
    }
    d.routes = (d.routes as unknown as (StaticRoute & { mask?: string })[]).map((r) =>
      r.prefix === undefined && r.mask ? { network: r.network, prefix: maskToPrefix(r.mask) ?? 0, nextHop: r.nextHop } : r,
    );
    for (const i of d.ifaces) {
      if (!i.ip6) i.ip6 = d.type === 'switch' ? [] : [{ addr: linkLocal(i.mac), prefix: 64, origin: 'link' }];
      if (i.relay === undefined) i.relay = '';
    }
    d.pools.forEach((p) => {
      if (p.dns === undefined) p.dns = '';
    });
  }
  return net;
}

export const emptyNetwork = (): Network => ({ devices: [], links: [], notes: [], nextId: 1 });

export const getDev = (net: Network, id: string) => net.devices.find((d) => d.id === id);
export const getIface = (d: Device, name: string) => d.ifaces.find((i) => i.name === name);

export function linkAt(net: Network, dev: string, iface: string): Link | undefined {
  return net.links.find((l) => (l.a.dev === dev && l.a.iface === iface) || (l.b.dev === dev && l.b.iface === iface));
}

export function peerOf(net: Network, dev: string, iface: string): LinkEnd | null {
  const l = linkAt(net, dev, iface);
  if (!l) return null;
  return l.a.dev === dev && l.a.iface === iface ? l.b : l.a;
}

export function freeIface(net: Network, d: Device): Iface | undefined {
  return d.ifaces.find((i) => !i.tunnel && !linkAt(net, d.id, i.name));
}

export function connect(net: Network, aId: string, bId: string, aIf?: string, bIf?: string): Link | string {
  if (aId === bId) return 'Nie można połączyć urządzenia z samym sobą.';
  const a = getDev(net, aId);
  const b = getDev(net, bId);
  if (!a || !b) return 'Nie znaleziono urządzenia.';
  const ai = aIf ? getIface(a, aIf) : freeIface(net, a);
  const bi = bIf ? getIface(b, bIf) : freeIface(net, b);
  if (ai?.tunnel || bi?.tunnel) return 'Do interfejsu tunelu nie podłącza się kabla – to interfejs wirtualny.';
  if (!ai) return `${a.name}: brak wolnego interfejsu.`;
  if (!bi) return `${b.name}: brak wolnego interfejsu.`;
  if (linkAt(net, a.id, ai.name) || linkAt(net, b.id, bi.name)) return 'Interfejs jest już zajęty.';
  const l: Link = { id: 'l' + net.nextId++, a: { dev: a.id, iface: ai.name }, b: { dev: b.id, iface: bi.name } };
  net.links.push(l);
  return l;
}

export function removeDevice(net: Network, id: string) {
  net.devices = net.devices.filter((d) => d.id !== id);
  net.links = net.links.filter((l) => l.a.dev !== id && l.b.dev !== id);
}

export type IfStatus = 'disabled' | 'no-link' | 'up';

export function ifaceStatus(net: Network, d: Device, i: Iface): IfStatus {
  if (!i.up) return 'disabled';
  if (i.tunnel) return 'up';
  const p = peerOf(net, d.id, i.name);
  if (!p) return 'no-link';
  const pd = getDev(net, p.dev);
  const pi = pd && getIface(pd, p.iface);
  return pi && pi.up ? 'up' : 'no-link';
}

export const STATUS_LABEL: Record<IfStatus, string> = {
  disabled: 'wyłączony',
  'no-link': 'brak łącza',
  up: 'aktywny',
};

// ---------- routing (RFC 1812, RFC 8200: najdłuższe dopasowanie prefiksu) ----------

export interface RouteEntry {
  fam: 4 | 6;
  kind: 'connected' | 'static' | 'default' | 'nat64';
  network: string;
  prefix: number;
  iface: string;
  nextHop: string;
  active: boolean;
}

export function routingTable(net: Network, d: Device): RouteEntry[] {
  const r: RouteEntry[] = [];
  const router = d.type === 'router';
  for (const i of d.ifaces) {
    const active = router ? ifaceStatus(net, d, i) === 'up' : i.up;
    if (hasIp(i)) {
      r.push({ fam: 4, kind: 'connected', network: networkOf(i.ip, i.mask)!, prefix: maskToPrefix(i.mask)!, iface: i.name, nextHop: '', active });
    }
    for (const a of globals6(i)) {
      const n = net6(a.addr, a.prefix);
      if (!r.some((x) => x.fam === 6 && x.network === n && x.prefix === a.prefix && x.iface === i.name)) {
        r.push({ fam: 6, kind: 'connected', network: n, prefix: a.prefix, iface: i.name, nextHop: '', active });
      }
    }
  }
  const statics: StaticRoute[] = router
    ? d.routes
    : [
        ...(isIp(d.gateway) ? [{ network: '0.0.0.0', prefix: 0, nextHop: d.gateway }] : []),
        ...(isIp6(d.gateway6) ? [{ network: '::', prefix: 0, nextHop: d.gateway6 }] : []),
      ];
  if (router && d.nat64) {
    r.push({ fam: 6, kind: 'nat64', network: netOf(d.nat64.prefix, d.nat64.len), prefix: d.nat64.len, iface: 'NAT64', nextHop: `→ IPv4 z ${d.nat64.pool}`, active: true });
  }
  for (const s of statics) {
    const f = fam(s.nextHop);
    if (!f || fam(s.network) !== f) continue;
    let iface = '';
    let active = false;
    if (f === 6 && isLinkLocal6(s.nextHop)) {
      const i = router ? undefined : d.ifaces[0];
      iface = i?.name ?? '';
      active = !!i && i.up;
    } else {
      const via = r.find((x) => x.kind === 'connected' && x.fam === f && x.active && inPrefix(s.nextHop, x.network, x.prefix));
      iface = via?.iface ?? '';
      active = !!via;
    }
    r.push({ fam: f, kind: s.prefix === 0 ? 'default' : 'static', network: netOf(s.network, s.prefix), prefix: s.prefix, iface, nextHop: s.nextHop, active });
  }
  return r;
}

export function lookupRoute(table: RouteEntry[], dst: string): RouteEntry | null {
  const f = fam(dst);
  let best: RouteEntry | null = null;
  for (const e of table) {
    if (!e.active || e.fam !== f || e.kind === 'nat64') continue;
    if (inPrefix(dst, e.network, e.prefix) && (!best || e.prefix > best.prefix)) best = e;
  }
  return best;
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export function firstIp(d: Device): string {
  const i = d.ifaces.find(hasIp);
  return i ? cidr(i.ip, i.mask) : '';
}

export function firstIp6(d: Device): string {
  for (const i of d.ifaces) {
    const g = globals6(i)[0];
    if (g) return `${g.addr}/${g.prefix}`;
  }
  return '';
}

/** Wszystkie adresy urządzenia (obie rodziny, bez link-local). */
export function addressesOf(d: Device): string[] {
  const out: string[] = [];
  for (const i of d.ifaces) {
    if (hasIp(i)) out.push(i.ip);
    for (const a of globals6(i)) out.push(a.addr);
  }
  return out;
}

export { fmt6 };
