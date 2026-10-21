---
sidebar_position: 2
title: "Ćwiczenie 2: Konfiguracja urządzeń końcowych i diagnostyka sieci"
---

<!--- import bibliotek -->
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import CodeBlock from '@site/src/components/CodeBlock';
import SharedValue from '@site/src/components/SharedValue';

# Ćwiczenie 2: Konfiguracja urządzeń końcowych i diagnostyka sieci

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

## I. Wprowadzenie

### Konfiguracja urządzeń końcowych

Parametry sieciowe hosta. Do komunikacji w sieci IP host potrzebuje czterech parametrów [^RFC1122]:
- **adres IP** - unikalny identyfikator interfejsu w danej sieci;
- **maska (prefiks)** - pozwala hostowi rozstrzygnąć, czy cel leży w tej samej podsieci;
- **brama domyślna** - adres routera w tej samej podsieci, do którego trafia ruch do innych sieci;
- **serwer DNS** - resolver tłumaczący nazwy (np. wp.pl) na adresy IP (rekordy A lub AAAA) i odwrotnie.

<div className="justify">
**Konfiguracja statyczna** - parametry wpisywane ręcznie. Stosuje się ją dla serwerów, drukarek, urządzeń sieciowych i wszędzie tam, gdzie adres musi być przewidywalny/powatarzalny. Ustawienie parametrów sieci można wykonać przy pomocy narzędzi: Windows - GUI, netsh interface ip, PowerShell (New-NetIPAddress, Set-DnsClientServerAddress); Linux - nmcli, netplan, ip addr add (zmiana nietrwała). Wady przy takiej konfiguracji to: ryzyko konfliktów adresów (duplikaty) i literówek oraz duża pracochłonność przy jakichkolwiek zmianach.

**Konfiguracja dynamiczna** - DHCP [^RFC2131] przydziela parametry na czas dzierżawy w czterech krokach DORA: Discover (broadcast), Offer, Request, Acknowledge, z użyciem UDP 67 (serwer) i 68 (klient). **Proces DORA** jest procesem przydzielania adresów, który został przedstawiony na Rysunku 1.
</div>

![Rys1](/img/po-adm-sieci-2/dora.png)
<div className="text-center">
Rys.1 Proces DORA [^claude]
</div>

<div className="justify">
Kroki 1 i 3 są rozgłoszeniowe. Klient na starcie nie ma jeszcze adresu IP, więc fizycznie nie może wysłać unicastu do konkretnego serwera. Musi rozgłosić zapytanie do całej sieci lokalnej. Rozgłoszenie **DHCPREQUEST** w kroku 3 ma dodatkową funkcję: jeśli w sieci działa więcej niż jeden serwer DHCP i klient dostał oferty od kilku z nich, to rozgłoszenie informuje pozostałe serwery, że ich oferta nie została przyjęta, więc mogą zwolnić zarezerwowany dla niej adres.

Klient odnawia dzierżawę po upływie 50% czasu (T1), a po 87,5% (T2) próbuje u dowolnego serwera. Ważne opcje: 1 - maska, 3 - router, 6 - DNS, 15 - domena, 51 - czas dzierżawy, 54 - identyfikator serwera [^RFC2132]. Ponieważ Discover jest broadcastem, to dla serwer w innej podsieci wymagany jest przekaźnik (DHCP relay, w IOS ip helper-address). Brak odpowiedzi serwera skutkuje adresem APIPA `169.254.0.0/16`. Rezerwacje wiążą adres z MAC.

### Narzędzia diagnostyczne TCP/IP

Diagnostykę prowadzi się warstwowo idąc krok po kroku po modelu OSI. Od fizycznej łączności, wpisy do tablicy ARP i konfiguracji interfejsu sieciowego hosta, stan połączen i rozwiązywanie nazw domenowych. Podstawowe narzędzia diagnostyczne: ping i tracert - ICMP [^RFC792], netstat i ss - stany połączeń TCP [^RFC9293], nslookup i dig - DNS [^RFC1034][^RFC1035], składnia poleceń - dokumentacja systemów, obserwacja ruchu - Wireshark [^wireshark]. W Tabeli 1 wypisano komendy diagnostyczne z parametrami oraz wyjasnieniem co sprawdza dana komenda.
</div>

