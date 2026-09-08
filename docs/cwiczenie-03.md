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

# Ćwiczenie 3: Warstwa sieciowa

*Część I — Model ISO/OSI*

## I. Wprowadzenie

<div className="justify">
**Warstwa sieciowa** odpowiada za adresację logiczną oraz trasowanie danych między odrębnymi sieciami. Podstawowym protokołem jest **IP**, a jego uzupełnieniem — **ICMP**, wykorzystywany do diagnostyki (ping, traceroute).

**Adres IPv4** to 32-bitowa liczba, zapisywana w notacji dziesiętnej kropkowanej (cztery oktety po 8 bitów, np. 192.168.1.10) [[1](#bib1)]. Każdy adres logicznie dzieli się na dwie części: **część sieciową** (identyfikującą sieć, do której należy urządzenie) i **część hosta** (identyfikującą konkretne urządzenie w tej sieci). To, gdzie dokładnie przebiega granica między tymi częściami, określa **maska podsieci**.

Nagłówek protokołu IP zawiera m.in. takie informacje jak:
- adres IP źródłowy i docelowy,
- wersja protokołu IP — IPv4 lub IPv6,
-  flagi — informują o tym, czy dany pakiet może być/jest podzielony i wysłany w ramach kilku ramek ethernetowych (ramka ethernetowa może zawierać ładunek o wielkości maksymalnie 1500 bajtów, jeśli pakiet wyższej warstwy jest większy, musi zostać podzielony, o ile nie jest ustawiona flaga Don’t fragment),
- TTL (ang. Time to Live) — czas życia, jaki pozostał pakietowi przed usunięciem go z sieci, innymi słowy maksymalna ilość przeskoków (routerów na trasie - ang. next hop), które może jeszcze dokonać dany pakiet,
- informacja o zawartości pakietu (PDU jakiego protokołu enkapsulowany jest w ramach pakietu).

**Klasy adresów** (adresacja klasowa). Historycznie, w pierwszej wersji protokołu IP, granica między częścią sieciową a hostową była sztywno przypisana do jednej z pięciu klas, rozpoznawanych po najstarszych bitach pierwszego oktetu [1][2]:
</div>

![Rys1](/img/3/ipv4.png)
<div className="text-center">
Rys.1 Klasy adresów [[4](#bib4)]
</div>

**Maska podsieci** to 32-bitowa wartość, w której jedynki oznaczają bity części sieciowej, a zera — bity części hosta (np. 255.255.255.0 = 24 jedynki, 8 zer). Adres i maska zestawione operacją logiczną AND wskazują adres sieci, do której należy dany host.

:::note
Podział na klasy ma dziś znaczenie głównie historyczne/edukacyjne, ponieważ od 1993 roku routing w Internecie opierają sie na bezklasowej notacji CIDR (Classless Inter-Domain Routing) [[3](#bib3)].
:::

---

<div className="justify">
**Router** to urządzenie warstwy 3 modelu OSI, którego zadaniem jest przekazywanie pakietów IP między różnymi sieciami, na podstawie decyzji podejmowanej dla każdego pakietu osobno [[4](#bib4)]. Decyzję tę router podejmuje, przeszukując swoją tablicę routingu. **Tablica routingu** to zbiór wpisów, z których każdy zawiera zazwyczaj:
</div>

- **Sieć docelowa (destination)** - adres sieci, do której prowadzi ten wpis, np. ```10.1.0.0/24```
- **Brama (next hop / gateway)** - adres IP kolejnego routera, do którego należy przesłać pakiet
- **Interfejs wyjściowy** - fizyczny/logiczny port, którym pakiet opuści router
- **Metryka	„koszt" trasy** - im niższy, tym trasa preferowana 

<div className="justify">
Gdy do routera trafia pakiet, przegląda on tablicę routingu w poszukiwaniu wpisu, którego sieć docelowa najdokładniej pasuje do adresu IP odbiorcy — zasada ta nazywa się regułą najdłuższego dopasowania prefiksu (longest prefix match) [[5](#bib5)]: jeśli pasują jednocześnie wpisy ```10.0.0.0/8``` i ```10.1.0.0/24```, router wybierze ten drugi, bardziej precyzyjny.

**Routing statyczny a dynamiczny** - trasy statyczne są wpisywane ręcznie przez administratora i pozostają niezmienne, dopóki ktoś ich nie zmieni; trasy dynamiczne są automatycznie wymieniane i aktualizowane między routerami przez protokoły routingu (RIP [[6](#bib6)], OSPF [[7](#bib7)]) w reakcji na zmiany w topologii sieci.
</div>

---

**Brama domyślna** to adres IP routera, do którego host wysyła cały ruch skierowany poza własną sieć lokalną, gdy nie zna żadnej bardziej szczegółowej trasy. W praktyce każdy komputer w sieci ma skonfigurowaną dokładnie jedną (zwykle) bramę domyślną — jest to jego „drzwi wyjściowe" do reszty świata. Mechanizm przedstawiono na Rysunku 2. 

![Rys2](/img/3/brama_domyslna.png)
<div className="text-center">
Rys.1 Mechanizm wykorzystania bramy domyślnej [[4](#bib4)]
</div>

:::note
- W tablicy routingu brama domyślna widnieje jako wpis ```0.0.0.0/0``` (dosłownie „dowolna sieć, dowolna maska").
- Brama domyślna musi znajdować się w tej samej sieci lokalnej co host — router nie może być bramą dla sieci, do której nie ma bezpośrednio podłączonego interfejsu.
:::

---

**ICMP (Internet Control Message Protocol)** to protokół towarzyszący IP, zdefiniowany w RFC 792 [[8](#bib8)], służący do przesyłania komunikatów kontrolnych i błędów, a nie danych użytkownika. ICMP nie ma portów ani sesji — komunikaty ICMP są zwykle generowane automatycznie przez stos sieciowy w reakcji na problem z dostarczeniem pakietu IP.


| Typ     | Nazwa     | Zastosowanie |
|---------|---------|-----------------------|
| 0/8       | Echo Reply/Echo Request    | polecenie **ping** — sprawdzenie osiągalności hosta             |
| 3       | Destination Unreachable | router/host nie może dostarczyć pakietu (np. brak trasy, zablokowany port)              |
| 11       | Time Exceeded  | pole TTL pakietu spadło do zera — router odrzucił pakiet; wykorzystywane przez **traceroute**                   |

## II. Zadania do wykonania

0. Przypomnienie dotyczące zamiany systemów liczbowych.
1. Ćwiczenia rachunkowe z podziału sieci na podsieci (VLSM).
2. Odczytać konfigurację IP i tablicę routingu (ipconfig / route print).
3. Przeanalizować działanie traceroute/tracert.
4. Przeanalizować nagłówek pakietu IP w Wireshark.

### Systemy liczbowe

<div className="justify">
Jako że w zagadnieniach adresacji IP korzystamy z konwersji liczb pomiędzy różnymi systemami liczbowymi, warto przypomnieć sobie 3 najważniejsze systemy z punktu widzenia sieci komputerowych:
</div>

- **System dziesiętny** - wykorzystywane cyfry: 0,1,2,3,4,5,6,7,8,9. Klasycznie, poszczególne oktety adresu IP zapisywane są w systemie dzesiętnym. W systemie tym podstawę stanowi liczba 10:

<div className="text-center">
234 = 2 · 102 + 3 · 101 + 4 · 100
</div>

- **System binarny** - wykorzystywane cyfry: 0,1. dzięki zapisowi binarnemu maski sieciowej jesteśmy w stanie odróżnić w adresie IP część sieci od części hosta. Podstawę stanowi liczba 2:

<div className="text-center">
11002 = 1 · 23 + 1 · 22 + 0 · 21 + 0 · 20 = 8 + 4 = 12
</div>

- **System szesnastkowy** - Wykorzystywane cyfry: 0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F, gdzie A=10,B=11, ... ,F=15. Adresy MAC zapisywane są w systemie szesnastkowym. Podstawę stanowi liczba 16:

<div className="text-center">
0xA8 = 10 · 161 + 8 · 160 = 160 + 8 = 168
</div>

<NumberBaseTrainer title="Ćwiczenie — konwersja systemów liczbowych" count={10} />

### Obliczanie parametrów sieci

<div className="justify">
**Adres IP** składa się z dwóch części. Jedna z nich określa, do której sieci należy host o danym adresie (tzw. **część sieci**), druga jednoznacznie identyfikuje hosta w ramach tejże sieci (tzw. **część hosta**). Do oddzielenia części sieci od części hosta służy maska sieciowa. Ma ona taką samą długość, co adres IP. Tam, gdzie w masce sieciowej występuje wartość 1, odpowiadające jej bity w adresie IP należą do części sieci. Analogicznie, te bity, które w masce mają wartość 0, należą do części hosta. Ważne — w masce sieciowej bity o wartości 1 nie mogą być przerywane zerami.
</div>
<SubnetTrainer countIPv4={5} countIPv6={2} title="Adresacja IPv4/IPv6" />

### IP, ping i tracert

<StepByStep>

<Step title="Odczytanie konfiguracji IP">
Sprawdź aktualną konfigurację adresu IP, maski i bramy domyślnej swojej stacji. Wykorzystując polecenie w Wierszu poleceń (Start ⇒ Wyszukaj programy i pliki ⇒ cmd)

```bash
ipconfig /all
```

**Na co zwrócić uwagę:**
- adres IP
- maska podsieci
- brama domyślna Twojego interfejsu
</Step>

<Step title="Odczytanie konfiguracji tablicy routingu">
Sprawdź stan tablicy routingu. Wykorzystując polecenie w Wierszu poleceń (Start ⇒ Wyszukaj programy i pliki ⇒ cmd)

```bash
route print
```

**Na co zwrócić uwagę:**
- wpis `0.0.0.0` (trasa domyślna) w tablicy routingu i wskazywany przez niego adres bramy,
- czy w tablicy pojawiają się inne, bardziej szczegółowe trasy (np. do sieci lokalnej) — porównaj je z zasadą najdłuższego dopasowania prefiksu, o której mówiliśmy przy bramie domyślnej.
</Step>

<Step title="Analiza działania traceroute/tracert">

Wykonaj polecenie do wybranego serwera (np. znanej strony internetowej) i przeanalizuj wynik. Wykorzystaj Wierszu poleceń (Start ⇒ Wyszukaj programy i pliki ⇒ cmd)

```bash
tracert 8.8.8.8
```

**Na co zwrócić uwagę:**
- każda linia wyniku to kolejny router (hop) na trasie do celu,
- mechanizm działania: pakiety wysyłane są z rosnącym o 1 polem TTL; każdy router, który odrzuci pakiet z TTL=0, odsyła komunikat **ICMP Time Exceeded**, ujawniając swój adres,
- trzy czasy w każdej linii to trzy próby do tego samego routera — porównaj różnice między hopami, żeby zauważyć, gdzie występują największe opóźnienia,
- czy pojawiają się linie z samymi gwiazdkami `* * *` — oznacza to router, który nie odpowiada na ten typ ruchu (niekoniecznie awarię).

</Step>

<Step title="Analiza nagłówka pakietu IP w Wireshark">

Uruchom przechwytywanie ruchu w programie Wireshark, wygeneruj ruchu przy pomocy polecenia ```ping <IP>```, zatrzymaj przechwytywanie i przeanalizuj pojedynczy pakiet.

```
Filtr wyświetlania: icmp
```

Kliknij dowolny pakiet, a następnie rozwiń w panelu szczegółów sekcję **Internet Protocol Version 4**.

**Pola do zidentyfikowania:**
- **Version** — powinno być 4,
- **Header Length** — długość nagłówka (zwykle 20 bajtów bez opcji),
- **Total Length** — całkowita długość pakietu,
- **Time to Live (TTL)** — porównaj tę wartość z tym, co widziałeś/aś w traceroute w poprzednim kroku,
- **Protocol** — numer protokołu wyższej warstwy (6 = TCP, 17 = UDP, 1 = ICMP),
- **Source Address / Destination Address** — adresy IP nadawcy i odbiorcy.

</Step>

</StepByStep>

## III. Bibliografia

<a id="bib1"></a>[1] IETF, [RFC 791](https://www.rfc-editor.org/info/rfc791/) — Internet Protocol.

<a id="bib2"></a>[2] A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

<a id="bib3"></a>[3] V. Fuller, T. Li, IETF, [RFC 4632](https://www.rfc-editor.org/info/rfc4632/) — Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan.

<a id="bib4"></a>[4] D. E. Comer, [Sieci komputerowe i intersieci]((https://www.google.com/search?q=%22Sieci+komputerowe+i+intersieci%22+Comer+Helion+wydanie+V)), wyd. V, Helion, Gliwice 2012.

<a id="bib5"></a>[5] J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 3, Helion, Gliwice 2006.

<a id="bib6"></a>[6] G. Malkin, [RFC 2453](https://datatracker.ietf.org/doc/html/rfc2453/) - RIP Version 2.

<a id="bib7"></a>[7] J. Moy, [RFC 2328](https://www.rfc-editor.org/info/rfc2328/) - OSPF Version 2.

<a id="bib8"></a>[8] IETF, [RFC 792](https://www.rfc-editor.org/info/rfc792/) — Internet Control Message Protocol.