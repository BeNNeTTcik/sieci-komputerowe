// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Własny, niezależny od producentów język poleceń symulatora.
// Ta sama składnia działa na każdym urządzeniu; dostępne są tylko polecenia
// pasujące do typu urządzenia i do włączonych pakietów protokołów.

import {
  Device,
  Network,
  RecordType,
  SERVICES,
  SERVICE_LABEL,
  STATUS_LABEL,
  ServiceName,
  TYPE_LABEL,
  broadcastOf,
  cidr,
  fam,
  getDev,
  getIface,
  globals6,
  hasIp,
  ifaceStatus,
  inPrefix,
  inSubnet,
  ipToInt,
  isIp,
  isLinkLocal6,
  maskToPrefix,
  netOf,
  networkOf,
  norm6,
  parseAddr,
  linkAt,
  peerOf,
  prefixToMask,
  routingTable,
  sameIp,
  newIface,
  addressesOf,
} from './model';
import { ALL_PACKS, PackId, PackSet, serviceEnabled } from './packs';
import { mixed4 } from './ipv6';
import { fmtClock, EPOCH } from './engine';

export interface CliActions {
  ping(d: Device, host: string, count: number, v: 4 | 6): void;
  trace(d: Device, host: string, v: 4 | 6): void;
  dhcp(d: Device): void;
  autoconf(d: Device): void;
  dot1x(d: Device, user: string, pass: string): void;
  dot1xOff(d: Device): void;
  lookup(d: Device, name: string, type: RecordType): void;
  http(d: Device, host: string, path: string, secure: boolean, v: 4 | 6): void;
  ftp(d: Device, host: string, op: { cmd: 'get' | 'list'; file?: string; user: string; pass: string }, v: 4 | 6): void;
  mailSend(d: Device, to: string, subject: string): void;
  mailCheck(d: Device): void;
  ntp(d: Device, host: string): void;
  print(d: Device, host: string, doc: string, v: 4 | 6): void;
  tcpSend(d: Device, host: string, port: number, size: number, v: 4 | 6): void;
  udpSend(d: Device, host: string, port: number, size: number, v: 4 | 6): void;
}

export interface CliLine {
  text: string;
  kind: 'out' | 'err' | 'hint';
}

export interface CliResult {
  lines: CliLine[];
  clear?: boolean;
  error?: boolean;
}

const out = (...t: string[]): CliLine[] => t.map((text) => ({ text, kind: 'out' as const }));
const fail = (text: string, hint?: string): CliResult => ({
  error: true,
  lines: [{ text: `błąd: ${text}`, kind: 'err' }, ...(hint ? [{ text: hint, kind: 'hint' as const }] : [])],
});
const ok = (...t: string[]): CliResult => ({ lines: out(...t) });

export function prompt(d: Device): string {
  return `${d.name}>`;
}

// ---------- opis poleceń (z niego powstaje też pomoc) ----------

type DT = Device['type'];
interface CmdDoc {
  verb: string;
  for: DT[];
  pack?: PackId | PackId[];
  syntax: string[];
  text: string;
  examples: string[];
}

const ALL: DT[] = ['pc', 'server', 'router', 'switch', 'printer'];
const L3: DT[] = ['pc', 'server', 'router', 'printer'];
const HOSTS: DT[] = ['pc', 'server', 'printer'];

