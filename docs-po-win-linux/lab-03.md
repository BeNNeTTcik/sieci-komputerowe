---
sidebar_position: 3
title: "Laboratorium 3: Wykrywanie zagrożeń i ochrona przed złośliwym oprogramowaniem"
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

# Laboratorium 3: Wykrywanie zagrożeń i ochrona przed złośliwym oprogramowaniem

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium 3: Wykrywanie zagrożeń i ochrona przed złośliwym oprogramowaniem"
  storageKey="win-lab-3"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-lab-3"
  storageKeys={['win-lab-3','win3-proc','win3-eicar','win3-wnioski']}
  sharedPrefix="win3_"
/>

:::danger Pracuj na maszynie laboratoryjnej
Wszystko wykonuj na maszynie wirtualnej z migawką. W tym laboratorium używamy wyłącznie **bezpiecznego pliku testowego EICAR** — nie jest to wirus i nie zawiera złośliwego kodu.
:::

## I. Wprowadzenie

<div className="justify">
**Złośliwe oprogramowanie** (*malware*) to każdy program stworzony, by działać wbrew interesowi użytkownika lub właściciela systemu. Celem atakujących jest wykraść dane, przejąć kontrolę, zaszyfrować pliki dla okupu czy wykorzystać zasoby maszyny. Nie jest to jednorodna kategoria, ponieważ różne typy różnią się sposobem rozprzestrzeniania i celem (Tabela 1) [^nist-800-83].
</div>

Tab. 1 Typy złośliwego oprogramowania
| Typ | Charakterystyka |
|---|---|
| **Wirus** | dołącza się do innego pliku/programu i rozprzestrzenia przy jego uruchomieniu |
| **Robak** (*worm*) | rozprzestrzenia się samodzielnie przez sieć, bez nosiciela |
| **Koń trojański** (*trojan*) | udaje użyteczny program, a w tle wykonuje złośliwe działania |
| **Ransomware** | szyfruje dane i żąda okupu za ich odzyskanie |
| **Rootkit** | ukrywa swoją obecność i daje trwały, uprzywilejowany dostęp |
| **Spyware / keylogger** | potajemnie zbiera dane (hasła, naciśnięcia klawiszy) |
| **Bot / element botnetu** | oddaje maszynę pod zdalną kontrolę (C2) |
| **Malware bezplikowy** (*fileless*) | działa w pamięci / przez legalne narzędzia systemu (np. PowerShell), nie zostawiając pliku |
| **PUA** | potencjalnie niechciane aplikacje (adware, natrętne „optymalizatory”) |

<div className="justify">
Współczesny atak to proces o kilku etapach, które porządkuje m.in. macierz **MITRE ATT&CK®** [^mitre], który został znacznie rozbudowany względem pierwszego podstawego modelu **Cyber Kill Chain®** [^ckc]. Czy model **Attack Flow** [^attackflow] (stworzony przez zespół MITRE) który pozwala na swobodne odwzorowywanie bez ograniczeń na fazy ataku. Zrozumienie tych etapów w modelach/macierzach podpowiada, **gdzie i czego szukać**: wstępny dostęp (phishing, podatność), wykonanie kodu, **utrwalenie się** (*persistence*, np. wpis autostartu), **eskalacja uprawnień**, **unikanie wykrycia**, komunikacja z serwerem sterującym (**C2**) i **eksfiltracja** danych. Każdy etap zostawia ślady w procesach, usługach, autostarcie, połączeniach sieciowych i logach.
</div>

<div className="justify">
Wykrywanie opiera się na znajomości **stanu normalnego (baseline)** i trzech uzupełniających się metodach opisanych w Tabeli 2.
</div>

Tab. 2 Metody wykrywania
| Metoda | Zasada | Mocna strona / ograniczenie |
|---|---|---|
| **Sygnaturowa** | porównanie ze wzorcami znanych zagrożeń | skuteczna wobec znanych; ślepa na nowe (zero-day) |
| **Heurystyczna / behawioralna** | analiza podejrzanych zachowań, nie plików | wykrywa nieznane; może dawać fałszywe alarmy |
| **Anomalii** | odchylenie od baseline’u (nietypowy proces, port, godzina) | wychwytuje nowości; wymaga dobrego baseline’u |

<div className="justify">
Rozróżnia się też **wskaźniki naruszenia (IoC)**, czyli ślady, że atak już nastąpił (np. znany złośliwy plik, adres C2). Kolejny to **wskaźnik ataku (IoA)** mówi o zachowaniach wskazujących na trwający atak (np. proces Office uruchamiający PowerShell). **Program antywirusowy (AV)** odpowiada na pytanie „czy znam ten plik jako zły?”, a **EDR** (*Endpoint Detection and Response*) odpowiada „czy to zachowanie wygląda na atak?”, zbierając i korelując zdarzenia oraz umożliwiając reakcję (izolację hosta, zabicie procesu).
</div>

