---
sidebar_position: 1
title: "Laboratorium 1: Utwardzona instalacja i konfiguracja systemów operacyjnych"
---

<!--- import bibliotek -->

import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Laboratorium 1: Utwardzona instalacja i konfiguracja systemów operacyjnych

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium 1: Utwardzona instalacja i konfiguracja systemów operacyjnych"
  storageKey="win-lab-1"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-lab-1"
  storageKeys={['win-lab-1','win1-standardy','win1-linux-audyt','win1-linux-lynis','win1-win-audyt','win1-wnioski']}
  sharedPrefix="win1_"
/>

:::danger Pracuj wyłącznie na maszynie laboratoryjnej
Wszystkie zmiany wykonuj na **maszynie wirtualnej** (Windows i Ubuntu w VirtualBox/Hyper-V), nigdy na systemie produkcyjnym. **Przed rozpoczęciem zrób migawkę (snapshot)** każdej maszyny — pozwoli to cofnąć zmiany. Hasła i konta zakładane w pracowni służą **wyłącznie do ćwiczeń**.
:::

## I. Wprowadzenie

<div className="justify">
**Hardening** (utwardzanie) systemu operacyjnego to proces doprowadzenia świeżej instalacji do stanu, w którym ma ona **jak najmniejszą powierzchnię ataku**: zainstalowane tylko potrzebne pakiety, wyłączone zbędne usługi, bezpieczne ustawienia domyślne i kontrola nad tym, kto i co może zrobić. System „zaraz po instalacji” jest wygodny, ale ma włączone usługi i ustawienia nastawione na łatwość uruchomienia, a nie na bezpieczeństwo [^nist-123].
</div>

<div className="justify">
Bezpieczeństwo zaczyna się już przy instalacji i jest **procesem ciągłym**. Fundamentem są **regularne aktualizacje**, ponieważ brak aktualizacji systemu dla dawno załatanych podatności to proszenie sie o kłopoty w przyszłości. Równolegle warto również notować co zostało poprawione, aby uniknąć sytuacji, że aktualizacja była, ale nikt nie wie czego dotyczyła [^twierdza].

Równie istotny jest **wybór wspieranej dystrybucji**. Wybranie odpowiedniej wersji systemu do potrzeb gwarantuje poprawki bezpieczeństwa oraz łatki dla niektórych komponentów. W środowisku produkcyjnym powinno sie wybierać systemy z długim i przewidywanym okresem wsparcia systemu dla wersji stabilnych (pomijamy wresje alfa/beta czy testing). Wersja po zakończeniu wsparcia (EOL - **End-of-Life**) przestaje dostawać aktualizacje, a co za tym idzie nie powinna być wykorzystywana produkcyjnie [^twierdza].

W świecie pełnym bibliotek, pakietów i repozytoriów wykorzystujemy **podpisy cyfrowe** oraz system weryfikucji przez **klucze GPG** dystrybucji. Najbezpieczniejsze są **oficjalne repozytoria dystrybucji** instalowane przez menedżera pakietów są podpisane, testowane i aktualizowane automatycznie. Pakiety **pobierane ręcznie** oraz **zewnętrzne repozytoria** rozszerzają możliwości, ale zwiększają ryzyko. Mogą być nieaktualne, niepodpisane lub złośliwe, a dodane repozytorium ma pełne prawo instalować i aktualizować pakiety w całym systemie. Dlatego zewnętrzne źródła dodaje się **świadomie i tylko zaufane**, wraz z ich kluczem. Po takiej weryfikacji mamy pewność, że instalowane oprogramowanie pochodzi z zaufanego źródła i nie zostało podmienione po drodze. Zasada minimalizacji działa też w drugą stronę: **odinstaluj pakiety, których nie będziesz używać**, ponieważ każdy zbędny program to dodatkowy kod, który może mieć podatności i który trzeba utrzymywać [^twierdza][^apt].
</div>

<div className="justify">
Utwardzania nie robi się „z głowy”, tylko według **standardów** (benchmarków), które zbierają setki sprawdzonych ustawień. Standardy są tak opracowane, że w zależności od tego co chcemy zabezpieczyć to wybieramy odpowiedni rozdział i w nim otrzymujemy propozycje konfiguracji do wdrożenia. W Tabeli 1 przedstawiono kilka najpopularniejszych standardów utwardzania systemów użytkowników końcowych jak i usług serwerowych.
</div>

