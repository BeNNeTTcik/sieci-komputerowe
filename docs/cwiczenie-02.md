---
sidebar_position: 2
title: "Ćwiczenie 2: Warstwa łącza danych"
---

import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';

# Ćwiczenie 2: Warstwa łącza danych

_Część I — Model ISO/OSI_

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 2: Warstwa łącza danych"
  storageKey="cwiczenie-2"
  solo
/>

## I. Wprowadzenie

<div className="justify">
**Warstwa łącza danych** odpowiada natomiast za przekazywanie ramek Ethernet w obrębie sieci lokalnej, adresację fizyczną (**MAC**) oraz przełączanie ruchu przez switch. Mapowanie adresów IP na adresy MAC realizuje protokół **ARP** [^tanen].
- ramka Ethernet - podstawowa jednostka danych warstwy 2, zawierająca nagłówek, dane oraz sumę kontrolną FCS,
- adres MAC - unikalny adres fizyczny karty sieciowej wykorzystywany do przełączania ramek,
- protokół ARP - mechanizm mapowania adresu IP na adres MAC, będący pomostem do warstwy 3.

**Ramka Ethernet** jest zdefiniowana przez standard IEEE 802.3 (aktualnie IEEE Std 802.3-2018), który określa format ramki warstwy łącza danych stosowany w sieciach przewodowych Ethernet [^802.3]. Poniżej przedstawiono budowę ramki Ethernet (Rys1) wraz z opisem poszczególnych jej części (Rysunek 1).

</div>

![Rys1](/img/2/ramka.png)

<div className="text-center">
Rys. 1 Budowa ramki Ethernet [^claude]
</div>

- **Preambuła (7 B)** - ciąg naprzemiennych bitów `1010...`, służy do synchronizacji zegara odbiornika z nadajnikiem; nie jest wliczana do długości ramki.
- **SFD — Start Frame Delimiter (1 B)** - bajt `10101011`, oznacza koniec preambuły i początek właściwej ramki.
- **MAC docelowy (6 B)** - fizyczny adres karty sieciowej odbiorcy (może być unicast, multicast lub broadcast).
- **MAC źródłowy (6 B)** - fizyczny adres karty sieciowej nadawcy.
- **Typ/Długość (2 B)** - w wersji Ethernet II pole to wskazuje protokół wyższej warstwy (EtherType, np. 0x0800 dla IPv4, 0x0806 dla ARP), gdy wartość jest ≥ 1536; w klasycznej ramce 802.3 to samo pole może oznaczać długość danych, gdy wartość jest mniejsza — obie interpretacje współistnieją w praktyce.
- **Dane (46–1500 B)** - dane przekazane z warstwy sieciowej (np. pakiet IP); jeśli dane są krótsze niż 46 B, ramka jest dopełniana (padding) do minimalnej długości.
- **FCS — Frame Check Sequence (4 B)** - suma kontrolna CRC-32 liczona po stronie nadawcy i weryfikowana przez odbiorcę w celu wykrycia błędów transmisji.

<div className="justify">
**Adres MAC (Media Access Control)** to unikatowy, 48-bitowy (6-bajtowy) adres fizyczny przypisany do interfejsu sieciowego, działający na warstwie 2 (łącza danych) modelu OSI. W odróżnieniu od adresu IP, który jest adresem logicznym i może się zmieniać w zależności od sieci, do której podłączone jest urządzenie, adres MAC jest w założeniu stały i przypisany na stałe do konkretnego sprzętu przez producenta — stąd bywa nazywany adresem fizycznym lub sprzętowym [^802].
</div>

<div className="justify">
Urządzeniem pracującym w tej warstwie jest przełącznik (ang. Switch). **Przełącznik** buduje na podstawie adresów MAC swoją **tablicę CAM**, ucząc się, za którym portem znajduje się dane urządzenie, i na tej podstawie przełącza ramki Ethernet wyłącznie do właściwego portu, zamiast rozsyłać je do wszystkich [^tanen]. Adres MAC jest też wykorzystywany m.in. do filtrowania dostępu (np. na routerach domowych) oraz jako podstawa niektórych mechanizmów bezpieczeństwa (port security).
</div>

