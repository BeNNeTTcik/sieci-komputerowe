---
sidebar_position: 15
title: "Ćwiczenie 15: Projekt zaliczeniowy"
---

<!--- import bibliotek -->

import TopologyBuilder from '@site/src/components/TopologyBuilder';
import TopologyGenerator from '@site/src/components/TopologyGenerator';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 15: Projekt zaliczeniowy

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 15: Projekt zaliczeniowy"
  storageKey="cwiczenie-15"
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="projekt-zaliczeniowy"
  storageKeys={['cwiczenie-15', 'final-wymagania', 'final-weryfikacja', 'final-segment', 'final-podsumowanie', 'final-generated']}
  sharedPrefix="final_"
/>

## I. Wprowadzenie

<div className="justify">
Poniżej wpisujesz numer swojej grupy, a strona **losuje Ci indywidualną topologię** — liczbę routerów, przełączników, VLAN-ów i komputerów, wymagany protokół routingu wewnętrznego oraz konkretne reguły ACL i DHCP. Stan konfiguracji można zapisać i wrócić wczytując stan.

Zadaniem jest samodzielnie zbudować i skonfigurować wylosowaną sieć w Cisco Packet Tracer. Wykorzystaj wiedzę ze wszystkich poprzednich ćwiczeń (adresacja, VLAN, routing statyczny i dynamiczny, ACL, DHCP).

Struktura sieci jest zawsze taka sama w ogólnym kształcie (losowaniu podlega tylko liczba elementów i konkretne adresy/reguły):
- łącze **R-ISP ↔ R-CORE** - routing **wyłącznie statyczny**.
- **R-CORE ↔ każdy R-BRANCH** (gwiazda, minimum 3 routery R-BRANCH) - routing **dynamiczny** (wylosowany protokół: RIP albo OSPF).
- pod R-CORE, przez przełącznik(i), wpięte są wszystkie VLAN-y - **każdy** nieserwerowy VLAN ma własną pulę DHCP, a między wybranymi VLAN-ami obowiązuje kilka reguł ACL.

Oceniane jest **działanie końcowe**, zgodne z wylosowanymi wymaganiami.
</div>

## II. Zadania do wykonania

<TopologyGenerator
  title="Wylosowana topologia — projekt zaliczeniowy"
  storageKey="final-generated"
  branchCountRange={[3, 5]}
  switchesRange={[2, 3]}
  vlanCountRange={[3, 5]}
  pcsPerVlanRange={[1, 3]}
  protocolPool={['RIP', 'OSPF']}
/>
Ogólny układ (niezależnie od tego, co konkretnie wylosowałeś/aś powyżej):

```
    [Internet — symulowany]
             |
        (Gi0/0/0)
        R-ISP-X
        (Gi0/0/1)
             |          routing STATYCZNY (jeden wpis ip route w każdą stronę)
        (Gi0/0/0 — do ISP)
        R-CORE-X
        (Gi0/0/1 — trunk)        \  routing DYNAMICZNY (RIP albo OSPF — ta sama
             |                    \  para dla wszystkich odcinków poniżej)
       przełącznik(i)          R-BRANCH1-X   R-BRANCH2-X   R-BRANCH3-X   (...)
        (trunk, wszystkie VLAN-y)
        /      |      \
    VLAN A   VLAN B   VLAN C   (...)   ← dokładna liczba, nazwy, DHCP i ACL — patrz wylosowana lista wyżej
```

## III. Adresacja (schemat — zastosuj do SWOJEJ wylosowanej liczby VLAN-ów)

Segment „internetowy" (zawsze obecny, niezależnie od reszty):

<TopologyBuilder
  title="Adresacja segmentu ISP ↔ CORE"
  storageKey="final-segment"
  topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🌐', label: 'R-ISP' }, fields: [
        { key: 'isp_wan', label: 'do R-CORE - Gi0/0/1', placeholder: (x) => `IP`, type: 'cidr', expectedPrefix: 30, shared: 'final_isp_ip' },
      ]},
      { node: { icon: '🌐', label: 'R-CORE' }, fields: [
        { key: 'core_wan', label: 'do R-ISP - Gi0/0/0', placeholder: (x) => `IP`, type: 'cidr', expectedPrefix: 30, shared: 'final_core_wan_ip' },
      ]},
    ],
  }}
/>

Dla **każdego** wylosowanego VLAN-u (niezależnie od tego, ile ich masz i jak się nazywają) zastosuj tę samą regułę, podstawiając numer VLAN-u (`10`, `20`, `30`, …) i numer swojej grupy (X):

| Co | Wzór |
|---|---|
| Sieć VLAN-u | `Z.Z.<numer_vlanu + X>.0/24` |
| Brama (subinterfejs na R-CORE-X) | `Z.Z.<numer_vlanu + X>.1/24` |
| Adres serwera / stacji statycznej | `Z.Z.<numer_vlanu + X>.10/24` |
| Pula DHCP (dla wylosowanego VLAN-u DHCP) | `.100` – `.199`, wykluczona brama |

Przykład dla grupy X=3, VLAN 20: sieć `Z.Z.23.0/24`, brama `Z.Z.23.1/24`.

Dla **każdego** wylosowanego R-BRANCH (numerowanego kolejno: R-BRANCH1, R-BRANCH2, R-BRANCH3, …) zastosuj tę samą regułę, podstawiając numer branch-a (`N`) i numer swojej grupy (X):

