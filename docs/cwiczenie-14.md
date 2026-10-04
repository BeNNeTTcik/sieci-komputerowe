---
sidebar_position: 14
title: "Ćwiczenie 14: Tworzenie sieci w Cisco Packet Tracer"
---

<!--- import bibliotek -->

import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import CodeBlock from '@site/src/components/CodeBlock';
import CodeBlank from '@site/src/components/CodeBlank';
import SharedValue from '@site/src/components/SharedValue';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import QuizTroubleshooting from '@site/src/components/QuizTroubleshooting';
import Question from '@site/src/components/Question';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 14: Tworzenie sieci w Cisco Packet Tracer

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 14: Tworzenie sieci w Cisco Packet Tracer"
  storageKey="cwiczenie-14"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp ćwiczenia"
  fileNamePrefix="cwiczenie14"
  storageKeys={['cwiczenie-14', 'pt-intro-segment', 'pt-checklist-topologia', 'pt-ping-testy-1', 'pt-wybor-routingu', 'pt-ping-testy-2', 'pt-quiz-troubleshooting', 'pt-troubleshoot-modul', 'pt-troubleshoot-rip-sasiad', 'pt-troubleshoot-passive', 'pt-troubleshoot-arp']}
  sharedPrefix="cw14_"
/>

## I. Wprowadzenie

<div className="justify">
Do tej pory pracowałeś/aś na fizycznych urządzeniach w pracowni. W tym ćwiczeniu zbudujesz **od zera, w Cisco Packet Tracer**, dokładnie tę samą strukturę `K1 – R1 – R2 – K2`, którą znasz z poprzednich zajęć. Tym razem samodzielnie dobierzesz dobierzesz sposób routingu (statyczny, RIP albo OSPF) [^packet].

**Cisco Packet Tracer** jest środowiskiem służącym do projektowania, konfiguracji, symulowania oraz testowania sieci komputerowych. Narzędzie zostało opracowane przez firmę Cisco i jest wykorzystywane przede wszystkim w procesie nauki podstaw sieci komputerowych oraz obsługi urządzeń sieciowych. Jego istotną zaletą jest możliwość tworzenia wirtualnych sieci bez konieczności posiadania fizycznego sprzętu, takiego jak routery, przełączniki, komputery czy punkty dostępowe [^packet].
</div>

### Krótki opis budowy aplikacji

<StepByStep>
<Step title="Interfejs Packet Tracer">
Interfejs programu Cisco Packet Tracer (Rysunek 1).  

![Rys1](/img/14/interfejs.png)
<div className="text-center">
Rys.1 Interfejs porgramu Cisco Packet Tracer [^packet]
</div>
</Step>

<Step title="Interfejs Packet Tracer - II">
**Pasek menu i główny pasek narzędzi** na górze apliakcji obsługujący standardowe opcje (File, Edit, Options, View...) oraz szybki dostęp do najczęstszych akcji (nowy plik, zapis, cofnij, zoom) (Rysunek 2) [^packet].
<div className="text-center">
![Rys2](/img/14/int1.png)

Rys.2 Pasek menu [^packet]
</div>
</Step>

<Step title="Interfejs Packet Tracer - III">
**Obszar roboczy (workspace)** środkowa część programu, w tym miejsciu umieszcza się urządzenia i buduje się topologię (Rysunek 3) [^packet].

![Rys3](/img/14/int2.png)
<div className="text-center">
Rys.3 Obszar roboczy [^packet]
</div>
</Step>

<Step title="Interfejs Packet Tracer - IV">
**Panel kategorii urządzeń** znajduje się na dole okna po lewej stronie (Rysunek 4) [^packet].
<div className="text-center">
![Rys4](/img/14/int3.png)

Rys.4 Panel kategori [^packet]
</div>

**Ikony grup urządzeń** do wyboru: Routers, Switches, Hubs, Wireless Devices, Connections (kable), End Devices (komputery, serwery), WAN Emulation, Custom Made Devices (Rysunek 5) [^packet]. Po wybraniu katrgori w miejscu z prawej strony pojawiaja sie konkretne modele (np. dla Routers: 1941, 2911, 4321). Z tego miejsca przeciąga się konkretne urządzenie na obszar roboczy.
<div className="text-center">
![Rys5](/img/14/int4.png)

Rys.5 Ikony grup urządzeń [^packet]
</div>
</Step>

