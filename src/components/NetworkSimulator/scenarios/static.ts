// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { hasRoute, icmpArrived, REPLY, TIMEX } from './checks';

export default defineScenario({
  id: 'static',
  short: 'Trasy statyczne',
  title: 'Dwa routery: trasy statyczne',
  level: 'średni',
  packs: ['ipv4', 'print'],
  description:
    'Routery R1 i R2 łączy sieć 10.0.0.0/30. Bez tras statycznych każdy zna tylko swoje sieci. Użyj trace, żeby zobaczyć drogę pakietu między PC1 a PC2.',

  devices: {
    R1: {
      type: 'router',
      x: 380,
      y: 290,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 10.0.0.1/30 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    R2: {
      type: 'router',
      x: 600,
      y: 290,
      config: `
        ip add 192.168.2.1/24 dev eth0
        ip add 10.0.0.2/30 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    SW1: { type: 'switch', x: 190, y: 290 },
    SW2: { type: 'switch', x: 790, y: 290 },
    PC1: { type: 'pc', x: 70, y: 130, config: 'ip add 192.168.1.10/24 dev eth0\nroute add default via 192.168.1.1' },
    PC2: { type: 'pc', x: 910, y: 130, config: 'ip add 192.168.2.10/24 dev eth0\nroute add default via 192.168.2.1' },
    DRUK1: { type: 'printer', x: 910, y: 450, config: 'ip add 192.168.2.50/24 dev eth0\nroute add default via 192.168.2.1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'R2:eth1'],
    ['R2:eth0', 'SW2:port8'],
    ['PC2:eth0', 'SW2:port1'],
    ['DRUK1:eth0', 'SW2:port2'],
  ],
  zones: [
    { text: 'Sieć A · 192.168.1.0/24', x: 0, y: 72, w: 300, h: 300, color: 'blue' },
    { text: 'Łącze 10.0.0.0/30', x: 324, y: 228, w: 336, h: 132, color: 'amber' },
    { text: 'Sieć B · 192.168.2.0/24', x: 696, y: 72, w: 300, h: 468, color: 'green' },
  ],

  start: 'bez-tras',
  variants: [
    { id: 'bez-tras', name: 'Bez tras statycznych', description: 'Routery znają tylko sieci podłączone bezpośrednio.' },
    {
      id: 'gotowa',
      name: 'Trasy skonfigurowane',
      description: 'R1 i R2 mają trasy do sieci za drugim routerem.',
      config: {
        R1: 'route add 192.168.2.0/24 via 10.0.0.2',
        R2: 'route add 192.168.1.0/24 via 10.0.0.1',
      },
    },
  ],

  tasks: [
    { text: 'Spróbuj pingu z PC1 do PC2 przed zmianami. Który router odsyła Destination Unreachable?' },
    { text: 'Dodaj na R1 trasę do sieci 192.168.2.0/24 przez 10.0.0.2.', hint: 'route add 192.168.2.0/24 via 10.0.0.2', check: (c) => hasRoute(c, 'R1', '192.168.2.0') },
    { text: 'Dodaj na R2 trasę powrotną do 192.168.1.0/24 przez 10.0.0.1.', hint: 'Bez trasy powrotnej Echo Request dotrze, ale Echo Reply już nie wróci.', check: (c) => hasRoute(c, 'R2', '192.168.1.0') },
    { text: 'Ping z PC1 do PC2 kończy się sukcesem.', check: (c) => icmpArrived(c, 'PC1', '192.168.2.10', REPLY) },
    { text: 'Trace z PC1 do PC2 pokazuje drugi router (10.0.0.2).', hint: 'trace 192.168.2.10', check: (c) => icmpArrived(c, 'PC1', '10.0.0.2', TIMEX) },
    { text: 'Zastąp trasę na R2 trasą domyślną (route add default via 10.0.0.1). Czy coś się zmieniło?' },
  ],
});
