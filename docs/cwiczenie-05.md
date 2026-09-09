---
sidebar_position: 5
title: "Ćwiczenie 5: Warstwy sesji, prezentacji i aplikacji. Podsumowanie OSI"
---
<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import TestKoncowyCzesc1 from '@site/src/components/TestKoncowyCzesc1';

# Ćwiczenie 5: Warstwy sesji, prezentacji i aplikacji.

*Część I — Model ISO/OSI*

## I. Wprowadzenie
<div className="justify">
**Warstwa sesji** - odpowiada za nawiązywanie, utrzymywanie, synchronizację i kończenie sesji komunikacyjnej — czyli logicznego, trwającego dłużej niż pojedyncza transakcja "dialogu" między dwiema aplikacjami [^tanen]. Głowne funkcje jakie pełni warstwa to [^kurose]:
</div>
- **Zarządzanie dialogiem (dialog control)** - określa, w jaki sposób strony mogą się komunikować: pełny dupleks (obie strony nadają jednocześnie) albo półdupleks (strony na przemian przekazują sobie "prawo głosu", jak walkie-talkie).
- **Synchronizacja (synchronization points / checkpointing)** - przy długotrwałym transferze danych (np. przesyłaniu wielkiego pliku) warstwa sesji wstawia w strumień danych punkty synchronizacji (checkpointy). Jeśli w trakcie transferu dojdzie do awarii, wznowienie następuje od ostatniego checkpointu, a nie od samego początku.
- **Zarządzanie sesją (session management)** - obejmuje samo nawiązanie sesji (często z uwierzytelnieniem stron), utrzymywanie jej aktywności oraz uporządkowane zakończenie.

<div className="justify">
**Warstwa prezentacji** - odpowiada za to, żeby dane wysłane przez aplikację na jednym urządzeniu były zrozumiałe dla aplikacji na urządzeniu odbierającym [^tanen]. To warstwa, która zajmuje się **składnią przesyłanych danych**, a nie ich znaczeniem (tym zajmuje się dopiero warstwa aplikacji). Wewnątrz warstwy można wyróznic trzy głwone funkcje (Rysunek 1):
</div>

![Rys1](/img/5/funkcje.png)
<div className="text-center">
Rys.1 Kolejne etapy obróbki danych z aplikacji [^claude]
</div>

Poszczególne kroki obróbki danych pochodzących z aplikacji:
- **Translacja/formatowanie danych** - różne systemy komputerowe mogą wewnętrznie reprezentować te same dane w różny sposób — np. kolejność bajtów w liczbach wielobajtowych (big-endian vs little-endian) albo historyczne kodowanie znaków EBCDIC [^kurose].

- **Kompresja danych** - zmniejsza ilość bitów potrzebną do przesłania tej samej informacji — czy to bezstratnie (ZIP), czy stratnie, jeśli niewielka utrata jakości jest akceptowalna w zamian za znaczną redukcję rozmiaru (JPEG dla obrazów, MPEG dla wideo) [^tanen].

- **Szyfrowanie i deszyfrowanie danych** - zapewnia poufność przesyłanych danych - nadawca szyfruje dane przed wysłaniem, odbiorca deszyfruje je po odebraniu, tak aby ewentualny podsłuchujący po drodze nie mógł odczytać treści [^kurose].

**Warstwa aplikacji** - najwyższa warstwa modelu — zapewnia bezpośredni interfejs między siecią a programami użytkownika. To ona definiuje format i znaczenie komunikatów wymienianych między aplikacjami — nie zajmuje się już tym, jak dane dotrą do celu (to załatwiają niższe warstwy), tylko co te dane oznaczają dla konkretnej usługi [^tanen].

**Najczęściej wykorzystywane protokoły tej warstwy:**

<StepByStep>
<Step title="DNS">
:::note W skrócie!
<div className="justify">
Tłumaczy nazwy domenowe (rozumiałe dla czlowieka np. ```wp.pl```) na adresy IP (rozumiałem dla maszyny).
</div>
:::

<div className="justify">
Organizuje nazwy domenowe w postaci odwróconego drzewa (Rysunek 2) — każdy poziom w nazwie (czytanej od prawej do lewej) odpowiada jednemu poziomowi w hierarchii [^tanen]:
</div>

