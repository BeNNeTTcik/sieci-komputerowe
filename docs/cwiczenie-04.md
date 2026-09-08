---
sidebar_position: 4
title: "Ćwiczenie 4: Warstwa transportowa"
---
<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';


# Ćwiczenie 4: Warstwa transportowa

*Część I — Model ISO/OSI*

## I. Wprowadzenie

<div className="justify">
**Warstwa transportowa** zapewnia komunikację między usługami. Do rozpoznawania konkretnej usługi na danym urządzeniu używane są numery portów (np. usługa HTTP służąca do przesyłania zawartości stron internetowych identyfikowana jest przez port o numerze 80, a gniazdo 172.16.1.1:80 oznacza usługę HTTP na komputerze o adresie IP 172.16.1.1) [[1](#bib1)]. Warstwa transportowa opiera sie na dwóch protokołach. **TCP** zapewnia niezawodne dostarczenie danych (trójstopniowe uzgadnianie), a **UDP** jest bezpołączeniowy i szybszy, lecz bez gwarancji dostarczenia. 

---

**TCP (Transmission Control Protocol)** to protokół połączeniowy i niezawodny [[2](#bib2)], co oznacza, że przed wymianą danych obie strony muszą jawnie nawiązać połączenie, a protokół gwarantuje dostarczenie danych w kolejności, w jakiej zostały wysłane. Gdy pakiet nie trafił do adresata to dochodzia do retransmisji pakietu. Protokół umożliwia również sterowanie przepływem, czyli regulacja ilości przesyłanych danych w czasie, aby nie doszło do przeciążenia.
</div>

![Rys1](/img/4/handshake.png)
<div className="text-center">
Rys.1 Trójstopniowe uzgadnianie (three-way handshake) [[7](#bib7)]
</div>

**Nawiązywanie połączenia** — trójstopniowe uzgadnianie (**three-way handshake**):
- **SYN** — klient wysyła segment z ustawioną flagą SYN i losowym numerem sekwencyjnym, sygnalizując chęć nawiązania połączenia.
- **SYN-ACK** — serwer odpowiada własnym SYN (swój numer sekwencyjny) oraz ACK (potwierdzenie numeru sekwencyjnego klienta +1).
- **ACK** — klient potwierdza numer sekwencyjny serwera. Połączenie jest ustanowione (stan ESTABLISHED).

<div className="justify">
**Kończenie połączenia** — czterostopniowe (bo TCP jest połączeniem dwukierunkowym — każdy kierunek zamyka się osobno): strona inicjująca wysyła FIN, druga strona potwierdza ACK, a następnie sama wysyła własny FIN, na który pierwsza strona odpowiada ACK.
</div>

![Rys2](/img/4/tcp.png)
<div className="text-center">
Rys.2 Struktura nagłówka segmentu TCP [[7](#bib7)]
</div>

Pozostałe flagi:
- **RST** - natychmiastowe zerwanie połącznia.
- **PSH** - natychmiastowe przekazanie do aplikacji.

---

<div className="justify">
**UDP** to protokół bezpołączeniowy, zdefiniowany w RFC 768 [[4](#bib4)] — jeden z najprostszych protokołów w całym stosie TCP/IP. Nie nawiązuje sesji, nie potwierdza odbioru, nie retransmituje utraconych danych i nie gwarantuje kolejności dostarczenia. Jego nagłówek zawiera zaledwie 4 pola: port źródłowy, port docelowy, długość datagramu i (opcjonalną) sumę kontrolną — łącznie 8 bajtów, wobec minimum 20 bajtów w TCP. Dlaczego mimo takich parametrów jest szeroko stosowany:
</div>
- Brak dodatkowego ociążenia związanego z połączeniem i retransmisją - mniejsze opóźnienia, co ma kluczowe znaczenie w komunikacji czasu rzeczywistego.
- Streaming wideo/audio - utrata pojedynczej klatki jest mniej szkodliwa niż opóźnienie spowodowane oczekiwaniem na retransmisję.
- VoIP - lepiej stracić ułamek sekundy dźwięku (nie wpływa to na zrozumiałość wypowiedzi) niż wprowadzić zauważalne opóźnienie w rozmowie.
- DNS - pojedyncze, krótkie zapytanie i odpowiedź nie potrzebują pełnego mechanizmu sesji TCP.

![Rys3](/img/4/udp.png)
<div className="text-center">
Rys.2 Struktura nagłówka segmentu UDP [[7](#bib7)]
</div>

---

<div className="justify">
**Port** to 16-bitowa liczba (zakres 0–65535) identyfikująca konkretną aplikację lub usługę działającą na urządzeniu. Skoro jeden host ma zwykle jeden adres IP, ale może jednocześnie prowadzić wiele niezależnych komunikacji sieciowych (przeglądarka, klient poczty, komunikator), port pozwala systemowi operacyjnemu rozróżnić, do której aplikacji trafiają przychodzące dane. Poniżej przedstawiono tabele opisującą numery portów jakimi posługuje sie system.
</div>

Zakresy numerów portów (rejestr IANA [[6](#bib6)]):
| Zakres     | Nazwa     | Zastosowanie |
|---------|---------|-----------------------|
| 0-1023 | porty dobrze znane | standardowe usługi systemowe (HTTP, DNS, SSH) |
| 1024–49151 | porty zarejestrowane (registered) | aplikacje firm trzecich, rejestrowane w IANA |
| 49152–65535 | porty dynamiczne/prywatne (ephemeral) | tymczasowo przydzielane przez system jako port źródłowy klienta |

Kilka przykładowych portów tych dobrze znanych (standardowe porty dla poszczególnych usług w systemie): 
| Port | Usługa |
|------|--------|
| 80   | HTTP   |
| 443  | HTTPS  |
| 53   | DNS    |
| 22   | SSH    |
| 25   | SMTP   |

<div className="justify">
**Gniazdo (socket)** to unikalna kombinacja czterech elementów: adres IP źródłowy + port źródłowy + adres IP docelowy + port docelowy (plus protokół TCP/UDP) [[5](#bib5)]. To właśnie ta czwórka (a nie sam numer portu) jednoznacznie identyfikuje pojedyncze połączenie — dzięki temu serwer WWW na porcie 80 może jednocześnie obsługiwać tysiące klientów, bo każdy z nich ma inny adres IP źródłowy (lub przynajmniej inny port źródłowy). Poniżej przedstawiono jak winterfejs komunikacji aplikacji z zewnętrznym serwerem (Rysunek 4). 
</div>

![Rys4](/img/4/gniazdo_port.png)
<div className="text-center">
Rys.4 Inwersja numerów portów źródłowego i docelowego [[7](#bib7)]
</div>

Analizując krok po kroku [[2](#bib2)]:
1. Proces klienta (np. przeglądarka) na hoście A otwiera gniazdo. System operacyjny przydziela mu port źródłowy z zakresu portów efemerycznych (tu: 51000) — losowy, tymczasowy numer, niepowiązany z żadną konkretną usługą.
2. Klient wysyła żądanie do hosta B, adresując je na port docelowy 80 (standardowy port HTTP) — to on informuje serwer, do której usługi/procesu ma trafić żądanie.
3. Serwer odbiera dane na swoim gnieździe nasłuchującym na porcie 80 i przekazuje je do właściwego procesu serwera (np. procesu obsługującego stronę WWW).
4. Wysyłając odpowiedź, serwer zamienia porty miejscami: teraz to port 80 staje się portem źródłowym (bo to stąd wraca odpowiedź), a 51000 — portem docelowym (bo tam czeka gniazdo klienta). Dzięki temu odpowiedź trafia z powrotem dokładnie do tego procesu na hoście A, który zainicjował żądanie.

## II. Zadania do wykonania

1. Przechwycić w Wireshark sesję TCP i zidentyfikować SYN/SYN-ACK/ACK/FIN.
2. Przechwycić ruch UDP i porównać nagłówek z TCP.
3. Przeanalizować aktywne połączenia (netstat -an / ss -tuln).
4. Omówić, dlaczego DNS może używać UDP, a transfer pliku wymaga TCP.


### Przechwycić w Wireshark sesję TCP i zidentyfikować inicjacji oraz zakończenia połączenia.

<StepByStep>

<Step title="Przechwycenie sesji TCP">
Uruchom przechwytywanie ruchu w programie Wireshark na interfejsie, przez który wychodzi ruch internetowy. Otwórz w przeglądarce dowolną stronę WWW ( zlecana strona ```foka.wi.local```), a następnie zatrzymaj przechwytywanie.

W pasku filtra wpisz:
```
tcp.port == 80
```
</Step>

<Step title="Identyfikacja inicjacji połączenia SYN/SYN-ACK/ACK">
Odszukaj na liście pakietów **pierwsze cztery pakiety** wymienione z tym samym serwerem i zidentyfikuj w kolumnie *Info*:

- **SYN** — pierwszy pakiet, flaga `[SYN]`, inicjuje połączenie,
- **SYN-ACK** — odpowiedź serwera, flagi `[SYN, ACK]`,
- **ACK** — potwierdzenie klienta, flaga `[ACK]` — od tego momentu połączenie jest nawiązane,

Kliknij dwa razy w pojedynczy pakiet SYN i rozwiń w panelu szczegółów sekcję **Transmission Control Protocol**, żeby zobaczyć numer sekwencyjny oraz zaznaczone pole flag.
</Step>

<Step title="Identyfikacja zakończenia połączenia FIN-ACK/ACK">
Odszukaj na liście pod koniec sesji pakiet z flagą ```[FIN, ACK]```:

- **FIN** — odszukaj pod koniec sesji pakiet z flagą `[FIN, ACK]` kończący połączenie (może wystąpić kilka razy — TCP zamyka się osobno w każdą stronę).

Kliknij pojedynczy pakiet FIN i rozwiń w panelu szczegółów sekcję **Transmission Control Protocol**, żeby zobaczyć numer sekwencyjny oraz zaznaczone pole flag.
</Step>
</StepByStep>

### Przechwycenie ruchu UDP

<StepByStep>

<Step title="Przechwycenie sesji UDP">
Uruchom przechwytywanie ruchu w programie Wireshark na interfejsie, przez który wychodzi ruch internetowy. 

W pasku filtra wpisz:
```
udp.port == 53
```
</Step>

<Step title="Przechwycenie ruchu UDP i porównanie nagłówka z TCP">
Wygeneruj ruch UDP — najprościej poleceniem `nslookup` w Wierszu poleceń (Start ⇒ Wyszukaj programy i pliki ⇒ cmd):

```bash
nslookup wp.pl
```

Kliknij dwa razy w przechwycony pakiet i rozwiń sekcję **User Datagram Protocol**, a następnie porównaj go z nagłówkiem TCP z kroku **"Identyfikacja inicjacji połączenia SYN/SYN-ACK/ACK"**:

| Cecha | TCP | UDP |
|---|---|---|
| Liczba pól nagłówka | znacznie więcej (m.in. numer sekw., ACK, flagi, okno) | tylko 4 pola |
| Rozmiar nagłówka | minimum 20 bajtów | zawsze 8 bajtów |
| Widoczne flagi (SYN/ACK/FIN) | tak | nie występują — UDP nie ma pojęcia sesji |
| Uzgadnianie połączenia | widoczne 3 pakiety przed danymi | brak — dane lecą od razu |
</Step>
</StepByStep>

### Analiza aktywnych połączeń

<StepByStep>
<Step title="Analiza aktywnych połączeń - netstat">
Otwórz kilka kart z różnymi stronami, a następnie sprawdź aktywne połączenia sieciowe swojego systemu (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) poniższym poleceniem:

```bash
netstat -an
```

**Na co zwrócić uwagę:**
- kolumna adresu lokalnego (`Local Address`) — zawiera Twój adres IP i **port źródłowy** (zwykle wysoki numer z zakresu efemerycznego, dokładnie jak `51000` w schemacie gniazd, o którym mówiliśmy),
- kolumna adresu zdalnego (`Foreign Address` / `Peer Address`) — adres IP serwera i **port docelowy** (np. `:443` dla HTTPS, `:80` dla HTTP),
- kolumna stanu (`State`) — dla TCP: `ESTABLISHED` (połączenie aktywne), `TIME_WAIT` (niedawno zamknięte, oczekuje na ewentualne spóźnione pakiety), `LISTEN` (port nasłuchujący na przychodzące połączenia),
</Step>
</StepByStep>

## III. Bibliografia

<a id="bib1"></a>[1] M. Szarmach, Instrukcja laboratoryjna z przedmiotu: Sieci komputerowe, Wydział Informatyki, 2024.

<a id="bib2"></a>[2] J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.

<a id="bib3"></a>[3] IETF, [RFC 793](https://datatracker.ietf.org/doc/rfc793/) — Transmission Control Protocol, wrzesień 1981.

<a id="bib4"></a>[4] IETF, [RFC 768](https://datatracker.ietf.org/doc/rfc768/) — User Datagram Protocol, sierpień 1980.

<a id="bib5"></a>[5] A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

<a id="bib6"></a>[6] IANA, [Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers), Internet Assigned Numbers Authority.

<a id="bib7"></a>[7] Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).