Tab.1 Komendy diagnostyczne
| Narzędzie (Windows) | Odpowiednik Linux | Do czego służy | Na co zwrócić uwagę |
| --- | --- | --- | --- |
| `ipconfig /all`, `/release`, `/renew`, `/flushdns`, `/displaydns` | `ip addr`, `ip route`, `resolvectl`, `dhclient`/`nmcli` | odczyt i odświeżenie konfiguracji, czyszczenie pamięci podręcznej DNS | adres 169.254.x.x = brak DHCP; zła maska lub brama; zmiany w DNS wymagają `/flushdns` |
| `ping` (`-n`, `-t`, `-l`, `-f`, `-4`, `-6`) | `ping` (`-c`, `-s`, `-M do`) | test osiągalności - ICMP Echo Request/Reply (typ 8/0) | czas odpowiedzi, TTL (podpowiada system celu), straty; ICMPv4 bywa blokowany przez system |
| `tracert` (`-d`, `-h`), `pathping` | `traceroute` (`-I`, `-T`), `mtr`, `tracepath` | trasa pakietu: kolejne skoki dzięki rosnącemu TTL i komunikatom ICMP Time Exceeded (typ 11) | gwiazdki = brak odpowiedzi skoku, nie zawsze awaria; Windows używa ICMP, Linux domyślnie UDP |
| `netstat` (`-a`, `-n`, `-o`, `-b`, `-r`, `-s`, `-e`) | `ss -tulpn`, `ss -tan`, `ip -s link` | aktywne połączenia, porty nasłuchujące, procesy, tablica routingu, statystyki | stany TCP (LISTENING, ESTABLISHED, TIME\_WAIT), nieznane procesy |
| `nslookup` (tryb interaktywny, `set type=`) | `dig`, `host`, `resolvectl query` | zapytania DNS do wybranego serwera | odpowiedź nieautorytatywna, rozbieżność między serwerami |
| `arp -a`, `route print`, `Test-NetConnection` | `ip neigh`, `ip route`, `nc -zv` | pamięć ARP, tablica routingu hosta, test portu TCP | brak wpisu bramy w ARP, nadmiarowe trasy |

### Konfiguracja urządzeń sieciowych

**Minimum bezpieczeństwa urządzenia sieciowego**

<div className="justify">
Zanim jeszcze urządzenie zacznie cokolwiek routować czy przełączać, powinno mieć skonfigurowane podstawowe zabezpieczenia dostępu to standardowa checklista, od której zaczyna się konfigurację każdego urządzenia, niezależnie od jego docelowej roli:
- **Nazwa własna (hostname)** - żeby wiedzieć, na którym urządzeniu się jest (istotne, gdy pracuje się na kilku naraz przez wiele okien PuTTY).
- **Baner ostrzegawczy (banner motd)** - jednoznaczna informacja, że dostęp jest tylko dla autoryzowanych osób.
- **Hasło do trybu uprzywilejowanego (`enable secret`)** - bez niego każdy, kto dostanie się do trybu podstawowego, może przejść do pełnej kontroli urządzenia.
- **Hasła na liniach dostępowych (console, vty)** - same urządzenie fizycznie/sieciowo dostępne to jeszcze nie problem, dopóki nie da się na nim niczego zrobić bez hasła.
- **Szyfrowanie zapisanych haseł (`service password-encryption`)** - żeby hasła nie były czytelne "z ekranu" przy podglądzie konfiguracji.
- **SSH zamiast Telnetu** - żeby hasło logowania nie były przesyłane siecią jawnym tekstem.
</div>

**Konfiguracja urządzeń**

Na stronie [Dokumentacja 2.1](/docs-po-adm-sieci/cwiczenie-021.md) przedstawiono komendy do pracy z urządzeniami Cisco.

Na stronie [Dokumentacja 2.2](/docs-po-adm-sieci/cwiczenie-022.md) przedstawiono komendy do pracy z urządzeniami Mikrotik.

Na stronie [Dokumentacja 2.3](/docs-po-adm-sieci/cwiczenie-023.md) przedstawiono komendy do pracy z urządzeniami Fortinet.

Na stronie [Dokumentacja 2.4](/docs-po-adm-sieci/cwiczenie-024.md) przedstawiono komendy do pracy z urządzeniami Dell.

## II. Zadania do wykonania

### Inwentaryzacja konfiguracji stanowiska

<StepByStep>
<Step title="Odczyt konfiguracji">
Otwórz Wiersz polecenia (Start ⇒ Wyszukaj programy i pliki ⇒ cmd) i wykonaj kolejno:

```bash
ipconfig /all
route print            
arp -a                 
```

Odszukaj kartę, przez którą komputer łączy się z siecią pracowni, i uzupełnij Tabelę 2.