<div className="justify">
Żadna pojedyncza warstwa nie wystarcza w chronieniu systemu, dlatego stosujemy **obronę w głąb** i założenie **„zakładaj naruszenie”**, czyli ktoś już znajduje się w systemie. Pierwszą warstwą ochrony są aktualizacje (zamykanie podatności), AV/EDR, **ograniczanie uruchamiania** (allowlisting: AppLocker/WDAC w Windows, AppArmor w Linux), zaporę hosta, kontrolę dostępu i kopie zapasowe (ratunek po ransomware).
</div>

## II. Zadania do wykonania

### Ustalenie stanu normalnego (baseline)

<StepByStep>
<Step title="Debian - procesy, usługi, porty, autostart">
Wykonaj poniższe komendy w CLI Debiana.

```bash
ps aux --sort=-%cpu | head
systemctl list-units --type=service --state=running
sudo ss -tulpn
# Zadania zaplanowane (częste miejsce utrwalania się)
crontab -l 2>/dev/null; ls -l /etc/cron.* /etc/systemd/system/*.timer 2>/dev/null
```

Uzupełnij Tabele 3 danymi wykorzystanymi w powyższych komendach.
</Step>

<Step title="Windows 11 - procesy, połączenia, autostart">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, Id, Path
Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess
Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location
```

Do pełnego obrazu autostartu użyj **Autoruns** (Sysinternals) [^sysinternals].

Uzupełnij Tabele 3 danymi wykorzystanymi w powyższych komendach.
</Step>
</StepByStep>

<EditableTable
  title="Tab. 3 Baseline — stan normalny"
  storageKey="l3z-baseline"
  columns={[
    {key: 'kategoria', label: 'Kategoria', readOnly: true},
    {key: 'debian', label: 'Debian (co jest typowe)'},
    {key: 'win', label: 'Windows 11 (co jest typowe)'},
  ]}
  initialRows={[
    {kategoria: 'Procesy o największym zużyciu'},
    {kategoria: 'Porty nasłuchujące'},
    {kategoria: 'Wpisy autostartu / zadania'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Wykrywanie anomalii i śladów utrwalenia

:::note Artefakty są nieszkodliwe
Poniżej tworzymy **celowo niegroźne** ślady (jak zostawiłby je atak), żeby nauczyć się je wykrywać i usuwać. Nic nie jest złośliwe.
:::

<StepByStep>
<Step title="Debian - nietypowy port i wpis w cron">
Wykonaj poniższe komendy w CLI Debiana.

```bash
# 1) Niegroźny proces nasłuchujący (symuluje nieoczekiwaną usługę)
python3 -m http.server 8080 &   # zapamiętaj numer zadania, np. [1]

# 2) Niegroźne „utrwalenie” przez cron (co minutę dopisuje datę)
( crontab -l 2>/dev/null; echo "* * * * * date >> /tmp/lab_beacon.log" ) | crontab -

# --- WYKRYWANIE (udawaj, że nie wiesz, co powyżej) ---
sudo ss -tulpn | grep 8080                 # nietypowy port
crontab -l                                 # nieoczekiwany wpis
ls -l /tmp/lab_beacon.log                  # artefakt na dysku

# --- SPRZĄTANIE ---
kill %1                                     # zatrzymaj proces
crontab -l | grep -v 'lab_beacon' | crontab -   # usuń tylko ten wpis
rm -f /tmp/lab_beacon.log
```

Uzupełnij Tabele 4 danymi wykorzystanymi w powyższych komendach.
</Step>

<Step title="Windows 11 - nieoczekiwany wpis autostartu">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
# Niegroźne „utrwalenie”: wpis w autostarcie uruchamiający Kalkulator
New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" `
  -Name "LabTest" -Value "calc.exe" -PropertyType String -Force

# --- WYKRYWANIE ---
Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Get-CimInstance Win32_StartupCommand | Where-Object Name -eq "LabTest"
# (Autoruns pokaże go na karcie „Logon”)

