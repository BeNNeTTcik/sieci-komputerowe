---
sidebar_position: 7
title: "Ćwiczenie 7: Projektowanie adresacji IP i podział na podsieci"
---

<!--- import bibliotek -->
import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';

# Ćwiczenie 7: Projektowanie adresacji IP i podział na podsieci

*Część II — Zajęcia praktyczne*

## I. Wprowadzenie

Zaprojektowanie spójnego planu **adresacji IP** dla sieci pary z wykorzystaniem **VLSM**, a następnie wdrożenie go na wszystkich urządzeniach.

<TopologyBuilder title="Topologia pary — Ćwiczenie 6" storageKey="cwiczenie-6" />

<!-- 💡 Tu możesz wstawić diagram, np.: ![Diagram](/img/cwiczenie-07-diagram.svg) -->

## II. Zadania do wykonania

1. Zaprojektować min. 3 podsieci na bazie puli 10.X.0.0/24.
2. Wdrożyć adresację na interfejsach i hostach.
3. Uzupełnić dokumentację adresacji (tabela).
4. Zweryfikować łączność (ping).

## III. Podsumowanie

Poprawnie zaprojektowana i wdrożona hierarchiczna adresacja IP.
<StepByStep>
<Step title="Połączenie urządzeń zgodnie ze schematem">
Podłącz kable zgodnie z rozszerzoną topologią pary:



- **PC-A, PC-B → SW-X**: porty dostępowe przełącznika (np. FastEthernet 0/1, 0/2).
- **SW-X → R1-X**: port przełącznika (np. FastEthernet 0/24) → interfejs LAN routera R1-X.
- **R1-X → R2-X**: osobny interfejs na obu routerach — wewnętrzne łącze pary.
- **R2-X → PC-C**: dodatkowy komputer podłączony bezpośrednio do drugiego interfejsu R2-X — symuluje "sieć zdalną" po drugiej stronie routingu, bez konieczności czekania na koordynację z sąsiednią parą (to przyjdzie dopiero w Ćwiczeniu 9).

</Step>

<Step title="Nazwy hostów, hasła dostępu i baner">

Na **R1-X**:

```
Router> enable
Router# configure terminal
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
R1-1(config)# banner motd # Dostęp wyłącznie dla autoryzowanych użytkowników — Para 1 #
```

Powtórz analogicznie na **R2-X** (`hostname R2-1` itd.).

**Dlaczego dwa różne hasła (`console` i `vty`)?** `line console 0` zabezpiecza dostęp fizyczny (kabel konsolowy podłączony bezpośrednio do urządzenia), a `line vty 0 4` zabezpiecza dostęp zdalny (Telnet/SSH) — to dwie zupełnie różne drogi wejścia do urządzenia, więc mają osobne hasła.

</Step>

<Step title="Konfiguracja interfejsów routerów">

Na **R1-1**:

```
R1-1(config)# interface GigabitEthernet0/0
R1-1(config-if)# ip address 10.1.0.1 255.255.255.0
R1-1(config-if)# no shutdown
R1-1(config-if)# exit
R1-1(config)# interface GigabitEthernet0/1
R1-1(config-if)# ip address 10.1.1.1 255.255.255.252
R1-1(config-if)# no shutdown
R1-1(config-if)# exit
```

Na **R2-1** — interfejs do R1-1 oraz nowy interfejs do PC-C:

```
R2-1(config)# interface GigabitEthernet0/0
R2-1(config-if)# ip address 10.1.1.2 255.255.255.252
R2-1(config-if)# no shutdown
R2-1(config-if)# exit
R2-1(config)# interface GigabitEthernet0/1
R2-1(config-if)# ip address 10.1.2.1 255.255.255.0
R2-1(config-if)# no shutdown
R2-1(config-if)# exit
```

**Dlaczego `no shutdown` w ogóle jest potrzebne?** Domyślnie wszystkie interfejsy fizyczne routerów Cisco są **administracyjnie wyłączone** — nawet perfekcyjnie skonfigurowany adres IP nie zadziała, dopóki interfejs nie zostanie jawnie aktywowany tym poleceniem.

</Step>

<Step title="Podstawowa konfiguracja przełącznika">

Na **SW-X**:

```
Switch(config)# hostname SW-1
SW-1(config)# interface vlan 1
SW-1(config-if)# ip address 10.1.0.2 255.255.255.0
SW-1(config-if)# no shutdown
SW-1(config-if)# exit
SW-1(config)# ip default-gateway 10.1.0.1
```

</Step>

<Step title="Weryfikacja konfiguracji">

Na każdym routerze:

```
R1-1# show ip interface brief
```

Sprawdź, że interesujące Cię interfejsy mają status `up / up`.

Testy łączności:

```
R1-1# ping 10.1.1.2
```
(R1-1 → R2-1, sprawdza łącze między routerami)

```
R2-1# ping 10.1.2.10
```
(R2-1 → PC-C, po ustawieniu na PC-C statycznego adresu np. `10.1.2.10 /24`, brama `10.1.2.1`)

Na PC-A/PC-B (adresacja `10.1.0.0/24`, brama `10.1.0.1`):

```
ping 10.1.0.1
```

Jeśli wszystkie testy kończą się sukcesem — para ma w pełni działającą, dwusegmentową sieć gotową do dalszych ćwiczeń (adresacja szczegółowa w Ćwiczeniu 7, routing statyczny w Ćwiczeniu 8).

</Step>

</StepByStep>