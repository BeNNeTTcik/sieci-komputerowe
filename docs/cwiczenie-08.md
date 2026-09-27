---
sidebar_position: 8
title: "Ćwiczenie 8: Routing statyczny"
---

<!--- import bibliotek -->

import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import CodeBlock from '@site/src/components/CodeBlock';
import SharedValue from '@site/src/components/SharedValue';
import OpenQuestion from '@site/src/components/OpenQuestion';
import EditableTable from '@site/src/components/EditableTable';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';

# Ćwiczenie 8: Routing statyczny

_Część II — Zajęcia praktyczne_

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 8: Routing statyczny"
  storageKey="cwiczenie-08"
/>

## I. Wprowadzenie

<div className="justify">
**Routing statyczny** to ręcznie wpisywane tras (`ip route`) przez administratora, gdzie router nie podejmuje żadnych decyzji sam, po prostu wykonuje polecenie. **Routing dynamiczny** (RIP, OSPF - przedstawiony w kolejnych ćwiczeniach) to protokół działający na routerach, który automatycznie wykrywa sąsiadów, wymienia z nimi informacje o sieciach i sam buduje tablicę routingu, bez ingerencji człowieka.

**Wpis `ip route`:**

Pełna postać polecenia to `ip route <sieć_docelowa> <maska> <next-hop | interfejs_wyjściowy> [administrative-distance]`. Kluczowa jest różnica między dwoma sposobami wskazania "dokąd dalej":
</div>

| Forma | Przykład | Zachowanie |
|---|---|---|
| **Next-hop** (adres IP sąsiada) | `ip route 192.168.20.0 255.255.255.0 10.0.0.2` | router musi dodatkowo **rekurencyjnie** sprawdzić, przez który interfejs dotrzeć do tego adresu - dodatkowe wyszukiwanie w tablicy routingu |
| **Exit interface** (interfejs wyjściowy) | `ip route 192.168.20.0 255.255.255.0 GigabitEthernet0/0/1` | trasa jest natychmiast gotowa do użycia, ale na sieciach multi-access (Ethernet) może wymagać dodatkowego ARP dla **każdego** adresu docelowego |

**Dystans administracyjny (Administrative Distance):**

<div className="justify">
Skąd router wie, której trasie zaufać, jeśli tę samą sieć "widzi" jednocześnie ze statycznego wpisu i z protokołu dynamicznego? Każdemu źródłu informacji o trasach Cisco IOS przypisuje domyślny dystans administracyjny (AD), który im niższa wartość, tym trasa bardziej zaufana:

| Źródło trasy | Domyślny AD |
|---|---|
| Interfejs bezpośrednio podłączony (*connected*) | 0 |
| Trasa statyczna (`ip route`) | 1 |
| OSPF | 110 |
| RIP | 120 |

Trasa statyczna (AD=1) domyślnie **wygrywa** z każdym protokołem dynamicznym dla tej samej sieci. To świadomy wybór projektowy Cisco ponieważ administrator "wie lepiej" niż automat jak zaprojektowana jest jego sieć. Ta sama zasada pozwala tworzyć tzw. trasy zapasowe (*floating static route*), czyli statyczne wpisy z podwyższonym, jawnie podanym AD, który aktywuje się tylko wtedy, gdy trasa dynamiczna zniknie.
</div>

## II. Zadania do wykonania

