---
sidebar_position: 1
title: "Ćwiczenie 1: Adresacja IPv4 i IPv6"
---

<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import SubnetTrainer from '@site/src/components/SubnetTrainer';
import DesignScenario from '@site/src/components/DesignScenario';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';

# Ćwiczenie 1: Adresacja IPv4 i IPv6

<SprawozdanieHeader
  thema="Administrowanie sieciami"
  exerciseTitle="Ćwiczenie 1: Adresacja IPv4 i IPv6"
  storageKey="cwiczenie-1"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-1"
  storageKeys={[]}
  sharedPrefix="cw1_"
/>

## I. Wprowadzenie

<StepByStep>
<Step title="IPv4">
<div className="justify">
**Adres IPv4** to 32-bitowa liczba, zapisywana w notacji dziesiętnej kropkowanej (cztery oktety po 8 bitów, np. 192.168.1.10) [^RFC791]. Każdy adres logicznie dzieli się na dwie części: **część sieciową** (identyfikującą sieć, do której należy urządzenie) i **część hosta** (identyfikującą konkretne urządzenie w tej sieci). To, gdzie dokładnie przebiega granica między tymi częściami, określa **maska podsieci**.

Nagłówek protokołu IP przedstawiono na Rysunku 1 i składa się m.in. z bloków (więcej informacji [^RFC791] rozdział 3.1):
- **Version** - wersja protokołu IP, czyli 4.
- **IHL (Internet Header Length)** - wskazuje, gdzie kończy sie nagłowek i zaczynają dane. wartosc 5 = 20B (bez opcji), a 15 = max 60B nagłówek.
- **Total Length** - długość całego pakietu (nagłówek i dane) w bajtach, maksymalnie 65 535 B.
- **TTL (Time To Live)** - czas życia pakietu, oznaczony jako licznik skoków, który każdy router zmniejsza o 1 zanim pakiet na stałe zostanie usunięty z sieci.
- **Source/Destination Address** - adres IP nadawacy oraz odbiorcy.

![Rys1](/img/po-adm-sieci-1/naglowek_ipv4.png)
<div className="text-center">
Rys.1 Nagłówek IPv4 (RFC 791)[^claude]
</div>

**Klasy adresów** (adresacja klasowa). Historycznie, w pierwszej wersji protokołu IP, granica między częścią sieciową a hostową była sztywno przypisana do jednej z pięciu klas, rozpoznawanych po najstarszych bitach pierwszego oktetu (Rysunek 2)[^RFC791][^tanen]:

![Rys2](/img/3/ipv4.png)
<div className="text-center">
Rys.2 Klasy adresów [^comer][^claude]
</div>

**Maska podsieci** to 32-bitowa wartość, w której jedynki oznaczają bity części sieciowej, a zera bity części hosta (np. 255.255.255.0 = 24 jedynki, 8 zer). Adres i maska zestawione operacją logiczną AND wskazują adres sieci, do której należy dany host.

**Adresy docelowe**:
- **unicast** - połącznie do jednego hosta.
- **broadcast** - adres rozgłoszeniowy do wszystkich w sieci, ale domyślnie nie przekazywany przez router.

**Fragmentacja i MTU**:
Gdy datagram jest większy niż MTU łącza wyjściowego, router IPv4 może go podzielić, o ile DF = 0 [^RFC791]. Routery pośrednie nie łączą fragmentów w całość dzieje się to dopiero u odbiorcy. Przy DF = 1 router odrzuca datagram i odsyła ICMP Destination Unreachable. **Przykład**: datagram 4000 B (20 B nagłówka + 3980 B danych) przechodzi przez łącze z MTU 1500 B. Powstają trzy fragmenty z danymi 1480, 1480 i 1020 B, z przesunięciami 0, 185 i 370 (×8 B) oraz flagą MF = 1, 1, 0 [^kurose].

