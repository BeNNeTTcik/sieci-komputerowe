---
sidebar_position: 4
title: "Ćwiczenie 4: Routing i translacja adresów"
---

<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 4: Routing i translacja adresów

<SprawozdanieHeader
  thema="Administrowanie sieciami"
  exerciseTitle="Ćwiczenie 4: Routing i translacja adresów"
  storageKey="cwiczenie-4"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-4"
  storageKeys={[]}
  sharedPrefix="cw4_"
/>

## I. Wprowadzenie
### Routing

<div className="justify">
**Routing** to proces wyznaczania drogi, którą pakiety przechodzą od nadawcy do odbiorcy znajdującego się w innej sieci. Kurose i Ross rozdzielają w warstwie sieci dwie funkcje [^kurose-r4]. **Przekazywanie (forwarding)** to lokalna czynność routera: przeniesienie pakietu z interfejsu wejściowego na właściwy interfejs wyjściowy, wykonywane w ułamku mikrosekundy dla każdego pakietu. Tę część nazywa się **płaszczyzną danych** (*data plane*). **Routing** w węższym znaczeniu to wyznaczanie tras w skali całej sieci, czyli budowanie tablicy, z której korzysta przekazywanie. Odpowiada za to **płaszczyzna sterowania** (*control plane*): administrator wpisujący trasy ręcznie albo protokoły routingu, które same wymieniają informacje między routerami [^kurose-r5].
</div>

#### Tablica routingu i najdłuższe dopasowanie prefiksu

<div className="justify">
Każdy router przechowuje **tablicę routingu**, w której dla każdej znanej sieci docelowej zapisany jest **następny skok** (*next hop*), czyli adres kolejnego routera, oraz interfejs wyjściowy. Router nie zna całej drogi pakietu, tylko kolejny krok. Dla każdego pakietu porównuje adres docelowy z prefiksami w tablicy, a gdy pasuje kilka wpisów, wybiera ten o **najdłuższym prefiksie** (*longest prefix match*), czyli najbardziej szczegółowy [^RFC1812][^RFC4632][^kurose-r4]. Wpis `0.0.0.0/0` (w IPv6 `::/0`) pasuje do każdego adresu, ale ma prefiks o długości zero, dlatego jest używany tylko wtedy, gdy nie pasuje nic innego. Jest to **trasa domyślna**, potocznie „brama ostatniej szansy”. Jeśli nie ma ani pasującego wpisu, ani trasy domyślnej, router odrzuca pakiet i odsyła do nadawcy komunikat ICMP *Destination Unreachable*.
</div>

Tab. 1 Przykładowa tablica routingu
| Sieć docelowa | Następny skok | Interfejs |
|---|---|---|
| 10.1.0.0/16 | 10.255.0.2 | G0/1 |
| 10.1.20.0/24 | 10.255.0.6 | G0/2 |
| 10.1.20.128/25 | sieć bezpośrednio podłączona | G0/0 |
| 0.0.0.0/0 | 203.0.113.1 | G0/3 |

<div className="justify">
Dla tablicy z Tabeli 1 pakiet do `10.1.20.200` pasuje do trzech pierwszych wpisów, ale zostanie wysłany przez G0/0, ponieważ prefiks /25 jest najdłuższy. Pakiet do `10.1.20.5` trafi na G0/2 (/24), do `10.1.99.1` na G0/1 (/16), a do `198.51.100.20` na trasę domyślną. Przy każdym przekazaniu router zmniejsza o 1 pole **TTL** (w IPv6 *Hop Limit*). Gdy pole osiągnie zero, pakiet zostaje odrzucony, a nadawca otrzymuje komunikat ICMP *Time Exceeded*. Chroni to sieć przed pakietami krążącymi bez końca w pętli routingu [^RFC1812][^RFC8200]. Na tym mechanizmie opiera się działanie polecenia `traceroute`.
</div>

#### Źródła tras: odległość administracyjna i metryka

