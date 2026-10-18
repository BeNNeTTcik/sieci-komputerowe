---
sidebar_position: 2.05
title: "Ćwiczenie 2: Zadania do wykonania"
---

<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';

# Ćwiczenie 2: Zadania do wykonania

<SprawozdanieHeader
  thema="Administrowanie sieciami"
  exerciseTitle="Ćwiczenie 2: Konfiguracja urządzeń końcowych i diagnostyka sieci"
  storageKey="cwiczenie-2"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-2"
  storageKeys={[]}
  sharedPrefix="cw2_"
/>

<div className="justify">
Zadania podzielono na dwie części. **Część A** wykonuje się na komputerze w pracowni (Windows, Wiersz polecenia, Wireshark) – sprawdza ona rzeczywistą konfigurację stanowiska i działanie narzędzi diagnostycznych. **Część B** wykonuje się w programie **Cisco Packet Tracer** na zestawie odpowiadającym sieci laboratoryjnej: dwa routery (R1-**X**, R2-**X**) i przełącznik (SW-**X**). Polecenia dla urządzeń Cisco znajdują się w [Dokumentacji 2.1](/docs-po-adm-sieci/cwiczenie-021.md). Łączny czas: **135 minut**.
</div>

:::warning **X – numer pary studentów**
We wszystkich adresach zamień **X** na numer swojej pary (np. para 5: `172.16.5.0/24`, `10.10.5.0/30`).
:::

## Część A. Komputer w pracowni (55 min)

### Zadanie 1. Inwentaryzacja konfiguracji stanowiska (10 min)

<StepByStep>
<Step title="Odczyt konfiguracji">
Otwórz Wiersz polecenia (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) i wykonaj kolejno:

```bash
ipconfig /all          # pełna konfiguracja kart sieciowych
route print            # tablica routingu hosta
arp -a                 # pamięć podręczna ARP
```

Odszukaj kartę, przez którą komputer łączy się z siecią pracowni, i uzupełnij Tabelę 1.

<EditableTable
title="Tab. 1 Konfiguracja stanowiska"
storageKey="cw2_zad1-konfiguracja"
columns={[
{ key: 'parametr', label: 'Parametr' },
{ key: 'wartosc', label: 'Wartość' },
{ key: 'polecenie', label: 'Polecenie / miejsce odczytu' },
]}
initialRows={[
{ parametr: 'Adres MAC' },
{ parametr: 'Adres IPv4 i maska' },
{ parametr: 'Brama domyślna IPv4' },
{ parametr: 'Serwer(y) DNS' },
{ parametr: 'Serwer DHCP' },
{ parametr: 'Dzierżawa uzyskana / wygasa' },
{ parametr: 'Adresy IPv6 (wszystkie)' },
{ parametr: 'Brama domyślna IPv6' },
{ parametr: 'Adres MAC bramy (z arp -a)' },
]}
/>
</Step>

<Step title="Analiza">
<OpenQuestion
  title="Czas odnowienia dzierżawy"
  question="Na podstawie czasu uzyskania i wygaśnięcia dzierżawy oblicz, kiedy komputer pierwszy raz spróbuje odnowić adres u swojego serwera (T1) i kiedy zacznie szukać dowolnego serwera (T2)."
  modelAnswer="T1 = 50% czasu dzierżawy, T2 = 87,5% czasu dzierżawy, liczone od chwili jej uzyskania. Przy dzierżawie 8 godzin: T1 po 4 h, T2 po 7 h."
  minLength={40}
  storageKey="cw2_zad1-t1t2"
/>

<KeywordAnswer
  title="Ta sama sieć czy inna?"
  question="Skąd komputer wie, czy pakiet do danego adresu wysłać bezpośrednio do odbiorcy, czy do bramy domyślnej?"
  keywords={['mask', 'AND', 'podsie', 'sieć']}
  explanation="Host wykonuje iloczyn logiczny AND adresu docelowego i własnej maski. Jeśli wynik równa się adresowi jego sieci, cel jest lokalny i host ustala jego MAC przez ARP. W przeciwnym razie wysyła ramkę na adres MAC bramy domyślnej."
  storageKey="cw2_zad1-decyzja"
