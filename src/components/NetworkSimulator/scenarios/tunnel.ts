// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { arrived, dev, hasRoute, icmpArrived, REPLY, TIMEX } from './checks';

export default defineScenario({
  id: 'tunnel',
  short: 'Tunel 6in4',
  title: 'Tunelowanie: IPv6 przez sieć IPv4 (6in4)',
  level: 'zaawansowany',
  packs: ['ipv4', 'ipv6', 'transition'],
  description:
    'Dwie wyspy IPv6 łączy operator, który obsługuje tylko IPv4. Routery brzegowe pakują pakiety IPv6 w IPv4 (protokół 41, RFC 4213) – to tunel 6in4. Odwrotny przypadek, IPv4 w IPv6 (4in6, RFC 2473), ustawisz tym samym poleceniem z trybem 4in6. Starsze automatyczne mechanizmy – 6to4 i Teredo – zostały wycofane lub nie są stosowane.',

  devices: {
    PC1: { type: 'pc', x: 70, y: 150, config: 'ip add 2001:db8:1::10/64 dev eth0\nroute add default via 2001:db8:1::1' },
    PC2: { type: 'pc', x: 70, y: 440, config: 'ip add 2001:db8:1::11/64 dev eth0\nroute add default via 2001:db8:1::1' },
    SW1: { type: 'switch', x: 190, y: 290 },
    R1: {
      type: 'router',
      x: 340,
      y: 290,
      config: `
        ip add 2001:db8:1::1/64 dev eth0
        ip add 203.0.113.1/30 dev eth1
        interface eth0 up
        interface eth1 up
        route add default via 203.0.113.2
      `,
    },
    OPERATOR: {
      type: 'router',
      x: 480,
      y: 290,
      config: `
        ip add 203.0.113.2/30 dev eth0
        ip add 198.51.100.1/30 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    R2: {
      type: 'router',
      x: 620,
      y: 290,
      config: `
        ip add 198.51.100.2/30 dev eth0
        ip add 2001:db8:2::1/64 dev eth1
        interface eth0 up
        interface eth1 up
        route add default via 198.51.100.1
        # tunel do R1
        tunnel add tun0 mode 6in4 local 198.51.100.2 remote 203.0.113.1
        ip add 2001:db8:ff::2/64 dev tun0
        route add 2001:db8:1::/64 via 2001:db8:ff::1
      `,
    },
    SW2: { type: 'switch', x: 770, y: 290 },
    PC3: { type: 'pc', x: 890, y: 150, config: 'ip add 2001:db8:2::10/64 dev eth0\nroute add default via 2001:db8:2::1' },
    PC4: { type: 'pc', x: 890, y: 440, config: 'ip add 2001:db8:2::11/64 dev eth0\nroute add default via 2001:db8:2::1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'OPERATOR:eth0'],
    ['OPERATOR:eth1', 'R2:eth0'],
    ['R2:eth1', 'SW2:port8'],
    ['PC3:eth0', 'SW2:port1'],
    ['PC4:eth0', 'SW2:port2'],
  ],
  zones: [
    { text: 'Wyspa IPv6 A · 2001:db8:1::/64', x: 0, y: 72, w: 264, h: 468, color: 'blue' },
    { text: 'Operator – tylko IPv4', x: 276, y: 168, w: 408, h: 264, color: 'amber' },
    { text: 'Wyspa IPv6 B · 2001:db8:2::/64', x: 696, y: 72, w: 276, h: 468, color: 'green' },
  ],

  start: 'jeden-koniec',
  variants: [
    { id: 'jeden-koniec', name: 'Tunel tylko na R2', description: 'R2 ma tunel skonfigurowany, R1 jeszcze nie (wzór: show config na R2).' },
    {
      id: 'gotowa',
      name: 'Tunel działa',
      description: 'Oba końce tunelu są skonfigurowane – ping między wyspami działa.',
      config: {
        R1: `
          tunnel add tun0 mode 6in4 local 203.0.113.1 remote 198.51.100.2
          ip add 2001:db8:ff::1/64 dev tun0
          route add 2001:db8:2::/64 via 2001:db8:ff::2
        `,
      },
    },
  ],

  tasks: [
    { text: 'Wyślij ping z PC1 do PC3 (2001:db8:2::10). Który router i z jakim komunikatem odmawia?', hint: 'ping 2001:db8:2::10 count 1 – R1 nie ma trasy IPv6, a operator IPv6 w ogóle nie zna.' },
    {
      text: 'Utwórz na R1 tunel do R2, nadaj mu adres 2001:db8:ff::1/64 i dodaj trasę do wyspy B przez drugi koniec tunelu.',
      hint: 'tunnel add tun0 mode 6in4 local 203.0.113.1 remote 198.51.100.2 · ip add 2001:db8:ff::1/64 dev tun0 · route add 2001:db8:2::/64 via 2001:db8:ff::2 (wzór: show config na R2)',
      check: (c) => !!dev(c, 'R1')?.ifaces.some((i) => i.tunnel?.remote === '198.51.100.2') && hasRoute(c, 'R1', '2001:db8:2::'),
    },
    { text: 'Ping z PC1 do PC3 kończy się sukcesem.', check: (c) => icmpArrived(c, 'PC1', '2001:db8:2::10', REPLY) },
    {
      text: 'Kliknij pakiet na łączu R1 – OPERATOR. Co jest w zewnętrznym, a co w wewnętrznym nagłówku?',
      hint: 'Zewnętrzny IPv4 203.0.113.1 → 198.51.100.2, protokół 41; w środku cały pakiet IPv6.',
      check: (c) => arrived(c, 'OPERATOR', (e) => e.frame.ip?.proto === 'ENCAP'),
    },
    {
      text: 'Wykonaj trace z PC1 do PC3. Dlaczego na liście nie ma routera OPERATOR?',
      hint: 'trace 2001:db8:2::10 – tunel liczy się jako jeden skok IPv6.',
      check: (c) => icmpArrived(c, 'PC1', '2001:db8:ff::2', TIMEX),
    },
    { text: 'Ile bajtów nagłówka dokłada tunel 6in4 i co to oznacza dla MTU?' },
  ],
});
