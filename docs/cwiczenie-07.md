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
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 7: VLAN, trunking i routing między VLAN-ami

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  thema="Sieci komputerowe"
  exerciseTitle="Ćwiczenie 7: VLAN, trunking i routing między VLAN-ami"
  storageKey="cwiczenie-7"
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-7"
  storageKeys={['cwiczenie-7','cwiczenie-7-top', 'cwiczenie-7-top2', 'cwiczenie-7-izolacja', 'cwiczenie-7-izolacja2']}
  sharedPrefix="cw7_"
/>

## I. Wprowadzenie

<div className="justify">
**VLAN (Virtual Local Area Network)** pozwala logicznie podzielić jedną fizyczną sieć lokalną na wiele wirtualnych sieci lokalnych (maksymalnie 4094). Hosty podłączone do przełącznika komunikują się ze sobą tak, jakby tylko one były podłączone do przełącznika. Każda grupa tworząca VLAN ma własną domenę rozgłoszeniową, co oznacza, że dane rozgłoszenie trafia tylko do portów z danej grupy [^kurose]. Dwa komputery podłączone do tego samego przełącznika, ale przypisane do różnych VLAN-ów, są dla siebie nawzajem niewidoczne, jakby zostały podłączone do dwóch różnych urządzeń, choć w rzeczywistości korzystają z tego samego przełącznika.

Każdy z portów może działać w jednym z dwóch trybów pracy (niektórzy producenci udostępniają trzeci tryb – *port general*):
</div>

- **port access (UNTAG)** — należy do jednego, konkretnego VLAN-u; podłącza się do niego urządzenia końcowe, np. PC, serwer, drukarkę. Urządzenia te nie wiedzą, że VLAN-y w ogóle istnieją.
- **port trunk (TAG)** — przenosi ruch wielu VLAN-ów jednocześnie przez jeden fizyczny kabel; używany w relacji przełącznik → przełącznik lub przełącznik → router.

<div className="justify">
**Jak przełącznik rozróżnia, do którego VLAN-u należy dana ramka na trunku?** Dzięki standardowi IEEE 802.1Q [^802.1Q], który wstawia do ramki Ethernet dodatkowy, 4-bajtowy znacznik (tag) zawierający numer VLAN-u (Rysunek 1). Urządzenia końcowe nigdy nie widzą tego znacznika — przełącznik dodaje go tylko na porcie trunk i usuwa przed wysłaniem ramki przez port access.
</div>

![Rys1](/img/7/802_1q.png)
<div className="text-center">
Rys. 1 Ramka Ethernet ze znacznikiem IEEE 802.1Q [^claude]
</div>

## II. Zadania do wykonania

:::info Sprzęt
Całe ćwiczenie wykonaj na **przełączniku warstwy 3** (w Packet Tracerze: **Cisco 3560-24PS**). Część z portami access zadziała także na 2960, ale część z SVI — nie: przełącznik 2960 nie obsługuje polecenia `ip routing`, więc nie przekaże ruchu między VLAN-ami.
:::

### Konfiguracja port access - UNTAG

<StepByStep>
<Step title="Podłączenie do przełącznika">
<TopologyBuilder
  title="Topologia"
  storageKey="cwiczenie-7-top"
  topology={{
    vlan: { show: false, defaultVlan: '10', addressPattern: (x) => `172.16.${x}.1–252` },
    groups: [
      {
        stacked: [
          {
            icon: '🖥️', label: 'PC1', sublabel: 'PC-PT',
            fields: [
              { key: 'pc1_ip', label: 'adres IP', placeholder: (x) => `172.16.${x}.10`, type: 'address', shared: 'pc1_ip' },
            ],
          },
          {
            icon: '🖥️', label: 'PC2', sublabel: 'PC-PT',
            fields: [
              { key: 'pc2_ip', label: 'adres IP', placeholder: (x) => `172.16.${x}.11`, type: 'address', shared: 'pc2_ip' },
            ],
          },
        ],
      },
      {
        node: { icon: '🔀', label: 'SW-X', sublabel: '3560-24PS' },
        fields: [
          { key: 'swMgmt', label: 'adr. zarządz.', placeholder: (x) => `172.16.${x}.253`, type: 'address' },
        ],
      },
    ],
  }}
/>

W tej części ustaw na wszystkich komputerach adresy z **tej samej sieci** (zgodnie z podpowiedziami w topologii). To celowe: pokażemy, że VLAN-y izolują ruch nawet wtedy, gdy adresacja IP pozwalałaby na komunikację.
</Step>

<Step title="Konfiguracja dwóch VLAN-ów na przełączniku (po 2 porty każdy)">

Na **SW-X** utwórz dwa VLAN-y i przypisz do każdego po dwa porty:

