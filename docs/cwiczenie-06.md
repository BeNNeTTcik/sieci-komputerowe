---
sidebar_position: 6
title: "Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary"
---

<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import TopologyBuilder from '@site/src/components/TopologyBuilder';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import PrivateAddressTable from '@site/src/components/PrivateAddressTable';
import SharedValue from '@site/src/components/SharedValue';
import CodeLine from '@site/src/components/CodeLine';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary"
  storageKey="cwiczenie-6"
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-6"
  storageKeys={['cwiczenie-6','cwiczenie-6-top', 'cwiczenie-6-zad1', 'cwiczenie-6-auto-mdix']}
  sharedPrefix="cw6_"
/>

## I. Wprowadzenie
<div className="justify">
**PuTTY** to darmowy klient terminalowy dla Windows, który obsługuje kilka różnych "sposobów połączenia", wybieranych w polu Connection type:
- **Serial** - połączenie lokalne, fizycznym kablem (kablem konsolowym do portu CONSOLE routera/przełącznika). Jedyna opcja, gdy urządzenie nie ma jeszcze skonfigurowanego adresu IP.
- **Telnet** - połączenie sieciowe, ale bez szyfrowania (hasła i cała sesja jawnym tekstem).
- **SSH** - połączenie sieciowe, szyfrowane.

W kolejnych ćwiczeniach jest to głowne narzędzie pracy z urządzeniami.
</div>

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

## II. Zadania do wykonania

### Połączenie PC - PC i konfiguracja adresacji

<StepByStep>
<Step title="Połączenie PC-PC">
Połącz dwa komputery bezpośrednio kablem prostym. **Wykorzystaj dolną kartę sieciową.**

<KeywordAnswer
  title="Pytanie"
  question="Dlaczego bezpośrednie połączenie dwóch komputerów zwykłym kablem prostym działa dziś bez problemu, mimo że kiedyś wymagałoby to wykorzystania kabla krosowego?"
  keywords="Auto-MDIX"
  explanation="Nowoczesne karty sieciowe obsługują funkcję Auto-MDIX, która automatycznie wykrywa, czy potrzebna jest konfiguracja dla kabla zwykłego lub krosowego. Karta sieciowa sama dostosowuje które piny odpowiadają za nadawanie, a które za odbiór danych. Dzięki temu rodzaj kabla (prosty czy krosowany) przestał mieć znaczenie w większości współczesnych połączeń."
  storageKey="cwiczenie-6-auto-mdix"
/>
</Step>

<Step title="Konfiguracja adresacji">
Adresacja IP nie jest z góry narzucona. Samemu trzeba określić adresację, która zostanie wykorzystana w ćwiczeniu (Tabela 1).

:::warning Uwaga!!!
Trzeci oktet adresu IP powinien być równy numerowi pary. Np. pierwsza para = 1.
:::

<PrivateAddressTable
  title="Tab. 1 Wprowadź adres IP i maskę, którą wykorzystasz w zadaniu"
  checkGroupOctet={true}
  storageKey="cwiczenie-6-zad1"
  columns={['device', 'ip', 'mask']}
  initialRows={[{device: 'PC-A', shared: { ip: 'pca_ip', mask: 'maska' }}, {device: 'PC-B', shared: { ip: 'pcb_ip', mask: 'maskb' }}]}
/>

</Step>

<Step title="Połączenie PC-PC i konfiguracja adresacji">
Ustaw statyczną adresację IP zgdnie z poniższym schematem:

<TopologyBuilder
  title="Topologia"
  storageKey="cwiczenie-6-top"
  topology={{
    vlan: { show: false },
    groups: [
      {
        node: { icon: '🖥️', label: 'PC-A' },
        fields: [
          { key: 'port1', label: 'port', placeholder: () => 'IP', type: 'address', shared: 'pca_ip' },
        ],
      },
      {
        node: { icon: '🖥️', label: 'PC-B' },
        fields: [
          { key: 'port2', label: 'port', placeholder: () => 'IP', type: 'address', shared: 'pcb_ip' },
        ],
      }
    ],
  }}
/>

