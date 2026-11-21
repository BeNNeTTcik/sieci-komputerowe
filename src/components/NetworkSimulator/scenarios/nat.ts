// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Sieć prywatna za routerem R1, dostawca (ISP) i dwa hosty „w Internecie”. Trzy warianty: NAT statyczny,
// NAT dynamiczny z puli i PAT. Adresy i trasy są gotowe – student konfiguruje sam NAT na R1.
// Adresy publiczne pochodzą z zakresów dokumentacyjnych (RFC 5737). ISP nie zna sieci 192.168.10.0/24 (RFC 1918).

import { defineScenario } from './types';
import { dev, icmpArrived, REPLY } from './checks';
import type { CheckCtx, Task } from './types';

const WWW = '198.51.100.10';
const nat = (c: CheckCtx) => dev(c, 'R1')?.nat;

const MARK: Task = {
  text: 'Oznacz interfejsy R1: eth0 (sieć szkolna) jako wewnętrzny, eth1 (do ISP) jako zewnętrzny.',
  hint: 'R1: nat inside eth0 oraz nat outside eth1',
  check: (c) => !!nat(c)?.inside.includes('eth0') && !!nat(c)?.outside.includes('eth1'),
};

const pageFrom = (c: CheckCtx, pc: string, host: string) => {
  const p = dev(c, pc)?.page;
  return !!p && p.url.includes(host) && p.status.startsWith('200');
};

