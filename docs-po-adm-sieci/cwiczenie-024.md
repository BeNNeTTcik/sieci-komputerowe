---
sidebar_position: 2.4
title: "Dokumentacja 2.4: Wstęp do pracy z urządzeniami Dell i Cheat Sheet"
---

# Dokumentacja 2.4: Wstęp do pracy z urządzeniami Dell i Cheat Sheet

## I. Wstęp do pracy z urządzeniami Dell
<div className="justify">
Przełączniki **Dell Networking** pracują pod kontrolą jednego z dwóch systemów. Starsze i mniejsze modele (seria **N**, np. N1100, N2200, N3200) mają system **OS6**, którego składnia jest niemal identyczna z Cisco IOS – do nich można stosować ściągę z [Dokumentacji 2.1](/docs-po-adm-sieci/cwiczenie-021.md) z niewielkimi zmianami. Przełączniki centrów danych (seria **S** i **Z**) pracują pod kontrolą **Dell SmartFabric OS10** [^os10], opisanego w tym dokumencie. OS10 ma tryby podobne do Cisco, ale różni się szczegółami: interfejsy nazywają się `ethernet 1/1/1`, maskę zapisuje się jako prefiks (`/24`), a zamiast `running-config` pisze się `running-configuration`. Po zalogowaniu administrator trafia od razu do trybu uprzywilejowanego `OS10#`. W Tabeli 1 przedstawiono tryby systemu OS10.
</div>

Tab.1 Tryby systemu Dell OS10

| Tryb | Znak zachęty | Możliwości |
|---------|---------|---------|
| **EXEC** | `SW-1#` | podgląd stanu (`show …`), `ping`, `traceroute`, zapis konfiguracji |
| **Configuration** | `SW-1(config)#` | zmiany dotyczące całego urządzenia (nazwa, użytkownicy, baner, trasy) |
| **Interface (ethernet)** | `SW-1(conf-if-eth1/1/1)#` | konfiguracja jednego portu (tryb, VLAN, adres, aktywacja) |
| **Interface (VLAN)** | `SW-1(conf-if-vl-10)#` | interfejs warstwy 3 dla VLAN (SVI) |
| **Interface (mgmt)** | `SW-1(conf-if-ma-1/1/1)#` | dedykowany port zarządzania |
| **Line VTY** | `SW-1(config-line-vty)#` | ustawienia połączeń zdalnych (SSH) |
| **Router OSPF** | `SW-1(config-router-ospf-1)#` | konfiguracja protokołu routingu OSPF |

Przejście „w głąb” hierarchii:
- `configure terminal` (EXEC → Configuration).
- `interface ethernet 1/1/1` (Configuration → Interface).

Wyjście „na zewnątrz” o jeden poziom: `exit`, do trybu EXEC: `end` lub `Ctrl+Z`. Polecenie trybu EXEC można wydać z trybu konfiguracji, poprzedzając je słowem `do` (np. `do show vlan`).

Konfiguracja urządzeń Dell OS10 powinna obejmować:
- **zmianę domyślnego hasła** konta `admin` (fabrycznie `admin` / `admin` [^mgmt]) i utworzenie własnego konta z odpowiednią rolą (`sysadmin`, `netadmin`, `secadmin`, `netoperator`);
- **hostname** – nazwa urządzenia widoczna w znaku zachęty;
- **banner** – informacja o zakazie nieuprawnionego dostępu;
- **politykę haseł i blokadę konta** po nieudanych logowaniach;
- **SSH zamiast Telnetu** (w OS10 SSH jest domyślnie włączone, a Telnet wyłączony) i ograniczenie, z jakich adresów wolno się logować;
- konfigurację portu zarządzania, interfejsów, VLAN i routingu oraz pozostałych usług.

