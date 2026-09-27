---
sidebar_position: 9
title: "Ćwiczenie 9: Routing dynamiczny — RIP"
---

<!--- import bibliotek -->

import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import CodeBlock from '@site/src/components/CodeBlock';
import CodeBlank from '@site/src/components/CodeBlank';
import SharedValue from '@site/src/components/SharedValue';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import RingSharedValue from '@site/src/components/RingSharedValue';

# Ćwiczenie 9: Routing dynamiczny — RIP

_Część II — Zajęcia praktyczne_

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 9: Routing dynamiczny — RIP"
  storageKey="cwiczenie-9"
/>

## I. Wprowadzenie

<div className="justify">
**RIP (Routing Information Protocol)** to jeden z najstarszych protokołów routingu dynamicznego. Router automatycznie wymienia z sąsiadami informacje o dostępnych sieciach, zamiast administratora ręcznie wpisującego każdą trasę statyczną (`ip route`) osobno. **RIP** należy do rodziny protokołów wektora odległości (distance-vector), czyli router nie zna pełnej topologii sieci, a wie tylko, "w którą stronę" (przez jaki sąsiedni interfejs) i "jak daleko" (ile skoków) znajduje się dana sieć docelowa, ufając informacji przekazanej przez sąsiedni router [^RFC1058].

**Metryką RIP** jest wyłącznie liczba skoków (hop count) jako liczba routerów po drodze do sieci docelowej, niezależnie od przepustowości czy opóźnienia łączy. Maksymalna dopuszczalna wartość to 15 skoków; sieć oddaloną o 16 skoków RIP traktuje jako nieosiągalną (infinity). Jesto to podstawowe ograniczenie tych protokołów, wykluczająca RIP z użycia w bardzo dużych sieciach [^RFC1058].

RIP działa na zasadzie "plotki", czyli co 30 sekund każdy router wysyła sąsiadom całą swoją tablicę routingu (a nie tylko zmiany), a ci sąsiedzi bezkrytycznie dodają 1 do otrzymanej metryki i ewentualnie aktualizują własną tablicę, jeśli otrzymana trasa jest tańsza niż dotychczasowa. Leżący u podstaw algorytm to zmodyfikowany **algorytm Bellmana-Forda** [^kurose][^RFC1058].

Informacja zwrotna dla RIP zbiega się wolno (do 30 sekund między aktualizacjami, a pełna stabilizacja po awarii łącza może zająć kilka minut) i jest podatny na pętle routingu, jeśli informacja o awarii nie rozejdzie się wystarczająco szybko. Klasyczny problem "zliczania do nieskończoności" (counting to infinity), gdy dwa routery przez pewien czas wzajemnie "przebijają" swoją (już nieaktualną) metrykę do martwej sieci. RIP łagodzi ten problem mechanizmami split horizon (nie odsyłaj informacji o trasie w tę samą stronę, z której ją otrzymałeś) i poison reverse (rozgłoś tę trasę z powrotem, ale z metryką 16 = nieskończoność) [^kurose][^RFC1058].
</div>

## II. Zadania do wykonania