W Windows wejdź w "Panel sterowania" → "Centrum sieci" → "Zmień ustawienia karty" → właściwości "IPv4":
- PC-A: <SharedValue shared="pca_ip" fallback="—" />, maska <SharedValue shared="maska" fallback="—" />
- PC-A: <SharedValue shared="pcb_ip" fallback="—" />, maska <SharedValue shared="maskb" fallback="—" />

Zweryfikuj łączność w Wierszu poleceń:

<CodeLine>ping <SharedValue fieldKey="pcb_ip" fallback="adres_IP" /></CodeLine>

<ScreenshotPaste label="Zrzut ekranu: polecania ping na adres drugiego komputera" />
</Step>

<Step title="Przywrócenie ustawień do stanu przed połączeniem">
Przywróć adresacje na karcie siecowej do stanu przed zmiany konfiguracji.

</Step>
</StepByStep>

### Wstępna konfiguracja urządzeń sieciowych Cisco

<div className="justify">
Urządzenie prosto "z pudełka" (albo po `erase startup-config` + `reload`) **nie ma żadnego adresu IP** i nie uczestniczy jeszcze w żadnym routingu. Dlatego pierwsze połączenie zawsze odbywa się **kablem konsolowym**, nie przez sieć. Telnet/SSH stają się możliwe dopiero, gdy urządzenie ma już skonfigurowany adres zarządzania (patrz kroki niżej).
</div>

<StepByStep>
<Step title="Połączenie kablem konsolowym i PuTTY">
Podłącz **kabel konsolowy** (typu rollover, RJ-45 na jednym końcu do portu `CONSOLE` routera/przełącznika, na drugim — RJ-45-na-USB albo RJ-45-na-DB9, w zależności od laptopa) między komputerem a urządzeniem Cisco.

1. Sprawdź w **Menedżerze urządzeń** (Windows: Start → wpisz "Menedżer urządzeń" → rozwiń "Porty (COM i LPT)") numer przydzielonego portu, np. `COM1`.
2. Uruchom **PuTTY** i skonfiguruj połączenie (Rysunek 1):

<div className="text-center">
![Rys1](/img/6/putty.png)

Rys.1 Konfiguracja połączenia szeregowego [^putty]
</div>

3. Kliknij **Open** — powinieneś zobaczyć znak zachęty urządzenia (np. `Switch` albo `Router` zakończone znakiem większości), bez logowania (fabrycznie brak hasła na konsoli).
</Step>

<Step title="Nazwa hosta i baner ostrzegawczy">
Pierwsze polecenia na dowolnym urządzeniu Cisco to nadanie mu unikalnej nazwy oraz banera wyświetlanego **przed** logowaniem:

```
Switch(config)# hostname SW-X
SW-X(config)# banner motd #
To urządzenie jest wlasnoscia laboratorium sieci komputerowych.
Dostep wylacznie dla autoryzowanych uzytkownikow.
Wszystkie polaczenia moga byc monitorowane i rejestrowane.
#
```

Ogranicznikiem tekstu banera jest dowolny znak niewystępujący w treści (tu: `#`) — wszystko między pierwszym a drugim wystąpieniem tego znaku staje się treścią banera.
</Step>

<Step title="Hasła dostępu i pozostałe mechanizmy bezpieczeństwa">
Poniższa Tabela 2 zbiera mechanizmy bezpieczeństwa konfigurowane w tym kroku — każdy chroni przed innym scenariuszem:

Tab.2 Mechanizmy bezpieczeństwa
| Mechanizm | Polecenie | Przed czym chroni |
|---|---|---|
| Hasło do trybu uprzywilejowanego | `enable secret ...` | dostęp do `enable` (trybu z pełną kontrolą urządzenia) |
| Hasło na konsoli | `line console 0` → `password` + `login` | dostęp fizyczny kablem konsolowym |
| Hasło na liniach zdalnych | `line vty 0 4` → `password` + `login` | zdalny dostęp przez telnet/SSH |
| Szyfrowanie haseł w konfiguracji | `service password-encryption` | odczytanie haseł "z ekranu" przy podglądaniu `show running-config` |
| Automatyczne wylogowanie | `exec-timeout minuty sekundy` | pozostawiona bez nadzoru, zalogowana sesja |
| Wyłączenie tłumaczenia literówek na DNS | `no ip domain-lookup` | wielosekundowe zawieszenie CLI przy błędnie wpisanym poleceniu |

