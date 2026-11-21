---
sidebar_position: 4
title: "Laboratorium 4: Automatyzacja i administracja systemem"
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

# Laboratorium 4: Automatyzacja i administracja systemem

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium 4: Automatyzacja i administracja systemem"
  storageKey="win-lab-4"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-lab-4"
  storageKeys={['win-lab-4','win4-skrypt','win4-harmonogram','win4-ai','win4-wnioski']}
  sharedPrefix="win4_"
/>

:::danger Pracuj na maszynie laboratoryjnej
Skrypty uruchamiaj na maszynie wirtualnej z migawką. Każdy skrypt najpierw przeczytaj i zrozum, zanim go uruchomisz.
:::

## I. Wprowadzenie

<div className="justify">
Ręczne wykonywanie tych samych czynności na wielu maszynach jest wolne i zawodne — prowadzi do pomyłek i **dryfu konfiguracji** (stopniowego rozjeżdżania się ustawień, o którym mówiliśmy przy hardeningu). **Automatyzacja** rozwiązuje to, bo skrypt wykonuje zadanie **powtarzalnie i identycznie**, da się go **wersjonować**, **audytować** i uruchomić na wielu systemach. Cztery kluczowe korzyści to: powtarzalność, skala, rozliczalność (wiadomo, co i kiedy się wykonało) oraz szybkość reakcji.
</div>

<div className="justify">
Ważne pojęcie to **idempotentność**: dobrze napisana automatyzacja po wielokrotnym uruchomieniu daje **ten sam stan końcowy** i nie psuje niczego, co już jest poprawne (np. „upewnij się, że użytkownik istnieje” zamiast „utwórz użytkownika”). To fundament narzędzi zarządzania konfiguracją i podejścia **Infrastructure as Code** [^iac].

W Tabeli 1 przedstawiono narzędzia/jęzki umożlwijące prace w danym środowisku lub do wykorzystania ogólnego tam gdzie tego potrzebujemy.
</div>

Tab. 1 Narzędzia automatyzacji
| Warstwa | Debian / Linux | Windows 11 | Ogólne / Wieloplatformowe |
|---|---|---|---|
| Język skryptowy | **bash** | **PowerShell** | Python, REST API |
| Harmonogram | **cron**, **timery systemd** | **Harmonogram zadań** (Task Scheduler) | Rundeck, harmonogramy w CI/CD |
| Zarządzanie usługami | `systemctl` | `Get/Set-Service`, `sc` | REST API |
| Zarządzanie konfiguracją (skala) | **Ansible** (bezagentowo, przez SSH) | **PowerShell DSC**, Ansible, zasady grupy (GPO) | Ansible, Terraform (IaC), SaltStack, YAML |
| Wersjonowanie | **Git** | **Git** | Git, CI/CD |

<div className="justify">
Dla jednej/kilku maszyn wystarczą skrypty i harmonogram. Przy większej liczbie hostów stosuje się **zarządzanie konfiguracyjne** (np. Ansible [^ansible], SaltStack [^salt], czy Terraform [^terra]) w odpowiednim jezyku programowania (zależy od twórcy oprogramowania) opisujemy **pożądany stan** systemu, który następnie jest wdrażany na maszynie.
</div>

### AI jako pomoc w budowaniu automatyzacji

<div className="justify">
**Asystenci AI** (np. Claude Code, GitHub Copilot, OpenAI Codex) są dziś realnym narzędziem administratora. Umożliwiają **wygenerowanie szkieletu skryptu**, **wyjaśnić cudzy kod**, **przetłumaczyć** rozwiązanie z bash na PowerShell (i odwrotnie), ułożyć **wyrażenie cron**, zaproponować **playbook Ansible** czy **wyjaśnić komunikat błędu**. Dobrze użyte, skracają czas i obniżają próg wejścia.
</div>

