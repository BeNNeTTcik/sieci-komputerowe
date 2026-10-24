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

### Subnetting

<div className="justify">
**Subnetting** (podział na podsieci) to podział jednej sieci IPv4 na kilka mniejszych podsieci przez „pożyczenie” bitów z części hosta adresu. Umożliwia to wydzielanie różnych podsieci sieci dla różnych funckji. Czyli zamiast jednej sici np. `192.168.0.0/24`, można podzielić na kilka niezależnych mniejszych podsieci. Dla pracowni (podsieć `192.168.0.0/25`), biuro (podsieć `192.168.0.128/27`) czy interfejs routera - router (podsieć `192.168.0.160/30`) można wykorzystać różne oddzielone sieć manipulując jedynie parametrem **maski sieciowej**. Istnieją dwa sposoby na wyliczanie parametrów podsieci, najprostsza metoda to ["Magic Number Method"](https://oneuptime.com/blog/post/2026-03-20-subnetting-magic-number-method/view) i [Metoda binarna oraz VLSM](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html).
</div>

<StepByStep>
<Step title="IPv4">
#### IPv4 - metoda "Magic Number Method"

<div className="justify">
Najszybciej liczy się bez zamiany na system dwójkowy: magiczna liczba = 256 − „ciekawy” oktet maski, a kolejne podsieci zaczynają się co tyle adresów. „Ciekawy” oktet to pierwszy oktet maski, który nie jest ani 255, ani 0. Zasada działa również na trzecim czy drugim oktecie (np. /20 → 255.255.240.0 -> blok 16 w trzecim oktecie). W ostatnim oktecie broadcastu jest 255.
</div>

1. Zapisz dane zadania - adres sieci z prefiksem (np. 192.168.0.0/24) i ile podsieci albo ile hostów potrzebujesz.
2. Policz pożyczone bity n - najmniejsze n, dla którego 2^n ≥ liczba podsieci (np. 4 podsieci -> n = 2, bo 2² = 4). Jeśli zadanie podaje liczbę hostów: najmniejsze h, dla którego 2^h - 2 ≥ liczba hostów.
3. Wyznacz nowy prefiks - stary prefiks + n (np. /24 + 2 = /26).
4. Zamień prefiks na maskę - odczytaj z tabeli poniżej (/26 -> 255.255.255.192).
5. Policz magiczną liczbę - 256 - ciekawy oktet (256 - 192 = 64).
6. Wypisz adresy podsieci - 0, M, 2M, 3M… w ciekawym oktecie (0, 64, 128, 192).
7. Dla każdej podsieci wyznacz resztę:
      - broadcast = adres następnej podsieci - 1,
      - pierwszy host = adres sieci + 1,
      - ostatni host = broadcast - 1.

**Przykład**

W Tabeli 1 przedstawiono przykład subnettingu dla adresu `192.168.0.0` i maski `255.255.255.192` lub prefiks CIDR `/26`.

Tab. 1 Podsieci dla adresu 192.168.0.0/26
| Adres sieci | Pierwszy host | Ostatni host | Broadcast |
|---|---|---|---|
| 192.168.0.0/26 | 192.168.0.1 | 192.168.0.62 | 192.168.0.63 |
| 192.168.0.64/26 | 192.168.0.65 | 192.168.0.126 | 192.168.0.127 |
| 192.168.0.128/26 | 192.168.0.129 | 192.168.0.190 | 192.168.0.191 |
| 192.168.0.192/26 | 192.168.0.193 | 192.168.0.254 | 192.168.0.255 |
</Step>

<Step title="IPv6">
</Step>
</StepByStep>

Kalkulator dla [IPv4 i IPv6](https://www.calculator.net/ip-subnet-calculator.html) do weryfikacji.

---

### Segmentacja

<div className="justify">
**Segmentacja** to podział sieci na mniejsze, odseparowane części (segmenty), między którymi ruch przechodzi wyłącznie w kontrolowany sposób, np. przez router, przełącznik warstwy 3 lub zaporę. Przeciwieństwem **segmentacji** jest **płaska sieć**, w której wszystkie urządzenia należą do jednego segmentu (np. wszystkie urządzenia w sieci `192.168.0.0/24`). Taka sieć jest prosta w budowie, ale każdy host widzi rozgłoszenia wszystkich pozostałych. Czego skutkiem infekcja jednego z urządzeń może bez przeszkód rozporopagować się na całą sieć. Segmentacja ogranicza więc trzy rzeczy jednocześnie: **zasięg rozgłoszeń** (wydajność), **zasięg awarii i ataku** (bezpieczeństwo) oraz **zakres uprawnień**, gdzie np. reguły dostępu można zapisać dla całego segmentu zamiast dla pojedynczych adresów [^nist41][^cisco-seg]. W Tabeli 2 przedstawiono najczęściej stosowane rodzaje segmentacji.
</div>

Tab. 2 Rodzaje segmentacji
| Typ | Opis | Zastosowanie |
|---|---|---|
| **Fizyczna** | Wykorzystanie oddzielnych switchy, routerów lub kabli do rozdzielenia sieci | Całkowite oddzielenie systemów, np. sieci domowej od firmowej, czy sal laboratoryjnych od pokojów pracowniczych |
| **VLAN (warstwa 2)** | Podział w obrębie jednej infrastruktury fizycznej | Ekonomiczne rozwiązanie, ponieważ umożlwia separacje na poziomie logicznym na jedyn urządzeniu fizycznym |
| **Podsieci IP (warstwa 3)** | Każdy segment ma własną podsieć i bramę | Stosowana razem z VLAN-ami, zasada „jeden VLAN = jedna podsieć”; pozwala filtrować ruch listami ACL po prefiksie |

<div className="justify">
**Segmetnacja fizyczna** polega na zbudowaniu dla każdej sieci osobnej infrastruktury: oddzielnych przełączników, routerów, punktów dostępowych i okablowania. Segmenty nie mają żadnego wspólnego urządzenia, przez które ruch mógłby przejść „na skróty”, dlatego ich rozdzielenie nie zależy od poprawności konfiguracji. Nawet błąd administratora czy luka w oprogramowaniu przełącznika nie połączy sieci, które fizycznie nie są ze sobą połączone.

Główną zaletą segmentacji fizycznej jest najwyższy poziom izolacji, którego nie da się obejść atakami np. na warstwę 2 - VLAN. Zasada działania jest prosta i łatwa do sprawdzenia, ponieważ wystarczy prześledzić okablowanie. Awaria lub przeciążenie jednego segmentu nie wpływa na pozostałe, a brak wspólnych urządzeń oznacza brak pojedynczego punktu awarii dla wszystkich sieci. Ceną jest wysoki koszt, bo każdy segment wymaga własnego sprzętu, okablowania i miejsca w szafach. Rozwiązanie jest też mało elastyczne: przeniesienie stanowiska do innego segmentu wymaga zmiany okablowania, przełączniki często pracują z wieloma wolnymi portami, a większa liczba urządzeń oznacza więcej pracy przy aktualizacjach, monitorowaniu i dokumentacji.
</div>

<div className="justify">
**VLAN (Virtual Local Area Network)** pozwala logicznie podzielić jedną fizyczną sieć lokalną na wiele wirtulanych sieci lokalnych (maksymalnie 4094). Hosty podłączone do przełącznika komunikują sie ze sobą tak jakby tylko one były podłączone do przełącznika. Każda grupa tworząca VLAN posiada swoją domenę rozgłoszeniową, co oznacza że dane rozgłoszenie trafia tylko do portów z danej grupy [^kurose]. Dwa komputery podłączone do tego samego przełącznika, ale przypisane do różnych VLAN-ów, są dla siebie nawzajem niewidoczne, jakby zostały podłączone do dwóch róznych urządzeń, a w rzeczywsitości dzielą ten sam jeden kabel i jeden port przełącznika.

Każdy z portów może działać w jednym z dwóch trybów pracy (niektórzy producenci udostępniają trzeci tryb - *port general*):
</div>
- **port access (UNTAG)** - należy do jednego, konkretnego VLAN-u; podłącza się do niego urządzenia końcowe np. PC, serwer, drukarka. Urządzenia te nie wiedzą, że VLAN-y w ogóle istnieją.
- **port trunk (TAG)** - przenosi ruch wielu VLAN-ów jednocześnie przez jeden fizyczny kabel; używany w relacji przełącznik -> przełącznik lub przełącznik -> router.

Dobre praktyki: osobna VLAN zarządzania urządzeniami, zmiana VLAN natywnego z 1 na nieużywany, nieużywane porty w wyłączonym VLAN-ie „czarna dziura”.

<div className="justify">
**Segmentacja w warstwie 3** polega na przydzieleniu każdemu segmentowi własnej podsieci IP i własnej bramy domyślnej [^RFC950]. Host porównuje adres docelowy ze swoją maską: ruch do adresów z tej samej podsieci wysyła bezpośrednio, a do wszystkich pozostałych sieci przez bramę. Dzięki temu każdy pakiet przechodzący między segmentami musi trafić do routera lub przełącznika warstwy 3, który staje się naturalnym **punktem kontroli ruchu**. To właśnie na jego interfejsach stosuje się listy ACL, a ponieważ cały segment opisuje jeden prefiks, regułę dla setek hostów można zapisać jedną linią, np. `deny ip 10.1.40.0 0.0.0.255 10.1.0.0 0.0.255.255` zamiast osobnego wpisu dla każdego komputera.

Segmentację warstwy 3 stosuje się zazwyczaj razem z VLAN-ami, zgodnie z zasadą **„jeden VLAN = jedna podsieć”**. VLAN wyznacza domenę rozgłoszeniową, a podsieć wyznacza zakres adresów, w którym hosty komunikują się bez routera. Jeśli obie granice się pokrywają, zapytania ARP i DHCP docierają dokładnie do tych urządzeń, do których powinny, a każda brama obsługuje dokładnie jeden segment.

Skuteczność tej metody zależy od przemyślanego **planu adresacji**. Najwygodniej powiązać adres podsieci z numerem VLAN-u, np. VLAN 10 – `10.1.10.0/24` z bramą `10.1.10.1`, VLAN 20 – `10.1.20.0/24` z bramą `10.1.20.1`. Taki plan jest czytelny bez dokumentacji, a podsieci wyrównane do granic prefiksów można sumaryzować w tablicach routingu i listach ACL. W IPv6 zasada pozostaje ta sama, a każdy segment otrzymuje własny prefiks `/64`.
</div>

---

Kontrola dostepu acl + dostep do urzadzen sieciowych


## II. Zadania do wykonania

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

[^sekurak1]: Sekurak.Academy - Szkolenie: "Bezpieczna architektura sieci w małej firmie i mikroprzedsiębiorstwie.", 07.2025.

[^nist41]: NIST SP 800-41 Rev. 1 – [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), NIST, 2009.

[^cisco-seg]: Cisco Networking Academy – *Switching, Routing and Wireless Essentials v7*, moduł 3 (VLAN) i moduł 10 (bezpieczeństwo LAN).

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006. 

[^RFC950]: [RFC 950](https://www.rfc-editor.org/rfc/rfc950) – Internet Standard Subnetting Procedure, 1985.