<TopologyBuilder
title="Topologia"
storageKey="rip-grupy-segment"
xShared="grupa_x"
topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🖥️', label: 'K1' }, fields: [
        { key: 'k1_ip', label: 'adres IP', placeholder: (x) => `192.168.${x}.10/24`, type: 'cidr', expectedPrefix: 24, shared: 'k1_ip' },
      ]},
      { node: { icon: '🌐', label: 'R1' }, fields: [
        { key: 'r1_k1', label: 'do K1 - Gi0/0/0', placeholder: (x) => `192.168.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'k1-r1_ip', mask: 'k1-r1_mask', network: 'k1-r1_net', wildcard: 'k1-r1_wild'} },
        { key: 'r1_r2', label: 'do R2 - Gi0/0/1', placeholder: (x) => `192.168.${Number(x) + 10}.1/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'r1-r2_ip', mask: 'r1-r2_mask', network: 'r1-r2_net', wildcard: 'r1-r2_wild'} },
        { key: 'r1_lo', label: 'Loopback1', placeholder: (x) => `192.168.${Number(x) + 30}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'r1-loop_ip', mask: 'r1-loop_mask', network: 'r1-loop_net'} },
      ]},
      { node: { icon: '🌐', label: 'R2' }, fields: [
        { key: 'r2_k2', label: 'do K2 - Gi0/0/0', placeholder: (x) => `192.168.${Number(x) + 20}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'k2-r2_ip', mask: 'k2-r2_mask', network: 'k2-r2_net', wildcard: 'k2-r2_wild'} },
        { key: 'r2_r1', label: 'do R1 - Gi0/0/1', placeholder: (x) => `192.168.${Number(x) + 10}.2/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'r2-r1_ip', mask: 'r2-r1_mask', network: 'r2-r1_net', wildcard: 'r2-r1_wild'} },
        { key: 'r2_lo', label: 'Loopback1', placeholder: (x) => `192.168.${Number(x) + 40}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'r2-loop_ip', mask: 'r2-loop_mask', network: 'r2-loop_net'} },
      ]},
      { node: { icon: '🖥️', label: 'K2' }, fields: [
        { key: 'k2_ip', label: 'adres IP', placeholder: (x) => `192.168.${Number(x) + 20}.10/24`, type: 'cidr', expectedPrefix: 24, shared: 'k2_ip' },
      ]},
    ],
  }}
/>

<StepByStep>
<Step title="Konfiguracja adresacji interfejsów i Loopback">

Zaadresuj interfejsy routerów zgodnie z topologią powyżej.

<CodeBlock lines={[
'Router(config)# hostname R1-X',
<>R1-X(config)# interface GigabitEthernet0/0/0</>,
<>R1-X(config-if)# ip address <SharedValue shared="k1-r1_ip" fallback="adres R1" /> <SharedValue shared="k1-r1_mask" fallback="maska R1" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
]} />

Powtórz analogicznie dla pozostałych interfejsów R1 oraz R2, zgodnie z rozkładem portów zawartej w topologii.

**Konfiguracja - interfejsu Loopback 1**:

<CodeBlock lines={[
'R1-X(config)# interface loopback 1',
<>R1-X(config-if)# ip address <SharedValue shared="r1-loop_ip" fallback="adres LoopBack1" /> <SharedValue shared="r1-loop_mask" fallback="maska LoopBack1" /></>,
'R1-X(config-if)# no shutdown',
]} />

Analogicznie na R2, z **innym** adresem loopback.

</Step>

<Step title="Weryfikacja Loopback przed dalszą konfiguracją">

<Checklist
title="Sprawdź przed przejściem dalej"
storageKey="rip-checklist-loopback"
sections={[{
items: [
'show ip route — Loopback1 widoczny jako "directly connected"',
'ping do własnego adresu Loopback1 — 100% sukcesu',
'To samo powtórzone na R2',
],
}]}
/>

</Step>

<Step title="Podłączenie fizyczne i pierwszy test (przed RIP)">

Podłącz patchkordy zgodnie z topologią, ustaw adresację i bramę domyślną na K1/K2 (brama = najbliższy interfejs routera).

Z komputera K1 i K2 wykonaj kolejno `ping` na poniższe interfejsy:

<EditableTable
title="Test łączności"
storageKey="rip-ping-testy-1"
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik', label: 'Wynik dla K1' },
{ key: 'wynik2', label: 'Wynik dla K2' }
]}
allowAddRows={false}
allowRemoveRows={false}
initialRows={[
{ polecenie: <>ping <SharedValue shared="k1-r1_ip" fallback="adres R1" /></>, wynik: '', wynik2: '' },
{ polecenie: <>ping <SharedValue shared="r1-loop_ip" fallback="Loopback R1" /></>, wynik: '', wynik2: '' },
{ polecenie: <>ping <SharedValue shared="r2-loop_ip" fallback="Loopback R2" /></>, wynik: '', wynik2: '' },
{ polecenie: <>ping <SharedValue shared="k2-r2_ip" fallback="adres R2 od strony K2" /></>, wynik: '', wynik2: '' },
]}
/>
</Step>