export const COMMANDS: CmdDoc[] = [
  { verb: 'help', for: ALL, syntax: ['help [polecenie]'], text: 'Lista poleceń albo szczegóły jednego polecenia.', examples: ['help', 'help route'] },
  {
    verb: 'show',
    for: ALL,
    syntax: ['show interfaces | ip | routes | arp | neighbors | mac | vlans | dhcp | dns | services | clock | mail | files | jobs | config'],
    text: 'Wyświetla stan urządzenia. „show config” wypisuje polecenia odtwarzające bieżącą konfigurację.',
    examples: ['show interfaces', 'show routes', 'show config'],
  },
  { verb: 'set', for: ALL, syntax: ['set hostname <nazwa>', 'set certificate <nazwa>   (serwer)', 'set mail-domain <domena>   (serwer)'], text: 'Zmienia nazwę urządzenia albo ustawienia serwera.', examples: ['set hostname R-BIURO'] },
  {
    verb: 'interface',
    for: ALL,
    syntax: ['interface <if> up | down', 'interface <port> vlan <id>   (przełącznik, pakiet VLAN)', 'interface <if> loss <0–100>   (pakiet TCP i UDP)'],
    text: 'Włącza/wyłącza interfejs, przypisuje port przełącznika do VLAN-u albo ustawia utratę ramek (%) na podłączonym kablu.',
    examples: ['interface eth0 up', 'interface port3 vlan 10'],
  },
  {
    verb: 'ip',
    for: L3,
    pack: ['ipv4', 'ipv6'],
    syntax: ['ip add <adres>/<prefiks> dev <if>', 'ip del <adres>[/<prefiks>]', 'ip del dev <if>'],
    text: 'Nadaje lub usuwa adres IPv4 (np. 192.168.1.1/24) albo IPv6 (np. 2001:db8:1::1/64). Adres link-local fe80:: powstaje sam.',
    examples: ['ip add 192.168.1.1/24 dev eth0', 'ip add 2001:db8:1::1/64 dev eth0', 'ip del dev eth1'],
  },
  {
    verb: 'ipv6',
    for: ['pc', 'server', 'printer'],
    pack: 'ipv6',
    syntax: ['ipv6 autoconf', 'ipv6 autoconf off'],
    text: 'SLAAC (RFC 4862): host wysyła Router Solicitation, a z prefiksu w Router Advertisement i swojego MAC buduje adres.',
    examples: ['ipv6 autoconf'],
  },
  {
    verb: 'route',
    for: L3,
    pack: ['ipv4', 'ipv6'],
    syntax: ['route add <sieć>/<prefiks> via <next-hop>', 'route add default via <brama>', 'route del <sieć>/<prefiks>', 'route del default [-6]'],
    text: 'Trasy statyczne IPv4 i IPv6 (rodzina wynika z adresu). Na hostach – tylko trasa domyślna (brama). Wygrywa najdłuższy pasujący prefiks.',
    examples: ['route add default via 192.168.1.1', 'route add 10.0.2.0/24 via 10.0.0.2', 'route add 2001:db8:2::/64 via 2001:db8:ff::2'],
  },
  {
    verb: 'dhcp-server',
    for: ['router', 'server'],
    pack: 'dhcp',
    syntax: ['dhcp-server add <nazwa> net <sieć>/<prefiks> gw <brama> range <od>-<do> [dns <serwer>]', 'dhcp-server del <nazwa>'],
    text: 'Pula serwera DHCP (RFC 2131). Opcja dns przekazuje klientom adres serwera DNS.',
    examples: ['dhcp-server add LAN net 192.168.1.0/24 gw 192.168.1.1 range 192.168.1.100-192.168.1.150 dns 192.168.1.10'],
  },
  {
    verb: 'dhcp-relay',
    for: ['router'],
    pack: 'dhcp',
    syntax: ['dhcp-relay set dev <if> server <ip>', 'dhcp-relay del dev <if>'],
    text: 'Przekaźnik DHCP: broadcasty klientów z danej sieci router przesyła unicastem do serwera w innej sieci.',
    examples: ['dhcp-relay set dev eth0 server 10.0.10.10'],
  },
  { verb: 'dhcp-client', for: ['pc', 'printer'], pack: 'dhcp', syntax: ['dhcp-client start', 'dhcp-client release'], text: 'Pobiera konfigurację z serwera DHCP albo ją zwalnia.', examples: ['dhcp-client start'] },
  { verb: 'dns', for: HOSTS, pack: 'dns', syntax: ['dns set <adres serwera>', 'dns flush'], text: 'Ustawia serwer DNS albo czyści pamięć podręczną nazw.', examples: ['dns set 192.168.1.10'] },
  { verb: 'nslookup', for: L3, pack: 'dns', syntax: ['nslookup <nazwa> [A | AAAA | MX]'], text: 'Zapytanie do serwera DNS (RFC 1035).', examples: ['nslookup www.szkola.lab', 'nslookup szkola.lab MX'] },
  { verb: 'vlan', for: ['switch'], pack: 'vlan', syntax: ['vlan add <id> [name <nazwa>]', 'vlan del <id>'], text: 'Tworzy lub usuwa VLAN (1–4094).', examples: ['vlan add 10 name BIURO'] },
  { verb: 'arp', for: L3, pack: 'ipv4', syntax: ['arp flush'], text: 'Czyści tablicę ARP – przy następnym połączeniu zobaczysz znowu zapytania ARP.', examples: ['arp flush'] },
  { verb: 'neighbors', for: L3, pack: 'ipv6', syntax: ['neighbors flush'], text: 'Czyści tablicę sąsiadów IPv6 (NDP).', examples: ['neighbors flush'] },
  { verb: 'mac', for: ['switch'], syntax: ['mac flush'], text: 'Czyści tablicę adresów MAC przełącznika.', examples: ['mac flush'] },
  { verb: 'ping', for: L3, pack: ['ipv4', 'ipv6'], syntax: ['ping <adres | nazwa> [count <n>] [-6]'], text: 'Echo Request / Echo Reply (RFC 792, RFC 4443). -6 wymusza IPv6 przy nazwie.', examples: ['ping 192.168.1.1', 'ping www.szkola.lab -6'] },
  { verb: 'trace', for: L3, pack: ['ipv4', 'ipv6'], syntax: ['trace <adres | nazwa> [-6]'], text: 'Śledzi trasę: sondy z rosnącym TTL/Hop Limit zbierają Time Exceeded od routerów.', examples: ['trace 192.168.2.10'] },
  {
    verb: 'tcp-send',
    for: ['pc', 'server'],
    pack: 'transport',
    syntax: ['tcp-send <host> [port <n>] [size <bajty>] [-6]'],
    text: 'Przesyła dane testowe przez TCP (domyślnie 4000 B na port 9 – usługa Discard, RFC 863): uzgadnianie, segmenty po 1000 B w oknie odbiorcy, potwierdzenia, retransmisje, zamknięcie.',
    examples: ['tcp-send 192.168.2.10', 'tcp-send srv1.lab size 8000'],
  },
  {
    verb: 'udp-send',
    for: ['pc', 'server'],
    pack: 'transport',
    syntax: ['udp-send <host> [port <n>] [size <bajty>] [-6]'],
    text: 'Przesyła te same dane przez UDP: datagramy po 1000 B bez połączenia, potwierdzeń i retransmisji. Zamknięty port – ICMP Port Unreachable.',
    examples: ['udp-send 192.168.2.10', 'udp-send 192.168.2.10 port 5000'],
  },
  { verb: 'http', for: ['pc'], pack: 'web', syntax: ['http <host> [ścieżka] [-6]'], text: 'Pobiera stronę protokołem HTTP (TCP 80) – jawny tekst.', examples: ['http www.szkola.lab', 'http www.szkola.lab /plan'] },
  { verb: 'https', for: ['pc'], pack: 'web', syntax: ['https <host> [ścieżka] [-6]'], text: 'Pobiera stronę przez TLS 1.3 (TCP 443) – dane zaszyfrowane.', examples: ['https www.szkola.lab'] },
  {
    verb: 'ftp',
    for: ['pc'],
    pack: 'ftp',
    syntax: ['ftp <host> get <plik> user <login> pass <hasło>', 'ftp <host> list user <login> pass <hasło>'],
    text: 'Klient FTP: logowanie, tryb EPSV, osobne połączenie danych (RFC 959, RFC 2428).',
    examples: ['ftp ftp.szkola.lab get zadanie.txt user uczen pass haslo123'],
  },
  {
    verb: 'mail',
    for: ['pc'],
    pack: 'mail',
    syntax: ['mail account <adres> pass <hasło>', 'mail send <adres> <temat…>', 'mail check'],
    text: 'Klient poczty: wysyłanie przez SMTP (RFC 5321), odbiór przez POP3 (RFC 1939). Serwer domeny wskazuje rekord MX.',
    examples: ['mail account uczen@szkola.lab pass haslo123', 'mail send nauczyciel@szkola.lab Praca domowa', 'mail check'],
  },
  { verb: 'ntp', for: L3, pack: 'ntp', syntax: ['ntp sync <host>'], text: 'Synchronizuje zegar z serwerem czasu (RFC 5905).', examples: ['ntp sync ntp.szkola.lab'] },
  { verb: 'print', for: ['pc'], pack: 'print', syntax: ['print <adres drukarki> [doc <nazwa>]'], text: 'Zadanie drukowania przez IPP (TCP 631, RFC 8011).', examples: ['print 192.168.1.50 doc referat.pdf'] },
  { verb: 'service', for: ['server'], syntax: ['service list', 'service <dhcp|dns|http|https|ftp|mail|ntp> on | off'], text: 'Włącza lub wyłącza usługi serwera.', examples: ['service list', 'service ftp off'] },
  { verb: 'dns-record', for: ['server'], pack: 'dns', syntax: ['dns-record add <nazwa> A | AAAA | MX <wartość>', 'dns-record del <nazwa> [typ]'], text: 'Rekordy strefy DNS.', examples: ['dns-record add www.szkola.lab A 192.168.1.10', 'dns-record add szkola.lab MX mail.szkola.lab'] },
  { verb: 'web', for: ['server'], pack: 'web', syntax: ['web set <ścieżka> <treść…>', 'web del <ścieżka>'], text: 'Strony serwera WWW.', examples: ['web set /kontakt Sekretariat: pokój 12'] },
  { verb: 'ftp-file', for: ['server'], pack: 'ftp', syntax: ['ftp-file add <nazwa> <treść…>', 'ftp-file del <nazwa>'], text: 'Pliki udostępniane przez FTP.', examples: ['ftp-file add notatki.txt Adresacja IPv6 – powtórka'] },
  { verb: 'user', for: ['server'], pack: ['ftp', 'mail'], syntax: ['user add <login> <hasło>', 'user del <login>'], text: 'Konta użytkowników (logowanie FTP i skrzynki pocztowe).', examples: ['user add nauczyciel tajne1'] },
  {
    verb: 'tunnel',
    for: ['router'],
    pack: 'transition',
    syntax: ['tunnel add <nazwa> mode 6in4|4in6 local <adres> remote <adres>', 'tunnel del <nazwa>'],
    text: 'Tunel: 6in4 przenosi IPv6 w IPv4 (protokół 41, RFC 4213), 4in6 – IPv4 w IPv6 (RFC 2473). Potem nadaj interfejsowi tunelu adres i dodaj trasę przez drugi koniec.',
    examples: ['tunnel add tun0 mode 6in4 local 203.0.113.1 remote 198.51.100.2', 'ip add 2001:db8:ff::1/64 dev tun0', 'route add 2001:db8:2::/64 via 2001:db8:ff::2'],
  },
  {
    verb: 'nat64',
    for: ['router'],
    pack: 'transition',
    syntax: ['nat64 enable [prefix 64:ff9b::/96] pool <adres IPv4>', 'nat64 disable', 'nat64 flush'],
    text: 'Stanowy NAT64 (RFC 6146): pakiety IPv6 do prefiksu NAT64 zamienia na IPv4 wysyłane z adresu pool. Prefiks domyślny 64:ff9b::/96 (RFC 6052).',
    examples: ['nat64 enable prefix 64:ff9b::/96 pool 192.0.2.1', 'show nat64'],
  },
  {
    verb: 'dns64',
    for: ['server'],
    pack: 'transition',
    syntax: ['dns64 enable [prefix 64:ff9b::/96]', 'dns64 disable'],
    text: 'DNS64 (RFC 6147): gdy nazwa ma tylko rekord A, serwer odpowiada na pytanie AAAA adresem złożonym z prefiksu NAT64 i adresu IPv4.',
    examples: ['dns64 enable'],
  },
  {
    verb: 'security',
    for: ['switch'],
    pack: 'security',
    syntax: [
      'security dhcp-guard on|off',
      'security savi on|off',
      'security ra-guard on|off',
      'security port <port> trusted|untrusted',
      'security port <port> max-mac <n>|off [action drop|shutdown]',
      'security port <port> dot1x on|off',
      'security port <port> reset',
      'security binding add <mac> <ip> port <port>',
      'security binding del <ip>',
      'security user add <login> <hasło>',
      'security user del <login>',
    ],
    text: 'Zabezpieczenia przełącznika: ochrona DHCP i weryfikacja źródła (SAVI, RFC 7039/7513), RA-Guard (RFC 6105), limit adresów MAC na porcie, IEEE 802.1X z EAP (RFC 3748).',
    examples: ['security dhcp-guard on', 'security port port8 trusted', 'security port port3 max-mac 1 action shutdown', 'security port port4 dot1x on', 'security user add gosc Wifi2026'],
  },
  { verb: 'dot1x', for: ['pc', 'printer', 'server'], pack: 'security', syntax: ['dot1x login user <login> pass <hasło>', 'dot1x logoff'], text: 'Uwierzytelnienie 802.1X na porcie przełącznika (EAPOL, EAP-MD5).', examples: ['dot1x login user gosc pass Wifi2026'] },
  { verb: 'clear', for: ALL, syntax: ['clear'], text: 'Czyści ekran terminala.', examples: ['clear'] },
];

function packOk(c: CmdDoc, packs: PackSet) {
  if (!c.pack) return true;
  const list = Array.isArray(c.pack) ? c.pack : [c.pack];
  return list.some((p) => packs[p]);
}

export function commandsFor(d: Device, packs: PackSet) {
  return COMMANDS.filter((c) => c.for.includes(d.type) && packOk(c, packs));
}

function helpFor(d: Device, packs: PackSet, topic?: string): CliResult {
  const cmds = commandsFor(d, packs);
  if (topic) {
    const c = cmds.find((x) => x.verb.startsWith(topic.toLowerCase()));
    if (!c) return fail(`brak polecenia „${topic}” na tym urządzeniu przy włączonych pakietach`);
    return ok(...c.syntax.map((s) => `  ${s}`), '', c.text, '', 'Przykłady:', ...c.examples.map((e) => `  ${d.name}> ${e}`));
  }
  const w = Math.max(...cmds.map((c) => c.verb.length)) + 2;
  return {
    lines: [
      ...out(`Polecenia dostępne na: ${TYPE_LABEL[d.type].toLowerCase()} ${d.name}`, ''),
      ...cmds.map((c) => ({ text: `  ${c.verb.padEnd(w)}${c.text.split(/\.\s(?=[A-ZĄĆĘŁŃÓŚŹŻ])/)[0].replace(/\.$/, '')}.`, kind: 'out' as const })),
      { text: 'Wpisz „help <polecenie>”, aby zobaczyć składnię. Słowa można skracać, np. „sh int”.', kind: 'hint' },
    ],
  };
}

// ---------- pomocnicze ----------

function pick(tok: string | undefined, words: string[]): string | null | 'ambiguous' {
  if (!tok) return null;
  const t = tok.toLowerCase();
  if (words.includes(t)) return t;
  const m = words.filter((w) => w.startsWith(t));
  if (m.length === 1) return m[0];
  return m.length > 1 ? 'ambiguous' : null;
}

function findIface(d: Device, name: string | undefined) {
  if (!name) return undefined;
  const n = name.toLowerCase();
  return d.ifaces.find((i) => i.name.toLowerCase() === n) ?? (/^\d+$/.test(n) ? getIface(d, `port${n}`) : undefined);
}

function table(head: string[], rows: string[][]): string[] {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)) + 2);
  const line = (r: string[]) => r.map((c, i) => (c ?? '').padEnd(w[i])).join('').trimEnd();
  return [line(head), line(head.map((_, i) => '-'.repeat(w[i] - 2))), ...rows.map(line)];
}

function kv(tokens: string[], keys: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const k = pick(tokens[i], keys);
    if (k && k !== 'ambiguous') {
      r[k] = tokens[i + 1];
      i++;
    }
  }
  return r;
}

function famPref(packs: PackSet, args: string[]): 4 | 6 {
  if (args.includes('-6')) return 6;
  if (args.includes('-4')) return 4;
  return packs.ipv4 ? 4 : 6;
}

