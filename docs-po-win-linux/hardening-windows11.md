---
sidebar_position: 8
title: "Kompleksowy hardening Windows 11"
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

# Kompleksowy hardening Windows 11 (wg struktury CIS)

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Kompleksowy hardening Windows 11 (wg struktury CIS)"
  storageKey="hw-win11"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="hw-win11"
  storageKeys={['hw-win11','hw-pomiar','hw-konta','hw-lokalne','hw-zapora','hw-audyt','hw-szablony','hw-defender','hw-check','hw-wnioski']}
  sharedPrefix="hw_"
/>

:::danger Najpierw migawka
Wykonaj migawkę `przed-hardeningiem` maszyny Windows 11 z [Laboratorium 0](./lab-00). Zmiany wprowadzaj etapami. Polecenia PowerShell uruchamiaj **jako administrator**. Hasła laboratoryjne.
:::

## I. Wprowadzenie

<div className="justify">
Kompleksowe utwardzanie Windows 11 ułożone według **struktury benchmarku CIS dla Windows 11** (poziom **L1 — Enterprise**) [^cis]. Benchmark CIS jest zbudowany wokół **zasad zabezpieczeń** (ustawianych przez zasady grupy / rejestr) oraz **Microsoft Security Baseline** [^ms-baseline]. Numery pozycji różnią się między wersjami benchmarku — jeśli masz własny plik CIS, odnieś każdą sekcję do konkretnego numeru zalecenia.
</div>

<div className="justify">
Większość ustawień wprowadzimy przez **Edytor lokalnych zasad grupy** (`gpedit.msc`) i **Zasady zabezpieczeń lokalnych** (`secpol.msc`), a weryfikację i część zmian przez **PowerShell**. Dla wielu zasad naraz najwygodniejszy jest **Microsoft Security Compliance Toolkit (LGPO)** — pozwala zaimportować gotowy baseline.
</div>

Sekcje wg benchmarku:

1. Account Policies — polityka haseł i blokada konta
2. Local Policies — przypisanie praw użytkownika i opcje zabezpieczeń
3. Windows Defender Firewall
4. Advanced Audit Policy — zasady audytu
5. Administrative Templates — szablony administracyjne (System, komponenty Windows)
6. Microsoft Defender Antivirus

## II. Pomiar punktu wyjścia

<StepByStep>
<Step title="Stan przed">
```powershell
net accounts
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction
Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AMServiceEnabled
Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol | Select-Object State
```

