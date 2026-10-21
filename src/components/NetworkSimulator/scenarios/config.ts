// © 2026 Mateusz Dampc. Wszelkie prawa zastrzeżone. Szczegóły: plik LICENSE.
// Które scenariusze są widoczne na pasku „Scenariusz”.
//
// Scenariusze bazowe są widoczne zawsze: „LAN i ARP”, „Router” i „Pusty projekt”
// (w swoich plikach mają `base: true`). Tutaj dopisujesz identyfikatory dodatkowych scenariuszy.
// Kolejność na pasku jest stała (jak w scenarios/index.ts), a numery nadawane są po kolei widocznym scenariuszom.
//
// Dostępne identyfikatory (plik scenariusza w nawiasie):
//   dhcp      – Automatyczna adresacja: DHCP             (dhcp.ts)
//   static    – Dwa routery: trasy statyczne              (static.ts)
//   vlan      – VLAN-y: izolacja w jednym przełączniku    (vlan.ts)
//   services  – Serwer i usługi sieciowe                  (services.ts)
//   relay     – DHCP przez router (przekaźnik)            (relay.ts)
//   ipv6      – IPv6: SLAAC i NDP                         (ipv6.ts)
//   dual      – Dual stack: IPv4 i IPv6 razem             (dual.ts)
//   transport – Transport: TCP i UDP                      (transport.ts)
//   tunnel    – Tunelowanie: IPv6 przez sieć IPv4 (6in4)  (tunnel.ts)
//   nat64     – Translacja: NAT64 z DNS64                 (nat64.ts)
//   security  – Bezpieczeństwo w sieci lokalnej           (security.ts)
//
// Na pojedynczej stronie listę można nadpisać właściwością komponentu, np.
//   <NetworkSimulator scenarios={['ipv6', 'dual']} />
//
// Konfigurację urządzeń i warianty stanu początkowego zmieniasz w pliku danego scenariusza.

export const EXTRA_SCENARIOS: string[] = ['transport'];
