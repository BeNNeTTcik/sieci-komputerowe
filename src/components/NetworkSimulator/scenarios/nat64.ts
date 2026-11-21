// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { arrived, dev, icmpArrived, REPLY } from './checks';

const V6_HOST = 'route add default via 2001:db8:1::1\ndns set 2001:db8:1::53';

export default defineScenario({
  id: 'nat64',
  short: 'NAT64 + DNS64',
  title: 'Translacja: NAT64 z DNS64',
  level: 'zaawansowany',
  packs: ['ipv4', 'ipv6', 'dns', 'web', 'transition'],
  description:
    'Komputery mają tylko IPv6, a serwer WWW tylko IPv4. DNS64 (RFC 6147) dorabia brakujący rekord AAAA z prefiksu 64:ff9b::/96 i adresu IPv4 (RFC 6052), a NAT64 na routerze (RFC 6146) tłumaczy pakiety IPv6 na IPv4 i z powrotem. W symulatorze serwer DNS64 sam przechowuje rekord A; w sieciach DNS64 to resolver, który pobiera go z serwerów w internecie.',

  devices: {
    PC1: { type: 'pc', x: 90, y: 150, config: `ip add 2001:db8:1::10/64 dev eth0\n${V6_HOST}` },
    PC2: { type: 'pc', x: 90, y: 440, config: `ip add 2001:db8:1::11/64 dev eth0\n${V6_HOST}` },
    SW1: { type: 'switch', x: 250, y: 290 },
    DNS64: {
      type: 'server',
      x: 330,
      y: 460,
      config: `
        ip add 2001:db8:1::53/64 dev eth0
        route add default via 2001:db8:1::1
        service http off
        service https off
        service ftp off
        service mail off
        service ntp off
        dns-record add www.ipv4.lab A 192.0.2.80
      `,
    },
    R1: {
      type: 'router',
      x: 480,
      y: 290,
      config: `
        ip add 2001:db8:1::1/64 dev eth0
        ip add 192.0.2.1/24 dev eth1
        interface eth0 up
        interface eth1 up
      `,
    },
    SW2: { type: 'switch', x: 700, y: 290 },
    WWW4: {
      type: 'server',
      x: 860,
      y: 180,
      config: `
        ip add 192.0.2.80/24 dev eth0
        route add default via 192.0.2.1
        service dns off
        service ftp off
        service mail off
        service ntp off
        set certificate www.ipv4.lab
        web set / Strona serwera, który ma tylko IPv4 (192.0.2.80). Jeśli to czytasz z komputera IPv6, zadziałały DNS64 i NAT64.
      `,
    },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['DNS64:eth0', 'SW1:port3'],
    ['SW1:port8', 'R1:eth0'],
    ['R1:eth1', 'SW2:port8'],
    ['WWW4:eth0', 'SW2:port1'],
  ],
  zones: [
    { text: 'Sieć tylko IPv6 · 2001:db8:1::/64', x: 0, y: 60, w: 420, h: 480, color: 'blue' },
    { text: 'Internet tylko IPv4 · 192.0.2.0/24', x: 576, y: 60, w: 384, h: 480, color: 'amber' },
  ],

  start: 'wylaczone',
  variants: [
    { id: 'wylaczone', name: 'DNS64 i NAT64 wyłączone', description: 'Komputery IPv6 nie dostaną się do serwera IPv4.' },
    { id: 'dns64', name: 'Tylko DNS64', description: 'Nazwa ma już syntetyczny adres AAAA, ale router nie umie go jeszcze przetłumaczyć.', config: { DNS64: 'dns64 enable' } },
    {
      id: 'gotowa',
      name: 'DNS64 i NAT64 działają',
      description: 'Strona http://www.ipv4.lab otwiera się z komputera tylko z IPv6.',
      config: { DNS64: 'dns64 enable', R1: 'nat64 enable prefix 64:ff9b::/96 pool 192.0.2.1' },
    },
  ],

  tasks: [
    { text: 'Otwórz na PC1 stronę http://www.ipv4.lab. Dlaczego się nie udaje?', hint: 'PC1 nie ma IPv4, więc pyta DNS o rekord AAAA – a serwer ma tylko A.' },
    { text: 'Włącz DNS64 na serwerze DNS64.', hint: 'dns64 enable (prefiks domyślny 64:ff9b::/96)', check: (c) => !!dev(c, 'DNS64')?.dns64 },
    {
      text: 'Na PC1 zapytaj o rekord AAAA dla www.ipv4.lab. Z czego składa się otrzymany adres?',
      hint: 'nslookup www.ipv4.lab AAAA → 64:ff9b::c000:250, czyli 64:ff9b::192.0.2.80',
      check: (c) => arrived(c, 'PC1', (e) => !!e.frame.ip?.udp?.dns?.answers.some((a) => a.synth)),
    },
    { text: 'Spróbuj jeszcze raz otworzyć stronę. Gdzie teraz ginie pakiet?', hint: 'Router nie zna trasy do 64:ff9b::/96.' },
    { text: 'Włącz NAT64 na R1 z adresem IPv4 192.0.2.1.', hint: 'nat64 enable prefix 64:ff9b::/96 pool 192.0.2.1', check: (c) => !!dev(c, 'R1')?.nat64 },
    { text: 'Otwórz http://www.ipv4.lab na PC1.', check: (c) => !!dev(c, 'PC1')?.page?.status.startsWith('200') && !!dev(c, 'PC1')?.page?.url.includes('ipv4.lab') },
    {
      text: 'Porównaj ten sam segment TCP przed routerem i za nim. Co zmieniło się w adresach i portach? Zajrzyj do show nat64.',
      check: (c) => (dev(c, 'R1')?.natTable.length ?? 0) > 0,
    },
    { text: 'Wyślij ping z PC1 na adres 64:ff9b::192.0.2.80.', hint: 'ping 64:ff9b::192.0.2.80 count 1', check: (c) => icmpArrived(c, 'PC1', '64:ff9b::c000:250', REPLY) },
  ],
});
