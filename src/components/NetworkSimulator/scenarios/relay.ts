// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, getIface, hasIp, icmpArrived, REPLY } from './checks';

export default defineScenario({
  id: 'relay',
  short: 'DHCP relay',
  title: 'DHCP przez router (przekaźnik)',
  level: 'zaawansowany',
  packs: ['ipv4', 'dhcp'],
  description:
    'Serwer DHCP stoi w serwerowni (10.0.10.0/24), a komputery w sieci 192.168.1.0/24. Rozgłoszenie DHCPDISCOVER nie przechodzi przez router – przenosi je dopiero przekaźnik DHCP na R1.',

  devices: {
    R1: {
      type: 'router',
      x: 480,
      y: 290,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 10.0.10.1/24 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    SW1: { type: 'switch', x: 250, y: 290 },
    SW2: { type: 'switch', x: 710, y: 290 },
    SRV1: {
      type: 'server',
      x: 880,
      y: 290,
      config: `
        ip add 10.0.10.10/24 dev eth0
        route add default via 10.0.10.1
        service dhcp on
        dhcp-server add UCZNIOWIE net 192.168.1.0/24 gw 192.168.1.1 range 192.168.1.100-192.168.1.199
      `,
    },
    PC1: { type: 'pc', x: 90, y: 150, dhcp: true },
    PC2: { type: 'pc', x: 90, y: 430, dhcp: true },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'SW2:port8'],
    ['SRV1:eth0', 'SW2:port1'],
  ],
  zones: [
    { text: 'Uczniowie · 192.168.1.0/24', x: 12, y: 84, w: 324, h: 432, color: 'blue' },
    { text: 'Serwerownia · 10.0.10.0/24', x: 624, y: 192, w: 348, h: 192, color: 'violet' },
  ],

  start: 'bez-przekaznika',
  variants: [
    { id: 'bez-przekaznika', name: 'Bez przekaźnika', description: 'R1 nie przekazuje DHCP – klienci nie dostaną adresu.' },
    {
      id: 'gotowa',
      name: 'Przekaźnik włączony',
      description: 'R1 przekazuje zapytania DHCP z eth0 do serwera 10.0.10.10.',
      config: { R1: 'dhcp-relay set dev eth0 server 10.0.10.10' },
    },
  ],

  tasks: [
    { text: 'Spróbuj pobrać adres na PC1. Gdzie kończy się DHCPDISCOVER?', hint: 'dhcp-client start, potem przejrzyj notatki routera' },
    { text: 'Włącz na R1 przekaźnik DHCP dla sieci klientów.', hint: 'dhcp-relay set dev eth0 server 10.0.10.10', check: (c) => getIface(dev(c, 'R1')!, 'eth0')?.relay === '10.0.10.10' },
    { text: 'PC1 dostaje adres z serwera w innej sieci.', check: (c) => { const d = dev(c, 'PC1'); return !!d && hasIp(d.ifaces[0]); } },
    { text: 'Znajdź w szczegółach pakietu pole giaddr. Do czego serwer go używa?' },
    { text: 'Ping z PC1 do serwera 10.0.10.10.', check: (c) => icmpArrived(c, 'PC1', '10.0.10.10', REPLY) },
  ],
});