Tab. 1 Najważniejsze standardy hardeningu
| Standard | Autor | Zakres |
|---|---|---|
| **CIS Benchmarks** | Center for Internet Security | szczegółowe listy ustawień dla Windows, Ubuntu, RHEL i in.; poziomy **L1** (bezpieczne bez utraty funkcji) i **L2** (surowe, dla środowisk wysokiego ryzyka) [^cis] |
| **Microsoft Security Baselines** | Microsoft | gotowe zestawy zasad GPO dla Windows, wdrażane narzędziem Security Compliance Toolkit [^ms-baseline] |
| **DISA STIG** | Departament Obrony USA | wymagania bezpieczeństwa dla systemów używanych w administracji/wojsku [^stig] |
| **NIST SP 800-123 / 800-53** | NIST | ogólne wytyczne i katalog zabezpieczeń (kontrola dostępu, konfiguracja) [^nist-123][^nist-53] |

<div className="justify">
Dwa pojęcia, które przewijają się przez całe laboratorium. **Baseline** (konfiguracja bazowa) to uzgodniony, bezpieczny stan systemu — punkt odniesienia. **Dryf konfiguracji** (*configuration drift*) to stopniowe odchodzenie od baseline’u wskutek ręcznych zmian; dlatego konfigurację trzeba okresowo **audytować** i porównywać ze standardem. W tym laboratorium zmierzysz stan „przed” i „po” utwardzeniu.
</div>

## II. Zadania do wykonania

### Zabezpiecz usługę według dokumentacji (SSH)

<div className="justify">
Zabezpieczanie usługi polega na zrozumieniu, **za co odpowiada każdy plik konfiguracyjny**, odnalezieniu właściwych ustawień w **dokumentacji** (strony `man` oraz benchmark CIS) i świadomym ich zastosowaniu. A nie na przepisywaniu gotowych linii „w ciemno” z internetu. W tym zadaniu zabezpieczysz serwer **SSH**, pracując na plikach z Tabeli 1.
</div>

Tab. 1 Pliki związane z usługą SSH
| Plik / katalog | Za co odpowiada |
|---|---|
| `/etc/ssh/sshd_config` | główny plik konfiguracyjny serwera SSH |
| `/etc/ssh/sshd_config.d/*.conf` | pliki „drop-in” dołączane dyrektywą `Include`; nadpisują ustawienia głównego pliku |
| `/etc/ssh/ssh_host_*_key` | prywatne klucze hosta; wymagają ścisłych uprawnień |
| `/etc/pam.d/sshd` | integracja SSH z PAM (uwierzytelnianie, komunikaty) |
| `/var/log/auth.log` | dziennik prób logowania np. do weryfikacji naruszeń |

<StepByStep>
<Step title="Poznaj pliki i dokumentację">
Zajrzyj do plików i otwórz dokumentację, a w niej szukasz, która dyrektywa odpowiada za dane zabezpieczenie.

```bash
ls -l /etc/ssh/ /etc/ssh/sshd_config.d/
sudoedit /etc/ssh/sshd_config          # podejrzyj główny plik (nie edytuj jeszcze)
man sshd_config                        # dokumentacja dyrektyw (q = wyjście)
```

Równolegle otwórz w benchmarku **CIS Debian Linux 13** sekcję **5.1 (Configure SSH Server)** zawiera zalecane wartości wraz z uzasadnieniem.

<KeywordAnswer
  title="Który plik wygrywa?"
  question="Masz ustawienie PermitRootLogin w /etc/ssh/sshd_config oraz inne w /etc/ssh/sshd_config.d/50-cloud.conf. Które zostanie zastosowane i dlaczego?"
  keywords={['drop-in', 'Include', 'pierwsz', 'nadpis', 'sshd_config.d', 'wczytyw']}
  explanation="W SSH obowiązuje PIERWSZA pasująca wartość dyrektywy, a pliki z sshd_config.d/ są dołączane przez Include zwykle na początku głównego pliku, więc to one wygrywają. Dlatego własne ustawienia bezpieczniej umieszczać we własnym pliku drop-in w sshd_config.d/, zamiast edytować główny plik."
  storageKey="ssh-doc-precedence"
/>
</Step>

<Step title="Kopia zapasowa przed zmianą">
```bash
sudo cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```
</Step>

<Step title="Odnajdź w dokumentacji i zastosuj zalecenia">
Dla każdej pozycji z Tabeli 2 **znajdź** właściwy parametr w `man sshd_config` / CIS 5.1, wpisz jej nazwę i zalecaną wartość, a następnie zastosuj ją we własnym pliku drop-in.

