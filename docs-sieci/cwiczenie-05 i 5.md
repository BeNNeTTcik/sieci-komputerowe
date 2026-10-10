---
sidebar_position: 5.5
title: "Ćwiczenie 5.5: Wstep do pracy z urządzeniami i Cheat Sheet"
---

# Ćwiczenie 5.5: Wstęp do pracy z urządzeniami i Cheat Sheet

## I. Wstęp do pracy z urządzeniami Cisco
<div className="justify">
Podczas zajęcć praktycznych głównym zadaniem bedzię praca na urządzeniach sieciowych. Zrozumienie działania pewnych mechanizmów w praktyce. Tworzeniu mały sieci komputerowych na sprzęcie klasy biznesowej.

Wszystkie urządzenia posiadaja swoj dedykowany system do obsługi, nie inaczej jest w przypadku urządzeń sieciowych. Pracujac na urządzeniach firmy **Cisco** do dyspozycji mam **Cisco IOS (Internetwork Operating System)**, który obslugiwany jest przez wiersz poleceń (**CLI**). Wiersz jest zorganizowany ierarchicznie co oznacza, że każdy tryb udsotepnia inny zestaw poleceń i zasieg wprowadzania zamin. W Tabeli 1 przedstawiono wszytskie tryby wstepujace w systemie Cisco IOS.
</div>

| Tryb | Znak zachęty | Możliwości |
|---------|---------|---------|
| **User EXEC** | ```Router>``` | tylko podstawowe polecenia diagnostyczne (np. ```ping```), zerowe możliwości zmian konfiguracji |
| **Privileged EXEC** | ```Router#``` | pełny podgląd stanu urządzenia (```show ...```), zapis konfiguracji do pamieci ROM |
| **Global Configuration** | ```Router(config)#``` | zmiany dotyczące całego urządzenia (nazwa hosta, hasła, baner) |
| **Interface Configuration** | ```Router(config-if)#``` | zmiany dotyczące jednego, konkretnego aktywnego interfejsu (adres IP, aktywacja) |
| **Line Config** | `Router(config-line)#` | zmiany portu konsoli/VTY |
| **Router Config** | `Router(config-router)#` | konfiguracja protokołu routingu (RIP/OSPF) |

Przejście "w głąb" hierarchii: 
- ```enable``` (User EXEC → Privileged EXEC).
- ```configure terminal``` (Privileged EXEC → Global Config)
- ```interface <nazwa>``` (Global Config → Interface Config). 

Wyjście "na zewnątrz" o jeden poziom: ```exit``` lub ```Ctrl+z```.

Konfiguracja urządzeń sieciowych w tym Cisco powinna obejmować:
- ustawienie haseł dostępowych do (port konsolowy, połączeń zdalnych i trybów pracy).
- hostname - nie trzeba, ale jest to ułatwienie w rozpoznaniu urządzenia w sieci.
- banner - informacji wyświetlanej podczas próby zalogowania na urządzenie, mająca na celu odstrasznie atakującego w myśl **"to co nie jest zabronione, jest dozwolone"**, a próby wejścia/ataku mogą nieść konsekwencje prawne.
- konfiguracja interfejsów urządzenia.
- inne usługi zabezpieczające (np. port security) lub zwiększające funkcjonalność urządzenia (np. DHCP).

