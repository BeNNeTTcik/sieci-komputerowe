// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Trzy routery w trójkącie i trzy sieci LAN. Ta sama topologia w trzech wariantach: trasy statyczne, RIP v2 i OSPF.
// Adresy są już nadane – student konfiguruje sam routing. Warianty „…gotowy” (ukryte) to klucz dla prowadzącego.

import { defineScenario } from './types';
import { dev, getIface, icmpArrived, REPLY } from './checks';
import { inPrefix, routingTable } from '../model';
import type { CheckCtx, DeviceConfig, Task } from './types';

const ROUTERS = ['R1', 'R2', 'R3'];
const LANS: Record<string, string> = { R1: '192.168.1.0', R2: '192.168.2.0', R3: '192.168.3.0' };

/** aktywna trasa danego rodzaju do sieci /24 */
const route = (c: CheckCtx, r: string, network: string, kind?: 'static' | 'rip' | 'ospf') => {
  const d = dev(c, r);
  return d ? routingTable(c.net, d).find((e) => e.fam === 4 && e.network === network && e.prefix === 24 && e.active && (!kind || e.kind === kind)) : undefined;
};
/** router zna trasy (danego rodzaju) do obu pozostałych sieci LAN */
const knowsOthers = (c: CheckCtx, r: string, kind: 'static' | 'rip' | 'ospf') => ROUTERS.filter((x) => x !== r).every((x) => !!route(c, r, LANS[x], kind));
/** wszystkie trzy interfejsy routera należą do sieci protokołu */
const allIfaces = (c: CheckCtx, r: string, proto: 'rip' | 'ospf') => {
  const d = dev(c, r);
  const cfg = d?.[proto];
  if (!d || !cfg) return false;
  return ['eth0', 'eth1', 'eth2'].every((n) => {
    const i = getIface(d, n);
    return !!i && !!i.ip && cfg.networks.some((x) => inPrefix(i.ip, x.network, x.prefix));
  });
};

const PING: Task = {
  text: 'Sprawdź łączność: PC1 pinguje PC3 (192.168.3.10) i PC2 (192.168.2.10).',
  hint: 'Na PC1: ping 192.168.3.10, potem ping 192.168.2.10.',
  check: (c) => icmpArrived(c, 'PC1', '192.168.3.10', REPLY) && icmpArrived(c, 'PC1', '192.168.2.10', REPLY),
};

const STATIC: DeviceConfig = {
  R1: 'route add 192.168.2.0/24 via 10.0.12.2\nroute add 192.168.3.0/24 via 10.0.13.2',
  R2: 'route add 192.168.1.0/24 via 10.0.12.1\nroute add 192.168.3.0/24 via 10.0.23.2',
  R3: 'route add 192.168.1.0/24 via 10.0.13.1\nroute add 192.168.2.0/24 via 10.0.23.1',
};
const RIP: DeviceConfig = {
  R1: 'rip network 192.168.1.0/24\nrip network 10.0.0.0/8',
  R2: 'rip network 192.168.2.0/24\nrip network 10.0.0.0/8',
  R3: 'rip network 192.168.3.0/24\nrip network 10.0.0.0/8',
};
const OSPF: DeviceConfig = {
  R1: 'ospf network 192.168.1.0/24 area 0\nospf network 10.0.0.0/8 area 0',
  R2: 'ospf network 192.168.2.0/24 area 0\nospf network 10.0.0.0/8 area 0',
  R3: 'ospf network 192.168.3.0/24 area 0\nospf network 10.0.0.0/8 area 0',
};

