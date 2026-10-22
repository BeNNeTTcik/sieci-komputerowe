---
sidebar_position: 3
title: "Ćwiczenie 3: Podsieci, segmentacja i kontrola ruchu"
---

<!--- import bibliotek -->
import Checklist from '@site/src/components/Checklist';
import DesignScenario from '@site/src/components/DesignScenario';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SubnetTrainer from '@site/src/components/SubnetTrainer';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';

# Ćwiczenie 3: Podsieci, segmentacja i kontrola ruchu

<SprawozdanieHeader
  thema="Administrowanie sieciami"
  exerciseTitle="Ćwiczenie 3: Podsieci, segmentacja i kontrola ruchu"
  storageKey="cwiczenie-3"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-3"
  storageKeys={[]}
  sharedPrefix="cw3_"
/>

## I. Wprowadzenie

Subnetting (2 sposoby)

VLAN

Kontrola dostepu acl + dostep do urzadzen sieciowych

### Obliczanie parametrów sieci

<div className="justify">
**Adres IP** składa się z dwóch części. Jedna z nich określa, do której sieci należy host o danym adresie (tzw. **część sieci**), druga jednoznacznie identyfikuje hosta w ramach tejże sieci (tzw. **część hosta**). Do oddzielenia części sieci od części hosta służy maska sieciowa. Ma ona taką samą długość, co adres IP. Tam, gdzie w masce sieciowej występuje wartość 1, odpowiadające jej bity w adresie IP należą do części sieci. Analogicznie, te bity, które w masce mają wartość 0, należą do części hosta. Ważne: w masce sieciowej bity o wartości 1 nie mogą być przerywane zerami.
</div>

<SubnetTrainer
  countIPv4={2}
  countIPv6={2}
  title="Adresacja IPv4/IPv6"
  storageKey="adresacja-trener"
/>

### Budowanie sieci od podstaw

W tym zadaniu krok po kroku można przejsc przez projektowanie sieci dla IPv4. Pierwszy etap polega na wylosowaniu przykładowej sieci. Następnie przechodząc po kolejnych etapach uzyskujemy sieć możliwą do wdrożenia w realnym scenariuszu.
<DesignScenario />

<StepByStep>
<Step title="Krok I:  Analiza wymagań">
Należy przenieść dane ze scenariusza do tabeli: kliknij **"Kopiuj tabele"** pod tabelą scenariusza, a potem kliknąć pierwszą komórkę (np. Krok 1) poniżej i wkleić (Ctrl+V).

Następnie policz, ile urządzeń będzie w każdej grupie po zakładanym wzroście (zaokrąglijcie w górę). W kolumnie „Uwagi” zapisz wszystko, co może wpłynąć na projekt: grupa jest w kilku miejscach, ma szczególne wymagania, będzie dużo większa od innych. Tabelę 2 można dowolnie poprawiać: dzielić grupy, łączyć je, dopisywać nowe.

<EditableTable
title="Tab. 2 Wymagania docelowe"
storageKey="proj14-wymagania"
columns={[
{ key: 'grupa', label: 'Grupa' },
{ key: 'gdzie', label: 'Gdzie' },
{ key: 'dzis', label: 'Dziś' },
{ key: 'dostep', label: 'Wymagania dostępu' },
{ key: 'docelowo', label: 'Docelowo (po wzroście)' },
{ key: 'uwagi', label: 'Uwagi' },
]}
initialRows={[{}, {}, {}]}
/>
</Step>

<Step title="Krok II: Podział na VLAN-y">
Trzeba określić, ile VLAN-ów potrzebujesz i które grupy do nich trafią. Dwie grupy mogą dzielić VLAN tylko wtedy, gdy obowiązują je **identyczne** zasady dostępu. W kolumnie „Przełączniki” wpisz, na których przełącznikach VLAN musi istnieć. Mówi to które trunki muszą go przepuszczać. Wypełnij danymi Tabele 3.

<EditableTable
title="Tab. 3 Plan VLAN"
storageKey="proj14-vlan"
columns={[
{ key: 'vlan', label: 'Numer VLAN', checkDuplicates: true },
{ key: 'nazwa', label: 'Nazwa', checkDuplicates: true },
{ key: 'grupy', label: 'Grupy w tym VLAN-ie' },
{ key: 'przelaczniki', label: 'Przełączniki' },
{ key: 'uzasadnienie', label: 'Dlaczego osobny VLAN' },
]}
initialRows={[{}, {}, {}]}
/>