<Step title="Interfejs Packet Tracer - V">
**Przełącznik Realtime / Simulation** granatowy pasek na dole z prawej strony. Tryb *Realtime* (domyślny, sieć działa "na żywo") vs. tryb *Simulation* (krok po kroku widzisz wędrówkę pojedynczych pakietów — przydatne przy diagnozowaniu problemów) (Rysunek 6) [^packet].

![Rys6](/img/14/int5.png)
<div className="text-center">
Rys.6 Przełącznik Realtime i Simulation [^packet]
</div>
</Step>

<Step title="Interfejs Packet Tracer - VI">
**Add Simple/Complex PDU** dolny prawy róg. Służy do wysyłania pojedynczych pakietów testowych między dwoma urządzeniami. Szybka alternatywa dla `ping` z wiersza poleceń, dobrze widoczna w trybie Simulation (Rysunek 7) [^packet].

![Rys7](/img/14/int6.png)
<div className="text-center">
Rys.7 Tworzenie pakietów PDU [^packet]
</div>
</Step>

<Step title="Interfejs urządzenia - I">
Po kliknięciu na dowolne urządzenie na obszarze roboczym otwiera się jego okno konfiguracji, z zakładkami u góry:

**Physical** - widok fizyczny urządzenia; tutaj dodaje/wymienia się moduły sieciowe (karty rozszerzeń) metodą przeciągnij-i-upuść, **pamiętając o wyłączeniu zasilania urządzenia** (przełącznik przy obudowie) przed zmianą modułu(Rysunek 8) [^packet].

![Rys8](/img/14/device.png)
<div className="text-center">
Rys.8 Interfejs urządzenia "Physical" [^packet]
</div>
</Step>

<Step title="Interfejs urządzenia - II">
**Config** - uproszczone, formularzowe ustawienia (hostname, interfejsy, routing) - szybkie, ale bez pełnej kontroli; w tym ćwiczeniu z niej nie korzystamy (Rysunek 9) [^packet].

![Rys9](/img/14/int7.png)
<div className="text-center">
Rys.9 Interfejs urządzenia "Config" [^packet]
</div>
</Step>

<Step title="Interfejs urządzenia - III">
**CLI** - pełny wiersz poleceń Cisco IOS, identyczny jak na fizycznym sprzęcie w pracowni - główne miejsce pracy. (Rysunek 10) [^packet].

![Rys10](/img/14/int8.png)
<div className="text-center">
Rys.10 Interfejs urządzenia "CLI" [^packet]
</div>
</Step>

<Step title="Interfejs urządzenia - IV">
**Desktop** (tylko komputery/serwery) - pulpit stacji roboczej: tu m.in. ustawia się adresację IP przez "IP Configuration" oraz przeprowadza się testy połączeń przez narzędzie **Command Prompt** do wykonania *ping* (Rysunek 11) [^packet].

![Rys11](/img/14/int9.png)
<div className="text-center">
Rys.11 Interfejs urządzenia "Desktop" [^packet]
</div>
</Step>
</StepByStep>

## II. Zadania do wykonania

W tym ćwiczeniu adresacja jest **z góry ustalona** - poniższe wartości wpisz dosłownie tak, jak są, zgodnie z numerem swojej grupy (X):

