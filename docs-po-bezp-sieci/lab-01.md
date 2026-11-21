---
sidebar_position: 1
title: "Laboratorium 1: Audyt konfiguracji i hardening urządzeń sieciowych"
---

<!--- import bibliotek -->

import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import SharedValue from '@site/src/components/SharedValue';
import CodeBlock from '@site/src/components/CodeBlock';
import CodeBlank from '@site/src/components/CodeBlank';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Laboratorium 1: Audyt konfiguracji i hardening urządzeń sieciowych

<SprawozdanieHeader
  thema="Bezpieczeństwo sieci"
  exerciseTitle="Laboratorium 1: Audyt konfiguracji i hardening urządzeń sieciowych"
  storageKey="bezp-lab-1"
  solo
/>

<ProjectSaveLoad
  thema="Bezpieczeństwo sieci"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="bezp-lab-1"
  storageKeys={['bezp-lab-1','bezp1-audyt','bezp1-sw','bezp1-checklist','bezp1-vty','bezp1-wnioski']}
  sharedPrefix="bezp1_"
/>

## I. Wprowadzenie

<div className="justify">
**Hardening** (utwardzanie) to proces ograniczania **powierzchni ataku** urządzenia: wyłączania zbędnych usług, zamykania nieużywanych wejść i zastępowania domyślnych, słabych ustawień konfiguracją bezpieczną. Urządzenie prosto „z pudełka” jest wygodne w uruchomieniu, ale właśnie dlatego niebezpieczne — ma włączone usługi, których nikt nie potrzebuje, i ustawienia, które zna każdy. Zanim więc zacznie się badać ruch i wykrywać ataki (kolejne laboratoria), trzeba zadbać o to, żeby same urządzenia sieciowe nie były najsłabszym ogniwem [^nist-123].
</div>

<div className="justify">
W pracy z urządzeniem sieciowym rozdziela się trzy **płaszczyzny** [^cisco-harden]. **Płaszczyzna zarządzania** (*management plane*) to wszystko, czym konfiguruje się i monitoruje urządzenie: SSH, Telnet, SNMP, serwer WWW, konsola. **Płaszczyzna sterowania** (*control plane*) to protokoły, które same wymieniają informacje (routing, ARP, STP). **Płaszczyzna danych** (*data plane*) to ruch użytkowników przechodzący przez urządzenie. Hardening dotyczy przede wszystkim płaszczyzny zarządzania — to przez nią napastnik przejmuje kontrolę nad urządzeniem.
</div>

<div className="justify">
Audyt prowadzi się według **list kontrolnych** (*benchmarków*). Najbardziej znane to CIS Benchmarks dla sprzętu Cisco oraz wskazówki producenta i NIST [^cis][^nist-53]. Zasada jest zawsze ta sama: **najmniejszych uprawnień** (każdy ma dostęp tylko do tego, co konieczne) i **obrony w głąb** (*defense in depth*) — wiele niezależnych warstw zabezpieczeń, tak aby pojedynczy błąd nie otwierał całej sieci.
</div>

:::note Topologia
Pracujemy na zestawie pary: dwa routery **R1-X** i **R2-X** oraz przełącznik **SW-X**. Sieć LAN pary: `172.16.X.0/24`, łącze między routerami: `10.10.X.0/30`. **X** to numer pary. Zarządzanie urządzeniami odbywa się z wydzielonej podsieci administratora `172.16.X.240/28`.
:::

## II. Zadania do wykonania

### Zadanie 1. Audyt konfiguracji „jak zastano”

<div className="justify">
Administrator odszedł z pracy i zostawił router skonfigurowany „na szybko”. Twoim zadaniem jest wczytać tę konfigurację, przejrzeć ją i wypisać wszystkie słabości, zanim cokolwiek poprawisz.
</div>

<StepByStep>
<Step title="Wczytanie badanej konfiguracji">
Na czystym routerze **R1-X** wejdź w tryb konfiguracyjny (`enable`, `configure terminal`) i wprowadź poniższą konfigurację „zastaną”. To celowo słaba konfiguracja — nie jest wzorem, tylko materiałem do audytu.