<KeywordAnswer
title="Dlaczego nie VLAN 1?"
question="Dlaczego nie należy używać VLAN 1 dla żadnej grupy użytkowników ani do zarządzania?"
keywords={['domyśln', 'domysln', 'default']}
explanation="VLAN 1 jest domyślnym VLAN-em każdego portu przełącznika Cisco i domyślnym VLAN-em natywnym na trunkach. Każde nowo podłączone lub nieskonfigurowane urządzenie trafia do niego automatycznie, więc ruch użytkowników albo zarządzanie w VLAN 1 byłyby dostępne dla każdego, kto wepnie się w wolny port."
storageKey="proj14-vlan1"
/>
</Step>

<Step title="Krok III: Reguła adresacji">
Zanim wpiszesz jakikolwiek adres, ustal **regułę**, z której adresy wynikają. Do dyspozycji masz pulę 10.X.0.0/16. Dobra reguła odpowiada na pytania:
- jak z numeru VLAN-u (albo lokalizacji) powstaje adres podsieci,
- jaki rozmiar ma podsieć i co zrobić z grupą, która się w nim nie mieści,
- który adres w podsieci ma brama, które adresy są stałe (serwery, drukarki), a które rozdaje DHCP,
- skąd biorą się adresy łączy między routerami, Loopbacków i zarządzania,
- (scenariusze z kilkoma lokalizacjami) jak podzielić pulę, żeby każdą lokalizację opisywał jeden blok adresów,
- (scenariusze z tunelem IPsec) jakie adresy mają łącza do ISP. W Packet Tracerze użyjcie adresów dokumentacyjnych 203.0.113.0/24 lub 198.51.100.0/24 jako „publicznych”.

<OpenQuestion
  title="Nasza reguła adresacji"
  question="Opiszcie Waszą regułę adresacji tak, żeby inna osoba, znając tylko numer VLAN-u (i lokalizację), umiała bez pytania wyznaczyć adres podsieci, bramy, serwera i zakres DHCP. Podajcie jeden przykład wyliczenia."
  minLength={120}
  storageKey="proj14-regula"
/>
</Step>

<Step title="Krok IV: Plan adresacji">
Zastosuj regułę do każdego VLAN-u w Tabeli 4.

<EditableTable
title="Tab. 4 Plan adresacji podsieci użytkowników"
storageKey="proj14-adresacja"
columns={[
{ key: 'vlan', label: 'VLAN' },
{ key: 'v4', label: 'Podsieć (CIDR)', checkDuplicates: true },
{ key: 'maska', label: 'Maska' },
{ key: 'gw4', label: 'Brama', checkDuplicates: true },
{ key: 'hosty', label: 'Hostów w podsieci / potrzeba' },
{ key: 'dhcp', label: 'Zakres DHCP / adresy stałe' },
]}
initialRows={[{}, {}, {}]}
/>

Teraz infrastruktura. Wszystko, co nie jest siecią użytkowników należy wpisac do Tabeli 5: łącza między routerami (także do ISP), interfejsy Loopback, adresy zarządzania przełączników (interfejs SVI w VLAN-ie zarządzania), stałe adresy serwerów i urządzeń, do których odwołują się reguły dostępu.

<EditableTable
title="Tab. 5 Adresy infrastruktury i urządzeń stałych"
storageKey="proj14-infrastruktura"
columns={[
{ key: 'urzadzenie', label: 'Urządzenie' },
{ key: 'interfejs', label: 'Interfejs' },
{ key: 'v4', label: 'Adres / prefiks', checkDuplicates: true },
{ key: 'opis', label: 'Opis' },
]}
initialRows={[{}, {}, {}]}
/>
</Step>

<Step title="Krok V: Topologia">
Narysuj topologię w Packet Tracerze albo w programie do diagramów (np. draw.io). Diagram musi pokazywać:
- wszystkie routery i przełączniki ze scenariusza oraz nazwy i numery ich portów,
- które łącza są trunkami (i jakie VLAN-y przepuszczają), a które portami dostępowymi,
- gdzie odbywa się routing między VLAN-ami i gdzie jest wyjście do internetu,
- adresy łączy między routerami i podsieci VLAN-ów.

