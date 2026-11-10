// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Rozwiązywanie problemów: błędna konfiguracja urządzeń końcowych (adres, maska, brama, interfejs).
// Każdy wariant to inne „zgłoszenie” z innym zestawem usterek; „sprawny” (ukryty) to klucz dla prowadzącego.
// Zadania są wspólne: każdy komputer ma dotrzeć do serwera – nieważne, którą drogą student dojdzie do usterki.
//
// ============================== KLUCZ DLA PROWADZĄCEGO ==============================
// Poprawnie: PC1–PC4 = 192.168.1.11–14/24, brama 192.168.1.1; SRV-WWW = 192.168.2.10/24, brama 192.168.2.1.
// (Komentarze nie trafiają na stronę – build je usuwa. Widać je tylko w plikach źródłowych.)
//
// ZGŁOSZENIE 1 (wariant „zgloszenie-1”)
//  PC1 – brak bramy domyślnej.
//        Objaw:  ping → „błąd wysyłania… brama domyślna nie jest ustawiona”.
//        Gdzie:  show ip (Brama IPv4: -), show routes (brak trasy domyślnej).
//        Napraw: route add default via 192.168.1.1
//  PC2 – brama 192.168.1.254 – takiego urządzenia nie ma w sieci.
//        Objaw:  ping → „brak odpowiedzi”; na liście zdarzeń zapytanie ARP o 192.168.1.254 bez odpowiedzi.
//        Gdzie:  show ip (Brama IPv4: 192.168.1.254), show arp (brak wpisu bramy).
//        Napraw: route add default via 192.168.1.1
//  PC3 – adres z innej sieci: 192.168.2.13/24 w pracowni 192.168.1.0/24.
//        Objaw:  ping → „brak odpowiedzi”; PC3 uważa serwer 192.168.2.10 za „swoją” sieć i pyta o niego ARP-em w pracowni.
//        Gdzie:  show ip (adres 192.168.2.13, sieć 192.168.2.0/24 ≠ pracownia).
//        Napraw: ip del 192.168.2.13  i  ip add 192.168.1.13/24 dev eth0
//  PC4 – za krótka maska /16 (192.168.1.14/16).
//        Objaw:  ping → „brak odpowiedzi”; 192.168.2.10 mieści się w 192.168.0.0/16, więc PC4 nie idzie do bramy, tylko pyta ARP-em o serwer.
//        Gdzie:  show ip (sieć 192.168.0.0/16), lista zdarzeń: ARP „Kto ma 192.168.2.10?” zamiast o bramę.
//        Napraw: ip add 192.168.1.14/24 dev eth0
//
// ZGŁOSZENIE 2 (wariant „zgloszenie-2”)
//  PC1 – wyłączony interfejs eth0.
//        Objaw:  ping → „błąd wysyłania… Interfejs sieciowy jest wyłączony”; na schemacie czerwony punkt przy kablu.
//        Gdzie:  show interfaces (eth0: wyłączony).
//        Napraw: interface eth0 up
//  PC2 – brama 192.168.1.13 to adres PC3, a komputer nie przekazuje cudzych pakietów (RFC 1122).
//        Objaw:  ping → „brak odpowiedzi”; na liście zdarzeń pakiet dochodzi do PC3 i tam jest odrzucony.
//        Gdzie:  show ip na PC2 (Brama IPv4: 192.168.1.13) – porównaj z adresem PC3.
//        Napraw: route add default via 192.168.1.1
//  PC3 – maska /30 (192.168.1.13/30 → sieć 192.168.1.12–15), brama 192.168.1.1 leży poza nią.
//        Objaw:  ping → „błąd wysyłania… Brama 192.168.1.1 nie należy do mojej sieci 192.168.1.12/30”.
//        Gdzie:  show ip (sieć 192.168.1.12/30).
//        Napraw: ip add 192.168.1.13/24 dev eth0
//  PC4 – konfiguracja poprawna, a mimo to brak odpowiedzi – usterka leży na serwerze.
//  SRV-WWW – brak bramy domyślnej: Echo Reply do sieci 192.168.1.0/24 nie wychodzi z serwera (dotyczy wszystkich komputerów).
//        Objaw:  ping → „brak odpowiedzi”; na liście zdarzeń Echo Request dochodzi do serwera, odpowiedź jest odrzucana na serwerze.
//        Gdzie:  show ip / show routes na SRV-WWW (Brama IPv4: -).
//        Napraw: na SRV-WWW: route add default via 192.168.2.1
// =====================================================================================

import { defineScenario } from './types';
import { dev, icmpArrived, REPLY } from './checks';
import type { CheckCtx, DeviceConfig, Task } from './types';

const SRV = '192.168.2.10';
const PCS = ['PC1', 'PC2', 'PC3', 'PC4'];

/** komputer dostał odpowiedź od serwera: ping albo strona */
const reaches = (c: CheckCtx, pc: string) => {
  const p = dev(c, pc)?.page;
  return icmpArrived(c, pc, SRV, REPLY) || (!!p && p.url.includes(SRV) && p.status.startsWith('200'));
};

const pcTask = (pc: string): Task => ({
  text: `${pc} łączy się z serwerem (ping ${SRV} albo http ${SRV}).`,
  hint: 'Zacznij od objawu: komunikat pinga. Potem show ip i show routes na komputerze – porównaj z poprawną konfiguracją z opisu.',
  check: (c) => reaches(c, pc),
});

