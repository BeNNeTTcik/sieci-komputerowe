// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { arrived, dev } from './checks';

export default defineScenario({
  id: 'services',
  short: 'Usługi',
  title: 'Serwer i usługi sieciowe',
  level: 'średni',
  packs: ['ipv4', 'dhcp', 'dns', 'web', 'ftp', 'mail', 'ntp'],
  description:
    'Serwer SRV1 udostępnia DHCP, DNS, WWW (HTTP i HTTPS), FTP, pocztę i czas (NTP). Komputery pobierają adres i serwer DNS, potem korzystają z usług po nazwach. Porównaj, co widać w pakietach HTTP, a co w HTTPS.',

  devices: {
    SW1: { type: 'switch', x: 480, y: 300 },
    SRV1: {
      type: 'server',
      x: 480,
      y: 110,
      config: `
        ip add 192.168.1.10/24 dev eth0
        route add default via 192.168.1.1
        dns set 192.168.1.10
        # DHCP
        service dhcp on
        dhcp-server add LAN net 192.168.1.0/24 gw 192.168.1.1 range 192.168.1.100-192.168.1.150 dns 192.168.1.10
        # DNS
        dns-record add www.szkola.lab A 192.168.1.10
        dns-record add ftp.szkola.lab A 192.168.1.10
        dns-record add mail.szkola.lab A 192.168.1.10
        dns-record add ntp.szkola.lab A 192.168.1.10
        dns-record add szkola.lab MX mail.szkola.lab
        # konta FTP i poczty (konto uczen / haslo123 jest domyślnie)
        user add nauczyciel tajne1
      `,
    },
    PC1: { type: 'pc', x: 220, y: 470, dhcp: true },
    PC2: { type: 'pc', x: 740, y: 470, dhcp: true, config: 'mail account nauczyciel@szkola.lab pass tajne1' },
  },
  links: [
    ['SRV1:eth0', 'SW1:port8'],
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
  ],

  start: 'bez-adresow',
  variants: [
    { id: 'bez-adresow', name: 'Komputery bez adresów', description: 'Najpierw dhcp-client start na PC1 i PC2.' },
    {
      id: 'adresy',
      name: 'Komputery mają adresy',
      description: 'PC1 i PC2 pobrały już adres i serwer DNS – od razu można otwierać strony i wysyłać pocztę.',
      config: { PC1: 'dhcp-client start', PC2: 'dhcp-client start' },
    },
  ],

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
});