<div className="justify">
AI nie zwalnia jednak z odpowiedzialności. Wygenerowany kod bywa **błędny, wykonuje operacje o których nie wspominaliśmy, jest nadmiarowo uprzywilejowany lub niebezpieczny** (zmyślone przełączniki, `rm -rf` bez zabezpieczeń, pobieranie i uruchamianie kodu z sieci). Obowiązuje zasada **„zrozum, zanim uruchomisz”**. Z założenia powinniśmy traktować kod wygenerowany przez AI jak kod z nieznanego źródła [^ncsc-ai].

Dodatkowo po wygenerowanym kodzie warto sprawdzić jakość testować skrypty na wyizolowanym środowisku jak np. kontenery czy wirtualne maszyny. 
</div>

<div className="justify">
Automatyzacja sama jest **powierzchnią ataku**. Zaplanowane zadania to klasyczne miejsce **utrwalania się** malware, więc trzeba pilnować uprwanień dotyczących skryptu (**kto może tworzyć/edytować** skrypty i zadania, nadawać skryptom **ścisłe uprawnienia**), a **sekrety** (hasła, klucze) wymagane do uruchomienia skryptu przechwouj poza kodem (zmienne środowiskowe, menedżer sekretów), nigdy **NIE** umieszczaj na stałe w skrypcie.
</div>

## II. Zadania do wykonania

### Debian

<StepByStep>
<Step title="Debian - skrypt sprawdzający hardening">
Utwórz skrypt, który zbiera kilka wskaźników bezpieczeństwa w jednym raporcie. Przeczytaj go linia po linii, zanim uruchomisz.

```bash
cat > ~/audit.sh <<'EOF'
#!/usr/bin/env bash
# Prosty raport stanu utwardzenia – tylko odczyt, nic nie zmienia.
echo "=== Raport z $(date) na $(hostname) ==="
echo "--- Konta z UID 0 (powinien być tylko root) ---"
awk -F: '$3 == 0 {print $1}' /etc/passwd
echo "--- Usługi nasłuchujące ---"
ss -tulpn | awk 'NR>1 {print $1, $5}'
echo "--- Pliki SUID ---"
find /usr/bin /usr/sbin -perm -4000 -type f 2>/dev/null | wc -l
echo "--- Stan zapory UFW ---"
ufw status 2>/dev/null | head -1
EOF

chmod +x ~/audit.sh
./audit.sh
```

</Step>

<Step title="Debian - harmonogram">
Zautomatyzuj uruchamianie raportu. Dwie drogi w Linuksie: klasyczny `cron` albo **timer systemd**. A następnie wypełnij poniższą Tabele.

```bash
# Wariant cron: codziennie o 7:00 (crontab -e, dodaj linię)
0 7 * * * /home/$USER/audit.sh >> /home/$USER/audit.log 2>&1

# Podgląd zaplanowanych zadań
crontab -l
systemctl list-timers --all
```