**Adresy publiczne i prywatne**
Adresy publiczne są globalnie unikalne i przydzielane hierarchicznie, a strutkura zaczyna się od IANA [^iana], która pełni role globalnego zarządcy. Dla Europy i części Azji regionalnym zarządcą jest RIPE NCC, która przydziela adresy dla ISP (Internet Service Provider) oraz dużych firm regionalnych. Pula IANA wyczerpała się 3 lutego 2011 r., a RIPE NCC przydzielił ostatni blok /22 25 listopada 2019 r. Adresy prywatne można stosować dowolnie wewnątrz organizacji, ale nie są routowane w Internecie, więc wymagany jest NAT [^RFC1918]. Adresy prywatne to: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Występują również adresy specjalnego przeznaczenia jak: adres pętli zwrotnej `127.0.0.0/8`, czy adres nieogreślony 0.0.0.0/8.

Protokoły wspierające lub pracujące na adresacji IPv4:
- **ICMP** [^RFC792] - przesyła komunikaty o błedach i służy do diagnostyki. Na ICMP działa: `ping`, `traceroute`, Path MTU Discovery [^RFC1191].
- **ARP** [^RFC826] - odwzorowanie adresu IPv4 na MAC: zapytanie rozgłoszeniowe, odpowiedź unicast, pamięć podręczna z czasem życia. ARP nie ma uwierzytelniania, co umożliwia ARP spoofing.
- **DHCP** [^RFC3927] - automatyczny przydział adresu IP, maski, bramy i DNS (Domain Name Service) w czterech krokach DORA.
- **NAT/PAT** [^RFC3022] - translacja adresów prywatnych na publiczne. Wdrożenie wydłużyło wykorzsytanie IPv4, ale złamało zasadę komunikacji end-to-end.
</div>
</Step>

<Step title="IPv6">
<div className="justify">
**Adres IPv6** to 128-bitowa liczba (czterokrotnie dłuższa niż w IPv4) zapisywana w notacji szesnastkowej, w ośmiu grupach po 16 bitów rozdzielonych dwukropkiem (np. `2001:0db8:0000:0000:0000:ff00:0042:8329`) [^RFC8200][^RFC4291].

Nagłówek IPv6 jest **uproszczony** względem IPv4 ma stałą długość 40 bajtów i mniej pól, co ułatwia szybkie przetwarzanie przez routery [^RFC8200][^kurose]. Poniżej wypisano niektore pola z nagłówka IPv6:
- **Version** - wersja protokołu IP, czyli 6.
- **Payload Length** - długość całego pakietu (nagłówek i dane) w bajtach, maksymalnie 65 535 B.
- **Hop Limit** - maksymalna liczba przeskoków (routerów)(IPv4 - pola TTL), jaką może jeszcze wykonać pakiet, zanim zostanie usunięty z sieci,
- **Source/Destination Address** - adres IP nadawacy oraz odbiorcy.
</div>

![Rys3](/img/po-adm-sieci-1/naglowek_ipv6.png)
<div className="text-center">
Rys.3 Nagłówek IPv6 (RFC 791)[^claude]
</div>

~~Klasy adresów~~ **Prefiks**

Protokół od początku jest bezklasowy, a długość części sieciowej podaje się zawsze prefiksem w notacji CIDR, np. `2001:db8:1::/64`. Typ adresu rozpoznaje się po początkowych bitach, czyli po prefiksie. Ponizej w Tabeli 1 przedstawiono kilka prefiksow i ich znaczaenie.

Tab. 1. Typy prefiksów
| Prefiks | Typ | Znaczenie |
|---|---|---|
| 2000::/3 | globalny unicast (GUA) | publicznie routowalny w Internecie |
| fe80::/10 | Link-Local | automatycznie generowany na każdym interfejsie z obsługą IPv6, używany wyłącznie w ramach jednej sieci lokalnej |
| fc00::/7 (w praktyce fd00::/8) | unique local (ULA) | sieci wewnętrzne organizacji, nieroutowany w Internecie |
| ::1/128 | pętla zwrotna | odpowiednik 127.0.0.1 |
| ff00::/8 | multicast | adres grupowy, odpowiednik multicastu z IPv4 |
| pula unicast | anycast | ten sam adres przypisany wielu urządzeniom, gdzie pakiet dociera do najbliższego z nich |