:::warning `enable secret` a nie `enable password`
`enable secret` haszuje hasło silnym algorytmem (MD5, w nowszych IOS możliwy też mocniejszy) i zawsze wygrywa z `enable password`, jeśli oba są ustawione. `enable password` to starsze, dużo słabsze polecenie (hasło widoczne w formie odwracalnego szyfru "typu 7" nawet z `service password-encryption`) — w praktyce nie powinno się go już używać.
:::

Pełna konfiguracja na **SW-X**:

```
SW-X(config)# enable secret Cisco
SW-X(config)# service password-encryption
SW-X(config)# no ip domain-lookup

SW-X(config)# line console 0
SW-X(config-line)# password Cisco
SW-X(config-line)# login
SW-X(config-line)# exec-timeout 5 0
SW-X(config-line)# exit

SW-X(config)# line vty 0 4
SW-X(config-line)# password Cisco
SW-X(config-line)# login
SW-X(config-line)# exec-timeout 5 0
SW-X(config-line)# exit
```

<ScreenshotPaste label="Zrzut ekranu: show running-config (fragment z hasłami — zwróć uwagę na zaszyfrowaną postać)" />
</Step>

<Step title="Adresacja interfejsu zarządzania i brama domyślna">
Aby przełącznik był w ogóle osiągalny przez sieć (Telnet/SSH), potrzebuje adresu IP na wirtualnym interfejsie VLAN 1:

```
SW-X(config)# interface vlan 1
SW-X(config-if)# ip address 172.16.X.253 255.255.255.0
SW-X(config-if)# no shutdown
SW-X(config-if)# exit
SW-X(config)# ip default-gateway 172.16.X.254
```
</Step>

<Step title="Konfiguracja SSH (zamiast Telnet)">
Telnet przesyła **cały ruch, łącznie z hasłami, jawnym tekstem**. Każdy podsłuchujący ruch w sieci (np. Wireshark na porcie SPAN) widzi hasło administratora wprost. SSH szyfruje całą sesję. Włączenie SSH wymaga kilku dodatkowych kroków, bo urządzenie musi wygenerować własną parę kluczy:

```
SW-X(config)# crypto key generate rsa
How many bits in the modulus [512]: 1024

SW-X(config)# username adminX secret Cisco
SW-X(config)# ip ssh version 2

SW-X(config)# line vty 0 4
SW-X(config-line)# login local
SW-X(config-line)# transport input ssh
SW-X(config-line)# exit
```

`login local` przełącza uwierzytelnianie linii VTY z pojedynczego wspólnego hasła (`password` z poprzedniego kroku) na konta użytkowników z `username` — każdy student/administrator loguje się na własne konto. `transport input ssh` **wyłącza** Telnet na tych liniach, zostawiając wyłącznie SSH.
</Step>

<Step title="Połączenie zdalne przez PuTTY — Telnet vs SSH">
Po skonfigurowaniu adresu IP i SSH możesz połączyć się z przełącznikiem **zdalnie**, bez kabla konsolowego. W PuTTY tym razem wybierz (Rysunek 2):

<div className="text-center">
![Rys2](/img/6/putty_ssh.png)

Rys.2 Konfiguracja połączenia SSH [^putty]
</div>

Zaloguj się kontem utworzonym poleceniem `username` (nie hasłem z `line vty` — to zostało zastąpione przez `login local`).

Dla porównania możesz też spróbować **Connection type: Telnet**, port `23`. Powinno się to zakończyć niepowodzeniem, bo `transport input ssh` wyłączył Telnet na liniach VTY. To zamierzone: pokazuje, że deklaratywna konfiguracja (`transport input`) faktycznie wymusza wybrany protokół, a nie jest tylko sugestią.

<ScreenshotPaste label="Zrzut ekranu: udane logowanie SSH przez PuTTY" />

:::warning Standard i minimum zabezpieczenia
Powyższa konfiguracja powinna zostać uwzględniona w każdej przyszłej topologii.
:::

</Step>
</StepByStep>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^cisco]: Grafika wykonana w programie - [Cisco Packet Tracer](https://www.netacad.com/resources/lab-downloads?courseLang=en-US)

[^putty]: [PuTTY](https://the.earth.li/~sgtatham/putty/0.85/htmldoc/).