<EditableTable
  title="Tab. 2 Zabezpieczenia SSH wg dokumentacji"
  storageKey="ssh-doc-dyrektywy"
  columns={[
    {key: 'cel', label: 'Cel zabezpieczenia', readOnly: true},
    {key: 'dyrektywa', label: 'Nazwa parametru'},
    {key: 'wartosc', label: 'Zalecana wartość'},
    {key: 'zrodlo', label: 'Źródło (rozdział z CIS)'},
  ]}
  initialRows={[
    {cel: 'Zablokuj logowanie na konto root'},
    {cel: 'Ogranicz liczbę prób uwierzytelnienia'},
    {cel: 'Zabroń pustych haseł'},
    {cel: 'Wyłącz przekazywanie X11'},
    {cel: 'Ustaw limit czasu na zalogowanie'},
    {cel: 'Rozłączaj nieaktywne sesje (keepalive)'},
    {cel: 'Pokaż baner ostrzegawczy przed logowaniem'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

Zapisz ustalone wartości w pliku drop-in (przykład wartości uzupełnij wg dokumentacji):

```bash
sudo nano /etc/ssh/sshd_config.d/60-hardening.conf
# np.:
# Permit...
# Max...
# (pozostałe dyrektywy z Tabeli 2)
```

<!-- | Cel | Dyrektywa | Wartość | Źródło |
|---|---|---|---|
| Blokada roota | `PermitRootLogin` | `no` | CIS 5.1.22 |
| Limit prób | `MaxAuthTries` | `4` lub mniej | CIS 5.1.18 |
| Puste hasła | `PermitEmptyPasswords` | `no` | CIS 5.1.21 |
| X11 | `X11Forwarding` | `no` | CIS 5.1.9 |
| Czas na logowanie | `LoginGraceTime` | `60` lub mniej | CIS 5.1.15 |
| Keepalive | `ClientAliveInterval` / `ClientAliveCountMax` | `300` / `3` | CIS 5.1.8 |
| Baner | `Banner` | `/etc/issue.net` | CIS 5.1.6 |
 -->
</Step>

<Step title="Zweryfikuj składnię, zastosuj i sprawdź">
Zawsze sprawdź składnię **przed** restartem, ponieważ błądy w konfiguracji mogą zablokować usługę.

```bash
sudo sshd -t                       # test składni; brak komunikatu = OK
sudo systemctl restart ssh
sudo sshd -T | grep -Ei 'permitrootlogin|maxauthtries|x11forwarding|logingracetime|banner'
```

<KeywordAnswer
  title="Po co sshd -t i sshd -T?"
  question="Czym różni się sshd -t od sshd -T i dlaczego oba są przydatne przy zabezpieczaniu usługi?"
  keywords={['skladni', 'składni', 'test', 'efektywn', 'obowiazuj', 'obowiązuj', 'wartosc', 'wartość']}
  explanation="sshd -t sprawdza poprawność składni pliku konfiguracyjnego (zapobiega zablokowaniu usługi błędnym wpisem). sshd -T wypisuje faktycznie obowiązującą konfigurację po połączeniu wszystkich plików (główny + drop-in). Pozwala potwierdzić, że zastosowana wartość jest tą, której oczekujesz."
  storageKey="ssh-doc-weryfikacja"
/>
</Step>

<Step title="Uprawnienia kluczy hosta i test działania">

```bash
# Klucze prywatne hosta muszą być chronione
ls -l /etc/ssh/ssh_host_*_key
sudo chmod 600 /etc/ssh/ssh_host_*_key
```

#### Test: nieudana i udana próba logowania, a potem podgląd w logu

```bash
sudo tail -n 20 /var/log/auth.log
```

<ScreenshotPaste label="Zrzut ekranu: sshd -T z zastosowanymi dyrektywami oraz wpis w auth.log" />
</Step>
</StepByStep>

### Wybór wersji systemu i wsparcie

<StepByStep>
<Step title="Debian - gałęzie i wsparcie">
Debian ma gałęzie **stable** (zalecana produkcyjnie), **testing** i **unstable**, a starsze wydania wspiera projekt **Debian LTS**. Sprawdź swoją wersję i odnieś ją do cyklu wsparcia.

```bash
cat /etc/debian_version
lsb_release -a 2>/dev/null
```

Porównaj z oficjalnym cyklem wydań: [wiki.debian.org/DebianReleases](https://wiki.debian.org/DebianReleases) oraz [Debian LTS](https://wiki.debian.org/LTS).
</Step>

<Step title="Windows 11 - edycja, wersja i cykl życia">
Windows 11 ma edycje (Home, Pro) i wersje funkcji (np. 23H2, 24H2), z których **każda ma datę końca wsparcia**. Sprawdź swoją i odnieś do cyklu życia.

```powershell
winver                                   # okno z wersją i kompilacją
Get-ComputerInfo -Property WindowsProductName, OsVersion, OsBuildNumber
```

Porównaj z [cyklem życia Windows 11](https://learn.microsoft.com/lifecycle/products/windows-11-home-and-pro).
</Step>
</StepByStep>

<EditableTable
  title="Tab. 1 Wersja i wsparcie systemu"
  storageKey="l1p-wersja"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'wersja', label: 'Wersja / kompilacja'},
    {key: 'galaz', label: 'Gałąź / edycja'},
    {key: 'wsparcie', label: 'Wsparcie do (data)'},
  ]}
  initialRows={[
    {system: 'Debian'},
    {system: 'Windows 11'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Weryfikacja obrazu instalacyjnego (ISO)

<div className="justify">
Przed instalacją (lub ponowną instalacją maszyny) obraz ISO trzeba zweryfikować, żeby mieć pewność, że nie został uszkodzony ani podmieniony. Debian umożliwia **pełną weryfikację podpisem GPG**, Windows opiera się na **sumie kontrolnej** podanej przez Microsoft.
</div>

<StepByStep>
<Step title="Debian - weryfikacja ISO podpisem GPG">
Z tego samego katalogu co ISO pobierz pliki `SHA256SUMS` i `SHA256SUMS.sign`, a następnie:

```bash
# 1) Zaimportuj klucz podpisujący Debiana (odcisk klucza sprawdź na debian.org)
gpg --keyserver keyring.debian.org --recv-keys <ODCISK_KLUCZA_DEBIAN>

# 2) Zweryfikuj PODPIS pliku z sumami (czy sumy pochodzą od Debiana)
gpg --verify SHA256SUMS.sign SHA256SUMS

# 3) Zweryfikuj, czy ISO zgadza się z zaufaną sumą
sha256sum -c SHA256SUMS 2>&1 | grep -i "debian.*OK"
```

Sama suma potwierdza tylko integralność względem pliku SHA256SUMS. Napastnik, który podmienił ISO, mógł podmienić też plik z sumami. Dopiero gpg --verify sprawdza PODPIS tego pliku kluczem Debiana, czyli potwierdza, że sumy są autentyczne i pochodzą od wydawcy. Oba kroki razem dają integralność i autentyczność.

<ScreenshotPaste label="Zrzut ekranu: Weryfikacji ISO" />
</Step>

<Step title="Windows 11 - weryfikacja ISO sumą kontrolną">
Microsoft publikuje **SHA256** obrazu na stronie pobierania ISO. Policz sumę pobranego pliku i porównaj ręcznie.

```powershell
Get-FileHash .\Win11.iso -Algorithm SHA256
# Porównaj wynik z wartością podaną na stronie Microsoftu (pobranej przez HTTPS)
```

<ScreenshotPaste label="Zrzut ekranu: Weryfikacji ISO - porównanie wyniku ze strona MS" />
</Step>
</StepByStep>

### Weryfikacja zainstalowanych pakietów

<StepByStep>
<Step title="Debian - lista i integralność pakietów">
```bash
# Lista zainstalowanych pakietów
apt list --installed 2>/dev/null | head
dpkg -l | wc -l
# Integralność zainstalowanych plików względem sum z pakietów
sudo apt install -y debsums
sudo debsums -s                     # pokaże TYLKO pliki, które się nie zgadzają
```

`debsums` porównuje sumy kontrolne plików zainstalowanych w systemie z sumami zapisanymi w pakietach. Rozbieżność oznacza, że plik został zmieniony po instalacji (przypadkiem lub przez atakującego np. podmieniony plik binarny). To prosty sposób wykrycia naruszenia integralności zainstalowanego oprogramowania.

```bash
# Klucze/źródła, którym ufa apt
ls /etc/apt/keyrings/ /usr/share/keyrings/ /etc/apt/trusted.gpg.d/ 2>/dev/null
apt-cache policy
```

<ScreenshotPaste label="Zrzut ekranu: Wyniku wykonania komendy sudo debsums -s" />
</Step>

<Step title="Windows 11 - pakiety i podpisy">
```powershell
# Zainstalowane pakiety / aplikacje
winget list
Get-Package | Select-Object Name, Version, ProviderName
Get-AppxPackage | Select-Object Name | Sort-Object Name
# Integralność plików systemowych
sfc /scannow
# Podpis cyfrowy konkretnego programu
Get-AuthenticodeSignature "C:\Program Files\...\program.exe" | Select-Object Status, SignerCertificate
```

<ScreenshotPaste label="Zrzut ekranu: Wynik wykonania komendy sfc /scannow" />
</Step>
</StepByStep>

<EditableTable
  title="Tab. 3 Audyt zainstalowanego oprogramowania"
  storageKey="l1p-zainst"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'narzedzie', label: 'Użyte narzędzie'},
    {key: 'wynik', label: 'Wynik (integralność / podejrzane?)'},
  ]}
  initialRows={[
    {system: 'Debian — debsums -s'},
    {system: 'Windows — sfc /scannow'},
    {system: 'Windows — Get-AuthenticodeSignature (wybrany plik)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Instalacja nowych pakietów z weryfikacją

<StepByStep>
<Step title="Debian - instalacja z repozytorium i dodanie zewnętrznego źródła (GPG)">
```bash
# Pobierz klucz GPG dostawcy i zapisz go w dedykowanym keyringu
sudo apt-get install -y gpg ca-certificates wget
sudo mkdir -p /etc/apt/keyrings
wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc \
  | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
sudo chmod a+r /etc/apt/keyrings/gierens.gpg
# Sprawdź ODCISK pobranego klucza i porównaj z podanym w oficjalnej dokumentacji
gpg --show-keys /etc/apt/keyrings/gierens.gpg
# Dodaj repozytorium przypięte do TEGO klucza (signed-by)
echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" \
  | sudo tee /etc/apt/sources.list.d/gierens.list
# Zaktualizuj i zainstaluj (brak/niepoprawny klucz => błąd NO_PUBKEY)
sudo apt update && sudo apt install -y eza
eza --version
```

</Step>

<Step title="Windows 11 - instalacja przez winget / Store">
```powershell
winget source list
winget search 7zip
winget install --id 7zip.7zip -e          # instalacja z weryfikacją
Get-AuthenticodeSignature "C:\Program Files\7-Zip\7zFM.exe" | Select-Object Status
```
</Step>
</StepByStep>

<EditableTable
  title="Tab. 4 Instalacja z weryfikacją"
  storageKey="l1p-instal"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'zrodlo', label: 'Źródło instalacji'},
    {key: 'weryfikacja', label: 'Jak zweryfikowano zaufanie?'},
  ]}
  initialRows={[
    {system: 'Debian — apt (oficjalne)'},
    {system: 'Debian — zewnętrzne repo (signed-by)'},
    {system: 'Windows — winget / Store'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Usuwanie zbędnych pakietów

```bash
# Debian
sudo apt remove --purge -y htop         # usuń przykładowy pakiet
sudo apt autoremove --purge -y          # usuń osierocone zależności
```
```powershell
# Windows 11
winget uninstall --id 7zip.7zip
Get-AppxPackage *nazwa* | Remove-AppxPackage    # usunięcie wbudowanej aplikacji
```

<EditableTable
  title="Tab. 5 Usunięte oprogramowanie"
  storageKey="l1p-usun"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'pakiet', label: 'Usunięty pakiet / aplikacja'},
    {key: 'powod', label: 'Dlaczego zbędny?'},
  ]}
  initialRows={[
    {system: 'Debian'},
    {system: 'Windows 11'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

:::danger Po zajęciach
Przywróć maszyny wirtualne z migawki sprzed laboratorium albo pozostaw je w znanym, czystym stanie.
:::

[^nist-123]: K. Scarfone, W. Jansen, M. Tracy, [NIST SP 800-123 — Guide to General Server Security](https://csrc.nist.gov/pubs/sp/800/123/final), NIST, 2008.

[^cis]: Center for Internet Security, [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks), cisecurity.org — poziomy L1/L2, listy kontrolne dla Windows i Linux.

[^ms-baseline]: Microsoft, [Security baselines i Security Compliance Toolkit](https://learn.microsoft.com/windows/security/operating-system-security/device-management/windows-security-configuration-framework/windows-security-baselines), learn.microsoft.com.

[^stig]: DISA, [Security Technical Implementation Guides (STIGs)](https://public.cyber.mil/stigs/), cyber.mil.

[^nist-53]: [NIST SP 800-53 Rev. 5 — Security and Privacy Controls](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final), NIST, 2020 — rodziny CM (zarządzanie konfiguracją) i SI.

[^debian-sec]: Debian, [Debian security information](https://www.debian.org/security/) oraz [SecureApt](https://wiki.debian.org/SecureApt) — wsparcie bezpieczeństwa dystrybucji i weryfikacja repozytoriów kluczami GPG.

[^apt]: Debian, [Debian Reference — zarządzanie pakietami (APT)](https://www.debian.org/doc/manuals/debian-reference/ch02.en.html) — źródła oprogramowania, repozytoria i pakiety .deb.

[^twierdza]: K. Szafrański, [Twierdza Linux](https://twierdza.sekurak.pl), 2026.