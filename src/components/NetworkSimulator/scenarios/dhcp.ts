// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, hasIp, icmpArrived, REPLY } from './checks';

const POOL = 'dhcp-server add LAN net 192.168.10.0/24 gw 192.168.10.1 range 192.168.10.100-192.168.10.150';

export default defineScenario({
  id: 'dhcp',
  short: 'DHCP',
  title: 'Automatyczna adresacja: DHCP',
  level: 'średni',
  packs: ['ipv4', 'dhcp', 'print'],
  description:
    'Router R1 przydziela adresy w sieci 192.168.10.0/24. Uruchom na komputerach klienta DHCP i obejrzyj cztery kroki DORA – Discover, Offer, Request, Ack.',

  devices: {
    R1: {
      type: 'router',
      x: 360,
      y: 120,
      config: `
        ip add 192.168.10.1/24 dev eth0
        interface eth0 up
      `,
    },
    SW1: { type: 'switch', x: 480, y: 300 },
    DRUK1: { type: 'printer', x: 790, y: 230, config: 'ip add 192.168.10.200/24 dev eth0\nroute add default via 192.168.10.1' },
    PC1: { type: 'pc', x: 200, y: 470, dhcp: true },
    PC2: { type: 'pc', x: 480, y: 480, dhcp: true },
    PC3: { type: 'pc', x: 760, y: 470, dhcp: true },
  },
  links: [
    ['R1:eth0', 'SW1:port8'],
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['PC3:eth0', 'SW1:port3'],
    ['DRUK1:eth0', 'SW1:port7'],
  ],

  start: 'serwer',
  variants: [
    { id: 'bez-serwera', name: 'Serwer DHCP nieskonfigurowany', description: 'R1 nie ma puli adresów – utwórz ją w oknie Serwer DHCP albo poleceniem dhcp-server add.' },
    { id: 'serwer', name: 'Serwer działa', description: 'Pula 192.168.10.100–150 na R1 – wystarczy uruchomić klienta DHCP na komputerze.', config: { R1: POOL } },
    {
      id: 'adresy',
      name: 'Komputery mają adresy',
      description: 'Serwer działa, a PC1–PC3 już pobrały adresy.',
      config: { R1: POOL, PC1: 'dhcp-client start', PC2: 'dhcp-client start', PC3: 'dhcp-client start' },
    },
  ],

  tasks: [
    { text: 'Pobierz adres przez DHCP na PC1.', hint: 'PC1 → okno Klient DHCP, albo w terminalu: dhcp-client start', check: (c) => { const d = dev(c, 'PC1'); return !!d && d.dhcp && hasIp(d.ifaces[0]); } },
    { text: 'Skonfiguruj przez DHCP pozostałe komputery (PC2, PC3).', check: (c) => ['PC2', 'PC3'].every((n) => { const d = dev(c, n); return !!d && hasIp(d.ifaces[0]); }) },
    { text: 'Sprawdź łączność: ping z PC1 do bramy 192.168.10.1.', check: (c) => icmpArrived(c, 'PC1', '192.168.10.1', REPLY) },
    { text: 'Dlaczego DHCPDISCOVER ma źródłowy adres IP 0.0.0.0, a docelowy 255.255.255.255?' },
    { text: 'Czemu serwer nie przydzielił adresu 192.168.10.200? (Wskazówka: kto go już używa?)' },
    { text: 'Zobacz dzierżawy na R1 (show dhcp). Zmień zakres puli tak, by zaczynał się od .120, i odnów adres na PC3.' },
  ],
});
