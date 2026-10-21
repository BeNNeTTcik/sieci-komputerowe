---
sidebar_position: 11
title: "Dokumentacja 2.2: Wstęp do pracy z urządzeniami MikroTik i Cheat Sheet"
---

# Dokumentacja 2.2: Wstęp do pracy z urządzeniami MikroTik i Cheat Sheet

## I. Wstęp do pracy z urządzeniami MikroTik
<div className="justify">
Urządzenia firmy **MikroTik** (routery RouterBOARD, przełączniki CRS, wersja wirtualna CHR) pracują pod kontrolą systemu **RouterOS** [^routeros]. W odróżnieniu od Cisco IOS nie ma tu trybów (`enable`, `configure terminal`) - CLI jest zbudowane jak **drzewo menu**, podobne do katalogów w systemie plików. Każde menu (np. `/ip address`) przechowuje listę wpisów, na których wykonuje się te same polecenia: `print`, `add`, `set`, `remove`, `enable`, `disable`. Zmiany działają **natychmiast i są zapisywane automatycznie**. Nie ma odpowiednika `write memory`. Urządzenie można konfigurować przez CLI (konsola, SSH, terminal w WinBox), program **WinBox** lub przeglądarkę (**WebFig**). W Tabeli 1 przedstawiono najważniejsze menu systemu RouterOS.
</div>

Tab.1 Najważniejsze menu RouterOS

| Menu | Znak zachęty | Możliwości |
|---------|---------|---------|
| **Główne (root)** | `[admin@R1-1] >` | dostęp do wszystkich menu, `ping`, `export`, `quit` |
| **System** | `[admin@R1-1] /system>` | nazwa urządzenia (`identity`), czas, użytkownicy, kopie zapasowe, restart |
| **Interfejsy** | `[admin@R1-1] /interface>` | interfejsy fizyczne, VLAN, mosty (bridge), włączanie i wyłączanie portów |
| **IP** | `[admin@R1-1] /ip>` | adresy IPv4, trasy, ARP, DHCP, DNS, zapora (`firewall`), usługi zarządzania |
| **IPv6** | `[admin@R1-1] /ipv6>` | adresy IPv6, trasy, sąsiedzi (NDP), zapora IPv6 |
| **Routing** | `[admin@R1-1] /routing>` | protokoły routingu dynamicznego (OSPF, RIP, BGP) |
| **Narzędzia** | `[admin@R1-1] /tool>` | traceroute, sniffer, torch, testy przepustowości |
| **Bridge** | `[admin@R1-1] /bridge>` | połączenia pomiędzy interfejsami, łatwiejsze zarządzanie grupą interfejsów/portów |

Poruszanie się po menu:
- `/ip address` - przejście do menu (od korzenia, ścieżka zaczyna się od `/`).
- `..` - jeden poziom w górę, `/` - powrót do menu głównego.
- Polecenie można też wydać z dowolnego miejsca pełną ścieżką, np. `/ip address print`.
- **Tab** podpowiada i uzupełnia polecenia, a **?** wyświetla pomoc.
- Wpisy wskazuje się numerem z `print` (`set 0 …`) albo filtrem (`set [find interface=ether1] …`).
- **Ctrl+X** włącza **tryb bezpieczny (Safe Mode)** - po utracie połączenia router sam cofnie zmiany z tej sesji. Ponowne Ctrl+X zatwierdza zmiany. `/undo` cofa ostatnią operację.

Konfiguracja urządzeń MikroTik powinna obejmować:
- **własne konto administratora** i wyłączenie domyślnego konta `admin` (fabryczne urządzenia mają hasło na naklejce lub wymagają jego ustawienia przy pierwszym logowaniu);
- **identity** - nazwa urządzenia widoczna w znaku zachęty i w WinBox;
- **notatkę przy logowaniu** (`/system note`) - odpowiednik banera;
- **wyłączenie zbędnych usług** (Telnet, FTP, WWW, API) i ograniczenie SSH/WinBox do sieci administratora;
- **wyłączenie dostępu po adresie MAC** (MAC-Telnet, MAC-WinBox) i wykrywania sąsiadów na niezaufanych portach;
- **zaporę chroniącą sam router** (łańcuch `input`) – RouterOS **domyślnie przepuszcza** ruch, którego nie zablokuje reguła;
- konfigurację interfejsów, adresacji i routingu oraz pozostałych usług (np. DHCP).

