// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Rozwiązywanie problemów: nazwy się nie rozwiązują (DNS). Łączność IP działa – zawodzi serwer DNS w konfiguracji
// komputera, sam serwer DNS, rekord w strefie albo wpis w pliku hosts. Warianty to różne zgłoszenia; „sprawny” – klucz.
//
// ============================== KLUCZ DLA PROWADZĄCEGO ==============================
// Poprawnie: każdy PC ma „dns set 192.168.2.53”; na SRV-DNS rekord „www.szkola.lab A 192.168.2.80”; SRV-DNS ma bramę 192.168.2.1.
// Test, od którego warto zacząć: http 192.168.2.80 działa od początku → łączność IP jest dobra, problem leży w rozwiązywaniu nazw.
// (Komentarze nie trafiają na stronę – build je usuwa. Widać je tylko w plikach źródłowych.)
//
// ZGŁOSZENIE 1 (wariant „zgloszenie-1”)
//  PC1 – brak serwera DNS.
//        Objaw:  „nie można rozwiązać nazwy… Brak serwera DNS”.
//        Gdzie:  show dns (Serwer DNS: -).
//        Napraw: dns set 192.168.2.53
//  PC2 – literówka w adresie serwera DNS: 192.168.2.35 zamiast 192.168.2.53.
//        Objaw:  „Serwer DNS 192.168.2.35 nie odpowiada (3 próby)”; na liście zdarzeń router pyta ARP-em o 192.168.2.35 bez odpowiedzi.
//        Gdzie:  show dns.
//        Napraw: dns set 192.168.2.53
//  PC3 – jako DNS wpisany serwer WWW 192.168.2.80, na którym usługa DNS nie działa.
//        Objaw:  „Serwer DNS 192.168.2.80 nie odpowiada”; na liście zdarzeń zapytanie dochodzi do SRV-WWW: „Port UDP 53 jest zamknięty”.
//        Gdzie:  show dns na PC3; show services na SRV-WWW (DNS wyłączony).
//        Napraw: dns set 192.168.2.53
//  SRV-DNS – rekord www.szkola.lab wskazuje 192.168.2.8 (literówka, powinno być .80) – dotyczy wszystkich komputerów.
//        Objaw:  po naprawie PC: nslookup zwraca 192.168.2.8, a http www.szkola.lab kończy się „SYN wysłany 4 razy”.
//        Gdzie:  nslookup www.szkola.lab na PC; show dns na SRV-DNS (strefa).
//        Napraw: na SRV-DNS: dns-record del www.szkola.lab A  i  dns-record add www.szkola.lab A 192.168.2.80
//  PUŁAPKA – pamięć podręczna: komputer, który już zapytał o nazwę, pamięta zły adres także po poprawie rekordu.
//        Objaw:  „DNS: www.szkola.lab (A) → 192.168.2.8 – z pamięci podręcznej”.
//        Napraw: dns flush na każdym komputerze, który pytał wcześniej.
//
// ZGŁOSZENIE 2 (wariant „zgloszenie-2”)
//  SRV-DNS – brak bramy domyślnej: odpowiedzi DNS do pracowni nie wychodzą z serwera (dotyczy wszystkich).
//        Objaw:  „Serwer DNS 192.168.2.53 nie odpowiada” na PC1, choć PC1 jest skonfigurowany poprawnie.
//        Gdzie:  lista zdarzeń – zapytanie dochodzi do SRV-DNS, odpowiedź jest odrzucana na serwerze; show ip na SRV-DNS.
//        Napraw: na SRV-DNS: route add default via 192.168.2.1
//  SRV-DNS – literówka w nazwie rekordu: „ww.szkola.lab” zamiast „www.szkola.lab” (dotyczy wszystkich).
//        Objaw:  po naprawie bramy: „Nazwa www.szkola.lab nie istnieje (NXDOMAIN)”.
//        Gdzie:  show dns na SRV-DNS (strefa).
//        Napraw: dns-record add www.szkola.lab A 192.168.2.80  (i ewentualnie dns-record del ww.szkola.lab)
//  PC2 – jako DNS wpisany router 192.168.1.1, a router nie jest serwerem DNS.
//        Objaw:  „Serwer DNS 192.168.1.1 nie odpowiada (3 próby)”.
//        Gdzie:  show dns.
//        Napraw: dns set 192.168.2.53
//  PC3 – stary wpis w pliku hosts: www.szkola.lab → 192.168.2.81 (dawny adres serwera WWW).
//        Objaw:  „www.szkola.lab → 192.168.2.81 – z pliku hosts”; nslookup pokazuje poprawne .80 (nie czyta pliku hosts),
//                a przeglądarka łączy się z .81 i kończy na „SYN wysłany 4 razy”.
//        Gdzie:  hosts list (albo show dns).
//        Napraw: hosts del www.szkola.lab
// =====================================================================================

import { defineScenario } from './types';
import { dev } from './checks';
import type { CheckCtx, Task } from './types';

const WWW = 'www.szkola.lab';
const PCS = ['PC1', 'PC2', 'PC3'];

const opened = (c: CheckCtx, pc: string) => {
  const p = dev(c, pc)?.page;
  return !!p && p.url.includes(WWW) && p.status.startsWith('200');
};

const pcTask = (pc: string): Task => ({
  text: `${pc} otwiera stronę http://${WWW}.`,
  hint: 'Najpierw sprawdź łączność bez DNS: http 192.168.2.80. Potem show dns, nslookup www.szkola.lab i hosts list. Na serwerze DNS: show dns i show services.',
  check: (c) => opened(c, pc),
});