/>
</Step>
</StepByStep>

### Zadanie 2. Diagnostyka warstwowa: ping, tracert, MTU (15 min)

<StepByStep>
<Step title="Ping krok po kroku">
Wykonaj testy od najbliższego do najdalszego celu i zapisz wyniki w Tabeli 2.

```bash
ping 127.0.0.1           # stos TCP/IP na własnym komputerze
ping <własny adres IP>   # karta sieciowa
ping <brama domyślna>    # sieć lokalna
ping <serwer DNS>
ping 1.1.1.1             # Internet po adresie
ping wp.pl               # Internet po nazwie (DNS)
ping -6 wp.pl            # to samo przez IPv6
```

<EditableTable
title="Tab. 2 Wyniki testów ping"
storageKey="cw2_zad2-ping"
columns={[
{ key: 'cel', label: 'Cel' },
{ key: 'wynik', label: 'Odpowiedzi (tak/nie)' },
{ key: 'czas', label: 'Czas [ms]' },
{ key: 'ttl', label: 'TTL' },
{ key: 'wniosek', label: 'Co sprawdza ten test' },
]}
initialRows={[
{ cel: '127.0.0.1' },
{ cel: 'własny adres IP' },
{ cel: 'brama domyślna' },
{ cel: 'serwer DNS' },
{ cel: '1.1.1.1' },
{ cel: 'wp.pl' },
{ cel: 'wp.pl (IPv6)' },
]}
/>

<KeywordAnswer
  title="Co mówi TTL?"
  question="Odpowiedź przyszła z TTL=116. Jaki system operacyjny najpewniej ma odpowiadający host i ile routerów jest po drodze?"
  keywords={['128', 'Windows', '12']}
  explanation="Najbliższa typowa wartość początkowa powyżej 116 to 128 (Windows). Pakiet minął więc około 128 − 116 = 12 routerów. Systemy Linux i macOS zaczynają zwykle od 64, a urządzenia sieciowe od 255."
  storageKey="cw2_zad2-ttl"
/>
</Step>

<Step title="Trasa pakietu">
```bash
tracert 9.9.9.9          # trasa z tłumaczeniem adresów na nazwy
tracert -d 9.9.9.9       # bez tłumaczenia nazw (szybciej)
pathping -n 9.9.9.9      # straty na każdym skoku (trwa ok. 1–2 min)
```

<ScreenshotPaste label="Zrzut ekranu: wynik tracert -d" />

<OpenQuestion
  title="Granice sieci"
  question="Wskaż na wyniku tracert, gdzie kończy się sieć uczelni, gdzie zaczyna się sieć operatora i ile skoków dzieli Cię od celu. Co oznaczają gwiazdki (*) w niektórych wierszach?"
  modelAnswer="Pierwsze skoki z adresami prywatnymi należą do sieci uczelni; pierwszy adres publiczny to zwykle router operatora. Gwiazdki oznaczają, że dany router nie odesłał komunikatu ICMP Time Exceeded (np. filtruje go zapora) – nie musi to oznaczać awarii, skoro kolejne skoki odpowiadają."
  minLength={60}
  storageKey="cw2_zad2-tracert"
/>
</Step>

<Step title="Największy pakiet bez fragmentacji (MTU)">
```bash
ping -f -l 1472 1.1.1.1  # flaga DF + 1472 B danych
ping -f -l 1473 1.1.1.1  # o 1 bajt więcej
```