<div className="justify">
**ARP (Address Resolution Protocol)** to protokół warstwy pomostowej między warstwą sieciową a warstwą łącza danych, którego zadaniem jest odwzorowanie adresu logicznego IPv4 na odpowiadający mu adres fizyczny MAC w obrębie tej samej sieci lokalnej. Jest on niezbędny, ponieważ ramka Ethernet do dostarczenia danych potrzebuje adresu MAC odbiorcy, a aplikacje i protokoły wyższych warstw „myślą” w kategoriach adresów IP. Protokół definiuje dokument **RFC 826** z 1982 roku [^RFC826].
</div>

<div className="justify">
Aby wiedzieć, które urządzenie podłączone jest do którego portu, tj. do którego portu ma przekazać daną ramkę, przełącznik buduje tzw. **Tablicę MAC** adresów, poprzez obserwowanie przepływającego ruchu sieciowego (dokładniej mówiąc, adresów źródłowych MAC w ramkach pojawiających się na każdym z portów). Kiedy przełącznik nie znajduje docelowego MAC-a w tablicy, zachowuje się jak koncetrator i wysyła ramkę na wszystkie pozostałe porty. To samo może się wydarzyć, kiedy tablica MAC adresów przepełni się i przełącznik nie jest w stanie zapamiętać nowych MAC-ów na swoich portach.
</div>

## II. Zadania do wykonania

### Analiza ramki Ethernet w programie Wireshark

<StepByStep>
<Step title="Przechwyć ruch sieciowy pochodzący z prostej komunikacji sieciowej">
Otwórz program Wireshark i rozpocznij przechwytywanie ruchu sieciowego na karcie sieciowej LAB (Ethernet1 lub Ethernet0).
</Step>

<Step title="Filtrowanie po ICMP">
Włącz filtrowanie przechwyconego ruchu, tak, by widoczne były tylko ramki z pakietami protokołu ICMP (Rysunek 2).
```
Filtr wyświetlania: icmp
```

<div className="text-center">
![Rys2](/img/2/zad1_2.png)
Rys.2 Fitrowanie w Wireshark [^wireshark]
</div>
</Step>

<Step title="Wygeneruj ruch sieciowy">
Poproś sąsiada o adres IP jego komputera i za pomocą Wiersza polecenia systemu Windows wyślij na ten adres ping (Start ⇒ Wyszukaj programy i pliki ⇒ cmd ⇒ ping adres IP) (Rysunek 3).
```bash
ping <IP>
```
<div className="text-center">
![Rys3](/img/2/zad1_3.png)
Rys.3 Komenda ping [^wireshark]
</div>
</Step>

<Step title="Weryfikacja wyników">
Sprawdź, czy w programie Wireshark pojawiły się przechwycone ramki, po czym zatrzymaj przechwytywanie danych (Rysunek 4).

<div className="text-center">
![Rys4](/img/2/zad1_4.png)
Rys.4 Wyfiltrowane pakiety protkołu ICMP w Wireshark [^wireshark]
</div>

<ScreenshotPaste label="Zrzut ekranu: przechwyconej ramki" />

</Step>

<Step title="Przyjrzyj się strukturze ramki protokołu Ethernet I">
Zaznacz pierwszą przechwyconą ramkę (zawierającą wysłany od Ciebie Echo (ping) request) i rozwiń w środkowej części okna drugą sekcję, która odpowiada za nagłówkowi protokołu Ethernet (Rysunek 5).

- Porównaj docelowy adres MAC z adresem MAC komputera sąsiada (można go wyświelić poleceniem ipconfig/all w Wierszu polecenia).
- Porównaj źródłowy adres MAC z adresem MAC swojego komputera.
- Wireshark nie wyświetla informacji o sumie kontrolnej.

<div className="text-center">
![Rys5](/img/2/zad1_5.png)
Rys.5 Wyfiltrowane pakiety protkołu ICMP w Wireshark [^wireshark]
</div>

<ScreenshotPaste label="Zrzut ekranu: przechwycona ramka Echo Request" />

</Step>

<Step title="Przyjrzyj się strukturze ramki protokołu Ethernet II">
Zaznacz drugą przechwyconą ramkę (Echo (ping) reply, będącą odpowiedzią na Twojego requesta) i zaobserwuj, jak zmienił się adres źródłowy i docelowy (Rysunek 6).

<div className="text-center">
![Rys6](/img/2/zad1_6.png)
Rys.6 Wyfiltrowane pakiety protkołu ICMP w Wireshark [^wireshark]
</div>