<div className="justify">
W IPv6 **nie występuje maska podsieci** w postaci znanej z IPv4 (np. `255.255.255.0`) granicę między częścią sieciową a hostową zapisuje się wyłącznie jako **prefiks** po `/`, czyli liczbę bitów części sieciowej (np. `2001:db8:1::/64`) [^RFC4291]. Przyjętym standardem dla sieci użytkowników końcowych jest prefiks `/64`. Pozostałe 64 bity (identyfikator interfejsu) mogą być generowane automatycznie, m.in. na podstawie adresu MAC (EUI-64) lub losowo (Privacy Extensions) [^RFC4862].

Skracanie adresu
Dla czytelności dopuszczone są dwa uproszczenia zapisu: **pominięcie zer początkowych** w każdej grupie (`0db8` -> `db8`) oraz **zastąpienie jednej, kolejnej sekwencji grup samych zer** podwójnym dwukropkiem `::`. Taką operację można wykonać tylko **raz** w całym adresie, bo inaczej nie byłoby wiadomo, ile grup zer reprezentuje [^RFC5952]. Powyższy adres można więc zapisać skrócenie jako `2001:db8::ff00:42:8329`.
</div>

Protokoły wspierające lub pracujące na adresacji IPv6:
- **ICMPv6** - przejął funkcje ICMP, ARP i IGMP.
- **NDP (Neighbor Discovery Protocol)** - r ozwiązuje adresy w sieci czy zamiana IPv6 na MAC. Wykrywanie routerów oraz parametrów sieci. NUD (Neighbour Unreachability Detection) - sprawdza czy host jest osiągalny w sieci. DAD (Duplicate Address Detection) - sprawdza czy w sieci występują duplikaty adresacji.
- **SLAAC (Stateless Address Autoconfiguration)** - pozwala na automatyczne zbudowanie swoje adresu z Link-Local FE80::/10 adresu i adresu otrzymanego przez router dostarcza Router Advertisment. Host tworzy adres z prefiksu + host ID. Następnie DAD weryfikuje unikalność adresu w sieci.
- **SLAAC + bezstanowy DHCPv6** - adres z SLAAC, dodatkowe parametry (DNS, domena, NTP) z DHCPv6.
- **Stanowy DHCPv6** - adres przydziela serwer i prowadzi rejestr dzierżaw.

:::note
Głównym powodem powstania IPv6 było **wyczerpywanie się przestrzeni adresowej IPv4** (ok. 4,3 mld adresów, co przy liczbie urządzeń podłączonych do Internetu okazało się niewystarczające) — IPv6 oferuje przestrzeń adresową rzędu 2^128, praktycznie nieograniczoną na obecne potrzeby [^RFC8200][^tanen].
:::
</Step>
</StepByStep>

### Notacja CIDR

<div className="justify">
Zastąpiła klasy: długość części sieciowej podaje się jako prefiks /n (od 0 do 32) [^RFC4632]. Umożliwia to podział na podsieci o dowolnej wielkości oraz agregację (sumaryzację, supernetting): np. 192.168.4.0/24–192.168.7.0/24 da się zapisać jako 192.168.4.0/22, co zmniejsza tablice routingu [^RFC4632][^tanen].
</div>

### Koegzystancja

<div className="justify">
Oba te protokoły będą jeszcze wspołistnieć w sieciach. Przez co opracowano mechanizmy przejściowe, które możemy podzielić na trzy grupy:
- **podwójny stos (dual stack)** - urządzenia mają oba protokoły. Kolejność prób połączeń określa tablica polityk adresów, a Happy Eyeballs łączy się po IPv6, gdy nie ma odpoweidzi przechodzi na adres IPv4. To dziś rozwiązanie domyślne w sieciach firmowych i szkolnych.
- **tunelowanie** - pakiety IPv6 w IPv4 (6in4) albo odwrotnie. Pozostałe mechanizmy zostały wycofane lub nie są stosowane (np. 6to4 czy Teredo).
- **translacja** - NAT64 z DNS64 pozwala hostom tylko z IPv6 łączyć się z serwerami tylko z IPv4.
</div>

### Bezpieczeństwo

:::warning
**Ogółne**
- **IPv6 działa w sieci IPv4** - IPv6 włączony domyślnie, więc fałszywy router wysyłający RA (skrót od jednego ze stanów NDP) może przejąć ruch nawet tam, gdzie administrator „nie wdrażał IPv6”.
- **NDP, podobnie jak ARP, nie ma uwierzytelniania** - możliwe jest podszywanie się pod sąsiada i ataki na DAD.
- **zapora musi objąć IPv6** - osobne reguły, z przepuszczeniem niezbędnych komunikatów ICMPv6.

