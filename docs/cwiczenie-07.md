---
sidebar_position: 7
title: "Ćwiczenie 7: VLAN, trunking i routing między VLAN-ami"
---

<!--- import bibliotek -->
import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import EditableTable from '@site/src/components/EditableTable';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';

# Ćwiczenie 7: VLAN, trunking i routing między VLAN-ami

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 7: VLAN, trunking i routing między VLAN-ami"
  storageKey="cwiczenie-7"
/>

## I. Wprowadzenie

<div className="justify">
**VLAN (Virtual Local Area Network)** pozwala logicznie podzielić jedną fizyczną sieć lokalną na wiele wirtulanych sieci lokalnych (maksymalnie 4094). Hosty podłączone do przełącznika komunikują sie ze sobą tak jakby tylko one były podłączone do przełącznika. Każda grupa tworząca VLAN posiada swoją domenę rozgłoszeniową, co oznacza że dane rozgłoszenie trafia tylko do portów z danej grupy [^kurose]. Dwa komputery podłączone do tego samego przełącznika, ale przypisane do różnych VLAN-ów, są dla siebie nawzajem niewidoczne, jakby zostały podłączone do dwóch róznych urządzeń, a w rzeczywsitości dzielą ten sam jeden kabel i jeden port przełącznika.

Każdy z portów może działać w jednym z dwóch trybów pracy (niektórzy producenci udostępniają trzeci tryb - *port general*):
</div>
- **port access (UNTAG)** — należy do jednego, konkretnego VLAN-u; podłącza się do niego urządzenia końcowe np. PC, serwer, drukarka. Urządzenia te nie wiedzą, że VLAN-y w ogóle istnieją.
- **port trunk (TAG)** — przenosi ruch wielu VLAN-ów jednocześnie przez jeden fizyczny kabel; używany w relacji przełącznik -> przełącznik lub przełącznik -> router.

<div className="justify">
**Jak przełącznik rozróżnia, do którego VLAN-u należy dana ramka na trunku?** Dzięki standardowi IEEE 802.1Q [^802.1Q], który wstawia do ramki Ethernet dodatkowy, 4-bajtowy znacznik (tag) zawierający numer VLAN-u (Rysunek 1). Porty access nie wiedzą nic o VLAN-ach, dodawanie znacznika odbywa się tylko na porcie trunk:
</div>

![Rys1](/img/7/802_1q.png)
<div className="text-center">
Rys.4 Żądanie - Odpowiedź [^claude]
</div>

## II. Zadania do wykonania

### Konfiguracja port access - UNTAG

<StepByStep>
<Step title="Podłączenie do przełącznika">
XXXXXXXXXXXXXXXXXXXXXXX

Ustawienie adresacji ta sama siec na wszystkich komputerach!
</Step>

<Step title="Konfiguracja dwóch VLAN-ów na przełączniku (po 2 porty każdy)">

Na **SW-X** utwórz dwa VLAN-y i przypisz do każdego po dwa porty:

```
# Etap tworzenie VLAN-ów

Switch(config)# vlan 10
Switch(config-vlan)# name Studenci
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Pracownicy
Switch(config-vlan)# exit

# Etap przypisanie portów do VLAN-u

Switch(config)# interface range fastEthernet 0/1 - 2
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 10
Switch(config-if-range)# exit

Switch(config)# interface range fastEthernet 0/3 - 4
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 20
Switch(config-if-range)# exit
```

Zweryfikuj przypisanie: `show vlan brief`.

<ScreenshotPaste label="Zrzut ekranu: polecenie show vlan brief" />

</Step>
<Step title="Eksperyment: przepinanie kabli i sprawdzanie łączności pingiem">

Sprawdźenie **na żywo**, jak VLAN-y izolują ruch, mimo że wszystkie 4 porty są na tym samym przełączniku i w tej samej podsieci IP. Wykonaj kolejno pingi między parami portów, przepinając kabel/zmieniając, z którego hosta wysyłasz ping, i zapisz wynik w tabeli:

