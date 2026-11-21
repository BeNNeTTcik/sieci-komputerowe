---
sidebar_position: 5
title: "Laboratorium 5: Logowanie, audyt i bezpieczeństwo sieciowe hosta"
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

# Laboratorium 5: Logowanie, audyt i bezpieczeństwo sieciowe hosta

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium 5: Logowanie, audyt i bezpieczeństwo sieciowe hosta"
  storageKey="win-lab-5"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-lab-5"
  storageKeys={['win-lab-5','win5-logi','win5-auditd','win5-zapora','win5-win-audit','win5-wnioski']}
  sharedPrefix="win5_"
/>

:::danger Pracuj na maszynie laboratoryjnej
Zmiany w zaporze i audycie wykonuj na maszynie wirtualnej z migawką. Uważaj, by regułami zapory nie odciąć sobie zdalnego dostępu.
:::

## I. Wprowadzenie

<div className="justify">
Logi to nie tylko archiwum do debagowania, ale przede wszystkim podstawowa forma bezpieczeństwa w formie **historii zdarzeń w systemie**, bez której atak jest niewidoczny, a incydent nie do zbadania. Służą do **wykrywania** (nietypowe zdarzenia na bieżąco), **analizy śledczej** (odtworzenie przebiegu po fakcie), **rozliczalności** (kto, co i kiedy zrobił) oraz **zgodności** z wymaganiami. Zasada jest prosta: logować tyle, by zrekonstruować zdarzenie, i chronić logi przed modyfikacją. W budowych systemach jest to podstawa bezpieczeństwa dla całej sieci, gdzie wykorzystujac logi z różnych źródeł (np. routery, zapory, DNS, WAF, EDR, itd.) można je korelować w narzędziach typu **SIEM** (np. Wazuh [^wazuh], Elastic Security [^elastic], Graylog Open [^gray]) [^nist-800-92][^dsh]. W Tabeli 1 przedstawiono propzycje zdarzeń, które warto monitorować.
</div>

Tab. 1 Co warto rejestrować i gdzie
| Zdarzenie | Debian | Windows 11 |
|---|---|---|
| Logowania (udane/nieudane) | `/var/log/auth.log`, journald | Dziennik Zabezpieczenia (4624/4625) |
| Użycie uprawnień / sudo | `/var/log/sudo.log`, auditd | audyt „Sensitive Privilege Use” |
| Zmiany kont | auditd (`/etc/passwd`) | 4720/4726/4732 |
| Dostęp do plików wrażliwych | auditd (`-w <plik>`) | audyt dostępu do obiektów (SACL) |
| Zdarzenia zapory | ufw/nftables log | log Zapory Windows Defender |

<div className="justify">
Logi z poziomu systemu można analizować w Linuksie **journald** (systemd), często obok **rsyslog** (pliki w `/var/log`). Zdarzenia na poziomie jądra rejestruje **auditd**, a rozmiar i retencję plików kontroluje **logrotate**. Natomiast w **Windows** logi trafiają do **Dziennika zdarzeń** (Zabezpieczenia, System, Aplikacja), przeglądanego w **Podglądzie zdarzeń**. Zasady audytu ustawia się w **auditpol** (Advanced Audit Policy), a głębszy wgląd daje **Sysmon**.
</div>

:::note Dlaczego logi wysyła się poza host
Napastnik, który przejmie maszynę, próbuje **zatrzeć ślady**, czyli usunąć lub zmienić lokalne logi (technika MITRE ATT&CK „Indicator Removal”, T1070) [^mitre]. Wysyłanie logów na **osobny, zabezpieczony serwer** sprawia, że dowód przetrwa nawet pełne przejęcie hosta.
:::

<div className="justify">
**Audyt** to systematyczne, powtarzalne sprawdzenie, czy system działa **bezpiecznie, wydajnie, zgodnie z prawem i przyjętymi standardami**. Nie jest to pojedyncza komenda, lecz **proces porównania stanu faktycznego ze stanem wzorcowym** (kryteriami) i udokumentowania odchyleń. Rodzaje auytyów to:
</div>
- **konfiguracji / bezpieczeństwa** - czy ustawienia są zgodne z benchmarkiem (CIS, NIST, DISA STIG),
- **zgodności (compliance)** - czy spełnione są wymogi prawne/branżowe (RODO, PCI DSS, ISO 27001),
- **wewnetrzny / zewnętrzny** - wewnątrz organizacji lub zlecany firmy zewnętrznej,
- **techniczny / organizacyjny**.

