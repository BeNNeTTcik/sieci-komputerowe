// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Pakiety protokołów: włączasz tylko to, czego potrzebuje lekcja. Wyłączony pakiet znika
// z interfejsu (paleta, okna, CLI, filtry) i jest nieaktywny w silniku symulacji.

import type { DeviceType, Protocol, ServiceName } from './model';

export type PackId = 'ipv4' | 'ipv6' | 'transition' | 'transport' | 'dhcp' | 'vlan' | 'security' | 'dns' | 'web' | 'ftp' | 'mail' | 'ntp' | 'print';

export interface Pack {
  id: PackId;
  name: string;
  desc: string;
  protocols: Protocol[];
  requires?: PackId[];
  service?: ServiceName[];
}

export const PACKS: Pack[] = [
  { id: 'ipv4', name: 'IPv4', desc: 'Adresy IPv4, ARP, ICMP (ping, trace), routing statyczny.', protocols: ['ARP', 'ICMP'] },
  { id: 'ipv6', name: 'IPv6', desc: 'Adresy IPv6, link-local, NDP, SLAAC, ICMPv6, routing IPv6.', protocols: ['NDP', 'ICMP'] },
  { id: 'transition', name: 'IPv4 ↔ IPv6', desc: 'Tunele 6in4 / 4in6 (RFC 4213, 2473), NAT64 (RFC 6146) i DNS64 (RFC 6147).', protocols: ['TUNNEL'], requires: ['ipv4', 'ipv6'] },
  {
    id: 'transport',
    name: 'TCP i UDP',
    desc: 'Przesył danych testowych (tcp-send, udp-send) do usługi Discard (RFC 863), straty ramek na kablu, retransmisje TCP.',
    protocols: ['TCP', 'UDP'],
    service: ['discard'],
  },
  { id: 'vlan', name: 'VLAN', desc: 'Sieci wirtualne na przełączniku (IEEE 802.1Q).', protocols: [] },
  { id: 'dhcp', name: 'DHCP', desc: 'Automatyczna adresacja IPv4, przekaźnik DHCP na routerze.', protocols: ['DHCP'], requires: ['ipv4'], service: ['dhcp'] },
  { id: 'security', name: 'Bezpieczeństwo', desc: 'IEEE 802.1X (EAP), limit adresów MAC na porcie, ochrona DHCP i weryfikacja źródła (SAVI), RA-Guard.', protocols: ['EAP'] },
  { id: 'dns', name: 'DNS', desc: 'Nazwy domenowe: rekordy A, AAAA, MX, nslookup.', protocols: ['DNS'], service: ['dns'] },
  { id: 'web', name: 'WWW', desc: 'HTTP i HTTPS (TLS 1.3), przeglądarka na komputerze.', protocols: ['HTTP', 'HTTPS'], service: ['http', 'https'] },
  { id: 'ftp', name: 'FTP', desc: 'Przesyłanie plików: połączenie sterujące i danych (EPSV).', protocols: ['FTP'], service: ['ftp'] },
  { id: 'mail', name: 'Poczta', desc: 'SMTP i POP3, skrzynki użytkowników, rekord MX.', protocols: ['EMAIL'], requires: ['dns'], service: ['mail'] },
  { id: 'ntp', name: 'NTP', desc: 'Synchronizacja zegarów.', protocols: ['NTP'], service: ['ntp'] },
  { id: 'print', name: 'Drukowanie', desc: 'Drukarka sieciowa i protokół IPP.', protocols: ['IPP'] },
];

export interface Profile {
  id: string;
  name: string;
  desc: string;
  packs: PackId[];
}