<Step title="Uruchomienie RIP między R1 i R2">

RIP działa na poziomie całej klasowej sieci głównej danego adresu. W tym ćwiczeniu adresacja jest oparta na `192.168.x.x` (klasa C), więc parametr `network` wygląda inaczej niż przy klasie A `10.0.0.0/8`. Jedno polecenie obejmie więc **tylko** jedną konkretna sieć, gdzie **każde łącze leży w OSOBNEJ sieci klasowej** (bo klasowa granica C to `/24`, a każdy odcinek ma inny trzeci oktet).

Na R1:
<CodeBlock lines={[
'R1-X(config)# router rip',
'R1-X(config-router)# version 2',
'R1-X(config-router)# no auto-summary',
<>R1-X(config-router)# network <SharedValue shared="r1-r2_net" fallback="sieć R1-R2 (klasowa /24)" /></>,
'R1-X(config-router)# exit',
]} />

Identyczna połączenie występuje na routerze R2.
</Step>

<Step title="Rozszerzenie RIP na sieci K1/K2 i Loopback">

Po poprzednim kroku R1 i R2 widzą się nawzajem, ale `K1` i `K2` **wciąż nie są osiągalne** — sieć do K1 (`192.168.x.0/24`) i sieć do K2 są osobnymi sieciami klasowymi C, więc RIP musi dostać osobne polecenie `network` dla każdej z nich. To jest różnica względem adresacji `10.0.0.0/8` z wcześniejszej wersji tego ćwiczenia, gdzie jedno polecenie klasowe obejmowało wszystko naraz.

Na R1 — dopisz sieć do K1 oraz sieć Loopback:

<CodeBlock lines={[
'R1-X(config)# router rip',
<>R1-X(config-router)# network <SharedValue shared="k1-r1_net" fallback="sieć K1↔R1" /></>,
<>R1-X(config-router)# network <SharedValue shared="r1-loop_net" fallback="sieć Loopback R1" /></>,
'R1-X(config-router)# exit',
]} />

Analogicznie na routerze R2.
</Step>

<Step title="Weryfikacja konfiguracji RIP">
Zweryfikuj łącznośc pomiędzy elementami sieci:

<EditableTable
title="Test łączności"
storageKey="rip-ping-testy-2"
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik', label: 'Wynik dla K1' },
{ key: 'wynik2', label: 'Wynik dla K2' }
]}
allowAddRows={false}
allowRemoveRows={false}
initialRows={[
{ polecenie: <>ping <SharedValue shared="k1-r1_ip" fallback="adres R1" /></>, wynik: '', wynik2: '' },
{ polecenie: <>ping <SharedValue shared="r1-loop_ip" fallback="Loopback R1" /></>, wynik: '', wynik2: '' },
{ polecenie: <>ping <SharedValue shared="r2-loop_ip" fallback="Loopback R2" /></>, wynik: '', wynik2: '' },
{ polecenie: <>ping <SharedValue shared="k2-r2_ip" fallback="adres R2 od strony K2" /></>, wynik: '', wynik2: '' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: show ip protocols" />
<ScreenshotPaste label="Zrzut ekranu: show ip route" />

`show ip protocols` pokazuje m.in. sekcję „Routing Information Sources” — to tu zobaczysz sąsiada RIP. Jeśli sąsiedztwo się nie nawiązuje, sprawdź, czy oba routery mają `version 2` i czy interfejs między nimi rzeczywiście należy do `192.168.x.0/24`.

</Step>
</StepByStep>

<StepByStep>
<Step title="Rozszerzenie RIP na sąsiednie grupy">

Ustal z sąsiednimi grupami numerację i wypełnij poniższą tabelę:
<EditableTable
title="Sieci między grupami — uzgodnij z sąsiadami"
storageKey="rip"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'opis', label: 'Połączenie', readOnly: true },
{ key: 'siec', label: 'CIDR' },
]}
initialRows={[
{
opis: 'R1 ↔ R1 sąsiada „w górę" (172.16.<g1><g2>.0/24)',
siec: '',
deriveShared: { siec: { netclassNetwork: 'r1_gora_class', ip: 'r1_gora_ip', mask: 'r1_gora_mask', network: 'r1_gora_siec', wildcard: 'r1_gora_wild' } },
},
{
opis: 'R1 ↔ R1 sąsiada „w dół" (172.16.<g2><g1>.0/24)',
siec: '',
deriveShared: { siec: { netclassNetwork: 'r1_dol_class', ip: 'r1_dol_ip', mask: 'r1_dol_mask', network: 'r1_dol_siec', wildcard: 'r1_dol_wild' } },
},
{
opis: 'R2 ↔ R2 sąsiada „w górę" (172.17.<g1><g2>.0/24)',
siec: '',
deriveShared: { siec: { netclassNetwork: 'r2_gora_class', ip: 'r2_gora_ip', mask: 'r2_gora_mask', network: 'r2_gora_siec', wildcard: 'r2_gora_wild' } },
},
{
opis: 'R2 ↔ R2 sąsiada „w dół" (172.17.<g2><g1>.0/24)',
siec: '',
deriveShared: { siec: { netclassNetwork: 'r2_dol_class', ip: 'r2_dol_ip', mask: 'r2_dol_mask', network: 'r2_dol_siec', wildcard: 'r2_dol_wild' } },
},
]}
/>

