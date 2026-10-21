---
sidebar_position: 12
title: "Dokumentacja 2.3: Wstęp do pracy z urządzeniami Fortinet i Cheat Sheet"
---

# Dokumentacja 2.3: Wstęp do pracy z urządzeniami Fortinet i Cheat Sheet

## I. Wstęp do pracy z urządzeniami Fortinet
<div className="justify">
Urządzenia **FortiGate** firmy **Fortinet** to zapory sieciowe nowej generacji (NGFW), które pełnią też rolę routera. Pracują pod kontrolą systemu **FortiOS** [^fortios]. Konfiguracja odbywa się przez przeglądarkę (GUI) lub wiersz poleceń (**CLI**) dostępny przez konsolę, SSH albo okno *CLI Console* w GUI. CLI jest zbudowane z **bloków konfiguracyjnych**: `config` otwiera sekcję, `edit` wybiera lub tworzy obiekt, `set` ustawia parametr, `next` zapisuje obiekt, a `end` zamyka sekcję. **Zmiany są zapisywane automatycznie** po `next` lub `end` – nie ma odpowiednika `write memory`. Najważniejsza różnica względem routera Cisco: **FortiGate domyślnie blokuje ruch między interfejsami** – sama trasa nie wystarczy, potrzebna jest **polityka zapory** (firewall policy). W Tabeli 1 przedstawiono poziomy i polecenia CLI.
</div>

Tab.1 Poziomy i polecenia CLI FortiOS

| Poziom / polecenie | Znak zachęty | Możliwości |
|---------|---------|---------|
| **Poziom główny** | `FGT-1 #` | polecenia `config`, `get`, `show`, `diagnose`, `execute` |
| **Sekcja konfiguracji** | `FGT-1 (interface) #` | lista obiektów danej sekcji (po `config system interface`) |
| **Obiekt** | `FGT-1 (port1) #` | parametry jednego obiektu (po `edit port1`): `set`, `unset`, `get`, `show` |
| **`get`** | – | bieżące wartości i stan (np. tablica routingu) |
| **`show`** | – | konfiguracja różniąca się od domyślnej (`show full-configuration` – cała) |
| **`execute`** | – | działania jednorazowe: ping, traceroute, kopia zapasowa, restart |
| **`diagnose`** | – | diagnostyka zaawansowana: ARP, sniffer, śledzenie decyzji zapory |

Poruszanie się po CLI:
- `config system interface` – wejście do sekcji, `edit port1` – wybór obiektu.
- `next` – zapis obiektu i powrót do sekcji, `end` – zapis i wyjście na poziom główny.
- `abort` – wyjście z obiektu **bez** zapisywania zmian.
- **Tab** uzupełnia polecenia, a **?** wyświetla możliwe opcje.
- `show` wewnątrz obiektu pokazuje jego aktualną konfigurację.

Konfiguracja urządzeń Fortinet powinna obejmować:
- **zmianę hasła domyślnego konta `admin`** (puste hasło, zmiana wymuszana przy pierwszym logowaniu) i utworzenie własnego konta administratora;
- **nazwę urządzenia** (`hostname`);
- **baner przed logowaniem** (pre-login banner);
- **ograniczenie dostępu administracyjnego**: usługi zarządzania na interfejsie (`allowaccess` – bez `telnet` i `http`) oraz zaufane adresy administratora (`trusthost`);
- **automatyczne wylogowanie i blokadę konta** po nieudanych logowaniach;
- konfigurację interfejsów, routingu i **polityk zapory** dla ruchu między sieciami.

