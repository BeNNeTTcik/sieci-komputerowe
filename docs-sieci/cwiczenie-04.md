---
sidebar_position: 4
title: "Ćwiczenie 4: Warstwa transportowa"
---
<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import EditableTable from '@site/src/components/EditableTable';
import SharedValue from '@site/src/components/SharedValue';

# Ćwiczenie 4: Warstwa transportowa

*Część I — Model ISO/OSI*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 4: Warstwa transportowa"
  storageKey="cwiczenie-4"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-4"
  storageKeys={['cwiczenie-4','TCP-SYN', 'UDP', 'netstat']}
  sharedPrefix="cw4_"
/>

## I. Wprowadzenie

<div className="justify">
**Warstwa transportowa** zapewnia komunikację między usługami. Do rozpoznawania konkretnej usługi na danym urządzeniu używane są numery portów (np. usługa HTTP służąca do przesyłania zawartości stron internetowych identyfikowana jest przez port o numerze 80, a gniazdo 172.16.1.1:80 oznacza usługę HTTP na komputerze o adresie IP 172.16.1.1) [^szarmach]. Warstwa transportowa opiera sie na dwóch protokołach. **TCP** zapewnia niezawodne dostarczenie danych (trójstopniowe uzgadnianie), a **UDP** jest bezpołączeniowy i szybszy, lecz bez gwarancji dostarczenia.

---

**TCP (Transmission Control Protocol)** to protokół połączeniowy i niezawodny (Rysunek 1)[^kurose], co oznacza, że przed wymianą danych obie strony muszą jawnie nawiązać połączenie, a protokół gwarantuje dostarczenie danych w kolejności, w jakiej zostały wysłane. Zdefiniowany w RFC 793 [^RFC793]. Gdy pakiet nie trafił do adresata to dochodzia do retransmisji pakietu. Protokół umożliwia również sterowanie przepływem, czyli regulacja ilości przesyłanych danych w czasie, aby nie doszło do przeciążenia.
</div>

![Rys1](/img/4/handshake.png)
<div className="text-center">
Rys.1 Trójstopniowe uzgadnianie (three-way handshake) [^claude]
</div>

**Nawiązywanie połączenia** - trójstopniowe uzgadnianie (**three-way handshake**):
- **SYN** - klient wysyła segment z ustawioną flagą SYN i losowym numerem sekwencyjnym, sygnalizując chęć nawiązania połączenia.
- **SYN-ACK** - serwer odpowiada własnym SYN (swój numer sekwencyjny) oraz ACK (potwierdzenie numeru sekwencyjnego klienta +1).
- **ACK** - klient potwierdza numer sekwencyjny serwera. Połączenie jest ustanowione (stan ESTABLISHED).

<div className="justify">
**Kończenie połączenia** - czterostopniowe (bo TCP jest połączeniem dwukierunkowym, gdzie każdy kierunek zamyka się osobno): strona inicjująca wysyła FIN, druga strona potwierdza ACK, a następnie sama wysyła własny FIN, na który pierwsza strona odpowiada ACK.

Poniżej na Rysunku 2 przedstawiono poszczegolne sekcje wraz z ilością bitów dla segnment TCP.
</div>

![Rys2](/img/4/tcp.png)
<div className="text-center">
Rys.2 Struktura nagłówka segmentu TCP [^claude]
</div>

Pozostałe flagi:
- **RST** - natychmiastowe zerwanie połącznia.
- **PSH** - natychmiastowe przekazanie do aplikacji.

---

<div className="justify">
**UDP** to protokół bezpołączeniowy, zdefiniowany w RFC 768 [^RFC768], jeden z najprostszych protokołów w całym stosie TCP/IP. Nie nawiązuje sesji, nie potwierdza odbioru, nie retransmituje utraconych danych i nie gwarantuje kolejności dostarczenia. Jego nagłówek zawiera zaledwie 4 pola: port źródłowy, port docelowy, długość datagramu i (opcjonalną) sumę kontrolną = łącznie 8 bajtów (Rysunek 3), wobec minimum 20 bajtów w TCP. Dlaczego mimo takich parametrów jest szeroko stosowany:
</div>
- Brak dodatkowego ociążenia związanego z połączeniem i retransmisją - mniejsze opóźnienia, co ma kluczowe znaczenie w komunikacji czasu rzeczywistego.
- Streaming wideo/audio - utrata pojedynczej klatki jest mniej szkodliwa niż opóźnienie spowodowane oczekiwaniem na retransmisję.
- VoIP - lepiej stracić ułamek sekundy dźwięku (nie wpływa to na zrozumiałość wypowiedzi) niż wprowadzić zauważalne opóźnienie w rozmowie.
- DNS - pojedyncze, krótkie zapytanie i odpowiedź nie potrzebują pełnego mechanizmu sesji TCP.