W Tabeli 2 przedstawiono narzędzia oraz komendy wykonywanie na hoscie, które pomagające w audycie systemu.

Tab. Narzędzia audytu — Debian i Windows 11
| Cel / obszar audytu | Debian | Windows 11 |
|---|---|---|
| Audyt ogólny utwardzenia | Lynis (hardening index) | Security Compliance Toolkit + PolicyAnalyzer |
| Zgodność z benchmarkiem (CIS / SCAP) | OpenSCAP (`oscap`) + SSG, CIS-CAT | CIS-CAT, SCC (SCAP Compliance Checker) |
| Zasady i raporty audytu zdarzeń | auditd (`aureport`, `ausearch`) | `auditpol /get`, `secedit /export`, `gpresult` |
| Integralność plików / pakietów | `debsums` | `sfc /scannow`, `Get-AuthenticodeSignature` |
| Stan zabezpieczeń i zapory | `ss -tulpn`, `systemctl`, `sshd -T` | `Get-MpComputerStatus`, `Get-NetFirewallProfile`, `net accounts` |
| Wykrywanie rootkitów / malware | rkhunter, chkrootkit | Microsoft Defender (skan) |

### Bezpieczeństwo sieciowe hosta

<div className="justify">
**Zapora hosta** kontroluje ruch do i z pojedynczej maszyny, niezależnie od zabezpieczeń sieci. Domyślną polityką powinno być **odrzucanie ruchu przychodzącego** (*default deny*) i wpuszczanie tylko tego, co potrzebne. Dla Debian zapore konfiguruje się `ufw`/`nftables`, a w Windows odpowiada za to "Zapora Windows Defender". Dodatkowo redukuje się usługi nasłuchujące co redukuje powierzchnię ataku. Wykorzystywanie bezpiecznych protokołów SSH zamiast Telnetu, czy wyłączenie przestarzałych protkołów jak SMBv1. W budowanych systemach wykorzystuje się **automatyczna reakcja** na ataki (np. fail2ban blokujący adresy po serii nieudanych logowań) [^nist-800-94].
</div>

## II. Zadania do wykonania

### Logi uwierzytelniania

<StepByStep>
<Step title="Debian - nieudane i udane logowania">
Wywołaj kilka nieudanych logowań (np. zły su / ssh), potem przejrzyj logi.

```bash
sudo grep -i "authentication failure\|Failed password" /var/log/auth.log | tail
journalctl -u ssh --no-pager | tail
last -n 5        # ostatnie udane logowania
sudo lastb -n 5  # ostatnie NIEUDANE logowania
```

<ScreenshotPaste label="Zrzut ekranu: z nieudanych prób logowania" />
</Step>

<Step title="Windows — Podgląd zdarzeń i PowerShell">
Wywołaj kilka nieudanych logowań (np. zły su / ssh), potem przejrzyj logi; kod: **4625 = logowanie nieudane**, **4624 = udane**.

```powershell

Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 10 |
  Select-Object TimeCreated, @{n='Konto';e={$_.Properties[5].Value}}
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 5 | Select-Object TimeCreated
```

<ScreenshotPaste label="Zrzut ekranu: z nieudanych prób logowania" />
</Step>
</StepByStep>

### Rotacja i trwałość logów

<StepByStep>
<Step title="Debian - logrotate i trwałe journald">
Konfiguracja `journald` oraz `logrotate`.

```bash
# Trwałe logi journald (przetrwają restart)
sudo sed -i 's/^#\?Storage=.*/Storage=persistent/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald

# Rotacja plików logów
cat /etc/logrotate.conf
ls /etc/logrotate.d/
sudo logrotate --debug /etc/logrotate.conf | head
```
</Step>

<Step title="Windows - rozmiar i retencja dzienników">
Konfiguracja rozmiaru oraz retencji Dziennika Zdarzeń.

```powershell
Get-WinEvent -ListLog Security | Select-Object LogName, MaximumSizeInBytes, LogMode
# Zwiększ maksymalny rozmiar dziennika Zabezpieczenia (np. 256 MB)
wevtutil sl Security /ms:268435456
```

</Step>
</StepByStep>

### Audyt zdarzeń

<StepByStep>
<Step title="Debian - auditd">
Zainstaluj pakiet `auditd`, nastepnie uruchom weryfikacje plików i spróbuj edytować plik /etc/passwd.