<EditableTable
title="Tab. 2 Konfiguracja stanowiska"
storageKey="cw2_zad1-konfiguracja"
columns={[
{ key: 'parametr', label: 'Parametr', readOnly: true },
{ key: 'wartosc', label: 'Wartość' },
{ key: 'polecenie', label: 'Polecenie / miejsce odczytu' },
]}
initialRows={[
{ parametr: 'Adres MAC', wartosc: '', shared: { wartosc: 'mac'} },
{ parametr: 'Adres IPv4', wartosc: '', shared: { wartosc: 'ipv4'} },
{ parametr: 'Maska', wartosc: '', polecenie: '', shared: { wartosc: 'maska'} } ,
{ parametr: 'Brama domyślna IPv4', wartosc: '', polecenie: '', shared: { wartosc: 'brama'} },
{ parametr: 'Serwer DNS', wartosc: '', polecenie: '', shared: { wartosc: 'dns'} },
{ parametr: 'Serwer DHCP', wartosc: '', polecenie: '', shared: { wartosc: 'dhcp'} },
{ parametr: 'Dzierżawa uzyskana' },
{ parametr: 'Dzierżawa wygasa' },
{ parametr: 'Adresy IPv6 (Link-local)', wartosc: '', polecenie: '', shared: { wartosc: 'ipv6'} },
{ parametr: 'Adres MAC bramy', wartosc: '', polecenie: '', shared: { wartosc: 'mac_brama'} },
{ parametr: 'Adres interfejsu dla trasy domyślnej' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>
</Step>

<Step title="Analiza">
<KeywordAnswer
  title="Ta sama sieć czy inna?"
  question="Skąd komputer wie, czy pakiet do danego adresu wysłać bezpośrednio do odbiorcy, czy do bramy domyślnej?"
  keywords={['mask', 'AND', 'podsie', 'sieć']}
  explanation="Host wykonuje iloczyn logiczny AND adresu docelowego i własnej maski. Jeśli wynik równa się adresowi jego sieci, cel jest lokalny i host ustala jego MAC przez ARP. W przeciwnym razie wysyła ramkę na adres MAC bramy domyślnej."
  storageKey="cw2_zad1-decyzja"
/>
</Step>
</StepByStep>

### Diagnostyka warstwowa: ping, tracert, MTU

<StepByStep>
<Step title="Ping krok po kroku">
Wykonaj testy od najbliższego do najdalszego celu i zapisz wyniki w Tabeli 3.

<CodeBlock lines={[
'ping 127.0.0.1',
<>ping <SharedValue shared="ipv4" fallback="IPv4" /></>,
<>ping <SharedValue shared="brama" fallback="Brama domyślna" /></>,
<>ping <SharedValue shared="dns" fallback="Adres DNS" /></>,
'ping 1.1.1.1',
'ping wp.pl',
'ping -6 wp.pl'
]} />

<EditableTable
title="Tab. 3 Wyniki testów ping"
storageKey="cw2_zad2-ping"
columns={[
{ key: 'cel', label: 'Cel', readOnly: true },
{ key: 'wynik', label: 'Odpowiedzi (tak/nie)' },
{ key: 'czas', label: 'Czas [ms]' },
{ key: 'wniosek', label: 'Co sprawdza ten test' },
]}
initialRows={[
{ cel: '127.0.0.1' },
{ cel: <SharedValue shared="ipv4" fallback="IPv4" /> },
{ cel: <SharedValue shared="brama" fallback="Brama domyślna" /> },
{ cel: <SharedValue shared="dns" fallback="Adres DNS" /> },
{ cel: '1.1.1.1' },
{ cel: 'wp.pl' },
{ cel: 'wp.pl (IPv6)' },
]}
allowAddRows={false}
allowRemoveRows={false}
/>
</Step>

<Step title="Trasa pakietu">
```bash
tracert 9.9.9.9
tracert -d 9.9.9.9
pathping -n 9.9.9.9
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
ping -f -l 1472 1.1.1.1
ping -f -l 1473 1.1.1.1
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

### Diagnostyka DNS: nslookup

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
{ key: 'typ', label: 'Typ rekordu', readOnly: true },
{ key: 'wynik', label: 'Wynik' },
]}
initialRows={[
{ typ: 'A' },
{ typ: 'AAAA' },
{ typ: 'MX' },
{ typ: 'NS' },
{ typ: 'PTR' },
]}
allowAddRows={false}
allowRemoveRows={false}
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

[^RFC1122]: [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122) - Requirements for Internet Hosts - Communication Layers, 1989.

[^RFC2131]: [RFC 2131](https://www.rfc-editor.org/rfc/rfc2131) - Dynamic Host Configuration Protocol, 1997.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^RFC2132]: [RFC 2132](https://www.rfc-editor.org/rfc/rfc2132) - DHCP Options and BOOTP Vendor Extensions, 1997.

[^RFC792]: [RFC 792](https://www.rfc-editor.org/rfc/rfc792) - Internet Control Message Protocol, 1981.

[^RFC9293]: [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) - Transmission Control Protocol, 2022 (stany połączeń TCP).

[^RFC1034]: [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034) - Domain Names: Concepts and Facilities, 1987.

[^RFC1035]: [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) - Domain Names: Implementation and Specification, 1987.

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.