// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Szablon do ćwiczenia „Segmentacja sieci szkolnej”, Etap 1: segmentacja fizyczna.
// Uczniowie dostają rozstawione urządzenia z podłączonymi komputerami; łączą przełączniki, nadają adresy,
// rozłączają sieć, a na końcu wstawiają router jako jedyne przejście między pomieszczeniami.
// Warianty odpowiadają krokom ćwiczenia – prowadzący może wczytać dowolny krok jako stan początkowy.

import { defineScenario } from './types';
import { dev, getIface, hasIp, icmpArrived, REPLY } from './checks';
import type { CheckCtx, DeviceConfig } from './types';

// Porty jak w treści ćwiczenia: Fa0/1 → port1, Fa0/2 → port2, Fa0/3 → port3, Fa0/10 → port7, G0/1 → port8
// (przełącznik w symulatorze ma 8 portów).

/** adresy z Tabeli 5 – sieć płaska 192.168.1.0/24 */
const PLASKA: DeviceConfig = {
  'PC-U1.1': 'ip add 192.168.1.11/24 dev eth0',
  'PC-U2.1': 'ip add 192.168.1.12/24 dev eth0',
  'PC-N.1': 'ip add 192.168.1.21/24 dev eth0',
  'SRV-DZIENNIK': 'ip add 192.168.1.50/24 dev eth0',
};

/** router R1 i jego kable – krok 1.3 */
const R1 = { type: 'router' as const, x: 480, y: 150 };
const R1_LINKS: [string, string][] = [
  ['SW-U:port8', 'R1:eth0'],
  ['SW-N:port8', 'R1:eth1'],
];

const linked = (c: CheckCtx, a: string, b: string) => {
  const da = dev(c, a);
  const db = dev(c, b);
  return !!da && !!db && c.net.links.some((l) => (l.a.dev === da.id && l.b.dev === db.id) || (l.a.dev === db.id && l.b.dev === da.id));
};
/**
 * Krok 1.2: najpierw musiała działać łączność PC-U1.1 → pokój N (odpowiedź od .21 albo .50),
 * a potem, już bez kabla między przełącznikami, PC-U1.1 musiał spróbować jeszcze raz.
 */
const retestAfterCut = (c: CheckCtx) => {
  const pc = dev(c, 'PC-U1.1');
  if (!pc) return false;
  const far = ['192.168.1.21', '192.168.1.50'];
  const ok = c.events.filter((e) => e.kind === 'hop' && !e.dropped && e.to === pc.id && far.includes(e.frame.ip?.src ?? ''));
  if (!ok.length) return false;
  const t1 = Math.max(...ok.map((e) => e.t));
  return c.events.some((e) => e.from === pc.id && e.t > t1 && (far.includes(e.frame.ip?.dst ?? '') || far.includes(e.frame.arp?.targetIp ?? '')));
};
const ipOf = (c: CheckCtx, name: string, ifName = 'eth0') => {
  const d = dev(c, name);
  const i = d && getIface(d, ifName);
  return i && hasIp(i) ? `${i.ip}/${i.mask}` : '';
};