export default defineScenario({
  id: 'nat',
  short: 'NAT i PAT',
  title: 'Translacja adresów: NAT statyczny, dynamiczny i PAT',
  level: 'średni',
  exercise: true,
  packs: ['ipv4', 'nat', 'web'],
  description: [
    'Szkoła ma sieć prywatną 192.168.10.0/24 (RFC 1918) i od dostawcy (ISP) łącze 203.0.113.0/24: R1 ma adres 203.0.113.2, ISP 203.0.113.1. Adresy prywatne nie są routowane w Internecie – ISP nie ma do nich trasy, więc bez NAT odpowiedzi nie wracają.',
    `W „Internecie”: serwer WWW ${WWW} i komputer PC-ZEWN 192.0.2.20. Adresy, bramy i trasa domyślna R1 są gotowe – skonfiguruj NAT na R1.`,
    'Dostępne adresy publiczne: 203.0.113.100 (dla serwera szkoły) oraz pula 203.0.113.10–203.0.113.11. Wariant wybierasz przyciskiem „Stan początkowy”.',
  ].join('\n'),

  devices: {
    'SRV-SZKOLA': {
      type: 'server',
      x: 330,
      y: 480,
      config: `
        ip add 192.168.10.100/24 dev eth0
        route add default via 192.168.10.1
        service dhcp off
        service dns off
        service https off
        service ftp off
        service mail off
        service ntp off
        service discard off
        web set / Strona szkoły – serwer w sieci prywatnej, widoczny z Internetu dzięki NAT statycznemu
      `,
    },
    WWW: {
      type: 'server',
      x: 870,
      y: 150,
      config: `
        ip add ${WWW}/24 dev eth0
        route add default via 198.51.100.1
        service dhcp off
        service dns off
        service ftp off
        service mail off
        service ntp off
        service discard off
        web set / Serwer w Internecie. Sprawdź w R1 (show nat), pod jakim adresem przyszło żądanie.
      `,
    },
    R1: {
      type: 'router',
      x: 500,
      y: 290,
      config: `
        ip add 192.168.10.1/24 dev eth0
        ip add 203.0.113.2/24 dev eth1
        interface eth0 up
        interface eth1 up
        route add default via 203.0.113.1
      `,
    },
    ISP: {
      type: 'router',
      x: 700,
      y: 290,
      config: `
        ip add 203.0.113.1/24 dev eth0
        ip add 198.51.100.1/24 dev eth1
        ip add 192.0.2.1/24 dev eth2
        interface eth0 up
        interface eth1 up
        interface eth2 up
      `,
    },
    SW1: { type: 'switch', x: 300, y: 290 },
    PC1: { type: 'pc', x: 100, y: 130, config: 'ip add 192.168.10.11/24 dev eth0\nroute add default via 192.168.10.1' },
    PC2: { type: 'pc', x: 100, y: 290, config: 'ip add 192.168.10.12/24 dev eth0\nroute add default via 192.168.10.1' },
    PC3: { type: 'pc', x: 100, y: 450, config: 'ip add 192.168.10.13/24 dev eth0\nroute add default via 192.168.10.1' },
    'PC-ZEWN': { type: 'pc', x: 870, y: 430, config: 'ip add 192.0.2.20/24 dev eth0\nroute add default via 192.0.2.1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['PC3:eth0', 'SW1:port3'],
    ['SRV-SZKOLA:eth0', 'SW1:port4'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'ISP:eth0'],
    ['ISP:eth1', 'WWW:eth0'],
    ['ISP:eth2', 'PC-ZEWN:eth0'],
  ],
  zones: [
    { text: 'Sieć szkolna 192.168.10.0/24 (prywatna)', x: 12, y: 60, w: 430, h: 490, color: 'blue' },
    { text: 'Internet', x: 610, y: 60, w: 340, h: 490, color: 'ink' },
  ],

  start: 'statyczny',
  variants: [
    {
      id: 'statyczny',
      name: 'NAT statyczny – do skonfigurowania',
      description: 'Serwer szkoły ma być widoczny z Internetu pod stałym adresem 203.0.113.100.',
      tasks: [
        MARK,
        {
          text: 'Przypisz serwerowi SRV-SZKOLA (192.168.10.100) stały adres publiczny 203.0.113.100.',
          hint: 'R1: nat static 192.168.10.100 203.0.113.100',
          check: (c) => !!nat(c)?.statics.some((s) => s.local === '192.168.10.100' && s.global === '203.0.113.100'),
        },
        {
          text: 'Z PC-ZEWN otwórz stronę http://203.0.113.100 – połączenie z Internetu do serwera w sieci prywatnej.',
          hint: 'Na PC-ZEWN: http 203.0.113.100. Kliknij pakiety na R1 i porównaj adres docelowy przed i za routerem.',
          check: (c) => pageFrom(c, 'PC-ZEWN', '203.0.113.100'),
        },
        {
          text: `SRV-SZKOLA pinguje serwer WWW w Internecie (${WWW}).`,
          hint: `Na SRV-SZKOLA: ping ${WWW}. Serwer WWW widzi pakiety od 203.0.113.100.`,
          check: (c) => icmpArrived(c, 'SRV-SZKOLA', WWW, REPLY),
        },
        { text: `Pytanie: PC1 nie dostaje odpowiedzi na ping ${WWW}. Gdzie ginie odpowiedź i dlaczego? Czym NAT statyczny różni się od pozostałych?` },
      ],
    },
    {
      id: 'dynamiczny',
      name: 'NAT dynamiczny – do skonfigurowania',
      description: 'Komputery dostają adresy publiczne z puli 203.0.113.10–203.0.113.11 – dwa adresy na trzy komputery.',
      tasks: [
        MARK,
        {
          text: 'Utwórz pulę PULA 203.0.113.10–203.0.113.11 i regułę: sieć 192.168.10.0/24 tłumaczona na adresy z puli (bez overload).',
          hint: 'R1: nat pool PULA 203.0.113.10-203.0.113.11 oraz nat source 192.168.10.0/24 pool PULA',
          check: (c) => !!nat(c)?.pools.some((p) => p.from === '203.0.113.10' && p.to === '203.0.113.11') && !!nat(c)?.rules.some((r) => r.network === '192.168.10.0' && r.prefix === 24 && !!r.pool && !r.overload),
        },
        {
          text: `PC1 i PC2 pingują serwer WWW (${WWW}). Sprawdź na R1: show nat – każdy dostał inny adres z puli.`,
          check: (c) => icmpArrived(c, 'PC1', WWW, REPLY) && icmpArrived(c, 'PC2', WWW, REPLY),
        },
        {
          text: `PC3 też pinguje ${WWW}. Co się dzieje? Znajdź na liście zdarzeń, gdzie i dlaczego pakiet został odrzucony.`,
          hint: 'Dwa adresy w puli, trzy komputery. Wpis zwolni dopiero nat flush (w prawdziwym routerze – upływ czasu).',
          check: (c) => c.events.some((e) => e.dropped && e.notes.some((n) => n.includes('wyczerpana'))),
        },
        { text: 'Pytanie: czy PC-ZEWN może sam zacząć połączenie z PC1 przez adres z puli? Kiedy NAT dynamiczny ma sens, a kiedy lepszy jest PAT?' },
      ],
    },
    {
      id: 'pat',
      name: 'PAT (overload) – do skonfigurowania',
      description: 'Wszystkie komputery wychodzą do Internetu pod jednym adresem R1 (203.0.113.2), rozróżniane numerami portów.',
      tasks: [
        MARK,
        {
          text: 'Skonfiguruj PAT: sieć 192.168.10.0/24 tłumaczona na adres interfejsu eth1 z overload.',
          hint: 'R1: nat source 192.168.10.0/24 interface eth1 overload',
          check: (c) => !!nat(c)?.rules.some((r) => r.network === '192.168.10.0' && r.prefix === 24 && r.iface === 'eth1' && r.overload),
        },
        {
          text: `PC1, PC2 i PC3 pingują serwer WWW (${WWW}) – wszystkie dostają odpowiedź.`,
          check: (c) => ['PC1', 'PC2', 'PC3'].every((pc) => icmpArrived(c, pc, WWW, REPLY)),
        },
        {
          text: 'W tablicy translacji R1 (show nat) są co najmniej trzy wpisy PAT z tym samym adresem 203.0.113.2.',
          check: (c) => (nat(c)?.table.filter((x) => x.kind === 'pat' && x.inGlobal === '203.0.113.2').length ?? 0) >= 3,
        },
        {
          text: `PC1 otwiera stronę http://${WWW}. Porównaj port źródłowy przed R1 i za R1.`,
          hint: `Na PC1: http ${WWW}`,
          check: (c) => pageFrom(c, 'PC1', WWW),
        },
        { text: 'Pytanie: po czym R1 rozpoznaje, do którego komputera oddać odpowiedź, skoro wszystkie mają ten sam adres publiczny?' },
      ],
    },
    {
      id: 'statyczny-gotowy',
      name: 'Klucz: NAT statyczny',
      hidden: true,
      config: { R1: 'nat inside eth0\nnat outside eth1\nnat static 192.168.10.100 203.0.113.100' },
    },
    {
      id: 'dynamiczny-gotowy',
      name: 'Klucz: NAT dynamiczny',
      hidden: true,
      config: { R1: 'nat inside eth0\nnat outside eth1\nnat pool PULA 203.0.113.10-203.0.113.11\nnat source 192.168.10.0/24 pool PULA' },
    },
    {
      id: 'pat-gotowy',
      name: 'Klucz: PAT',
      hidden: true,
      config: { R1: 'nat inside eth0\nnat outside eth1\nnat source 192.168.10.0/24 interface eth1 overload' },
    },
  ],

  tasks: [],
});