<EditableTable
  title="Wyniki testu izolacji VLAN"
  storageKey="cwiczenie-12-izolacja"
  columns={[
    {key: 'zrodlo', label: 'Port źródłowy', readOnly: true},
    {key: 'cel', label: 'Port docelowy', readOnly: true},
    {key: 'wynik', label: 'Ping działa? (tak/nie)'},
    {key: 'wyjasnienie', label: 'Dlaczego?'},
  ]}
  initialRows={[
    {zrodlo: 'Fa0/1 (VLAN 10)', cel: 'Fa0/2 (VLAN 10)'},
    {zrodlo: 'Fa0/3 (VLAN 20)', cel: 'Fa0/4 (VLAN 20)'},
    {zrodlo: 'Fa0/1 (VLAN 10)', cel: 'Fa0/3 (VLAN 20)'},
    {zrodlo: 'Fa0/2 (VLAN 10)', cel: 'Fa0/4 (VLAN 20)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

**Zanim przejdziesz dalej, możesz zaobserwować:** Mimo identycznej podsieci IP na wszystkich portach. To dochodzi do izolacji **na warstwie 2** dzięki wykorzystaniu VLAN, zanim adresacja IP w ogóle wejdzie do grę.

</Step>
</StepByStep>

### Konfiguracja routingu wewnatrz przełącznika - SVI

<div className="justify">
**SVI (Switched Virtual Interface)** to logiczny interfejs warstwy 3 przypisany do konkretnego VLAN-u na przełączniku — nie odpowiada żadnemu fizycznemu portowi, tylko całej grupie portów należących do danego VLAN-u [^SVI]. Głównym zadaniem będzie w zadaniu będzie routing między VLAN-ami. Każdy VLAN dostaje swój **SVI**, a po włączeniu ```ip routing``` switch sam przekazuje ruch między nimi.

Dla przełączników **nie pracujących w wartswie 3** (tam gdzie ROUTER), jedynym rozwiązaniem jest wykorzystanie mechanizmu  **Router-on-a-stick**, aby zapewnić ruch między VLAN-ami. Jednak jak sama nazwa wskazuje wymaga on dodatkowego urządzenia - routera, aby zapewnić komunikację.
</div>
<StepByStep>
<Step title="Podłączenie do przełącznika">
XXXXXXXXXXXXXXXXXXXXXXX

Ustawienie adresacji ta sama siec na wszystkich komputerach!
</Step>

<Step title="Konfiguracja przełącznika">
Na **SW-X** utwórz SVi dla dwóch VLAN-ów:

```
# Nadanie adresacji VLAN 10

Switch(config)# interface vlan 10
Switch(config-if)# ip address 10.1.10.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

# Nadanie adresacji VLAN 20

Switch(config)# interface vlan 20
Switch(config-if)# ip address 10.1.20.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

# Główna komenda bez której cały mechanizm nie zadziała
Switch(config)# ip routing
```

<ScreenshotPaste label="Zrzut ekranu: konfiguracja SVI" />
</Step>

<Step title="Weryfikacja izolacji i routingu między VLAN-owego - I">
Weryfikacja **po** skonfigurowaniu subinterfejsów:

```
show ip route
```

W wyniku ```show ip route``` powinieneś zobaczyć obie sieci jako bezpośrednio podłączone.

<ScreenshotPaste label="Zrzut ekranu: weryfikacja wykonanego routingu" />
</Step>

<Step title="Weryfikacja izolacji i routingu między VLAN-owego - II">
Sprawdzenie jak działa routing pomimo różncyh VLAN-ów. Wykonaj kolejno pingi między parami portów, przepinając kabel/zmieniając, z którego hosta wysyłasz ping, i zapisz wynik w tabeli:

<EditableTable
  title="Wyniki testu izolacji VLAN"
  storageKey="cwiczenie-12-izolacja"
  columns={[
    {key: 'zrodlo', label: 'Port źródłowy', readOnly: true},
    {key: 'cel', label: 'Port docelowy', readOnly: true},
    {key: 'wynik', label: 'Ping działa? (tak/nie)'},
    {key: 'wyjasnienie', label: 'Dlaczego?'},
  ]}
  initialRows={[
    {zrodlo: 'Fa0/1 (VLAN 10)', cel: 'Fa0/2 (VLAN 10)'},
    {zrodlo: 'Fa0/3 (VLAN 20)', cel: 'Fa0/4 (VLAN 20)'},
    {zrodlo: 'Fa0/1 (VLAN 10)', cel: 'Fa0/3 (VLAN 20)'},
    {zrodlo: 'Fa0/2 (VLAN 10)', cel: 'Fa0/4 (VLAN 20)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

</Step>
</StepByStep>

### Port security

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006. 

[^802.1Q]: IEEE Std 802.1Q-2018, IEEE Standard for Local and Metropolitan Area Networks — Bridges and Bridged Networks, Institute of Electrical and Electronics Engineers.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^SVI]: Cisco Networking Academy, materiały kursu CCNA: Switching, Routing, and Wireless Essentials, Cisco Systems, Inc., netacad.com.