const famOff = (packs: PackSet, f: 4 | 6) => (f === 4 ? !packs.ipv4 : !packs.ipv6);

// ---------- show ----------

function showInterfaces(net: Network, d: Device, packs: PackSet): string[] {
  const sw = d.type === 'switch';
  const rows: string[][] = [];
  for (const i of d.ifaces) {
    const p = peerOf(net, d.id, i.name);
    const pd = p && getDev(net, p.dev);
    const addrs = sw ? ['-'] : [...(packs.ipv4 && hasIp(i) ? [cidr(i.ip, i.mask)] : []), ...(packs.ipv6 ? i.ip6.map((a) => `${a.addr}/${a.prefix}`) : [])];
    const loss = linkAt(net, d.id, i.name)?.loss;
    const peerTxt = i.tunnel ? `tunel ${i.tunnel.mode} → ${i.tunnel.remote}` : pd ? `${pd.name} ${p!.iface}${loss ? ` · utrata ${loss}%` : ''}` : '-';
    const st = i.errDisabled ? 'wyłączony (naruszenie)' : STATUS_LABEL[ifaceStatus(net, d, i)];
    rows.push([i.name, st, addrs[0] ?? '-', i.tunnel ? '-' : i.mac, ...(sw && packs.vlan ? [String(i.vlan)] : []), peerTxt]);
    for (const a of addrs.slice(1)) rows.push(['', '', a, '', ...(sw && packs.vlan ? [''] : []), '']);
  }
  return table(['Interfejs', 'Stan', 'Adres', 'MAC', ...(sw && packs.vlan ? ['VLAN'] : []), 'Połączony z'], rows);
}

function showRoutes(net: Network, d: Device, packs: PackSet): string[] {
  const rt = routingTable(net, d).filter((e) => (e.fam === 4 ? packs.ipv4 : packs.ipv6));
  if (!rt.length) return ['(tablica routingu jest pusta)'];
  const kind = { connected: 'C', static: 'S', default: 'S*', nat64: 'N' } as const;
  return [
    ...table(
      ['Typ', 'Sieć docelowa', 'Następny skok', 'Interfejs', 'Stan'],
      rt.map((e) => [kind[e.kind], `${e.network}/${e.prefix}`, e.nextHop || 'bezpośrednio', e.iface || '?', e.active ? 'aktywna' : 'nieaktywna']),
    ),
    '',
    'C – sieć podłączona bezpośrednio, S – statyczna, S* – domyślna, N – prefiks NAT64',
  ];
}

export function configLines(d: Device, packs: PackSet = ALL_PACKS, net?: Network): string[] {
  const c = configBody(d, packs);
  if (net && packs.transport) for (const l of net.links) if (l.a.dev === d.id && l.loss) c.push(`interface ${l.a.iface} loss ${l.loss}`);
  return c;
}

function configBody(d: Device, packs: PackSet): string[] {
  const c = [`# konfiguracja ${d.name} (${TYPE_LABEL[d.type].toLowerCase()})`, `set hostname ${d.name}`];
  if (d.type === 'switch') {
    if (packs.vlan) for (const v of d.vlans) if (v.id !== 1) c.push(`vlan add ${v.id}${v.name ? ` name ${v.name}` : ''}`);
    for (const i of d.ifaces) {
      if (packs.vlan && i.vlan !== 1) c.push(`interface ${i.name} vlan ${i.vlan}`);
      if (!i.up && !i.errDisabled) c.push(`interface ${i.name} down`);
    }
    if (packs.security) {
      const sec = d.security;
      if (sec.dhcpGuard) c.push('security dhcp-guard on');
      if (sec.savi) c.push('security savi on');
      if (sec.raGuard) c.push('security ra-guard on');
      for (const i of d.ifaces) {
        if (i.trusted) c.push(`security port ${i.name} trusted`);
        if (i.maxMac) c.push(`security port ${i.name} max-mac ${i.maxMac} action ${i.onViolation ?? 'drop'}`);
        if (i.dot1x) c.push(`security port ${i.name} dot1x on`);
      }
      for (const b of d.bindings) if (b.origin === 'static') c.push(`security binding add ${b.mac} ${b.ip} port ${b.port}`);
      for (const u of sec.users) c.push(`security user add ${u.name} ${u.pass}`);
    }
    return c;
  }
  const dyn = d.type !== 'router' && d.dhcp;
  for (const i of d.ifaces) {
    if (i.tunnel) c.push(`tunnel add ${i.name} mode ${i.tunnel.mode} local ${i.tunnel.local} remote ${i.tunnel.remote}`);
    c.push(`interface ${i.name} ${i.up ? 'up' : 'down'}`);
    if (packs.ipv4 && hasIp(i) && !dyn) c.push(`ip add ${cidr(i.ip, i.mask)} dev ${i.name}`);
    if (packs.ipv6) for (const a of i.ip6.filter((x) => x.origin === 'static')) c.push(`ip add ${a.addr}/${a.prefix} dev ${i.name}`);
    if (packs.dhcp && i.relay) c.push(`dhcp-relay set dev ${i.name} server ${i.relay}`);
  }
  if (d.type === 'router') {
    for (const r of d.routes) if (fam(r.nextHop) === 4 ? packs.ipv4 : packs.ipv6) c.push(`route add ${r.prefix === 0 ? 'default' : `${r.network}/${r.prefix}`} via ${r.nextHop}`);
    if (packs.transition && d.nat64) c.push(`nat64 enable prefix ${d.nat64.prefix}/${d.nat64.len} pool ${d.nat64.pool}`);
  } else {
    if (packs.dhcp && dyn) c.push('dhcp-client start');
    else if (packs.ipv4 && d.gateway) c.push(`route add default via ${d.gateway}`);
    if (packs.ipv6 && d.slaac) c.push('ipv6 autoconf');
    else if (packs.ipv6 && d.gateway6) c.push(`route add default via ${d.gateway6}`);
    if (packs.dns && d.dns && !dyn) c.push(`dns set ${d.dns}`);
  }
  if (packs.dhcp) for (const p of d.pools) c.push(`dhcp-server add ${p.name} net ${cidr(p.network, p.mask)} gw ${p.gateway} range ${p.start}-${p.end}${p.dns ? ` dns ${p.dns}` : ''}`);
  if (d.type === 'server') {
    for (const s of SERVICES) if (serviceEnabled(packs, s)) c.push(`service ${s} ${d.services[s] ? 'on' : 'off'}`);
    if (packs.dns) for (const r of d.records) c.push(`dns-record add ${r.name} ${r.type} ${r.value}`);
    if (packs.web) {
      c.push(`set certificate ${d.certName}`);
      for (const w of d.web) c.push(`web set ${w.path} ${w.body.replace(/\n/g, ' ')}`);
    }
    if (packs.ftp) for (const f of d.files) c.push(`ftp-file add ${f.name} ${f.body.replace(/\n/g, ' ')}`);
    if (packs.ftp || packs.mail) for (const u of d.users) c.push(`user add ${u.name} ${u.pass}`);
    if (packs.mail) c.push(`set mail-domain ${d.mailDomain}`);
    if (packs.transition && d.dns64) c.push(`dns64 enable prefix ${d.dns64.prefix}/${d.dns64.len}`);
  }
  if (d.type === 'pc' && packs.mail && d.mailAccount.addr) c.push(`mail account ${d.mailAccount.addr} pass ${d.mailAccount.pass}`);
  return c;
}

