// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Które scenariusze są widoczne na pasku „Scenariusz”.
//
// Scenariusze bazowe są widoczne zawsze: „LAN i ARP”, „Router” i „Pusty projekt”
// (w scenarios.ts mają `base: true`). Tutaj dopisujesz identyfikatory dodatkowych scenariuszy.
// Kolejność na pasku jest stała (jak w scenarios.ts), a numery nadawane są po kolei widocznym scenariuszom.
//
// Dostępne identyfikatory:
//   dhcp      – Automatyczna adresacja: DHCP
//   static    – Dwa routery: trasy statyczne
//   vlan      – VLAN-y: izolacja w jednym przełączniku
//   services  – Serwer i usługi sieciowe
//   relay     – DHCP przez router (przekaźnik)
//   ipv6      – IPv6: SLAAC i NDP
//   dual      – Dual stack: IPv4 i IPv6 razem
//   tunnel    – Tunelowanie: IPv6 przez sieć IPv4 (6in4)
//   nat64     – Translacja: NAT64 z DNS64
//   security  – Bezpieczeństwo w sieci lokalnej
//
// Na pojedynczej stronie listę można nadpisać właściwością komponentu, np.
//   <NetworkSimulator scenarios={['ipv6', 'dual']} />

export const EXTRA_SCENARIOS: string[] = ['dhcp', 'tunnel', 'security', 'services', 'relay', 'ipv6', 'dual', 'nat64', 'vlan', 'static'];
