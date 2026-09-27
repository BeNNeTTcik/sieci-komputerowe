---
sidebar_position: 10
title: "Ćwiczenie 10: Routing dynamiczny — OSPF (single area)"
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
import RingWeight from '@site/src/components/RingWeight';

# Ćwiczenie 10: Routing dynamiczny — OSPF (single area)

_Część II — Zajęcia praktyczne_

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 10: Routing dynamiczny — OSPF (single area)"
  storageKey="cwiczenie-10"
/>

## I. Wprowadzenie

<div className="justify">
**OSPF (Open Shortest Path First)** to protokół stanu łącza (link-state), w przeciwieństwie do RIP, który jest protokołem wektora odległości. Router OSPF nie zna tylko "ile skoków i w którą stronę", ale buduje sobie pełną mapę topologii całej sieci (lub obszaru) i sam liczy na niej najkrótsze trasy, zamiast ufać wyliczeniom sąsiada [^RFC2328].

**Obszary (areas) i Area 0**. W większych sieciach OSPF dzieli się na obszary, żeby ograniczyć rozmiar LSDB (wszystkie routery w danym obszarze mają identyczną bazę LSDB - Link State Database) i zasięg zalewania LSA (router rozsyła do sąsiadów ogłoszenia stanu łącza - Link State Advertisement). Wszystkie obszary muszą łączyć się (bezpośrednio lub przez wirtualne łącze) z obszarem szkieletowym Area 0 - w naszych ćwiczeniach pracujemy w jednym obszarze (single-area OSPF), więc ten mechanizm nie jest jeszcze potrzebny, ale warto znać go jako naturalny kolejny krok [^RFC2328].

Etapy budowania połączeń i odwzorowywania topologii sieci (Rysunek 1) [^RFC2328]:
- **Krok 1** - Sąsiedztwo. Routery co 10 s wysyłają pakiety Hello na adres multicast 224.0.0.5. Na ich podstawie ustalają sąsiedztwo. Stan można zaobserwować w `show ip ospf neighbor`.
- **Krok 2** - Rozgłaszanie (LSA) i baza LSDB. Każdy router rozsyła do sąsiadów ogłoszenia stanu łącza (Link State Advertisement) opisujące jego własne sieci i koszty do nich. Ogłoszenia są zalewowo (flooding) przekazywane dalej, aż wszystkie routery w danym obszarze mają identyczną bazę LSDB (Link State Database).
- **Krok 3** - Liczenie tras (SPF / algorytm Dijkstry). Mając identyczną mapę, każdy router niezależnie uruchamia algorytm Dijkstry, licząc najtańszą (nie: najkrótszą liczbowo) drogę do każdej sieci. Sumując po drodze koszt (ip ospf cost) każdego interfejsu. Dlatego różne routery w tej samej topologii mogą "widzieć" inne trasy jako optymalne dla różnych celów.
</div>

![Rys1](/img/10/ospf.svg)
<div className="text-center">
Rys.1 Mechanizm budowania topologii sieci [^claude]
</div>

## II. Zadania do wykonania

:::warning
Po zakończonym ćwiczeniu zapisz posiadaną konfigurację urządzeń np. `R1-X# show run` i klej do np. notatnika i zapisz na komputerze. Konfiguracja ta będzie wykorzystywana w następnym ćwiczeniu nr 11.
:::