```bash
sudo apt install -y auditd
sudo systemctl enable --now auditd
# Monitoruj zmiany pliku kont i sudoers
sudo auditctl -w /etc/passwd -p wa -k zmiana_kont
sudo auditctl -w /etc/sudoers -p wa -k zmiana_sudo
# Wywołaj zdarzenie i znajdź je
sudo touch /etc/passwd
sudo ausearch -k zmiana_kont | tail
```

<ScreenshotPaste label="Zrzut ekranu: wykrytej ingerencji w plik" />
</Step>

<Step title="Windows - zasady audytu i dostęp do obiektów">
Skonfiguruj `auditpol`.

```powershell
auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable
auditpol /set /subcategory:"File System" /success:enable /failure:enable
auditpol /get /category:*
```

Aby audytować dostęp do konkretnego pliku, ustaw na nim **SACL**: Właściwości pliku → Zabezpieczenia → Zaawansowane → **Inspekcja** → dodaj podmiot i uprawnienia. Zdarzenia pojawią się w **Dzienniku Zabezpieczenia** (4663).

<ScreenshotPaste label="Zrzut ekranu: z nieudanych prób logowania" />
</Step>
</StepByStep>

Wypełnij poniższą Tabele X uzasadniając dlaczego chcesz monitorować dany element.  

