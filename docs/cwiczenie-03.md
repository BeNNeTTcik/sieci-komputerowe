---
sidebar_position: 3
title: "Ćwiczenie 3: Warstwa sieciowa"
---
<!--- import bibliotek -->
import SubnetTrainer from '@site/src/components/SubnetTrainer';
import NumberBaseTrainer from '@site/src/components/NumberBaseTrainer';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import EditableTable from '@site/src/components/EditableTable';

# Ćwiczenie 3: Warstwa sieciowa

*Część I — Model ISO/OSI*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 3: Warstwa sieciowa"
  storageKey="cwiczenie-3"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-3"
  storageKeys={['cwiczenie-3','systemy-liczbowe', 'adresacja-trener', 'tabela', 'tabela2']}
  sharedPrefix="cw3_"
/>

## I. Wprowadzenie

<div className="justify">
**Warstwa sieciowa** odpowiada za adresację logiczną oraz trasowanie danych między odrębnymi sieciami. Podstawowym protokołem jest **IP**, a jego uzupełnieniem — **ICMP**, wykorzystywany do diagnostyki (ping, traceroute).
</div>

<StepByStep>
<Step title="IPv4">
<div className="justify">
**Adres IPv4** to 32-bitowa liczba, zapisywana w notacji dziesiętnej kropkowanej (cztery oktety po 8 bitów, np. 192.168.1.10) [^RFC791]. Każdy adres logicznie dzieli się na dwie części: **część sieciową** (identyfikującą sieć, do której należy urządzenie) i **część hosta** (identyfikującą konkretne urządzenie w tej sieci). To, gdzie dokładnie przebiega granica między tymi częściami, określa **maska podsieci**.

Nagłówek protokołu IP zawiera m.in. takie informacje jak:
- adres IP źródłowy i docelowy,
- wersja protokołu IP - IPv4 lub IPv6,
-  flagi - informują o tym, czy dany pakiet może być/jest podzielony i wysłany w ramach kilku ramek ethernetowych (ramka ethernetowa może zawierać ładunek o wielkości maksymalnie 1500 bajtów, jeśli pakiet wyższej warstwy jest większy, musi zostać podzielony, o ile nie jest ustawiona flaga Don’t fragment),
- TTL (ang. Time to Live) - czas życia, jaki pozostał pakietowi przed usunięciem go z sieci, innymi słowy maksymalna ilość przeskoków (routerów na trasie - ang. next hop), które może jeszcze dokonać dany pakiet,
- informacja o zawartości pakietu (PDU jakiego protokołu enkapsulowany jest w ramach pakietu).

**Klasy adresów** (adresacja klasowa). Historycznie, w pierwszej wersji protokołu IP, granica między częścią sieciową a hostową była sztywno przypisana do jednej z pięciu klas, rozpoznawanych po najstarszych bitach pierwszego oktetu (Rysunek 1)[^RFC791][^tanen]:
</div>

![Rys1](/img/3/ipv4.png)
<div className="text-center">
Rys.1 Klasy adresów [^comer][^claude]
</div>

**Maska podsieci** to 32-bitowa wartość, w której jedynki oznaczają bity części sieciowej, a zera bity części hosta (np. 255.255.255.0 = 24 jedynki, 8 zer). Adres i maska zestawione operacją logiczną AND wskazują adres sieci, do której należy dany host.

:::note
Podział na klasy ma dziś znaczenie głównie historyczne/edukacyjne, ponieważ od 1993 roku routing w Internecie opierają sie na bezklasowej notacji CIDR (Classless Inter-Domain Routing)[^RFC4632].
:::
</Step>

<Step title="IPv6">
<div className="justify">
**Adres IPv6** to 128-bitowa liczba (czterokrotnie dłuższa niż w IPv4) zapisywana w notacji szesnastkowej, w ośmiu grupach po 16 bitów rozdzielonych dwukropkiem (np. `2001:0db8:0000:0000:0000:ff00:0042:8329`) [^RFC8200][^RFC4291]. Dla czytelności dopuszczone są dwa uproszczenia zapisu: **pominięcie zer początkowych** w każdej grupie (`0db8` -> `db8`) oraz **zastąpienie jednej, kolejnej sekwencji grup samych zer** podwójnym dwukropkiem `::`. Taką operację można wykonać tylko **raz** w całym adresie, bo inaczej nie byłoby wiadomo, ile grup zer reprezentuje [^RFC5952]. Powyższy adres można więc zapisać skrócenie jako `2001:db8::ff00:42:8329`.