function show(net: Network, d: Device, args: string[], packs: PackSet): CliResult {
  const l3 = d.type !== 'switch';
  const topics = [
    'interfaces',
    ...(l3 ? ['ip', 'routes', 'clock'] : ['mac']),
    ...(l3 && packs.ipv4 ? ['arp'] : []),
    ...(l3 && packs.ipv6 ? ['neighbors'] : []),
    ...(!l3 && packs.vlan ? ['vlans'] : []),
    ...(packs.dhcp && d.type !== 'switch' ? ['dhcp'] : []),
    ...(packs.dns && l3 ? ['dns'] : []),
    ...(d.type === 'server' ? ['services'] : []),
    ...(packs.mail && (d.type === 'pc' || d.type === 'server') ? ['mail'] : []),
    ...(packs.ftp && (d.type === 'server' || d.type === 'pc') ? ['files'] : []),
    ...(d.type === 'printer' ? ['jobs'] : []),
    ...(d.type === 'router' && packs.transition ? ['tunnels', 'nat64'] : []),
    ...(d.type === 'switch' && packs.security ? ['security'] : []),
    'config',
  ];
  const t = pick(args[0], topics);
  if (!t) return fail('podaj, co pokazać', `show ${topics.join(' | ')}`);
  if (t === 'ambiguous') return fail(`niejednoznaczne „${args[0]}”`, `show ${topics.join(' | ')}`);
  switch (t) {
    case 'interfaces':
      return ok(...showInterfaces(net, d, packs));
    case 'ip': {
      const rows: string[][] = [];
      for (const i of d.ifaces) {
        if (packs.ipv4 && hasIp(i)) rows.push([i.name, cidr(i.ip, i.mask), `${networkOf(i.ip, i.mask)}/${maskToPrefix(i.mask)}`, 'IPv4']);
        if (packs.ipv6) for (const a of i.ip6) rows.push([i.name, `${a.addr}/${a.prefix}`, a.origin === 'link' ? 'link-local' : `${netOf(a.addr, a.prefix)}/${a.prefix}`, a.origin === 'auto' ? 'IPv6 SLAAC' : 'IPv6']);
      }
      const extra: string[] = [];
      if (d.type !== 'router') {
        if (packs.ipv4) extra.push(`Brama IPv4: ${d.gateway || '-'}`);
        if (packs.ipv6) extra.push(`Brama IPv6: ${d.gateway6 || '-'}`);
        if (packs.dns) extra.push(`Serwer DNS: ${d.dns || '-'}`);
      }
      return ok(...(rows.length ? table(['Interfejs', 'Adres', 'Sieć', 'Rodzaj'], rows) : ['(brak adresów)']), ...(extra.length ? ['', ...extra] : []));
    }
    case 'routes':
      return ok(...showRoutes(net, d, packs));
    case 'arp':
      return ok(...(d.arp.length ? table(['Adres IP', 'Adres MAC', 'Interfejs'], d.arp.map((a) => [a.ip, a.mac, a.iface])) : ['(tablica ARP jest pusta)']));
    case 'neighbors':
      return ok(...(d.nd.length ? table(['Adres IPv6', 'Adres MAC', 'Interfejs'], d.nd.map((a) => [a.ip, a.mac, a.iface])) : ['(tablica sąsiadów jest pusta)']));
    case 'mac':
      return ok(...(d.macTable.length ? table(['VLAN', 'Adres MAC', 'Port'], d.macTable.map((m) => [String(m.vlan), m.mac, m.port])) : ['(tablica MAC jest pusta)']));
    case 'vlans':
      return ok(...table(['VLAN', 'Nazwa', 'Porty'], d.vlans.map((v) => [String(v.id), v.name, d.ifaces.filter((i) => i.vlan === v.id).map((i) => i.name).join(', ') || '-'])));
    case 'dhcp':
      if (d.type === 'router' || d.type === 'server') {
        return ok(
          'Pule:',
          ...(d.pools.length ? table(['Nazwa', 'Sieć', 'Brama', 'Zakres', 'DNS'], d.pools.map((p) => [p.name, cidr(p.network, p.mask), p.gateway, `${p.start}-${p.end}`, p.dns || '-'])) : ['(brak pul)']),
          ...(d.type === 'router' && d.ifaces.some((i) => i.relay) ? ['', 'Przekaźnik:', ...d.ifaces.filter((i) => i.relay).map((i) => `  ${i.name} → ${i.relay}`)] : []),
          '',
          'Dzierżawy:',
          ...(d.leases.length ? table(['Adres IP', 'MAC klienta', 'Host', 'Pula'], d.leases.map((l) => [l.ip, l.mac, l.host, l.pool])) : ['(brak dzierżaw)']),
        );
      }
      return ok(`Klient DHCP: ${d.dhcp ? 'włączony' : 'wyłączony (adres statyczny)'}`, `Adres: ${hasIp(d.ifaces[0]) ? cidr(d.ifaces[0].ip, d.ifaces[0].mask) : '-'}`, `Brama: ${d.gateway || '-'}`);
    case 'dns': {
      const lines = [`Serwer DNS: ${d.dns || '-'}`, 'Pamięć podręczna:', ...(d.dnsCache.length ? table(['Nazwa', 'Typ', 'Wartość'], d.dnsCache.map((r) => [r.name, r.type, r.value])) : ['  (pusta)'])];
      if (d.type === 'server') lines.push('', 'Strefa (rekordy serwera):', ...(d.records.length ? table(['Nazwa', 'Typ', 'Wartość'], d.records.map((r) => [r.name, r.type, r.value])) : ['  (brak rekordów)']));
      return ok(...lines);
    }
    case 'services':
      return ok(...table(['Usługa', 'Stan'], SERVICES.filter((s) => serviceEnabled(packs, s)).map((s) => [SERVICE_LABEL[s], d.services[s] ? 'włączona' : 'wyłączona'])));
    case 'clock':
      return ok(`Czas urządzenia: ${fmtClock(EPOCH + d.clock)} (przy kroku 0)`, `Przesunięcie względem czasu wzorcowego: ${(d.clock / 1000).toFixed(3)} s`);
    case 'mail':
      if (d.type === 'server') {
        return ok(`Domena: ${d.mailDomain}`, ...table(['Skrzynka', 'Wiadomości'], d.users.map((u) => [`${u.name}@${d.mailDomain}`, String(u.mail.length)])));
      }
      return ok(`Konto: ${d.mailAccount.addr || '(nie ustawiono)'}`, ...(d.inbox.length ? table(['Od', 'Temat'], d.inbox.map((m) => [m.from, m.subject])) : ['(skrzynka odbiorcza pusta)']));
    case 'files':
      if (d.type === 'server') return ok(...(d.files.length ? table(['Plik', 'Rozmiar'], d.files.map((f) => [f.name, `${f.body.length} B`])) : ['(brak plików)']));
      return ok(...(d.downloads.length ? table(['Plik', 'Skąd', 'Rozmiar'], d.downloads.map((f) => [f.name, f.from, `${f.body.length} B`])) : ['(brak pobranych plików)']));
    case 'jobs':
      return ok(...(d.jobs.length ? table(['Nr', 'Dokument', 'Od'], d.jobs.map((j) => [String(j.id), j.doc, j.from])) : ['(brak wydruków)']));
    case 'config':
      return ok(...configLines(d, packs, net));
    case 'tunnels': {
      const t = d.ifaces.filter((i) => i.tunnel);
      return ok(
        ...(t.length
          ? table(
              ['Tunel', 'Tryb', 'Lokalny', 'Zdalny', 'Stan', 'Adresy'],
              t.map((i) => [i.name, i.tunnel!.mode, i.tunnel!.local, i.tunnel!.remote, i.up ? 'włączony' : 'wyłączony', [...(hasIp(i) ? [cidr(i.ip, i.mask)] : []), ...globals6(i).map((a) => `${a.addr}/${a.prefix}`)].join(', ') || '-']),
            )
          : ['(brak tuneli)']),
      );
    }
    case 'nat64':
      if (!d.nat64) return ok('NAT64 wyłączony. Włącz: nat64 enable prefix 64:ff9b::/96 pool <adres IPv4>');
      return ok(
        `NAT64: prefiks ${d.nat64.prefix}/${d.nat64.len}, adres IPv4 ${d.nat64.pool}`,
        '',
        ...(d.natTable.length
          ? table(
              ['Protokół', 'Strona IPv6', 'Strona IPv4', 'Cel'],
              d.natTable.map((e) => [e.proto, `[${e.v6}]${e.proto === 'ICMP' ? ` id ${e.v6port}` : `:${e.v6port}`}`, `${d.nat64!.pool}${e.proto === 'ICMP' ? ` id ${e.v4port}` : `:${e.v4port}`}`, `${e.v4}${e.proto === 'ICMP' ? '' : `:${e.port}`}`]),
            )
          : ['(tablica translacji jest pusta)']),
      );
    case 'security': {
      const sec = d.security;
      const onoff = (b: boolean) => (b ? 'włączona' : 'wyłączona');
      return ok(
        `Ochrona DHCP: ${onoff(sec.dhcpGuard)} · SAVI (weryfikacja źródła): ${onoff(sec.savi)} · RA-Guard: ${onoff(sec.raGuard)}`,
        '',
        ...table(
          ['Port', 'Zaufany', 'Limit MAC', '802.1X', 'Stan'],
          d.ifaces.map((i) => [
            i.name,
            i.trusted ? 'tak' : '-',
            i.maxMac ? `${i.maxMac} (${i.onViolation === 'shutdown' ? 'wyłącz port' : 'odrzucaj'})` : '-',
            i.dot1x ? (i.authMac ? `autoryzowany (${i.authUser})` : 'nieautoryzowany') : '-',
            i.errDisabled ? `wyłączony – naruszenie (${i.violations ?? 0})` : i.violations ? `naruszenia: ${i.violations}` : 'ok',
          ]),
        ),
        '',
        'Powiązania IP ↔ MAC ↔ port:',
        ...(d.bindings.length ? table(['Adres IP', 'MAC', 'Port', 'VLAN', 'Źródło'], d.bindings.map((b) => [b.ip, b.mac, b.port, String(b.vlan), b.origin === 'dhcp' ? 'DHCP' : 'ręcznie'])) : ['  (brak)']),
        '',
        `Konta 802.1X: ${sec.users.map((u) => u.name).join(', ') || '(brak)'}`,
      );
    }
  }
  return fail('nieznany temat');
}

// ---------- konfiguracja ----------

function cmdInterface(net: Network, d: Device, a: string[], packs: PackSet): CliResult {
  const i = findIface(d, a[0]);
  if (!i) return fail(`nie ma interfejsu „${a[0] ?? ''}”`, `Interfejsy: ${d.ifaces.map((x) => x.name).join(', ')}`);
  const acts = [...(d.type === 'switch' && packs.vlan ? ['up', 'down', 'vlan'] : ['up', 'down']), ...(packs.transport ? ['loss'] : [])];
  const act = pick(a[1], acts);
  if (!act || act === 'ambiguous') return fail('brak akcji', `interface ${i.name} ${acts.join(' | ')}`);
  if (act === 'loss') {
    const l = linkAt(net, d.id, i.name);
    if (!l) return fail(`do ${i.name} nie podłączono kabla`);
    const raw = (a[2] ?? '').toLowerCase().replace('%', '');
    const pct = raw === 'off' ? 0 : Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return fail('podaj procent utraconych ramek 0–100', `interface ${i.name} loss 20`);
    l.loss = Math.round(pct) || undefined;
    return ok(l.loss ? `Kabel na ${i.name}: ginie średnio ${l.loss}% ramek (w obie strony).` : `Kabel na ${i.name}: bez strat.`);
  }
  if (act === 'vlan') {
    const id = Number(a[2]);
    if (!Number.isInteger(id) || id < 1 || id > 4094) return fail('numer VLAN musi być z zakresu 1–4094');
    const lines: CliLine[] = [];
    if (!d.vlans.some((v) => v.id === id)) {
      d.vlans.push({ id, name: `VLAN${id}` });
      lines.push({ text: `VLAN ${id} nie istniał – utworzono go.`, kind: 'hint' });
    }
    i.vlan = id;
    return { lines: [...out(`${i.name}: port dostępowy w VLAN ${id}`), ...lines] };
  }
  i.up = act === 'up';
  return ok(`${i.name}: ${i.up ? 'włączony' : 'wyłączony'} (stan łącza: ${STATUS_LABEL[ifaceStatus(net, d, i)]})`);
}

function hostRange(ip: string, mask: string) {
  const n = ipToInt(networkOf(ip, mask)!)!;
  const b = ipToInt(broadcastOf(ip, mask)!)!;
  const f = (x: number) => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join('.');
  return `${f(n + 1)} – ${f(b - 1)}`;
}