<ScreenshotPaste label="Zrzut ekranu: przechwyconej ramki Echo Reply" />

</Step>
</StepByStep>

### Obserwacja działania protokołu ARP

<StepByStep>
<Step title="Możliwości protokołu ARP">
Uruchom Wiersz polecenia systemu Windows (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) i wydaj polecenie ```arp /?```. Zobaczysz wszystkie dostępne opcje dla komendy **ARP** na Twoim komputerze.
```
arp /?
```
</Step>

<Step title="Tablica powiązań ARP na Twoim komputerze">
Przyjrzyj się wpisom (jeśli żadnych nie ma w tablicy, wywołaj ruch sieciowy, wykonując ```ping``` na komputer sąsiada). Zaobserwuj, że w każdym z nich skojarzony jest adres sieciowy (Internet Address, w tym przypadku adres IP) z adresem fizycznym MAC (Physical Address).

```bash
arp -a
```

<ScreenshotPaste label="Zrzut ekranu: tablica powiązań ARP" />

</Step>

<Step title="Usuwanie wpisów z tablicy powiązań ARP">
W programie Wireshark uruchom przechwytywanie ruchu (filtruj tak, aby wyświetlić jedynie ruch ARP ```arp```).
Wymuś wyczyszczenie całej tablicy ARP na Twoim komputerze komendą:
```bash
arp -d *
```
Natychmiast po ```arp -d *``` wykonaj polecenie:
```bash
arp -a
```
Jeśli zaobserwujesz pojedyncze wpisy oznacza to, że poprawnie wykonano ćwiczenie.

<ScreenshotPaste label="Zrzut ekranu: zaobserwowane wpisy w tablica powiązań ARP" />

</Step>
</StepByStep>

### Wgranie wstępnej konfiguracji na urządzenie

<StepByStep>
<Step title="Konfiguracja przełącznika do pobrania">
Sprawdź opis na scianie do którego podłączony jest Twój komputer (gniazdo **LPD/Y**). Podłączenie konsoli SW w zależności od grupy -> patchpanelu pod gnizado LPD/Y i następnie kabel konsolowy podłączamy w gniazdo ścienne LPDF/Y i USB pod port **USB 3.0**.

Pobierz niniejszą konfigurację ([konfiguracja SW](/files/SW.txt)).
</Step>

<Step title="Wgranie konfiguracji urządzenia">
1. Sprawdź w **Menedżerze urządzeń** (Windows: Start → wpisz "Menedżer urządzeń" → rozwiń "Porty (COM i LPT)") numer przydzielonego portu, np. `COM1`.
2. Uruchom **PuTTY** i skonfiguruj połączenie:

<div className="text-center">
![Rys1](/img/2/putty.png)

Rys.1 Konfiguracja połączenia szeregowego [^putty]

</div>

3. Kliknij **Open** — powinieneś zobaczyć znak zachęty urządzenia (np. `Switch` albo `Router` zakończone znakiem większości), bez logowania (fabrycznie brak hasła na konsoli).

Wpisz komendę `enable`, następnie `configure terminal` i wklej konfigurację w terminalu.
</Step>

<Step title="Podłączenie">
Na Rysunku 2 przedstawiono schemat połączenia komputerów (**PC1** i **PC2**) do **SW**.
<div className="text-center">
![Rys2](/img/2/siec.png)

Rys.2 Schemat połączenie [^cisco]

</div>
</Step>
</StepByStep>

### Wyświetlenie tablicy MAC adresów na przełączniku

<StepByStep>
<Step title="Połączenie do przełącznika">
Odłącz kabel konsolowy i wepnij ponownie biały kabel oraz odłącz kabel z portu konsolowego i podłącz do swojego (SW-X) przełącznika na jeden z pierwszych portów.

Nie zapomnij o zmianie adresu IP (Panel sterowania -> Sieć i Internet -> Centrum sieci i udostępniania -> karta sieciowa Ethernet2 lub Ethernet3 -> Właściwości -> IPv4) ustaw następujące parametry: **IP: 172.16.1.Y**, gdzye Y to numer stanowiska liczonego od komputera przy drzwiach oraz **Maska: 255.255.255.0** .

W Wierszu polecenia wydaj polecenie `telnet` na adres IP przełącznika laboratoryjnego (172.16.1.253) w zależnosci od stanowiska(Start ⇒ Wyszukaj programy i pliki ⇒ cmd ⇒ telnet IP_adres).