W IPv6 **nie występuje maska podsieci** w postaci znanej z IPv4 (np. `255.255.255.0`) granicę między częścią sieciową a hostową zapisuje się wyłącznie jako **prefiks** po `/`, czyli liczbę bitów części sieciowej (np. `2001:db8:1::/64`) [^RFC4291]. Przyjętym standardem dla sieci użytkowników końcowych jest prefiks `/64`; pozostałe 64 bity (identyfikator interfejsu) mogą być generowane automatycznie, m.in. na podstawie adresu MAC (EUI-64) lub losowo (Privacy Extensions) [^RFC4862].
</div>

Nagłówek IPv6 jest **uproszczony** względem IPv4 ma stałą długość 40 bajtów i mniej pól, co ułatwia szybkie przetwarzanie przez routery [^RFC8200][^kurose]:
- adres IPv6 źródłowy i docelowy (po 128 bitów każdy, zamiast 32 w IPv4),
- **Hop Limit** - maksymalna liczba przeskoków (routerów)(IPv4 - pola TTL), jaką może jeszcze wykonać pakiet, zanim zostanie usunięty z sieci,
- **Next Header** - odpowiednik pola Protocol z IPv4, wskazujący, jaki protokół/nagłówek rozszerzeń następuje po nagłówku głównym,
- **Flow Label** - pole nieobecne w IPv4, pozwalające oznaczyć pakiety należące do tego samego "przepływu" (np. jednej sesji streamingu), co ułatwia routerom jednolite traktowanie ruchu bez analizy wyższych warstw,
- **brak pola checksum** oraz **brak fragmentacji przez routery po drodze** - w IPv6 fragmentacji (jeśli jest potrzebna) dokonuje wyłącznie host źródłowy, a nie routery na trasie, co dodatkowo odciąża te urządzenia [^RFC8200].

**Typy adresów** (odpowiednik "klas" z IPv4, choć działający na zupełnie innej zasadzie - podział nie jest sztywno przypisany do bitów adresu, a do jego przeznaczenia) [^RFC4291][^cisco-ipv6]:
- **Unicast globalny** (*Global Unicast*) - publicznie routowalny w Internecie, zaczyna się od prefiksu `2000::/3`; odpowiednik publicznego adresu IPv4,
- **Unicast lokalny łącza** (*Link-Local*, `FE80::/10`) - automatycznie generowany na **każdym** interfejsie z obsługą IPv6, używany wyłącznie w ramach jednej sieci lokalnej (nie jest routowany).
- **Unikalny lokalny** (*Unique Local*, `FC00::/7`) - odpowiednik prywatnych adresów IPv4 (`10.0.0.0/8` itd.) - używany wewnątrz organizacji, nieroutowany w Internecie,
- **Multicast** (`FF00::/8`) — adres grupowy, odpowiednik multicastu z IPv4, ale w IPv6 **całkowicie zastępuje broadcast**, który w tym protokole **nie istnieje** - zamiast rozsyłać ruch do wszystkich hostów w sieci, używa się dedykowanych adresów multicast (np. `FF02::1` = wszystkie węzły w danym łączu),
- **Anycast** - ten sam adres przypisany wielu urządzeniom; pakiet dociera do **najbliższego** z nich (wg metryki routingu) - koncepcyjnie obecny też w IPv4, ale w IPv6 formalnie zdefiniowany jako osobny typ.

:::note
Głównym powodem powstania IPv6 było **wyczerpywanie się przestrzeni adresowej IPv4** (ok. 4,3 mld adresów, co przy liczbie urządzeń podłączonych do Internetu okazało się niewystarczające) — IPv6 oferuje przestrzeń adresową rzędu 2^128, praktycznie nieograniczoną na obecne potrzeby [^RFC8200][^tanen].
:::
</Step>
</StepByStep>

---

