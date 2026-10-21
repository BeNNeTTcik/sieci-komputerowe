// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { arrived } from './checks';

export default defineScenario({
  id: 'dual',
  short: 'Dual stack',
  title: 'Dual stack: IPv4 i IPv6 razem',
  level: 'zaawansowany',
  packs: ['ipv4', 'ipv6', 'dns', 'web'],
  description: 'Serwer ma adres IPv4 i IPv6, a DNS zwraca dla nazwy rekord A i AAAA. Otwórz tę samą stronę raz po IPv4, raz po IPv6 i porównaj nagłówki pakietów.',

  devices: {
    SW1: { type: 'switch', x: 480, y: 300 },
    SRV1: {
      type: 'server',
      x: 480,
      y: 110,
      config: `
        ip add 192.168.1.10/24 dev eth0
        ip add 2001:db8:1::10/64 dev eth0
        dns-record add www.szkola.lab A 192.168.1.10
        dns-record add www.szkola.lab AAAA 2001:db8:1::10
        service ftp off
        service mail off
        service ntp off
      `,
    },
    PC1: { type: 'pc', x: 220, y: 470, config: 'ip add 192.168.1.20/24 dev eth0\nip add 2001:db8:1::20/64 dev eth0\ndns set 192.168.1.10' },
    PC2: { type: 'pc', x: 740, y: 470, config: 'ip add 192.168.1.21/24 dev eth0\nip add 2001:db8:1::21/64 dev eth0\ndns set 2001:db8:1::10' },
  },
  links: [
    ['SRV1:eth0', 'SW1:port8'],
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
  ],

  tasks: [
    { text: 'Na PC1 sprawdź rekord AAAA dla www.szkola.lab.', hint: 'nslookup www.szkola.lab AAAA', check: (c) => arrived(c, 'PC1', (e) => !!e.frame.ip?.udp?.dns?.answers.some((a) => a.type === 'AAAA')) },
    { text: 'Otwórz http://www.szkola.lab po IPv4.', hint: 'http www.szkola.lab', check: (c) => arrived(c, 'SRV1', (e) => e.frame.ip?.v === 4 && e.frame.ip.tcp?.dstPort === 80 && !!e.frame.ip.tcp.app) },
    { text: 'Otwórz tę samą stronę po IPv6.', hint: 'http www.szkola.lab -6 (albo zaznacz IPv6 w przeglądarce)', check: (c) => arrived(c, 'SRV1', (e) => e.frame.ip?.v === 6 && e.frame.ip.tcp?.dstPort === 80 && !!e.frame.ip.tcp.app) },
    { text: 'PC2 pyta DNS przez IPv6 (serwer DNS 2001:db8:1::10). Zrób nslookup na PC2.', hint: 'nslookup www.szkola.lab', check: (c) => arrived(c, 'PC2', (e) => e.frame.ip?.v === 6 && !!e.frame.ip.udp?.dns) },
    { text: 'Porównaj nagłówek IPv4 i IPv6 tej samej strony. Którego pola brakuje w IPv6 i czemu nie ma tam ARP?' },
  ],
});
