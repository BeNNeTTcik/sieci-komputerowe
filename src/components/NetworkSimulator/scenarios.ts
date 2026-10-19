// SPDX-License-Identifier: MIT
// Scenariusze lekcji (use case). Każdy ustawia potrzebne pakiety protokołów, a urządzenia
// konfiguruje tymi samymi poleceniami CLI, których uczy symulator („show config” je pokaże).

import { runCommand, CliActions } from './cli';
import { Device, DeviceType, Network, connect, createDevice, emptyNetwork, globals6, hasIp, inSubnet, getIface } from './model';
import type { SimEvent } from './engine';
import { ALL_PACKS, PackId } from './packs';

export interface CheckCtx {
  net: Network;
  events: SimEvent[];
}

export interface Task {
  text: string;
  hint?: string;
  check?: (c: CheckCtx) => boolean;
}

export interface Scenario {
  id: string;
  short: string;
  title: string;
  level: 'podstawowy' | 'średni' | 'zaawansowany';
  description: string;
  packs: PackId[];
  build: () => Network;
  tasks: Task[];
}

const noop: CliActions = {
  ping() {},
  trace() {},
  dhcp() {},
  autoconf() {},
  lookup() {},
  http() {},
  ftp() {},
  mailSend() {},
  mailCheck() {},
  ntp() {},
  print() {},
};

function builder() {
  const net = emptyNetwork();
  const add = (type: DeviceType, name: string, x: number, y: number, ...cmds: string[]) => {
    // scenariusze projektowano na płótnie 960×560 – umieszczamy je na środku większego obszaru roboczego
    const d = createDevice(net, type, x + 720, y + 520, name);
    run(d, ...cmds);
    return d;
  };
  const run = (d: Device, ...cmds: string[]) => {
    for (const c of cmds) {
      const r = runCommand(net, d, c, noop, ALL_PACKS);
      if (r.error) throw new Error(`${d.name}: ${c} → ${r.lines.map((l) => l.text).join(' ')}`);
    }
  };
  const link = (a: Device, ai: string, b: Device, bi: string) => {
    const r = connect(net, a.id, b.id, ai, bi);
    if (typeof r === 'string') throw new Error(r);
  };
  return { net, add, run, link };
}

const dev = (c: CheckCtx, name: string) => c.net.devices.find((d) => d.name === name);

/** Czy do urządzenia `to` dotarł (i został przyjęty) komunikat ICMP danego typu od adresu `fromIp`? */
function icmpArrived(c: CheckCtx, to: string, fromIp: string, types: number[]) {
  const d = dev(c, to);
  return !!d && c.events.some((e) => e.kind === 'hop' && e.to === d.id && !e.dropped && e.frame.ip?.icmp && types.includes(e.frame.ip.icmp.type) && e.frame.ip.src === fromIp);
}
const REPLY = [0, 129];
const TIMEX = [11, 3];

const hasRoute = (c: CheckCtx, r: string, network: string) => !!dev(c, r)?.routes.some((x) => x.network === network);

function portOf(c: CheckCtx, sw: string, host: string) {
  const s = dev(c, sw);
  const h = dev(c, host);
  if (!s || !h) return undefined;
  const l = c.net.links.find((x) => (x.a.dev === s.id && x.b.dev === h.id) || (x.b.dev === s.id && x.a.dev === h.id));
  if (!l) return undefined;
  return getIface(s, l.a.dev === s.id ? l.a.iface : l.b.iface);
}

function arrived(c: CheckCtx, to: string, pred: (e: SimEvent) => boolean) {
  const d = dev(c, to);
  return !!d && c.events.some((e) => e.kind === 'hop' && e.to === d.id && !e.dropped && pred(e));
}