Podstawowa konfiguracja router-a udostępniona przez [Cisco Router](https://www.cisco.com/c/en/us/td/docs/routers/access/800M/software/800MSCG/routconf.html)

Podstawowa konfiguracja switch-a udostępniona przez [Cisco Switch](https://www.cisco.com/c/en/us/td/docs/routers/access/800M/software/800MSCG/vlanconf.html)

## II. Cheat Sheet

[Cheat Sheet](/files/cheatsheet.pdf)

Ściągawka z najważniejszymi poleceniami używanymi w ćwiczeniach 6–15. Polecenia routera i switcha są w większości identyczne (oba działają na Cisco IOS).

### Podstawowa konfiguracja
```
Router(config)# hostname R1-1
R1-1(config)# enable secret CiscoEnable123

R1-1(config)# line console 0
R1-1(config-line)# password CiscoConsole123
R1-1(config-line)# login
R1-1(config-line)# exit

R1-1(config)# line vty 0 4
R1-1(config-line)# password CiscoVty123
R1-1(config-line)# login
R1-1(config-line)# exit

R1-1(config)# banner motd # Dostęp wyłącznie dla autoryzowanych użytkowników #

R1-1(config)# service password-encryption
```

---

### Konfiguracja interfejsów
**Router:**
```
R1-1(config)# interface gigabitEthernet 0/0
R1-1(config-if)# ip address 10.1.0.1 255.255.255.0
R1-1(config-if)# description xyz
R1-1(config-if)# no shutdown
```

**Przełącznik (interfejs zarządzania VLAN 1):**
```
SW-1(config)# interface vlan 1
SW-1(config-if)# ip address 10.1.0.2 255.255.255.0
SW-1(config-if)# no shutdown
SW-1(config)# ip default-gateway 10.1.0.1
```

**Port dostępowy przełącznika:**
```
SW-1(config)# interface fastEthernet 0/1
SW-1(config-if)# switchport mode access
```


---

### Zapisywanie i przywracanie konfiguracji

```
R1-1# copy running-config startup-config    # zapis konfiguracji na stałe (przetrwa restart)
R1-1# write memory                          # skrót do powyższego
R1-1# show running-config                   # aktywna konfiguracja (w pamięci RAM)
R1-1# show startup-config                   # konfiguracja zapisana (wczytywana przy starcie)
R1-1# erase startup-config                  # kasowanie zapisanej konfiguracji
R1-1# reload                                # restart urządzenia
```

---

### Polecenia weryfikacyjne

```
R1-1# show ip interface brief     # status i adresy IP wszystkich interfejsów
R1-1# show interfaces gi0/0       # szczegóły interfejsu (błędy, statystyki, duplex)
R1-1# show ip route               # tablica routingu
R1-1# show version                # wersja IOS, model urządzenia, czas pracy
R1-1# show cdp neighbors          # sąsiednie urządzenia Cisco widoczne w sieci

SW-1# show mac address-table      # tablica adresów MAC (CAM table)
SW-1# show vlan brief             # lista VLAN-ów i przypisane porty
SW-1# show interfaces trunk       # porty skonfigurowane jako trunk
```

---

### Routing statyczny

```
R1-1(config)# ip route 10.1.2.0 255.255.255.0 10.1.1.2
#                     ^sieć docelowa  ^maska         ^adres next-hop

R1-1(config)# ip route 0.0.0.0 0.0.0.0 10.1.1.2
#             ^trasa domyślna (brama ostatniej szansy)
```

Weryfikacja: `show ip route static`

---

### Routing dynamiczny — RIP

```
R1-1(config)# router rip
R1-1(config-router)# version 2
R1-1(config-router)# no auto-summary
R1-1(config-router)# network 10.1.0.0
R1-1(config-router)# network 10.1.1.0
```

Weryfikacja: `show ip route rip`, `show ip protocols`

---

### Routing dynamiczny — OSPF

```
R1-1(config)# router ospf 1
R1-1(config-router)# network 10.1.0.0 0.0.0.255 area 0
R1-1(config-router)# network 10.1.1.0 0.0.0.3 area 0
```

Uwaga: OSPF używa **maski odwrotnej (wildcard mask)**, nie zwykłej maski podsieci — `0.0.0.255` odpowiada masce `255.255.255.0`.

Weryfikacja: `show ip ospf neighbor`, `show ip route ospf`

---

### VLAN i trunking

**Tworzenie VLAN i przypisanie portu:**
```
SW-1(config)# vlan 10
SW-1(config-vlan)# name Studenci
SW-1(config-vlan)# exit
SW-1(config)# interface fastEthernet 0/1
SW-1(config-if)# switchport mode access
SW-1(config-if)# switchport access vlan 10
```

**Port trunk (przenosi wiele VLAN-ów, np. do routera):**
```
SW-1(config)# interface fastEthernet 0/24
SW-1(config-if)# switchport mode trunk
SW-1(config-if)# switchport trunk allowed vlan 10,20
```

**Router-on-a-stick — subinterfejsy routera:**
```
R1-1(config)# interface gi0/0.10
R1-1(config-subif)# encapsulation dot1Q 10
R1-1(config-subif)# ip address 10.1.10.1 255.255.255.0

R1-1(config)# interface gi0/0.20
R1-1(config-subif)# encapsulation dot1Q 20
R1-1(config-subif)# ip address 10.1.20.1 255.255.255.0
```

---

### Listy ACL

**Standardowa (filtruje tylko po adresie źródłowym):**
```
R1-1(config)# access-list 10 deny host 10.1.0.10
R1-1(config)# access-list 10 permit any
```

**Rozszerzona (adres źródłowy, docelowy, protokół, port):**
```
R1-1(config)# access-list 110 deny icmp 10.1.0.0 0.0.0.255 10.1.2.0 0.0.0.255
R1-1(config)# access-list 110 permit tcp 10.1.0.0 0.0.0.255 10.1.2.0 0.0.0.255 eq 80
R1-1(config)# access-list 110 permit ip any any
```

**Zastosowanie na interfejsie:**
```
R1-1(config)# interface gi0/1
R1-1(config-if)# ip access-group 110 in
```

Weryfikacja: `show access-lists`

---

### Serwer DHCP na routerze

```
R1-1(config)# ip dhcp excluded-address 10.1.0.1 10.1.0.10
R1-1(config)# ip dhcp pool LAN-PULA
R1-1(dhcp-config)# network 10.1.0.0 255.255.255.0
R1-1(dhcp-config)# default-router 10.1.0.1
R1-1(dhcp-config)# dns-server 8.8.8.8
R1-1(dhcp-config)# lease 7
```

Weryfikacja: `show ip dhcp binding`

---

### Bezpieczeństwo warstwy 2

**Port security (ograniczenie liczby adresów MAC na porcie):**
```
SW-1(config)# interface fastEthernet 0/1
SW-1(config-if)# switchport mode access
SW-1(config-if)# switchport port-security
SW-1(config-if)# switchport port-security maximum 2
SW-1(config-if)# switchport port-security violation shutdown
```

**DHCP snooping (ochrona przed nieautoryzowanym serwerem DHCP):**
```
SW-1(config)# ip dhcp snooping
SW-1(config)# ip dhcp snooping vlan 10
SW-1(config)# interface fastEthernet 0/24
SW-1(config-if)# ip dhcp snooping trust
```

---

### Szybka diagnostyka

```
R1-1# ping 10.1.1.2                    # sprawdzenie łączności warstwy 3
R1-1# traceroute 10.1.2.10              # sprawdzenie trasy pakietu
R1-1# show ip interface brief           # który interfejs jest down?
R1-1# show running-config interface gi0/0   # konfiguracja jednego, konkretnego interfejsu
R1-1# show ip route                     # czy jest trasa do celu?
R1-1# show access-lists                 # czy ACL nie blokuje ruchu (licznik "matches")?
R1-1# debug ip icmp                     # podgląd komunikatów ICMP na żywo (użyj ostrożnie, dużo logów)
R1-1# undebug all                       # wyłączenie wszystkich aktywnych debugów
```