<TopologyBuilder
  title="Segment do zbudowania w Packet Tracer"
  storageKey="pt-intro-segment"
  topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🖥️', label: 'K1' }, fields: [
        { key: 'k1_ip', label: 'adres IP', placeholder: (x) => `192.168.${x}.10/24`, type: 'cidr', expectedPrefix: 24, shared: 'pt_k1_ip' },
      ]},
      { node: { icon: '🌐', label: 'R1' }, fields: [
        { key: 'r1_k1', label: 'do K1 - Gi0/0/0', placeholder: (x) => `192.168.${x}.1/24`, type: 'cidr', expectedPrefix: 24,
          deriveShared: { ip: 'pt_k1-r1_ip', mask: 'pt_k1-r1_mask', network: 'pt_k1-r1_net', wildcard: 'pt_k1-r1_wild' } },
        { key: 'r1_r2', label: 'do R2 - Gi0/0/1', placeholder: (x) => `172.20.${x}.1/30`, type: 'cidr', expectedPrefix: 30,
          deriveShared: { ip: 'pt_r1-r2_ip', mask: 'pt_r1-r2_mask', network: 'pt_r1-r2_net', wildcard: 'pt_r1-r2_wild' } },
      ]},
      { node: { icon: '🌐', label: 'R2' }, fields: [
        { key: 'r2_r1', label: 'do R1 - Gi0/0/1', placeholder: (x) => `172.20.${x}.2/30`, type: 'cidr', expectedPrefix: 30,
          deriveShared: { ip: 'pt_r2-r1_ip', mask: 'pt_r2-r1_mask', network: 'pt_r2-r1_net', wildcard: 'pt_r2-r1_wild' } },
        { key: 'r2_k2', label: 'do K2 - Gi0/0/0', placeholder: (x) => `192.168.${Number(x) + 50}.1/24`, type: 'cidr', expectedPrefix: 24,
          deriveShared: { ip: 'pt_k2-r2_ip', mask: 'pt_k2-r2_mask', network: 'pt_k2-r2_net', wildcard: 'pt_k2-r2_wild' } },
      ]},
      { node: { icon: '🖥️', label: 'K2' }, fields: [
        { key: 'k2_ip', label: 'adres IP', placeholder: (x) => `192.168.${Number(x) + 50}.10/24`, type: 'cidr', expectedPrefix: 24, shared: 'pt_k2_ip' },
      ]},
    ],
  }}
/>

### Budowa pierwszej sieci w programie Cisco Packet Tracer

<StepByStep>
<Step title="Budowa topologii fizycznej w Packet Tracer">
Dodaj do obszaru roboczego: **2 routery** (np. model 2911/4321 - dowolny z portem Copper GigabitEthernet) oraz **2 komputery**. Połącz je kablami zgodnie ze schematem `K1 – R1 – R2 – K2`, korzystając z automatycznego doboru kabla lub kabla "Copper Cross-Over".

<Checklist
title="Sprawdź przed konfiguracją"
storageKey="pt-checklist-topologia"
sections={[{
items: [
'Wszystkie 4 urządzenia widoczne na obszarze roboczym',
'Trzy połączenia kablowe: K1–R1, R1–R2, R2–K2',
],
}]}
/>
</Step>

<Step title="Konfiguracja adresacji interfejsów">
Skonfiguruj `R1` i `R2` z zakładki CLI, zgodnie z adresacją z tabeli wyżej:

<CodeBlock lines={[
'Router(config)# hostname R1-X',
<>R1-X(config)# interface GigabitEthernet0/0/0</>,
<>R1-X(config-if)# ip address <SharedValue shared="pt_k1-r1_ip" fallback="adres R1 (do K1)" /> <SharedValue shared="pt_k1-r1_mask" fallback="maska" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
<>R1-X(config)# interface GigabitEthernet0/0/1</>,
<>R1-X(config-if)# ip address <SharedValue shared="pt_r1-r2_ip" fallback="adres R1 (do R2)" /> <SharedValue shared="pt_r1-r2_mask" fallback="maska" /></>,
'R1-X(config-if)# no shutdown',
'R1-X(config-if)# exit',
]} />

Analogicznie R2 (interfejsy `Gi0/0/1` do R1, `Gi0/0/0` do K2), a następnie adresacja i brama domyślna na K1 i K2 (brama = adres najbliższego interfejsu routera).
</Step>

<Step title="Test przed uruchomieniem routingu">
<EditableTable
title="Test łączności — przed routingiem"
storageKey="pt-ping-testy-1"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik', label: 'Wynik' },
]}
initialRows={[
{ polecenie: <>Z K1: ping <SharedValue shared="pt_k1-r1_ip" fallback="adres R1 (do K1)" /></>, wynik: '' },
{ polecenie: <>Z K1: ping <SharedValue shared="pt_k2_ip" fallback="adres K2" /></>, wynik: '' },
{ polecenie: <>Z R1: ping <SharedValue shared="pt_r2-r1_ip" fallback="adres R2 (do R1)" /></>, wynik: '' },
]}
/>
</Step>

<Step title="Uruchomienie routingu — wg własnego wyboru">
Skonfiguruj na `R1` i `R2` **dowolny znany Ci sposób routingu**, tak aby `K1` i `K2` widziały się nawzajem: routing statyczny (`ip route`), RIP albo OSPF — wybór należy do Ciebie. Zanotuj, który wybrałeś/aś i dlaczego.