# --- SPRZĄTANIE ---
Remove-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "LabTest"
```

Uzupełnij Tabele 4 danymi wykorzystanymi w powyższych komendach.
</Step>
</StepByStep>

<EditableTable
  title="Tab. 4 Wykryte anomalie"
  storageKey="l3z-persist"
  columns={[
    {key: 'artefakt', label: 'Artefakt', readOnly: true},
    {key: 'jak', label: 'Jak go wykryłeś?'},
    {key: 'etap', label: 'Który etap ataku reprezentuje?'},
  ]}
  initialRows={[
    {artefakt: 'Debian - port 8080'},
    {artefakt: 'Debian - wpis cron'},
    {artefakt: 'Windows - wpis Run'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Weryfikacja ochrony antywirusowej (test EICAR)

<div className="justify">
**EICAR** to oficjalny, nieszkodliwy plik testowy, który każdy antywirus rozpoznaje jako „zagrożenie testowe". Plik pozwala sprawdzić, czy ochrona działa, bez prawdziwego wirusa [^eicar].
</div>

<StepByStep>
<Step title="Debian - ClamAV i wykrywanie rootkitów">
Wykonaj poniższe komendy w CLI Debiana.

```bash
sudo apt install -y clamav rkhunter
sudo freshclam
clamscan --infected --recursive ~/lab-malware-test/    # po umieszczeniu tam pliku EICAR
# Skanery rootkitów / anomalii systemowych
sudo rkhunter --update && sudo rkhunter --check --sk
```

Uzupełnij Tabele 5 danymi wykorzystanymi w powyższych komendach.
</Step>

<Step title="Windows - Defender">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
# Stan ochrony
Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AntivirusSignatureLastUpdated

# Szybki skan
Start-MpScan -ScanType QuickScan

# Historia wykrytych zagrożeń
Get-MpThreatDetection | Select-Object ThreatID, InitialDetectionTime
```

Pobierz oficjalny plik testowy EICAR ze strony eicar.org — ochrona w czasie rzeczywistym powinna go natychmiast poddać kwarantannie.

Uzupełnij Tabele 5 danymi wykorzystanymi w powyższych komendach.
</Step>
</StepByStep>

<EditableTable
  title="Tab. 5 Wynik testu ochrony"
  storageKey="l3z-av"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'rt', label: 'Ochrona w czasie rzeczywistym wykryła?'},
    {key: 'skan', label: 'Skan na żądanie wykrył?'},
    {key: 'akcja', label: 'Akcja (kwarantanna / usunięcie)'},
  ]}
  initialRows={[
    {system: 'Windows (Defender)'},
    {system: 'Debian (ClamAV)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Włączenie mechanizmów ochronnych

<StepByStep>
<Step title="Debian - AppArmor jako ograniczenie aplikacji">
```bash
sudo aa-status                 # które profile są wymuszane
sudo apt install -y apparmor-profiles apparmor-utils
```
</Step>

<Step title="Windows - Defender: ASR i ochrona przed PUA">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
Set-MpPreference -PUAProtection Enabled
# Przykładowa reguła ASR: blokuj tworzenie procesów potomnych przez Office
Add-MpPreference -AttackSurfaceReductionRules_Ids D4F940AB-401B-4EFC-AADC-AD5F3C50688A `
  -AttackSurfaceReductionRules_Actions Enabled
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Ids
```

</Step>
</StepByStep>

:::danger Po zajęciach
Przywróć maszyny wirtualne z migawki sprzed laboratorium albo pozostaw je w znanym, czystym stanie.
:::

[^mitre]: MITRE, [MITRE ATT&CK — baza technik ataku i wykrywania](https://attack.mitre.org/), attack.mitre.org.

[^sysinternals]: Microsoft, [Sysinternals (Autoruns, Process Explorer)](https://learn.microsoft.com/sysinternals/), learn.microsoft.com.

[^eicar]: EICAR, [Anti-Malware Testfile](https://www.eicar.org/download-anti-malware-testfile/), eicar.org — bezpieczny plik testowy do weryfikacji programów antywirusowych.

[^nist-800-83]: M. Souppaya, K. Scarfone, [NIST SP 800-83 Rev. 1 — Guide to Malware Incident Prevention and Handling for Desktops and Laptops](https://csrc.nist.gov/pubs/sp/800/83/r1/final), NIST, 2013.

[^nist-800-94]: K. Scarfone, P. Mell, [NIST SP 800-94 — Guide to Intrusion Detection and Prevention Systems (IDPS)](https://csrc.nist.gov/pubs/sp/800/94/final), NIST, 2007.

[^sysinternals]: Microsoft, [Sysinternals — Autoruns, Process Explorer](https://learn.microsoft.com/sysinternals/), learn.microsoft.com.

[^eicar]: EICAR, [Anti-Malware Testfile](https://www.eicar.org/download-anti-malware-testfile/), eicar.org — bezpieczny plik testowy do weryfikacji antywirusów.

[^attackflow]: MITRE, [Attack Flow](https://ctid.mitre.org/projects/attack-flow/), 2021.

[^ckc]: Lockheed Martin, [Cyber Kill Chain](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html).