Dokumentacja FortiOS: [Fortinet Document Library](https://docs.fortinet.com/product/fortigate) [^fortios]. Do ćwiczeń bez sprzętu można użyć **FortiGate-VM** w trybie *permanent trial* (wymaga konta FortiCloud, działa z ograniczeniami zasobów i funkcji) [^trial].

## II. Cheat Sheet

### Podstawowa konfiguracja
```
FGT # config system global
FGT (global) # set hostname FGT-1
FGT (global) # set admintimeout 5                   # wylogowanie po 5 min bezczynności
FGT (global) # set admin-lockout-threshold 3        # blokada po 3 nieudanych logowaniach
FGT (global) # set admin-lockout-duration 120       # na 120 s
FGT (global) # set pre-login-banner enable
FGT (global) # end

FGT-1 # config system replacemsg admin pre_admin-disclaimer-text
FGT-1 (pre_admin-discl~t) # set buffer "Dostęp wyłącznie dla autoryzowanych użytkowników"
FGT-1 (pre_admin-discl~t) # end

FGT-1 # config system password-policy
FGT-1 (password-policy) # set status enable
FGT-1 (password-policy) # set minimum-length 12
FGT-1 (password-policy) # set apply-to admin-password
FGT-1 (password-policy) # end

FGT-1 # config system admin
FGT-1 (admin) # edit student
FGT-1 (student) # set accprofile super_admin
FGT-1 (student) # set password FortiAdmin123
FGT-1 (student) # set trusthost1 10.1.0.0 255.255.255.0       # logowanie tylko z LAN
FGT-1 (student) # next
FGT-1 (admin) # end
```

Uwaga: FortiOS przechowuje hasła w postaci zaszyfrowanej – nie ma potrzeby odpowiednika `service password-encryption`. Po utworzeniu własnego konta usuń domyślne konto `admin` albo ogranicz je `trusthost`.

---

### Konfiguracja interfejsów
**FortiGate:**
```
FGT-1 # config system interface
FGT-1 (interface) # edit port1
FGT-1 (port1) # set mode static
FGT-1 (port1) # set ip 10.1.0.1 255.255.255.0
FGT-1 (port1) # set allowaccess ping https ssh      # usługi zarządzania na tym interfejsie
FGT-1 (port1) # set alias LAN
FGT-1 (port1) # set description "xyz"
FGT-1 (port1) # set status up                       # odpowiednik "no shutdown"
FGT-1 (port1) # config ipv6
FGT-1 (ipv6) # set ip6-address 2001:db8:1::1/64
FGT-1 (ipv6) # set ip6-allowaccess ping
FGT-1 (ipv6) # set ip6-send-adv enable              # ogłaszanie prefiksu (RA) dla SLAAC
FGT-1 (ipv6) # end
FGT-1 (port1) # next
FGT-1 (interface) # end
```

Uwaga: FortiGate nie pełni roli przełącznika z interfejsem `vlan 1`. W mniejszych modelach kilka portów można połączyć w przełącznik sprzętowy (*hardware switch*), a do pełnej obsługi warstwy 2 służą przełączniki **FortiSwitch** zarządzane z FortiGate (FortiLink).

---

### Zapisywanie i przywracanie konfiguracji

```
FGT-1 # show                                        # konfiguracja różniąca się od domyślnej
FGT-1 # show full-configuration                     # pełna konfiguracja
FGT-1 # show system interface                       # konfiguracja jednej sekcji
FGT-1 # execute backup config tftp FGT-1.conf 10.1.0.100      # kopia na serwer TFTP
FGT-1 # execute restore config tftp FGT-1.conf 10.1.0.100     # przywrócenie (restart urządzenia)
FGT-1 # execute factoryreset                        # przywrócenie ustawień fabrycznych
FGT-1 # execute reboot                              # restart urządzenia
FGT-1 # execute shutdown                            # wyłączenie urządzenia
```

Uwaga: zmiany zapisują się automatycznie po `next` lub `end`. Kopię zapasową można też pobrać w GUI: menu użytkownika → *Configuration* → *Backup*.

---

### Polecenia weryfikacyjne

```
FGT-1 # get system status                           # wersja FortiOS, model, numer seryjny, czas pracy
FGT-1 # get system interface physical               # status i adresy interfejsów fizycznych
FGT-1 # diagnose hardware deviceinfo nic port1      # szczegóły interfejsu (prędkość, błędy)
FGT-1 # get router info routing-table all           # tablica routingu IPv4
FGT-1 # get router info6 routing-table              # tablica routingu IPv6
FGT-1 # get system arp                              # tablica ARP
FGT-1 # diagnose ipv6 neighbor-cache list           # tablica sąsiadów IPv6
FGT-1 # get system performance status               # obciążenie CPU, pamięci, sesje
FGT-1 # show firewall policy                        # polityki zapory
```

---

### Routing statyczny

```
FGT-1 # config router static
FGT-1 (static) # edit 1
FGT-1 (1) # set dst 10.1.2.0 255.255.255.0          # sieć docelowa i maska
FGT-1 (1) # set gateway 10.1.1.2                    # adres next-hop
FGT-1 (1) # set device port2                        # interfejs wyjściowy (wymagany)
FGT-1 (1) # next
FGT-1 (static) # edit 2
FGT-1 (2) # set dst 0.0.0.0 0.0.0.0                 # trasa domyślna
FGT-1 (2) # set gateway 10.1.1.2
FGT-1 (2) # set device port2
FGT-1 (2) # next
FGT-1 (static) # end

FGT-1 # config router static6
FGT-1 (static6) # edit 1
FGT-1 (1) # set dst 2001:db8:2::/64
FGT-1 (1) # set gateway 2001:db8:12::2
FGT-1 (1) # set device port2
FGT-1 (1) # next
FGT-1 (static6) # end
```

Weryfikacja: `get router info routing-table static`

---

### Routing dynamiczny — RIP

```
FGT-1 # config router rip
FGT-1 (rip) # config network
FGT-1 (network) # edit 1
FGT-1 (1) # set prefix 10.1.0.0 255.255.255.0
FGT-1 (1) # next
FGT-1 (network) # edit 2
FGT-1 (2) # set prefix 10.1.1.0 255.255.255.252
FGT-1 (2) # next
FGT-1 (network) # end
FGT-1 (rip) # end
```

Weryfikacja: `get router info rip database`, `get router info routing-table rip`

---

### Routing dynamiczny — OSPF

```
FGT-1 # config router ospf
FGT-1 (ospf) # set router-id 1.1.1.1
FGT-1 (ospf) # config area
FGT-1 (area) # edit 0.0.0.0
FGT-1 (0.0.0.0) # next
FGT-1 (area) # end
FGT-1 (ospf) # config network
FGT-1 (network) # edit 1
FGT-1 (1) # set prefix 10.1.0.0 255.255.255.0
FGT-1 (1) # set area 0.0.0.0
FGT-1 (1) # next
FGT-1 (network) # edit 2
FGT-1 (2) # set prefix 10.1.1.0 255.255.255.252
FGT-1 (2) # set area 0.0.0.0
FGT-1 (2) # next
FGT-1 (network) # end
FGT-1 (ospf) # end
```

Uwaga: FortiOS używa **zwykłej maski**, a nie maski odwrotnej (wildcard). Trasy z RIP i OSPF trafiają do tablicy routingu, ale ruch użytkowników nadal wymaga polityki zapory.

Weryfikacja: `get router info ospf neighbor`, `get router info routing-table ospf`

---

### VLAN

**Interfejs VLAN na porcie fizycznym (odpowiednik router-on-a-stick):**
```
FGT-1 # config system interface
FGT-1 (interface) # edit vlan10
FGT-1 (vlan10) # set vdom root
FGT-1 (vlan10) # set interface port1                # port fizyczny (trunk)
FGT-1 (vlan10) # set vlanid 10
FGT-1 (vlan10) # set ip 10.1.10.1 255.255.255.0
FGT-1 (vlan10) # set allowaccess ping
FGT-1 (vlan10) # next
FGT-1 (interface) # edit vlan20
FGT-1 (vlan20) # set vdom root
FGT-1 (vlan20) # set interface port1
FGT-1 (vlan20) # set vlanid 20
FGT-1 (vlan20) # set ip 10.1.20.1 255.255.255.0
FGT-1 (vlan20) # set allowaccess ping
FGT-1 (vlan20) # next
FGT-1 (interface) # end
```

Uwaga: ruch między VLAN 10 a VLAN 20 – tak jak między portami fizycznymi – wymaga polityki zapory.

---

### Polityki zapory (odpowiednik list ACL)

**Obiekty adresowe:**
```
FGT-1 # config firewall address
FGT-1 (address) # edit LAN1
FGT-1 (LAN1) # set subnet 10.1.0.0 255.255.255.0
FGT-1 (LAN1) # next
FGT-1 (address) # edit LAN2
FGT-1 (LAN2) # set subnet 10.1.2.0 255.255.255.0
FGT-1 (LAN2) # next
FGT-1 (address) # end
```

**Polityka: blokada ICMP i zezwolenie na HTTP z LAN1 do LAN2:**
```
FGT-1 # config firewall policy
FGT-1 (policy) # edit 1
FGT-1 (1) # set name "LAN1-LAN2-blokada-ICMP"
FGT-1 (1) # set srcintf port1
FGT-1 (1) # set dstintf port2
FGT-1 (1) # set srcaddr LAN1
FGT-1 (1) # set dstaddr LAN2
FGT-1 (1) # set service ALL_ICMP
FGT-1 (1) # set schedule always
FGT-1 (1) # set action deny
FGT-1 (1) # next
FGT-1 (policy) # edit 2
FGT-1 (2) # set name "LAN1-LAN2-HTTP"
FGT-1 (2) # set srcintf port1
FGT-1 (2) # set dstintf port2
FGT-1 (2) # set srcaddr LAN1
FGT-1 (2) # set dstaddr LAN2
FGT-1 (2) # set service HTTP
FGT-1 (2) # set schedule always
FGT-1 (2) # set action accept
FGT-1 (2) # set nat disable
FGT-1 (2) # set logtraffic all
FGT-1 (2) # next
FGT-1 (policy) # end
```

Uwaga: polityki są sprawdzane od góry, a na końcu działa **niejawna polityka „deny” (policy 0)** – tak jak w ACL Cisco. Kolejność zmienia się poleceniem `move 2 before 1` w sekcji `config firewall policy`. Polityki są **stanowe** – odpowiedzi na dozwolony ruch wracają automatycznie. Jedna polityka może obejmować IPv4 i IPv6 (`srcaddr6`, `dstaddr6`) [^policy].

Weryfikacja: `show firewall policy`, liczniki w GUI (*Policy & Objects* → *Firewall Policy*)

---

### Serwer DHCP

```
FGT-1 # config system dhcp server
FGT-1 (server) # edit 1
FGT-1 (1) # set interface port1
FGT-1 (1) # set default-gateway 10.1.0.1
FGT-1 (1) # set netmask 255.255.255.0
FGT-1 (1) # set dns-service specify
FGT-1 (1) # set dns-server1 8.8.8.8
FGT-1 (1) # set lease-time 604800                   # 7 dni w sekundach
FGT-1 (1) # config ip-range
FGT-1 (ip-range) # edit 1
FGT-1 (1) # set start-ip 10.1.0.11
FGT-1 (1) # set end-ip 10.1.0.254
FGT-1 (1) # next
FGT-1 (ip-range) # end
FGT-1 (1) # next
FGT-1 (server) # end
```

Weryfikacja: `execute dhcp lease-list`

---

### Bezpieczeństwo dostępu

**Wyłączenie nieużywanego interfejsu:**
```
FGT-1 # config system interface
FGT-1 (interface) # edit port5
FGT-1 (port5) # set status down                     # odpowiednik "shutdown"
FGT-1 (port5) # unset allowaccess                   # brak usług zarządzania
FGT-1 (port5) # next
FGT-1 (interface) # end
```

**Interfejs od strony Internetu – bez dostępu administracyjnego:**
```
FGT-1 # config system interface
FGT-1 (interface) # edit port2
FGT-1 (port2) # set allowaccess ping                # tylko ping, bez https/ssh
FGT-1 (port2) # next
FGT-1 (interface) # end
```

Uwaga: funkcje bezpieczeństwa warstwy 2 (port security, DHCP snooping) konfiguruje się na przełącznikach **FortiSwitch** zarządzanych z FortiGate, a nie na samym FortiGate. Dostęp do usług samego urządzenia można dodatkowo ograniczyć politykami `config firewall local-in-policy`.

---

### Szybka diagnostyka

```
FGT-1 # execute ping 10.1.1.2                       # sprawdzenie łączności warstwy 3
FGT-1 # execute ping-options source 10.1.0.1        # ping z wybranego adresu źródłowego
FGT-1 # execute ping6 2001:db8:2::10                # ping IPv6
FGT-1 # execute traceroute 10.1.2.10                # sprawdzenie trasy pakietu
FGT-1 # get system interface physical               # który interfejs jest down?
FGT-1 # get router info routing-table details 10.1.2.10     # która trasa obsłuży cel?
FGT-1 # diagnose sniffer packet any 'icmp or arp' 4         # podgląd ICMP i ARP na żywo
```

**Dlaczego ruch nie przechodzi? – śledzenie decyzji zapory:**
```
FGT-1 # diagnose debug flow filter addr 10.1.0.10
FGT-1 # diagnose debug flow show function-name enable
FGT-1 # diagnose debug enable
FGT-1 # diagnose debug flow trace start 10          # śledzi 10 kolejnych pakietów
FGT-1 # diagnose debug disable                      # wyłączenie debugowania
FGT-1 # diagnose debug reset
```

Komunikat *Denied by forward policy check (policy 0)* oznacza, że ruch odrzuciła niejawna polityka „deny” – brakuje polityki zezwalającej. Zatrzymanie `sniffer`: **Ctrl+C**.

[^fortios]: [Fortinet Document Library – FortiGate / FortiOS](https://docs.fortinet.com/product/fortigate), Fortinet, 2026.

[^trial]: [Permanent trial mode for FortiGate-VM](https://docs.fortinet.com/document/fortigate/7.4.6/administration-guide/441460), FortiOS Administration Guide, Fortinet, 2026.

[^policy]: [Technical Tip: Combined IPv4 and IPv6 firewall policies](https://community.fortinet.com/fortigate-3/technical-tip-combined-ipv4-and-ipv6-firewall-policies-97125), Fortinet Community.