![Rys2](/img/5/dns_1.png)
<div className="text-center">
Rys.2 Odwrócone drzewo nazw domenowych [^claude]
</div>

<div className="justify">
Każdy poziom hierarchii jest zarządzany niezależnie — właściciel domeny ```przyklad.pl``` samodzielnie decyduje, jakie subdomeny utworzy (```www```, ```mail```, ```sklep``` itd.), bez konieczności pytania NASK-u (rejestratora .pl) czy serwerów korzennych o zgodę na każdą zmianę.

**Rekordy DNS**. DNS nie służy wyłącznie do zamiany nazwy na adres IP. Każda domena może mieć wiele rekordów różnych typów [^kurose][^RFC1035]. W Tabeli 1 przedstawiono typy rekordów DNS:

| Typ rekordu | Przeznaczenie |
|---------|---------|
| **A** | adres IPv4 danej nazwy |
| **AAAA** | adres IPv6 danej nazwy |
| **CNAME** | alias — wskazuje na inną nazwę domenową (np. ```www``` → ```przyklad.pl```) |
| **MX** | wskazuje serwer pocztowy odpowiedzialny za odbiór poczty dla domeny |
</div>
</Step>

<Step title="DHCP">
:::note W skrócie!
<div className="justify">
Automatycznie przydziela adresy IP (wraz z innymi parametrami sieci jak np, maska sieci) hostom. Zaleta nie trzeba to robić ręcznie.
</div>
:::

<div className="justify">
Automatycznie przydziela hostom w sieci lokalnej kompletny zestaw parametrów potrzebnych do komunikacji — nie tylko adres IP, ale też maskę podsieci, adres bramy domyślnej, adresy serwerów DNS i szereg innych opcji [^tanen]. Eliminuje to potrzebę ręcznej konfiguracji każdego urządzenia z osobna, co przy większych sieciach byłoby niepraktyczne i podatne na błędy (np. przypadkowe powielenie tego samego adresu IP na dwóch hostach) [^RFC2131].

Proces DORA - proces przydzielania adresów
</div>

![Rys3](/img/5/dora.png)
<div className="text-center">
Rys.3 Proces DORA [^claude]
</div>

<div className="justify">
Kroki 1 i 3 są rozgłoszeniowe. Klient na starcie nie ma jeszcze adresu IP, więc fizycznie nie może wysłać unicastu do konkretnego serwera — musi rozgłosić zapytanie do całej sieci lokalnej. Rozgłoszenie **DHCPREQUEST** w kroku 3 ma dodatkową funkcję: jeśli w sieci działa więcej niż jeden serwer DHCP i klient dostał oferty od kilku z nich, to rozgłoszenie informuje pozostałe serwery, że ich oferta nie została przyjęta, więc mogą zwolnić zarezerwowany dla niej adres.
</div>
</Step>

<Step title="HTTP / HTTPS">
:::note W skrócie!
<div className="justify">
HTTP (port 80) to bezstanowy protokół żądanie-odpowiedź do przesyłania stron WWW (np ```wp.pl```). HTTPS to ten sam HTTP, tylko przesyłany przez szyfrowaną warstwę TLS (port 443).
</div>
:::

Działają w modelu **żądanie-odpowiedź**: klient (przeglądarka) wysyła żądanie (np. metodą **GET / POST**), serwer odsyła odpowiedź (zawierający status żądania, np. 200 (OK), 404 (Not Found), itd.) (Rysunek 4). Na tym model połączenie **żądanie-odpowiedź** kończy swoją rolę [^RFC7230]. Domyślnie korzysta z TCP (**HTTP - port 80** i **HTTPS - port 443**) ponieważ potrzebuje niezawodnego dostarczenia danych.

![Rys4](/img/5/http.png)
<div className="text-center">
Rys.4 Żądanie - Odpowiedź [^claude]
</div>

Użytkownik do dyspozycji na kilka metod z któych może skorzystać podczas tworzenia zapytań (Tabela 2). Natomiast w odpowiedzi uzyskujemy kod statusu, który określa kategorię odpowiedzi (Tabela 3) [^RFC9110].