<div className="justify">
Trasy trafiają do tablicy z trzech źródeł: **sieci bezpośrednio podłączone** (pojawiają się automatycznie po nadaniu adresu włączonemu interfejsowi), **trasy statyczne** wpisane przez administratora oraz **trasy dynamiczne** wyuczone z protokołów routingu. Gdy kilka źródeł podaje trasę do tej samej sieci o tej samej długości prefiksu, router wybiera źródło najbardziej wiarygodne według **odległości administracyjnej** (*administrative distance*, AD). Im mniejsza wartość, tym wyższe zaufanie [^cisco-ad]. Dopiero wśród tras z jednego protokołu decyduje **metryka**, czyli „koszt” trasy liczony przez dany protokół (liczba skoków, koszt łącza, atrybuty ścieżki). Kolejność wyboru jest więc zawsze taka sama: najpierw najdłuższy prefiks, potem najmniejsza odległość administracyjna, na końcu najmniejsza metryka [^RFC1812].
</div>

Tab. 2 Domyślne odległości administracyjne (Cisco IOS)
| Źródło trasy | AD |
|---|---|
| Sieć bezpośrednio podłączona | 0 |
| Trasa statyczna | 1 |
| eBGP | 20 |
| OSPF | 110 |
| RIP | 120 |
| iBGP | 200 |

Inni producenci (np. MikroTik, Juniper) stosują ten sam mechanizm, ale wartości domyślne mogą się różnić.

#### Routing statyczny

<div className="justify">
**Trasa statyczna** to wpis dodany ręcznie, np. `ip route 10.2.0.0 255.255.0.0 10.255.0.2`. Nie generuje żadnego ruchu w sieci, nie zużywa zasobów routera, a jej działanie jest w pełni przewidywalne, dlatego sprawdza się w małych sieciach, na routerach brzegowych z jednym wyjściem do Internetu (trasa domyślna). Wadą jest brak reakcji na zmiany: gdy łącze ulegnie awarii, trasa statyczna nadal wskazuje niedziałający kierunek, a każda zmiana topologii wymaga ręcznej poprawki na wielu urządzeniach. Częściowym rozwiązaniem jest **zapasowa trasa statyczna** (*floating static route*) z odległością administracyjną większą niż trasa podstawowa (np. `ip route 0.0.0.0 0.0.0.0 198.51.100.1 250`) i trafia do tablicy dopiero wtedy, gdy trasa podstawowa zniknie.
</div>

#### Routing dynamiczny i algorytmy routingu

<div className="justify">
W routingu dynamicznym routery same wymieniają informacje o sieciach i przeliczają trasy po każdej zmianie topologii. Kurose i Ross wyróżniają dwie podstawowe rodziny algorytmów: stanu łącza i wektora odległości [^kurose-r5]. W praktyce stosuje się też dwie grupy pochodne: protokoły hybrydowe oraz protokoły wektora ścieżki. Ich porównanie przedstawiono w Tabeli 3.
</div>