```
# Etap tworzenia VLAN-ów

Switch(config)# vlan 10
Switch(config-vlan)# name Studenci
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Pracownicy
Switch(config-vlan)# exit

# Etap przypisania portów do VLAN-u

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
Sprawdź **na żywo**, jak VLAN-y izolują ruch, mimo że wszystkie 4 porty są na tym samym przełączniku i w tej samej podsieci IP. Wykonaj kolejno pingi między parami portów, przepinając kable, i zapisz wyniki w Tabeli 1:

<EditableTable
  title="Tab. 1 Wyniki testu izolacji VLAN"
  storageKey="cwiczenie-7-izolacja"
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

**Co warto zauważyć:** mimo identycznej podsieci IP na wszystkich portach hosty z różnych VLAN-ów się nie widzą. Izolacja zachodzi **w warstwie 2** — zapytanie ARP z VLAN 10 nie dociera do VLAN 20, więc adresacja IP nie ma tu nic do powiedzenia.
</Step>
</StepByStep>

### Konfiguracja routingu wewnątrz przełącznika - SVI

<div className="justify">
**SVI (Switched Virtual Interface)** to logiczny interfejs warstwy 3 przypisany do konkretnego VLAN-u na przełączniku — nie odpowiada żadnemu fizycznemu portowi, tylko całej grupie portów należących do danego VLAN-u [^SVI]. W tym zadaniu SVI posłuży do routingu między VLAN-ami. Każdy VLAN dostaje swój SVI, a po włączeniu `ip routing` przełącznik sam przekazuje ruch między nimi.

W przełącznikach **pracujących tylko w warstwie 2** do komunikacji między VLAN-ami potrzebny jest mechanizm **router-on-a-stick**, który wymaga dodatkowego urządzenia — routera.
</div>

:::warning Trzy warunki działania SVI
1. **Każdy VLAN to osobna sieć IP.** Hosty z VLAN 10 i VLAN 20 muszą mieć adresy z różnych podsieci — inaczej host uzna drugi komputer za sąsiada, wyśle zapytanie ARP zamiast pakietu do bramy, a ARP nie przejdzie między VLAN-ami.
2. **Brama domyślna hosta = adres SVI jego VLAN-u.**
3. **SVI jest aktywny (`up/up`) tylko wtedy, gdy VLAN istnieje i ma co najmniej jeden działający port** z podłączonym urządzeniem (mechanizm *autostate*).
:::

<StepByStep>
<Step title="Topologia i nowa adresacja">
<TopologyBuilder
  title="Topologia — PC1, PC2, SW"
  storageKey="cwiczenie-7-top2"
  topology={{
    vlan: { show: false, defaultVlan: '10', addressPattern: () => `10.1.10.0/24, 10.1.20.0/24` },
    groups: [
      {
        stacked: [
          {
            icon: '🖥️', label: 'PC1', sublabel: 'Fa0/1 · VLAN 10',
            fields: [
              { key: 'pc1_ip', label: 'adres IP', placeholder: () => `10.1.10.10/24`, type: 'address' },
              { key: 'pc1_gw', label: 'brama', placeholder: () => `10.1.10.1`, type: 'address' },
            ],
          },
          {
            icon: '🖥️', label: 'PC2', sublabel: 'Fa0/3 · VLAN 20',
            fields: [
              { key: 'pc2_ip', label: 'adres IP', placeholder: () => `10.1.20.10/24`, type: 'address' },
              { key: 'pc2_gw', label: 'brama', placeholder: () => `10.1.20.1`, type: 'address' },
            ],
          },
        ],
      },
      {
        node: { icon: '🔀', label: 'SW-X', sublabel: '3560-24PS' },
        fields: [
          { key: 'svi10', label: 'SVI VLAN 10', placeholder: () => `10.1.10.1/24`, type: 'address' },
          { key: 'svi20', label: 'SVI VLAN 20', placeholder: () => `10.1.20.1/24`, type: 'address' },
        ],
      },
    ],
  }}
/>

**Zmień adresację komputerów** — adresy z części I (wspólna sieć) tutaj nie zadziałają. W Packet Tracerze: *PC → Desktop → IP Configuration*.

| Host | Port | VLAN | Adres IP | Maska | Brama domyślna |
|---|---|---|---|---|---|
| PC1 | Fa0/1 | 10 | 10.1.10.10 | 255.255.255.0 | 10.1.10.1 |
| PC2 | Fa0/3 | 20 | 10.1.20.10 | 255.255.255.0 | 10.1.20.1 |

Sprawdź na każdym komputerze poleceniem `ipconfig`, czy adres i brama są ustawione poprawnie.
</Step>

<Step title="Sprawdzenie VLAN-ów i portów">
SVI nie utworzy VLAN-u — VLAN musi już istnieć, a do jego portu musi być podłączony komputer. Sprawdź `show vlan brief`. Jeśli VLAN-ów brakuje (np. po resecie przełącznika), skonfiguruj je ponownie:

```
Switch(config)# vlan 10
Switch(config-vlan)# name Studenci
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Pracownicy
Switch(config-vlan)# exit

Switch(config)# interface range fastEthernet 0/1 - 2
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 10
Switch(config-if-range)# exit