<EditableTable
  title="Tab. 1 Pomiar przed / po"
  storageKey="hw-pomiar"
  columns={[
    {key: 'metryka', label: 'Metryka', readOnly: true},
    {key: 'przed', label: 'Przed'},
    {key: 'po', label: 'Po'},
  ]}
  initialRows={[
    {metryka: 'Min. długość hasła'},
    {metryka: 'Próg blokady konta'},
    {metryka: 'Zapora: DefaultInboundAction'},
    {metryka: 'SMBv1 (State)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## III. Sekcja 1 — Account Policies (hasła i blokada konta)

<StepByStep>
<Step title="1.1 Polityka haseł">
`secpol.msc` → Zasady konta → Zasady haseł. Wartości zgodne z CIS L1:

<EditableTable
  title="Tab. 2 Zasady haseł"
  storageKey="hw-konta"
  columns={[
    {key: 'zasada', label: 'Zasada', readOnly: true},
    {key: 'cis', label: 'Zalecana (CIS L1)', readOnly: true},
    {key: 'ustaw', label: 'Ustawiono?'},
  ]}
  initialRows={[
    {zasada: 'Wymuszaj historię haseł', cis: '24 ostatnie'},
    {zasada: 'Maksymalny okres ważności hasła', cis: '365 dni lub mniej (≠ 0)'},
    {zasada: 'Minimalny okres ważności hasła', cis: '1 dzień lub więcej'},
    {zasada: 'Minimalna długość hasła', cis: '14 znaków'},
    {zasada: 'Hasło musi spełniać wymagania złożoności', cis: 'Włączone'},
    {zasada: 'Przechowuj hasła, używając szyfrowania odwracalnego', cis: 'Wyłączone'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

Szybka część z PowerShell:
```powershell
net accounts /minpwlen:14 /maxpwage:365 /minpwage:1 /uniquepw:24
```
</Step>

<Step title="1.2 Blokada konta">
```powershell
net accounts /lockoutthreshold:5 /lockoutduration:15 /lockoutwindow:15
net accounts
```

<KeywordAnswer
  title="Próg blokady a DoS"
  question="Dlaczego progu blokady konta nie ustawia się na bardzo niską wartość (np. 1–2) mimo że utrudnia to atak na hasła?"
  keywords={['DoS', 'zablokow', 'celowo', 'dostepno', 'dostępno', 'uzytkownik', 'użytkownik', 'legaln']}
  explanation="Zbyt niski próg pozwala napastnikowi celowo blokować konta (atak DoS na dostępność) kilkoma błędnymi próbami, a także frustruje legalnych użytkowników przy literówkach. CIS zaleca kompromis (np. 5 prób) — utrudnia zgadywanie, nie ułatwiając blokowania kont."
  storageKey="hw-lockout"
/>
</Step>
</StepByStep>

## IV. Sekcja 2 — Local Policies (prawa użytkownika i opcje zabezpieczeń)

<StepByStep>
<Step title="2.1 Przypisanie praw użytkownika">
`secpol.msc` → Zasady lokalne → Przypisywanie praw użytkownika. Kluczowe zalecenia CIS:
- „Uzyskiwanie dostępu do tego komputera z sieci” — ogranicz do Administratorów i wymaganych grup.
- „Zezwalaj na logowanie lokalne” — tylko Administratorzy i Użytkownicy.
- „Odmowa logowania przez usługi pulpitu zdalnego” — dodaj Goście i konta lokalne tam, gdzie trzeba.
- „Logowanie w trybie usługi / wsadowym” — ogranicz.
</Step>

<Step title="2.2 Opcje zabezpieczeń (w tym UAC)">
`secpol.msc` → Zasady lokalne → Opcje zabezpieczeń. Wybrane:
- Kontrola konta użytkownika (UAC): tryb zatwierdzania dla administratora — **Włączony**.
- „Zachowanie monitu o podniesienie uprawnień dla administratorów” — monit o zgodę/dane.
- Klient/serwer SMB — **cyfrowe podpisywanie komunikacji (zawsze)** włączone.
- „Nie zezwalaj na anonimowe wyliczanie kont SAM i udziałów” — włączone.

```powershell
# Przykład: utwardzenie UAC przez rejestr (odpowiednik opcji w secpol)
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name ConsentPromptBehaviorAdmin -Value 2
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name EnableLUA -Value 1
```

<EditableTable
  title="Tab. 3 Local Policies — weryfikacja"
  storageKey="hw-lokalne"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'UAC włączone (EnableLUA = 1)'},
    {kontrola: 'Dostęp z sieci ograniczony'},
    {kontrola: 'Podpisywanie SMB włączone'},
    {kontrola: 'Anonimowe wyliczanie SAM zabronione'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## V. Sekcja 3 — Windows Defender Firewall

<StepByStep>
<Step title="3.1 Włączenie i polityka domyślna dla wszystkich profili">
```powershell
Set-NetFirewallProfile -All -Enabled True `
  -DefaultInboundAction Block -DefaultOutboundAction Allow `
  -NotifyOnListen True -LogBlocked True `
  -LogFileName "%systemroot%\system32\logfiles\firewall\pfirewall.log" -LogMaxSizeKilobytes 16384
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, LogBlocked
```

<KeywordAnswer
  title="Trzy profile zapory"
  question="Czym różnią się profile zapory Domenowy, Prywatny i Publiczny i dlaczego profil Publiczny powinien być najbardziej restrykcyjny?"
  keywords={['siec', 'sieć', 'zaufan', 'publiczn', 'restrykc', 'lokalizac', 'niezaufan']}
  explanation="Windows stosuje profil zależnie od typu sieci: Domenowy (sieć firmowa z kontrolerem domeny), Prywatny (zaufana sieć domowa), Publiczny (niezaufana, np. hotspot). W sieci publicznej zagrożenie jest największe, dlatego profil Publiczny powinien blokować najwięcej ruchu przychodzącego."
  storageKey="hw-firewall"
/>

<EditableTable
  title="Tab. 4 Zapora — weryfikacja"
  storageKey="hw-zapora"
  columns={[
    {key: 'profil', label: 'Profil', readOnly: true},
    {key: 'enabled', label: 'Włączony?'},
    {key: 'inbound', label: 'DefaultInboundAction'},
  ]}
  initialRows={[
    {profil: 'Domenowy (Domain)'},
    {profil: 'Prywatny (Private)'},
    {profil: 'Publiczny (Public)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## VI. Sekcja 4 — Advanced Audit Policy (zasady audytu)

<StepByStep>
<Step title="4.1 Włączenie kluczowych kategorii audytu">
```powershell
# Logowania (udane i nieudane)
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
# Zarządzanie kontami użytkowników
auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable
# Użycie uprawnień wrażliwych
auditpol /set /subcategory:"Sensitive Privilege Use" /success:enable /failure:enable
# Zmiany polityki audytu
auditpol /set /subcategory:"Audit Policy Change" /success:enable /failure:enable

auditpol /get /category:*
```

<KeywordAnswer
  title="Po co audytować nieudane logowania?"
  question="Dlaczego w zasadach audytu włącza się rejestrowanie zarówno udanych, jak i NIEUDANYCH logowań?"
  keywords={['nieudan', 'zgadywan', 'brute', 'atak', 'wykry', 'proby', 'próby', 'slad', 'ślad']}
  explanation="Nieudane logowania (zdarzenie 4625) to główny ślad ataku zgadywania haseł — seria błędnych prób zdradza brute force. Udane (4624) pozwalają potwierdzić, czy po próbach doszło do włamania i kto się zalogował. Razem dają pełny obraz prób dostępu."
  storageKey="hw-audit"
/>
</Step>
</StepByStep>

## VII. Sekcja 5 — Administrative Templates (szablony administracyjne)

<StepByStep>
<Step title="5.1 Wyłączenie przestarzałych i ryzykownych funkcji">
```powershell
# SMBv1 – przestarzały protokół
Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart

# Autoodtwarzanie / Autorun (nośniki wymienne)
Set-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer" -Name NoDriveTypeAutoRun -Value 255
```
`gpedit.msc` → Szablony administracyjne, zalecenia CIS m.in.:
- Windows Components → AutoPlay Policies → **Wyłącz Autoodtwarzanie** = Włączone.
- Windows Components → Microsoft Defender SmartScreen → **Włącz** dla plików i aplikacji.
- System → Device Guard → **Włącz zabezpieczenia oparte na wirtualizacji (VBS)**.
- Windows Components → BitLocker Drive Encryption → wymuszenie szyfrowania dysku systemowego.
</Step>

<Step title="5.2 Szyfrowanie danych w spoczynku (BitLocker)">
```powershell
Get-BitLockerVolume
# Włączenie szyfrowania dysku systemowego (na maszynie z TPM)
Enable-BitLocker -MountPoint "C:" -EncryptionMethod XtsAes256 -UsedSpaceOnly -TpmProtector
manage-bde -status C:
```

<EditableTable
  title="Tab. 5 Szablony administracyjne — weryfikacja"
  storageKey="hw-szablony"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'SMBv1 wyłączony'},
    {kontrola: 'Autoodtwarzanie wyłączone'},
    {kontrola: 'SmartScreen włączony'},
    {kontrola: 'BitLocker na dysku systemowym włączony'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## VIII. Sekcja 6 — Microsoft Defender Antivirus

<StepByStep>
<Step title="6.1 Ochrona w czasie rzeczywistym i w chmurze">
```powershell
Set-MpPreference -DisableRealtimeMonitoring $false
Set-MpPreference -MAPSReporting Advanced
Set-MpPreference -SubmitSamplesConsent SendSafeSamples
Set-MpPreference -PUAProtection Enabled          # ochrona przed potencjalnie niechcianymi aplikacjami
Update-MpSignature
Start-MpScan -ScanType QuickScan
```
</Step>

<Step title="6.2 Reguły ograniczania powierzchni ataku (ASR)">
Reguły ASR (Attack Surface Reduction) blokują typowe techniki złośliwego oprogramowania (np. makra Office uruchamiające procesy). Przykład włączenia jednej reguły w trybie blokowania:

```powershell
# Blokuj tworzenie procesów potomnych przez aplikacje Office
Add-MpPreference -AttackSurfaceReductionRules_Ids D4F940AB-401B-4EFC-AADC-AD5F3C50688A -AttackSurfaceReductionRules_Actions Enabled
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Ids
```

<KeywordAnswer
  title="Czym są reguły ASR?"
  question="Co robią reguły ograniczania powierzchni ataku (ASR) w Microsoft Defender?"
  keywords={['blokuj', 'technik', 'zachowan', 'makr', 'proces', 'malware', 'powierzchni', 'ogranicz']}
  explanation="Reguły ASR blokują typowe zachowania wykorzystywane przez złośliwe oprogramowanie — np. uruchamianie procesów przez makra Office, wykonywanie zaciemnionych skryptów czy kradzież poświadczeń z LSASS. Zamiast rozpoznawać konkretny plik, ograniczają całą klasę technik ataku."
  storageKey="hw-asr"
/>

<EditableTable
  title="Tab. 6 Defender — weryfikacja"
  storageKey="hw-defender"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'Ochrona w czasie rzeczywistym włączona'},
    {kontrola: 'Ochrona w chmurze (MAPS) = Advanced'},
    {kontrola: 'Ochrona PUA włączona'},
    {kontrola: 'Co najmniej jedna reguła ASR w trybie blokowania'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## IX. Weryfikacja końcowa i podsumowanie

<StepByStep>
<Step title="Zbiorcza weryfikacja">
```powershell
net accounts
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction
Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, PUAProtection
Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol | Select-Object State
auditpol /get /category:"Logon/Logoff"
```
Uzupełnij kolumnę „Po” w Tab. 1.

<ScreenshotPaste label="Zrzut ekranu: zbiorcza weryfikacja po hardeningu" />
</Step>
</StepByStep>

<Checklist
title="Hardening Windows 11 — sekcje CIS"
storageKey="hw-check"
sections={[
{ title: 'Ukończone sekcje', items: [
'1. Account Policies (hasła, blokada konta)',
'2. Local Policies (prawa użytkownika, opcje zabezpieczeń, UAC, SMB signing)',
'3. Windows Defender Firewall (wszystkie profile, default deny inbound, logi)',
'4. Advanced Audit Policy (logowania, konta, uprawnienia)',
'5. Administrative Templates (SMBv1, Autorun, SmartScreen, BitLocker)',
'6. Microsoft Defender (RTP, chmura, PUA, reguły ASR)',
]},
]}
/>

<OpenQuestion
  title="Ustawienie lokalne a zarządzanie skalą"
  question="W tym laboratorium ustawienia wprowadzałeś lokalnie (gpedit/secpol/PowerShell). Jak wyglądałoby wdrożenie tych samych zasad na 200 komputerach w organizacji? Wymień co najmniej dwa mechanizmy i wyjaśnij, dlaczego ręczna konfiguracja każdej maszyny jest ryzykowna."
  modelAnswer="Na skalę używa się zasad grupy w domenie Active Directory (GPO), narzędzi zarządzania jak Microsoft Intune/MDM lub narzędzi konfiguracji (np. import baseline przez LGPO/Security Compliance Toolkit, skrypty). Ręczna konfiguracja każdej maszyny jest podatna na błędy i dryf konfiguracji, trudna do audytu i niespójna — centralne zarządzanie zapewnia jednolitość, szybkie poprawki i raportowanie zgodności."
  minLength={120}
  storageKey="hw-wnioski"
/>

:::danger Po zajęciach
Jeśli ćwiczenie było testowe, przywróć maszynę z migawki `przed-hardeningiem`. Jeśli stan ma zostać — zrób migawkę `win11-hardened`. Uwaga: po włączeniu BitLockera zabezpiecz klucz odzyskiwania.
:::

[^cis]: Center for Internet Security, [CIS Microsoft Windows 11 Benchmark](https://www.cisecurity.org/cis-benchmarks), cisecurity.org. Numery zaleceń zależą od wersji benchmarku — odnieś sekcje do swojego pliku CIS.

[^ms-baseline]: Microsoft, [Security baselines i Security Compliance Toolkit (LGPO)](https://learn.microsoft.com/windows/security/operating-system-security/device-management/windows-security-configuration-framework/windows-security-baselines), learn.microsoft.com.
