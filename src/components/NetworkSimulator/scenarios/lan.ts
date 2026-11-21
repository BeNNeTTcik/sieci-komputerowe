// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';
import { dev, icmpArrived, REPLY } from './checks';

export default defineScenario({
  id: 'lan',
  base: true,
  short: 'LAN i ARP',
  title: 'Sieć lokalna: ARP i ping',
  level: 'podstawowy',
  packs: ['ipv4', 'print'],
  description:
    'Cztery urządzenia w jednej sieci 192.168.1.0/24 połączone przełącznikiem. Zobacz, jak host najpierw pyta o adres MAC (ARP), a dopiero potem wysyła pakiet IP, i jak przełącznik uczy się, za którym portem jest który komputer.',

  devices: {
    SW1: { type: 'switch', x: 480, y: 290 },
    PC1: { type: 'pc', x: 220, y: 130, config: 'ip add 192.168.1.10/24 dev eth0' },
    PC2: { type: 'pc', x: 740, y: 130, config: 'ip add 192.168.1.11/24 dev eth0' },
    PC3: { type: 'pc', x: 220, y: 450, config: 'ip add 192.168.1.12/24 dev eth0' },
    DRUK1: { type: 'printer', x: 740, y: 450, config: 'ip add 192.168.1.50/24 dev eth0' },
  },
  links: [
    ['PC1:eth0', 'SW1:port1'],
    ['PC2:eth0', 'SW1:port2'],
    ['PC3:eth0', 'SW1:port3'],
    ['DRUK1:eth0', 'SW1:port4'],
  ],

  tasks: [
    { text: 'Wyślij ping z PC1 do PC2.', hint: 'Kliknij PC1 → Narzędzia, albo w terminalu PC1: ping 192.168.1.11 count 1', check: (c) => icmpArrived(c, 'PC1', '192.168.1.11', REPLY) },
    {
      text: 'Sprawdź tablicę ARP na PC2 – czy PC2 zna już MAC komputera PC1, choć sam o niego nie pytał?',
      hint: 'Terminal PC2: show arp. Odbiorca zapytania ARP zapamiętuje pytającego (RFC 826).',
      check: (c) => !!dev(c, 'PC2')?.arp.some((a) => a.ip === '192.168.1.10'),
    },
    { text: 'Wydrukuj dokument z PC3 na drukarce DRUK1.', hint: 'Terminal PC3: print 192.168.1.50 doc referat.pdf', check: (c) => (dev(c, 'DRUK1')?.jobs.length ?? 0) > 0 },
    { text: 'Ile kopii zapytania ARP rozesłał SW1 i dlaczego DRUK1 odrzucił swoją kopię?' },
    { text: 'Wyczyść tablice i powtórz ping. Porównaj liczbę ramek z drugim pingiem bez czyszczenia.' },
  ],
});