const GOOD: DeviceConfig = {
  PC1: 'ip add 192.168.1.11/24 dev eth0\nroute add default via 192.168.1.1',
  PC2: 'ip add 192.168.1.12/24 dev eth0\nroute add default via 192.168.1.1',
  PC3: 'ip add 192.168.1.13/24 dev eth0\nroute add default via 192.168.1.1',
  PC4: 'ip add 192.168.1.14/24 dev eth0\nroute add default via 192.168.1.1',
  'SRV-WWW': 'route add default via 192.168.2.1',
};

export default defineScenario({
  id: 'usterki-hosty',
  short: 'Usterki: komputery',
  title: 'Rozwiązywanie problemów: konfiguracja komputerów',
  level: 'średni',
  exercise: true,
  packs: ['ipv4', 'web'],
  description: [
    'Zgłoszenie od nauczyciela: komputery w pracowni nie otwierają strony szkolnego serwera http://192.168.2.10. Twoje zadanie: znaleźć i usunąć usterki tak, żeby wszystkie cztery komputery łączyły się z serwerem.',
    'Poprawna konfiguracja pracowni: adresy 192.168.1.11–192.168.1.14, maska /24 (255.255.255.0), brama 192.168.1.1. Serwer: 192.168.2.10/24, brama 192.168.2.1. Router R1 jest skonfigurowany poprawnie.',
    'Narzędzia: ping, trace, show ip, show routes, show interfaces, show arp. Komunikaty błędów i lista zdarzeń (gdzie ramka została odrzucona i dlaczego) to najlepsze wskazówki.',
  ].join('\n'),

  devices: {
    R1: {
      type: 'router',
      x: 520,
      y: 300,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 192.168.2.1/24 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    'SRV-WWW': {
      type: 'server',
      x: 800,
      y: 300,
      config: `
        ip add ${SRV}/24 dev eth0
        service dhcp off
        service dns off
        service https off
        service ftp off
        service mail off
        service ntp off
        service discard off
        web set / Strona szkolnego serwera – jeśli ją widzisz, ten komputer jest już sprawny.
      `,
    },
    SW1: { type: 'switch', x: 320, y: 300 },
    PC1: { type: 'pc', x: 110, y: 105 },
    PC2: { type: 'pc', x: 110, y: 235 },
    PC3: { type: 'pc', x: 110, y: 365 },
    PC4: { type: 'pc', x: 110, y: 495 },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['PC3:eth0', 'SW1:port3'],
    ['PC4:eth0', 'SW1:port4'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'SRV-WWW:eth0'],
  ],
  zones: [
    { text: 'Pracownia – 192.168.1.0/24', x: 12, y: 40, w: 410, h: 510, color: 'blue' },
    { text: 'Serwerownia – 192.168.2.0/24', x: 690, y: 190, w: 250, h: 220, color: 'green' },
  ],

  start: 'zgloszenie-1',
  variants: [
    {
      id: 'zgloszenie-1',
      name: 'Zgłoszenie 1 – cztery komputery, cztery usterki',
      description: 'Każdy komputer ma inną usterkę w konfiguracji IP. Serwer i router działają.',
      config: {
        // brak bramy
        PC1: 'ip add 192.168.1.11/24 dev eth0',
        // brama, której nie ma w sieci
        PC2: 'ip add 192.168.1.12/24 dev eth0\nroute add default via 192.168.1.254',
        // adres z innej sieci
        PC3: 'ip add 192.168.2.13/24 dev eth0\nroute add default via 192.168.1.1',
        // za krótka maska – serwer wygląda na „lokalny”
        PC4: 'ip add 192.168.1.14/16 dev eth0\nroute add default via 192.168.1.1',
        'SRV-WWW': GOOD['SRV-WWW'],
      },
    },
    {
      id: 'zgloszenie-2',
      name: 'Zgłoszenie 2 – usterki trudniejsze',
      description: 'Usterki są mniej oczywiste, a jedna z nich nie leży na żadnym komputerze w pracowni.',
      config: {
        // wyłączony interfejs
        PC1: 'ip add 192.168.1.11/24 dev eth0\nroute add default via 192.168.1.1\ninterface eth0 down',
        // brama wskazuje inny komputer (host nie przekazuje cudzych pakietów)
        PC2: 'ip add 192.168.1.12/24 dev eth0\nroute add default via 192.168.1.13',
        // maska /30 – brama poza siecią komputera
        PC3: 'ip add 192.168.1.13/30 dev eth0\nroute add default via 192.168.1.1',
        PC4: GOOD.PC4,
        // serwer bez bramy – odpowiedzi do innych sieci nie wychodzą
      },
    },
    { id: 'sprawny', name: 'Klucz: konfiguracja poprawna', hidden: true, config: GOOD },
  ],

  tasks: [
    ...PCS.map(pcTask),
    { text: 'Dla każdej usterki zapisz: urządzenie, objaw (komunikat albo miejsce odrzucenia ramki), polecenie, którym ją znalazłeś, i poprawkę.' },
    { text: 'Pytanie: dlaczego komputer z maską /16 nawet nie próbował wysłać pakietu do bramy? Co robi host, zanim wyśle pakiet?' },
  ],
});