**IPv4**
- **Fałszywy serwer DHCP i wyczerpanie puli** - nieautoryzowany serwer DHCP (na PC atakującego; DHCP działa na zasadzie kto pierwszy ten lepszy) może rozdawać hostom własną bramę i DNS. Zalew żądań może natomiast wyczerpać pulę adresów.
- **Logi NAT i synchronizacja czasu** - za PAT wiele hostów korzysta z jednego adresu publicznego. Bez zapisów translacji i dokładnego czasu (NTP) nie da się po incydencie ustalić, który komputer wysłał podejrzany ruch.
- **Fałszowanie adresu źródłowego (spoofing)** - pakiet może mieć wpisany dowolny adres nadawcy, przez co atakujący może podmieniać adres IP na swoj i przechwytywać cały ruch początkowego nadawacy (man-in-the-middle).

**IPv6**
- **ICMPv6 jest częścią działającej sieci** - w przeciwieństwie do ICMPv4, który można częściowo blokować, ICMPv6 jest niezbędny do poprawnego funkcjonowania sieci (PMTUD - Path MTU Discovery, NDP - Neighbor Discovery Protocol)
- **NDP/RA** - fałszywy Router Advertisement i "shadow IPv6" w LAN - Atakujący może wysłać fałszywe komunikaty Router Advertisement (RA), podszywając się pod legalny router. To pozwala na przekierowanie ruchu IPv6 przez komputer atakującego (man-in-the-middle), stworzenie "cichej" sieci IPv6 równolegle do oficjalnej infrastruktury, lub całkowite zablokowanie komunikacji IPv6 w segmencie sieci.
- **Mechanizmy tunelowe obchodzą punkty egzekucji polityk** - tunele takie jak Teredo, 6to4 czy ISATAP enkapsulują ruch IPv6 w pakietach IPv4/UDP, co sprawia, że tradycyjne firewalle i systemy IDS/IPS mogą nie widzieć faktycznej zawartości komunikacji. Atakujący może wykorzystać te mechanizmy do exfiltracji danych lub uzyskania dostępu do zasobów wewnętrznych, omijając polityki bezpieczeństwa zaprojektowane tylko dla IPv4.
- **Rozszerzone nagłówki a co za tym idzie różna obsługa przez urządzenia** - IPv6 wykorzystuje rozszerzone nagłówki (Extension Headers), które różne urządzenia bezpieczeństwa obsługują w odmienny sposób lub wcale. Atakujący może tworzyć długie łańcuchy nagłówków rozszerzeń, fragmentować pakiety lub używać nieoczekiwanych kombinacji, które omijają mechanizmy inspekcji niektórych urządzeń.
:::

## II. Zadania do wykonania

### Pakiety pod lupą

<StepByStep>
<Step title="Przechwyć ruch sieciowy pochodzący z prostej komunikacji sieciowej">
Weryfikacja karty sieciowej: (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) i podajemy komendę ipconfig. Następnie wyszukujemy "Ethernet adapter Ethernet", który posiada adres IPv4 oraz IPv6 (Rysunek 4).
<div className="text-center">
![Rys4](/img/2/ipconfig.png)
Rys.4 Komenda ipconfig
</div>
Otwórz program **Wireshark** i rozpocznij przechwytywanie ruchu sieciowego na karcie.
</Step>

<Step title="Filtrowanie po ICMP">
Włącz filtrowanie przechwyconego ruchu, tak, by widoczne były tylko ramki z pakietami protokołu ICMP (Rysunek 5).
```
Filtr wyświetlania: icmp
```

<div className="text-center">
![Rys5](/img/2/zad1_2.png)

Rys.5 Fitrowanie w Wireshark [^wireshark]
</div>
</Step>

<Step title="Wygeneruj ruch sieciowy - IPv4">
Poproś sąsiada o adres IP jego komputera i za pomocą Wiersza polecenia systemu Windows wyślij na ten adres ping (Start ⇒ Wyszukaj programy i pliki ⇒ cmd ⇒ ping adres IP) (Rysunek 6).
```bash
ping -4 <IP>
```
<div className="text-center">
![Rys6](/img/po-adm-sieci-1/pingv4.png)