Tab. 3 Rodzaje algorytmów routingu dynamicznego
| | Stan łącza (*link-state*) | Wektor odległości (*distance-vector*) | Hybrydowy (*advanced distance-vector*) | Wektor ścieżki (*path-vector*) |
|---|---|---|---|---|
| **Wiedza routera** | Pełna mapa topologii obszaru – każdy router zna wszystkie łącza i ich koszty | Tylko odległości do sieci podawane przez bezpośrednich sąsiadów („routing według plotek”) | Odległości od sąsiadów oraz zapasowe trasy bez pętli zapisane w tablicy topologii | Pełna lista systemów autonomicznych (AS_PATH) na drodze do każdej sieci |
| **Algorytm** | Dijkstra (SPF) liczony samodzielnie przez każdy router | Bellman-Ford | DUAL (*Diffusing Update Algorithm*) | Wybór najlepszej ścieżki według atrybutów i polityki operatora |
| **Wymiana informacji** | Opisy łączy (LSA) rozsyłane do wszystkich routerów w obszarze, tylko przy zmianie | Całe tablice routingu wysyłane cyklicznie do sąsiadów (RIP co 30 s) | Tylko zmiany, wysyłane do sąsiadów, których dotyczą (aktualizacje częściowe) | Tylko zmiany, przesyłane przez sesje TCP (port 179) między ustalonymi sąsiadami |
| **Metryka** | Koszt łącza (zwykle zależny od przepustowości) | Liczba skoków | Złożona – przepustowość i opóźnienie | Atrybuty ścieżki (m.in. AS_PATH, LOCAL_PREF), a nie odległość |
| **Ochrona przed pętlami** | Wynika z pełnej mapy sieci | Słaba – problem odliczania do nieskończoności, ograniczany dzielonym horyzontem i limitem 15 skoków | Warunek wykonalności (*feasibility condition*) – trasa zapasowa nie może prowadzić przez pętlę | Router odrzuca trasę, w której AS_PATH zawiera już jego własny numer AS |
| **Zbieżność** | Szybka | Wolna | Bardzo szybka – przy awarii od razu przełącza na gotową trasę zapasową | Wolna, ale stabilna w skali całego Internetu |
| **Wymagania** | Więcej pamięci i mocy obliczeniowej, staranny projekt obszarów | Minimalne, bardzo prosta konfiguracja | Umiarkowane; w praktyce sprzęt Cisco | Duże – pełna tablica Internetu to ponad milion tras |
| **Zastosowanie** | Średnie i duże sieci firmowe, sieci operatorów | Małe, proste sieci, zastosowania dydaktyczne | Sieci firmowe oparte na urządzeniach Cisco | Routing między systemami autonomicznymi (operatorzy, duże organizacje) |
| **Protokoły** | OSPF [^RFC2328], IS-IS | RIPv2 / RIPng [^RFC2453] | EIGRP [^RFC7868] | BGP-4 [^RFC4271] |

<div className="justify">
Określenie „protokół hybrydowy” pochodzi z dawnych materiałów Cisco i podkreśla, że EIGRP łączy cechy obu podstawowych rodzin. Formalnie jest to jednak zaawansowany protokół wektora odległości: router nadal nie zna całej topologii, tylko trasy ogłaszane przez sąsiadów, a od RIP-u odróżnia go algorytm DUAL, który z góry wyznacza trasy zapasowe wolne od pętli. Przez lata EIGRP był protokołem zastrzeżonym Cisco, a jego opis opublikowano jako dokument informacyjny RFC 7868 dopiero w 2016 roku, dlatego urządzenia innych producentów zwykle go nie obsługują.
</div>

<div className="justify">
Zasady routingu w **IPv6** są takie same jak w IPv4: najdłuższe dopasowanie prefiksu, trasa domyślna `::/0`, odległość administracyjna i metryka. Różnice są dwie. Na routerach Cisco przekazywanie pakietów IPv6 trzeba włączyć poleceniem `ipv6 unicast-routing`. Jako następny skok często podaje się adres **link-local** sąsiada (`fe80::…`) razem z interfejsem wyjściowym. Hosty IPv6 zwykle nie potrzebują ręcznie wpisanej bramy, ponieważ router ogłasza się sam komunikatami *Router Advertisement* protokołu ND [^RFC4861].
</div>

### Translacja adresów (NAT/PAT)

<div className="justify">
**NAT (Network Address Translation)** to mechanizm, w którym router brzegowy zmienia adresy IP (a w odmianie PAT także numery portów) w pakietach przechodzących między siecią wewnętrzną a Internetem [^RFC2663][^RFC3022]. Powstał jako doraźna odpowiedź na wyczerpywanie się puli adresów IPv4. Wewnątrz sieci stosuje się **adresy prywatne** z zakresów `10.0.0.0/8`, `172.16.0.0/12` i `192.168.0.0/16`, których można używać w dowolnej liczbie sieci jednocześnie, ponieważ nie są routowane w Internecie [^RFC1918]. Z punktu widzenia Internetu router z NAT wygląda jak **jedno urządzenie z jednym adresem IP**. Cała sieć domowa czy firmowa, niezależnie od liczby komputerów, ukrywa się za jednym adresem publicznym [^kurose-nat].
</div>

#### Terminologia adresów

<div className="justify">
W dokumentacji i poleceniach urządzeń Cisco (np. `show ip nat translations`) adresy opisuje się z dwóch perspektyw: czy host jest **wewnątrz** (*inside*) czy **na zewnątrz** (*outside*) sieci oraz czy adres jest widziany **lokalnie** (*local*, z sieci wewnętrznej) czy **globalnie** (*global*, z Internetu) [^cisco-nat].
</div>