<ScreenshotPaste label="Diagram topologii z adresacją" />
<OpenQuestion
  title="Słabe punkty"
  question="Awaria którego pojedynczego urządzenia lub łącza w Waszej topologii odetnie najwięcej użytkowników? Jak można by to poprawić, gdyby klient miał większy budżet?"
  modelAnswer="Zwykle jest to router (bez niego nie działa routing między VLAN-ami ani internet) albo pojedyncze łącze między budynkami lub lokalizacjami. Poprawa: drugi router lub przełącznik L3 z protokołem redundancji bramy (HSRP/VRRP), drugie łącze prowadzone inną trasą, agregacja łączy (EtherChannel), zapasowe łącze WAN (np. VPN przez internet jak w ćwiczeniu 11)."
  minLength={60}
  storageKey="proj14-slabe-punkty"
/>
</Step>

<Step title="Krok VI: Zasady dostępu i szkic ACL">
Przełóż wymagania dostępu ze scenariusza na reguły. Każdy wiersz to jedno „wolno” (allow) albo „nie wolno” (deny). Na tej podstawie zaplanuj listy ACL tak, jak w ćwiczeniu 12: jaka lista, na którym interfejsie (podinterfejsie) routera i w którym kierunku. W tym celu wypełnij Tabele 6.

<EditableTable
title="Tab. 6 Zasady dostępu"
storageKey="proj14-acl"
columns={[
{ key: 'zrodlo', label: 'Źródło (VLAN / host)' },
{ key: 'cel', label: 'Cel (VLAN / host / internet)' },
{ key: 'decyzja', label: 'Zezwól / zablokuj' },
{ key: 'acl', label: 'Lista ACL (nazwa / numer)' },
{ key: 'gdzie', label: 'Interfejs i kierunek (in/out)' },
]}
initialRows={[{}, {}, {}]}
/>

<OpenQuestion
  title="Kolejność reguł"
  question="Napiszcie (bez wpisywania do routera) jedną kompletną listę ACL z Twojego planu, łącznie z wierszem kończącym."
  minLength={80}
  storageKey="proj14-acl-szkic"
/>

</Step>

<Step title="Krok VII: Wdrożenie w Packet Tracer">
Zbuduj w Packet Tracerze sieć według Twojego projektu. Polecenia zapisz z pamieci lub skorzystaj ze ściągawki Cisco.

Minimalny zakres wdrożenia:
<Checklist
title="Wdrożenie"
storageKey="proj14-wdrozenie"
sections={[
{ title: 'Przełączniki', items: [
'Wszystkie VLAN-y z planu utworzone i nazwane na każdym przełączniku, na którym są potrzebne',
'Porty dostępowe w odpowiednich VLAN-ach, trunki między przełącznikami i do routera',
'Adres zarządzania na każdym przełączniku (SVI w VLAN-ie zarządzania) i brama domyślna',
]},
{ title: 'Router(y)', items: [
'Podinterfejs (albo SVI na przełączniku L3) dla każdego VLAN-u z adresem zgodnym z planem',
'DHCP dla VLAN-ów użytkowników, adresy stałe dla serwerów i urządzeń z wymaganiami dostępu',
'Łącza między routerami i Loopbacki zaadresowane zgodnie z planem; routing między lokalizacjami albo tunel IPsec (jeśli scenariusz ich wymaga)',
]},
{ title: 'Zasady dostępu', items: [
'Co najmniej dwie listy ACL z kroku 6 wdrożone i sprawdzone (ruch dozwolony przechodzi, zablokowany — nie)',
]},
{ title: 'Testy', items: [
'Ping między co najmniej dwoma VLAN-ami, które według planu mogą się komunikować',
'Ping, który według planu ma NIE przejść, rzeczywiście nie przechodzi',
]},
]}
/>

<ScreenshotPaste label="Zrzut ekranu: topologia w Packet Tracer" />
<ScreenshotPaste label="Zrzut ekranu: show ip interface brief i show ip route na routerze" />
<ScreenshotPaste label="Zrzut ekranu: test ACL — ping dozwolony i ping zablokowany" />
<OpenQuestion
  title="Co poszło inaczej niż w planie?"
  question="Co musieliście zmienić w projekcie podczas wdrażania (adres, VLAN, port, reguła ACL) i dlaczego plan tego nie przewidział?"
  minLength={50}
  storageKey="proj14-zmiany-wdrozenie"
/>
</Step>
</StepByStep>