const SERVER_CFG = [
  'ip add 192.168.1.10/24 dev eth0',
  'route add default via 192.168.1.1',
  'dns set 192.168.1.10',
  'service dhcp on',
  'dhcp-server add LAN net 192.168.1.0/24 gw 192.168.1.1 range 192.168.1.100-192.168.1.150 dns 192.168.1.10',
  'dns-record add www.szkola.lab A 192.168.1.10',
  'dns-record add ftp.szkola.lab A 192.168.1.10',
  'dns-record add mail.szkola.lab A 192.168.1.10',
  'dns-record add ntp.szkola.lab A 192.168.1.10',
  'dns-record add szkola.lab MX mail.szkola.lab',
  'user add nauczyciel tajne1',
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'lan',
    short: 'LAN i ARP',
    title: '1. Sieć lokalna: ARP i ping',
    level: 'podstawowy',
    packs: ['ipv4', 'print'],
    description:
      'Cztery urządzenia w jednej sieci 192.168.1.0/24 połączone przełącznikiem. Zobacz, jak host najpierw pyta o adres MAC (ARP), a dopiero potem wysyła pakiet IP, i jak przełącznik uczy się, za którym portem jest który komputer.',
    build: () => {
      const { net, add, link } = builder();
      const sw = add('switch', 'SW1', 480, 290);
      const pc1 = add('pc', 'PC1', 220, 130, 'ip add 192.168.1.10/24 dev eth0');
      const pc2 = add('pc', 'PC2', 740, 130, 'ip add 192.168.1.11/24 dev eth0');
      const pc3 = add('pc', 'PC3', 220, 450, 'ip add 192.168.1.12/24 dev eth0');
      const pr = add('printer', 'DRUK1', 740, 450, 'ip add 192.168.1.50/24 dev eth0');
      link(pc1, 'eth0', sw, 'port1');
      link(pc2, 'eth0', sw, 'port2');
      link(pc3, 'eth0', sw, 'port3');
      link(pr, 'eth0', sw, 'port4');
      return net;
    },
    tasks: [
      { text: 'Wyślij ping z PC1 do PC2.', hint: 'Kliknij PC1 → Narzędzia, albo w terminalu PC1: ping 192.168.1.11 count 1', check: (c) => icmpArrived(c, 'PC1', '192.168.1.11', REPLY) },
      {
        text: 'Sprawdź tablicę ARP na PC2 – czy PC2 zna już MAC komputera PC1, choć sam o niego nie pytał?',
        hint: 'Terminal PC2: show arp. Odbiorca zapytania ARP zapamiętuje pytającego (RFC 826).',
        check: (c) => !!dev(c, 'PC2')?.arp.some((a) => a.ip === '192.168.1.10'),
      },
      { text: 'Wydrukuj dokument z PC3 na drukarce DRUK1.', hint: 'Terminal PC3: print 192.168.1.50 doc referat.pdf', check: (c) => (dev(c, 'DRUK1')?.jobs.length ?? 0) > 0 },
      { text: 'Ile kopii zapytania ARP rozesłał SW1 i dlaczego DRUK1 odrzucił swoją kopię?' },
      { text: 'Wyczyść tablice i powtórz ping. Porównaj liczbę ramek z drugim pingiem bez czyszczenia.' },
    ],
  },
  {
    id: 'routing',
    short: 'Router',
    title: '2. Dwie sieci i router',
    level: 'podstawowy',
    packs: ['ipv4', 'print'],
    description:
      'Router łączy sieci 192.168.1.0/24 i 192.168.2.0/24, ale jego interfejsy są wyłączone. Włącz je i prześledź, jak router zmienia adresy MAC w ramce, zmniejsza TTL, a adresy IP zostawia bez zmian.',
    build: () => {
      const { net, add, link } = builder();
      const r1 = add('router', 'R1', 480, 290, 'ip add 192.168.1.1/24 dev eth0', 'ip add 192.168.2.1/24 dev eth1');
      const sw1 = add('switch', 'SW1', 250, 290);
      const sw2 = add('switch', 'SW2', 710, 290);
      const pc1 = add('pc', 'PC1', 90, 140, 'ip add 192.168.1.10/24 dev eth0', 'route add default via 192.168.1.1');
      const pc2 = add('pc', 'PC2', 90, 440, 'ip add 192.168.1.11/24 dev eth0', 'route add default via 192.168.1.1');
      const pc3 = add('pc', 'PC3', 870, 140, 'ip add 192.168.2.10/24 dev eth0', 'route add default via 192.168.2.1');
      const pr = add('printer', 'DRUK1', 870, 440, 'ip add 192.168.2.50/24 dev eth0', 'route add default via 192.168.2.1');
      link(pc1, 'eth0', sw1, 'port1');
      link(pc2, 'eth0', sw1, 'port2');
      link(sw1, 'port8', r1, 'eth0');
      link(r1, 'eth1', sw2, 'port8');
      link(pc3, 'eth0', sw2, 'port1');
      link(pr, 'eth0', sw2, 'port2');
      return net;
    },
    tasks: [
      {
        text: 'Włącz interfejsy eth0 i eth1 routera R1.',
        hint: 'R1 → okno Interfejsy, albo terminal R1: interface eth0 up oraz interface eth1 up',
        check: (c) => !!dev(c, 'R1') && ['eth0', 'eth1'].every((n) => getIface(dev(c, 'R1')!, n)?.up),
      },
      { text: 'Wyślij ping z PC1 do PC3 (192.168.2.10).', hint: 'Kliknij zdarzenie na routerze i porównaj adresy MAC ramki przed i za routerem.', check: (c) => icmpArrived(c, 'PC1', '192.168.2.10', REPLY) },
      { text: 'Wykonaj trace z PC1 do PC3 i znajdź komunikat Time Exceeded od routera.', hint: 'Terminal PC1: trace 192.168.2.10', check: (c) => icmpArrived(c, 'PC1', '192.168.1.1', TIMEX) },
      { text: 'Wydrukuj dokument z PC2 na drukarce w drugiej sieci.', hint: 'print 192.168.2.50', check: (c) => (dev(c, 'DRUK1')?.jobs.length ?? 0) > 0 },
      { text: 'Usuń bramę na PC3 (route del default) i spróbuj pingu z PC1. Gdzie i dlaczego pakiet ginie?' },
    ],
  },
  {
    id: 'dhcp',
    short: 'DHCP',
    title: '3. Automatyczna adresacja: DHCP',
    level: 'średni',
    packs: ['ipv4', 'dhcp', 'print'],
    description:
      'Komputery nie mają adresów – czekają na serwer DHCP. Skonfiguruj pulę na routerze i obejrzyj cztery kroki DORA: Discover, Offer, Request, Ack.',
    build: () => {
      const { net, add, link } = builder();
      const r1 = add('router', 'R1', 480, 120, 'ip add 192.168.10.1/24 dev eth0', 'interface eth0 up');
      const sw = add('switch', 'SW1', 480, 300);
      const pcs = [add('pc', 'PC1', 200, 470), add('pc', 'PC2', 480, 480), add('pc', 'PC3', 760, 470)];
      pcs.forEach((p) => (p.dhcp = true));
      const pr = add('printer', 'DRUK1', 790, 230, 'ip add 192.168.10.200/24 dev eth0', 'route add default via 192.168.10.1');
      link(r1, 'eth0', sw, 'port8');
      pcs.forEach((p, i) => link(p, 'eth0', sw, `port${i + 1}`));
      link(pr, 'eth0', sw, 'port7');
      return net;
    },
    tasks: [
      {
        text: 'Utwórz na R1 pulę DHCP dla sieci 192.168.10.0/24 z bramą 192.168.10.1.',
        hint: 'R1 → okno Serwer DHCP, albo: dhcp-server add LAN net 192.168.10.0/24 gw 192.168.10.1 range 192.168.10.100-192.168.10.150',
        check: (c) => !!dev(c, 'R1')?.pools.some((p) => inSubnet('192.168.10.1', p.network, p.mask)),
      },
      { text: 'Pobierz adres przez DHCP na PC1.', hint: 'Terminal PC1: dhcp-client start', check: (c) => { const d = dev(c, 'PC1'); return !!d && d.dhcp && hasIp(d.ifaces[0]); } },
      { text: 'Skonfiguruj przez DHCP pozostałe komputery (PC2, PC3).', check: (c) => ['PC2', 'PC3'].every((n) => { const d = dev(c, n); return !!d && hasIp(d.ifaces[0]); }) },
      { text: 'Sprawdź łączność: ping z PC1 do bramy 192.168.10.1.', check: (c) => icmpArrived(c, 'PC1', '192.168.10.1', REPLY) },
      { text: 'Dlaczego DHCPDISCOVER ma źródłowy adres IP 0.0.0.0, a docelowy 255.255.255.255?' },
      { text: 'Czemu serwer nie przydzielił adresu 192.168.10.200? (Wskazówka: kto go już używa?)' },
    ],
  },
  {
    id: 'static',
    short: 'Trasy statyczne',
    title: '4. Dwa routery: trasy statyczne',
    level: 'średni',
    packs: ['ipv4', 'print'],
    description:
      'Routery R1 i R2 łączy sieć 10.0.0.0/30. Każdy zna tylko swoje sieci. Dodaj trasy statyczne, aby PC1 dogadał się z PC2, a potem użyj trace, żeby zobaczyć drogę pakietu.',
    build: () => {
      const { net, add, link } = builder();
      const r1 = add('router', 'R1', 380, 290, 'ip add 192.168.1.1/24 dev eth0', 'ip add 10.0.0.1/30 dev eth1', 'interface eth0 up', 'interface eth1 up');
      const r2 = add('router', 'R2', 600, 290, 'ip add 192.168.2.1/24 dev eth0', 'ip add 10.0.0.2/30 dev eth1', 'interface eth0 up', 'interface eth1 up');
      const sw1 = add('switch', 'SW1', 190, 290);
      const sw2 = add('switch', 'SW2', 790, 290);
      const pc1 = add('pc', 'PC1', 70, 130, 'ip add 192.168.1.10/24 dev eth0', 'route add default via 192.168.1.1');
      const pc2 = add('pc', 'PC2', 910, 130, 'ip add 192.168.2.10/24 dev eth0', 'route add default via 192.168.2.1');
      const pr = add('printer', 'DRUK1', 910, 450, 'ip add 192.168.2.50/24 dev eth0', 'route add default via 192.168.2.1');
      link(pc1, 'eth0', sw1, 'port1');
      link(sw1, 'port8', r1, 'eth0');
      link(r1, 'eth1', r2, 'eth1');
      link(r2, 'eth0', sw2, 'port8');
      link(pc2, 'eth0', sw2, 'port1');
      link(pr, 'eth0', sw2, 'port2');
      return net;
    },
    tasks: [
      { text: 'Spróbuj pingu z PC1 do PC2 przed zmianami. Który router odsyła Destination Unreachable?' },
      { text: 'Dodaj na R1 trasę do sieci 192.168.2.0/24 przez 10.0.0.2.', hint: 'route add 192.168.2.0/24 via 10.0.0.2', check: (c) => hasRoute(c, 'R1', '192.168.2.0') },
      { text: 'Dodaj na R2 trasę powrotną do 192.168.1.0/24 przez 10.0.0.1.', hint: 'Bez trasy powrotnej Echo Request dotrze, ale Echo Reply już nie wróci.', check: (c) => hasRoute(c, 'R2', '192.168.1.0') },
      { text: 'Ping z PC1 do PC2 kończy się sukcesem.', check: (c) => icmpArrived(c, 'PC1', '192.168.2.10', REPLY) },
      { text: 'Trace z PC1 do PC2 pokazuje drugi router (10.0.0.2).', hint: 'trace 192.168.2.10', check: (c) => icmpArrived(c, 'PC1', '10.0.0.2', TIMEX) },
      { text: 'Zastąp trasę na R2 trasą domyślną (route add default via 10.0.0.1). Czy coś się zmieniło?' },
    ],
  },
  {
    id: 'vlan',
    short: 'VLAN',
    title: '5. VLAN-y: izolacja w jednym przełączniku',
    level: 'zaawansowany',
    packs: ['ipv4', 'vlan'],
    description: 'Cztery komputery w tej samej podsieci IP, w jednym przełączniku. Podziel je na dwa VLAN-y i sprawdź, że rozgłoszenia ARP nie przechodzą już między grupami.',
    build: () => {
      const { net, add, link } = builder();
      const sw = add('switch', 'SW1', 480, 290);
      const ips = ['192.168.1.11', '192.168.1.12', '192.168.1.13', '192.168.1.14'];
      const pos = [[200, 130], [200, 450], [760, 130], [760, 450]];
      ips.forEach((ip, i) => {
        const p = add('pc', `PC${i + 1}`, pos[i][0], pos[i][1], `ip add ${ip}/24 dev eth0`);
        link(p, 'eth0', sw, `port${i + 1}`);
      });
      return net;
    },
    tasks: [
      { text: 'Utwórz VLAN 10 (BIURO) i VLAN 20 (GOSCIE) na SW1.', hint: 'vlan add 10 name BIURO  /  vlan add 20 name GOSCIE', check: (c) => [10, 20].every((v) => dev(c, 'SW1')?.vlans.some((x) => x.id === v)) },
      {
        text: 'Przypisz porty PC1 i PC2 do VLAN 10, a PC3 i PC4 do VLAN 20.',
        hint: 'interface port1 vlan 10 … albo okno Porty',
        check: (c) => portOf(c, 'SW1', 'PC1')?.vlan === 10 && portOf(c, 'SW1', 'PC2')?.vlan === 10 && portOf(c, 'SW1', 'PC3')?.vlan === 20 && portOf(c, 'SW1', 'PC4')?.vlan === 20,
      },
      { text: 'Ping z PC1 do PC2 (ten sam VLAN) działa.', check: (c) => icmpArrived(c, 'PC1', '192.168.1.12', REPLY) && portOf(c, 'SW1', 'PC1')?.vlan === 10 },
      { text: 'Ping z PC1 do PC3 nie działa. Na którym etapie się zatrzymuje? Przejrzyj notatki przełącznika.' },
      { text: 'Co trzeba by dodać, żeby VLAN-y mogły się komunikować? (podpowiedź: routing między sieciami)' },
    ],
  },
  {
    id: 'services',
    short: 'Usługi',
    title: '6. Serwer i usługi sieciowe',
    level: 'średni',
    packs: ['ipv4', 'dhcp', 'dns', 'web', 'ftp', 'mail', 'ntp'],
    description:
      'Serwer SRV1 udostępnia DHCP, DNS, WWW (HTTP i HTTPS), FTP, pocztę i czas (NTP). Komputery najpierw pobierają adres i serwer DNS, potem korzystają z usług po nazwach. Porównaj, co widać w pakietach HTTP, a co w HTTPS.',
    build: () => {
      const { net, add, link } = builder();
      const sw = add('switch', 'SW1', 480, 300);
      const srv = add('server', 'SRV1', 480, 110, ...SERVER_CFG);
      const pc1 = add('pc', 'PC1', 220, 470);
      const pc2 = add('pc', 'PC2', 740, 470, 'mail account nauczyciel@szkola.lab pass tajne1');
      pc1.dhcp = true;
      pc2.dhcp = true;
      link(srv, 'eth0', sw, 'port8');
      link(pc1, 'eth0', sw, 'port1');
      link(pc2, 'eth0', sw, 'port2');
      return net;
    },
    tasks: [
      { text: 'Pobierz adres przez DHCP na PC1 i PC2 – razem z adresem serwera DNS.', hint: 'dhcp-client start (albo okno Klient DHCP)', check: (c) => ['PC1', 'PC2'].every((n) => !!dev(c, n)?.dns) },
      { text: 'Na PC1 sprawdź, jaki adres ma www.szkola.lab.', hint: 'nslookup www.szkola.lab', check: (c) => arrived(c, 'PC1', (e) => e.frame.ip?.udp?.dns?.qr === 'response' && e.frame.ip.udp.dns.answers.length > 0) },
      { text: 'Otwórz stronę http://www.szkola.lab w przeglądarce PC1.', hint: 'Okno PC1 → Przeglądarka, albo: http www.szkola.lab', check: (c) => dev(c, 'PC1')?.page?.secure === false && !!dev(c, 'PC1')?.page?.status.startsWith('200') },
      { text: 'Otwórz tę samą stronę przez HTTPS i porównaj pakiety: co widać w HTTP, a co w HTTPS?', hint: 'https www.szkola.lab', check: (c) => dev(c, 'PC1')?.page?.secure === true },
      { text: 'Pobierz plik zadanie.txt przez FTP (konto uczen / haslo123).', hint: 'ftp ftp.szkola.lab get zadanie.txt user uczen pass haslo123', check: (c) => !!dev(c, 'PC1')?.downloads.some((f) => f.name === 'zadanie.txt') },
      {
        text: 'Ustaw na PC1 konto uczen@szkola.lab i wyślij wiadomość do nauczyciel@szkola.lab.',
        hint: 'mail account uczen@szkola.lab pass haslo123, potem mail send nauczyciel@szkola.lab Praca domowa',
        check: (c) => (dev(c, 'SRV1')?.users.find((u) => u.name === 'nauczyciel')?.mail.length ?? 0) > 0,
      },
      { text: 'Odbierz pocztę na PC2 (konto nauczyciela jest już ustawione).', hint: 'mail check', check: (c) => (dev(c, 'PC2')?.inbox.length ?? 0) > 0 },
      { text: 'Zsynchronizuj zegar PC1 z serwerem czasu.', hint: 'show clock, potem ntp sync ntp.szkola.lab', check: (c) => arrived(c, 'PC1', (e) => e.frame.ip?.udp?.ntp?.mode === 4) },
    ],
  },
  {
    id: 'relay',
    short: 'DHCP relay',
    title: '7. DHCP przez router (przekaźnik)',
    level: 'zaawansowany',
    packs: ['ipv4', 'dhcp'],
    description:
      'Serwer DHCP stoi w serwerowni (10.0.10.0/24), a komputery w sieci 192.168.1.0/24. Rozgłoszenie DHCPDISCOVER nie przejdzie przez router – trzeba włączyć na nim przekaźnik DHCP.',
    build: () => {
      const { net, add, link } = builder();
      const r1 = add('router', 'R1', 480, 290, 'ip add 192.168.1.1/24 dev eth0', 'ip add 10.0.10.1/24 dev eth1', 'interface eth0 up', 'interface eth1 up');
      const sw1 = add('switch', 'SW1', 250, 290);
      const sw2 = add('switch', 'SW2', 710, 290);
      const srv = add(
        'server',
        'SRV1',
        880,
        290,
        'ip add 10.0.10.10/24 dev eth0',
        'route add default via 10.0.10.1',
        'service dhcp on',
        'dhcp-server add UCZNIOWIE net 192.168.1.0/24 gw 192.168.1.1 range 192.168.1.100-192.168.1.199',
      );
      const pc1 = add('pc', 'PC1', 90, 150);
      const pc2 = add('pc', 'PC2', 90, 430);
      pc1.dhcp = true;
      pc2.dhcp = true;
      link(pc1, 'eth0', sw1, 'port1');
      link(pc2, 'eth0', sw1, 'port2');
      link(sw1, 'port8', r1, 'eth0');
      link(r1, 'eth1', sw2, 'port8');
      link(srv, 'eth0', sw2, 'port1');
      return net;
    },
    tasks: [
      { text: 'Spróbuj pobrać adres na PC1. Gdzie kończy się DHCPDISCOVER?', hint: 'dhcp-client start, potem przejrzyj notatki routera' },
      { text: 'Włącz na R1 przekaźnik DHCP dla sieci klientów.', hint: 'dhcp-relay set dev eth0 server 10.0.10.10', check: (c) => getIface(dev(c, 'R1')!, 'eth0')?.relay === '10.0.10.10' },
      { text: 'PC1 dostaje adres z serwera w innej sieci.', check: (c) => { const d = dev(c, 'PC1'); return !!d && hasIp(d.ifaces[0]); } },
      { text: 'Znajdź w szczegółach pakietu pole giaddr. Do czego serwer go używa?' },
      { text: 'Ping z PC1 do serwera 10.0.10.10.', check: (c) => icmpArrived(c, 'PC1', '10.0.10.10', REPLY) },
    ],
  },
  {
    id: 'ipv6',
    short: 'IPv6',
    title: '8. IPv6: SLAAC i NDP',
    level: 'średni',
    packs: ['ipv6'],
    description:
      'Sieć tylko z IPv6 – pakiet IPv4 jest wyłączony. Komputery same zbudują adresy z prefiksu ogłaszanego przez router (SLAAC), a zamiast ARP zobaczysz Neighbor Discovery na adresach multicast.',
    build: () => {
      const { net, add, link } = builder();
      const r1 = add('router', 'R1', 480, 290, 'ip add 2001:db8:1::1/64 dev eth0', 'ip add 2001:db8:2::1/64 dev eth1', 'interface eth0 up', 'interface eth1 up');
      const sw1 = add('switch', 'SW1', 250, 290);
      const sw2 = add('switch', 'SW2', 710, 290);
      const pc1 = add('pc', 'PC1', 90, 140);
      const pc2 = add('pc', 'PC2', 90, 440);
      const pc3 = add('pc', 'PC3', 870, 140, 'ip add 2001:db8:2::10/64 dev eth0', 'route add default via 2001:db8:2::1');
      const pc4 = add('pc', 'PC4', 870, 440, 'ip add 2001:db8:2::11/64 dev eth0', 'route add default via 2001:db8:2::1');
      link(pc1, 'eth0', sw1, 'port1');
      link(pc2, 'eth0', sw1, 'port2');
      link(sw1, 'port8', r1, 'eth0');
      link(r1, 'eth1', sw2, 'port8');
      link(pc3, 'eth0', sw2, 'port1');
      link(pc4, 'eth0', sw2, 'port2');
      return net;
    },
    tasks: [
      { text: 'Na PC1 włącz autokonfigurację IPv6 i obejrzyj Router Solicitation / Advertisement.', hint: 'ipv6 autoconf', check: (c) => !!dev(c, 'PC1')?.ifaces[0].ip6.some((a) => a.origin === 'auto') },
      { text: 'Zrób to samo na PC2. Z czego powstała druga połowa adresu (identyfikator interfejsu)?', check: (c) => !!dev(c, 'PC2')?.ifaces[0].ip6.some((a) => a.origin === 'auto') },
      { text: 'Ping z PC1 do PC3 (2001:db8:2::10).', check: (c) => icmpArrived(c, 'PC1', '2001:db8:2::10', REPLY) },
      { text: 'Trace z PC1 do PC3 – router odsyła ICMPv6 Time Exceeded.', hint: 'trace 2001:db8:2::10', check: (c) => icmpArrived(c, 'PC1', '2001:db8:1::1', TIMEX) },
      { text: 'Neighbor Solicitation PC3 → PC4: które komputery przyjęły ramkę? Porównaj z broadcastem ARP.', hint: 'ping 2001:db8:2::11 z PC3, potem sprawdź wynik na PC4 i na routerze' },
      { text: 'Sprawdź tablicę sąsiadów na PC1.', hint: 'show neighbors', check: (c) => (dev(c, 'PC1')?.nd.length ?? 0) > 0 },
    ],
  },
  {
    id: 'dual',
    short: 'Dual stack',
    title: '9. Dual stack: IPv4 i IPv6 razem',
    level: 'zaawansowany',
    packs: ['ipv4', 'ipv6', 'dns', 'web'],
    description: 'Serwer ma adres IPv4 i IPv6, a DNS zwraca dla nazwy rekord A i AAAA. Otwórz tę samą stronę raz po IPv4, raz po IPv6 i porównaj nagłówki pakietów.',
    build: () => {
      const { net, add, link } = builder();
      const sw = add('switch', 'SW1', 480, 300);
      const srv = add(
        'server',
        'SRV1',
        480,
        110,
        'ip add 192.168.1.10/24 dev eth0',
        'ip add 2001:db8:1::10/64 dev eth0',
        'dns-record add www.szkola.lab A 192.168.1.10',
        'dns-record add www.szkola.lab AAAA 2001:db8:1::10',
      );
      srv.services.ftp = false;
      srv.services.mail = false;
      srv.services.ntp = false;
      const pc1 = add('pc', 'PC1', 220, 470, 'ip add 192.168.1.20/24 dev eth0', 'ip add 2001:db8:1::20/64 dev eth0', 'dns set 192.168.1.10');
      const pc2 = add('pc', 'PC2', 740, 470, 'ip add 192.168.1.21/24 dev eth0', 'ip add 2001:db8:1::21/64 dev eth0', 'dns set 2001:db8:1::10');
      link(srv, 'eth0', sw, 'port8');
      link(pc1, 'eth0', sw, 'port1');
      link(pc2, 'eth0', sw, 'port2');
      return net;
    },
    tasks: [
      { text: 'Na PC1 sprawdź rekord AAAA dla www.szkola.lab.', hint: 'nslookup www.szkola.lab AAAA', check: (c) => arrived(c, 'PC1', (e) => !!e.frame.ip?.udp?.dns?.answers.some((a) => a.type === 'AAAA')) },
      { text: 'Otwórz http://www.szkola.lab po IPv4.', hint: 'http www.szkola.lab', check: (c) => arrived(c, 'SRV1', (e) => e.frame.ip?.v === 4 && e.frame.ip.tcp?.dstPort === 80 && !!e.frame.ip.tcp.app) },
      { text: 'Otwórz tę samą stronę po IPv6.', hint: 'http www.szkola.lab -6 (albo zaznacz IPv6 w przeglądarce)', check: (c) => arrived(c, 'SRV1', (e) => e.frame.ip?.v === 6 && e.frame.ip.tcp?.dstPort === 80 && !!e.frame.ip.tcp.app) },
      { text: 'PC2 pyta DNS przez IPv6 (serwer DNS 2001:db8:1::10). Zrób nslookup na PC2.', hint: 'nslookup www.szkola.lab', check: (c) => arrived(c, 'PC2', (e) => e.frame.ip?.v === 6 && !!e.frame.ip.udp?.dns) },
      { text: 'Porównaj nagłówek IPv4 i IPv6 tej samej strony. Którego pola brakuje w IPv6 i czemu nie ma tam ARP?' },
    ],
  },
  {
    id: 'empty',
    short: 'Pusty projekt',
    title: 'Pusty projekt',
    level: 'podstawowy',
    packs: ['ipv4'],
    description: 'Zbuduj własną sieć. Potrzebne protokoły (IPv6, DHCP, usługi serwera…) włączysz w menu „Pakiety”.',
    build: () => emptyNetwork(),
    tasks: [],
  },
];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

void globals6;
