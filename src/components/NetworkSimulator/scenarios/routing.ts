// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, getIface, icmpArrived, REPLY, TIMEX } from './checks';

export default defineScenario({
  id: 'routing',
  base: true,
  short: 'Router',
  title: 'Dwie sieci i router',
  level: 'podstawowy',
  packs: ['ipv4', 'print'],
  description:
    'Router łączy sieci 192.168.1.0/24 i 192.168.2.0/24. Prześledź, jak router zmienia adresy MAC w ramce, zmniejsza TTL, a adresy IP zostawia bez zmian.',

  devices: {
    R1: {
      type: 'router',
      x: 480,
      y: 290,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 192.168.2.1/24 dev eth1
      `,
    },
    SW1: { type: 'switch', x: 250, y: 290 },
    SW2: { type: 'switch', x: 710, y: 290 },
    PC1: { type: 'pc', x: 90, y: 140, config: 'ip add 192.168.1.10/24 dev eth0\nroute add default via 192.168.1.1' },
    PC2: { type: 'pc', x: 90, y: 440, config: 'ip add 192.168.1.11/24 dev eth0\nroute add default via 192.168.1.1' },
    PC3: { type: 'pc', x: 870, y: 140, config: 'ip add 192.168.2.10/24 dev eth0\nroute add default via 192.168.2.1' },
    DRUK1: { type: 'printer', x: 870, y: 440, config: 'ip add 192.168.2.50/24 dev eth0\nroute add default via 192.168.2.1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'SW2:port8'],
    ['PC3:eth0', 'SW2:port1'],
    ['DRUK1:eth0', 'SW2:port2'],
  ],
  zones: [
    { text: 'Sieć A · 192.168.1.0/24', x: 12, y: 72, w: 324, h: 468, color: 'blue' },
    { text: 'Sieć B · 192.168.2.0/24', x: 624, y: 72, w: 336, h: 468, color: 'green' },
  ],

  start: 'wylaczone',
  variants: [
    { id: 'wylaczone', name: 'Interfejsy routera wyłączone', description: 'Adresy są nadane, ale eth0 i eth1 na R1 trzeba włączyć.' },
    {
      id: 'gotowa',
      name: 'Router działa',
      description: 'Interfejsy R1 są włączone – ping między sieciami działa od razu.',
      config: {
        R1: `
          interface eth0 up
          interface eth1 up
        `,
      },
    },
  ],

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
});
