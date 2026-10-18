---
sidebar_position: 2
title: "Ćwiczenie 2: Konfiguracja urządzeń końcowych i diagnostyka sieci"
---

<!--- import bibliotek -->
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';

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
**Konfiguracja statyczna** - parametry wpisywane ręcznie. Stosuje się ją dla serwerów, drukarek, urządzeń sieciowych i wszędzie tam, gdzie adres musi być przewidywalny/powatarzalny. Ustawienie parametrów sieci można wykonać przy pomocy narzędzi: Windows – GUI, netsh interface ip, PowerShell (New-NetIPAddress, Set-DnsClientServerAddress); Linux – nmcli, netplan, ip addr add (zmiana nietrwała). Wady przy takiej konfiguracji to: ryzyko konfliktów adresów (duplikaty) i literówek oraz duża pracochłonność przy jakichkolwiek zmianach.

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

Na stronie [Dokumentacja 2.1](/docs-po-adm-sieci/cwiczenie-021.md) przedstawiono komendy do pracy z urządzeniami Cisco.

[^RFC1122]: [RFC 1122](https://www.rfc-editor.org/rfc/rfc1122) - Requirements for Internet Hosts - Communication Layers, 1989.

[^RFC2131]: [RFC 2131](https://www.rfc-editor.org/rfc/rfc2131) - Dynamic Host Configuration Protocol, 1997.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^RFC2132]: [RFC 2132](https://www.rfc-editor.org/rfc/rfc2132) - DHCP Options and BOOTP Vendor Extensions, 1997.

[^RFC792]: [RFC 792](https://www.rfc-editor.org/rfc/rfc792) - Internet Control Message Protocol, 1981.

[^RFC9293]: [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) - Transmission Control Protocol, 2022 (stany połączeń TCP).

[^RFC1034]: [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034) - Domain Names: Concepts and Facilities, 1987.

[^RFC1035]: [RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) - Domain Names: Implementation and Specification, 1987.

[^wireshark]: [WIRESHARK TEAM](https://wireshark.org). Wireshark User’s Guide. Wireshark Foundation, 2026.