Tab.2 Metody HTTP
| Metoda | Zastosowanie |
|---------|---------|
| **GET** | pobranie zasobu |
| **POST** | przesłanie danych do przetworzenia (np. wysłanie formularza) |
| **PUT** | zastąpienie zasobu podaną treścią |
| **DELETE** | usunięcie zasobu |
| **HEAD** | jak GET, ale bez danych odpowiedzi — do sprawdzenia nagłówków/istnienia zasobu |

Tab.3 Kody statusu
| Metoda | Kategoria | Przykład |
|---------|---------|---------|
| **1xx** | informacyjne | ```100 Continue``` |
| **2xx** | sukces | ```200 OK```, ```201 Created``` |
| **3xx** | przekierowanie | ```301 Moved Permanently```, ```304 Not Modified``` |
| **4xx** | błąd klienta | ```404 Not Found```, ```403 Forbidden``` |
| **5xx** | błąd serwera | ```500 Internal Server Error```, ```503 Service Unavailable``` |
</Step>
</StepByStep>

## II. Zadania do wykonania

### Przechwytywanie zapytań DNS

<StepByStep>
<Step title="Przechwycenie zapytania DNS - 1">
Uruchom przechwytywanie ruchu w programie Wireshark. Uruchom przechwytywanie i zastosuj filtr:

```
Filtr Wyświetlania: dns
```

![Rys5](/img/5/dns1.png)
</Step>

<Step title="Przechwycenie zapytania DNS - 2">
Wygeneruj świeże zapytanie DNS, są dwie możliwości. 

Pierwsza przy pomocy Wiersza poleceń (Start ⇒ Wyszukaj programy i pliki ⇒ cmd): 
```bash
nslookup wp.pl
```
![Rys6](/img/5/dns2a.png)

Druga możliwość uruchomić przeglądarkę i w miejscu URL wpisać strone Internetową:
```bash
foka.wi.local/pgadmin4
```
![Rys7](/img/5/dns2b.png)

</Step>

<Step title="Przechwycenie zapytania DNS - 3">
W programie Wireshark kliknij w pojedynczy pakiet zapytania i przyporządkuj jego elementy do warstw modelu OSI:

![Rys8](/img/5/dns3.png)

**Na co zwrócić uwagę:**
- wyszukaj nazwę domenową w treści zapytania (np. ```foka.wi.local/pgadmin4```) (Wireshark -> Domain Name System)
- port źródłowy oraz port docelowy (port 53 = DNS) (Wireshark -> User Datagram Protocol)
- adres IP źródłowy/docelowy (Wireshark -> Internet Protocol Version 4)
</Step>

<Step title="Przechwycenie zapytania DNS - 4">
Kliknij dwukrotnie w pakiet który analizowałeś. Powinno sie otworzyć nowe okno z danym pakietem.
</Step>
</StepByStep>

### Przechwytywanie zapytań HTTP

<StepByStep>
<Step title="Przechwycenie zapytania HTTP - 1">
Uruchom przechwytywanie ruchu w programie Wireshark. Uruchom przechwytywanie i zastosuj filtr:

```
Filtr Wyświetlania: http
```

![Rys9](/img/5/http1.png)
</Step>

<Step title="Przechwycenie zapytania HTTP - 2">
Wygeneruj świeże zapytanie HTTP wywołując strone ```foka.wi.local``` z poziomu przeglądarki:
```bash
foka.wi.local/pgadmin4
```

![Rys10](/img/5/http2.png)
</Step>

<Step title="Przechwycenie zapytania HTTP - 3">
W programie Wireshark kliknij pakiet z żądaniem `GET` i wykonaj analizę struktury pakietu:

![Rys11](/img/5/http3.png)

**Na co zwrócić uwagę:**
- linia żądania (`GET /pgadmin4/login/... HTTP/1.1`).
- port źródłowy/docelowy (port 80).
- adres IP źródłowy/docelowy.
</Step>

<Step title="Przechwycenie zapytania HTTP - 4">
Kliknij dwukrotnie w pakiet który analizowałeś. Otwórz ponownie pakiet z zadania poświęconenu DNS. Aby zobaczyć cała komunikację związaną z przesłąniem strony internetowej. Kliknij **PPM** na jeden z pakietów, nastepnie wybierz **"Podążaj" -> "HTTP Strumień"**.