Wszystkie sieci pierścienia R1 leżą w `172.16.0.0/16`, a wszystkie sieci pierścienia R2 w `172.17.0.0/16` — to się jeszcze przyda w kroku uruchamiania RIP.
</Step>

<Step title="Konfiguracja interfesjów">

<CodeBlock lines={[
'R1-X(config)# interface GigabitEthernet0/0/3',
<>R1-X(config-if)# ip address <SharedValue shared="r1_gora_ip" fallback="-" /> <SharedValue shared="r1_gora_mask" fallback="-" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
'R1-X(config)# interface GigabitEthernet0/0/4',
<>R1-X(config-if)# ip address <SharedValue shared="r1_dol_ip" fallback="-" /> <SharedValue shared="r1_dol_mask" fallback="-" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
]} />
</Step>

<Step title="Konfiguracja interfejsów RIP">

Przykładowe adresacje `172.16.0.0`, `172.17.0.0` to **cztery osobne sieci klasowe** (klasa B) — RIP wymaga więc osobnego `network` dla każdego kierunku.

Na R1:

<CodeBlock lines={[
'R1-X(config)# router rip',
<>R1-X(config-router)# network <SharedValue shared="r1_gora_class" fallback="adres do góry" /></>,
'R1-X(config-router)# exit',
]} />

Analogicznie na R2:

Jeśli sąsiedztwo się nie nawiązuje, sprawdź, czy interfejs faktycznie ma adres z odpowiedniej sieci `172.1x.g1.g2.0/24` uzgodnionej w tabeli wyżej, oraz czy sąsiad ma również `version 2`.

</Step>

<Step title="Weryfikacja końcowa i wnioski">
Weryfikacja całej topologii końcowej. Skorzystaj z poniższych komend, aby sprawdzić czy konfiguracja została przeprowadzona prawidłowo:

- `show ip protocols` — widoczni sąsiedzi ze wszystkich stron (R2 oraz sąsiednie grupy) w sekcji „Routing Information Sources”
  <ScreenshotPaste label="Zrzut ekranu: show ip protocols" />

- `show ip route` — sieci Loopback wszystkich grup widoczne w tablicy
  <ScreenshotPaste label="Zrzut ekranu: show ip route" />

- `ping` do Loopback dowolnej innej grupy w pierścieniu
  <ScreenshotPaste label="Zrzut ekranu: ping" />

</Step>
</StepByStep>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^RFC1058]: Hedrick, C. [RFC 1058](https://datatracker.ietf.org/doc/rfc1058/): Routing Information Protocol.

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.