<KeywordAnswer
  title="Skąd 1472?"
  question="Dlaczego przy MTU 1500 B największy pakiet bez fragmentacji ma 1472 B danych?"
  keywords={['28', '20', 'nagłów', 'naglow']}
  explanation="Do 1472 B danych dochodzi 8 B nagłówka ICMP i 20 B nagłówka IPv4, razem 1500 B. Pakiet o 1 B większy przekracza MTU, a ustawiona flaga DF zabrania fragmentacji, więc pojawia się komunikat „Packet needs to be fragmented but DF set”."
  storageKey="cw2_zad2-mtu"
/>
</Step>
</StepByStep>

### Zadanie 3. Połączenia i porty: netstat (10 min)

<StepByStep>
<Step title="Porty nasłuchujące i procesy">
```bash
netstat -ano                       # wszystkie połączenia i porty z numerem procesu (PID)
tasklist /fi "PID eq <numer>"      # nazwa procesu o danym PID
```

Wybierz trzy porty w stanie **LISTENING** i uzupełnij Tabelę 3.

<EditableTable
title="Tab. 3 Porty nasłuchujące"
storageKey="cw2_zad3-porty"
columns={[
{ key: 'protokol', label: 'Protokół' },
{ key: 'adres', label: 'Adres lokalny:port' },
{ key: 'pid', label: 'PID' },
{ key: 'proces', label: 'Proces' },
{ key: 'usluga', label: 'Do czego służy' },
]}
initialRows={[{}, {}, {}]}
/>
</Step>

<Step title="Połączenie HTTPS">
Otwórz w przeglądarce dowolną stronę, a następnie:

```bash
netstat -an | findstr :443         # połączenia na porcie 443
```

Zamknij kartę przeglądarki i powtórz polecenie po kilku sekundach.

<ScreenshotPaste label="Zrzut ekranu: netstat -an | findstr :443 przed i po zamknięciu karty" />

<KeywordAnswer
  title="Stan TIME_WAIT"
  question="Po zamknięciu karty połączenie przechodzi w stan TIME_WAIT. Po co TCP utrzymuje ten stan?"
  keywords={['opóźnion', 'opoznion', 'spóźnion', 'spoznion', 'ponown', 'ACK']}
  explanation="Strona zamykająca połączenie czeka (2 × MSL), aby ostatnie potwierdzenie ACK mogło zostać wysłane ponownie, gdyby się zgubiło, oraz aby spóźnione segmenty starego połączenia nie trafiły do nowego połączenia o tych samych adresach i portach."
  storageKey="cw2_zad3-timewait"
/>
</Step>

<Step title="Test portu bez pingu">
Otwórz PowerShell i sprawdź dostępność usługi na porcie TCP:

```bash
Test-NetConnection wp.pl -Port 443
```

<OpenQuestion
  title="Ping a port"
  question="Dlaczego test portu TCP może zakończyć się sukcesem nawet wtedy, gdy ping do tego samego serwera nie odpowiada?"
  modelAnswer="Ping używa ICMP, który bywa blokowany przez zapory, a test portu nawiązuje połączenie TCP z działającą usługą. Brak odpowiedzi na ping nie dowodzi więc niedostępności hosta."
  minLength={40}
  storageKey="cw2_zad3-port"
/>
</Step>
</StepByStep>

### Zadanie 4. Diagnostyka DNS: nslookup (10 min)

<StepByStep>
<Step title="Rekordy DNS">
```bash
nslookup wp.pl                     # rekord A (i AAAA)
nslookup -type=AAAA wp.pl          # tylko IPv6
nslookup -type=MX wp.pl            # serwery poczty
nslookup -type=NS wp.pl            # serwery autorytatywne
nslookup <adres IP serwera>        # zapytanie odwrotne (PTR)
nslookup wp.pl 1.1.1.1             # zapytanie do wskazanego serwera DNS
```