<EditableTable
  title="Tab. 3 Reguły audytu"
  storageKey="l5z-audyt"
  columns={[
    {key: 'obiekt', label: 'Monitorowany obiekt / kategoria', readOnly: true},
    {key: 'system', label: 'System',  readOnly: true},
    {key: 'po', label: 'Po co monitorować?'},
  ]}
  initialRows={[
    {obiekt: '/etc/passwd', system: 'Debian', po: ''},
    {obiekt: '/etc/sudoers', system: 'Debian', po: ''},
    {obiekt: 'User Account Management', system: 'Windows', po: ''},
    {obiekt: 'Dostęp do pliku (SACL)', system: 'Windows', po: ''},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Zapora hosta

<StepByStep>
<Step title="Debian - UFW: default deny + logowanie">
Konfiguracja UFW. Wykonaj komendę `ping <IP_VM>` przed wdrożeniem zapory.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp          # tylko jeśli potrzebujesz SSH
sudo ufw logging on
sudo ufw enable
sudo ufw status verbose
```

Dodanie nowej reguły UFW - jako blokada komendy `ping`.

```bash
sudo nano /etc/ufw/before.rules
```

Zamień linię:

```
-A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT
```

na:

```
-A ufw-before-input -p icmp --icmp-type echo-request -j LOG --log-prefix "[UFW BLOCK ICMP] "
-A ufw-before-input -p icmp --icmp-type echo-request -j DROP
```

Przeładuj i sprawdź:

```bash
sudo ufw reload
```

Ponownie wykonaj ten sam test.

```bash
sudo grep -i "UFW BLOCK\|UFW BLOCK ICMP" /var/log/ufw.log | tail
sudo iptables -L -n -v | grep -i icmp     # licznik pakietów rośnie = dowód
```
<ScreenshotPaste label="Zrzut ekranu: obu testów ping na adres systemu" />
</Step>

<Step title="Windows - Zapora Windows Defender: default block + logowanie">
Konfiguracja Zapory Windows Defender aby blokowała komendę `ping`.

```powershell
Set-NetFirewallProfile -All -DefaultInboundAction Block -DefaultOutboundAction Allow -Enabled True `
  -LogBlocked True -LogFileName "%systemroot%\system32\logfiles\firewall\pfirewall.log"
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, LogBlocked
```

```powershell
# (opcjonalnie) POZWÓL na ping — z drugiej maszyny ping zacznie przechodzić
New-NetFirewallRule -DisplayName "Lab-Pozwol-ICMP" -Direction Inbound -Protocol ICMPv4 -IcmpType 8 -Action Allow

# ZABLOKUJ ping (reguła Block ma pierwszeństwo) — z drugiej maszyny ping przestaje przechodzić
New-NetFirewallRule -DisplayName "Lab-Blokuj-ICMP" -Direction Inbound -Protocol ICMPv4 -IcmpType 8 -Action Block
```

Wykonaj ponownie ping.

```powershell
# zablokowane pakiety zobaczysz jako DROP w logu zapory
Get-Content "$env:systemroot\system32\logfiles\firewall\pfirewall.log" -Tail 20 | Select-String "DROP"
```

<ScreenshotPaste label="Zrzut ekranu: obu testów ping na adres systemu" />
</Step>
</StepByStep>

### Automatyczna reakcja i utwardzenie sieci

<StepByStep>
<Step title="Debian - fail2ban">
Narzędzie `fail2ban` pozwala na automatyczne blokowanie adresów, które przekroczyły wyznaczony limit prób wejścia do systemu.

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
# Po serii nieudanych logowań adres zostaje zablokowany automatycznie -> zrób zrzut ekranu
sudo fail2ban-client status
# Po tescie aby ponownie odblokować adres
sudo fail2ban-client unban --all
```

<ScreenshotPaste label="Zrzut ekranu: zbanowany adres" />
</Step>

<Step title="Debian - niskopoziomowe utwardzenie sieci (sysctl)">
Niskopoziomwe utwardzenie sieci to dodatkowe parametry, które pozwalaja na uniknięcie niektoórych rodzajów ataku na system. Poniżej przygotowano kilka parametrów, ich opis umieszczono w Tabeli Y.

```bash
sudo tee /etc/sysctl.d/60-net-hardening.conf <<'EOF'
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.tcp_syncookies = 1
EOF
sudo sysctl --system
```

Tab. Y Parametry sieciowe jądra (sysctl) — utwardzenie hosta
| Parametr | Co robi | Przed czym chroni |
|---|---|---|
| `net.ipv4.conf.all.accept_redirects = 0` | Ignoruje komunikaty ICMP redirect (próby zmiany tablicy tras) | Przekierowanie ruchu przez atakującego (man-in-the-middle) |
| `net.ipv4.conf.all.accept_source_route = 0` | Odrzuca pakiety z routingiem źródłowym (nadawca narzuca trasę) | Omijanie routingu/zapory i IP spoofing |
| `net.ipv4.conf.all.rp_filter = 1` | Reverse path filtering - odrzuca pakiet, gdy adres źródłowy nie wróciłby tym samym interfejsem | Podszywanie się pod cudze adresy (IP spoofing) |
| `net.ipv4.icmp_echo_ignore_broadcasts = 1` | Nie odpowiada na ping kierowany na adres rozgłoszeniowy | Wykorzystanie hosta jako wzmacniacza (atak Smurf, DoS) |
| `net.ipv4.tcp_syncookies = 1` | Włącza SYN cookies — obsługa połączeń bez utrzymywania stanu dla każdego SYN | Wyczerpanie kolejki połączeń (SYN flood, DoS) |
</Step>

<Step title="Windows - niskopoziomowe utwardzenie">
W Windows odpowiednikiem „niskopoziomowy” jest wyłącz przestarzałych/ryzykownych protokołów.

```powershell
Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart
```

</Step>
</StepByStep>

<EditableTable
  title="Tab. 5 Utwardzenie sieci hosta"
  storageKey="l5z-sysctl"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik (OK / do poprawy)'},
  ]}
  initialRows={[
    {kontrola: 'fail2ban aktywny (status sshd)'},
    {kontrola: 'tcp_syncookies = 1'},
    {kontrola: 'accept_redirects = 0'},
    {kontrola: 'SMBv1 wyłączony (Windows)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

:::danger Po zajęciach
Przywróć maszyny wirtualne z migawki sprzed laboratorium albo pozostaw je w znanym, czystym stanie.
:::

[^nist-92]: K. Kent, M. Souppaya, [NIST SP 800-92 — Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final), NIST, 2006.

[^wazuh]: Wazuh, [Wazuh Documentation](https://documentation.wazuh.com/current/index.html), 2015.

[^elastic]: Elastic, [Elastic Security Documentation](https://www.elastic.co/docs/deploy-manage/security), 2019. 

[^gray]: Graylog, [Graylog Documentation](https://go2docs.graylog.org/current/home.htm), 2009.

[^dsh]: L. Brotherston, A. Berlin, W. F. Reese, Defensive Security Handbook, Sebastopol, CA, USA: O'Reilly Media, 2024.

[^bth]: D. Murdoch, Blue Team Handbook: Incident Response, Sebastopol, CA, USA: O'Reilly Media, 2026.

[^nist-800-92]: K. Kent, M. Souppaya, [NIST SP 800-92 — Guide to Computer Security Log Management](https://csrc.nist.gov/pubs/sp/800/92/final), NIST, 2006.

[^nist-800-94]: K. Scarfone, P. Mell, [NIST SP 800-94 - Guide to Intrusion Detection and Prevention Systems (IDPS)](https://csrc.nist.gov/pubs/sp/800/94/final), NIST, 2007.

[^mitre]: MITRE, [ATT&CK - Indicator Removal (T1070)](https://attack.mitre.org/techniques/T1070/), attack.mitre.org.