// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, icmpArrived, portOf, REPLY } from './checks';

export default defineScenario({
  id: 'vlan',
  short: 'VLAN',
  title: 'VLAN-y: izolacja w jednym przełączniku',
  level: 'zaawansowany',
  packs: ['ipv4', 'vlan'],
  description: 'Cztery komputery w tej samej podsieci IP, w jednym przełączniku. Po podziale na dwa VLAN-y rozgłoszenia ARP nie przechodzą już między grupami.',

  devices: {
    SW1: { type: 'switch', x: 480, y: 290 },
    PC1: { type: 'pc', x: 200, y: 130, config: 'ip add 192.168.1.11/24 dev eth0' },
    PC2: { type: 'pc', x: 200, y: 450, config: 'ip add 192.168.1.12/24 dev eth0' },
    PC3: { type: 'pc', x: 760, y: 130, config: 'ip add 192.168.1.13/24 dev eth0' },
    PC4: { type: 'pc', x: 760, y: 450, config: 'ip add 192.168.1.14/24 dev eth0' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['PC3:eth0', 'SW1:port3'],
    ['PC4:eth0', 'SW1:port4'],
  ],

  start: 'bez-vlan',
  variants: [
    { id: 'bez-vlan', name: 'Bez VLAN-ów', description: 'Wszystkie porty w domyślnym VLAN-ie 1 – każdy widzi każdego.' },
    {
      id: 'gotowa',
      name: 'VLAN 10 i 20',
      description: 'PC1 i PC2 w VLAN 10 (BIURO), PC3 i PC4 w VLAN 20 (GOSCIE).',
      config: {
        SW1: `
          vlan add 10 name BIURO
          vlan add 20 name GOSCIE
          interface port1 vlan 10
          interface port2 vlan 10
          interface port3 vlan 20
          interface port4 vlan 20
        `,
      },
    },
  ],

  tasks: [
    { text: 'Utwórz VLAN 10 (BIURO) i VLAN 20 (GOSCIE) na SW1.', hint: 'vlan add 10 name BIURO  /  vlan add 20 name GOSCIE', check: (c) => [10, 20].every((v) => dev(c, 'SW1')?.vlans.some((x) => x.id === v)) },
    {
      text: 'Przypisz porty PC1 i PC2 do VLAN 10, a PC3 i PC4 do VLAN 20.',
      hint: 'interface port1 vlan 10 … albo okno Porty',
      check: (c) => portOf(c, 'SW1', 'PC1')?.vlan === 10 && portOf(c, 'SW1', 'PC2')?.vlan === 10 && portOf(c, 'SW1', 'PC3')?.vlan === 20 && portOf(c, 'SW1', 'PC4')?.vlan === 20,
    },
    { text: 'Ping z PC1 do PC2 (ten sam VLAN) działa.', check: (c) => icmpArrived(c, 'PC1', '192.168.1.12', REPLY) && portOf(c, 'SW1', 'PC1')?.vlan === 10 },
    { text: 'Ping z PC1 do PC3 nie działa. Na którym etapie się zatrzymuje? Przejrzyj notatki przełącznika.' },
    { text: 'Co trzeba by dodać, żeby VLAN-y mogły się komunikować? (podpowiedź: routing między sieciami)' },
  ],
});