function cmdIp(d: Device, a: string[], packs: PackSet): CliResult {
  const act = pick(a[0], ['add', 'del']);
  if (!act || act === 'ambiguous') return fail('brak akcji', 'ip add <adres>/<prefiks> dev <if>  |  ip del <adres>  |  ip del dev <if>');
  const rest = a.slice(1).filter((x) => x.toLowerCase() !== 'dev');
  const single = d.type === 'router' ? undefined : d.ifaces[0];
  if (act === 'del') {
    const asIf = findIface(d, rest[0]);
    if (asIf || (!rest[0] && single)) {
      const i = asIf ?? single!;
      if (packs.ipv4) {
        i.ip = '';
        i.mask = '';
      }
      if (packs.ipv6) i.ip6 = i.ip6.filter((x) => x.origin === 'link');
      return ok(`${i.name}: adresy usunięte (link-local zostaje)`);
    }
    const target = rest[0]?.split('/')[0] ?? '';
    for (const i of d.ifaces) {
      if (i.ip === target) {
        i.ip = '';
        i.mask = '';
        return ok(`${i.name}: usunięto ${target}`);
      }
      const k = i.ip6.find((x) => sameIp(x.addr, target) && x.origin !== 'link');
      if (k) {
        i.ip6 = i.ip6.filter((x) => x !== k);
        return ok(`${i.name}: usunięto ${k.addr}`);
      }
    }
    return fail(`nie znaleziono adresu ${rest[0] ?? ''}`, 'Podaj adres albo interfejs: ip del dev eth0');
  }
  const c = parseAddr(rest[0], rest[1]);
  if (!c) return fail('niepoprawny adres – użyj notacji adres/prefiks', 'np. ip add 192.168.1.10/24 dev eth0  albo  ip add 2001:db8:1::10/64 dev eth0');
  if (famOff(packs, c.fam)) return fail(`pakiet IPv${c.fam} jest wyłączony w tym projekcie`, 'Włącz go w menu „Pakiety”.');
  const ifName = rest[c.used];
  const i = ifName ? findIface(d, ifName) : single;
  if (!i) return fail(ifName ? `nie ma interfejsu „${ifName}”` : 'podaj interfejs (dev eth0, eth1…)');
  const lines: CliLine[] = [];
  if (c.fam === 4) {
    const mask = prefixToMask(c.prefix);
    if (c.prefix === 0 || c.prefix === 32) return fail(`prefiks /${c.prefix} nie nadaje się dla interfejsu`);
    if (c.prefix <= 30 && (c.ip === networkOf(c.ip, mask) || c.ip === broadcastOf(c.ip, mask))) {
      return fail(`${c.ip} to adres ${c.ip === networkOf(c.ip, mask) ? 'sieci' : 'rozgłoszeniowy'} dla /${c.prefix}, nie adres hosta`, `Adresy hostów w tej sieci: ${hostRange(c.ip, mask)}`);
    }
    for (const o of d.ifaces) {
      if (o === i || !hasIp(o)) continue;
      if (inSubnet(c.ip, o.ip, o.mask) || inSubnet(o.ip, c.ip, mask)) {
        return fail(`sieć ${networkOf(c.ip, mask)}/${c.prefix} nakłada się z ${o.name} (${cidr(o.ip, o.mask)})`, 'Każdy interfejs routera musi należeć do innej sieci.');
      }
    }
    i.ip = c.ip;
    i.mask = mask;
    if (d.type !== 'router') d.dhcp = false;
    lines.push(...out(`${i.name}: ${c.ip}/${c.prefix} (sieć ${networkOf(c.ip, mask)}, broadcast ${broadcastOf(c.ip, mask)})`));
  } else {
    if (isLinkLocal6(c.ip)) return fail('adres link-local powstaje automatycznie z adresu MAC – nadaj adres globalny', 'np. 2001:db8:1::1/64');
    if (c.prefix < 1 || c.prefix > 127) return fail(`prefiks /${c.prefix} nie nadaje się dla interfejsu`, 'W sieciach lokalnych IPv6 stosuje się /64.');
    for (const o of d.ifaces) {
      if (o === i) continue;
      const clash = globals6(o).find((x) => inPrefix(c.ip, x.addr, Math.min(x.prefix, c.prefix)));
      if (clash) return fail(`prefiks nakłada się z ${o.name} (${clash.addr}/${clash.prefix})`, 'Każdy interfejs routera musi należeć do innej sieci.');
    }
    i.ip6 = i.ip6.filter((x) => !(x.origin === 'static' && inPrefix(x.addr, c.ip, c.prefix)));
    i.ip6.push({ addr: norm6(c.ip), prefix: c.prefix, origin: 'static' });
    lines.push(...out(`${i.name}: ${norm6(c.ip)}/${c.prefix} (prefiks ${netOf(c.ip, c.prefix)}/${c.prefix})`));
    if (c.prefix !== 64) lines.push({ text: 'SLAAC działa tylko z prefiksem /64.', kind: 'hint' });
  }
  if (!i.up) lines.push({ text: `Interfejs ${i.name} jest wyłączony – włącz go: interface ${i.name} up`, kind: 'hint' });
  return { lines };
}

function cmdRoute(d: Device, a: string[], packs: PackSet): CliResult {
  const act = pick(a[0], ['add', 'del']);
  if (!act || act === 'ambiguous') return fail('brak akcji', 'route add <sieć>/<prefiks> via <ip>  |  route del <sieć>/<prefiks>');
  const host = d.type !== 'router';
  const vi = a.findIndex((x) => x.toLowerCase() === 'via');
  const nh = vi >= 0 ? a[vi + 1] : undefined;
  const isDef = a[1]?.toLowerCase() === 'default';
  let f: 4 | 6;
  let network: string;
  let prefix: number;
  if (isDef) {
    f = nh ? (fam(nh) as 4 | 6) : a.includes('-6') ? 6 : packs.ipv4 ? 4 : 6;
    network = f === 6 ? '::' : '0.0.0.0';
    prefix = 0;
  } else {
    const t = parseAddr(a[1], a[2]);
    if (!t) return fail('podaj sieć w notacji adres/prefiks albo „default”', 'np. route add 10.0.2.0/24 via 10.0.0.2');
    f = t.fam;
    network = netOf(t.ip, t.prefix);
    prefix = t.prefix;
  }
  if (!f) return fail('niepoprawny adres następnego skoku');
  if (famOff(packs, f)) return fail(`pakiet IPv${f} jest wyłączony w tym projekcie`);
  if (host && prefix !== 0) return fail('komputer, serwer i drukarka obsługują tylko trasę domyślną', 'route add default via <adres bramy>');
  if (act === 'del') {
    if (host) {
      if (f === 4) d.gateway = '';
      else d.gateway6 = '';
      return ok(`Usunięto bramę IPv${f}.`);
    }
    const before = d.routes.length;
    d.routes = d.routes.filter((r) => !(sameIp(r.network, network) && r.prefix === prefix));
    return before === d.routes.length ? fail(`nie ma trasy ${network}/${prefix}`) : ok(`Usunięto trasę ${network}/${prefix}.`);
  }
  if (!nh || fam(nh) !== f) return fail(`podaj następny skok IPv${f}: via <adres>`);
  const next = f === 6 ? norm6(nh) : nh;
  const lines: CliLine[] = [];
  if (!isDef && a[1].split('/')[0] !== network && f === 4) lines.push({ text: `Uwaga: adres miał bity hosta – zapisano jako sieć ${network}.`, kind: 'hint' });
  if (f === 6 && isLinkLocal6(next) && !host) return fail('na routerze podaj globalny adres następnego skoku');
  const direct = (f === 6 && isLinkLocal6(next)) || d.ifaces.some((i) => (f === 4 ? hasIp(i) && inSubnet(next, i.ip, i.mask) : globals6(i).some((x) => inPrefix(next, x.addr, x.prefix))));
  if (!direct) lines.push({ text: `${next} nie leży w żadnej podłączonej sieci – trasa będzie nieaktywna, dopóki to się nie zmieni.`, kind: 'hint' });
  if (host) {
    if (f === 4) d.gateway = next;
    else d.gateway6 = next;
    return { lines: [...out(`Brama domyślna IPv${f}: ${next}`), ...lines] };
  }
  d.routes = d.routes.filter((r) => !(sameIp(r.network, network) && r.prefix === prefix));
  d.routes.push({ network, prefix, nextHop: next });
  return { lines: [...out(`Dodano trasę ${prefix === 0 ? (f === 6 ? 'domyślną ::/0' : 'domyślną 0.0.0.0/0') : `${network}/${prefix}`} przez ${next}`), ...lines] };
}

function cmdDhcpServer(d: Device, a: string[]): CliResult {
  const act = pick(a[0], ['add', 'del']);
  const syntax = 'dhcp-server add <nazwa> net <sieć>/<prefiks> gw <brama> range <od>-<do> [dns <serwer>]';
  if (!act || act === 'ambiguous') return fail('brak akcji', syntax);
  const name = a[1];
  if (!name) return fail('podaj nazwę puli', syntax);
  if (act === 'del') {
    const n = d.pools.length;
    d.pools = d.pools.filter((p) => p.name !== name);
    return n === d.pools.length ? fail(`nie ma puli „${name}”`) : ok(`Usunięto pulę ${name}.`);
  }
  const o = kv(a.slice(2), ['net', 'gw', 'range', 'dns']);
  const n = parseAddr(o.net);
  if (!n || n.fam !== 4) return fail('brak lub błędne „net <sieć>/<prefiks>” (pula DHCP jest dla IPv4)', syntax);
  const mask = prefixToMask(n.prefix);
  const network = networkOf(n.ip, mask)!;
  if (!o.gw || !isIp(o.gw) || !inSubnet(o.gw, network, mask)) return fail('brama (gw) musi być adresem z tej sieci', syntax);
  const [s, e] = (o.range ?? '').split('-');
  if (!isIp(s) || !isIp(e) || !inSubnet(s, network, mask) || !inSubnet(e, network, mask) || ipToInt(s)! > ipToInt(e)!) {
    return fail('zakres (range od-do) musi leżeć w sieci puli, „od” ≤ „do”', syntax);
  }
  if (o.dns && !fam(o.dns)) return fail('dns musi być adresem IP serwera DNS');
  const lines: CliLine[] = [];
  if (d.type === 'router' && !d.ifaces.some((i) => hasIp(i) && inSubnet(i.ip, network, mask))) {
    lines.push({ text: `Żaden interfejs routera nie należy do sieci ${network}/${n.prefix} – pula nie obsłuży klientów.`, kind: 'hint' });
  }
  if (d.type === 'server' && !d.services.dhcp) lines.push({ text: 'Usługa DHCP na serwerze jest wyłączona – włącz: service dhcp on', kind: 'hint' });
  d.pools = d.pools.filter((p) => p.name !== name);
  d.pools.push({ name, network, mask, gateway: o.gw, start: s, end: e, dns: o.dns ?? '' });
  return { lines: [...out(`Pula ${name}: ${network}/${n.prefix}, brama ${o.gw}, zakres ${s}–${e}${o.dns ? `, DNS ${o.dns}` : ''}`), ...lines] };
}