| Co | Wzór |
|---|---|
| Łącze R-CORE ↔ R-BRANCH*N* | `Z.<X>.<100+N>.0/30` |
| Sieć lokalna R-BRANCH*N* (atrapa "oddziału", potrzebna żeby było co ogłaszać routingiem) | `Z.<X>.<N>.0/24` |

Przykład dla grupy X=3, R-BRANCH2: łącze `Z.3.102.0/30`, sieć lokalna `Z.3.2.0/24`.

## IV. Wymagania (kryteria zaliczenia)

<Checklist
title="Lista wymagań do spełnienia"
storageKey="final-wymagania"
sections={[
  {
    title: 'VLAN i przełącznik(i)',
    items: [
      'Utworzone WSZYSTKIE wylosowane VLAN-y, z poprawnymi numerami i nazwami',
      'Porty do komputerów/serwerów w trybie access, w odpowiednim VLAN-ie',
      'Port(y) do R-CORE-X w trybie trunk, przepuszczają wszystkie wylosowane VLAN-y',
    ],
  },
  {
    title: 'Routing wewnętrzny (inter-VLAN)',
    items: [
      'R-CORE-X routuje między wszystkimi VLAN-ami (router-on-a-stick: subinterfejs na każdy VLAN)',
      'Wszystkie urządzenia w różnych VLAN-ach widzą się nawzajem (poza ograniczeniem ACL — patrz niżej)',
    ],
  },
  {
    title: 'Routing wewnętrzny do WSZYSTKICH R-BRANCH (routing dynamiczny)',
    items: [
      'Na R-CORE-X i na KAŻDYM R-BRANCH-X skonfigurowany dokładnie ten protokół routingu dynamicznego, który został wylosowany (RIP albo OSPF — ten sam wszędzie)',
      'KAŻDY R-BRANCH-X i jego sieć lokalna widoczne w tablicy routingu R-CORE-X (show ip route)',
      'R-CORE-X i wszystkie VLAN-y widoczne w tablicy routingu KAŻDEGO R-BRANCH-X',
    ],
  },
  {
    title: 'Routing do R-ISP (routing WYŁĄCZNIE statyczny)',
    items: [
      'Jeden wpis ip route na R-ISP-X wskazujący na sieć R-CORE-X (albo trasa domyślna)',
      'Jeden wpis ip route (trasa domyślna) na R-CORE-X wskazujący na R-ISP-X',
      'Na tym konkretnym łączu NIE skonfigurowano żadnego protokołu dynamicznego',
    ],
  },
  {
    title: 'DHCP',
    items: [
      'Pula DHCP na R-CORE-X dla KAŻDEGO wylosowanego nieserwerowego VLAN-u, wykluczająca adres bramy',
      'Komputery we WSZYSTKICH tych VLAN-ach dostają adres, maskę i bramę automatycznie',
      'VLAN „Serwery" (jeśli wylosowany) pozostaje adresowany statycznie — serwer nie może losowo zmieniać adresu',
    ],
  },
  {
    title: 'ACL — ograniczenie ruchu',
    items: [
      'Skonfigurowane WSZYSTKIE wylosowane reguły ACL (może być ich kilka, nie tylko jedna para VLAN-ów)',
      'Każda reguła: VLAN źródłowy NIE może inicjować połączeń do wskazanego VLAN-u docelowego',
      'Żadna reguła nie blokuje ruchu w drugą stronę (odpowiedzi) ani dostępu do internetu',
    ],
  },
]}
/>

## V. Weryfikacja końcowa

<EditableTable
title="Samodzielna weryfikacja przed oddaniem"
storageKey="final-weryfikacja"
allowAddRows={false}
allowRemoveRows={false}
columns={[
  { key: 'test', label: 'Test', readOnly: true },
  { key: 'wynik', label: 'Wynik / obserwacja' },
]}
initialRows={[
  { test: 'Ping między VLAN-ami (poza kierunkami zablokowanymi przez ACL)', wynik: '' },
  { test: 'Ping we WSZYSTKICH kierunkach zablokowanych przez ACL — musi NIE przechodzić (sprawdź każdą regułę osobno)', wynik: '' },
  { test: 'Stacja z KAŻDEGO nieserwerowego VLAN-u: `ipconfig` — adres przyszedł automatycznie przez DHCP', wynik: '' },
  { test: 'Ping z dowolnej stacji do adresu interfejsu R-ISP-X (test routingu do „internetu")', wynik: '' },
  { test: 'show ip route na R-CORE-X — WSZYSTKIE R-BRANCH i ich sieci lokalne widoczne', wynik: '' },
  { test: 'show ip route na KAŻDYM R-BRANCH — R-CORE i wszystkie VLAN-y widoczne', wynik: '' },
  { test: 'show ip route na R-CORE-X — trasa do R-ISP oznaczona jako statyczna (S), NIE jako wynik protokołu dynamicznego', wynik: '' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: show run na R-CORE-X" />
<ScreenshotPaste label="Zrzut ekranu: cała topologia w Packet Tracer" />

<OpenQuestion
  title="Podsumowanie projektu"
  question="Opisz krótko, jak podzieliłeś/aś pracę nad projektem na etapy, z czym miałeś/aś największy problem i jak go rozwiązałeś/aś. Gdybyś miał/a rozbudować tę sieć o kolejny VLAN, co dokładnie trzeba by zmienić w konfiguracji R-CORE-X?"
  minLength={80}
  storageKey="final-podsumowanie"
/>

Zapisz plik `.pkt` — to on, razem z odpowiedziami powyżej, jest przedmiotem oceny.