![Rys3](/img/4/udp.png)
<div className="text-center">
Rys.3 Struktura nagłówka segmentu UDP [^claude]
</div>

---

<div className="justify">
**Port** to 16-bitowa liczba (zakres 0–65535) identyfikująca konkretną aplikację lub usługę działającą na urządzeniu. Skoro jeden host ma zwykle jeden adres IP, ale może jednocześnie prowadzić wiele niezależnych komunikacji sieciowych (przeglądarka, klient poczty, komunikator), port pozwala systemowi operacyjnemu rozróżnić, do której aplikacji trafiają przychodzące dane. Poniżej w Tabeli 1 przedstawiono opisującą numery portów jakimi posługuje sie system.
</div>

Tab. 1 Zakresy numerów portów (rejestr IANA [^IANA]):
| Zakres     | Nazwa     | Zastosowanie |
|---------|---------|-----------------------|
| 0-1023 | porty dobrze znane | standardowe usługi systemowe (HTTP, DNS, SSH) |
| 1024–49151 | porty zarejestrowane (registered) | aplikacje firm trzecich, rejestrowane w IANA |
| 49152–65535 | porty dynamiczne/prywatne (ephemeral) | tymczasowo przydzielane przez system jako port źródłowy klienta |

Kilka przykładowych portów tych dobrze znanych (standardowe porty dla poszczególnych usług w systemie):

Tab. 2 Przykłady standardowych portów
| Port | Usługa |
|------|--------|
| 80   | HTTP   |
| 443  | HTTPS  |
| 53   | DNS    |
| 22   | SSH    |
| 25   | SMTP   |

---

<div className="justify">
**Gniazdo (socket)** to unikalna kombinacja czterech elementów: adres IP źródłowy + port źródłowy + adres IP docelowy + port docelowy (plus protokół TCP/UDP) [^tanen]. To właśnie ta czwórka (a nie sam numer portu) jednoznacznie identyfikuje pojedyncze połączenie — dzięki temu serwer WWW na porcie 80 może jednocześnie obsługiwać tysiące klientów, bo każdy z nich ma inny adres IP źródłowy (lub przynajmniej inny port źródłowy). Poniżej przedstawiono jak winterfejs komunikacji aplikacji z zewnętrznym serwerem (Rysunek 4). 
</div>

![Rys4](/img/4/gniazdo_port.png)
<div className="text-center">
Rys.4 Inwersja numerów portów źródłowego i docelowego [^claude]
</div>

Analizując krok po kroku [^kurose]:
1. Proces klienta (np. przeglądarka) na hoście A otwiera gniazdo. System operacyjny przydziela mu port źródłowy z zakresu portów efemerycznych (tu: 51000) — losowy, tymczasowy numer, niepowiązany z żadną konkretną usługą.
2. Klient wysyła żądanie do hosta B, adresując je na port docelowy 80 (standardowy port HTTP) to on informuje serwer, do której usługi/procesu ma trafić żądanie.
3. Serwer odbiera dane na swoim gnieździe nasłuchującym na porcie 80 i przekazuje je do właściwego procesu serwera (np. procesu obsługującego stronę WWW).
4. Wysyłając odpowiedź, serwer zamienia porty miejscami: teraz to port 80 staje się portem źródłowym (bo to stąd wraca odpowiedź), a 51000. Portem docelowym (bo tam czeka gniazdo klienta). Dzięki temu odpowiedź trafia z powrotem dokładnie do tego procesu na hoście A, który zainicjował żądanie.

## II. Zadania do wykonania

### Przechwycić w Wireshark sesję TCP i zidentyfikować inicjacji oraz zakończenia połączenia.

<StepByStep>

<Step title="Przechwycenie sesji TCP">
Uruchom przechwytywanie ruchu w programie **Wireshark** na interfejsie (Ethernet0) z filtrem ruchu (Rysunek 5), przez który wychodzi ruch internetowy. Otwórz w przeglądarce stronę WWW jako HTTP (zlecana strona ```foka.wi.local```), a następnie zatrzymaj przechwytywanie.

```
Filtr wyświetlania: tcp.port == 80
```

![Rys5](/img/4/tcp80.png)
<div className="text-center">
Rys. 5 Filtr w programie Wireshark [^wireshark]
</div>
</Step>

<Step title="Identyfikacja inicjacji połączenia SYN/SYN-ACK/ACK - I">
Odszukaj na liście pakietów **pierwsze cztery pakiety** wymienione z tym samym serwerem i zidentyfikuj w kolumnie *Info* (Rysunek 6):