<EditableTable
title="Tab. 4 Rekordy DNS"
storageKey="cw2_zad4-dns"
columns={[
{ key: 'typ', label: 'Typ rekordu' },
{ key: 'wynik', label: 'Wynik' },
{ key: 'serwer', label: 'Serwer, który odpowiedział' },
]}
initialRows={[
{ typ: 'A' },
{ typ: 'AAAA' },
{ typ: 'MX' },
{ typ: 'NS' },
{ typ: 'PTR' },
]}
/>
</Step>

<Step title="Pamięć podręczna DNS">
```bash
ipconfig /displaydns               # zapamiętane odpowiedzi DNS
ipconfig /flushdns                 # wyczyszczenie pamięci podręcznej
```

<KeywordAnswer
  title="Odpowiedź nieautorytatywna"
  question="Dlaczego nslookup oznacza odpowiedź jako „nieautorytatywną” (Non-authoritative answer)?"
  keywords={['autorytat', 'pośredn', 'posredn', 'pamięć', 'pamiec', 'cache', 'resolver']}
  explanation="Odpowiedzi udzielił resolver (np. serwer DNS uczelni lub 1.1.1.1), który pobrał ją wcześniej i trzyma w pamięci podręcznej, a nie serwer autorytatywny dla tej domeny. Odpowiedź autorytatywną daje dopiero zapytanie skierowane bezpośrednio do serwera z rekordu NS."
  storageKey="cw2_zad4-autorytatywna"
/>
</Step>
</StepByStep>

### Zadanie 5. Proces DORA w Wiresharku (10 min)

:::note
Polecenia `ipconfig /release` i `/renew` mogą wymagać uprawnień administratora i na chwilę odłączają komputer od sieci. Jeśli w pracowni nie jest to możliwe, przejdź do zadania 8 – proces DORA zobaczysz tam w Packet Tracerze.
:::

<StepByStep>
<Step title="Przechwycenie ruchu DHCP">
W programie Wireshark rozpocznij przechwytywanie na karcie sieciowej i ustaw filtr wyświetlania:

```
Filtr wyświetlania: dhcp
```

W Wierszu polecenia wykonaj:

```bash
ipconfig /release
ipconfig /renew
```
</Step>

<Step title="Analiza komunikatów">
Odszukaj cztery komunikaty procesu DORA i uzupełnij Tabelę 5.