<CodeBlock lines={[
'hostname Router',
'enable password cisco123',
'no service password-encryption',
'username admin password admin',
'ip http server',
'interface GigabitEthernet0/0/0',
' ip address 172.16.1.1 255.255.255.0',
' no shutdown',
' exit',
'line con 0',
' privilege level 15',
' no exec-timeout',
' exit',
'line vty 0 4',
' password lab',
' transport input telnet',
' login',
' exit',
]} />
</Step>

<Step title="Przegląd stanu urządzenia">
Obejrzyj konfigurację i stan urządzenia poleceniami diagnostycznymi:

<CodeBlock lines={[
'show running-config',
'show ip interface brief',
'show users',
'show ip ssh',
]} />

<KeywordAnswer
  title="Hasło, którego nie widać"
  question="Które hasło z konfiguracji jest przechowywane w postaci nieodwracalnego skrótu, a które da się odczytać lub łatwo odwrócić z zapisu konfiguracji?"
  keywords={['enable secret', 'secret']}
  explanation="Tylko „enable secret” jest zapisywane jako skrót (MD5/scrypt). „enable password”, hasła linii i „username … password” są jawne albo zakodowane słabym szyfrem Vigenère’a (typ 7), który odwraca się w kilka sekund. W tej konfiguracji nie ma w ogóle „enable secret”, a „service password-encryption” jest wyłączone, więc wszystkie hasła widać wprost."
  storageKey="bezp1-haslo"
/>
</Step>

<Step title="Raport z audytu">
Wypełnij Tabelę 1 — dla każdego znaleziska podaj ryzyko i zalecenie. Lista nie jest kompletna; dopisz własne znaleziska w kolejnych wierszach.

<EditableTable
  title="Tab. 1 Raport z audytu konfiguracji R1-X"
  storageKey="bezp1-audyt"
  columns={[
    {key: 'znalezisko', label: 'Znalezisko', readOnly: true},
    {key: 'ryzyko', label: 'Ryzyko (co grozi?)'},
    {key: 'zalecenie', label: 'Zalecenie (jak naprawić?)'},
  ]}
  initialRows={[
    {znalezisko: 'Dostęp przez Telnet (transport input telnet)'},
    {znalezisko: 'Brak enable secret, jest tylko enable password'},
    {znalezisko: 'Wyłączone service password-encryption'},
    {znalezisko: 'Domyślne / słabe konto admin z hasłem admin'},
    {znalezisko: 'Włączony serwer WWW (ip http server)'},
    {znalezisko: 'Konsola bez hasła i z privilege level 15'},
    {znalezisko: 'Brak exec-timeout na liniach dostępu'},
    {znalezisko: 'Brak banera ostrzegawczego (banner motd)'},
    {znalezisko: ''},
    {znalezisko: ''},
  ]}
  allowAddRows={true}
  allowRemoveRows={false}
/>

<details>
<summary>Klucz do Tabeli 1 (dla prowadzącego)</summary>

| Znalezisko | Ryzyko | Zalecenie |
|---|---|---|
| Telnet | hasło i cała sesja idą jawnie — podsłuch w LAN | `transport input ssh`, skonfiguruj SSH |
| Brak enable secret | hasło trybu uprzywilejowanego słabo chronione | `enable secret <silne>` |
| Brak service password-encryption | hasła jawne w konfiguracji i kopiach | `service password-encryption` (a najlepiej hasła typu secret) |
| Konto admin/admin | trywialne do odgadnięcia | silne hasło, `username … secret`, unikalne konta |
| ip http server | dodatkowa usługa zarządzania, często podatna | `no ip http server`, `no ip http secure-server` |
| Konsola priv 15 bez hasła | fizyczny dostęp = pełna kontrola bez logowania | hasło/konto na konsoli, `login local`, niższy priv |
| Brak exec-timeout | porzucona sesja zostaje otwarta | `exec-timeout 5 0` |
| Brak banera | brak informacji prawnej o autoryzacji dostępu | `banner motd` |
</details>
</Step>
</StepByStep>

### Zadanie 2. Hardening routera

<StepByStep>
<Step title="Tożsamość, hasła i baner">
Usuń słabe ustawienia i wprowadź bezpieczne. Nazwę hosta ustaw na **R1-X** (X = numer pary).

<CodeBlock lines={[
'hostname R1-X',
'no enable password',
'enable secret [SILNE_HASLO]',
'no username admin',
'username netadmin secret [SILNE_HASLO]',
'service password-encryption',
'no ip http server',
'no ip http secure-server',
'banner motd # Dostep tylko dla autoryzowanych administratorow. #',
]} />