Rys.6 Komenda ping w wersji 4 [^wireshark]
</div>
</Step>

<Step title="Weryfikacja wyników">
Sprawdź, czy w programie Wireshark pojawiły się przechwycone ramki, po czym zatrzymaj przechwytywanie danych (Rysunek 7). Zwróć uwagę na segment **Internet Protocol Version 4**, po rowzinięciu można sprawdzić dokładną budowę nagłówka dla IPv4.

<div className="text-center">
![Rys7](/img/2/zad1_4.png)
Rys.7 Wyfiltrowane pakiety protkołu ICMP w Wireshark [^wireshark]
</div>
<ScreenshotPaste label="Zrzut ekranu: przechwyconej ramki" />
</Step>

<Step title="Wygeneruj ruch sieciowy - IPv6">
Poproś sąsiada o adres IP jego komputera i za pomocą Wiersza polecenia systemu Windows wyślij na ten adres ping (Start ⇒ Wyszukaj programy i pliki ⇒ cmd ⇒ ping adres IP) (Rysunek 8).
```bash
ping -6 <IP>
```
<div className="text-center">
![Rys8](/img/po-adm-sieci-1/pingv6.png)

Rys.8 Komenda ping w wersji 6 [^wireshark]
</div>

Sprawdź, czy w programie Wireshark pojawiły się przechwycone ramki, po czym zatrzymaj przechwytywanie danych (Rysunek 5). Zwróć uwagę na segment **Internet Protocol Version 6**, po rowzinięciu można sprawdzić dokładną budowę nagłówka dla IPv6.

<ScreenshotPaste label="Zrzut ekranu: przechwyconej ramki" />
</Step>
</StepByStep>


### IPv4 i IPv6 w szkolnej pracowni

Cisco Packet tracer 2 sieci do zrobienia + testy działania

[^RFC791]: IETF, [RFC 791](https://www.rfc-editor.org/info/rfc791/) — Internet Protocol.

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^comer]: D. E. Comer, [Sieci komputerowe i intersieci]((https://www.google.com/search?q=%22Sieci+komputerowe+i+intersieci%22+Comer+Helion+wydanie+V)), wyd. V, Helion, Gliwice 2012.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^RFC8200]: Deering, S., Hinden, R. — [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200).

[^RFC4291]: Hinden, R., Deering, S. — [RFC 4291: IP Version 6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291).

[^RFC4862]: Thomson, S., Narten, T., Jinmei, T. — [RFC 4862: IPv6 Stateless Address Autoconfiguration (SLAAC)](https://www.rfc-editor.org/rfc/rfc4862).

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 3, Helion, Gliwice 2006.

[^cisco-ipv6]: Cisco — [IPv6 Address Types](https://www.cisco.com/c/en/us/products/collateral/ios-nx-os-software/ios-ipv6/qa_c67-574995.html).

[^RFC5952]: Kawamura, S., Kawashima, M. — [RFC 5952: A Recommendation for IPv6 Address Text Representation](https://www.rfc-editor.org/rfc/rfc5952).

[^RFC4632]: RFC 4632 – [Classless Inter-domain Routing (CIDR)](https://www.rfc-editor.org/rfc/rfc4632), 2006.

[^jozefiok]: Józefiok A., CCNA 200-301. Zostań administratorem sieci komputerowych Cisco, wyd. II, Helion – rozdziały o routingu i NAT.

[^RFC792]: RFC 792 – [Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792), 1981.

[^RFC1191]: RFC 1191 – [Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191), 1990.

[^RFC3927]: RFC 3927 – [Dynamic Configuration of IPv4 Link-Local Addresses](https://www.rfc-editor.org/rfc/rfc3927), 2005.

[^RFC826]: RFC 826 – [An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826), 1982.

[^RFC3022]: RFC 3022 – [Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022), 2001.

[^RFC8200]: RFC 8200 – [Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200), 2017.

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.

[^iana]: [IANA](https://www.iana.org) - IPv4 Special-Purpose Address Registry oraz IPv6 Special-Purpose Address Registry.

[^RFC1918]: RFC 1918 – [Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918), 1996.