Skonfigurowanie prostej sieci składającej się z 2 routerów oraz 2 komputerów.
<TopologyBuilder
title="Segment Twojej grupy — K1, R1, R2, K2"
storageKey="ospf-grupy-segment"
xShared="grupa_x"
topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🖥️', label: 'K1' }, fields: [
        { key: 'k1_ip', label: 'adres IP', placeholder: (x) => `10.1.${x}.2/24`, type: 'cidr', expectedPrefix: 24, shared: 'k1_ip' },
      ]},
      { node: { icon: '🌐', label: 'R1' }, fields: [
        { key: 'r1_k1', label: 'do K1 - Gi0/0/0', placeholder: (x) => `10.1.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'k1-r1_ip', mask: 'k1-r1_mask', network: 'k1-r1_net', wildcard: 'k1-r1_wild'} },
        { key: 'r1_r2', label: 'do R2 - Gi0/0/1', placeholder: (x) => `10.2.${x}.1/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'r1-r2_ip', mask: 'r1-r2_mask', network: 'r1-r2_net', wildcard: 'r1-r2_wild'} },
        { key: 'r1_lo', label: 'Loopback1', placeholder: (x) => `10.100.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'r1-loop_ip', mask: 'r1-loop_mask'} },
      ]},
      { node: { icon: '🌐', label: 'R2' }, fields: [
        { key: 'r2_k2', label: 'do K2 - Gi0/0/0', placeholder: (x) => `10.3.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'k2-r2_ip', mask: 'k2-r2_mask', network: 'k2-r2_net', wildcard: 'k2-r2_wild'} },
        { key: 'r2_r1', label: 'do R1 - Gi0/0/1', placeholder: (x) => `10.2.${x}.2/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'r2-r1_ip', mask: 'r2-r1_mask', network: 'r2-r1_net', wildcard: 'r2-r1_wild'} },
        { key: 'r2_lo', label: 'Loopback1', placeholder: (x) => `10.101.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'r2-loop_ip', mask: 'r2-loop_mask'} },
      ]},
      { node: { icon: '🖥️', label: 'K2' }, fields: [
        { key: 'k2_ip', label: 'adres IP', placeholder: (x) => `10.3.${x}.2/24`, type: 'cidr', expectedPrefix: 24, shared: 'k2_ip' },
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

Powtórz analogicznie dla pozostałych interfejsów R1, R2 (do K1/K2 i między sobą), zgodnie z rozkładem portów zawartej w topologii.

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
storageKey="ospf-checklist-loopback"
sections={[{
items: [
'show ip route — Loopback1 widoczny jako "directly connected"',
'ping do własnego adresu Loopback1 — 100% sukcesu',
'To samo powtórzone na R2',
],
}]}
/>

</Step>

<Step title="Podłączenie fizyczne i pierwszy test (przed OSPF)">

Podłącz patchkordy zgodnie z topologią, ustaw adresację i bramę domyślną na K1/K2 (brama = najbliższy interfejs routera).

Z komputera K1 i K2 wykonaj kolejno `ping` na poniższe interfejsy:

<EditableTable
title="Test łączności"
storageKey="ospf-ping-testy"
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

<OpenQuestion
  title="Pytanie do zastanowienia"
  question="Dlaczego nie można uzyskać odpowiedzi z niektórych adresów, mimo że fizyczne połączenie działa?"
  minLength={40}
  storageKey="ospf-pytanie-brak-routingu"
/>

</Step>

<Step title="Uruchomienie OSPF między R1 i R2">

Na R1:

<CodeBlock lines={[
'R1-X(config)# router ospf 1',
<>R1-X(config-router)# network <SharedValue shared="r1-r2_net" fallback="sieć R1-R2" /> <SharedValue shared="r1-r2_wild" fallback="odwrócona maska połączenia R1-R2" /> area 0</>,
'R1-X(config-router)# exit',
]} />

Analogicznie na R2 (ta sama sieć R1↔R2). Zweryfikuj:

```
show ip ospf neighbor
show ip route
```

Czy pojawiły się nowe sieci w tablicy routingu? Jeśli sąsiedztwo OSPF się nie nawiązuje, sprawdź, czy oba routery mają **dokładnie tę samą** sieć i maskę wildcard w poleceniu `network`.

</Step>

<Step title="Redystrybucja sieci podłączonych">

<CodeBlock lines={[
'R1-X(config)# router ospf 1',
'R1-X(config-router)# redistribute connected subnets',
]} />

Powtórz na R2. Sprawdź ponownie `show ip route` — powinny pojawić się dodatkowe sieci oznaczone jako `O E2` (zewnętrzne OSPF), w tym sieci K1↔R1 i R2↔K2, które wcześniej nie były jawnie ogłoszone przez `network`.

Powtórz komplet pingów K1 i K2. **Zanotuj, które wyniki się zmieniły.**

<EditableTable
title="Test łączności"
storageKey="ospf-ping-testy"
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
</StepByStep>

<StepByStep>
<Step title="Rozszerzenie OSPF na sąsiednie grupy">

Ustal z sąsiednimi grupami numerację i wypełnij poniższą tabele:
<EditableTable
title="Sieci między grupami — uzgodnij z sąsiadami"
storageKey="ospf"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'opis', label: 'Połączenie', readOnly: true },
{ key: 'siec', label: 'CIDR' },
{ key: 'waga', label: 'waga połączenia', readOnly: true },
]}
initialRows={[
{
opis: 'R1 ↔ R1 sąsiada „w górę" (172.16.g1.g2.0/24)',
siec: '',
waga: <RingWeight xShared="grupa_x" totalGroups={6} direction="up" weights={[8, 3, 12, 2, 9, 15]} />,
deriveShared: { siec: { ip: 'r1_gora_ip', mask: 'r1_gora_mask', network: 'r1_gora_siec', wildcard: 'r1_gora_wild' } },
},
{
opis: 'R1 ↔ R1 sąsiada „w dół" (172.17.g1.g2.0/24)',
siec: '',
waga: <RingWeight xShared="grupa_x" totalGroups={6} direction="down" weights={[8, 3, 12, 2, 9, 15]} />,
deriveShared: { siec: { ip: 'r1_dol_ip', mask: 'r1_dol_mask', network: 'r1_dol_siec', wildcard: 'r1_dol_wild' } },
},
{
opis: 'R2 ↔ R2 sąsiada „w górę" (172.18.g1.g2.0/24)',
siec: '',
waga: <RingWeight xShared="grupa_x" totalGroups={6} direction="up" weights={[5, 11, 1, 14, 4, 7]} />,
deriveShared: { siec: { ip: 'r2_gora_ip', mask: 'r2_gora_mask', network: 'r2_gora_siec', wildcard: 'r2_gora_wild' } },
},
{
opis: 'R2 ↔ R2 sąsiada „w dół" (172.19.g1.g2.0/24)',
siec: '',
waga: <RingWeight xShared="grupa_x" totalGroups={6} direction="down" weights={[5, 11, 1, 14, 4, 7]} />,
deriveShared: { siec: { ip: 'r2_dol_ip', mask: 'r2_dol_mask', network: 'r2_dol_siec', wildcard: 'r2_dol_wild' } },
},
]}
/>
</Step>