Hasło do przełącznika to: `cisco`.
</Step>

<Step title="Tryb uprzywilejowany">
Przejście do trybu umożliwiającego wyświetlanie większej części konfiguracji przełącznika (tzw. trybu uprzywilejowanego), odbywa sie przy pomocy polecenia ```enable```.

Ponowanie należy podać hasło: `cisco`.
</Step>

<Step title="Wyświetl tablicę MAC adresów">
Będąc w trybie uprzywilejowanym, aby wyświetlić tablicę MAC adresów na przełączniku trzeba wykonać polecenie:
```bash
show mac address-table dynamic
```
Zobacz, jak zbudowana jest tablica MAC adresów. Najbardziej interesują nas dwie kolumny: Mac Address, w której umieszczane są adresy MAC urządzeń widzianych przez przełącznik, oraz Ports, zawierająca informację o tym, na którym porcie widziany jest dany MAC.

<ScreenshotPaste label="Zrzut ekranu: tablica MAC adresów" />
</Step>

<Step title="Wyszukaj swój MAC adres - komputer">
Poleceniem ipconfig/all w Wierszu polecenia systemu Windows sprawdź adres fizyczny (MAC) swojego komputera. (Start ⇒ Wyszukaj programy i pliki ⇒ cmd ⇒ ipconfig/all).
</Step>

<Step title="Wyszukaj swój MAC adres - przełącznik">
Poszukaj w tablicy MAC adresów przełącznika Cisco wpisu zawierającego MAC Twojego komputera. Zobacz, pod którym portem jest on wpięty (Fa0/X, gdzie Fa oznacza port w standardzie Fast Ethernet (100 Mb/s), a X — numer portu od 0 do 23). Jeśli nie możesz go znaleźć, wykonaj ping do sąsiada z grupy i sprawdź ponownie.
</Step>

<Step title="Proces uczenia sie adresów MAC - I">
W porozumieniu z resztą grupy niech jedna osoba odłączy kabel sieciowy z przełącznika. Następnie osoba podłączona do przełącznika wykonuje nastepujace dwa polcenia: 
```bash
clear mac address-table dynamic
show mac address-table dynamic
```
Zobaczysz pojedynczy wpis.

</Step>

<Step title="Proces uczenia sie adresów MAC - II">
Teraz osoba która odłączyła kabel sieciowy ponownie sie podłącza do Przełącznika. Ponownie można wykonac polecnie na przełączniku:
```
show mac address-table dynamic
```
Tablica nie uległa zmianie, ponieważ dzieje sie to dopiero, gdy użytkownik wywoła usługę. 
</Step>

<Step title="Proces uczenia sie adresów MAC - III">
Osoba która się podłączyła wykonuje ```ping``` do sąsiada z grupy. Ponownie można wykonac polecnie na przełączniku:
```
show mac address-table dynamic
```
<ScreenshotPaste label="Zrzut ekranu: wpis z mac address-table" />
</Step>
</StepByStep>

:::info Pamiętaj
To, że przełącznik posiada skonfigurowany adres IP (3. warstwy), nie oznacza, że na 2. warstwie modelu OSI obsługiwane są adresy IP. Adres IP przypisany przełącznikowi służy jedynie temu, aby móc dostać się na niego i go przekonfigurować; nie ma wpływu na sam proces przełączania ramek, który to następuje na podstawie adresów MAC.
:::

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^802.3]: [IEEE Std 802.3-2018](https://standards.ieee.org/standard/802_3-2018.html), IEEE Standard for Ethernet, Institute of Electrical and Electronics Engineers.

[^802]: [IEEE Std 802-2014](https://ieeexplore.ieee.org/document/6847097), IEEE Standard for Local and Metropolitan Area Networks: Overview and Architecture, Institute of Electrical and Electronics Engineers, 2014.

[^RFC826]: IETF, [RFC 826](https://datatracker.ietf.org/doc/rfc826/) — An Ethernet Address Resolution Protocol (ARP), listopad 1982.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^putty]: [PuTTY](https://the.earth.li/~sgtatham/putty/0.85/htmldoc/).

[^cisco]: Grafika wykonana w programie - [Cisco Packet Tracer](https://www.netacad.com/resources/lab-downloads?courseLang=en-US)

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.