Tab. 6 Adresy w translacji NAT (na przykładzie z Tabeli 5)
| Termin | Znaczenie | Przykład |
|---|---|---|
| **Inside local** | Adres hosta wewnętrznego widziany w sieci lokalnej (zwykle prywatny) | 192.168.1.10 |
| **Inside global** | Adres hosta wewnętrznego widziany z Internetu – nadany przez NAT | 203.0.113.2 |
| **Outside global** | Rzeczywisty adres hosta zewnętrznego w Internecie | 198.51.100.20 |
| **Outside local** | Adres hosta zewnętrznego widziany z sieci lokalnej – zwykle równy outside global | 198.51.100.20 |

#### Odmiany translacji

W Tabeli 4 wymieniono rodzaje NAT-ów, zasadę działania oraz zastosowanie praktyczne.

Tab. 4 Odmiany translacji adresów
| Odmiana | Odwzorowanie | Zasada działania | Zastosowanie |
|---|---|---|---|
| **NAT statyczny** | 1:1 | Stałe przypisanie jednego adresu prywatnego do jednego publicznego | Udostępnianie serwerów wewnętrznych, np. serwer strony WWW na widziany adres publiczny |
| **NAT dynamiczny** | wiele : pula | Przydział adresu z puli adresów publicznych na czas połączenia; po wyczerpaniu puli kolejne hosty nie uzyskają dostępu | Sieci, które mają kilka adresów publicznych |
| **PAT** (*Port Address Translation*, NAT overload) | wiele : 1 | Wiele hostów współdzieli jeden adres publiczny, a router rozróżnia ich połączenia po numerach portów źródłowych | Standard w sieciach domowych i firmowych |
| **Przekierowanie portów** (odmiana PAT) | port publiczny -> host:port | Stałe powiązanie portu adresu publicznego z usługą na wybranym hoście wewnętrznym | Udostępnianie pojedynczej usługi (np. serwera WWW) przy jednym adresie publicznym |

#### Ograniczenia i krytyka NAT

<div className="justify">
Kurose i Ross przypominają, że NAT budził sprzeciw środowiska sieciowego [^kurose-nat]. Narusza model warstwowy, ponieważ router, urządzenie warstwy 3, zmienia numery portów z warstwy transportowej. Numery portów miały identyfikować procesy, a nie hosty. Łamie też zasadę **komunikacji end-to-end**: hosty w Internecie nie mogą same nawiązać połączenia z hostem za NAT-em, bo dla połączenia przychodzącego nie istnieje jeszcze żaden wpis w tablicy translacji. Uruchomienie serwera, gry sieciowej czy połączenia peer-to-peer za NAT-em wymaga więc dodatkowych technik **przechodzenia przez NAT** (*NAT traversal*): ręcznego przekierowania portów, automatycznego otwierania portów (UPnP IGD) lub serwerów pośredniczących, np. STUN i TURN. Kłopot sprawiają również protokoły przenoszące adresy IP wewnątrz danych, np. FTP, SIP czy IPsec. Wymagają one bram aplikacyjnych (ALG), które poprawiają te adresy w treści pakietów [^RFC3027]. Zachowanie różnych implementacji NAT wobec ruchu UDP ujednolica RFC 4787 [^RFC4787].
</div>

<div className="justify">
NAT **nie jest zaporą sieciową**. Blokowanie niezamówionych połączeń przychodzących to efekt uboczny braku wpisu w tablicy translacji, a nie polityka bezpieczeństwa. NAT nie kontroluje ruchu wychodzącego, nie sprawdza zawartości pakietów i nie chroni przed atakami z wnętrza sieci. Tę rolę pełni zapora stanowa, która zapewnia taką samą ochronę także bez translacji adresów [^RFC4864].
</div>

#### NAT a IPv6