Switch(config)# interface range fastEthernet 0/3 - 4
Switch(config-if-range)# switchport mode access
Switch(config-if-range)# switchport access vlan 20
Switch(config-if-range)# exit
```

Podłącz **PC1 do Fa0/1** (VLAN 10), a **PC2 do Fa0/3** (VLAN 20). Jeśli oba komputery trafią do portów tego samego VLAN-u, SVI drugiego VLAN-u pozostanie nieaktywny.
</Step>

<Step title="Konfiguracja SVI i routingu">
Na **SW-X** utwórz SVI dla obu VLAN-ów i włącz routing:

```
# Adres SVI dla VLAN 10 — brama dla hostów z VLAN 10

Switch(config)# interface vlan 10
Switch(config-if)# ip address 10.1.10.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

# Adres SVI dla VLAN 20 — brama dla hostów z VLAN 20

Switch(config)# interface vlan 20
Switch(config-if)# ip address 10.1.20.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

# Główne polecenie, bez którego przełącznik nie przekaże ruchu między VLAN-ami
Switch(config)# ip routing
```

<ScreenshotPaste label="Zrzut ekranu: konfiguracja SVI" />
</Step>

<Step title="Weryfikacja interfejsów SVI i tablicy routingu">
Najpierw sprawdź stan interfejsów:

```
show ip interface brief
```

Interfejsy `Vlan10` i `Vlan20` muszą mieć stan **up/up**:

| Stan | Przyczyna | Co zrobić |
|---|---|---|
| `up / up` | wszystko w porządku | — |
| `administratively down / down` | SVI wyłączony | `no shutdown` w `interface vlan X` |
| `down / down` | VLAN nie istnieje albo nie ma w nim aktywnego portu | sprawdź `show vlan brief` i podłączenie kabla |

Następnie sprawdź tablicę routingu:

```
show ip route
```

Obie sieci, `10.1.10.0/24` i `10.1.20.0/24`, powinny być widoczne jako bezpośrednio podłączone (`C`). Jeśli polecenie nie pokazuje tras albo informuje o braku routingu — brakuje `ip routing`.

<ScreenshotPaste label="Zrzut ekranu: show ip interface brief" />
<ScreenshotPaste label="Zrzut ekranu: show ip route" />
</Step>

<Step title="Test routingu między VLAN-ami">
Wykonaj kolejno pingi z PC1 i zapisz wyniki w Tabeli 2. W wierszu 4 przepnij PC1 do Fa0/2, a PC2 do Fa0/4. W wierszu 5 wyłącz na chwilę routing poleceniem `no ip routing`, wykonaj ping, a następnie **włącz go ponownie** (`ip routing`).

<EditableTable
  title="Tab. 2 Wyniki testu routingu między VLAN-ami"
  storageKey="cwiczenie-7-izolacja2"
  columns={[
    {key: 'zrodlo', label: 'Źródło', readOnly: true},
    {key: 'cel', label: 'Cel', readOnly: true},
    {key: 'wynik', label: 'Ping działa? (tak/nie)'},
    {key: 'wyjasnienie', label: 'Dlaczego?'},
  ]}
  initialRows={[
    {zrodlo: 'PC1 – Fa0/1 (VLAN 10)', cel: '10.1.10.1 – SVI VLAN 10 (brama)'},
    {zrodlo: 'PC1 – Fa0/1 (VLAN 10)', cel: '10.1.20.1 – SVI VLAN 20'},
    {zrodlo: 'PC1 – Fa0/1 (VLAN 10)', cel: 'PC2 – Fa0/3 (VLAN 20)'},
    {zrodlo: 'PC1 – Fa0/2 (VLAN 10)', cel: 'PC2 – Fa0/4 (VLAN 20)'},
    {zrodlo: 'PC1 (VLAN 10), po no ip routing', cel: 'PC2 (VLAN 20)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

Na koniec wykonaj z PC1 `tracert 10.1.20.10`. Pakiet powinien przejść przez jeden skok — bramę `10.1.10.1`, czyli SVI na przełączniku.

<ScreenshotPaste label="Zrzut ekranu: tracert z PC1 do PC2" />

**Co warto zauważyć:** w części I ten sam przełącznik blokował komunikację między VLAN-ami. Teraz pakiet z VLAN 10 trafia do bramy (SVI VLAN 10), przełącznik kieruje go w warstwie 3 do sieci 10.1.20.0/24 i wysyła przez SVI VLAN 20 do PC2. VLAN-y nadal są osobnymi domenami rozgłoszeniowymi — łączy je dopiero routing.
</Step>
</StepByStep>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.

[^802.1Q]: IEEE Std 802.1Q-2018, IEEE Standard for Local and Metropolitan Area Networks — Bridges and Bridged Networks, Institute of Electrical and Electronics Engineers.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^SVI]: Cisco Systems. (2023). Understanding Switched Virtual Interface (SVI) Autostate States on Catalyst Switches. Cisco Technical Support & Documentation. cisco.com
