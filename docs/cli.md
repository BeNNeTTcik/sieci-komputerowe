---
title: Polecenia CLI symulatora
sidebar_label: Polecenia CLI
sidebar_position: 20
---

Symulator ma własny, prosty język poleceń – **taki sam na każdym urządzeniu**. Widoczne są tylko polecenia z włączonych
**pakietów protokołów** (menu „Pakiety”). Słowa kluczowe można skracać (np. `sh int` = `show interfaces`),
a `help <polecenie>` pokazuje składnię i przykłady. Adresy podaje się w notacji adres/prefiks:
`192.168.1.10/24` ([RFC 4632](https://www.rfc-editor.org/rfc/rfc4632)) albo `2001:db8:1::10/64` ([RFC 4291](https://www.rfc-editor.org/rfc/rfc4291)).

## Wszystkie urządzenia

| Polecenie | Opis |
|---|---|
| `help [polecenie]` | lista poleceń / szczegóły polecenia |
| `show interfaces \| ip \| routes \| arp \| neighbors \| mac \| vlans \| dhcp \| dns \| services \| clock \| mail \| files \| jobs \| config` | stan urządzenia; `show config` wypisuje polecenia odtwarzające konfigurację |
| `set hostname <nazwa>` | zmiana nazwy |
| `interface <if> up` / `down` | włączenie / wyłączenie interfejsu |
| `clear` | czyszczenie ekranu |

## Adresy i routing (pakiety IPv4 / IPv6)

| Polecenie | Opis |
|---|---|
| `ip add <adres>/<prefiks> dev <if>` | adres IPv4 albo IPv6 (rodzina wynika z zapisu) |
| `ip del <adres>` / `ip del dev <if>` | usunięcie adresu / wszystkich adresów interfejsu (link-local zostaje) |
| `ipv6 autoconf` / `ipv6 autoconf off` | SLAAC na hoście ([RFC 4862](https://www.rfc-editor.org/rfc/rfc4862)) |
| `route add default via <brama>` | brama domyślna (IPv4 albo IPv6) |
| `route add <sieć>/<prefiks> via <ip>` | trasa statyczna (router) |
| `route del <sieć>/<prefiks>` / `route del default [-6]` | usunięcie trasy |
| `arp flush` / `neighbors flush` | czyszczenie tablicy ARP / sąsiadów NDP |
| `ping <adres\|nazwa> [count <n>] [-6]` | Echo Request ([RFC 792](https://www.rfc-editor.org/rfc/rfc792), [RFC 4443](https://www.rfc-editor.org/rfc/rfc4443)) |
| `trace <adres\|nazwa> [-6]` | śledzenie trasy |

## DHCP (pakiet DHCP)

| Polecenie | Gdzie | Opis |
|---|---|---|
| `dhcp-server add <nazwa> net <sieć>/<prefiks> gw <brama> range <od>-<do> [dns <ip>]` | router, serwer | pula adresów |
| `dhcp-server del <nazwa>` | router, serwer | usunięcie puli |
| `dhcp-relay set dev <if> server <ip>` / `dhcp-relay del dev <if>` | router | przekaźnik DHCP |
| `dhcp-client start` / `release` | komputer, drukarka | pobranie / zwolnienie adresu |

## Usługi – klient (komputer)

| Polecenie | Pakiet | Opis |
|---|---|---|
| `dns set <ip>` / `dns flush` / `nslookup <nazwa> [A\|AAAA\|MX]` | DNS | serwer DNS, pamięć podręczna, zapytanie |
| `http <host> [ścieżka] [-6]` / `https <host> [ścieżka] [-6]` | WWW | pobranie strony |
| `ftp <host> get <plik> user <login> pass <hasło>` / `ftp <host> list user … pass …` | FTP | pobranie pliku / lista |
| `mail account <adres> pass <hasło>` / `mail send <adres> <temat…>` / `mail check` | Poczta | konto, wysyłka SMTP, odbiór POP3 |
| `ntp sync <host>` | NTP | synchronizacja zegara |
| `print <adres> [doc <nazwa>]` | Drukowanie | zadanie IPP |

## Usługi – serwer

| Polecenie | Opis |
|---|---|
| `service list` / `service <dhcp\|dns\|http\|https\|ftp\|mail\|ntp> on\|off` | włączanie usług |
| `dns-record add <nazwa> A\|AAAA\|MX <wartość>` / `dns-record del <nazwa> [typ]` | strefa DNS |
| `web set <ścieżka> <treść…>` / `web del <ścieżka>` | strony WWW |
| `ftp-file add <nazwa> <treść…>` / `ftp-file del <nazwa>` | pliki FTP |
| `user add <login> <hasło>` / `user del <login>` | konta (FTP i skrzynki pocztowe) |
| `set certificate <nazwa>` / `set mail-domain <domena>` | certyfikat TLS, domena poczty |

## Przełącznik (pakiet VLAN)

| Polecenie | Opis |
|---|---|
| `vlan add <id> [name <nazwa>]` / `vlan del <id>` | VLAN-y (IEEE 802.1Q) |
| `interface <port> vlan <id>` | port dostępowy w VLAN-ie |
| `mac flush` | czyszczenie tablicy MAC |

## Przejście IPv4 ↔ IPv6 (pakiet IPv4 ↔ IPv6)

| Polecenie | Urządzenie | Opis |
|---|---|---|
| `tunnel add <nazwa> mode 6in4 local <ipv4> remote <ipv4>` | router | tunel IPv6 w IPv4 – protokół 41 (RFC 4213) |
| `tunnel add <nazwa> mode 4in6 local <ipv6> remote <ipv6>` | router | tunel IPv4 w IPv6 – Next Header 4 (RFC 2473) |
| `tunnel del <nazwa>` | router | usunięcie tunelu |
| `nat64 enable [prefix 64:ff9b::/96] pool <ipv4>` | router | NAT64 (RFC 6146); pula to własny adres IPv4 routera |
| `nat64 disable` / `nat64 flush` | router | wyłączenie / wyczyszczenie tablicy translacji |
| `dns64 enable [prefix <prefiks>/96]` / `dns64 disable` | serwer | syntetyczne rekordy AAAA z rekordów A (RFC 6147) |
| `show tunnels` / `show nat64` | router | tunele, tablica translacji |

Tunel to zwykły interfejs: po utworzeniu nadaj mu adres (`ip add 2001:db8:ff::1/64 dev tun0`) i dodaj trasę przez adres drugiego końca.

## Bezpieczeństwo (pakiet Bezpieczeństwo)

| Polecenie | Urządzenie | Opis |
|---|---|---|
| `security dhcp-guard on\|off` | przełącznik | odpowiedzi DHCP tylko z portów zaufanych, tablica powiązań IP ↔ MAC ↔ port (RFC 7513) |
| `security savi on\|off` | przełącznik | weryfikacja adresu źródłowego ARP i IPv4 według powiązań (RFC 7039) |
| `security ra-guard on\|off` | przełącznik | ogłoszenia routera IPv6 tylko z portów zaufanych (RFC 6105) |
| `security port <p> trusted\|untrusted` | przełącznik | port zaufany (np. do routera lub serwera DHCP) |
| `security port <p> max-mac <n>\|off [action drop\|shutdown]` | przełącznik | limit adresów MAC na porcie |
| `security port <p> dot1x on\|off` | przełącznik | uwierzytelnianie IEEE 802.1X na porcie |
| `security port <p> reset` | przełącznik | ponowne włączenie portu wyłączonego przez naruszenie |
| `security binding add <mac> <ip> port <p>` / `security binding del <ip>` | przełącznik | statyczne powiązanie dla hosta z ręcznym adresem |
| `security user add <login> <hasło>` / `security user del <login>` | przełącznik | konta 802.1X |
| `dot1x login user <login> pass <hasło>` / `dot1x logoff` | komputer, serwer, drukarka | logowanie EAPOL / EAP-MD5 (RFC 3748) |
| `show security` | przełącznik | stan ochrony, portów i tablica powiązań |

## Przykład: router dual stack

```text
R1> interface eth0 up
R1> ip add 192.168.1.1/24 dev eth0
R1> ip add 2001:db8:1::1/64 dev eth0
R1> interface eth1 up
R1> ip add 10.0.0.1/30 dev eth1
R1> ip add 2001:db8:ff::1/64 dev eth1
R1> route add 192.168.2.0/24 via 10.0.0.2
R1> route add 2001:db8:2::/64 via 2001:db8:ff::2
R1> dhcp-relay set dev eth0 server 10.0.10.10
R1> show routes
```