function cmdVlan(d: Device, a: string[]): CliResult {
  const act = pick(a[0], ['add', 'del']);
  if (!act || act === 'ambiguous') return fail('brak akcji', 'vlan add <id> [name <nazwa>]  |  vlan del <id>');
  const id = Number(a[1]);
  if (!Number.isInteger(id) || id < 1 || id > 4094) return fail('numer VLAN musi być z zakresu 1–4094');
  if (act === 'del') {
    if (id === 1) return fail('VLAN 1 jest domyślny i nie można go usunąć');
    if (!d.vlans.some((v) => v.id === id)) return fail(`VLAN ${id} nie istnieje`);
    d.vlans = d.vlans.filter((v) => v.id !== id);
    const moved = d.ifaces.filter((i) => i.vlan === id);
    moved.forEach((i) => (i.vlan = 1));
    d.macTable = d.macTable.filter((m) => m.vlan !== id);
    return ok(`Usunięto VLAN ${id}.${moved.length ? ` Porty ${moved.map((i) => i.name).join(', ')} wróciły do VLAN 1.` : ''}`);
  }
  const ni = a.findIndex((x) => x.toLowerCase() === 'name');
  const name = ni >= 0 && a[ni + 1] ? a[ni + 1] : `VLAN${id}`;
  const v = d.vlans.find((x) => x.id === id);
  if (v) v.name = name;
  else d.vlans.push({ id, name });
  d.vlans.sort((x, y) => x.id - y.id);
  return ok(`VLAN ${id} (${name}) ${v ? 'zaktualizowany' : 'utworzony'}.`);
}

function cmdServer(d: Device, verb: string, a: string[], packs: PackSet): CliResult {
  switch (verb) {
    case 'service': {
      const avail = SERVICES.filter((s) => serviceEnabled(packs, s));
      if (!a[0] || pick(a[0], ['list']) === 'list') return ok(...table(['Usługa', 'Stan'], avail.map((s) => [SERVICE_LABEL[s], d.services[s] ? 'włączona' : 'wyłączona'])));
      const s = pick(a[0], avail) as ServiceName | null | 'ambiguous';
      if (!s || s === 'ambiguous') return fail(`nieznana usługa „${a[0]}”`, `Dostępne: ${avail.join(', ')}`);
      const on = pick(a[1], ['on', 'off']);
      if (on !== 'on' && on !== 'off') return fail(`składnia: service ${s} on | off`);
      d.services[s] = on === 'on';
      return ok(`Usługa ${SERVICE_LABEL[s]}: ${d.services[s] ? 'włączona' : 'wyłączona'}`);
    }
    case 'dns-record': {
      const act = pick(a[0], ['add', 'del']);
      const name = a[1]?.toLowerCase();
      if (!act || act === 'ambiguous' || !name) return fail('składnia: dns-record add <nazwa> A|AAAA|MX <wartość>  |  dns-record del <nazwa> [typ]');
      const type = a[2]?.toUpperCase() as RecordType | undefined;
      if (act === 'del') {
        const n = d.records.length;
        d.records = d.records.filter((r) => !(r.name === name && (!type || r.type === type)));
        return n === d.records.length ? fail(`nie ma rekordu ${name}`) : ok(`Usunięto rekord(y) ${name}${type ? ` ${type}` : ''}.`);
      }
      if (!type || !['A', 'AAAA', 'MX'].includes(type)) return fail('typ rekordu: A, AAAA albo MX');
      let value = a[3] ?? '';
      if (type === 'A' && !isIp(value)) return fail('rekord A musi wskazywać adres IPv4');
      if (type === 'AAAA') {
        if (fam(value) !== 6) return fail('rekord AAAA musi wskazywać adres IPv6');
        value = norm6(value);
      }
      if (type === 'MX' && (!value || fam(value))) return fail('rekord MX wskazuje nazwę serwera poczty, nie adres', 'np. dns-record add szkola.lab MX mail.szkola.lab');
      d.records = d.records.filter((r) => !(r.name === name && r.type === type));
      d.records.push({ name, type, value: type === 'MX' ? value.toLowerCase() : value });
      return ok(`Rekord ${name} ${type} ${value} dodany.`);
    }
    case 'web': {
      const act = pick(a[0], ['set', 'del']);
      const path = a[1];
      if (!act || act === 'ambiguous' || !path?.startsWith('/')) return fail('składnia: web set /ścieżka <treść…>  |  web del /ścieżka');
      if (act === 'del') {
        d.web = d.web.filter((w) => w.path !== path);
        return ok(`Usunięto stronę ${path}.`);
      }
      const body = a.slice(2).join(' ');
      if (!body) return fail('podaj treść strony');
      d.web = d.web.filter((w) => w.path !== path);
      d.web.push({ path, body });
      return ok(`Strona ${path} zapisana (${body.length} znaków).`);
    }
    case 'ftp-file': {
      const act = pick(a[0], ['add', 'del']);
      const name = a[1];
      if (!act || act === 'ambiguous' || !name) return fail('składnia: ftp-file add <nazwa> <treść…>  |  ftp-file del <nazwa>');
      if (act === 'del') {
        d.files = d.files.filter((f) => f.name !== name);
        return ok(`Usunięto plik ${name}.`);
      }
      d.files = d.files.filter((f) => f.name !== name);
      d.files.push({ name, body: a.slice(2).join(' ') || '(pusty plik)' });
      return ok(`Plik ${name} udostępniony.`);
    }
    case 'user': {
      const act = pick(a[0], ['add', 'del']);
      const name = a[1];
      if (!act || act === 'ambiguous' || !name) return fail('składnia: user add <login> <hasło>  |  user del <login>');
      if (act === 'del') {
        d.users = d.users.filter((u) => u.name !== name);
        return ok(`Usunięto konto ${name}.`);
      }
      if (!a[2]) return fail('podaj hasło');
      const u = d.users.find((x) => x.name === name);
      if (u) u.pass = a[2];
      else d.users.push({ name, pass: a[2], mail: [] });
      return ok(`Konto ${name} ${u ? 'zaktualizowane' : 'utworzone'}${packs.mail ? ` (skrzynka ${name}@${d.mailDomain})` : ''}.`);
    }
  }
  return fail('nieobsłużone polecenie');
}

// ---------- przejście IPv4 ↔ IPv6 ----------

function cmdTunnel(d: Device, a: string[]): CliResult {
  const act = pick(a[0], ['add', 'del']);
  const syntax = 'tunnel add <nazwa> mode 6in4|4in6 local <adres> remote <adres>  |  tunnel del <nazwa>';
  const name = a[1];
  if (!act || act === 'ambiguous' || !name) return fail('brak akcji albo nazwy', syntax);
  if (act === 'del') {
    const i = d.ifaces.find((x) => x.name === name && x.tunnel);
    if (!i) return fail(`nie ma tunelu ${name}`);
    d.ifaces = d.ifaces.filter((x) => x !== i);
    return ok(`Usunięto tunel ${name}. Trasy przez niego stały się nieaktywne.`);
  }
  if (!/^[a-z][a-z0-9]{0,9}$/i.test(name)) return fail('nazwa: litery i cyfry, np. tun0');
  if (d.ifaces.some((x) => x.name === name)) return fail(`interfejs ${name} już istnieje`);
  const o = kv(a.slice(2), ['mode', 'local', 'remote']);
  const mode = o.mode?.toLowerCase();
  if (mode !== '6in4' && mode !== '4in6') return fail('tryb: 6in4 (IPv6 w IPv4) albo 4in6 (IPv4 w IPv6)', syntax);
  const want = mode === '6in4' ? 4 : 6;
  if (fam(o.local ?? '') !== want || fam(o.remote ?? '') !== want) return fail(`w trybie ${mode} końce tunelu (local, remote) to adresy IPv${want}`, syntax);
  const local = want === 6 ? norm6(o.local) : o.local;
  const remote = want === 6 ? norm6(o.remote) : o.remote;
  const lines: CliLine[] = [];
  if (!addressesOf(d).some((x) => sameIp(x, local))) lines.push({ text: `${local} nie jest adresem żadnego interfejsu tego routera – drugi koniec nie rozpozna pakietów.`, kind: 'hint' });
  const t = newIface(name, true, true);
  t.tunnel = { mode, local, remote };
  d.ifaces.push(t);
  return {
    lines: [
      ...out(`Tunel ${name} (${mode}): ${local} → ${remote}`),
      ...lines,
      { text: `Dalej: ip add <adres>/<prefiks> dev ${name} oraz route add <sieć> via <adres drugiego końca tunelu>.`, kind: 'hint' },
    ],
  };
}

function prefix96(arg: string | undefined): { prefix: string; len: number } | string {
  const pr = parseAddr(arg ?? '64:ff9b::/96');
  if (!pr || pr.fam !== 6) return 'prefiks musi być prefiksem IPv6, np. 64:ff9b::/96';
  if (pr.prefix !== 96) return 'symulator obsługuje prefiks /96 (adres IPv4 w ostatnich 32 bitach, RFC 6052)';
  return { prefix: netOf(pr.ip, 96), len: 96 };
}

