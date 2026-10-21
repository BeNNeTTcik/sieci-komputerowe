// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
import { defineScenario } from './types';

export default defineScenario({
  id: 'empty',
  base: true,
  short: 'Pusty projekt',
  title: 'Pusty projekt',
  level: 'podstawowy',
  packs: ['ipv4'],
  description: 'Zbuduj własną sieć. Potrzebne protokoły (IPv6, DHCP, usługi serwera…) włączysz w menu „Pakiety”.',
  devices: {},
  tasks: [],
});