export const PROFILES: Profile[] = [
  { id: 'ipv4', name: 'Podstawy IPv4', desc: 'ARP, ping, routing – bez usług.', packs: ['ipv4', 'print'] },
  { id: 'lan', name: 'Sieć LAN', desc: 'IPv4, DHCP i VLAN-y.', packs: ['ipv4', 'dhcp', 'vlan', 'print'] },
  { id: 'ipv6', name: 'Tylko IPv6', desc: 'IPv4 wyłączony: SLAAC, NDP, ICMPv6.', packs: ['ipv6'] },
  { id: 'dual', name: 'Dual stack', desc: 'IPv4 i IPv6 jednocześnie, DNS i WWW.', packs: ['ipv4', 'ipv6', 'dns', 'web'] },
  { id: 'services', name: 'Usługi sieciowe', desc: 'Serwer: DHCP, DNS, WWW, FTP, poczta, NTP.', packs: ['ipv4', 'dhcp', 'dns', 'web', 'ftp', 'mail', 'ntp'] },
  { id: 'transition', name: 'Przejście IPv4 → IPv6', desc: 'Tunele 6in4, NAT64 i DNS64.', packs: ['ipv4', 'ipv6', 'transition', 'dns', 'web'] },
  { id: 'transport', name: 'TCP i UDP', desc: 'Porównanie TCP i UDP, straty na łączu, retransmisje.', packs: ['ipv4', 'transport'] },
  { id: 'security', name: 'Bezpieczeństwo LAN', desc: '802.1X, limit MAC, ochrona DHCP, SAVI.', packs: ['ipv4', 'dhcp', 'security'] },
  { id: 'all', name: 'Wszystko', desc: 'Wszystkie pakiety naraz.', packs: PACKS.map((p) => p.id) },
];

export type PackSet = Record<PackId, boolean>;

export function packSet(ids: PackId[]): PackSet {
  const s = Object.fromEntries(PACKS.map((p) => [p.id, false])) as PackSet;
  for (const id of ids) s[id] = true;
  return withDeps(s);
}

export const ALL_PACKS = packSet(PACKS.map((p) => p.id));

/** Włącza pakiety wymagane przez włączone pakiety (np. Poczta → DNS). */
export function withDeps(s: PackSet): PackSet {
  const out = { ...s };
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PACKS) {
      if (!out[p.id]) continue;
      for (const r of p.requires ?? []) {
        if (!out[r]) {
          out[r] = true;
          changed = true;
        }
      }
    }
  }
  if (!out.ipv4 && !out.ipv6) out.ipv4 = true;
  return out;
}

/** Wyłącza pakiety, które zależą od wyłączanego. */
export function without(s: PackSet, id: PackId): PackSet {
  const out = { ...s, [id]: false };
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PACKS) if (out[p.id] && (p.requires ?? []).some((r) => !out[r])) {
      out[p.id] = false;
      changed = true;
    }
  }
  if (!out.ipv4 && !out.ipv6) out[id === 'ipv4' ? 'ipv6' : 'ipv4'] = true;
  return out;
}

export function protocolsFor(s: PackSet): Protocol[] {
  const set = new Set<Protocol>();
  for (const p of PACKS) if (s[p.id]) p.protocols.forEach((x) => set.add(x));
  const order: Protocol[] = ['ARP', 'NDP', 'ICMP', 'TUNNEL', 'EAP', 'DHCP', 'DNS', 'NTP', 'HTTP', 'HTTPS', 'FTP', 'EMAIL', 'IPP', 'TCP', 'UDP'];
  return order.filter((x) => set.has(x));
}

export function devicesFor(s: PackSet): DeviceType[] {
  const list: DeviceType[] = ['pc', 'router', 'switch'];
  if (s.dns || s.web || s.ftp || s.mail || s.ntp || s.dhcp || s.transport) list.splice(1, 0, 'server');
  if (s.print) list.push('printer');
  return list;
}

export function serviceEnabled(s: PackSet, svc: ServiceName): boolean {
  return PACKS.some((p) => s[p.id] && p.service?.includes(svc));
}

export function matchProfile(s: PackSet): Profile | undefined {
  return PROFILES.find((pr) => {
    const t = packSet(pr.packs);
    return PACKS.every((p) => t[p.id] === s[p.id]);
  });
}

export function packNames(s: PackSet): string {
  return PACKS.filter((p) => s[p.id]).map((p) => p.name).join(' · ');
}