Zaadresuj interfejsy zgodnie z topologią.
<TopologyBuilder
title="Topologia"
storageKey="static-routing"
xShared="grupa_x"
topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🖥️', label: 'K1' }, fields: [
        { key: 'k1_ip', label: 'adres IP', placeholder: (x) => `10.1.${x}.2/24`, type: 'cidr', expectedPrefix: 24, shared: 'st_k1_ip' },
      ]},
      { node: { icon: '🌐', label: 'R1' }, fields: [
        { key: 'r1_k1', label: 'do K1 - Gi0/0/0', placeholder: (x) => `10.1.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'st_k1-r1_ip', mask: 'st_k1-r1_mask', network: 'st_k1-r1_net', wildcard: 'st_k1-r1_wild'} },
        { key: 'r1_r2', label: 'do R2 - Gi0/0/1', placeholder: (x) => `10.2.${x}.1/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'st_r1-r2_ip', mask: 'st_r1-r2_mask', network: 'st_r1-r2_net', wildcard: 'st_r1-r2_wild'} },
        { key: 'r1_lo', label: 'Loopback1', placeholder: (x) => `10.100.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'st_r1-loop_ip', network: 'st_r1-loop_net', mask: 'st_r1-loop_mask'} },
      ]},
      { node: { icon: '🌐', label: 'R2' }, fields: [
        { key: 'r2_k2', label: 'do K2 - Gi0/0/0', placeholder: (x) => `10.3.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'st_k2-r2_ip', mask: 'st_k2-r2_mask', network: 'st_k2-r2_net', wildcard: 'st_k2-r2_wild'} },
        { key: 'r2_r1', label: 'do R1 - Gi0/0/1', placeholder: (x) => `10.2.${x}.2/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'st_r2-r1_ip', mask: 'st_r2-r1_mask', network: 'st_r2-r1_net', wildcard: 'st_r2-r1_wild'} },
        { key: 'r2_lo', label: 'Loopback1', placeholder: (x) => `10.101.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'st_r2-loop_ip', network: 'st_r2-loop_net', mask: 'st_r2-loop_mask'} },
      ]},
      { node: { icon: '🖥️', label: 'K2' }, fields: [
        { key: 'k2_ip', label: 'adres IP', placeholder: (x) => `10.3.${x}.2/24`, type: 'cidr', expectedPrefix: 24, shared: 'st_k2_ip' },
      ]},
    ],
  }}
/>

<StepByStep>
<Step title="Konfiguracja interfejsów i Loopback">

Zaadresuj interfejsy `R1` i `R2` zgodnie z topologią powyżej. Loopback 1 to dodatkowy, wirtualny interfejs routera — przydatny do testów, bo nie zależy od stanu żadnego kabla.

<CodeBlock lines={[
'Router(config)# hostname R1-X',
<>R1-X(config)# interface GigabitEthernet0/0/0</>,
<>R1-X(config-if)# ip address <SharedValue shared="st_k1-r1_ip" fallback="adres R1 (do K1)" /> <SharedValue shared="st_k1-r1_mask" fallback="maska" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
<>R1-X(config)# interface GigabitEthernet0/0/1</>,
<>R1-X(config-if)# ip address <SharedValue shared="st_r1-r2_ip" fallback="adres R1 (do R2)" /> <SharedValue shared="st_r1-r2_mask" fallback="maska" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
]} />

**Interfejs Loopback 1**

<CodeBlock lines={[
'R1-X(config)# interface loopback 1',
<>R1-X(config-if)# ip address <SharedValue shared="st_r1-loop_ip" fallback="adres Loopback1 R1" /> <SharedValue shared="st_r1-loop_mask" fallback="maska" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
]} />

Skonfiguruj analogicznie `R2`.

Nie zapomnij o zmianie adesu IP na komputerze oraz podłącz patchkordy zgodnie z topologią. Ustaw adresację IP na `K1` i `K2`, bramę domyślną ustaw na adres **najbliższego** interfejsu routera.
</Step>

<Step title="Weryfikacja konfiguracji">
Sprawdź tablicę routingu i wykonaj ping na własny adres Loopback:
<CodeBlock lines={[
'R1-X# show ip route',
<>R1-X# ping <SharedValue shared="st_r1-loop_ip" fallback="adres Loopback1 R1" /></>
]} />

Loopback powinien być widoczny jako `directly connected`, a ping — w 100% skuteczny (to test samego routera, jeszcze bez udziału sieci).

<ScreenshotPaste label="Zrzut ekranu: show ip route na R1" />
</Step>

<Step title="Test przed routingiem statycznym">
Wykonaj poniższe testy z każdego urządzenia:

<EditableTable
title="Test połączenia"
storageKey="static-ping-testy-1"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik_k1', label: 'Wynik z K1' },
{ key: 'wynik_k2', label: 'Wynik z K2' },
{ key: 'wynik_r1', label: 'Wynik z R1' },
{ key: 'wynik_r2', label: 'Wynik z R2' },
]}
initialRows={[
{ polecenie: <>ping <SharedValue shared="st_k1-r1_ip" fallback="adres R1 (od strony K1)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r1-loop_ip" fallback="Loopback1 R1" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r2-loop_ip" fallback="Loopback1 R2" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_k2-r2_ip" fallback="adres R2 (od strony K2)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r1-r2_ip" fallback="adres R1 (od strony R2)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r2-r1_ip" fallback="adres R2 (od strony R1)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: show ip route na R1" />
<ScreenshotPaste label="Zrzut ekranu: show ip route na R2" />

<OpenQuestion
  title="Pytanie do zastanowienia"
  question="Dlaczego nie można uzyskać odpowiedzi z niektórych adresów, mimo że fizyczne połączenie działa?"
  minLength={40}
  storageKey="static-pytanie-1"
/>

</Step>

<Step title="Routing statyczny do sieci komputerów">

Dodaj wpisy statyczne na `R1` i `R2` do sieci, w których znajdują się komputery drugiej strony sieci:

<CodeBlock lines={[
'R1-X(config)# ip route ' ,
<>R1-X(config)# ip route <SharedValue shared="st_k2-r2_net" fallback="sieć K2" /> <SharedValue shared="st_k2-r2_mask" fallback="maska sieci K2" /> <SharedValue shared="st_r2-r1_ip" fallback="adres R2 od strony R1" /></>,
]} />

Analogicznie na R2 — trasa do sieci K1, przez adres R1 od strony R2.
</Step>

<Step title="Test po konfiguracji routingu statycznego">
Powtórz komplet pingów.

<EditableTable
title="Test połączenia"
storageKey="static-ping-testy-2"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik_k1', label: 'Wynik z K1' },
{ key: 'wynik_k2', label: 'Wynik z K2' },
{ key: 'wynik_r1', label: 'Wynik z R1' },
{ key: 'wynik_r2', label: 'Wynik z R2' },
]}
initialRows={[
{ polecenie: <>ping <SharedValue shared="st_k1-r1_ip" fallback="adres R1 (od strony K1)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r1-loop_ip" fallback="Loopback1 R1" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r2-loop_ip" fallback="Loopback1 R2" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_k2-r2_ip" fallback="adres R2 (od strony K2)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r1-r2_ip" fallback="adres R1 (od strony R2)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
{ polecenie: <>ping <SharedValue shared="st_r2-r1_ip" fallback="adres R2 (od strony R1)" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: show ip route na R1" />
<ScreenshotPaste label="Zrzut ekranu: show ip route na R2" />

<OpenQuestion
  title="Pytanie do zastanowienia"
  question="Które testy dalej nie działają i dlaczego? Do jakich sieci routery nadal nie mają wpisanej trasy?"
  minLength={40}
  storageKey="static-pytanie-2"
/>
</Step>

<Step title="Routing statyczny do interfejsów Loopback">

Dodaj brakujące wpisy statyczne — tym razem do sieci Loopback drugiego routera.

<CodeBlock lines={[
<>R1-X(config)# ip route <SharedValue shared="st_r2-loop_net" fallback="sieć Loopback R2" /> <SharedValue shared="st_r2-loop_mask" fallback="maska Loopback R2" /> <SharedValue shared="st_r2-r1_ip" fallback="adres R2 od strony R1" /></>,
]} />

<CodeBlock lines={[
<>R2-X(config)# ip route <SharedValue shared="st_r1-loop_net" fallback="sieć Loopback R1" /> <SharedValue shared="st_r1-loop_mask" fallback="maska Loopback R1" /> <SharedValue shared="st_r1-r2_ip" fallback="adres R1 od strony R2" /></>,
]} />
</Step>

<Step title="Test po dodaniu routing dla interfejsu Loopback">
<EditableTable
  title="Test połączenia"
  storageKey="static-ping-testy-3"
  allowAddRows={false}
  allowRemoveRows={false}
  columns={[
    { key: 'polecenie', label: 'Polecenie', readOnly: true },
    { key: 'wynik_k1', label: 'Wynik z K1' },
    { key: 'wynik_k2', label: 'Wynik z K2' },
    { key: 'wynik_r1', label: 'Wynik z R1' },
    { key: 'wynik_r2', label: 'Wynik z R2' },
  ]}
  initialRows={[
    { polecenie: <>ping <SharedValue shared="st_r1-loop_ip" fallback="Loopback1 R1" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' },
    { polecenie: <>ping <SharedValue shared="st_r2-loop_ip" fallback="Loopback1 R2" /></>, wynik_k1: '', wynik_k2: '', wynik_r1: '', wynik_r2: '' }
  ]}
/>

<ScreenshotPaste label="Zrzut ekranu: show ip route na R1" />
<ScreenshotPaste label="Zrzut ekranu: show ip route na R2" />
</Step>
</StepByStep>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::