:::warning Hasła tylko laboratoryjne
Hasła ustawiane w pracowni (np. `Lab-Bezp-2026!`) służą **wyłącznie do ćwiczeń**. W sieci produkcyjnej stosuje się unikalne, długie hasła z menedżera haseł.
:::
</Step>

<Step title="SSH zamiast Telnetu">
Skonfiguruj SSH i wyłącz Telnet. SSH wymaga nazwy domeny i pary kluczy RSA.

<CodeBlock lines={[
'ip domain-name bezp.lab',
'crypto key generate rsa general-keys modulus 2048',
'ip ssh version 2',
'line vty 0 4',
' transport input ssh',
' login local',
' exec-timeout 5 0',
' exit',
'line con 0',
' login local',
' exec-timeout 5 0',
' no privilege level 15',
' exit',
]} />

<KeywordAnswer
  title="Dlaczego 2048, a nie 512?"
  question="Dlaczego przy generowaniu klucza RSA dla SSH wybieramy moduł co najmniej 2048 bitów, a nie domyślne 512?"
  keywords={['512', 'slaby', 'słaby', 'zlamać', 'złamać', 'krótki', 'krotki', 'SSHv2']}
  explanation="Klucz 512-bitowy jest dziś łatwy do złamania obliczeniowo, a SSH wersji 2 i tak wymaga co najmniej 768 bitów. 2048 bitów to obecne minimum uznawane za bezpieczne dla RSA."
  storageKey="bezp1-rsa"
/>
</Step>

<Step title="Ochrona przed zgadywaniem haseł">
Włącz blokadę po serii nieudanych logowań i logowanie zdarzeń — przyda się w laboratorium o monitoringu.

<CodeBlock lines={[
'login block-for 120 attempts 4 within 60',
'login on-failure log',
'login on-success log',
]} />
</Step>
</StepByStep>

### Zadanie 3. Hardening przełącznika SW-X

<div className="justify">
Przełącznik ma własną powierzchnię ataku na warstwie 2: nieużywane porty, automatyczne tworzenie trunków i brak kontroli, kto podłącza się do portu. Poniższa checklista obejmuje minimum utwardzenia.
</div>

<Checklist
title="Utwardzanie SW-X"
storageKey="bezp1-sw"
sections={[
{
title: 'Dostęp do zarządzania',
items: [
'Adres zarządzania w wydzielonej sieci VLAN (interface vlan + ip address)',
'SSH zamiast Telnetu (transport input ssh, login local)',
'enable secret oraz service password-encryption',
],
},
{
title: 'Porty nieużywane (np. Fa0/6–Fa0/24)',
items: [
'switchport mode access — bez negocjacji trunku',
'switchport access vlan 999 — VLAN „czarna dziura”',
'shutdown — port wyłączony administracyjnie',
],
},
{
title: 'Porty użytkowników',
items: [
'switchport nonegotiate — wyłączenie DTP',
'switchport port-security — włączenie ochrony portu',
'switchport port-security maximum 2',
'switchport port-security mac-address sticky',
'switchport port-security violation restrict',
],
},
{
title: 'Trunki',
items: [
'switchport trunk allowed vlan — tylko potrzebne sieci VLAN',
'switchport trunk native vlan 999 — natywna VLAN inna niż 1',
],
},
]}
/>

<KeywordAnswer
  title="Wolne gniazdko"
  question="Dlaczego nieużywane porty przełącznika przypisuje się do osobnej, pustej sieci VLAN i wyłącza, zamiast zostawić je w domyślnej VLAN 1?"
  keywords={['VLAN 1', 'domyśln', 'domysln', 'wpi', 'podłącz', 'podlacz', 'dostęp', 'dostep']}
  explanation="Port zostawiony w VLAN 1 pozwala każdemu, kto wepnie kabel w wolne gniazdko, od razu znaleźć się w sieci zarządzania lub użytkowej. Przeniesienie do pustej VLAN i wyłączenie portu sprawia, że podłączenie się nie daje żadnego dostępu."
  storageKey="bezp1-port"
/>

### Zadanie 4. Kontrola dostępu do zarządzania (ACL na liniach VTY)