export default defineScenario({
  id: 'segmentacja',
  short: 'Segmentacja fizyczna',
  title: 'Segmentacja sieci szkolnej – Etap 1: segmentacja fizyczna',
  level: 'podstawowy',
  packs: ['ipv4', 'web'],
  exercise: true,
  description: [
    'Szkoła ma dwie pracownie uczniów (U1, U2), pokój nauczycielski (N) z serwerem dziennika elektronicznego i serwerownię z przełącznikami SW-U i SW-N. Komputery są już podłączone. Sprawdzisz, co się dzieje, gdy wszystko jest w jednej sieci, gdy sieci są całkowicie rozdzielone i gdy między nimi stoi router.',
    'Adresy (Tabela 5): PC-U1.1 192.168.1.11/24 · PC-U2.1 192.168.1.12/24 · PC-N.1 192.168.1.21/24 · SRV-DZIENNIK 192.168.1.50/24 (usługa HTTP).',
    'Porty z treści zadania: Fa0/1–Fa0/3 → port1–port3, Fa0/10 → port7, G0/1 → port8. Router 2911 → R1 z eth0 i eth1. Zadania oznaczone „auto” zaznaczają się same, pytania zaznaczasz po zapisaniu odpowiedzi.',
  ].join('\n'),

  devices: {
    'SRV-DZIENNIK': {
      type: 'server',
      x: 850,
      y: 430,
      config: `
        # tylko usługa HTTP (dziennik elektroniczny)
        service dhcp off
        service dns off
        service https off
        service ftp off
        service mail off
        service ntp off
        service discard off
        web set / Dziennik elektroniczny – logowanie dla uczniów, rodziców i nauczycieli
      `,
    },
    'SW-U': { type: 'switch', x: 380, y: 320 },
    'SW-N': { type: 'switch', x: 580, y: 320 },
    'PC-U1.1': { type: 'pc', x: 120, y: 160 },
    'PC-U2.1': { type: 'pc', x: 120, y: 450 },
    'PC-N.1': { type: 'pc', x: 850, y: 170 },
  },
  links: [
    ['PC-U1.1:eth0', 'SW-U:port1'],
    ['PC-U2.1:eth0', 'SW-U:port2'],
    ['PC-N.1:eth0', 'SW-N:port3'],
    ['SRV-DZIENNIK:eth0', 'SW-N:port7'],
  ],
  zones: [
    { text: 'Pracownia U1', x: 12, y: 72, w: 230, h: 196, color: 'blue' },
    { text: 'Pracownia U2', x: 12, y: 346, w: 230, h: 196, color: 'blue' },
    { text: 'Serwerownia', x: 270, y: 72, w: 420, h: 470, color: 'ink' },
    { text: 'Pokój nauczycielski (N)', x: 718, y: 72, w: 242, h: 470, color: 'green' },
  ],

  start: 'start',
  variants: [
    {
      id: 'start',
      name: 'Krok 1.1 – do wykonania',
      description: 'Komputery są podłączone, ale nie mają adresów, a przełączniki nie są ze sobą połączone.',
    },
    {
      id: 'plaska',
      name: 'Krok 1.1 – sieć płaska (gotowa)',
      description: 'Przełączniki połączone kablem port8 – port8, adresy z Tabeli 5. Można od razu robić testy z Tabeli 6.',
      links: [['SW-U:port8', 'SW-N:port8']],
      config: PLASKA,
    },
    {
      id: 'odciecie',
      name: 'Krok 1.2 – całkowite odcięcie',
      description: 'Adresy z Tabeli 5, ale bez kabla między przełącznikami.',
      config: PLASKA,
    },
    {
      id: 'router',
      name: 'Krok 1.3 – router do skonfigurowania',
      description: 'R1 jest podłączony (SW-U port8 – R1 eth0, SW-N port8 – R1 eth1), ale jego interfejsy są wyłączone. Komputery mają jeszcze adresy z sieci płaskiej /24.',
      devices: { R1 },
      links: R1_LINKS,
      config: PLASKA,
    },
    {
      id: 'router-gotowy',
      name: 'Krok 1.3 – klucz dla prowadzącego',
      hidden: true,
      description: 'Podział na /25: uczniowie 192.168.1.0/25 (brama .1), nauczyciele 192.168.1.128/25 (brama .129). PC-N.1 i SRV-DZIENNIK mają ostatni oktet +128.',
      devices: { R1 },
      links: R1_LINKS,
      config: {
        R1: `
          ip add 192.168.1.1/25 dev eth0
          ip add 192.168.1.129/25 dev eth1
          interface eth0 up
          interface eth1 up
        `,
        'PC-U1.1': 'ip add 192.168.1.11/25 dev eth0\nroute add default via 192.168.1.1',
        'PC-U2.1': 'ip add 192.168.1.12/25 dev eth0\nroute add default via 192.168.1.1',
        'PC-N.1': 'ip add 192.168.1.149/25 dev eth0\nroute add default via 192.168.1.129',
        'SRV-DZIENNIK': 'ip add 192.168.1.178/25 dev eth0\nroute add default via 192.168.1.129',
      },
    },
  ],

  tasks: [
    {
      text: '1.1 Połącz przełączniki kablem (SW-U port8 – SW-N port8) i nadaj adresy z Tabeli 5.',
      hint: 'Narzędzie Kabel, potem np. na PC-U1.1: ip add 192.168.1.11/24 dev eth0 (albo okno Adresy IP).',
      check: (c) =>
        linked(c, 'SW-U', 'SW-N') &&
        ipOf(c, 'PC-U1.1').startsWith('192.168.1.11/') &&
        ipOf(c, 'PC-U2.1').startsWith('192.168.1.12/') &&
        ipOf(c, 'PC-N.1').startsWith('192.168.1.21/') &&
        ipOf(c, 'SRV-DZIENNIK').startsWith('192.168.1.50/'),
    },
    {
      text: 'W trybie Symulacja, z filtrami ARP i ICMP, wyślij ping z PC-U1.1 do PC-U2.1.',
      hint: 'ping 192.168.1.12 count 1 – policz, do ilu urządzeń dotarło zapytanie ARP.',
      check: (c) => icmpArrived(c, 'PC-U1.1', '192.168.1.12', REPLY),
    },
    {
      text: 'Z PC-U1.1 otwórz w przeglądarce stronę http://192.168.1.50.',
      hint: 'Okno PC-U1.1 → Przeglądarka, albo w terminalu: http 192.168.1.50',
      check: (c) => !!dev(c, 'PC-U1.1')?.page?.status.startsWith('200'),
    },
    {
      text: 'Pytanie (Tabela 6): do ilu urządzeń dotarło zapytanie ARP z PC-U1.1 i dlaczego także do pokoju N? Co to oznacza dla bezpieczeństwa dziennika?',
      hint: 'W trybie Symulacja kliknij ramkę ARP na liście zdarzeń i prześledź, przez które porty przełączniki ją wysłały.',
    },
    {
      text: '1.2 Usuń kabel między przełącznikami i powtórz testy z Tabeli 6.',
      hint: 'Narzędzie Usuń i kliknij kabel SW-U – SW-N, potem z PC-U1.1: ping 192.168.1.21 count 1 albo http 192.168.1.50.',
      check: (c) => !!dev(c, 'SW-U') && !!dev(c, 'SW-N') && !linked(c, 'SW-U', 'SW-N') && retestAfterCut(c),
    },
    {
      text: 'Pytanie: czy uczniowie mają teraz dostęp do dziennika? Czy nauczyciel może wystawić ocenę z komputera w pracowni? Co straciliśmy?',
    },
    {
      text: '1.3 Dodaj router R1 i podłącz SW-U port8 do R1 eth0, a SW-N port8 do R1 eth1.',
      hint: 'Przeciągnij Router z paska urządzeń (dostanie nazwę R1), potem narzędzie Kabel – symulator zapyta o porty.',
      check: (c) => linked(c, 'SW-U', 'R1') && linked(c, 'SW-N', 'R1'),
    },
    {
      text: 'Podziel 192.168.1.0/24 na dwie podsieci /25 i skonfiguruj interfejsy R1 (brama = pierwszy adres hosta).',
      hint: 'R1: ip add 192.168.1.1/25 dev eth0, ip add 192.168.1.129/25 dev eth1, interface eth0 up, interface eth1 up',
      check: (c) => ipOf(c, 'R1', 'eth0') === '192.168.1.1/255.255.255.128' && ipOf(c, 'R1', 'eth1') === '192.168.1.129/255.255.255.128' && !!getIface(dev(c, 'R1')!, 'eth0')?.up && !!getIface(dev(c, 'R1')!, 'eth1')?.up,
    },
    {
      text: 'Ustaw bramy na komputerach; PC-N.1 i SRV-DZIENNIK dostają ostatni oktet +128 (.149 i .178).',
      hint: 'PC-N.1: ip add 192.168.1.149/25 dev eth0, route add default via 192.168.1.129',
      check: (c) => ipOf(c, 'PC-N.1') === '192.168.1.149/255.255.255.128' && ipOf(c, 'SRV-DZIENNIK') === '192.168.1.178/255.255.255.128' && dev(c, 'PC-U1.1')?.gateway === '192.168.1.1',
    },
    {
      text: 'Sprawdź, czy PC-U1.1 pinguje PC-N.1 przez R1 i otwiera stronę dziennika (http://192.168.1.178).',
      check: (c) => {
        const page = dev(c, 'PC-U1.1')?.page;
        return icmpArrived(c, 'PC-U1.1', '192.168.1.149', REPLY) && !!page && page.url.includes('192.168.1.178') && page.status.startsWith('200');
      },
    },
    {
      text: 'Pytanie: ile jest teraz domen rozgłoszeniowych? O czyj adres pyta ARP z PC-U1.1, gdy pinguje PC-N.1? Jaki TTL ma odpowiedź i dlaczego inny niż w kroku 1.1?',
      hint: 'W trybie Symulacja sprawdź, czy ramka ARP z pracowni dociera jeszcze do SW-N; TTL widać w odpowiedzi ping w terminalu.',
    },
    {
      text: '1.4 Inwentaryzacja: wypisz urządzenia sieci po segmentacji z liczbą zajętych i wolnych portów (przełącznik ma tu 8 portów). Odpowiedz dyrektorowi: czy sam podział na dwa przełączniki i router wystarczy, żeby uczniowie nie dostali się do dziennika?',
      hint: 'Router przekazuje ruch między podsieciami, ale niczego nie blokuje – zauważ, że strona dziennika dalej się otwiera.',
    },
  ],
});