Podstawowa konfiguracja zarządzania przełącznikiem udostępniona przez [Dell Technologies](https://www.dell.com/support/kbdoc/en-us/000201924/dell-emc-networking-os10-basic-switch-management-configuration) [^mgmt]. Do ćwiczeń bez sprzętu można użyć obrazu **OS10 Virtual** (do pobrania z serwisu wsparcia Dell po zalogowaniu) w GNS3 lub EVE-NG.

## II. Cheat Sheet

### Podstawowa konfiguracja
```
OS10# configure terminal
OS10(config)# hostname SW-1
SW-1(config)# username student password DellAdmin12345 role sysadmin
SW-1(config)# username admin password NoweHasloAdmin123 role sysadmin       # zmiana hasła domyślnego

SW-1(config)# password-attributes min-length 12
SW-1(config)# password-attributes max-retry 3 lockout-period 15     # blokada konta [^stig]
SW-1(config)# exec-timeout 300                      # wylogowanie po 300 s bezczynności

SW-1(config)# banner motd %
Dostęp wyłącznie dla autoryzowanych użytkowników
%

SW-1(config)# ip ssh server enable                  # SSH (domyślnie włączone)
SW-1(config)# no ip telnet server enable            # Telnet (domyślnie wyłączony)
```

Uwaga: OS10 przechowuje hasła w postaci zaszyfrowanej – nie ma potrzeby odpowiednika `service password-encryption`. Dostęp do konsoli i SSH chronią konta użytkowników, a nie hasła linii.

---

### Konfiguracja interfejsów
**Port zarządzania (dedykowany port mgmt):**
```
SW-1(config)# interface mgmt 1/1/1
SW-1(conf-if-ma-1/1/1)# no ip address dhcp
SW-1(conf-if-ma-1/1/1)# ip address 10.1.0.2/24
SW-1(conf-if-ma-1/1/1)# no shutdown
SW-1(conf-if-ma-1/1/1)# exit
SW-1(config)# management route 0.0.0.0/0 10.1.0.1  # brama dla ruchu zarządzania
```

**Interfejs zarządzania w VLAN (zarządzanie przez zwykłe porty):**
```
SW-1(config)# interface vlan 1
SW-1(conf-if-vl-1)# ip address 10.1.0.2/24
SW-1(conf-if-vl-1)# no shutdown
SW-1(conf-if-vl-1)# exit
SW-1(config)# ip route 0.0.0.0/0 10.1.0.1           # odpowiednik "ip default-gateway"
```

**Port dostępowy przełącznika:**
```
SW-1(config)# interface ethernet 1/1/1
SW-1(conf-if-eth1/1/1)# description xyz
SW-1(conf-if-eth1/1/1)# switchport mode access
SW-1(conf-if-eth1/1/1)# no shutdown
```

**Port routowany (warstwa 3, np. łącze do routera):**
```
SW-1(config)# interface ethernet 1/1/10
SW-1(conf-if-eth1/1/10)# no switchport
SW-1(conf-if-eth1/1/10)# ip address 10.1.1.1/30
SW-1(conf-if-eth1/1/10)# ipv6 address 2001:db8:12::1/64
SW-1(conf-if-eth1/1/10)# no shutdown
```

---

### Zapisywanie i przywracanie konfiguracji

```
SW-1# write memory                                  # zapis konfiguracji na stałe (przetrwa restart)
SW-1# copy running-configuration startup-configuration      # pełna forma powyższego
SW-1# show running-configuration                    # aktywna konfiguracja
SW-1# show startup-configuration                    # konfiguracja zapisana (wczytywana przy starcie)
SW-1# copy running-configuration tftp://10.1.0.100/SW-1.cfg   # kopia na serwer TFTP
SW-1# delete startup-configuration                  # kasowanie zapisanej konfiguracji
SW-1# reload                                        # restart urządzenia
```

Uwaga: dokładną składnię kopiowania na serwer zewnętrzny (TFTP, SCP, FTP) sprawdź w przewodniku konfiguracji swojej wersji OS10.

---

### Polecenia weryfikacyjne

```
SW-1# show ip interface brief                       # status i adresy IP interfejsów
SW-1# show interface ethernet 1/1/1                 # szczegóły interfejsu (błędy, statystyki, prędkość)
SW-1# show interface status                         # stan wszystkich portów w skrócie
SW-1# show ip route                                 # tablica routingu
SW-1# show version                                  # wersja OS10, model, czas pracy
SW-1# show lldp neighbors                           # sąsiednie urządzenia (LLDP zamiast CDP)
SW-1# show mac address-table                        # tablica adresów MAC
SW-1# show vlan                                     # lista VLAN-ów i przypisane porty
SW-1# show ip arp                                   # tablica ARP
SW-1# show ipv6 neighbors                           # tablica sąsiadów IPv6
SW-1# show users                                    # zalogowani użytkownicy
```

---

### Routing statyczny

```
SW-1(config)# ip route 10.1.2.0/24 10.1.1.2
#                      ^sieć/prefiks ^adres next-hop

SW-1(config)# ip route 0.0.0.0/0 10.1.1.2
#             ^trasa domyślna (brama ostatniej szansy)

SW-1(config)# ipv6 route 2001:db8:2::/64 2001:db8:12::2
```

Weryfikacja: `show ip route static`

---

### Routing dynamiczny — RIP

OS10 nie obsługuje protokołu RIP – w sieciach z przełącznikami Dell OS10 stosuje się OSPF lub BGP. RIP jest dostępny w systemie OS6 (seria N), ze składnią zbliżoną do Cisco.

---

### Routing dynamiczny — OSPF

```
SW-1(config)# router ospf 1
SW-1(config-router-ospf-1)# router-id 1.1.1.1
SW-1(config-router-ospf-1)# exit

SW-1(config)# interface vlan 10
SW-1(conf-if-vl-10)# ip ospf 1 area 0.0.0.0
SW-1(conf-if-vl-10)# exit

SW-1(config)# interface ethernet 1/1/10
SW-1(conf-if-eth1/1/10)# ip ospf 1 area 0.0.0.0
```

Uwaga: w OS10 OSPF włącza się **na interfejsach** (`ip ospf … area …`), a nie poleceniem `network` z maską odwrotną.

Weryfikacja: `show ip ospf neighbor`, `show ip route ospf`

---

### VLAN i trunking

**Tworzenie VLAN i przypisanie portu:**
```
SW-1(config)# interface vlan 10
SW-1(conf-if-vl-10)# description Studenci
SW-1(conf-if-vl-10)# exit
SW-1(config)# interface ethernet 1/1/1
SW-1(conf-if-eth1/1/1)# switchport mode access
SW-1(conf-if-eth1/1/1)# switchport access vlan 10
```

Uwaga: w OS10 VLAN tworzy się poleceniem `interface vlan 10` – nie ma osobnego trybu `vlan 10` jak w Cisco.

**Port trunk (przenosi wiele VLAN-ów):**
```
SW-1(config)# interface ethernet 1/1/24
SW-1(conf-if-eth1/1/24)# switchport mode trunk
SW-1(conf-if-eth1/1/24)# switchport trunk allowed vlan 10,20
```

**Routing między VLAN-ami na przełączniku warstwy 3 (zamiast router-on-a-stick):**
```
SW-1(config)# interface vlan 10
SW-1(conf-if-vl-10)# ip address 10.1.10.1/24
SW-1(conf-if-vl-10)# no shutdown

SW-1(config)# interface vlan 20
SW-1(conf-if-vl-20)# ip address 10.1.20.1/24
SW-1(conf-if-vl-20)# no shutdown
```

---

### Listy ACL

**Blokada jednego hosta (odpowiednik ACL standardowej):**
```
SW-1(config)# ip access-list BLOKADA-HOSTA
SW-1(config-ipv4-acl)# seq 10 deny ip host 10.1.0.10 any
SW-1(config-ipv4-acl)# seq 20 permit ip any any
```

**Rozszerzona (adres źródłowy, docelowy, protokół, port):**
```
SW-1(config)# ip access-list LAN1-LAN2
SW-1(config-ipv4-acl)# seq 10 deny icmp 10.1.0.0/24 10.1.2.0/24
SW-1(config-ipv4-acl)# seq 20 permit tcp 10.1.0.0/24 10.1.2.0/24 eq 80
SW-1(config-ipv4-acl)# seq 30 permit ip any any
```

**Zastosowanie na interfejsie:**
```
SW-1(config)# interface ethernet 1/1/10
SW-1(conf-if-eth1/1/10)# ip access-group LAN1-LAN2 in
```

**Ograniczenie logowania zdalnego do sieci administratora:**
```
SW-1(config)# ip access-list ADMIN
SW-1(config-ipv4-acl)# seq 10 permit ip 10.1.0.0/24 any
SW-1(config-ipv4-acl)# exit
SW-1(config)# line vty
SW-1(config-line-vty)# ip access-class ADMIN
```

Uwaga: OS10 używa **prefiksów** (`10.1.0.0/24`) zamiast masek odwrotnych. Listy są nazwane, a reguły numerowane (`seq`), na końcu działa niejawne „deny”.

Weryfikacja: `show ip access-lists`

---

### Serwer DHCP na przełączniku

```
SW-1(config)# ip dhcp server
SW-1(config-dhcp)# no disable
SW-1(config-dhcp)# pool LAN-PULA
SW-1(config-dhcp-LAN-PULA)# network 10.1.0.0/24
SW-1(config-dhcp-LAN-PULA)# default-router 10.1.0.1
SW-1(config-dhcp-LAN-PULA)# dns-server 8.8.8.8
SW-1(config-dhcp-LAN-PULA)# lease 7
```

**Przekaźnik DHCP (serwer w innej sieci):**
```
SW-1(config)# interface vlan 10
SW-1(conf-if-vl-10)# ip helper-address 10.1.2.100
```

Uwaga: składnia serwera DHCP i wykluczania adresów różni się między wersjami OS10 – sprawdź ją w przewodniku konfiguracji swojej wersji.

Weryfikacja: `show ip dhcp binding`

---

### Bezpieczeństwo warstwy 2

**Porty dla komputerów (szybki start portu, ochrona przed podłączeniem przełącznika):**
```
SW-1(config)# interface range ethernet 1/1/1-1/1/20
SW-1(conf-range-eth1/1/1-1/1/20)# spanning-tree port type edge
SW-1(conf-range-eth1/1/1-1/1/20)# spanning-tree bpduguard enable
```

**DHCP snooping (ochrona przed nieautoryzowanym serwerem DHCP):**
```
SW-1(config)# ip dhcp snooping
SW-1(config)# interface ethernet 1/1/24
SW-1(conf-if-eth1/1/24)# ip dhcp snooping trust
```

**Wyłączenie nieużywanych portów:**
```
SW-1(config)# interface range ethernet 1/1/21-1/1/23
SW-1(conf-range-eth1/1/21-1/1/23)# shutdown
```

Uwaga: dostępność funkcji ograniczania adresów MAC na porcie (odpowiednik `port-security` z Cisco) zależy od modelu i wersji OS10 – sprawdź ją w dokumentacji.

---

### Szybka diagnostyka

```
SW-1# ping 10.1.1.2                                 # sprawdzenie łączności warstwy 3
SW-1# traceroute 10.1.2.10                          # sprawdzenie trasy pakietu
SW-1# show ip interface brief                       # który interfejs jest down?
SW-1# show running-configuration interface ethernet 1/1/10   # konfiguracja jednego interfejsu
SW-1# show ip route                                 # czy jest trasa do celu?
SW-1# show ip access-lists                          # czy ACL nie blokuje ruchu?
SW-1# show logging log-file                         # dziennik zdarzeń
```

[^os10]: [Dell SmartFabric OS10 – dokumentacja](https://www.dell.com/support), Dell Technologies, 2026.

[^mgmt]: [Dell Networking OS10: Basic Switch Management Configuration](https://www.dell.com/support/kbdoc/en-us/000201924/dell-emc-networking-os10-basic-switch-management-configuration), Dell Technologies.

[^stig]: [Dell OS10 Switch NDM STIG – V-269771](https://www.stigviewer.com/stigs/dell_os10_switch_ndm/2024-12-11/finding/V-269771), DISA, 2024.