<div className="justify">
**Router** to urządzenie warstwy 3 modelu OSI, którego zadaniem jest przekazywanie pakietów IP między różnymi sieciami, na podstawie decyzji podejmowanej dla każdego pakietu osobno [^comer]. Decyzję tę router podejmuje, przeszukując swoją tablicę routingu. **Tablica routingu** to zbiór wpisów, z których każdy zawiera zazwyczaj:
</div>

- **Sieć docelowa (destination)** - adres sieci, do której prowadzi ten wpis, np. ```10.1.0.0/24```
- **Brama (next hop / gateway)** - adres IP kolejnego routera, do którego należy przesłać pakiet
- **Interfejs wyjściowy** - fizyczny/logiczny port, którym pakiet opuści router
- **Metryka	„koszt" trasy** - im niższy, tym trasa preferowana

<div className="justify">
Gdy do routera trafia pakiet, przegląda on tablicę routingu w poszukiwaniu wpisu, którego sieć docelowa najdokładniej pasuje do adresu IP odbiorc. Zasada ta nazywa się regułą najdłuższego dopasowania prefiksu (longest prefix match) [^kurose]: jeśli pasują jednocześnie wpisy ```10.0.0.0/8``` i ```10.1.0.0/24```, router wybierze ten drugi, bardziej precyzyjny.

**Routing statyczny a dynamiczny** - trasy statyczne są wpisywane ręcznie przez administratora i pozostają niezmienne, dopóki ktoś ich nie zmieni; trasy dynamiczne są automatycznie wymieniane i aktualizowane między routerami przez protokoły routingu (RIP [^RFC2453], OSPF [^RFC2328]) w reakcji na zmiany w topologii sieci.
</div>

---

**Brama domyślna** to adres IP routera, do którego host wysyła cały ruch skierowany poza własną sieć lokalną, gdy nie zna żadnej bardziej szczegółowej trasy. W praktyce każdy komputer w sieci ma skonfigurowaną dokładnie jedną (zwykle) bramę domyślną — jest to jego „drzwi wyjściowe" do reszty świata. Mechanizm przedstawiono na Rysunku 2.

![Rys2](/img/3/brama_domyslna.png)
<div className="text-center">
Rys.2 Mechanizm wykorzystania bramy domyślnej [^comer][^claude]
</div>