Dokumentacja RouterOS: [MikroTik Help](https://help.mikrotik.com/docs/) [^routeros]. Do ćwiczeń bez sprzętu można użyć obrazu **CHR** w GNS3 lub EVE-NG na zasadzie darmowej licencji, która działa bez limitu czasu, z ograniczeniem wysyłania do 1 Mb/s na interfejs [^chr].

## II. Cheat Sheet

### Podstawowa konfiguracja
```
[admin@MikroTik] > /system identity set name=R1-1

[admin@R1-1] > /user settings set minimum-password-length=12
[admin@R1-1] > /user add name=student group=full password=MikrotikAdmin123
[admin@R1-1] > /user disable admin                  # dopiero po zalogowaniu na konto "student"
[admin@R1-1] > /password                            # zmiana hasła bieżącego użytkownika

[admin@R1-1] > /system note set show-at-login=yes note="Dostęp wyłącznie dla autoryzowanych użytkowników"

[admin@R1-1] > /ip service disable telnet,ftp,www,api,api-ssl
[admin@R1-1] > /ip service set ssh address=10.1.0.0/24
[admin@R1-1] > /ip service set winbox address=10.1.0.0/24
[admin@R1-1] > /ip ssh set strong-crypto=yes

[admin@R1-1] > /tool mac-server set allowed-interface-list=none
[admin@R1-1] > /tool mac-server mac-winbox set allowed-interface-list=none
[admin@R1-1] > /ip neighbor discovery-settings set discover-interface-list=none
```

Uwaga: RouterOS przechowuje hasła w postaci zaszyfrowanej i nie wyświetla ich w `/export` – nie ma potrzeby odpowiednika `service password-encryption`.

---

### Konfiguracja interfejsów
**Router:**
```
[admin@R1-1] > /interface ethernet set ether1 comment="xyz"
[admin@R1-1] > /ip address add address=10.1.0.1/24 interface=ether1
[admin@R1-1] > /interface enable ether1             # odpowiednik "no shutdown"
[admin@R1-1] > /interface disable ether5            # odpowiednik "shutdown"

[admin@R1-1] > /ipv6 address add address=2001:db8:1::1/64 interface=ether1 advertise=yes
```

Uwaga: maskę podaje się jako prefiks (`/24`), a nie w postaci `255.255.255.0`. `advertise=yes` włącza ogłaszanie prefiksu IPv6 (RA) dla SLAAC.

**Przełącznik (most i interfejs zarządzania):**
```
[admin@SW-1] > /interface bridge add name=bridge1
[admin@SW-1] > /interface bridge port add bridge=bridge1 interface=ether2
[admin@SW-1] > /interface bridge port add bridge=bridge1 interface=ether3
[admin@SW-1] > /ip address add address=10.1.0.2/24 interface=bridge1
[admin@SW-1] > /ip route add dst-address=0.0.0.0/0 gateway=10.1.0.1    # odpowiednik "ip default-gateway"
```

**Port dostępowy przełącznika (VLAN 10, bez znacznika):**
```
[admin@SW-1] > /interface bridge port set [find interface=ether2] pvid=10
```

---

### Zapisywanie i przywracanie konfiguracji

```
[admin@R1-1] > /export                              # aktywna konfiguracja w formie poleceń
[admin@R1-1] > /export show-sensitive               # to samo, łącznie z hasłami i kluczami
[admin@R1-1] > /export file=R1-1                    # zapis konfiguracji tekstowej do pliku R1-1.rsc
[admin@R1-1] > /import file-name=R1-1.rsc           # wczytanie konfiguracji tekstowej
[admin@R1-1] > /system backup save name=R1-1 password=Backup123      # pełna kopia binarna (szyfrowana)
[admin@R1-1] > /system backup load name=R1-1.backup password=Backup123
[admin@R1-1] > /file print                          # pliki zapisane na urządzeniu
[admin@R1-1] > /system reset-configuration no-defaults=yes          # kasowanie konfiguracji
[admin@R1-1] > /system reboot                       # restart urządzenia
```

Uwaga: konfiguracja zapisuje się automatycznie po każdej zmianie – nie ma osobnego „startup-config”. Plik `.backup` przywraca się tylko na tym samym modelu, a `.rsc` (tekst) można edytować i przenosić między urządzeniami.

---

### Polecenia weryfikacyjne

```
[admin@R1-1] > /interface print                     # status interfejsów (R – running, X – wyłączony)
[admin@R1-1] > /ip address print                    # adresy IPv4 wszystkich interfejsów
[admin@R1-1] > /ipv6 address print                  # adresy IPv6 (w tym link-local)
[admin@R1-1] > /interface ethernet monitor ether1   # szczegóły interfejsu (prędkość, duplex)
[admin@R1-1] > /ip route print                      # tablica routingu
[admin@R1-1] > /system resource print               # wersja RouterOS, CPU, pamięć, czas pracy
[admin@R1-1] > /system routerboard print            # model i wersja firmware
[admin@R1-1] > /ip neighbor print                   # sąsiednie urządzenia (MNDP, CDP, LLDP)
[admin@R1-1] > /ip arp print                        # tablica ARP
[admin@R1-1] > /ipv6 neighbor print                 # tablica sąsiadów IPv6 (NDP)

[admin@SW-1] > /interface bridge host print         # tablica adresów MAC
[admin@SW-1] > /interface bridge vlan print         # VLAN-y i przypisane porty
[admin@SW-1] > /interface bridge port print         # porty mostu i ich PVID
```

---

### Routing statyczny

```
[admin@R1-1] > /ip route add dst-address=10.1.2.0/24 gateway=10.1.1.2
#                            ^sieć docelowa/prefiks   ^adres next-hop

[admin@R1-1] > /ip route add dst-address=0.0.0.0/0 gateway=10.1.1.2
#                            ^trasa domyślna (brama ostatniej szansy)

[admin@R1-1] > /ipv6 route add dst-address=2001:db8:2::/64 gateway=2001:db8:12::2
```

Weryfikacja: `/ip route print where static`

---

### Routing dynamiczny — RIP

```
[admin@R1-1] > /routing rip instance add name=rip1 redistribute=connected
[admin@R1-1] > /routing rip interface-template add instance=rip1 interfaces=ether1,ether2
```

Uwaga: w RouterOS 7 RIP jest zawsze w wersji 2; składnia różni się od RouterOS 6 (tam: `/routing rip network add network=…`).

Weryfikacja: `/routing rip neighbor print`, `/ip route print where rip`

---

### Routing dynamiczny — OSPF

```
[admin@R1-1] > /routing ospf instance add name=ospf1 version=2 router-id=1.1.1.1
[admin@R1-1] > /routing ospf area add name=backbone area-id=0.0.0.0 instance=ospf1
[admin@R1-1] > /routing ospf interface-template add area=backbone networks=10.1.0.0/24,10.1.1.0/30
```

Uwaga: RouterOS **nie używa maski odwrotnej (wildcard)** – sieci podaje się zwykłym prefiksem (`/24`, `/30`).

Weryfikacja: `/routing ospf neighbor print`, `/ip route print where ospf`

---

### VLAN i trunking

**Tworzenie VLAN na przełączniku (bridge VLAN filtering):**
```
[admin@SW-1] > /interface bridge port set [find interface=ether2] pvid=10       # port dostępowy VLAN 10
[admin@SW-1] > /interface bridge port set [find interface=ether3] pvid=20       # port dostępowy VLAN 20
[admin@SW-1] > /interface bridge vlan add bridge=bridge1 vlan-ids=10 tagged=ether24 untagged=ether2
[admin@SW-1] > /interface bridge vlan add bridge=bridge1 vlan-ids=20 tagged=ether24 untagged=ether3
[admin@SW-1] > /interface bridge set bridge1 vlan-filtering=yes                  # włączyć NA KOŃCU
```

Uwaga: port `ether24` jest trunkiem – przenosi VLAN 10 i 20 ze znacznikiem 802.1Q. Filtrowanie VLAN włączaj jako ostatnie i w trybie Safe Mode, bo błąd w konfiguracji może odciąć dostęp do przełącznika.

**Router-on-a-stick — interfejsy VLAN routera:**
```
[admin@R1-1] > /interface vlan add name=vlan10 vlan-id=10 interface=ether2
[admin@R1-1] > /ip address add address=10.1.10.1/24 interface=vlan10

[admin@R1-1] > /interface vlan add name=vlan20 vlan-id=20 interface=ether2
[admin@R1-1] > /ip address add address=10.1.20.1/24 interface=vlan20
```

---

### Zapora (odpowiednik list ACL)

**Blokada jednego hosta (odpowiednik ACL standardowej):**
```
[admin@R1-1] > /ip firewall filter add chain=forward src-address=10.1.0.10 action=drop
```

**Filtrowanie po adresie, protokole i porcie (odpowiednik ACL rozszerzonej):**
```
[admin@R1-1] > /ip firewall filter add chain=forward protocol=icmp src-address=10.1.0.0/24 dst-address=10.1.2.0/24 action=drop
[admin@R1-1] > /ip firewall filter add chain=forward protocol=tcp src-address=10.1.0.0/24 dst-address=10.1.2.0/24 dst-port=80 action=accept
```

**Ograniczenie do interfejsu (odpowiednik `ip access-group … in`):**
```
[admin@R1-1] > /ip firewall filter add chain=forward in-interface=ether2 protocol=icmp action=drop
```

Uwaga: reguły są sprawdzane od góry, ale – **inaczej niż w Cisco – na końcu nie ma niejawnego „deny”**; ruch, którego nie zablokuje żadna reguła, jest przepuszczany. Łańcuch `forward` dotyczy ruchu przechodzącego przez router, a `input` – ruchu do samego routera. Nową regułę wstawia się w wybrane miejsce parametrem `place-before=0`.

Weryfikacja: `/ip firewall filter print stats` (liczniki pakietów i bajtów dla każdej reguły)

---

### Serwer DHCP na routerze

```
[admin@R1-1] > /ip pool add name=LAN-PULA ranges=10.1.0.11-10.1.0.254
[admin@R1-1] > /ip dhcp-server network add address=10.1.0.0/24 gateway=10.1.0.1 dns-server=8.8.8.8
[admin@R1-1] > /ip dhcp-server add name=dhcp-lan interface=ether1 address-pool=LAN-PULA lease-time=7d disabled=no
```

Uwaga: zakres adresów wyklucza się, ustawiając pulę od `.11` – nie ma osobnego polecenia `excluded-address`. Szybka konfiguracja krok po kroku: `/ip dhcp-server setup`.

Weryfikacja: `/ip dhcp-server lease print`

---

### Bezpieczeństwo warstwy 2

**DHCP snooping (ochrona przed nieautoryzowanym serwerem DHCP):**
```
[admin@SW-1] > /interface bridge set bridge1 dhcp-snooping=yes
[admin@SW-1] > /interface bridge port set [find interface=ether24] trusted=yes      # port w stronę serwera DHCP
```

**Ograniczenie adresów MAC na porcie (odpowiednik port security):**
```
[admin@SW-1] > /interface bridge port set [find interface=ether2] learn=no
[admin@SW-1] > /interface bridge host add bridge=bridge1 interface=ether2 mac-address=00:11:22:33:44:55
```

Uwaga: RouterOS nie ma polecenia `port-security` znanego z Cisco – podobny efekt daje wyłączenie uczenia się adresów MAC na porcie i statyczny wpis dozwolonego adresu. Pełniejszą kontrolę zapewnia uwierzytelnianie 802.1X (`/interface dot1x`).

**Ochrona samego routera (łańcuch input):**
```
[admin@R1-1] > /ip firewall filter add chain=input connection-state=established,related action=accept
[admin@R1-1] > /ip firewall filter add chain=input connection-state=invalid action=drop
[admin@R1-1] > /ip firewall filter add chain=input protocol=icmp action=accept
[admin@R1-1] > /ip firewall filter add chain=input src-address=10.1.0.0/24 protocol=tcp dst-port=22,8291 action=accept
[admin@R1-1] > /ip firewall filter add chain=input action=drop
```

---

### Szybka diagnostyka

```
[admin@R1-1] > /ping 10.1.1.2                       # sprawdzenie łączności warstwy 3
[admin@R1-1] > /ping 10.1.1.2 count=5 size=1400 do-not-fragment     # test MTU
[admin@R1-1] > /tool traceroute 10.1.2.10           # sprawdzenie trasy pakietu
[admin@R1-1] > /interface print                     # który interfejs nie działa?
[admin@R1-1] > /interface ethernet export          # konfiguracja tylko wybranego menu
[admin@R1-1] > /ip route print where dst-address=10.1.2.0/24      # czy jest trasa do celu?
[admin@R1-1] > /ip firewall filter print stats      # czy zapora nie blokuje ruchu (liczniki)?
[admin@R1-1] > /tool sniffer quick interface=ether1 ip-protocol=icmp   # podgląd pakietów ICMP na żywo
[admin@R1-1] > /tool torch interface=ether1         # bieżący ruch na interfejsie
[admin@R1-1] > /log print                           # dziennik zdarzeń
```

Zatrzymanie `sniffer`, `torch` i `ping`: **Q** lub **Ctrl+C**.

[^routeros]: [MikroTik RouterOS – dokumentacja](https://help.mikrotik.com/docs/), MikroTik, 2026.

[^chr]: [MikroTik CHR – License Levels](https://help.mikrotik.com/docs/x/1QEF), MikroTik, 2026.