<div className="justify">
Nawet przy włączonym SSH każdy host w sieci może próbować się logować. Lista ACL przypięta do linii VTY poleceniem `access-class` ogranicza dostęp wyłącznie do podsieci administratora.
</div>

<StepByStep>
<Step title="Konfiguracja ograniczenia">
Uzupełnij lukę adresem sieci administratora (`172.16.X.240`) i maską odwrotną dla /28.

<CodeBlock lines={[
'ip access-list standard TYLKO-ADMIN',
<>permit <CodeBlank shared="bezp1_admin_net" /> <CodeBlank shared="bezp1_admin_wild" /></>,
'exit',
'line vty 0 4',
' access-class TYLKO-ADMIN in',
' exit',
]} />

<KeywordAnswer
  title="Maska odwrotna dla /28"
  question="Jaka jest maska odwrotna (wildcard) dla podsieci administratora o prefiksie /28?"
  keywords={['0.0.0.15']}
  explanation="Maska /28 to 255.255.255.240. Maskę odwrotną daje odjęcie każdego oktetu od 255: 0.0.0.15 (obejmuje 16 adresów)."
  storageKey="bezp1-vty"
/>
</Step>

<Step title="Weryfikacja">
Sprawdź skutek utwardzenia. W trybie **Simulation** Packet Tracera można podejrzeć, że próba Telnetu nie nawiązuje połączenia.

<Checklist
title="Testy po hardeningu"
storageKey="bezp1-checklist"
sections={[
{
title: 'Powinno działać',
items: [
'SSH z komputera administratora (172.16.X.241) do R1-X i SW-X',
'Logowanie kontem netadmin po SSH',
],
},
{
title: 'Powinno być zablokowane / odrzucone',
items: [
'Telnet do R1-X (transport input ssh)',
'SSH z komputera użytkownika spoza podsieci administratora (access-class)',
'Dostęp do serwera WWW urządzenia (no ip http server)',
'Logowanie po 4 błędnych próbach (login block-for)',
],
},
]}
/>

<CodeBlock lines={[
'show ip ssh',
'show running-config | include transport input',
'show port-security',
'show access-lists',
]} />

<ScreenshotPaste label="Zrzut ekranu: show ip ssh oraz nieudana próba Telnetu" />
</Step>
</StepByStep>

### Podsumowanie

<OpenQuestion
  title="Trzy najważniejsze poprawki"
  question="Spośród wszystkich zmian wprowadzonych w tym laboratorium wskaż trzy, które Twoim zdaniem najbardziej zmniejszyły powierzchnię ataku, i uzasadnij wybór. Która zmiana chroni przed podsłuchem, która przed fizycznym dostępem, a która przed zdalnym zgadywaniem haseł?"
  modelAnswer="Przykładowo: (1) SSH zamiast Telnetu — eliminuje podsłuch haseł i sesji w LAN; (2) access-class na VTY i wyłączenie nieużywanych portów — ograniczają dostęp fizyczny i sieciowy do zarządzania; (3) login block-for wraz z silnymi hasłami typu secret — utrudniają zdalne zgadywanie haseł. Dobre uzasadnienie odwołuje się do zasady najmniejszych uprawnień i obrony w głąb."
  minLength={120}
  storageKey="bezp1-wnioski"
/>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy przywróć stanowisko do ustawień domyślnych (`erase startup-config`, `reload`).
:::

[^nist-123]: K. Scarfone, W. Jansen, M. Tracy, [NIST SP 800-123 — Guide to General Server Security](https://csrc.nist.gov/pubs/sp/800/123/final), National Institute of Standards and Technology, 2008, rozdz. 4 (ograniczanie usług i powierzchni ataku).

[^cisco-harden]: Cisco Systems, Inc., [Cisco Guide to Harden Cisco IOS Devices](https://www.cisco.com/c/en/us/support/docs/ip/access-lists/13608-21.html), cisco.com — podział na management / control / data plane oraz zalecenia utwardzania.

[^cis]: Center for Internet Security, [CIS Cisco Benchmarks](https://www.cisecurity.org/benchmark/cisco), cisecurity.org — listy kontrolne bezpiecznej konfiguracji urządzeń Cisco.

[^nist-53]: [NIST SP 800-53 Rev. 5 — Security and Privacy Controls](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final), National Institute of Standards and Technology, 2020 — rodziny zabezpieczeń AC (kontrola dostępu) i CM (zarządzanie konfiguracją).
