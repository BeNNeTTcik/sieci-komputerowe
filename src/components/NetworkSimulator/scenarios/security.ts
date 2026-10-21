// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, getIface } from './checks';

export default defineScenario({
  id: 'security',
  short: 'Bezpieczeństwo',
  title: 'Bezpieczeństwo w sieci lokalnej',
  level: 'zaawansowany',
  packs: ['ipv4', 'dhcp', 'security'],
  description:
    'W sieci biurowej działa fałszywy serwer DHCP, który podaje swoją bramę, pod jedno gniazdo ktoś podpiął własny przełącznik, a gniazdo dla gości jest otwarte. SW1 można zabezpieczyć mechanizmami opartymi na otwartych standardach: ochrona DHCP i weryfikacja źródła (SAVI, RFC 7039 i 7513), limit adresów MAC na porcie oraz IEEE 802.1X z EAP (RFC 3748).',

  devices: {
    SW1: {
      type: 'switch',
      x: 480,
      y: 300,
      config: `
        # konto 802.1X dla gościa
        security user add gosc Wifi2026
      `,
    },
    R1: {
      type: 'router',
      x: 640,
      y: 90,
      config: `
        ip add 192.168.1.1/24 dev eth0
        interface eth0 up
        dhcp-server add LAN net 192.168.1.0/24 gw 192.168.1.1 range 192.168.1.100-192.168.1.150
      `,
    },
    OBCY: {
      type: 'server',
      x: 850,
      y: 140,
      config: `
        ip add 192.168.1.66/24 dev eth0
        service dhcp on
        service dns off
        service http off
        service https off
        service ftp off
        service mail off
        service ntp off
        # fałszywa pula: brama wskazuje na atakującego
        dhcp-server add FALSZYWA net 192.168.1.0/24 gw 192.168.1.66 range 192.168.1.200-192.168.1.220
      `,
    },
    PC1: { type: 'pc', x: 130, y: 150, dhcp: true },
    PC2: { type: 'pc', x: 130, y: 450, dhcp: true },
    GOSC: { type: 'pc', x: 130, y: 300, config: 'ip add 192.168.1.40/24 dev eth0\nroute add default via 192.168.1.1' },
    'SW-BIURKO': { type: 'switch', x: 770, y: 460 },
    PC3: { type: 'pc', x: 650, y: 520, config: 'ip add 192.168.1.31/24 dev eth0\nroute add default via 192.168.1.1' },
    PC4: { type: 'pc', x: 890, y: 520, config: 'ip add 192.168.1.32/24 dev eth0\nroute add default via 192.168.1.1' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['SW-BIURKO:port8', 'SW1:port3'],
    ['GOSC:eth0', 'SW1:port4'],
    ['OBCY:eth0', 'SW1:port7'],
    ['R1:eth0', 'SW1:port8'],
    ['PC3:eth0', 'SW-BIURKO:port1'],
    ['PC4:eth0', 'SW-BIURKO:port2'],
  ],
  zones: [
    { text: 'Fałszywy serwer DHCP', x: 744, y: 60, w: 216, h: 168, color: 'red' },
    { text: 'Gniazdo z dodatkowym przełącznikiem', x: 576, y: 384, w: 396, h: 204, color: 'violet' },
    { text: 'Gniazdo dla gości (802.1X)', x: 24, y: 228, w: 216, h: 144, color: 'amber' },
  ],

  start: 'bez-ochrony',
  variants: [
    { id: 'bez-ochrony', name: 'Bez ochrony', description: 'Atak działa: fałszywy DHCP odpowiada, obcy przełącznik i gość mają dostęp.' },
    {
      id: 'zabezpieczona',
      name: 'SW1 zabezpieczony',
      description: 'Ochrona DHCP (zaufany tylko port8), limit 1 MAC na port3, 802.1X na porcie gościa. SAVI włączysz sam – GOSC ma adres statyczny i potrzebuje powiązania.',
      config: {
        SW1: `
          security dhcp-guard on
          security port port8 trusted
          security port port3 max-mac 1
          security port port4 dot1x on
        `,
      },
    },
  ],

  tasks: [
    {
      text: 'Pobierz adres przez DHCP na PC1 i sprawdź bramę (show ip). Kto ją podał?',
      hint: 'dhcp-client start – odpowiedź fałszywego serwera dotarła pierwsza, brama 192.168.1.66 to atakujący.',
      check: (c) => dev(c, 'PC1')?.gateway === '192.168.1.66',
    },
    {
      text: 'Włącz na SW1 ochronę DHCP i oznacz port routera (port8) jako zaufany.',
      hint: 'security dhcp-guard on · security port port8 trusted (albo okno SW1 → Bezpieczeństwo)',
      check: (c) => !!dev(c, 'SW1')?.security.dhcpGuard && !!getIface(dev(c, 'SW1')!, 'port8')?.trusted,
    },
    { text: 'Pobierz adres na PC1 jeszcze raz – teraz brama to 192.168.1.1.', check: (c) => dev(c, 'PC1')?.gateway === '192.168.1.1' },
    { text: 'Obejrzyj tabelę powiązań IP ↔ MAC ↔ port zbudowaną z odpowiedzi DHCP.', hint: 'show security na SW1', check: (c) => (dev(c, 'SW1')?.bindings.length ?? 0) > 0 },
    {
      text: 'Ustaw na port3 limit jednego adresu MAC, a potem wyślij ping do 192.168.1.1 z PC3 i z PC4.',
      hint: 'mac flush · security port port3 max-mac 1 – drugi komputer za przełącznikiem SW-BIURKO zostanie zablokowany',
      check: (c) => getIface(dev(c, 'SW1')!, 'port3')?.maxMac === 1 && c.events.some((e) => e.dropped && e.notes.some((n) => n.startsWith('Limit MAC'))),
    },
    {
      text: 'Włącz 802.1X na porcie gościa (port4), sprawdź, że GOSC nie ma dostępu, i zaloguj go kontem gosc / Wifi2026.',
      hint: 'security port port4 dot1x on · na GOSC: dot1x login user gosc pass Wifi2026',
      check: (c) => !!getIface(dev(c, 'SW1')!, 'port4')?.authMac,
    },
    {
      text: 'Włącz weryfikację źródła (SAVI). Dlaczego GOSC z adresem statycznym przestał działać? Dodaj mu powiązanie.',
      hint: 'security savi on · security binding add <MAC GOSC> 192.168.1.40 port port4',
      check: (c) => !!dev(c, 'SW1')?.security.savi && !!dev(c, 'SW1')?.bindings.some((b) => b.ip === '192.168.1.40'),
    },
  ],
});