![Rys11](/img/5/http4.png)

:::warning **Zwróć uwagę na różnicę pomiędzy DNS, a HTTP:**
HTTP korzysta z TCP (na liście pakietów występuje SYN/SYN-ACK/ACK), podczas gdy DNS korzysta z UDP (bez gwarancji otrzymania odpowiedzi od serwera DNS).
:::
</Step>
</StepByStep>

### Analiza ruchu uwzględniająć wszystkie poznane warstwy

<StepByStep>
<Step title="Analiza ruchu uwzględniająć wszystkie poznane warstwy - 1">
Na podstawie tego, co zaobserwowałeś/aś w zadaniu związanym z DNS i HTTP, przejdziemy po koleji po **każdej** z 7 warstw OSI. Przejdź ponownie do Wireshark:
```
Filtr Wyświetlania: http
```
Następnie ponownie wywołaj adres strony np. ```foka.wi.local/pgadmin4```.
</Step>

<Step title="Scenariusz „otwarcie strony WWW” warstwa po warstwie - 2">

1. **Aplikacji** — przeglądarka najpierw potrzebuje adresu IP serwera, więc generuje zapytanie DNS; po jego otrzymaniu buduje żądanie HTTP `GET`.
2. **Prezentacji** — jeśli strona używa HTTPS, w tym miejscu następuje negocjacja TLS i szyfrowanie danych żądania.
3. **Sesji** — przeglądarka zarządza dialogiem z serwerem.
4. **Transportowa** — dla DNS: UDP, pojedynczy datagram; dla HTTP: TCP, pełne trójstopniowe uzgadnianie (SYN/SYN-ACK/ACK) przed wysłaniem żądania.
5. **Sieciowa** — pakiety IP są kierowane przez kolejne routery na trasie do serwera (być może przez bramę domyślną, jeśli serwer jest poza siecią lokalną).
6. **Łącza danych** — na każdym odcinku trasy dane są opakowywane w ramki Ethernet/Wi-Fi z odpowiednimi adresami MAC (ustalanymi przez ARP na każdym segmencie sieci lokalnej).
7. **Fizyczna** — bity są fizycznie przesyłane medium transmisyjnym (kabel UTP, światłowód, fale radiowe) między kolejnymi urządzeniami.

Odpowiedź serwera wraca tą samą drogą, przechodząc przez te same warstwy w odwrotnej kolejności (dekapsulacja).
</Step>

<Step title="Scenariusz „otwarcie strony WWW” warstwa po warstwie - 3">
Podobnie jak w poprzednim zadaniu otwieramy (**PPM** na jeden z pakietów, nastepnie wybierz **"Podążaj" -> "HTTP Strumień"**) śledzenie strumienia HTTP. W nowym oknie pojawiła sie pełna wymiana informacji pomiędzy klientem, a serwerem. Gdzie przenosząc sie okna znajdziemy odesłana strone w wersji dokumentu tekstowego niezaszyfrowanego.

![Rys12](/img/5/www3.png)
</Step>

<Step title="Scenariusz „otwarcie strony WWW” warstwa po warstwie - 4">
W głównym oknie programu Wireshark pojawia się kompletny sechmat połączenia dla modelu **żądanie-odpowiedź** w celu dostarczenia strony WWW do klienta.

![Rys12](/img/5/www4.png)
</Step>
</StepByStep>

### Test zamykający część teoretyczną

<TestKoncowyCzesc1 />


[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^RFC1035]: IETF, [RFC 1035](https://datatracker.ietf.org/doc/rfc1035/) — Domain Names — Implementation and Specification, listopad 1987.

[^RFC2131]: IETF, [RFC 2131](https://datatracker.ietf.org/doc/rfc2131/) — Dynamic Host Configuration Protocol, marzec 1997.

[^RFC7230]: IETF, [RFC 7230](https://datatracker.ietf.org/doc/rfc7230/) — Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing, czerwiec 2014.

[^RFC9110]: IETF, [RFC 9110](https://datatracker.ietf.org/doc/rfc9110/) — HTTP Semantics, czerwiec 2022.

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