- **SYN** - pierwszy pakiet, flaga `[SYN]`, inicjuje połączenie,
- **SYN-ACK** - odpowiedź serwera, flagi `[SYN, ACK]`,
- **ACK** - potwierdzenie klienta, flaga `[ACK]`. Od tego momentu połączenie jest nawiązane,

![Rys6](/img/4/tcp80_syn.png)
<div className="text-center">
Rys. 6 Pakiet SYN w komunikacji TCP [^wireshark]
</div>
</Step>

<Step title="Identyfikacja inicjacji połączenia SYN/SYN-ACK/ACK - II">
Kliknij dwa razy w pojedynczy pakiet SYN i rozwiń w panelu szczegółów sekcję **Transmission Control Protocol**, żeby zobaczyć numer sekwencyjny oraz zaznaczone pole flag i wypełnij Tabele 3.
<EditableTable
  title="Tab. 3 Wypisz parametry z sekcji Transmission Control Protocol dla pakietu SYN"
  storageKey="TCP-SYN"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'wartosc', label: 'Wartość'}
  ]}
  initialRows={[
    {parametr: "Source Port", wartosc: '',  shared: { wartosc: 'src_port_tcp' }},
    {parametr: "Destination Port", wartosc: '', shared: { wartosc: 'dst_port_tcp' }},
    {parametr: "Sequence Number", wartosc: '', shared: { wartosc: 'seq_port_tcp' }},
    {parametr: "Flags", wartosc: '', shared: { wartosc: 'flag_port_tcp' }},
    {parametr: "Rozmiar nagłówka", wartosc: '', shared: { wartosc: 'size_port_tcp' }},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

<ScreenshotPaste label="Zrzut ekranu: inicjalizacja połączenia SYN/SYN-ACK/ACK w Wireshark" />
</Step>

<Step title="Identyfikacja zakończenia połączenia FIN-ACK/ACK">
Odszukaj na liście pod koniec sesji pakiet z flagą ```[FIN, ACK]```:
- **FIN** - odszukaj pod koniec sesji pakiet z flagą `[FIN, ACK]` kończący połączenie (może wystąpić kilka razy. TCP zamyka się osobno w każdą stronę).

Kliknij pojedynczy pakiet FIN i rozwiń w panelu szczegółów sekcję **Transmission Control Protocol**, żeby zobaczyć numer sekwencyjny oraz zaznaczone pole flag (Rysunek 7).

![Rys7](/img/4/tcp80_fin.png)
<div className="text-center">
Rys.7 Pakiet FIN & ACK w komunikacji TCP [^wireshark]
</div>
<ScreenshotPaste label="Zrzut ekranu: zakończenie połączenia FIN-ACK/ACK w Wireshark" />
</Step>
</StepByStep>

### Przechwycenie ruchu UDP

<StepByStep>
<Step title="Przechwycenie sesji UDP - I">
Uruchom przechwytywanie ruchu w programie **Wireshark** na interfejsie (Ethernet0), przez który wychodzi ruch internetowy (Rysunek 8).
```
Filtr wyświetlania: udp.port == 53
```

![Rys8](/img/4/udp53.png)
<div className="text-center">
Rys.8 Filtr w programie Wireshark [^wireshark]
</div>
</Step>

<Step title="Przechwycenie ruchu UDP - II">
Wygeneruj ruch UDP najprościej poleceniem `nslookup` w **Wierszu poleceń** (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) (Rysunek 9):
```bash
nslookup wp.pl
```

<div className="text-center">
![Rys9](/img/4/nslookup.png)

Rys.9 Pakiet UDP dla nslookup
</div>
</Step>

<Step title="Identyfikacja komunikacji UDP">
Następnie wewnątrz Wireshark wybierz pakiet wychodzący z Twojego PC i wpisz występujące parametry do Tabeli 4 poniżej.

![Rys10](/img/4/udp53_1.png)
<div className="text-center">
Rys.10 Pakiet UDP dla nslookup [^wireshark]
</div>
<EditableTable
  title="Tab. 4 Wypisz parametry z sekcji Transmission Control Protocol"
  storageKey="UDP"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'wartosc', label: 'Wartość'}
  ]}
  initialRows={[
    {parametr: "Source Port", wartosc: '', shared: { wartosc: 'src_port_udp' }},
    {parametr: "Destination Port", wartosc: '', shared: { wartosc: 'dst_port_udp' }},
    {parametr: "Sequence Number", wartosc: '', shared: { wartosc: 'seq_port_udp' }},
    {parametr: "Flags", wartosc: '', shared: { wartosc: 'flag_port_udp' }},
    {parametr: "Rozmiar nagłówka", wartosc: '', shared: { wartosc: 'size_port_udp' }},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
<ScreenshotPaste label="Zrzut ekranu: ruch UDP dla komendy nslookup" />
</Step>

<Step title="Porównanie nagłówka UDP z TCP ">
Kliknij dwa razy w przechwycony pakiet i rozwiń sekcję **User Datagram Protocol**, a następnie porównaj go z nagłówkiem TCP z kroku **"Identyfikacja inicjacji połączenia SYN/SYN-ACK/ACK"**. W Tabeli 5 zebrano wszystkie wyniki z poszczególnych analiz pakietu TCP i UDP.

<EditableTable
  title="Tab. 5 Porównanie TCP z UDP"
  storageKey="UDP"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'tcp', label: 'TCP', readOnly: true},
    {key: 'udp', label: 'UDP', readOnly: true},
    {key: 'opis', label: 'Opis', readOnly: true},
  ]}
  initialRows={[
    {parametr: "Source Port", tcp: <SharedValue shared="src_port_tcp" fallback="—" />, udp: <SharedValue shared="src_port_udp" fallback="—" />, opis: 'Występuje dla obu protokołów'},
    {parametr: "Destination Port", tcp: <SharedValue shared="dst_port_tcp" fallback="—" />, udp: <SharedValue shared="dst_port_udp" fallback="—" />, opis: 'Występuje dla obu protokołów'},
    {parametr: "Sequence Number", tcp: <SharedValue shared="seq_port_tcp" fallback="—" />, udp: <SharedValue shared="seq_port_udp" fallback="—" />, opis: 'Występuje tylko dla TCP, reprezntuje kolejność przesyłanych pakietów'},
    {parametr: "Flags", tcp: <SharedValue shared="flag_port_tcp" fallback="—" />, udp: <SharedValue shared="flag_port_udp" fallback="—" />, opis: 'Występuje tylko dla TCP i pozwala określić stan połączenia'},
    {parametr: "Rozmiar nagłówka", tcp: <SharedValue shared="size_port_tcp" fallback="—" />, udp: <SharedValue shared="size_port_udp" fallback="—" />,  opis: 'UDP zawiera tylko 8 bajtów, a dla TCP minimalna wartość to 20 bajtów'}
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

### Analiza aktywnych połączeń

<StepByStep>
<Step title="Analiza aktywnych połączeń - netstat">
Otwórz kilka kart z różnymi stronami, a następnie sprawdź aktywne połączenia sieciowe swojego systemu (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) poniższym poleceniem (Rysunek 11):

```bash
netstat -an
```

![Rys11](/img/4/netstat.png)
<div className="text-center">
Rys.11 Komenda `netstat -an`
</div>
</Step>

<Step title="Aktywne połączenia z netstat">
Wybierz jedną z aktywnych połączeń i wprowadz dane do Tabeli 6 poniżej.

<EditableTable
  title="Tab. 6 Parametry połączenia"
  storageKey="netstat"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'wartosc', label: 'Wartość'},
    {key: 'opis', label: 'Opis', readOnly: true},
  ]}
  initialRows={[
    {parametr: "Local Address", wartosc: '', opis: 'Zawiera Twój adres IP i port źródłowy (zwykle wysoki numer z zakresu efemerycznego, dokładnie jak `51000`)'},
    {parametr: "Foreign Address / Pear Address", wartosc: '', opis: 'adres IP serwera i port docelowy (np. `:443` dla HTTPS, `:80` dla HTTP)'},
    {parametr: "State", wartosc: '', opis: 'Dla TCP: `ESTABLISHED` (połączenie aktywne), `TIME_WAIT` (niedawno zamknięte, oczekuje na ewentualne spóźnione pakiety), `LISTENING` (port nasłuchujący na przychodzące połączenia).'}
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

<ScreenshotPaste label="Zrzut ekranu: lista aktywnych połączen" />
</Step>
</StepByStep>

[^szarmach]: M. Szarmach, Instrukcja laboratoryjna z przedmiotu: Sieci komputerowe, Wydział Informatyki, 2024.

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.

[^RFC793]: IETF, [RFC 793](https://datatracker.ietf.org/doc/rfc793/) — Transmission Control Protocol, wrzesień 1981.

[^RFC768]: IETF, [RFC 768](https://datatracker.ietf.org/doc/rfc768/) — User Datagram Protocol, sierpień 1980.

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^IANA]: IANA, [Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers), Internet Assigned Numbers Authority.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.