<EditableTable
title="Wybór i konfiguracja"
storageKey="pt-wybor-routingu"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'pytanie', label: 'Pytanie', readOnly: true },
{ key: 'odpowiedz', label: 'Twoja odpowiedź' },
]}
initialRows={[
{ pytanie: 'Wybrany sposób routingu (statyczny / RIP / OSPF)', odpowiedz: '' },
{ pytanie: 'Krótkie uzasadnienie wyboru', odpowiedz: '' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: konfiguracja routingu na R1 (show run)" />
</Step>

<Step title="Test końcowy i zapis pliku">
Powtórz pełny test łączności — tym razem wszystko powinno działać:

<EditableTable
title="Test łączności — po uruchomieniu routingu"
storageKey="pt-ping-testy-2"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik', label: 'Wynik' },
]}
initialRows={[
{ polecenie: <>Z K1: ping <SharedValue shared="pt_k2_ip" fallback="adres K2" /></>, wynik: '' },
{ polecenie: <>Z K2: ping <SharedValue shared="pt_k1_ip" fallback="adres K1" /></>, wynik: '' },
]}
/>

Zapisz plik `.pkt` (Ctrl+S) — będzie potrzebny jako załącznik do sprawozdania.
</Step>
</StepByStep>

## Quiz z troubleshootingu

<QuizTroubleshooting title="Troubleshooting — sieci i konfiguracja" randomCount={8} storageKey="pt-quiz-troubleshooting">
<Question
  text="Interfejs Gi0/0/0 na R1 ma poprawnie wpisany adres IP, ale w show ip interface brief widać status jak niżej. Jakie polecenie przywróci go do pracy?"
  options={["shutdown", "no shutdown", "ip address dhcp", "clock rate 64000"]}
  correct={1}
>
<CodeBlock lines={[
'R1#show ip interface brief',
'Interface              IP-Address      OK? Method Status                Protocol',
'GigabitEthernet0/0/0   192.168.1.1     YES manual administratively down down',
'GigabitEthernet0/0/1   172.20.1.1      YES manual up                    up',
]} />
</Question>

<Question
  text="Ping z K1 do R1 działa. Ping z R1 do R2 działa. Ping z K1 do K2 nie działa (schemat niżej). Który problem jest NAJBARDZIEJ prawdopodobny?"
  options={[
    "Brak wpisu routingu obejmującego sieć po drugiej stronie (np. brak network / ip route)",
    "Zły adres MAC na przełączniku między K1 a R1",
    "Kabel między R1 a R2 jest fizycznie uszkodzony",
    "K1 ma źle wpisaną maskę podsieci na własnym interfejsie",
  ]}
  correct={0}
>
<CodeBlock lines={[
'K1 ---- R1 ---- R2 ---- K2',
'   ping OK   ping OK    ping BRAK',
]} />
</Question>

<Question
  text="R1 i R2 są połączone bezpośrednio tym samym kablem. Poniżej ich konfiguracja tego łącza. Co jest nie tak?"
  options={[
    "Nic — konfiguracja jest poprawna",
    "R1 i R2 mają różne maski podsieci na tym samym łączu punkt-punkt",
    "Adresy IP są zduplikowane",
    "Brakuje polecenia no shutdown",
  ]}
  correct={1}
>
<CodeBlock lines={[
'R1(config-if)# ip address 172.20.1.1 255.255.255.252',
'R2(config-if)# ip address 172.20.1.2 255.255.255.0',
]} />
</Question>

<Question
  text="Interfejs R1 ma adres 192.168.12.1/24, ale mimo wpisanej poniżej konfiguracji RIP wciąż nie ogłasza tej sieci. Dlaczego?"
  options={[
    "Polecenie network musi zawierać maskę",
    "Wpisana sieć (192.168.1.0) nie zgadza się z faktyczną siecią tego interfejsu (192.168.12.0)",
    "RIP w wersji 2 nie obsługuje adresacji 192.168.x.x",
    "Brakuje polecenia no shutdown na routerze",
  ]}
  correct={1}
>
<CodeBlock lines={[
'R1(config)# router rip',
'R1(config-router)# version 2',
'R1(config-router)# network 192.168.1.0',
]} />
</Question>

<Question
  text="Sąsiedztwo RIP między R1 a R2 się nie nawiązuje, mimo że interfejsy są up/up i w tej samej sieci. Co widać w poniższej konfiguracji obu routerów?"
  options={[
    "R2 nie ma wymuszonej wersji 2 (RIPv1 działa inaczej niż v2 — rozsyła broadcast zamiast multicast)",
    "Różne adresy IP po obu stronach — to błąd",
    "Brakuje polecenia no auto-summary na R1",
    "Zła kolejność poleceń router rip i network",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R1(config)# router rip',
'R1(config-router)# version 2',
'R1(config-router)# network 172.20.1.0',
'!',
'R2(config)# router rip',
'R2(config-router)# network 172.20.1.0',
]} />
</Question>

<Question
  text="R1 i R2 mają połączenie fizyczne, prawidłową adresację, a mimo to sąsiedztwo OSPF w ogóle się nie nawiązuje. Co jest przyczyną w poniższej konfiguracji?"
  options={[
    "Różne numery area w poleceniu network (0 vs 1) — obie strony łącza muszą być w tym samym obszarze",
    "Różne router-id (loopback) — to normalne i nie przeszkadza",
    "Różne process-id OSPF (1 vs 2) — to lokalny numer procesu, nie musi się zgadzać",
    "Różne hostname routerów",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R1(config)# router ospf 1',
'R1(config-router)# network 10.0.0.0 0.0.0.3 area 0',
'!',
'R2(config)# router ospf 2',
'R2(config-router)# network 10.0.0.0 0.0.0.3 area 1',
]} />
</Question>

<Question
  text="Poniższa lista ACL ma zablokować WYŁĄCZNIE ruch z sieci 192.168.10.0/24 do 192.168.20.0/24, przepuszczając wszystko inne. Czy zadziała zgodnie z zamierzeniem?"
  options={[
    "Tak — druga linia (permit ip any any) przepuszcza cały pozostały ruch",
    "Nie — bez trzeciej linii z jawnym deny any na końcu ruch zostanie zablokowany całkowicie",
    "Nie — wildcard mask 0.0.0.255 jest zły dla sieci /24, powinien być 255.255.255.0",
    "Nie — ACL trzeba jeszcze podpiąć do interfejsu przez network, nie ip access-group",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R-CORE(config)# access-list 100 deny ip 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255',
'R-CORE(config)# access-list 100 permit ip any any',
'R-CORE(config)# interface GigabitEthernet0/0/1',
'R-CORE(config-if)# ip access-group 100 out',
]} />
</Question>

<Question
  text="Lista ACL zawiera TYLKO jedną linię — deny — bez żadnego permit. Jaki będzie efekt po podpięciu jej do interfejsu?"
  options={[
    "Zablokowany zostanie cały ruch — bez jawnego permit działa domyślne 'deny any' na końcu każdej ACL",
    "Przepuszczony zostanie cały ruch poza tym jednym wpisem",
    "Router zgłosi błąd konfiguracji i nie pozwoli zapisać takiej ACL",
    "ACL zostanie zignorowana, bo nie ma permit",
  ]}
  correct={0}
/>

<Question
  text="Komputery w VLAN 10 dostają przez DHCP poprawny adres IP i maskę, ale NIE dostają bramy domyślnej — muszą wpisywać ją ręcznie. Czego brakuje w konfiguracji puli DHCP?"
  options={[
    "Polecenia default-router",
    "Polecenia dns-server",
    "Polecenia lease",
    "Polecenia excluded-address",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R-CORE(config)# ip dhcp pool VLAN10',
'R-CORE(dhcp-config)# network 192.168.10.0 255.255.255.0',
'R-CORE(dhcp-config)# dns-server 8.8.8.8',
]} />
</Question>

<Question
  text="Port przełącznika łączący go z routerem obsługującym WSZYSTKIE VLAN-y (router-on-a-stick) jest skonfigurowany jak niżej. Dlaczego przez ten port łączność mają tylko urządzenia z VLAN 10, a z pozostałych VLAN-ów już nie?"
  options={[
    "Port jest w trybie access (tylko jeden VLAN) zamiast trunk (wszystkie VLAN-y)",
    "Numer VLAN 10 jest zbyt niski",
    "Brakuje polecenia no shutdown",
    "Switchport nie obsługuje więcej niż jednego VLAN-u na porcie",
  ]}
  correct={0}
>
<CodeBlock lines={[
'SW1(config)# interface GigabitEthernet0/1',
'SW1(config-if)# switchport mode access',
'SW1(config-if)# switchport access vlan 10',
]} />
</Question>

<Question
  text="Dwa różne urządzenia w tej samej sieci mają PRZYPADKOWO ten sam adres IP (literówka przy ręcznej konfiguracji). Jaki objaw jest dla tego NAJBARDZIEJ typowy?"
  options={[
    "Przerywana, niestabilna łączność — czasem ping przechodzi, czasem nie, w zależności które urządzenie odpowie",
    "Oba urządzenia natychmiast się wyłączają",
    "Router automatycznie przydzieli jednemu z nich inny adres",
    "Wynik będzie identyczny jak przy złej masce podsieci",
  ]}
  correct={0}
/>

<Question
  text="Trasa domyślna na R-CORE wskazuje na adres 192.168.1.1, ale interfejs do ISP ma adres 100.64.5.2/30, a brama ISP to 100.64.5.1. Jaki będzie skutek?"
  options={[
    "Trasa jest nieużywalna (next-hop nieosiągalny) — żaden ruch nie znajdzie drogi na zewnątrz",
    "Router automatycznie poprawi next-hop na 100.64.5.1",
    "Zadziała tylko dla ruchu ICMP (ping)",
    "Zadziała, bo next-hop w trasie statycznej nie musi być bezpośrednio osiągalny",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R-CORE(config)# ip route 0.0.0.0 0.0.0.0 192.168.1.1',
'R-CORE(config)# interface GigabitEthernet0/0/1',
'R-CORE(config-if)# ip address 100.64.5.2 255.255.255.252',
]} />
</Question>

<Question
  text="Tunel IPsec między R1 a R2 nie przechodzi fazy 1 (ISAKMP). Co widać w poniższej konfiguracji obu stron?"
  options={[
    "Różne pre-shared keys (CiscoVPN123 vs CiscoVPN321) — muszą być IDENTYCZNE po obu stronach",
    "Różne adresy IP w poleceniu — to prawidłowe, bo każda strona wskazuje adres PRZECIWNEJ strony",
    "Brakuje polecenia no shutdown na crypto map",
    "Zła kolejność poleceń crypto isakmp",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R1(config)# crypto isakmp key CiscoVPN123 address 203.0.113.2',
'R2(config)# crypto isakmp key CiscoVPN321 address 203.0.113.1',
]} />
</Question>

<Question
  text="Czy interfejs Loopback wymaga polecenia no shutdown, tak jak fizyczny interfejs GigabitEthernet, żeby zacząć działać?"
  options={[
    "Nie — interfejsy Loopback są aktywne domyślnie od razu po utworzeniu",
    "Tak, zawsze, bez wyjątków",
    "Tylko wtedy, gdy Loopback jest używany jako Router ID w OSPF",
    "Tak, ale tylko w RIP, nie w OSPF",
  ]}
  correct={0}
/>

<Question
  text="Access-listę 100 (blokującą ruch między dwiema podsieciami) skonfigurowano poprawnie, ale ruch mimo to nie jest blokowany. Interfejs skonfigurowano jak niżej. Co może być nie tak?"
  options={[
    "ACL podpięto kierunkiem out zamiast in (albo odwrotnie) — dla tego scenariusza trzeba sprawdzić, z której strony faktycznie nadchodzi ruch",
    "Numer listy 100 jest za wysoki dla standardowej ACL",
    "Brakuje słowa kluczowego ip w poleceniu ip access-group",
    "ACL trzeba podpiąć na KAŻDYM routerze na trasie pakietu, nie tylko na jednym",
  ]}
  correct={0}
>
<CodeBlock lines={[
'R-CORE(config)# interface GigabitEthernet0/0/2',
'R-CORE(config-if)# ip access-group 100 in',
]} />
</Question>

<Question
  text="Router ma poprawnie skonfigurowany routing statyczny do sieci zdalnej, ale w show ip route ta trasa się NIE pojawia. Interfejs wyjściowy z polecenia ip route jest widoczny jako 'down/down' w show ip interface brief. Co zrobisz w pierwszej kolejności?"
  options={[
    "Sprawdzę fizyczne podłączenie kabla i status interfejsu (no shutdown, poprawny adres) — trasa przez martwy interfejs nigdy nie trafi do tablicy routingu",
    "Zmienię protokół routingu na dynamiczny",
    "Zwiększę wartość administrative distance trasy statycznej",
    "Dodam tę samą trasę jeszcze raz — być może pierwszy wpis się nie zapisał",
  ]}
  correct={0}
/>

<Question
  text="Dwóch sąsiadów w pierścieniu RIP uzgodniło wspólną sieć łącza, ale każdy z nich niezależnie wpisał SWOJĄ wersję tej sieci we własnym interfejsie — z drobną literówką (jeden wpisał /24, drugi /23). Jaki będzie efekt?"
  options={[
    "Adresy nie będą leżeć w tej samej, wspólnej podsieci — łączność (i sąsiedztwo RIP) się nie nawiąże, mimo że oba wyglądają 'prawie tak samo'",
    "RIP automatycznie ujednolici maskę między sąsiadami",
    "Zadziała, bo RIP jest protokołem klasowym i maska nie ma znaczenia dla łączności na łączu",
    "Będzie działać, dopóki obaj używają tego samego trzeciego oktetu",
  ]}
  correct={0}
/>

</QuizTroubleshooting>

Kilka pytań otwartych — tu liczy się konkretne słowo/polecenie w odpowiedzi, nie cała rozprawka:

<KeywordAnswer
title="Troubleshooting — brakujący element"
question="Port na routerze w Packet Tracer świeci się na czerwono, mimo że adres IP jest wpisany poprawnie i wykonano no shutdown. Po otwarciu urządzenia w zakładce Physical okazuje się, że gniazdo na ten typ portu jest puste. Jakiego JEDNEGO słowa użyjesz, szukając rozwiązania (czego brakuje fizycznie)?"
keywords={["moduł", "modul", "module", "karta"]}
explanation="W Packet Tracer routery bazowe (np. 1941, 2911) często nie mają fabrycznie zamontowanych wszystkich portów — trzeba dodać odpowiedni moduł sieciowy (np. NM-1FGE) w zakładce Physical, PRZY WYŁĄCZONYM zasilaniu urządzenia."
storageKey="pt-troubleshoot-modul"
/>

<KeywordAnswer
title="Troubleshooting — weryfikacja sąsiedztwa RIP"
question="Jakim poleceniem sprawdzisz na routerze, czy RIP faktycznie widzi sąsiada na danym interfejsie (odpowiednik show ip ospf neighbor, ale dla RIP)?"
keywords={["show ip protocols"]}
explanation="show ip protocols pokazuje m.in. sekcję „Routing Information Sources” — to tam widać adresy sąsiadów, od których router faktycznie odbiera aktualizacje RIP."
storageKey="pt-troubleshoot-rip-sasiad"
/>

<KeywordAnswer
title="Troubleshooting — RIP na łączu do ISP"
question="Chcesz, żeby interfejs WAN routera brał udział w klasowej sieci obsługiwanej przez RIP (żeby jego adres był w tablicy routingu), ale NIE chcesz, żeby przez ten interfejs wychodziły na zewnątrz aktualizacje RIP (np. łącze do dostawcy internetu). Jakiego polecenia użyjesz?"
keywords={["passive-interface", "passive interface"]}
explanation="passive-interface <nazwa interfejsu> pozwala zachować interfejs w obrębie sieci ogłaszanej przez network, jednocześnie blokując wysyłanie (ale nie odbieranie) aktualizacji RIP na tym konkretnym porcie."
storageKey="pt-troubleshoot-passive"
/>

<KeywordAnswer
title="Troubleshooting — weryfikacja ARP"
question="Jakim poleceniem na routerze sprawdzisz, czy adres IP sąsiada został poprawnie zmapowany na jego adres MAC (czyli że warstwa 2 działa poprawnie)?"
keywords={["show arp"]}
explanation="show arp pokazuje tablicę ARP routera — mapowanie adresów IP na adresy MAC w sieciach bezpośrednio podłączonych. Brak wpisu dla sąsiada to sygnał problemu na warstwie 2 (kabel, VLAN, duplex), nie na warstwie 3."
storageKey="pt-troubleshoot-arp"
/>

[^packet]: Cisco [Packet Tracer](https://www.netacad.com/learning-collections/cisco-packet-tracer?courseLang=en-US) (dostęp: 27.09.2026)