export default defineScenario({
  id: 'routing-dyn',
  short: 'Routing: statyczny, RIP, OSPF',
  title: 'Routing statyczny i dynamiczny: RIP i OSPF',
  level: 'średni',
  exercise: true,
  packs: ['ipv4', 'routing'],
  description: [
    'Trzy routery połączone w trójkąt, każdy z własną siecią LAN. Adresy są już nadane i interfejsy włączone – brakuje tylko routingu: każdy router zna na razie wyłącznie sieci podłączone bezpośrednio.',
    'Sieci LAN: R1 – 192.168.1.0/24, R2 – 192.168.2.0/24, R3 – 192.168.3.0/24. Łącza: R1–R2 10.0.12.0/30, R1–R3 10.0.13.0/30, R2–R3 10.0.23.0/30 (router o niższym numerze ma adres .1, drugi .2).',
    'Wybierz wariant przyciskiem „Stan początkowy”: trasy statyczne, RIP albo OSPF.',
  ].join('\n'),

  devices: {
    R1: {
      type: 'router',
      x: 300,
      y: 180,
      config: `
        ip add 192.168.1.1/24 dev eth0
        ip add 10.0.12.1/30 dev eth1
        ip add 10.0.13.1/30 dev eth2
        interface eth0 up
        interface eth1 up
        interface eth2 up
      `,
    },
    R2: {
      type: 'router',
      x: 660,
      y: 180,
      config: `
        ip add 192.168.2.1/24 dev eth0
        ip add 10.0.12.2/30 dev eth1
        ip add 10.0.23.1/30 dev eth2
        interface eth0 up
        interface eth1 up
        interface eth2 up
      `,
    },
    R3: {
      type: 'router',
      x: 480,
      y: 370,
      config: `
        ip add 192.168.3.1/24 dev eth0
        ip add 10.0.13.2/30 dev eth1
        ip add 10.0.23.2/30 dev eth2
        interface eth0 up
        interface eth1 up
        interface eth2 up
      `,
    },
    PC1: { type: 'pc', x: 100, y: 180, config: 'ip add 192.168.1.10/24 dev eth0\nroute add default via 192.168.1.1' },
    PC2: { type: 'pc', x: 860, y: 180, config: 'ip add 192.168.2.10/24 dev eth0\nroute add default via 192.168.2.1' },
    PC3: { type: 'pc', x: 480, y: 500, config: 'ip add 192.168.3.10/24 dev eth0\nroute add default via 192.168.3.1' },
  },
  links: [
    ['PC1:eth0', 'R1:eth0'],
    ['PC2:eth0', 'R2:eth0'],
    ['PC3:eth0', 'R3:eth0'],
    ['R1:eth1', 'R2:eth1'],
    ['R1:eth2', 'R3:eth1'],
    ['R2:eth2', 'R3:eth2'],
  ],
  zones: [
    { text: 'LAN 1 – 192.168.1.0/24', x: 12, y: 90, w: 190, h: 170, color: 'blue' },
    { text: 'LAN 2 – 192.168.2.0/24', x: 758, y: 90, w: 190, h: 170, color: 'green' },
    { text: 'LAN 3 – 192.168.3.0/24', x: 380, y: 440, w: 200, h: 110, color: 'amber' },
  ],

  start: 'statyczny',
  variants: [
    {
      id: 'statyczny',
      name: 'Trasy statyczne – do skonfigurowania',
      description: 'Każdy router potrzebuje dwóch tras statycznych – do sieci LAN pozostałych routerów.',
      tasks: [
        {
          text: 'Na R1 dodaj trasy statyczne do 192.168.2.0/24 (przez R2) i 192.168.3.0/24 (przez R3).',
          hint: 'R1: route add 192.168.2.0/24 via 10.0.12.2 oraz route add 192.168.3.0/24 via 10.0.13.2',
          check: (c) => knowsOthers(c, 'R1', 'static'),
        },
        {
          text: 'Dodaj trasy statyczne na R2 i R3 (każdy router: dwie sieci LAN, następny skok – sąsiedni router).',
          hint: 'Pakiet musi też wrócić – bez tras na R2 i R3 odpowiedź na ping nie trafi do LAN 1.',
          check: (c) => knowsOthers(c, 'R2', 'static') && knowsOthers(c, 'R3', 'static'),
        },
        PING,
        {
          text: 'Awaria: na R1 wyłącz łącze do R3 (interface eth2 down) i znów pinguj PC3 z PC1.',
          hint: 'Ping nie przejdzie, choć droga przez R2 istnieje. Trasa statyczna nie omija awarii sama.',
          // po awarii Echo Request do PC3 ginie na R1 (trasa przez eth2 jest nieaktywna)
          check: (c) => getIface(dev(c, 'R1')!, 'eth2')?.up === false && c.events.some((e) => e.dropped && e.to === dev(c, 'R1')?.id && e.frame.ip?.dst === '192.168.3.10' && e.frame.ip.icmp?.type === 8),
        },
        { text: 'Pytanie: co trzeba zmienić ręcznie, żeby po awarii ruch do LAN 3 szedł przez R2? Ile tras zmieniasz w dużej sieci?' },
      ],
    },
    {
      id: 'rip',
      name: 'RIP v2 – do skonfigurowania',
      description: 'Routery mają tylko adresy. Włącz RIP na wszystkich trzech – trasy pojawią się same.',
      tasks: [
        {
          text: 'Włącz RIP na R1, R2 i R3 dla wszystkich ich sieci (LAN i łącza między routerami).',
          hint: 'np. R1: rip network 192.168.1.0/24 oraz rip network 10.0.0.0/8 (obejmuje wszystkie łącza 10.0.x.x)',
          check: (c) => ROUTERS.every((r) => allIfaces(c, r, 'rip')),
        },
        {
          text: 'Sprawdź tablicę routingu R1 (show routes): trasy RIP (R) do 192.168.2.0/24 i 192.168.3.0/24 z metryką 1.',
          hint: 'Na liście zdarzeń włącz filtr RIP i zobacz pakiety Request i Response.',
          check: (c) => knowsOthers(c, 'R1', 'rip'),
        },
        PING,
        {
          text: 'Awaria: na R1 wyłącz łącze do R3 (interface eth2 down). RIP sam znajdzie drogę do 192.168.3.0/24 przez R2 – z metryką 2.',
          hint: 'show routes na R1 – następny skok 10.0.12.2, metryka 2. Potem ping 192.168.3.10 z PC1.',
          check: (c) => {
            const r = route(c, 'R1', '192.168.3.0', 'rip');
            return getIface(dev(c, 'R1')!, 'eth2')?.up === false && !!r && r.nextHop === '10.0.12.2' && r.metric === 2;
          },
        },
        { text: 'Pytanie: czym różni się zachowanie RIP i tras statycznych po awarii? Co oznacza metryka 16?' },
      ],
    },
    {
      id: 'ospf',
      name: 'OSPF – do skonfigurowania',
      description: 'Routery mają tylko adresy. Włącz OSPF (obszar 0) na wszystkich trzech, potem zmień koszt wolnego łącza R1–R3.',
      tasks: [
        {
          text: 'Włącz OSPF w obszarze 0 na R1, R2 i R3 dla wszystkich ich sieci.',
          hint: 'np. R1: ospf network 192.168.1.0/24 area 0 oraz ospf network 10.0.0.0/8 area 0',
          check: (c) => ROUTERS.every((r) => allIfaces(c, r, 'ospf')),
        },
        {
          text: 'Każdy router ma dwóch sąsiadów w stanie Full (show ospf).',
          hint: 'Włącz filtr OSPF – zobaczysz Hello, potem LSU i LSAck.',
          check: (c) => ROUTERS.every((r) => (dev(c, r)?.ospf?.neighbors.filter((n) => n.state === 'Full').length ?? 0) >= 2),
        },
        {
          text: 'R1 dociera do 192.168.3.0/24 bezpośrednio przez R3 (koszt 20: łącze 10 + LAN 10).',
          check: (c) => {
            const r = route(c, 'R1', '192.168.3.0', 'ospf');
            return !!r && r.nextHop === '10.0.13.2' && r.metric === 20;
          },
        },
        PING,
        {
          text: 'Łącze R1–R3 jest wolne: ustaw na nim koszt 50 po obu stronach. R1 powinien wybrać drogę przez R2 (koszt 30).',
          hint: 'R1: ospf cost eth2 50, R3: ospf cost eth1 50. Potem show routes na R1 i trace 192.168.3.10 z PC1.',
          check: (c) => {
            const r = route(c, 'R1', '192.168.3.0', 'ospf');
            return !!r && r.nextHop === '10.0.12.2' && r.metric === 30;
          },
        },
        { text: 'Pytanie: dlaczego OSPF wybrał drogę przez dwa routery, a RIP wybrałby bezpośrednią? Co jest metryką w każdym z nich?' },
      ],
    },
    { id: 'statyczny-gotowy', name: 'Klucz: trasy statyczne', hidden: true, config: STATIC },
    { id: 'rip-gotowy', name: 'Klucz: RIP', hidden: true, config: RIP },
    {
      id: 'ospf-gotowy',
      name: 'Klucz: OSPF z kosztem 50 na łączu R1–R3',
      hidden: true,
      config: { R1: `${OSPF.R1}\nospf cost eth2 50`, R2: OSPF.R2, R3: `${OSPF.R3}\nospf cost eth1 50` },
    },
  ],

  tasks: [],
});