:::note
- W tablicy routingu brama domyślna widnieje jako wpis ```0.0.0.0/0``` (dosłownie „dowolna sieć, dowolna maska").
- Brama domyślna musi znajdować się w tej samej sieci lokalnej co host — router nie może być bramą dla sieci, do której nie ma bezpośrednio podłączonego interfejsu.
:::

---

**ICMP (Internet Control Message Protocol)** to protokół towarzyszący IP, zdefiniowany w RFC 792 [^RFC792], służący do przesyłania komunikatów kontrolnych i błędów, a nie danych użytkownika. ICMP nie ma portów ani sesji, komunikaty ICMP są zwykle generowane automatycznie przez stos sieciowy w reakcji na problem z dostarczeniem pakietu IP.

| Typ     | Nazwa     | Zastosowanie |
|---------|---------|-----------------------|
| 0/8       | Echo Reply/Echo Request    | polecenie **ping** - sprawdzenie osiągalności hosta             |
| 3       | Destination Unreachable | router/host nie może dostarczyć pakietu (np. brak trasy, zablokowany port)              |
| 11       | Time Exceeded  | pole TTL pakietu spadło do zera - router odrzucił pakiet; wykorzystywane przez **traceroute**                   |

## II. Zadania do wykonania

### Systemy liczbowe

<div className="justify">
Jako że w zagadnieniach adresacji IP korzystamy z konwersji liczb pomiędzy różnymi systemami liczbowymi, warto przypomnieć sobie 3 najważniejsze systemy z punktu widzenia sieci komputerowych:
</div>

- **System dziesiętny** - wykorzystywane cyfry: 0,1,2,3,4,5,6,7,8,9. Klasycznie, poszczególne oktety adresu IP zapisywane są w systemie dzesiętnym. W systemie tym podstawę stanowi liczba 10:

<div className="text-center">
234<sub>10</sub> = 2 · 10<sup>2</sup> + 3 · 10<sup>1</sup> + 4 · 10<sup>0</sup>
</div>

- **System binarny** - wykorzystywane cyfry: 0,1. dzięki zapisowi binarnemu maski sieciowej jesteśmy w stanie odróżnić w adresie IP część sieci od części hosta. Podstawę stanowi liczba 2:

<div className="text-center">
1100<sub>2</sub> = 1 · 2<sup>3</sup> + 1 · 2<sup>2</sup> + 0 · 2<sup>1</sup> + 0 · 2<sup>0</sup> = 8 + 4 = 12
</div>

- **System szesnastkowy** - Wykorzystywane cyfry: 0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F, gdzie A=10,B=11, ... ,F=15. Adresy MAC zapisywane są w systemie szesnastkowym. Podstawę stanowi liczba 16:

<div className="text-center">
A8<sub>16</sub> = 10 · 16<sup>1</sup> + 8 · 16<sup>0</sup> = 160 + 8 = 168
</div>

<NumberBaseTrainer
  title="Ćwiczenie — konwersja systemów liczbowych"
  count={10}
  storageKey="systemy-liczbowe"
/>

### Obliczanie parametrów sieci

<div className="justify">
**Adres IP** składa się z dwóch części. Jedna z nich określa, do której sieci należy host o danym adresie (tzw. **część sieci**), druga jednoznacznie identyfikuje hosta w ramach tejże sieci (tzw. **część hosta**). Do oddzielenia części sieci od części hosta służy maska sieciowa. Ma ona taką samą długość, co adres IP. Tam, gdzie w masce sieciowej występuje wartość 1, odpowiadające jej bity w adresie IP należą do części sieci. Analogicznie, te bity, które w masce mają wartość 0, należą do części hosta. Ważne: w masce sieciowej bity o wartości 1 nie mogą być przerywane zerami.
</div>

<SubnetTrainer
  countIPv4={5}
  countIPv6={2}
  title="Adresacja IPv4/IPv6"
  storageKey="adresacja-trener"
/>

### IP, ping i tracert

<StepByStep>

<Step title="Odczytanie konfiguracji IP">
Sprawdź aktualną konfigurację adresu IP, maski i bramy domyślnej swojej stacji (adres 10.114.202.x - Ethernet0) (Rysunek 3). Wykorzystując polecenie w **Wierszu poleceń** (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) i  wypełnij tabellę.

```bash
ipconfig /all
```

![Rys3](/img/3/ipconfig.png)
<div className="text-center">
Rys.3 Komenda ipconfig
</div>

<EditableTable
  title="Konfiguracja karty sieciowej"
  storageKey="tabela"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'wartosc', label: 'Wartość'}
  ]}
  initialRows={[
    {parametr: "adres IP", wartosc: ''},
    {parametr: "maska", wartosc: ''},
    {parametr: "brama domyślna", wartosc: ''},
    {parametr: "serwer DNS", wartosc: ''},
    {parametr: "MAC adres", wartosc: ''},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>

<Step title="Odczytanie konfiguracji tablicy routingu">
Sprawdź stan tablicy routingu. Wykorzystując polecenie w **Wierszu poleceń** (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) (Rysunek 4):

```bash
route print
```

![Rys4](/img/3/route.png)
<div className="text-center">
Rys.4 Komenda route print
</div>

**Na co zwrócić uwagę:**
- wpis `0.0.0.0` (trasa domyślna) w tablicy routingu i wskazywany przez niego adres bramy,
- czy w tablicy pojawiają się inne, bardziej szczegółowe trasy (np. do sieci lokalnej) porównaj z zasadą najdłuższego dopasowania prefiksu, o której mówiliśmy przy bramie domyślnej.

<ScreenshotPaste label="Zrzut ekranu: tablica routingu" />

</Step>

<Step title="Analiza działania traceroute/tracert">

Wykonaj polecenie do wybranego serwera (np. znanej strony internetowej) i przeanalizuj wynik. Wykorzystaj **Wierszu poleceń** (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) (Rysunek 5)

```bash
tracert 8.8.8.8
```

![Rys5](/img/3/tracert.png)
<div className="text-center">
Rys.5 Komenda tracert
</div>

**Na co zwrócić uwagę:**
- każda linia wyniku to kolejny router (hop) na trasie do celu,
- mechanizm działania: pakiety wysyłane są z rosnącym o 1 polem TTL; każdy router, który odrzuci pakiet z TTL=0, odsyła komunikat **ICMP Time Exceeded**, ujawniając swój adres,
- trzy czasy w każdej linii to trzy próby do tego samego routera. Porównaj różnice między hopami, żeby zauważyć, gdzie występują największe opóźnienia,
- czy pojawiają się linie z samymi gwiazdkami `* * *`. Oznacza to router, który nie odpowiada na ten typ ruchu (niekoniecznie awarię).

<ScreenshotPaste label="Zrzut ekranu: wynik polecenia tracert" />
</Step>

<Step title="Analiza nagłówka pakietu IP w Wireshark">

Uruchom przechwytywanie ruchu w programie **Wireshark** (Ethernet0), wygeneruj ruchu przy pomocy polecenia ```ping <IP>```, wyfitruj ruch ICMP (Rysunek 6), zatrzymaj przechwytywanie i przeanalizuj pojedynczy pakiet.

```
Filtr wyświetlania: icmp
```

![Rys6](/img/3/icmp.png)
<div className="text-center">
Rys.6 Filtrowanie pakietów w Wireshark [^wireshark]
</div>

Kliknij dowolny pakiet, a następnie rozwiń w panelu szczegółów sekcję **Internet Protocol Version 4**.
<EditableTable
  title="Wpisz odpowiednie parametry z sekcji Internet Protocol Version 4"
  storageKey="tabela2"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'opis', label: 'Opis', readOnly: true},
    {key: 'wartosc', label: 'Wartość'}
  ]}
  initialRows={[
    {parametr: "Version", opis: "Wersja protokołu i powinna wynosi 4", wartosc: ''},
    {parametr: "Header Length", opis: "Długość nagłówka (zwykle 20 bajtów)", wartosc: ''},
    {parametr: "Total Length", opis: "Całkowita długość pakietu", wartosc: ''},
    {parametr: "Time to Live (TTL)", opis: "Długość życia pakietu - ilość przejść przez router zanim zostanie usunięty", wartosc: ''},
    {parametr: "Protocol", opis: "Numer protokołu wyższej warstwy jaki obsługuje", wartosc: ''},
    {parametr: "Source Address", opis: "Adresy IP nadawcy", wartosc: ''},
    {parametr: "Destination Address", opis: "Adresy IP odbiorcy", wartosc: ''},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
<ScreenshotPaste label="Zrzut ekranu: pakiet IP z sekcją IPv4" />

</Step>
</StepByStep>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^RFC791]: IETF, [RFC 791](https://www.rfc-editor.org/info/rfc791/) — Internet Protocol.

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^RFC4632]: V. Fuller, T. Li, IETF, [RFC 4632](https://www.rfc-editor.org/info/rfc4632/) — Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan.

[^comer]: D. E. Comer, [Sieci komputerowe i intersieci]((https://www.google.com/search?q=%22Sieci+komputerowe+i+intersieci%22+Comer+Helion+wydanie+V)), wyd. V, Helion, Gliwice 2012.

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 3, Helion, Gliwice 2006.

[^RFC2453]: G. Malkin, [RFC 2453](https://datatracker.ietf.org/doc/html/rfc2453/) - RIP Version 2.

[^RFC2328]: J. Moy, [RFC 2328](https://www.rfc-editor.org/info/rfc2328/) - OSPF Version 2.

[^RFC792]: IETF, [RFC 792](https://www.rfc-editor.org/info/rfc792/) — Internet Control Message Protocol.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^RFC8200]: Deering, S., Hinden, R. — [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200).

[^RFC4291]: Hinden, R., Deering, S. — [RFC 4291: IP Version 6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291).

[^RFC5952]: Kawamura, S., Kawashima, M. — [RFC 5952: A Recommendation for IPv6 Address Text Representation](https://www.rfc-editor.org/rfc/rfc5952).

[^RFC4862]: Thomson, S., Narten, T., Jinmei, T. — [RFC 4862: IPv6 Stateless Address Autoconfiguration (SLAAC)](https://www.rfc-editor.org/rfc/rfc4862).

[^cisco-ipv6]: Cisco — [IPv6 Address Types](https://www.cisco.com/c/en/us/products/collateral/ios-nx-os-software/ios-ipv6/qa_c67-574995.html).

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.
