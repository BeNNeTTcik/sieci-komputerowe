// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, icmpArrived, REPLY, TIMEX } from './checks';

export default defineScenario({
  id: 'ipv6',
  short: 'IPv6',
  title: 'IPv6: SLAAC i NDP',
  level: 'średni',
  packs: ['ipv6'],
  description:
    'Sieć tylko z IPv6 – pakiet IPv4 jest wyłączony. Komputery w sieci A same budują adresy z prefiksu ogłaszanego przez router (SLAAC), a zamiast ARP widać Neighbor Discovery na adresach multicast.',

  devices: {
    R1: {
      type: 'router',
      x: 480,
      y: 290,
      config: `
        ip add 2001:db8:1::1/64 dev eth0
        ip add 2001:db8:2::1/64 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    SW1: { type: 'switch', x: 250, y: 290 },
    SW2: { type: 'switch', x: 710, y: 290 },
    PC1: { type: 'pc', x: 90, y: 140 },
    PC2: { type: 'pc', x: 90, y: 440 },
    PC3: { type: 'pc', x: 870, y: 140, config: 'ip add 2001:db8:2::10/64 dev eth0\nroute add default via 2001:db8:2::1' },
    PC4: { type: 'pc', x: 870, y: 440, config: 'ip add 2001:db8:2::11/64 dev eth0\nroute add default via 2001:db8:2::1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'SW2:port8'],
    ['PC3:eth0', 'SW2:port1'],
    ['PC4:eth0', 'SW2:port2'],
  ],
  zones: [
    { text: 'Sieć A · 2001:db8:1::/64', x: 12, y: 72, w: 324, h: 468, color: 'blue' },
    { text: 'Sieć B · 2001:db8:2::/64', x: 624, y: 72, w: 348, h: 468, color: 'green' },
  ],

  start: 'link-local',
  variants: [
    { id: 'link-local', name: 'Tylko adresy link-local', description: 'PC1 i PC2 nie mają jeszcze adresu globalnego – uruchom ipv6 autoconf.' },
    {
      id: 'slaac',
      name: 'Po autokonfiguracji (SLAAC)',
      description: 'PC1 i PC2 zbudowały adresy z prefiksu 2001:db8:1::/64.',
      config: { PC1: 'ipv6 autoconf', PC2: 'ipv6 autoconf' },
    },
  ],

  tasks: [
    { text: 'Na PC1 włącz autokonfigurację IPv6 i obejrzyj Router Solicitation / Advertisement.', hint: 'ipv6 autoconf', check: (c) => !!dev(c, 'PC1')?.ifaces[0].ip6.some((a) => a.origin === 'auto') },
    { text: 'Zrób to samo na PC2. Z czego powstała druga połowa adresu (identyfikator interfejsu)?', check: (c) => !!dev(c, 'PC2')?.ifaces[0].ip6.some((a) => a.origin === 'auto') },
    { text: 'Ping z PC1 do PC3 (2001:db8:2::10).', check: (c) => icmpArrived(c, 'PC1', '2001:db8:2::10', REPLY) },
    { text: 'Trace z PC1 do PC3 – router odsyła ICMPv6 Time Exceeded.', hint: 'trace 2001:db8:2::10', check: (c) => icmpArrived(c, 'PC1', '2001:db8:1::1', TIMEX) },
    { text: 'Neighbor Solicitation PC3 → PC4: które komputery przyjęły ramkę? Porównaj z broadcastem ARP.', hint: 'ping 2001:db8:2::11 z PC3, potem sprawdź wynik na PC4 i na routerze' },
    { text: 'Sprawdź tablicę sąsiadów na PC1.', hint: 'show neighbors', check: (c) => (dev(c, 'PC1')?.nd.length ?? 0) > 0 },
  ],
});