function cmdNat64(d: Device, a: string[]): CliResult {
  const act = pick(a[0], ['enable', 'disable', 'flush']);
  if (!act || act === 'ambiguous') return fail('składnia: nat64 enable [prefix 64:ff9b::/96] pool <adres IPv4>  |  nat64 disable  |  nat64 flush');
  if (act === 'disable') {
    d.nat64 = null;
    d.natTable = [];
    return ok('NAT64 wyłączony.');
  }
  if (act === 'flush') {
    d.natTable = [];
    return ok('Tablica translacji NAT64 wyczyszczona.');
  }
  const o = kv(a.slice(1), ['prefix', 'pool']);
  const pr = prefix96(o.prefix);
  if (typeof pr === 'string') return fail(pr);
  if (!o.pool || !isIp(o.pool)) return fail('podaj adres IPv4 routera po stronie IPv4: pool <adres>', 'np. nat64 enable pool 192.0.2.1');
  if (!d.ifaces.some((i) => i.ip === o.pool)) return fail(`${o.pool} nie jest adresem żadnego interfejsu routera`, 'Odpowiedzi z sieci IPv4 muszą wracać na adres routera.');
  d.nat64 = { prefix: pr.prefix, len: pr.len, pool: o.pool };
  return {
    lines: [
      ...out(`NAT64: ${pr.prefix}/${pr.len} → IPv4 z adresu ${o.pool}`),
      { text: `Przykład: ${mixed4(pr.prefix.replace(/::$/, '::c000:250'))} to adres IPv4 192.0.2.80 widziany z sieci IPv6.`, kind: 'hint' },
    ],
  };
}

function cmdDns64(d: Device, a: string[]): CliResult {
  const act = pick(a[0], ['enable', 'disable']);
  if (!act || act === 'ambiguous') return fail('składnia: dns64 enable [prefix 64:ff9b::/96]  |  dns64 disable');
  if (act === 'disable') {
    d.dns64 = null;
    return ok('DNS64 wyłączony.');
  }
  const o = kv(a.slice(1), ['prefix']);
  const pr = prefix96(o.prefix);
  if (typeof pr === 'string') return fail(pr);
  d.dns64 = pr;
  const lines: CliLine[] = out(`DNS64: brakujące rekordy AAAA będą składane z prefiksu ${pr.prefix}/${pr.len}.`);
  if (!d.services.dns) lines.push({ text: 'Usługa DNS jest wyłączona – włącz: service dns on', kind: 'hint' });
  return { lines };
}

// ---------- bezpieczeństwo przełącznika ----------

function cmdSecurity(d: Device, a: string[]): CliResult {
  const sec = d.security;
  const what = pick(a[0], ['dhcp-guard', 'savi', 'ra-guard', 'port', 'binding', 'user']);
  if (!what || what === 'ambiguous') return fail('składnia: security dhcp-guard|savi|ra-guard on|off  |  security port …  |  security binding …  |  security user …', 'help security pokaże wszystkie warianty');
  const onoff = (t?: string) => pick(t, ['on', 'off']);
  if (what === 'dhcp-guard' || what === 'savi' || what === 'ra-guard') {
    const v = onoff(a[1]);
    if (v !== 'on' && v !== 'off') return fail(`składnia: security ${what} on|off`);
    const key = what === 'dhcp-guard' ? 'dhcpGuard' : what === 'savi' ? 'savi' : 'raGuard';
    sec[key] = v === 'on';
    const name = { dhcpGuard: 'Ochrona DHCP', savi: 'Weryfikacja źródła (SAVI)', raGuard: 'RA-Guard' }[key];
    const lines = out(`${name}: ${sec[key] ? 'włączona' : 'wyłączona'}`);
    if (sec[key] && key !== 'savi' && !d.ifaces.some((i) => i.trusted)) {
      lines.push({ text: `Żaden port nie jest zaufany – oznacz port w stronę prawdziwego ${key === 'raGuard' ? 'routera' : 'serwera DHCP'}: security port <port> trusted`, kind: 'hint' });
    }
    if (sec[key] && key === 'savi') lines.push({ text: 'Hosty z adresem statycznym potrzebują powiązania: security binding add <mac> <ip> port <port>', kind: 'hint' });
    return { lines };
  }
  if (what === 'port') {
    const i = findIface(d, a[1]);
    if (!i) return fail(`nie ma portu „${a[1] ?? ''}”`, `Porty: ${d.ifaces.map((x) => x.name).join(', ')}`);
    const opt = pick(a[2], ['trusted', 'untrusted', 'max-mac', 'dot1x', 'reset']);
    if (!opt || opt === 'ambiguous') return fail(`składnia: security port ${i.name} trusted|untrusted|max-mac <n>|dot1x on|off|reset`);
    if (opt === 'trusted' || opt === 'untrusted') {
      i.trusted = opt === 'trusted';
      return ok(`${i.name}: port ${i.trusted ? 'zaufany' : 'niezaufany'}`);
    }
    if (opt === 'reset') {
      i.errDisabled = false;
      i.up = true;
      i.violations = 0;
      i.authMac = undefined;
      i.authUser = undefined;
      d.macTable = d.macTable.filter((m) => m.port !== i.name);
      return ok(`${i.name}: port przywrócony, liczniki i nauczone adresy wyczyszczone.`);
    }
    if (opt === 'dot1x') {
      const v = onoff(a[3]);
      if (v !== 'on' && v !== 'off') return fail(`składnia: security port ${i.name} dot1x on|off`);
      i.dot1x = v === 'on';
      i.authMac = undefined;
      i.authUser = undefined;
      const lines = out(`${i.name}: 802.1X ${i.dot1x ? 'włączone – port nieautoryzowany do czasu logowania' : 'wyłączone'}`);
      if (i.dot1x && !d.security.users.length) lines.push({ text: 'Dodaj konto: security user add <login> <hasło>', kind: 'hint' });
      return { lines };
    }
    if (a[3]?.toLowerCase() === 'off') {
      i.maxMac = undefined;
      return ok(`${i.name}: bez limitu adresów MAC`);
    }
    const n = Number(a[3]);
    if (!Number.isInteger(n) || n < 1 || n > 64) return fail('limit: liczba od 1 do 64 albo off');
    const o = kv(a.slice(4), ['action']);
    const act = o.action ? pick(o.action, ['drop', 'shutdown']) : 'drop';
    if (act !== 'drop' && act !== 'shutdown') return fail('action: drop (odrzucaj ramki) albo shutdown (wyłącz port)');
    i.maxMac = n;
    i.onViolation = act;
    const learned = d.macTable.filter((m) => m.port === i.name).length;
    const lines = out(`${i.name}: najwyżej ${n} adres(y) MAC, przy naruszeniu: ${act === 'drop' ? 'odrzucaj ramki' : 'wyłącz port'}`);
    if (learned > n) lines.push({ text: `Port zna już ${learned} adresy – wyczyść tablicę (mac flush), żeby limit liczył się od zera.`, kind: 'hint' });
    return { lines };
  }
  if (what === 'binding') {
    const op = pick(a[1], ['add', 'del']);
    if (op === 'del') {
      const n = d.bindings.length;
      d.bindings = d.bindings.filter((b) => b.ip !== a[2]);
      return n === d.bindings.length ? fail(`nie ma powiązania dla ${a[2] ?? ''}`) : ok(`Usunięto powiązanie ${a[2]}.`);
    }
    const o = kv(a.slice(4), ['port']);
    const mac = a[2]?.toUpperCase();
    const port = findIface(d, o.port);
    if (op !== 'add' || !mac || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac) || !isIp(a[3] ?? '') || !port) {
      return fail('składnia: security binding add <mac> <ip> port <port>', 'np. security binding add 02:AB:CD:00:00:01 192.168.1.40 port port4');
    }
    d.bindings = d.bindings.filter((b) => b.ip !== a[3]);
    d.bindings.push({ mac, ip: a[3], port: port.name, vlan: port.vlan, origin: 'static' });
    return ok(`Powiązanie: ${a[3]} ↔ ${mac} na ${port.name}`);
  }
  const op = pick(a[1], ['add', 'del']);
  if (!op || op === 'ambiguous' || !a[2]) return fail('składnia: security user add <login> <hasło>  |  security user del <login>');
  if (op === 'del') {
    sec.users = sec.users.filter((u) => u.name !== a[2]);
    return ok(`Usunięto konto ${a[2]}.`);
  }
  if (!a[3]) return fail('podaj hasło');
  sec.users = sec.users.filter((u) => u.name !== a[2]);
  sec.users.push({ name: a[2], pass: a[3] });
  return ok(`Konto 802.1X ${a[2]} zapisane.`);
}

// ---------- wejście ----------

