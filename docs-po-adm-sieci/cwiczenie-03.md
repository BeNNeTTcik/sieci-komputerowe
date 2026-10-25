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
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SubnetTrainer from '@site/src/components/SubnetTrainer';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import CodeBlock from '@site/src/components/CodeBlock';
import SharedValue from '@site/src/components/SharedValue';

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
**Subnetting** (podział na podsieci) to podział jednej sieci IPv4 (lub IPv6) na kilka mniejszych podsieci przez „pożyczenie” bitów z części hosta adresu. Umożliwia to wydzielanie różnych podsieci sieci dla różnych funckji. Czyli zamiast jednej sici np. `192.168.0.0/24`, można podzielić na kilka niezależnych mniejszych podsieci. Dla pracowni (podsieć `192.168.0.0/25`), biuro (podsieć `192.168.0.128/27`) czy interfejs routera - router (podsieć `192.168.0.160/30`) można wykorzystać różne oddzielone sieć manipulując jedynie parametrem **maski sieciowej**. Istnieją dwa sposoby na wyliczanie parametrów podsieci dla IPv4, najprostsza metoda to ["Magic Number Method"](https://oneuptime.com/blog/post/2026-03-20-subnetting-magic-number-method/view) i [Metoda binarna oraz VLSM](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html). Dla IPv6 wykorzystuje się sposób opisany przez [Cisco - IPv6 Subnetting: Overview and Case Study](https://community.cisco.com/t5/networking-knowledge-base/ipv6-subnetting-overview-and-case-study/tac-p/3125703) oraz [APNIC - Calculating IPv6 subnets outside the nibble boundary](https://blog.apnic.net/2018/08/10/how-to-calculating-ipv6-subnets-outside-the-nibble-boundary/)
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
#### IPv6 - podział po cyfrach szesnastkowych (nibble)
<div className="justify">
W IPv6 nie dobiera się rozmiaru podsieci do liczby hostów. Każda sieć z urządzeniami końcowymi ma prefiks **/64**, ponieważ ostatnie 64 bity adresu to identyfikator interfejsu, na którym opiera się m.in. autokonfiguracja SLAAC [^RFC4291][^RFC7421]. Subnetting sprowadza się więc do podzielenia prefiksu otrzymanego od operatora na odpowiednią liczbę podsieci /64. Firmy dostają zwykle prefiks /48, a klienci indywidualni /56 [^RFC6177][^ripe690]. Najprościej dzielić **po pełnych cyfrach szesnastkowych**: jedna cyfra to 4 bity (*nibble*), więc wydłużenie prefiksu o 4 bity zmienia dokładnie jedną cyfrę adresu. W przykładach używa się prefiksu dokumentacyjnego `2001:db8::/32` [^RFC3849].
</div>

1. Zapisz dane zadania - prefiks (np. `2001:db8:acad::/48`) i liczbę potrzebnych podsieci.
2. Rozwiń skrócony zapis do pełnych grup po 4 cyfry (`2001:0db8:acad:0000::`) - łatwiej wtedy policzyć pozycję cyfry.
3. Policz pożyczone bity n - najmniejsze n, dla którego 2^n ≥ liczba podsieci, zaokrąglone w górę do wielokrotności 4 (np. 10 podsieci -> 2⁴ = 16, więc n = 4).
4. Wyznacz nowy prefiks - stary prefiks + n (/48 + 4 = /52).
5. Znajdź „ciekawe” cyfry - są to cyfry od numeru (stary prefiks ÷ 4) + 1 do numeru (nowy prefiks ÷ 4), licząc od lewej. Dla /48 -> /52 jest to 13. cyfra, czyli pierwsza cyfra czwartej grupy.
6. Wypisz podsieci - zwiększaj ciekawą cyfrę o 1: 0, 1, 2 … 9, a, b … f.
7. Dla każdej podsieci wyznacz zakres:
      - pierwszy adres = adres podsieci,
      - ostatni adres = wszystkie cyfry za ciekawą cyfrą ustawione na `f`.

<div className="justify">
W IPv6 **nie ma adresu rozgłoszeniowego** (jego rolę przejął multicast), więc nie odejmuje się dwóch adresów jak w IPv4. Adres z samymi zerami w identyfikatorze interfejsu jest zarezerwowany jako *subnet-router anycast* [^RFC4291], dlatego bramie domyślnej nadaje się zwykle adres `::1`.
</div>

**Przykład**

Szkoła otrzymała prefiks `2001:db8:acad::/48` i potrzebuje 10 podsieci dla budynków. Pożyczamy 4 bity, a nowy prefiks to `/52`. Kolejne podsieci przedstawiono w Tabeli 2.

Tab. 2 Podsieci dla prefiksu 2001:db8:acad::/48 podzielonego na /52
| Podsieć | Pierwszy adres | Ostatni adres |
|---|---|---|
| 2001:db8:acad::/52 | 2001:db8:acad:0000:: | 2001:db8:acad:0fff:ffff:ffff:ffff:ffff |
| 2001:db8:acad:1000::/52 | 2001:db8:acad:1000:: | 2001:db8:acad:1fff:ffff:ffff:ffff:ffff |
| 2001:db8:acad:2000::/52 | 2001:db8:acad:2000:: | 2001:db8:acad:2fff:ffff:ffff:ffff:ffff |
| … | … | … |
| 2001:db8:acad:f000::/52 | 2001:db8:acad:f000:: | 2001:db8:acad:ffff:ffff:ffff:ffff:ffff |

<div className="justify">
Każda podsieć /52 mieści 2¹² = 4096 sieci /64. Budynek A (`2001:db8:acad::/52`) może więc nadać VLAN-om prefiksy z numerem VLAN-u w czwartej grupie, np. VLAN 10 – `2001:db8:acad:10::/64` z bramą `2001:db8:acad:10::1`.
</div>

:::tip[Podział poza granicą cyfry]
Gdy potrzebne są np. tylko 4 podsieci, wystarczy pożyczyć n = 2 bity (/48 -> /50). Ciekawa cyfra zmienia się wtedy co 2^(4−2) = 4, czyli tak jak „magiczna liczba” w IPv4: `2001:db8:acad::/50`, `2001:db8:acad:4000::/50`, `2001:db8:acad:8000::/50`, `2001:db8:acad:c000::/50`. Taki podział jest poprawny, ale trudniej go czytać, dlatego w praktyce zaleca się granice cyfr (/48, /52, /56, /60, /64).
:::
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

### Kontrola ruchu

<div className="justify">
Łącząc powyższe metody segmentacji do zaadresowania zostaje ostatni mechanizm - "kontrola ruchu". Segmentacja dzieli sieć na części, ale sama nie decyduje, jaki ruch może przepływać między nimi. Tę rolę pełnią mechanizmy **kontroli ruchu**, działające na routerach, przełącznikach warstwy 3 i zaporach. Są to miejsca przez które przechodzi ruch między segmentami. Każdy z nich odpowiada na inne pytanie:
- **listy ACL** i **zapory** - *Czy pakiet może przejść?*
- **NAT/PAT** - *Pod jakim adresem opuści sieć?*
- **QoS** - *W jakiej kolejności i z jakim priorytetem zostanie obsłużony?*
</div>

#### Listy kontroli dostępu (ACL)

<div className="justify">
**Listy ACL (Access Control List)** filtrują ruch IP na podstawie zdefiniowanych reguł. Urządzenie sprawdza pakiet po kolei od góry listy i stosuje pierwszą pasującą regułę (`permit` lub `deny`) wtedy reszta wpisów jest ignorowana. Na końcu każdej listy ACL znajduje się niewidoczne, domniemane `deny any`, gdy żadna reguła nie pasuje wtedy pakiet zostaje odrzucony [^cisco]. Listę przypisuje się do interfejsu w określonym kierunku: `in` filtruje pakiety wchodzące do urządzenia, a `out` wychodzące. Na jednym interfejsie może działać jedna lista na protokół (IPv4, IPv6) i kierunek. Poniżej na Rysunku 1 przedstawiono sposob przetwarzania reguł na routerze.
</div>

![Rys1](/img/po-adm-sieci-3/acl_przetwarzanie.png)

<div className="text-center">
Rys.1 Przetwarzanie reguł ACL [^claude]
</div>

<div className="justify">
W urządzeniach Cisco wyróżnia się **listy standardowe**, które sprawdzają wyłącznie adres źródłowy, oraz **listy rozszerzone**, które mogą uwzględniać adres źródłowy i docelowy, protokół (IP, TCP, UDP, ICMP) oraz numery portów [^cisco-acl][^sedayao]. Ze względu na ten zakres listę standardową umieszcza się **jak najbliżej celu**, żeby nie zablokować ruchu do innych sieci, a rozszerzoną umieszcza się **jak najbliżej źródła**, żeby niepożądany ruch był odrzucany, zanim obciąży dalszą część sieci [^netacad-ensa][^odom]. Listy ACL są **bezstanowe**: oceniają każdy pakiet osobno i nie wiedzą, czy jest on odpowiedzią na wcześniej dozwolone połączenie [^nist41].
</div>

Tab. 3 Dwa rodzaje list ACL
| | Standardowa | Rozszerzona |
|---|---|---|
| Zakres numerów | 1-99 i 1200-1999 | 100-199 i 2000-2699 |
| Wykorzystanie | `ip access-list standard <NAZWA>` | `ip access-list extended <NAZWA>` |
| Filtruje po | wyłącznie adresie źródłowym | adresie źródłowym, docelowym, protokole (IP/TCP/UDP/ICMP) i porcie |

:::warning
Konfigurowanie Access Control List trzeba przejść świadomie i z wielką uwagą, ponieważ w bradzo prosty sposób można odciąć samego siebie od sieci i dostepu podając złe parametry fitrów.
:::

#### Zapora sieciowa (firewall)

<div className="justify">
**Zapora sieciowa** to urządzenie lub oprogramowanie egzekwujące politykę bezpieczeństwa między strefami o różnym poziomie zaufania, np. między Internetem, siecią DMZ i siecią wewnętrzną. Najprostsze zapory działają jak listy ACL i filtrują pakiety według adresów i portów. Podstawą współczesnych zapór jest jednak **inspekcja stanowa (stateful)**: zapora prowadzi tablicę aktywnych połączeń i automatycznie przepuszcza odpowiedzi na ruch, który sama wcześniej dopuściła. Dzięki temu wystarczy reguła „sieć wewnętrzna może łączyć się z Internetem na porcie 443”, bez osobnej reguły dla ruchu powrotnego, a pakiety niepasujące do żadnego połączenia są odrzucane. Rysunek 2 przedstawia umiejscowienie zapory sieciowej oraz zakres pracy zapory.

![Rys2](/img/po-adm-sieci-3/firewall.png)
<div className="text-center">
Rys. 2 Zapora sieciowa – strefy, polityka i inspekcja stanowa [^claude]
</div>

Opracowano również zasady dla **Zapory nowej generacji (NGFW)** analizują dodatkowo zawartość ruchu: rozpoznają aplikacje niezależnie od portu, wykrywają i blokują ataki (IPS), filtrują adresy stron WWW, sprawdzają pliki pod kątem złośliwego oprogramowania i mogą wiązać reguły z użytkownikiem, a nie tylko z adresem IP. Zapora powinna obejmować zarówno IPv4, jak i IPv6, ponieważ reguły zapisane tylko dla jednego protokołu pozostawiają drugi bez kontroli.
</div>

#### Jakość usług (QoS)

<div className="justify">
**QoS (Quality of Service)** to zestaw mechanizmów, które przy przeciążeniu łącza decydują, który ruch zostanie obsłużony w pierwszej kolejności, a który może zostać opóźniony lub odrzucony. Kontroluje się w ten sposób cztery parametry: **przepustowość**, **opóźnienie**, **zmienność opóźnienia (jitter)** i **straty pakietów**. Ich znaczenie zależy od rodzaju ruchu, np.: przesyłanie pliku z dużym opóźnieniem dla rozmowa VoIP lub wideokonferencja staje się nieczytelne już przy opóźnieniu rzędu 150 ms lub kilku procentach strat. QoS nie zwiększa przepustowości łącza, a jedynie rozdziela ją według ustalonych priorytetów, dlatego ma sens tylko tam, gdzie może dojść do przeciążenia, np. na łączu WAN lub do Internetu.
</div>

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

### Segmentacja

#### Etap 1. Segmentacja fizyczna

<div className="justify">
Szkoła ma 4 pomieszczenia: 2x pracownia uczniów (U1.X i U2.X), pokój nauczycielski (N.X), w której stoi również serwer dziennika elektronicznego. W głównej serwerowni znajduje się przestrzeń na zebranie całej infrastruktury.
</div>

Tab. 5 Urządzenia etapu 1

| Urządzenie | Port przełącznika | Adres w sieci płaskiej |
|---|---|---|
| PC-U1.1 | SW-U Fa0/1 | 192.168.1.11/24 |
| PC-U2.1 | SW-U Fa0/2 | 192.168.1.12/24 |
| PC-N.1 | SW-N Fa0/3 | 192.168.1.21/24 |
| SRV-DZIENNIK (usługa HTTP włączona) | SW-N Fa0/10 | 192.168.1.50/24 |

<StepByStep>
<Step title="1.1 Sieć płaska">

### scenatriusz dla mojego projektu

Połącz przełączniki kablem (SW-U G0/1 – SW-N G0/1) i nadaj adresy z Tabeli 5. Przejdź w tryb **Simulation**, w *Edit Filters* zostaw tylko **ARP** i **ICMP**, a następnie z PC-U1 wyślij ping do PC-U2. Potem z PC-U1 otwórz w przeglądarce stronę `http://192.168.1.50`.

<EditableTable
title="Tab. 6 Sieć płaska"
storageKey="cw3_e1_plaska"
columns={[
{ key: 'test', label: 'Test', readOnly: true },
{ key: 'wynik', label: 'Wynik' },
]}
initialRows={[
{ test: 'Do ilu urządzeń dotarło zapytanie ARP z PC-U1?' },
{ test: 'Czy uczeń (PC-U1.1) otworzył stronę dziennika?' },
{ test: 'Czy uczeń może spingować komputer nauczyciela (PC-N.1)?' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>
</Step>

<Step title="1.2 Całkowite odcięcie">
Usuń kabel między przełącznikami i powtórz testy z Tabeli 6.

<OpenQuestion
  title="Kiedy całkowite odcięcie połączenia między przełącznikami ma sens?"
  question="Teraz uczniowie nie mają dostępu do nauczycieli, ale nauczyciele nie mają też dostępu do… czegokolwiek poza swoim pokojem i serwerem. Podaj dwa przykłady sieci, które w praktyce rozdziela się fizycznie bez żadnego połączenia, i wyjaśnij dlaczego."
  minLength={60}
  storageKey="cw3_e1_airgap"
/>
</Step>

<Step title="1.3 Router jako jedyne przejście">
<div className="justify">
Dodaj router **2911** (R1). Podłącz SW-U G0/1 do R1 G0/0, a SW-N G0/1 do R1 G0/1. Sieci muszą mieć teraz różne adresy, dlatego podziel `192.168.1.0/24` na dwie równe podsieci: pierwszą dla uczniów, drugą dla nauczycieli. Bramą jest pierwszy adres hosta w podsieci.
</div>

<EditableTable
title="Tab. 7 Podział 192.168.1.0/24"
storageKey="cw3_e1_podzial"
columns={[
{ key: 'siec', label: 'Sieć', readOnly: true },
{ key: 'adres', label: 'Adres / prefiks' },
{ key: 'maska', label: 'Maska' },
{ key: 'brama', label: 'Brama (R1-X)' },
{ key: 'broadcast', label: 'Broadcast' },
]}
initialRows={[
{ siec: 'Uczniowie (G0/0)' },
{ siec: 'Nauczyciele (G0/1)' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>

Skonfiguruj interfejsy R1-X (`ip address`, `no shutdown`) oraz bramy na komputerach. Komputery uczniów zachowują swoje adresy, a w adresach PC-N.1 i SRV-DZIENNIK do ostatniego oktetu dodaj 128.

<KeywordAnswer
  title="Kto musiał się przeprowadzić?"
  question="Dlaczego PC-U1.1 mógł zachować adres 192.168.1.11, a PC-N.1 musiał zmienić adres 192.168.1.21?"
  keywords={['127', 'pierwsz', '/25', 'zakres', 'uczni']}
  explanation="Po podziale na /25 pierwsza podsieć obejmuje adresy .0–.127, a druga .128–.255. Adres .21 należy do pierwszej podsieci, czyli do sieci uczniów, więc nauczyciel musiał dostać adres z zakresu .128–.255 (np. .149)."
  storageKey="cw3_e1_przeprowadzka"
/>

Sprawdź, czy PC-U1.1 pinguje PC-N.1 i czy otwiera stronę dziennika. Od tej chwili każdy pakiet między pomieszczeniami przechodzi przez R1 w etapie 3 właśnie tu postawimy kontrolę ruchu.

<ScreenshotPaste label="Zrzut ekranu: topologia etapu 1 z routerem" />
</Step>

<Step title="1.4 Ile to kosztuje?">
<EditableTable
title="Tab. 8 Inwentaryzacja"
storageKey="cw3_e1_inwentarz"
columns={[
{ key: 'element', label: 'Element', readOnly: true },
{ key: 'e1', label: 'Etap 1 – fizyczna' },
{ key: 'e2', label: 'Etap 2 – VLAN' },
]}
initialRows={[
{ element: 'Liczba przełączników' },
{ element: 'Zajęte porty przełączników' },
{ element: 'Wolne porty przełączników' },
{ element: 'Zajęte porty routera' },
{ element: 'Liczba grup (segmentów)' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>

<OpenQuestion
  title="Dyrektor ma nowy pomysł"
  question="Szkoła dostaje drugi budynek. Powstanie w nim druga pracownia uczniów, pokój nauczycielski i sekretariat (nowa, trzecia grupa). Co trzeba dokupić i ile kabli poprowadzić między budynkami, jeśli zostaniemy przy segmentacji fizycznej? Ile wolnych portów router 2911 ma do dyspozycji?"
  modelAnswer="Przy segmentacji fizycznej każda grupa w każdym budynku potrzebuje osobnego przełącznika (w budynku B trzy przełączniki) i osobnego połączenia z resztą swojej grupy albo z routerem – razem co najmniej trzy kable między budynkami. Router 2911 ma tylko trzy porty Gigabit Ethernet, a jeden jest potrzebny do Internetu, więc nie obsłuży trzech grup bez dodatkowej karty. Większość portów przełączników pozostanie przy tym wolna."
  minLength={80}
  storageKey="cw3_e1_rozbudowa"
/>
</Step>

<Step title="1.5 Dla chętnych: spacer po pracowni">
Obejrzyj szafę sieciową w swojej pracowni (za zgodą prowadzącego) i odpowiedz na pytania z Tabeli 9.

<EditableTable
title="Tab. 9 Segmentacja fizyczna w prawdziwej pracowni"
storageKey="cw3_e1_spacer"
columns={[
{ key: 'pytanie', label: 'Pytanie', readOnly: true },
{ key: 'odpowiedz', label: 'Odpowiedź' },
]}
initialRows={[
{ pytanie: 'Ile przełączników obsługuje pracownię?' },
{ pytanie: 'Czy komputer prowadzącego jest podłączony do tego samego przełącznika co komputery studentów?' },
{ pytanie: 'Czy na panelu krosowym są opisane gniazda? Jak?' },
{ pytanie: 'Czy widać wolne, podłączone gniazda w ścianie (potencjalne „wolne gniazdko”)?' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>
</Step>
</StepByStep>

## Etap 2. VLAN i dobór adresacji (35 min)

<div className="justify">
Zamiast kupować przełącznik dla każdej grupy, w każdym budynku stawiamy jeden przełącznik, a grupy rozdzielamy VLAN-ami. Operator przydzielił szkole na sieć wewnętrzną tylko pulę `172.16.X.0/24`, więc trzeba ją podzielić oszczędnie, metodą **VLSM** – zaczynając od największej grupy.
</div>

<StepByStep>
<Step title="2.1 Plan adresacji (VLSM)">
Dla każdego VLAN-u dobierz najmniejszy prefiks, który pomieści podaną liczbę hostów (razem z bramą), i przydzielaj podsieci po kolei od `172.16.X.0`. Maska odwrotna (wildcard) przyda się w etapie 3.

<EditableTable
title="Tab. 10 Plan adresacji 172.16.X.0/24"
storageKey="cw3_e2_plan"
columns={[
{ key: 'vlan', label: 'VLAN', readOnly: true },
{ key: 'hosty', label: 'Hostów', readOnly: true },
{ key: 'siec', label: 'Adres sieci' },
{ key: 'prefiks', label: 'Prefiks' },
{ key: 'maska', label: 'Maska' },
{ key: 'brama', label: 'Brama' },
{ key: 'broadcast', label: 'Broadcast' },
{ key: 'wc', label: 'Wildcard' },
]}
initialRows={[
{ vlan: '10 – Uczniowie', hosty: '50', shared: { siec: 'cw3_v10_siec', maska: 'cw3_v10_maska', brama: 'cw3_v10_brama', wc: 'cw3_v10_wc' } },
{ vlan: '20 – Nauczyciele', hosty: '20', shared: { siec: 'cw3_v20_siec', maska: 'cw3_v20_maska', brama: 'cw3_v20_brama', wc: 'cw3_v20_wc' } },
{ vlan: '30 – Administracja', hosty: '10', shared: { siec: 'cw3_v30_siec', maska: 'cw3_v30_maska', brama: 'cw3_v30_brama', wc: 'cw3_v30_wc' } },
{ vlan: '40 – Serwery', hosty: '4', shared: { siec: 'cw3_v40_siec', maska: 'cw3_v40_maska', brama: 'cw3_v40_brama', wc: 'cw3_v40_wc' } },
{ vlan: '99 – Zarządzanie', hosty: '4', shared: { siec: 'cw3_v99_siec', maska: 'cw3_v99_maska', brama: 'cw3_v99_brama', wc: 'cw3_v99_wc' } },
]}
allowAddRows={false}
allowRemoveRows={false}
/>

<KeywordAnswer
  title="Zapas na rozbudowę"
  question="Jaka część puli 172.16.X.0/24 została wolna po przydzieleniu wszystkich VLAN-ów? Podaj ją jako adres z prefiksem."
  keywords={['.128/25']}
  explanation="Pięć VLAN-ów zajmuje adresy .0–.127 (64 + 32 + 16 + 8 + 8 = 128 adresów). Wolna jest cała druga połowa puli: 172.16.X.128/25 – można z niej utworzyć kolejne podsieci, np. dla drugiej pracowni."
  storageKey="cw3_e2_zapas"
/>

<details>
<summary>Klucz do Tabeli 10 (dla prowadzącego)</summary>

| VLAN | Adres sieci | Prefiks | Maska | Brama | Broadcast | Wildcard |
|---|---|---|---|---|---|---|
| 10 | 172.16.X.0 | /26 | 255.255.255.192 | 172.16.X.1 | 172.16.X.63 | 0.0.0.63 |
| 20 | 172.16.X.64 | /27 | 255.255.255.224 | 172.16.X.65 | 172.16.X.95 | 0.0.0.31 |
| 30 | 172.16.X.96 | /28 | 255.255.255.240 | 172.16.X.97 | 172.16.X.111 | 0.0.0.15 |
| 40 | 172.16.X.112 | /29 | 255.255.255.248 | 172.16.X.113 | 172.16.X.119 | 0.0.0.7 |
| 99 | 172.16.X.120 | /29 | 255.255.255.248 | 172.16.X.121 | 172.16.X.127 | 0.0.0.7 |
</details>
</Step>

<Step title="2.2 Adresy urządzeń">
Zasada: urządzenia dostają kolejne adresy zaraz po bramie, a PC-ADMIN – **ostatni** adres hosta w VLAN 99.

<EditableTable
title="Tab. 11 Adresy urządzeń"
storageKey="cw3_e2_hosty"
columns={[
{ key: 'urzadzenie', label: 'Urządzenie', readOnly: true },
{ key: 'vlan', label: 'VLAN', readOnly: true },
{ key: 'port', label: 'Port', readOnly: true },
{ key: 'adres', label: 'Adres IP', checkDuplicates: true },
]}
initialRows={[
{ urzadzenie: 'PC-U1', vlan: '10', port: 'SW-1 Fa0/1' },
{ urzadzenie: 'PC-U2', vlan: '10', port: 'SW-2 Fa0/1' },
{ urzadzenie: 'PC-N1', vlan: '20', port: 'SW-1 Fa0/2' },
{ urzadzenie: 'PC-N2', vlan: '20', port: 'SW-2 Fa0/2' },
{ urzadzenie: 'PC-SEKR', vlan: '30', port: 'SW-2 Fa0/3' },
{ urzadzenie: 'SRV-DZIENNIK', vlan: '40', port: 'SW-1 Fa0/3', shared: { adres: 'cw3_srv_ip' } },
{ urzadzenie: 'SW-1 (interface vlan 99)', vlan: '99', port: '–', shared: { adres: 'cw3_sw1_ip' } },
{ urzadzenie: 'SW-2 (interface vlan 99)', vlan: '99', port: '–', shared: { adres: 'cw3_sw2_ip' } },
{ urzadzenie: 'PC-ADMIN', vlan: '99', port: 'SW-1 Fa0/4' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>

<details>
<summary>Klucz do Tabeli 11 (dla prowadzącego)</summary>

PC-U1 .2, PC-U2 .3, PC-N1 .66, PC-N2 .67, PC-SEKR .98, SRV-DZIENNIK .114, SW-1 .122, SW-2 .123, PC-ADMIN .126.
</details>
</Step>

<Step title="2.3 Budowa topologii">
Zapisz etap 1 i utwórz nowy plik `etap2-X.pkt`. Topologia ma dwa budynki połączone jednym kablem:

```
 BUDYNEK A                                           BUDYNEK B
 PC-U1, PC-N1, SRV-DZIENNIK, PC-ADMIN                PC-U2, PC-N2, PC-SEKR
          │                                                   │
       [SW-1] G0/2 ══════════ trunk 802.1Q ══════════ G0/2 [SW-2]
         G0/1
          ║ trunk 802.1Q
         G0/0
       [R1-X] G0/2 ──── 203.0.113.0/29 ──── G0/1 [R2-X] G0/0 ──── 198.51.100.0/24
                                                  „operator”        SRV-INTERNET .20
                                                                    PC-RODZIC    .30
```

R1-X G0/1 zostaje wolny. Router R2-X, SRV-INTERNET i PC-RODZIC dodaj już teraz, ale skonfigurujesz je w etapie 3.

**SW-1** (na SW-2 analogicznie – porty według Tabeli 11, trunk tylko na G0/2):
```
SW-1(config)# vlan 10
SW-1(config-vlan)# name UCZNIOWIE
SW-1(config-vlan)# vlan 20
SW-1(config-vlan)# name NAUCZYCIELE
SW-1(config-vlan)# vlan 30
SW-1(config-vlan)# name ADMINISTRACJA
SW-1(config-vlan)# vlan 40
SW-1(config-vlan)# name SERWERY
SW-1(config-vlan)# vlan 99
SW-1(config-vlan)# name ZARZADZANIE
SW-1(config-vlan)# exit
SW-1(config)# interface fastEthernet 0/1
SW-1(config-if)# switchport mode access
SW-1(config-if)# switchport access vlan 10
SW-1(config-if)# interface fastEthernet 0/2
SW-1(config-if)# switchport mode access
SW-1(config-if)# switchport access vlan 20
SW-1(config-if)# interface fastEthernet 0/3
SW-1(config-if)# switchport mode access
SW-1(config-if)# switchport access vlan 40
SW-1(config-if)# interface fastEthernet 0/4
SW-1(config-if)# switchport mode access
SW-1(config-if)# switchport access vlan 99
SW-1(config-if)# interface range gigabitEthernet 0/1 - 2
SW-1(config-if-range)# switchport mode trunk
```

Adres zarządzania przełącznika (wartości pobierane z Tabel 10 i 11):

<CodeBlock lines={[
'SW-1(config)# interface vlan 99',
<>SW-1(config-if)# ip address <SharedValue shared="cw3_sw1_ip" fallback="adres SW-1" /> <SharedValue shared="cw3_v99_maska" fallback="maska VLAN 99" /></>,
'SW-1(config-if)# no shutdown',
'SW-1(config-if)# exit',
<>SW-1(config)# ip default-gateway <SharedValue shared="cw3_v99_brama" fallback="brama VLAN 99" /></>,
]} />

**R1-X (router-on-a-stick)** – polecenia uzupełniają się wartościami z Tabeli 10:

<CodeBlock lines={[
'R1-X(config)# interface gigabitEthernet 0/0',
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# interface gigabitEthernet 0/0.10',
'R1-X(config-subif)# encapsulation dot1Q 10',
<>R1-X(config-subif)# ip address <SharedValue shared="cw3_v10_brama" fallback="brama VLAN 10" /> <SharedValue shared="cw3_v10_maska" fallback="maska VLAN 10" /></>,
'R1-X(config-subif)# interface gigabitEthernet 0/0.20',
'R1-X(config-subif)# encapsulation dot1Q 20',
<>R1-X(config-subif)# ip address <SharedValue shared="cw3_v20_brama" fallback="brama VLAN 20" /> <SharedValue shared="cw3_v20_maska" fallback="maska VLAN 20" /></>,
'R1-X(config-subif)# interface gigabitEthernet 0/0.30',
'R1-X(config-subif)# encapsulation dot1Q 30',
<>R1-X(config-subif)# ip address <SharedValue shared="cw3_v30_brama" fallback="brama VLAN 30" /> <SharedValue shared="cw3_v30_maska" fallback="maska VLAN 30" /></>,
'R1-X(config-subif)# interface gigabitEthernet 0/0.40',
'R1-X(config-subif)# encapsulation dot1Q 40',
<>R1-X(config-subif)# ip address <SharedValue shared="cw3_v40_brama" fallback="brama VLAN 40" /> <SharedValue shared="cw3_v40_maska" fallback="maska VLAN 40" /></>,
'R1-X(config-subif)# interface gigabitEthernet 0/0.99',
'R1-X(config-subif)# encapsulation dot1Q 99',
<>R1-X(config-subif)# ip address <SharedValue shared="cw3_v99_brama" fallback="brama VLAN 99" /> <SharedValue shared="cw3_v99_maska" fallback="maska VLAN 99" /></>,
]} />
</Step>

<Step title="2.4 Weryfikacja">
<Checklist
title="Etap 2 działa"
storageKey="cw3_e2_testy"
sections={[
{ title: 'Przełączniki', items: [
'show vlan brief – porty przypisane zgodnie z Tabelą 11',
'show interfaces trunk – trunk na SW-1 G0/1, G0/2 i SW-2 G0/2',
]},
{ title: 'Ping', items: [
'PC-U1 → PC-U2 – ten sam VLAN, różne budynki (bez routera)',
'PC-U1 → PC-N1 – różne VLAN-y (przez R1-X)',
'PC-SEKR → SRV-DZIENNIK',
'PC-ADMIN → SW-2 (zarządzanie przez trunk)',
]},
]}
/>

W trybie **Simulation** wyślij ping z PC-U1 do PC-U2 i sprawdź, do których urządzeń dociera zapytanie ARP. Uzupełnij kolumnę „Etap 2” w Tabeli 8.

<OpenQuestion
  title="Fizyczna czy VLAN?"
  question="Porównaj kolumny Tabeli 8. Co zyskała szkoła, przechodząc na VLAN-y, a co straciła w porównaniu z segmentacją fizyczną? Od czego teraz zależy izolacja grup?"
  modelAnswer="Mniej przełączników i kabli, jeden kabel między budynkami, grupy mogą istnieć w obu budynkach, zmiana grupy to zmiana konfiguracji portu, a nie okablowania. Router potrzebuje jednego portu zamiast jednego na grupę. Izolacja zależy jednak od poprawnej konfiguracji przełączników – błąd lub atak na warstwę 2 (np. negocjacja trunku) może połączyć grupy, czego w segmentacji fizycznej nie da się zrobić."
  minLength={80}
  storageKey="cw3_e2_porownanie"
/>
</Step>

<Step title="2.5 Atak przez wolne gniazdko i utwardzenie">
:::warning
Ćwiczenie wykonujemy **wyłącznie w Packet Tracerze**.
:::

Ktoś wpiął własny przełącznik w wolne gniazdko w budynku B. Dodaj **SW-INTRUZ** (2960) i połącz jego Fa0/24 z **Fa0/24** przełącznika SW-2. Do SW-INTRUZ Fa0/1 podłącz **PC-INTRUZ**.

```
SW-INTRUZ(config)# vlan 30
SW-INTRUZ(config-vlan)# exit
SW-INTRUZ(config)# interface fastEthernet 0/24
SW-INTRUZ(config-if)# switchport mode dynamic desirable
SW-INTRUZ(config-if)# interface fastEthernet 0/1
SW-INTRUZ(config-if)# switchport mode access
SW-INTRUZ(config-if)# switchport access vlan 30
```

PC-INTRUZ: `172.16.X.110/28`, brama `172.16.X.97`. Sprawdź, czy pinguje PC-SEKR, i wykonaj na SW-2 `show interfaces trunk`.

<KeywordAnswer
  title="Jak intruz dostał się do sekretariatu?"
  question="Nikt nie konfigurował portu Fa0/24 na SW-2, a mimo to intruz ma dostęp do VLAN-u administracji. Dlaczego?"
  keywords={['DTP', 'dynamic', 'negocj', 'trunk']}
  explanation="Porty przełącznika 2960 domyślnie pracują w trybie dynamic auto i negocjują tryb pracy protokołem DTP. Obcy przełącznik zaproponował trunk (dynamic desirable), a SW-2 go przyjął – od tej chwili przez gniazdko przechodzą wszystkie VLAN-y."
  storageKey="cw3_e2_atak"
/>

<Checklist
title="Utwardzanie SW-1 i SW-2"
storageKey="cw3_e2_obrona"
sections={[
{ title: 'Porty nieużywane', items: [
'switchport mode access',
'switchport access vlan 999 – VLAN „czarna dziura”',
'shutdown',
]},
{ title: 'Porty użytkowników', items: [
'switchport nonegotiate – wyłączenie DTP',
]},
{ title: 'Trunki', items: [
'switchport trunk allowed vlan 10,20,30,40,99',
'switchport trunk native vlan 999 – na wszystkich trunkach po obu stronach łącza między przełącznikami',
]},
]}
/>

Włącz Fa0/24 na SW-2 (`no shutdown`) i powtórz atak – trunk nie powinien się zestawić.
</Step>

<Step title="2.6 Dla chętnych: IPv6 w każdym VLAN-ie">
Każdy VLAN dostaje własny prefiks `/64`, a numer VLAN-u zapisujemy w identyfikatorze podsieci, np. VLAN 10 → `2001:db8:X:10::/64`.

```
R1-X(config)# ipv6 unicast-routing
R1-X(config)# interface gigabitEthernet 0/0.10
R1-X(config-subif)# ipv6 address 2001:db8:X:10::1/64
```

Powtórz dla pozostałych podinterfejsów, a na komputerach wybierz *IPv6 Configuration ⇒ Automatic*. Sprawdź, czy PC-U1 pinguje PC-N1 po adresie IPv6.

<KeywordAnswer
  title="IPv6 a VLSM"
  question="Dlaczego w IPv6 nie trzeba dobierać prefiksu do liczby hostów, tak jak zrobiliśmy to w Tabeli 10?"
  keywords={['/64', '64', 'SLAAC', 'zawsze']}
  explanation="W IPv6 każda sieć z hostami ma prefiks /64 niezależnie od liczby urządzeń (tego wymaga m.in. SLAAC), a adresów jest tyle, że oszczędzanie nie ma sensu. Planuje się tylko liczbę podsieci /64, a nie ich rozmiar."
  storageKey="cw3_e2_ipv6"
/>
</Step>
</StepByStep>

1. fizyczna
2. vlan
3. adresacja
4. kontrola ruchu

[^sekurak1]: Sekurak.Academy - Szkolenie: "Bezpieczna architektura sieci w małej firmie i mikroprzedsiębiorstwie.", 07.2025.

[^nist41]: NIST SP 800-41 Rev. 1 – [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), NIST, 2009.

[^cisco-seg]: Cisco Networking Academy – *Switching, Routing and Wireless Essentials v7*, moduł 3 (VLAN) i moduł 10 (bezpieczeństwo LAN).

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006. 

[^RFC950]: [RFC 950](https://www.rfc-editor.org/rfc/rfc950) – Internet Standard Subnetting Procedure, 1985.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^cisco]: Cisco Systems, Inc., [Configure IP Access Lists](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html), Cisco IOS Documentation, cisco.com

[^RFC2827]: [RFC 2827](https://www.rfc-editor.org/rfc/rfc2827) (BCP 38) – Network Ingress Filtering, 2000.

[^RFC4291]: [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291) – IP Version 6 Addressing Architecture, 2006, rozdz. 2.5.1 (identyfikator interfejsu 64 bity) i 2.6.1 (adres subnet-router anycast).

[^RFC7421]: [RFC 7421](https://www.rfc-editor.org/rfc/rfc7421) – Analysis of the 64-bit Boundary in IPv6 Addressing, 2015, rozdz. 2 (zalety stałej długości identyfikatora) i rozdz. 4 (skutki prefiksów innych niż /64).

[^RFC6177]: [RFC 6177](https://www.rfc-editor.org/rfc/rfc6177) (BCP 157) – IPv6 Address Assignment to End Sites, 2011, rozdz. 2 „On /48 Assignments to End Sites”.

[^ripe690]: RIPE-690 – [Best Current Operational Practice for Operators: IPv6 prefix assignment for end-users](https://ripe.net/publications/docs/ripe-690), RIPE NCC, 2017, rozdz. 4.2 (warianty /48 i /56; podrozdz. 4.2.2 – /48 dla firm, /56 dla klientów indywidualnych).

[^RFC3849]: [RFC 3849](https://www.rfc-editor.org/rfc/rfc3849) – IPv6 Address Prefix Reserved for Documentation, 2004.

<!-- ACL -->
[^cisco-acl]: Cisco Systems, *Security Configuration Guide: Access Control Lists* (Cisco IOS XE), dokumentacja techniczna, cisco.com.

[^sedayao]: J. Sedayao, [Cisco IOS Access Lists](https://www.oreilly.com/library/view/cisco-ios-access/1565923855/ch02.html), O'Reilly Media, 2001, rozdz. 2 „Access List Basics”.

[^netacad-ensa]: Cisco Networking Academy, *Enterprise Networking, Security, and Automation (ENSA) v7*, moduły 4–5 (koncepcje i konfiguracja ACL IPv4).

[^odom]: W. Odom, *CCNA 200-301 Official Cert Guide, Volume 2*, Cisco Press, 2019, część I „IP Access Control Lists”.

[^nist41]: NIST SP 800-41 Rev. 1 – [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), NIST, 2009, rozdz. 2 (filtry pakietów a inspekcja stanowa).
<!-- ---- -->







[^nist41]: NIST SP 800-41 Rev. 1, Rozdział 2,4 – [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), NIST, 2009.





[^RFC1633]: [RFC 1633](https://www.rfc-editor.org/rfc/rfc1633) – Integrated Services in the Internet Architecture, 1994.

[^RFC2475]: [RFC 2475](https://www.rfc-editor.org/rfc/rfc2475) – An Architecture for Differentiated Services, 1998.

[^RFC2474]: [RFC 2474](https://www.rfc-editor.org/rfc/rfc2474) – Definition of the Differentiated Services Field (DS Field), 1998.

[^RFC3246]: [RFC 3246](https://www.rfc-editor.org/rfc/rfc3246) – An Expedited Forwarding PHB, 2002.

[^RFC2597]: [RFC 2597](https://www.rfc-editor.org/rfc/rfc2597) – Assured Forwarding PHB Group, 1999.

[^RFC4594]: [RFC 4594](https://www.rfc-editor.org/rfc/rfc4594) – Configuration Guidelines for DiffServ Service Classes, 2006.