<EditableTable
title="Tab. 5 Komunikaty DORA"
storageKey="cw2_zad5-dora"
columns={[
{ key: 'komunikat', label: 'Komunikat' },
{ key: 'srcip', label: 'IP źródłowy' },
{ key: 'dstip', label: 'IP docelowy' },
{ key: 'dstmac', label: 'MAC docelowy' },
{ key: 'opcje', label: 'Opcje (1, 3, 6, 51, 54)' },
]}
initialRows={[
{ komunikat: 'Discover' },
{ komunikat: 'Offer' },
{ komunikat: 'Request' },
{ komunikat: 'ACK' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: przechwycone komunikaty DHCP w Wiresharku" />
</Step>
</StepByStep>

## Część B. Cisco Packet Tracer (80 min)

### Topologia i adresacja

<div className="justify">
Zbuduj w Packet Tracerze topologię odpowiadającą zestawowi pary. Użyj routerów **2911** i przełącznika **2960** (nazwy interfejsów zgodne ze ściągą z Dokumentacji 2.1). Serwer podłącz bezpośrednio do routera R2-X.
</div>

```
  PC1 ─┐
       SW-X ── G0/0 [R1-X] G0/1 ──── G0/1 [R2-X] G0/0 ── Serwer
  PC2 ─┘
     LAN1 172.16.X.0/24       10.10.X.0/30        LAN2 192.168.X.0/24
```

Tab. 6 Adresacja

| Urządzenie | Interfejs | Adres IPv4 | Maska | Brama |
|---|---|---|---|---|
| R1-X | G0/0 | 172.16.X.1 | 255.255.255.0 | – |
| R1-X | G0/1 | 10.10.X.1 | 255.255.255.252 | – |
| R2-X | G0/1 | 10.10.X.2 | 255.255.255.252 | – |
| R2-X | G0/0 | 192.168.X.1 | 255.255.255.0 | – |
| SW-X | VLAN 1 | 172.16.X.2 | 255.255.255.0 | 172.16.X.1 |
| PC1 | NIC | 172.16.X.10 | 255.255.255.0 | 172.16.X.1 |
| PC2 | NIC | 172.16.X.11 | 255.255.255.0 | 172.16.X.1 |
| Serwer | NIC | 192.168.X.10 | 255.255.255.0 | 192.168.X.1 |

Trasy statyczne (potrzebne, aby obie sieci LAN się widziały):

```
R1-X(config)# ip route 192.168.X.0 255.255.255.0 10.10.X.2
R2-X(config)# ip route 172.16.X.0 255.255.255.0 10.10.X.1
```

### Zadanie 6. Minimum bezpieczeństwa urządzeń sieciowych (20 min)

<StepByStep>
<Step title="Konfiguracja podstawowa routerów i przełącznika">
Na R1-X, R2-X i SW-X skonfiguruj zabezpieczenia z listy „Minimum bezpieczeństwa urządzenia sieciowego” z wprowadzenia do ćwiczenia, korzystając ze ściągi z Dokumentacji 2.1. Następnie skonfiguruj adresy interfejsów zgodnie z Tabelą 6 i trasy statyczne.

<Checklist
title="Konfiguracja podstawowa"
storageKey="cw2_zad6-podstawy"
sections={[
{ title: 'Każde urządzenie (R1-X, R2-X, SW-X)', items: [
'Nazwa własna (hostname)',
'Baner ostrzegawczy (banner motd)',
'Hasło trybu uprzywilejowanego (enable secret)',
'Hasło na linii konsoli (line console 0, login)',
'Szyfrowanie zapisanych haseł (service password-encryption)',
'no ip domain-lookup',
]},
{ title: 'Adresacja', items: [
'Interfejsy routerów zaadresowane i włączone (no shutdown)',
'Interfejs VLAN 1 przełącznika i ip default-gateway',
'Trasy statyczne na R1-X i R2-X',
'Adresy statyczne PC1, PC2 i serwera',
]},
]}
/>
</Step>

<Step title="SSH zamiast Telnetu">
Skonfiguruj dostęp zdalny przez SSH na routerze R1-X:

```
R1-X(config)# ip domain-name lab.local
R1-X(config)# username admin secret Admin12345
R1-X(config)# crypto key generate rsa              # długość klucza: 1024
R1-X(config)# ip ssh version 2
R1-X(config)# line vty 0 4
R1-X(config-line)# transport input ssh
R1-X(config-line)# login local
R1-X(config-line)# exit
```

Sprawdź połączenie z PC1 (Desktop ⇒ Command Prompt):

```bash
ssh -l admin 172.16.X.1     # powinno działać
telnet 172.16.X.1           # powinno zostać odrzucone
```

<ScreenshotPaste label="Zrzut ekranu: udane logowanie przez SSH z PC1" />
<ScreenshotPaste label="Zrzut ekranu: show running-config na R1-X (widoczne zaszyfrowane hasła)" />

<KeywordAnswer
  title="enable password czy enable secret?"
  question="Dlaczego zamiast enable password stosuje się enable secret, a service password-encryption nie jest pełnym zabezpieczeniem haseł?"
  keywords={['skrót', 'skrot', 'hash', 'jawn', '7', 'odwrac']}
  explanation="enable secret zapisuje hasło jako skrót (hash), którego nie da się prosto odwrócić. enable password jest zapisywane jawnym tekstem, a service password-encryption tylko je zaciemnia algorytmem typu 7, który łatwo odwrócić – chroni jedynie przed przypadkowym podejrzeniem konfiguracji."
  storageKey="cw2_zad6-secret"
/>
</Step>
</StepByStep>

### Zadanie 7. Konfiguracja statyczna i typowe błędy (10 min)

<StepByStep>
<Step title="Testy przy różnych ustawieniach PC1">
Zmieniaj ustawienia PC1 (Desktop ⇒ IP Configuration) zgodnie z Tabelą 7. Po każdej zmianie wykonaj ping do PC2, do bramy i do serwera, a potem przywróć poprawne ustawienia.

<EditableTable
title="Tab. 7 Skutki błędnej konfiguracji"
storageKey="cw2_zad7-bledy"
columns={[
{ key: 'wariant', label: 'Ustawienia PC1' },
{ key: 'pc2', label: 'Ping PC2' },
{ key: 'brama', label: 'Ping brama' },
{ key: 'serwer', label: 'Ping serwer' },
{ key: 'dlaczego', label: 'Wyjaśnienie' },
]}
initialRows={[
{ wariant: 'Poprawna konfiguracja' },
{ wariant: 'Brak bramy domyślnej' },
{ wariant: 'Brama 172.16.X.254 (nieistniejąca)' },
{ wariant: 'Maska 255.255.255.252' },
{ wariant: 'Adres taki sam jak PC2' },
]}
/>

<OpenQuestion
  title="Maska /30"
  question="Dlaczego po ustawieniu maski 255.255.255.252 PC1 nadal pinguje PC2, ale nie pinguje serwera?"
  modelAnswer="Z maską /30 PC1 (172.16.X.10) należy do podsieci 172.16.X.8/30, w której jest też PC2 (.11), więc komunikacja z nim zostaje lokalna. Brama 172.16.X.1 znalazła się poza tą podsiecią, więc host nie może z niej skorzystać i nie wyśle pakietów do innych sieci."
  minLength={60}
  storageKey="cw2_zad7-maska"
/>
</Step>
</StepByStep>

### Zadanie 8. Serwer DHCP na routerze (10 min)

<StepByStep>
<Step title="Pula adresów dla LAN1">
```
R1-X(config)# ip dhcp excluded-address 172.16.X.1 172.16.X.10
R1-X(config)# ip dhcp pool LAN1
R1-X(dhcp-config)# network 172.16.X.0 255.255.255.0
R1-X(dhcp-config)# default-router 172.16.X.1
R1-X(dhcp-config)# dns-server 192.168.X.10
```

Na PC1 i PC2 przełącz konfigurację na **DHCP** i sprawdź otrzymane parametry (`ipconfig /all`). Na routerze wykonaj `show ip dhcp binding`.

<ScreenshotPaste label="Zrzut ekranu: show ip dhcp binding na R1-X" />
</Step>

<Step title="DORA w trybie Simulation">
Przejdź do trybu **Simulation**, w *Edit Filters* zostaw tylko protokół **DHCP**. Na PC1 przełącz konfigurację na Static i z powrotem na DHCP, a następnie odtwórz zdarzenia przyciskiem *Capture/Forward*. Klikając kolejne pakiety, sprawdź ich adresy w zakładce *Inbound PDU Details*.

<KeywordAnswer
  title="Dlaczego broadcast?"
  question="Dlaczego komunikat DHCP Discover jest wysyłany na adres rozgłoszeniowy 255.255.255.255?"
  keywords={['adres', 'nie zna', 'nie ma', 'rozgło', 'rozglo', 'broadcast']}
  explanation="Klient nie ma jeszcze adresu IP ani nie zna adresu serwera DHCP, więc nie może wysłać pakietu do konkretnego odbiorcy. Wysyła zapytanie z adresu 0.0.0.0 na adres rozgłoszeniowy, żeby dotarło do każdego serwera DHCP w sieci lokalnej."
  storageKey="cw2_zad8-broadcast"
/>
</Step>
</StepByStep>

### Zadanie 9. Serwer DHCP w innej sieci – przekaźnik (15 min)

<StepByStep>
<Step title="Usunięcie puli z routera">
```
R1-X(config)# no ip dhcp pool LAN1
```

Na PC1 przełącz konfigurację na Static i z powrotem na DHCP. Zapisz, jaki adres otrzymał komputer.

<OpenQuestion
  title="Brak serwera DHCP"
  question="Jaki adres otrzymał PC1, gdy w jego sieci nie ma serwera DHCP, i co to oznacza?"
  modelAnswer="Komputer nie otrzymał adresu z DHCP. W zależności od wersji Packet Tracera pozostaje bez adresu albo przyjmuje adres APIPA z puli 169.254.0.0/16, który pozwala komunikować się wyłącznie w obrębie sieci lokalnej, bez bramy."
  minLength={40}
  storageKey="cw2_zad9-apipa"
/>
</Step>

<Step title="Serwer DHCP w LAN2">
Na serwerze (Services ⇒ DHCP) włącz usługę i skonfiguruj pulę dla sieci LAN1:

| Pole | Wartość |
|---|---|
| Pool Name | LAN1 |
| Default Gateway | 172.16.X.1 |
| DNS Server | 192.168.X.10 |
| Start IP Address | 172.16.X.11 |
| Subnet Mask | 255.255.255.0 |
| Maximum Number of Users | 100 |

Kliknij **Add**, a następnie skonfiguruj przekaźnik na interfejsie R1-X od strony LAN1:

```
R1-X(config)# interface gigabitEthernet 0/0
R1-X(config-if)# ip helper-address 192.168.X.10
```

Ponownie pobierz adres na PC1 i PC2.
</Step>

<Step title="Obserwacja przekaźnika">
W trybie **Simulation** (filtr DHCP) prześledź komunikat Discover od PC1 do serwera.

<ScreenshotPaste label="Zrzut ekranu: komunikat DHCP za routerem R1-X (Inbound/Outbound PDU Details)" />

<OpenQuestion
  title="Co robi ip helper-address?"
  question="W którym miejscu rozgłoszeniowy Discover zamienia się w pakiet unicast i jaki adres źródłowy ma ten pakiet? Dlaczego serwer wie, z której puli przydzielić adres?"
  modelAnswer="Zamiana następuje na routerze R1-X: odbiera on rozgłoszenie na interfejsie G0/0 i wysyła je jako unicast do 192.168.X.10. Adresem źródłowym jest adres interfejsu G0/0 (172.16.X.1), który router wpisuje też w polu giaddr. Na tej podstawie serwer wybiera pulę dla sieci 172.16.X.0/24."
  minLength={60}
  storageKey="cw2_zad9-relay"
/>
</Step>
</StepByStep>

### Zadanie 10. Autokonfiguracja IPv6 (10 min)

<StepByStep>
<Step title="SLAAC">
```
R1-X(config)# ipv6 unicast-routing
R1-X(config)# interface gigabitEthernet 0/0
R1-X(config-if)# ipv6 address 2001:db8:X::1/64
R1-X(config-if)# ipv6 address fe80::1 link-local
```

Na PC1 i PC2 ustaw w sekcji IPv6 opcję **Automatic** (w starszych wersjach PT: *Auto Config*) i odczytaj konfigurację poleceniem `ipconfig /all`.
</Step>

<Step title="SLAAC + bezstanowy DHCPv6">
```
R1-X(config)# ipv6 dhcp pool BEZSTANOWY
R1-X(config-dhcpv6)# dns-server 2001:db8:X::10
R1-X(config-dhcpv6)# domain-name lab.local
R1-X(config-dhcpv6)# exit
R1-X(config)# interface gigabitEthernet 0/0
R1-X(config-if)# ipv6 nd other-config-flag
R1-X(config-if)# ipv6 dhcp server BEZSTANOWY
```

Ponownie pobierz konfigurację IPv6 na PC1 (przełącz na Static i z powrotem na Automatic).

<EditableTable
title="Tab. 8 Porównanie autokonfiguracji IPv6 na PC1"
storageKey="cw2_zad10-ipv6"
columns={[
{ key: 'parametr', label: 'Parametr' },
{ key: 'slaac', label: 'SLAAC' },
{ key: 'bezstanowy', label: 'SLAAC + bezstanowy DHCPv6' },
]}
initialRows={[
{ parametr: 'Adres globalny IPv6' },
{ parametr: 'Adres link-local' },
{ parametr: 'Brama domyślna' },
{ parametr: 'Serwer DNS' },
]}
/>

<KeywordAnswer
  title="Skąd brama w IPv6?"
  question="Skąd komputer otrzymał bramę domyślną IPv6 i dlaczego jest nią adres fe80::1?"
  keywords={['RA', 'Router Advertisement', 'ogłosz', 'oglosz', 'link-local']}
  explanation="Bramę domyślną host otrzymuje z komunikatu Router Advertisement (RA), a nie z DHCPv6. Routery wysyłają RA ze swojego adresu link-local, więc to on – fe80::1 – staje się bramą. Adres link-local nie zmienia się przy zmianie prefiksu sieci."
  storageKey="cw2_zad10-brama"
/>
</Step>
</StepByStep>

### Zadanie 11. Znajdź usterkę – wymiana z sąsiednią parą (15 min)

<StepByStep>
<Step title="Przygotowanie usterek">
Zapisz swoją działającą sieć jako kopię, a w kopii wprowadź **trzy usterki** z poniższej listy. Nie zapisuj w pliku, co zmieniłeś. Przekaż plik `.pkt` sąsiedniej parze.

<Checklist
title="Dozwolone usterki"
storageKey="cw2_zad11-usterki"
sections={[
{ title: 'Wybierz trzy', items: [
'Błędna maska na jednym z komputerów',
'Błędna brama domyślna na jednym z komputerów',
'Wyłączony interfejs routera (shutdown)',
'Usunięta trasa statyczna na jednym z routerów',
'Usunięte ip helper-address',
'Błędny serwer DNS w puli DHCP serwera',
'Błędny adres interfejsu routera (np. inny trzeci oktet)',
]},
]}
/>
</Step>

<Step title="Diagnostyka sieci sąsiedniej pary">
Otwórz plik otrzymany od sąsiadów i znajdź usterki, pracując warstwowo: od stanu interfejsów, przez konfigurację hostów, po routing i DHCP. Uzupełnij Tabelę 9.

<EditableTable
title="Tab. 9 Protokół diagnostyki"
storageKey="cw2_zad11-diagnostyka"
columns={[
{ key: 'objaw', label: 'Objaw' },
{ key: 'narzedzie', label: 'Użyte polecenie' },
{ key: 'wynik', label: 'Wynik polecenia' },
{ key: 'przyczyna', label: 'Przyczyna' },
{ key: 'poprawka', label: 'Poprawka' },
]}
initialRows={[{}, {}, {}]}
/>

<OpenQuestion
  title="Kolejność diagnostyki"
  question="Która usterka była najtrudniejsza do znalezienia i dlaczego? Jaką kolejność sprawdzania zastosowałbyś następnym razem?"
  minLength={60}
  storageKey="cw2_zad11-wnioski"
/>
</Step>
</StepByStep>

[^RFC2131]: [RFC 2131](https://www.rfc-editor.org/rfc/rfc2131) - Dynamic Host Configuration Protocol, 1997.

[^RFC1191]: [RFC 1191](https://www.rfc-editor.org/rfc/rfc1191) - Path MTU Discovery, 1990.

[^RFC4861]: [RFC 4861](https://www.rfc-editor.org/rfc/rfc4861) - Neighbor Discovery for IP version 6, 2007.

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.