<div className="justify">
Kurose i Ross wskazują IPv6 jako właściwe rozwiązanie problemu, który NAT jedynie odsuwa w czasie [^kurose-nat]. Przestrzeń adresowa IPv6 pozwala nadać każdemu urządzeniu globalnie unikalny adres, dlatego w sieciach IPv6 translacji adresów się nie stosuje, a ochronę zapewnia zapora stanowa na routerze brzegowym [^RFC4864]. Translacja pozostaje potrzebna tylko w okresie przejściowym, gdy hosty obsługujące wyłącznie IPv6 muszą łączyć się z serwerami dostępnymi tylko przez IPv4. Służy do tego mechanizm **NAT64** [^RFC6146].
</div>

## II. Zadania do wykonania



[^kurose-r4]: J. F. Kurose, K. W. Ross, [Sieci komputerowe. Ujęcie całościowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+7), wyd. 7, Helion – rozdz. 4 „Warstwa sieci: płaszczyzna danych”: 4.1 (przekazywanie a routing, płaszczyzna danych i sterowania), 4.2.1 (przekazywanie według adresu docelowego, reguła najdłuższego dopasowania prefiksu).

[^kurose-r5]: J. F. Kurose, K. W. Ross, [Sieci komputerowe. Ujęcie całościowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+7), wyd. 7, Helion – rozdz. 5 „Warstwa sieci: płaszczyzna sterowania”: 5.2 (algorytmy stanu łącza i wektora odległości), 5.3 (routing wewnątrz systemu autonomicznego – OSPF), 5.4 (routing między operatorami – BGP), 5.6 (ICMP).

[^RFC1812]: [RFC 1812](https://www.rfc-editor.org/rfc/rfc1812) – Requirements for IP Version 4 Routers, 1995, rozdz. 2.2.5.2 (CIDR i najdłuższe dopasowanie), 5.2.4.3 „Next Hop Address” (wybór trasy), 5.2.4.4 „Administrative Preference”, 5.3.1 „Time to Live (TTL)”.

[^RFC4632]: [RFC 4632](https://www.rfc-editor.org/rfc/rfc4632) – Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan, 2006.

[^RFC8200]: [RFC 8200](https://www.rfc-editor.org/rfc/rfc8200) – Internet Protocol, Version 6 (IPv6) Specification, 2017, rozdz. 3 (pole Hop Limit).

[^cisco-ad]: Cisco Systems, [What Is Administrative Distance?](https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/15986-admin-distance.html), dokumentacja techniczna, cisco.com.

[^RFC2453]: [RFC 2453](https://www.rfc-editor.org/rfc/rfc2453) – RIP Version 2, 1998, rozdz. 3.2 (ograniczenia, 15 skoków), 3.4 „Distance Vector Algorithms”, 3.4.2 (odliczanie do nieskończoności), 3.4.3 „Split horizon”.

[^RFC2328]: [RFC 2328](https://www.rfc-editor.org/rfc/rfc2328) – OSPF Version 2, 1998, rozdz. 2 (baza stanu łączy, drzewo najkrótszych ścieżek), 3 „Splitting the AS into Areas” (obszary, obszar szkieletowy), 16 „Calculation of the routing table”.

[^RFC5340]: [RFC 5340](https://www.rfc-editor.org/rfc/rfc5340) – OSPF for IPv6, 2008.

[^RFC4271]: [RFC 4271](https://www.rfc-editor.org/rfc/rfc4271) – A Border Gateway Protocol 4 (BGP-4), 2006, rozdz. 3 „Summary of Operation”, 9.1 „Decision Process”.

[^RFC4861]: [RFC 4861](https://www.rfc-editor.org/rfc/rfc4861) – Neighbor Discovery for IP version 6, 2007, rozdz. 6 „Router and Prefix Discovery”.

[^RFC2663]: [RFC 2663](https://www.rfc-editor.org/rfc/rfc2663) – IP Network Address Translator (NAT) Terminology and Considerations, 1999.

[^RFC3022]: [RFC 3022](https://www.rfc-editor.org/rfc/rfc3022) – Traditional IP Network Address Translator (Traditional NAT), 2001.

[^RFC1918]: [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) – Address Allocation for Private Internets, 1996.

[^RFC7868]: [RFC 7868](https://www.rfc-editor.org/rfc/rfc7868) – Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP), 2016 (dokument informacyjny), rozdz. 2 (algorytm DUAL i warunek wykonalności).