export function runCommand(net: Network, d: Device, line: string, act: CliActions, packs: PackSet = ALL_PACKS): CliResult {
  const tk = line.trim().split(/\s+/).filter(Boolean);
  if (!tk.length) return { lines: [] };
  if (tk[0] === '?') return helpFor(d, packs);
  const avail = commandsFor(d, packs).map((c) => c.verb);
  const v = pick(tk[0], avail);
  if (v === 'ambiguous') return fail(`niejednoznaczne „${tk[0]}”: ${avail.filter((x) => x.startsWith(tk[0].toLowerCase())).join(', ')}`);
  if (!v) {
    const elsewhere = COMMANDS.find((c) => c.verb === tk[0].toLowerCase() || c.verb.startsWith(tk[0].toLowerCase()));
    if (elsewhere && elsewhere.for.includes(d.type) && !packOk(elsewhere, packs)) {
      return fail(`polecenie „${elsewhere.verb}” należy do wyłączonego pakietu`, 'Włącz odpowiedni pakiet w menu „Pakiety”.');
    }
    return fail(
      `nieznane polecenie „${tk[0]}”`,
      elsewhere ? `„${elsewhere.verb}” nie jest dostępne na urządzeniu typu ${TYPE_LABEL[d.type].toLowerCase()}.` : 'Wpisz help, aby zobaczyć listę poleceń.',
    );
  }
  const a = tk.slice(1);
  const want = famPref(packs, a);
  const args = a.filter((x) => x !== '-6' && x !== '-4');
  switch (v) {
    case 'help':
      return helpFor(d, packs, a[0]);
    case 'clear':
      return { lines: [], clear: true };
    case 'show':
      return show(net, d, a, packs);
    case 'set': {
      const what = pick(a[0], d.type === 'server' ? ['hostname', 'certificate', 'mail-domain'] : ['hostname']);
      if (!what || what === 'ambiguous' || !a[1]) return fail('składnia: set hostname <nazwa>');
      if (what === 'certificate') {
        d.certName = a[1].toLowerCase();
        return ok(`Certyfikat TLS wystawiony dla: ${d.certName}`);
      }
      if (what === 'mail-domain') {
        d.mailDomain = a[1].toLowerCase();
        return ok(`Domena poczty: ${d.mailDomain}`);
      }
      if (!/^[A-Za-z0-9_-]{1,20}$/.test(a[1])) return fail('nazwa: litery, cyfry, „-” i „_”, maks. 20 znaków');
      if (net.devices.some((x) => x !== d && x.name === a[1])) return fail(`nazwa ${a[1]} jest już zajęta`);
      d.name = a[1];
      return ok(`Nazwa urządzenia: ${d.name}`);
    }
    case 'interface':
      return cmdInterface(net, d, a, packs);
    case 'ip':
      return cmdIp(d, a, packs);
    case 'ipv6': {
      if (pick(a[0], ['autoconf']) !== 'autoconf') return fail('składnia: ipv6 autoconf [off]');
      if (a[1]?.toLowerCase() === 'off') {
        d.slaac = false;
        d.ifaces[0].ip6 = d.ifaces[0].ip6.filter((x) => x.origin !== 'auto');
        if (isLinkLocal6(d.gateway6)) d.gateway6 = '';
        return ok('Autokonfiguracja IPv6 wyłączona, adresy SLAAC usunięte.');
      }
      act.autoconf(d);
      return { lines: [] };
    }
    case 'route':
      return cmdRoute(d, a, packs);
    case 'dhcp-server':
      return cmdDhcpServer(d, a);
    case 'dhcp-relay': {
      const op = pick(a[0], ['set', 'del']);
      const o = kv(a.slice(1), ['dev', 'server']);
      const i = findIface(d, o.dev);
      if (!op || op === 'ambiguous' || !i) return fail('składnia: dhcp-relay set dev <if> server <ip>  |  dhcp-relay del dev <if>');
      if (op === 'del') {
        i.relay = '';
        return ok(`${i.name}: przekaźnik DHCP wyłączony.`);
      }
      if (!o.server || !isIp(o.server)) return fail('podaj adres IPv4 serwera DHCP: server <ip>');
      i.relay = o.server;
      return ok(`${i.name}: komunikaty DHCP klientów będą przekazywane do ${o.server}.`);
    }
    case 'dhcp-client': {
      const s = pick(a[0] ?? 'start', ['start', 'release']);
      if (s === 'release') {
        const i = d.ifaces[0];
        i.ip = '';
        i.mask = '';
        d.gateway = '';
        d.dhcp = true;
        return ok('Adres zwolniony.');
      }
      if (s !== 'start') return fail('składnia: dhcp-client start | release');
      act.dhcp(d);
      return { lines: [] };
    }
    case 'dns': {
      const op = pick(a[0], ['set', 'flush']);
      if (op === 'flush') {
        d.dnsCache = [];
        return ok('Pamięć podręczna DNS wyczyszczona.');
      }
      if (op !== 'set' || !a[1] || !fam(a[1])) return fail('składnia: dns set <adres serwera>  |  dns flush');
      d.dns = fam(a[1]) === 6 ? norm6(a[1]) : a[1];
      return ok(`Serwer DNS: ${d.dns}`);
    }
    case 'nslookup': {
      if (!a[0]) return fail('podaj nazwę', 'nslookup <nazwa> [A|AAAA|MX]');
      const t = (a[1]?.toUpperCase() ?? (packs.ipv4 ? 'A' : 'AAAA')) as RecordType;
      if (!['A', 'AAAA', 'MX'].includes(t)) return fail('typ rekordu: A, AAAA albo MX');
      act.lookup(d, a[0], t);
      return { lines: [] };
    }
    case 'vlan':
      return cmdVlan(d, a);
    case 'arp':
      if (pick(a[0], ['flush']) !== 'flush') return fail('składnia: arp flush', 'Tablicę ARP pokazuje: show arp');
      d.arp = [];
      return ok('Tablica ARP wyczyszczona.');
    case 'neighbors':
      if (pick(a[0], ['flush']) !== 'flush') return fail('składnia: neighbors flush', 'Tablicę pokazuje: show neighbors');
      d.nd = [];
      return ok('Tablica sąsiadów IPv6 wyczyszczona.');
    case 'mac':
      if (pick(a[0], ['flush']) !== 'flush') return fail('składnia: mac flush', 'Tablicę MAC pokazuje: show mac');
      d.macTable = [];
      return ok('Tablica MAC wyczyszczona.');
    case 'ping':
    case 'trace': {
      const host = args[0];
      if (!host) return fail('podaj adres albo nazwę', `${v} <adres | nazwa>`);
      const hf = fam(host);
      if (hf && famOff(packs, hf)) return fail(`pakiet IPv${hf} jest wyłączony w tym projekcie`);
      if (!hf && !packs.dns) return fail(`„${host}” nie jest adresem IP, a pakiet DNS jest wyłączony`);
      if (famOff(packs, want) && !hf) return fail(`pakiet IPv${want} jest wyłączony`);
      if (v === 'trace') {
        act.trace(d, host, want);
        return { lines: [] };
      }
      const o = kv(args.slice(1), ['count']);
      act.ping(d, host, o.count ? Math.min(10, Math.max(1, Number(o.count) || 1)) : 4, want);
      return { lines: [] };
    }
    case 'tcp-send':
    case 'udp-send': {
      const host = args[0];
      if (!host) return fail('podaj adres albo nazwę odbiorcy', `${v} <host> [port <n>] [size <bajty>]`);
      const hf = fam(host);
      if (hf && famOff(packs, hf)) return fail(`pakiet IPv${hf} jest wyłączony w tym projekcie`);
      if (!hf && !packs.dns) return fail(`„${host}” nie jest adresem IP, a pakiet DNS jest wyłączony`);
      const o = kv(args.slice(1), ['port', 'size']);
      const port = o.port === undefined ? 9 : Number(o.port);
      const size = o.size === undefined ? 4000 : Number(o.size);
      if (!Number.isInteger(port) || port < 1 || port > 65535) return fail('port musi być liczbą 1–65535');
      if (!Number.isInteger(size) || size < 1 || size > 20000) return fail('rozmiar danych: 1–20000 bajtów');
      (v === 'tcp-send' ? act.tcpSend : act.udpSend)(d, host, port, size, want);
      return { lines: [] };
    }
    case 'http':
    case 'https': {
      if (!args[0]) return fail('podaj adres serwera', `${v} <host> [ścieżka]`);
      act.http(d, args[0], args[1]?.startsWith('/') ? args[1] : '/', v === 'https', want);
      return { lines: [] };
    }
    case 'ftp': {
      const op = pick(args[1], ['get', 'list']);
      const o = kv(args.slice(2), ['user', 'pass']);
      if (!args[0] || !op || op === 'ambiguous' || (op === 'get' && !args[2])) return fail('składnia: ftp <host> get <plik> user <login> pass <hasło>');
      if (!o.user || !o.pass) return fail('podaj dane logowania: user <login> pass <hasło>');
      act.ftp(d, args[0], { cmd: op as 'get' | 'list', file: op === 'get' ? args[2] : undefined, user: o.user, pass: o.pass }, want);
      return { lines: [] };
    }
    case 'mail': {
      const op = pick(a[0], ['account', 'send', 'check']);
      if (op === 'account') {
        const o = kv(a.slice(2), ['pass']);
        if (!a[1]?.includes('@') || !o.pass) return fail('składnia: mail account <użytkownik@domena> pass <hasło>');
        d.mailAccount = { addr: a[1].toLowerCase(), pass: o.pass };
        return ok(`Konto pocztowe: ${d.mailAccount.addr}`);
      }
      if (op === 'send') {
        if (!a[1]?.includes('@')) return fail('składnia: mail send <adres> <temat…>');
        act.mailSend(d, a[1].toLowerCase(), a.slice(2).join(' ') || '(bez tematu)');
        return { lines: [] };
      }
      if (op === 'check') {
        act.mailCheck(d);
        return { lines: [] };
      }
      return fail('składnia: mail account | send | check');
    }
    case 'ntp':
      if (pick(a[0], ['sync']) !== 'sync' || !a[1]) return fail('składnia: ntp sync <host>');
      act.ntp(d, a[1]);
      return { lines: [] };
    case 'print': {
      if (!args[0]) return fail('podaj adres drukarki', 'print <adres> [doc <nazwa>]');
      const o = kv(args.slice(1), ['doc']);
      act.print(d, args[0], o.doc ?? 'dokument.pdf', want);
      return { lines: [] };
    }
    case 'tunnel':
      return cmdTunnel(d, a);
    case 'nat64':
      return cmdNat64(d, a);
    case 'dns64':
      return cmdDns64(d, a);
    case 'security':
      return cmdSecurity(d, a);
    case 'dot1x': {
      const op = pick(a[0], ['login', 'logoff']);
      if (op === 'logoff') {
        act.dot1xOff(d);
        return { lines: [] };
      }
      const o = kv(a.slice(1), ['user', 'pass']);
      if (op !== 'login' || !o.user || !o.pass) return fail('składnia: dot1x login user <login> pass <hasło>  |  dot1x logoff');
      act.dot1x(d, o.user, o.pass);
      return { lines: [] };
    }
    case 'service':
    case 'dns-record':
    case 'web':
    case 'ftp-file':
    case 'user':
      return cmdServer(d, v, a, packs);
  }
  return fail('nieobsłużone polecenie');
}