<Step title="Konfiguracja interfejsów - I">

Wstępna konfiguracja dla pojedynczego interfejsu w góre na routerze R1. Trzeba przygotwać konfiguracje dla R1 i przejscie w dół oraz dla routera R2 w góre i w dół.
<CodeBlock lines={[
'R1-X(config)# router ospf 1',
<>R1-X(config-router)# network <SharedValue shared="r1_gora_siec" fallback="adres R1 w góre" /> <SharedValue shared="r1_gora_wild" fallback="odwrócona maska R1 w góre" /> area 0</>,
'R1-X(config-router)# exit',
]} />
</Step>

<Step title="Konfiguracja interfejsów - II">

Uwzględnienie konfiguracji interfejsów pod protokół OSPF. Poniżej znajduje sie konfiguracja dla R1 oraz stworzyć na jej podstawie konfigurację dla R2.
<CodeBlock lines={[
'router ospf 1',
<>network <SharedValue shared="r1_gora_siec" fallback="sasiad w góre - R1" /> <SharedValue shared="r1_gora_wild" fallback="sasiad w góre - R1" /> area 0 </>,
<>network <SharedValue shared="r1_dol_siec" fallback="sasiad w dół - R1" /> <SharedValue shared="r1_dol_wild" fallback="sasiad w dół - R1" /> area 0 </>,
'exit',
'interface GigabitEthernet0/0/3',
<>ip ospf cost <RingWeight xShared="grupa_x" totalGroups={6} direction="up" weights={[8, 3, 12, 2, 9, 15]} /></>,
'exit',
'interface GigabitEthernet0/0/4',
<>ip ospf cost <RingWeight xShared="grupa_x" totalGroups={6} direction="down" weights={[8, 3, 12, 2, 9, 15]} /></>,
'exit',
]} />
</Step>

<Step title="Weryfikacja końcowa i wnioski">
Werifikacja całej topologii końcowej. Skorzystaj z poniższych komend, aby sprwadzić czy konfiguracja została przeprowadzona prawidłowo:

- `show ip ospf neighbor` — widoczni sąsiedzi ze wszystkich stron (R2 oraz sąsiednie grupy)
  <ScreenshotPaste label="Zrzut ekranu: show ip neighbor" />

- `show ip route` — sieci Loopback wszystkich grup widoczne w tablicy
  <ScreenshotPaste label="Zrzut ekranu: show ip route" />

- `ping` do Loopback dowolnej innej grupy w pierścieniu
  <ScreenshotPaste label="Zrzut ekranu: ping" />

<OpenQuestion
  title="Wnioski z ćwiczenia"
  question="Podsumuj, co zaobserwowałeś/aś: jak zmieniała się tablica routingu na kolejnych etapach (bez OSPF → OSPF lokalny → redystrybucja → OSPF międzygrupowy)?"
  minLength={60}
  storageKey="ospf-wnioski-koncowe"
/>

</Step>
</StepByStep>

:::warning
Zapisz posiadaną konfigurację urządzeń np. `R1-X# show run` i klej do np. notatnika i zapisz na komputerze. Konfiguracja ta będzie wykorzystywana w następnym ćwiczeniu nr 11.
:::

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^RFC2328]: Moy, J. — [RFC 2328](https://datatracker.ietf.org/doc/rfc2328/): OSPF Version 2.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).
