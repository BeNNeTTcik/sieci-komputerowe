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

#### Translacja adresów (NAT/PAT)

<div className="justify">
**NAT (Network Address Translation)** zmienia adresy IP w nagłówkach pakietów przechodzących przez router brzegowy [^RFC2663][^RFC3022]. Pozwala to hostom z adresami prywatnymi [^RFC1918], które nie są routowane w Internecie, korzystać z niego za pośrednictwem adresu publicznego. W Tabeli 4 wymieniono rodzaje NAT-ów, zasade działania oraz zastosowanie praktyczne.
</div>
Tab. 4 Odmiany translacji adresów

| Odmiana | Odwzorowanie | Zasada działania | Zastosowanie |
|---|---|---|---|
| **NAT statyczny** | 1:1 | Stałe przypisanie jednego adresu prywatnego do jednego publicznego | Udostępnianie serwerów wewnętrznych, np. serwer strony WWW na widziany adres publiczny |
| **NAT dynamiczny** | wiele : pula | Przydział adresu z puli adresów publicznych na czas połączenia; po wyczerpaniu puli kolejne hosty nie uzyskają dostępu | Sieci, które mają kilka adresów publicznych |
| **PAT** (*Port Address Translation*, NAT overload) | wiele : 1 | Wiele hostów współdzieli jeden adres publiczny, a router rozróżnia ich połączenia po numerach portów źródłowych | Standard w sieciach domowych i firmowych |
| **Przekierowanie portów** (odmiana PAT) | port publiczny -> host:port | Stałe powiązanie portu adresu publicznego z usługą na wybranym hoście wewnętrznym | Udostępnianie pojedynczej usługi (np. serwera WWW) przy jednym adresie publicznym |

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

## Etap 1. Segmentacja fizyczna

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

<!-- ACL -->
[^cisco-acl]: Cisco Systems, *Security Configuration Guide: Access Control Lists* (Cisco IOS XE), dokumentacja techniczna, cisco.com.

[^sedayao]: J. Sedayao, [Cisco IOS Access Lists](https://www.oreilly.com/library/view/cisco-ios-access/1565923855/ch02.html), O'Reilly Media, 2001, rozdz. 2 „Access List Basics”.

[^netacad-ensa]: Cisco Networking Academy, *Enterprise Networking, Security, and Automation (ENSA) v7*, moduły 4–5 (koncepcje i konfiguracja ACL IPv4).

[^odom]: W. Odom, *CCNA 200-301 Official Cert Guide, Volume 2*, Cisco Press, 2019, część I „IP Access Control Lists”.

[^nist41]: NIST SP 800-41 Rev. 1 – [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), NIST, 2009, rozdz. 2 (filtry pakietów a inspekcja stanowa).
<!-- ---- -->

[^nist41]: NIST SP 800-41 Rev. 1, Rozdział 2,4 – [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), NIST, 2009.

[^RFC2663]: [RFC 2663](https://www.rfc-editor.org/rfc/rfc2663) – IP Network Address Translator (NAT) Terminology and Considerations, 1999.

[^RFC3022]: [RFC 3022](https://www.rfc-editor.org/rfc/rfc3022) – Traditional IP Network Address Translator (Traditional NAT), 2001.

[^RFC1918]: [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) – Address Allocation for Private Internets, 1996.

[^RFC1633]: [RFC 1633](https://www.rfc-editor.org/rfc/rfc1633) – Integrated Services in the Internet Architecture, 1994.

[^RFC2475]: [RFC 2475](https://www.rfc-editor.org/rfc/rfc2475) – An Architecture for Differentiated Services, 1998.

[^RFC2474]: [RFC 2474](https://www.rfc-editor.org/rfc/rfc2474) – Definition of the Differentiated Services Field (DS Field), 1998.

[^RFC3246]: [RFC 3246](https://www.rfc-editor.org/rfc/rfc3246) – An Expedited Forwarding PHB, 2002.

[^RFC2597]: [RFC 2597](https://www.rfc-editor.org/rfc/rfc2597) – Assured Forwarding PHB Group, 1999.

[^RFC4594]: [RFC 4594](https://www.rfc-editor.org/rfc/rfc4594) – Configuration Guidelines for DiffServ Service Classes, 2006.