</Step>
</StepByStep>
<EditableTable
  title="Tab. 1 Zaplanowane zadania"
  storageKey="win4-harmonogram"
  columns={[
    {key: 'zadanie', label: 'Zadanie', readOnly: true},
    {key: 'mechanizm', label: 'Mechanizm (cron / systemd timer / Harmonogram)'},
    {key: 'kiedy', label: 'Harmonogram (kiedy)'},
  ]}
  initialRows={[
    {zadanie: 'audit.sh', mechanizm: '', kiedy: ''},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Windows

<StepByStep>
<Step title="Windows - skrypt raportujący">
Napisz prosty skrypt PowerShell zbierający stan zabezpieczeń (tylko odczyt).

```powershell
# Zapisz jako C:\Lab\audit.ps1
"=== Raport z $(Get-Date) na $env:COMPUTERNAME ==="
"--- Administratorzy lokalni ---"
Get-LocalGroupMember -Group "Administratorzy" | Select-Object Name
"--- Ochrona w czasie rzeczywistym ---"
(Get-MpComputerStatus).RealTimeProtectionEnabled
"--- Profile zapory ---"
Get-NetFirewallProfile | Select-Object Name, Enabled
```

Uruchomienie może wymagać poluzowania polityki wykonywania skryptów - rób to świadomie:

```powershell
Get-ExecutionPolicy
# Uruchomienie jednorazowe bez trwałej zmiany polityki:
powershell -ExecutionPolicy Bypass -File C:\Lab\audit.ps1
```

</Step>

<Step title="Windows - harmonogram zadań">
Zaplanuj codzienne uruchomienie raportu w **Harmonogramie zadań**. A następnie wypełnij poniższą Tabele.

```powershell
$akcja = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\Lab\audit.ps1"
$wyzw  = New-ScheduledTaskTrigger -Daily -At 7am
Register-ScheduledTask -TaskName "LabAudyt" -Action $akcja -Trigger $wyzw -Description "Codzienny raport bezpieczeństwa"

Get-ScheduledTask -TaskName "LabAudyt"
```

</Step>
</StepByStep>
<EditableTable
  title="Tab. 1 Zaplanowane zadania"
  storageKey="win4-harmonogram"
  columns={[
    {key: 'zadanie', label: 'Zadanie', readOnly: true},
    {key: 'mechanizm', label: 'Mechanizm (cron / systemd timer / Harmonogram)'},
    {key: 'kiedy', label: 'Harmonogram (kiedy)'},
  ]}
  initialRows={[
    {zadanie: 'LabAudyt', mechanizm: '', kiedy: ''},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Odpowiedzialne użycie narzędzi AI

<div className="justify">
Poproś dowolnego asystenta AI o skrypt automatyzujący jedno z dzisiejszych zadań (np. „skrypt bash sprawdzający otwarte porty”). Nie uruchamiaj go od razu. Najpierw oceń go według poniższej listy kontrolnej.
</div>

<Checklist
title="Przegląd kodu wygenerowanego przez AI przed uruchomieniem"
storageKey="win4-ai"
sections={[
{
title: 'Zanim uruchomisz',
items: [
'Przeczytałem każdą linię i rozumiem, co robi',
'Skrypt nie wykonuje nieodwracalnych operacji (rm -rf, format, usuwanie kont) bez potwierdzenia',
'Nie pobiera i nie uruchamia kodu z nieznanych adresów (curl | bash)',
'Działa z minimalnymi potrzebnymi uprawnieniami (nie żąda roota bez powodu)',
'Nie zawiera wklejonych haseł, kluczy ani innych sekretów',
'Uruchamiam go najpierw na maszynie laboratoryjnej z migawką',
],
},
]}
/>

<ScreenshotPaste label="Zrzut ekranu: uruchomionego skryptu" />

### Przechowywanie haseł i sekretów dla przygotowanych skryptów

<div className="justify">
Hasła, klucze i tokeny **nigdy** nie powinny być wpisane na stałe w skrypcie ani trafić do repozytorium. Raz dodane do haseł do Git zostają tam nawet po usunięciu z pliku. Sekrety trzyma się **poza kodem** i pobiera **w czasie działania** z bezpiecznego magazynu: menedżera sekretów (HashiCorp **Vault** [^vault]), **Windows Credential Manager / PowerShell SecretManagement** [^secretmgmt] lub przez **klucze SSH** z agentem. Przypadkowo dodane sekrety wychwytuje skan repozytorium (np. **Gitleaks** [^gitleaks]).
</div>

<StepByStep>
<Step title="Debian - zarządzanie sekretami (poza kodem)">


```bash
# Debian - klucz SSH zamiast hasła w skrypcie (logowanie bez hasła)
ssh-keygen -t ed25519 -C "automatyzacja-lab"
ssh-copy-id uzytkownik@host-docelowy
eval "$(ssh-agent)"; ssh-add ~/.ssh/id_ed25519     # agent trzyma odblokowany klucz

# Sekret pobierany w czasie działania z menedżera (koncepcyjnie, HashiCorp Vault)
export DB_PASS="$(vault kv get -field=password secret/app)"
# skrypt używa $DB_PASS — hasło nie istnieje nigdzie w kodzie ani w repo
```

Przy rozbudowanych i złożonych skryptach warto przed udsotepnieniem skryptu przeskanować go `gitleaks`, który sam skanuje repozytorium w poszukiwaniu sekretów i haseł w kodzie.

```bash
# Skan repozytorium: wykryj sekrety przypadkowo dodane do kodu
gitleaks detect --source ~/automatyzacja
```

<ScreenshotPaste label="Zrzut ekranu: wynik skanowania repozytorium gitleaks" />
</Step>

<Step title="Windows - zarządzanie sekretami (poza kodem)">
Windows posiada wbudowany menedżer poświadczeń, który wykorzystamy w ćwiczeniu.

```powershell
# Windows — wbudowany menedżer poświadczeń
cmdkey /list
# Moduł SecretManagement + lokalny, szyfrowany magazyn
Install-Module Microsoft.PowerShell.SecretManagement, Microsoft.PowerShell.SecretStore -Scope CurrentUser -Force
Register-SecretVault -Name LabVault -ModuleName Microsoft.PowerShell.SecretStore -DefaultVault
Set-Secret -Name DbPass -Secret "haslo-laboratoryjne"
$sekret = Get-Secret -Name DbPass -AsPlainText     # pobranie w skrypcie, bez jawnego hasła w kodzie
```

Po wykananym zadaniu ponownie wywołaj komende `cmdkey /list`.
<ScreenshotPaste label="Zrzut ekranu: dla komendy cmdkey /list" />
</Step>
</StepByStep>

<EditableTable
  title="Tab. 6 Gdzie przechowujesz sekrety"
  storageKey="l4z-sekrety"
  columns={[
    {key: 'sekret', label: 'Sekret', readOnly: true},
    {key: 'zle', label: 'Źle (czego unikać)', readOnly: true},
    {key: 'dobrze', label: 'Dobrze (gdzie trzymać)'},
  ]}
  initialRows={[
    {sekret: 'Hasło do bazy / usługi', zle: 'wpisane w skrypcie'},
    {sekret: 'Klucz API / token', zle: 'w repozytorium Git'},
    {sekret: 'Dostęp do zdalnego hosta', zle: 'hasło w cron/skrypcie'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Wersjonowanie i bezpieczeństwo automatyzacji

<StepByStep>
<Step title="Wersjonuj skrypty w Git">
Stwórz repozytorium **GIT** do weryfikacji wersji skryptu.

```bash
sudo apt install git -y
mkdir -p ~/automatyzacja && cd ~/automatyzacja
cp ~/ensure_state.sh .
git init
git add ensure_state.sh
git commit -m "Pierwszy skrypt zapewniający stan"
git log --oneline
```

<KeywordAnswer
  title="Po co Git dla skryptów?"
  question="Dlaczego skrypty administracyjne warto trzymać w systemie kontroli wersji (Git)?"
  keywords={['histori', 'zmian', 'cofn', 'kto', 'audyt', 'wersj', 'przywroc', 'przywróc']}
  explanation="Git daje historię zmian: wiadomo kto, co i kiedy zmienił, można wrócić do wcześniejszej wersji po błędnej zmianie i przeglądać/recenzować zmiany przed wdrożeniem. To rozliczalność i bezpieczeństwo automatyzacji — oraz ochrona przed dryfem i przypadkowym zepsuciem."
  storageKey="l4z-git"
/>
</Step>

<Step title="Bezpieczeństwo: uprawnienia">
Kolejnym punktem jest przygotwanie odpowiednich uprawnień, aby osoby nieupoważnione nie mogły modyfikować naszego skryptu.

```bash
# ŹLE: hasło na stałe w skrypcie  →  DOBRZE: z zmiennej środowiskowej / pliku poza repo
# np. odczyt sekretu z pliku o ścisłych uprawnieniach:
install -m 600 /dev/null ~/.app_secret
# (do pliku wpisz sekret ręcznie; nie commituj go do Git — dodaj do .gitignore, który nie umieści na publicznym serwerze danych dostępowych do środowiska)
echo ".app_secret" > ~/automatyzacja/.gitignore

# Uprawnienia do skryptu: tylko właściciel może zapisać
chmod 700 ~/ensure_state.sh
ls -l ~/ensure_state.sh
```

Wypełnij poniższą Tabele 5.

<EditableTable
  title="Tab. 5 Bezpieczeństwo automatyzacji - audyt"
  storageKey="l4z-bezp"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik (OK / do poprawy)'},
  ]}
  initialRows={[
    {kontrola: 'Skrypty mają ścisłe uprawnienia (nie do zapisu dla wszystkich)'},
    {kontrola: 'Brak haseł/kluczy w kodzie'},
    {kontrola: 'Sekrety wykluczone z repozytorium (.gitignore)'},
    {kontrola: 'Zaplanowane zadania przeglądane (kto może je edytować)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>

</StepByStep>

### Jakość i testowanie skryptów

<div className="justify">
Skrypt automatyzujący to **kod — i jak każdy kod bywa błędny**. Co gorsza, uruchamia się zwykle z wysokimi uprawnieniami i na wielu maszynach, więc pojedyncza pomyłka (np. niezabezpieczona zmienna w `rm`) może zepsuć wiele systemów naraz. Dlatego stosujemy te same zabezpieczenia co w programowaniu: **statyczną analizę** (linter wychwytuje błędy przed uruchomieniem), **testy** (potwierdzają zachowanie) oraz **tryb próbny** (dry-run) przed wdrożeniem.
</div>

<StepByStep>
<Step title="Debian - statyczna analiza bash (shellcheck)">
Zainstaluj dodatkowy pakiet shellchceck, pomoże on przy weryfikacji składni skryptów.

```bash
sudo apt install -y shellcheck
shellcheck ~/ensure_state.sh        # wskaże błędy i ryzykowne konstrukcje
bash -n ~/ensure_state.sh           # sama kontrola składni (bez uruchamiania)
```

<ScreenshotPaste label="Zrzut ekranu: dla komendy shellcheck" />
</Step>

<Step title="Windows - PSScriptAnalyzer i testy Pester">
Analiza statyczna kodu w PowerShell uruchomionym jako administrator.

```powershell
# Statyczna analiza stylu i błędów
Install-Module PSScriptAnalyzer -Scope CurrentUser -Force
Invoke-ScriptAnalyzer -Path C:\Lab\ensure_state.ps1

# Test jednostkowy (Pester) - sprawdza, czy skrypt faktycznie robi, co trzeba
Install-Module Pester -Scope CurrentUser -Force
@'
Describe "ensure_state" {
  It "tworzy katalog docelowy" {
    & C:\Lab\ensure_state.ps1 -Sciezka "C:\Lab\test_app"
    Test-Path "C:\Lab\test_app" | Should -Be $true
  }
}
'@ | Out-File C:\Lab\ensure_state.Tests.ps1
Invoke-Pester -Path C:\Lab\ensure_state.Tests.ps1
```

<ScreenshotPaste label="Zrzut ekranu: wynik analizy Pester" />
</Step>

</StepByStep>
<EditableTable
  title="Tab. 5 Kontrola jakości skryptów"
  storageKey="l4z-jakosc-tab"
  columns={[
    {key: 'skrypt', label: 'Skrypt', readOnly: true},
    {key: 'lint', label: 'Linter (uwagi?)'},
    {key: 'test', label: 'Test (wynik)'},
  ]}
  initialRows={[
    {skrypt: 'Debian — ensure_state.sh', test: '—'},
    {skrypt: 'Windows — ensure_state.ps1', lint: '—'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

:::danger Po zajęciach
Przywróć maszyny wirtualne z migawki sprzed laboratorium albo pozostaw je w znanym, czystym stanie.
:::

[^ncsc-ai]: NCSC, [Guidelines for secure AI system development](https://www.ncsc.gov.uk/collection/guidelines-secure-ai-system-development), ncsc.gov.uk.

[^iac]: K. Morris, *Infrastructure as Code*, O'Reilly.

[^terra]: HashiCorp Developer, [Terraform Documentation](https://developer.hashicorp.com/terraform/docs), 2014.

[^salt]: Salt Project, [SaltStack Documentation](https://docs.saltproject.io/en/latest/contents.html), 2011.

[^ansible]: Red Hat, [Ansible Documentation](https://docs.ansible.com/), 2012.