export default defineScenario({
  id: 'usterki-dns',
  short: 'Usterki: DNS',
  title: 'Rozwiązywanie problemów: nazwy się nie rozwiązują (DNS)',
  level: 'średni',
  exercise: true,
  packs: ['ipv4', 'dns', 'web'],
  description: [
    `Zgłoszenie: „Internet nie działa” – komputery w pracowni nie otwierają strony http://${WWW}. Znajdź i usuń usterki tak, żeby wszystkie trzy komputery otwierały stronę po nazwie.`,
    `Poprawnie: serwer DNS szkoły to 192.168.2.53 (strefa szkola.lab), serwer WWW to 192.168.2.80, a rekord A ${WWW} wskazuje 192.168.2.80. Każdy komputer ma ustawiony serwer DNS 192.168.2.53. Adresy IP, bramy i router są poprawne.`,
    'Narzędzia: http (po nazwie i po adresie), nslookup, ping, show dns, hosts list, dns set, dns flush; na serwerze DNS: show dns, show services, dns-record, service. Plik hosts ma pierwszeństwo przed DNS, ale nslookup go nie czyta.',
  ].join('\n'),

  devices: {
    'SRV-DNS': {
      type: 'server',
      x: 860,
      y: 170,
      config: `
        ip add 192.168.2.53/24 dev eth0
        route add default via 192.168.2.1
        service dhcp off
        service http off
        service https off
        service ftp off
        service mail off
        service ntp off
        service discard off
      `,
    },
    'SRV-WWW': {
      type: 'server',
      x: 860,
      y: 430,
      config: `
        ip add 192.168.2.80/24 dev eth0
        route add default via 192.168.2.1
        service dhcp off
        service dns off
        service https off
        service ftp off
        service mail off
        service ntp off
        service discard off
        web set / Strona www.szkola.lab – nazwa działa, ten komputer jest już sprawny.
      `,
    },
    R1: {
      type: 'router',
      x: 500,
      y: 300,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 192.168.2.1/24 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    SW1: { type: 'switch', x: 300, y: 300 },
    SW2: { type: 'switch', x: 690, y: 300 },
    PC1: { type: 'pc', x: 110, y: 130, config: 'ip add 192.168.1.11/24 dev eth0\nroute add default via 192.168.1.1' },
    PC2: { type: 'pc', x: 110, y: 300, config: 'ip add 192.168.1.12/24 dev eth0\nroute add default via 192.168.1.1' },
    PC3: { type: 'pc', x: 110, y: 470, config: 'ip add 192.168.1.13/24 dev eth0\nroute add default via 192.168.1.1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['PC3:eth0', 'SW1:port3'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'SW2:port8'],
    ['SW2:port1', 'SRV-DNS:eth0'],
    ['SW2:port2', 'SRV-WWW:eth0'],
  ],
  zones: [
    { text: 'Pracownia – 192.168.1.0/24', x: 12, y: 50, w: 390, h: 500, color: 'blue' },
    { text: 'Serwerownia – 192.168.2.0/24', x: 610, y: 50, w: 340, h: 500, color: 'green' },
  ],

  start: 'zgloszenie-1',
  variants: [
    {
      id: 'zgloszenie-1',
      name: 'Zgłoszenie 1 – „strona nie działa”',
      description: 'Każdy komputer ma inną usterkę w ustawieniach DNS, a do tego coś jest nie tak w strefie na serwerze.',
      config: {
        // rekord z literówką w adresie (powinno być .80)
        'SRV-DNS': `dns-record add ${WWW} A 192.168.2.8\ndns-record add plan.szkola.lab A 192.168.2.80`,
        // PC1: brak serwera DNS
        // PC2: literówka w adresie serwera DNS
        PC2: 'dns set 192.168.2.35',
        // PC3: jako DNS wpisany serwer WWW (nie działa na nim usługa DNS)
        PC3: 'dns set 192.168.2.80',
      },
    },
    {
      id: 'zgloszenie-2',
      name: 'Zgłoszenie 2 – „wczoraj działało”',
      description: 'Po porządkach w serwerowni nazwy przestały działać. Jeden komputer zachowuje się inaczej niż pozostałe.',
      config: {
        // serwer DNS bez bramy (odpowiedzi do pracowni nie wychodzą) i rekord z literówką w nazwie
        'SRV-DNS': `route del default\ndns-record add ww.szkola.lab A 192.168.2.80\ndns-record add plan.szkola.lab A 192.168.2.80`,
        PC1: 'dns set 192.168.2.53',
        // jako DNS wpisany router
        PC2: 'dns set 192.168.1.1',
        // stary wpis w pliku hosts (serwer WWW miał kiedyś adres .81)
        PC3: `dns set 192.168.2.53\nhosts add ${WWW} 192.168.2.81`,
      },
    },
    {
      id: 'sprawny',
      name: 'Klucz: konfiguracja poprawna',
      hidden: true,
      config: {
        'SRV-DNS': `dns-record add ${WWW} A 192.168.2.80\ndns-record add plan.szkola.lab A 192.168.2.80`,
        PC1: 'dns set 192.168.2.53',
        PC2: 'dns set 192.168.2.53',
        PC3: 'dns set 192.168.2.53',
      },
    },
  ],

  tasks: [
    ...PCS.map(pcTask),
    { text: 'Pytanie: dlaczego http 192.168.2.80 działało od początku, a http www.szkola.lab nie? Które usterki dotyczyły jednego komputera, a które wszystkich?' },
    { text: 'Dla każdej usterki zapisz: urządzenie, objaw, polecenie, którym ją znalazłeś (np. nslookup, show dns, hosts list), i poprawkę.' },
  ],
});
