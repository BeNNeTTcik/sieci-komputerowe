---
sidebar_position: 7
title: "Kompleksowy hardening Debian"
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

# Kompleksowy hardening Debian 13 (wg struktury CIS)

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Kompleksowy hardening Debian 13 (wg struktury CIS)"
  storageKey="hd-debian"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="hd-debian"
  storageKeys={['hd-debian','hd-pomiar','hd-fs','hd-services','hd-net','hd-access','hd-audit','hd-maint','hd-check','hd-wnioski']}
  sharedPrefix="hd_"
/>

:::danger Najpierw migawka
Wykonaj migawkę `przed-hardeningiem` maszyny Debian z [Laboratorium 0](./lab-00). Zmiany wprowadzaj etapami i po każdej sekcji sprawdzaj, czy maszyna nadal działa i czy nie tracisz dostępu (SSH, zapora). Hasła laboratoryjne.
:::

## I. Wprowadzenie

<div className="justify">
To kompleksowe utwardzanie Debiana 13 ułożone według **benchmarku CIS Debian Linux 13 v1.1.0** (poziom **L1** — bezpieczny bez istotnej utraty funkcji) [^cis]. Przy zadaniach podano **numery konkretnych zaleceń** z tego benchmarku (np. „CIS 1.1.1.10”), żeby łatwo odnieść je do pełnego dokumentu. Benchmark zawiera dla każdego zalecenia szczegółowy opis, uzasadnienie oraz procedury audytu i naprawy — tu podajemy skrócone polecenia do wykonania na maszynie.
</div>

Pracujemy sekcjami, zgodnie z układem benchmarku:

1. Initial Setup — system plików, rozruch, utwardzenie procesów, banery, aktualizacje
2. Services — usługi specjalnego przeznaczenia i klienci
3. Network Configuration — parametry jądra i zapora
4. Access, Authentication and Authorization — sudo, SSH, PAM, hasła
5. Logging and Auditing — auditd, journald, integralność
6. System Maintenance — uprawnienia plików i kont

## II. Pomiar punktu wyjścia

<StepByStep>
<Step title="Lynis — stan przed">
```bash
sudo apt update && sudo apt install -y lynis
sudo lynis audit system | tee ~/lynis-przed.txt | tail -25   # zanotuj Hardening index
```

<EditableTable
  title="Tab. 1 Pomiar przed / po"
  storageKey="hd-pomiar"
  columns={[
    {key: 'metryka', label: 'Metryka', readOnly: true},
    {key: 'przed', label: 'Przed'},
    {key: 'po', label: 'Po'},
  ]}
  initialRows={[
    {metryka: 'Lynis Hardening index'},
    {metryka: 'Liczba usług nasłuchujących (ss -tulpn)'},
    {metryka: 'Liczba ostrzeżeń Lynis (Warnings)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## III. Sekcja 1 — Initial Setup (CIS 1)

<StepByStep>
<Step title="1.1 Wyłączenie nieużywanych systemów plików i modułów (CIS 1.1.1.1–1.1.1.10)">
Zablokuj ładowanie modułów jądra, które rzadko są potrzebne, a bywają wektorem ataku.

```bash
sudo tee /etc/modprobe.d/cis-hardening.conf <<'EOF'
install cramfs /bin/true
install freevxfs /bin/true
install jffs2 /bin/true
install hfs /bin/true
install hfsplus /bin/true
install udf /bin/true
install usb-storage /bin/true
EOF
# Weryfikacja (powinno nic nie załadować)
modprobe -n -v cramfs
```

<KeywordAnswer
  title="Po co blokować usb-storage?"
  question="Dlaczego w środowiskach o podwyższonym bezpieczeństwie blokuje się moduł usb-storage?"
  keywords={['USB', 'nośnik', 'nosnik', 'wyciek', 'danych', 'malware', 'fizyczn', 'kontrol']}
  explanation="Blokada usb-storage uniemożliwia montowanie pendrive’ów i dysków USB — ogranicza wyciek danych na nośniki wymienne oraz wniesienie złośliwego oprogramowania przez port USB. To kontrola dostępu fizycznego na poziomie jądra."
  storageKey="hd-usb"
/>
</Step>

<Step title="1.2 Opcje montowania katalogów — noexec, nosuid, nodev (CIS 1.1.2)">
Katalogi na dane użytkownika i tymczasowe nie powinny pozwalać na uruchamianie programów ani plików SUID. Sprawdź bieżące montowania i dodaj opcje (dla `/tmp` najlepiej osobna partycja lub `tmpfs`).

```bash
findmnt /tmp /var/tmp /dev/shm /home 2>/dev/null
# Przykład dla /dev/shm w /etc/fstab:
#   tmpfs   /dev/shm   tmpfs   defaults,noexec,nosuid,nodev   0 0
sudo nano /etc/fstab
sudo mount -o remount /dev/shm
findmnt /dev/shm          # sprawdź, czy opcje są aktywne
```
</Step>

<Step title="1.3 Utwardzenie procesów — ASLR, core dumps, AppArmor (CIS 1.3.1, 1.5.4, 1.5.9, 1.5.10)">
```bash
# ASLR
sudo tee /etc/sysctl.d/60-cis-kernel.conf <<'EOF'
kernel.randomize_va_space = 2
fs.suid_dumpable = 0
EOF
sudo sysctl --system

# Ograniczenie zrzutów pamięci (core dumps)
echo '* hard core 0' | sudo tee /etc/security/limits.d/cis-coredump.conf

# AppArmor – w Debianie domyślny; upewnij się, że działa i wymusza profile
sudo apt install -y apparmor apparmor-utils
sudo systemctl enable --now apparmor
sudo aa-status
```

<KeywordAnswer
  title="AppArmor"
  question="Czym jest AppArmor i jak zwiększa bezpieczeństwo systemu Debian?"
  keywords={['MAC', 'profil', 'ogranicz', 'aplikac', 'dostep', 'dostęp', 'wymusz', 'kontrol']}
  explanation="AppArmor to mechanizm obowiązkowej kontroli dostępu (MAC). Dla poszczególnych programów definiuje profile ograniczające, do jakich plików i zasobów mają dostęp. Nawet przejęta aplikacja może zrobić tylko to, na co pozwala jej profil — ogranicza to skutki włamania."
  storageKey="hd-apparmor"
/>
</Step>

<Step title="1.4 Hasło bootloadera i uprawnienia GRUB (CIS 1.4.1–1.4.2)">
```bash
sudo chown root:root /boot/grub/grub.cfg
sudo chmod 600 /boot/grub/grub.cfg
# Hasło GRUB: grub-mkpasswd-pbkdf2  → wstaw hash do /etc/grub.d/40_custom, potem:
sudo update-grub
```
</Step>

<Step title="1.5 Banery ostrzegawcze i aktualizacje (CIS 1.6.2–1.6.3, 1.6.7–1.6.8, 1.2.2.1)">
```bash
# Baner prawny przed logowaniem
echo "Dostep tylko dla autoryzowanych uzytkownikow. Dzialania sa rejestrowane." | sudo tee /etc/issue /etc/issue.net
sudo chmod 644 /etc/issue /etc/issue.net

# Automatyczne aktualizacje bezpieczeństwa
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

<EditableTable
  title="Tab. 2 Initial Setup — weryfikacja"
  storageKey="hd-fs"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'Moduły cramfs/usb-storage zablokowane'},
    {kontrola: '/dev/shm z noexec,nosuid,nodev'},
    {kontrola: 'kernel.randomize_va_space = 2'},
    {kontrola: 'AppArmor w trybie enforce (aa-status)'},
    {kontrola: 'Baner /etc/issue ustawiony'},
    {kontrola: 'unattended-upgrades włączone'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## IV. Sekcja 2 — Services (CIS 2)

<StepByStep>
<Step title="2.1 Usunięcie usług specjalnego przeznaczenia (CIS 2.1)">
Usuń lub wyłącz usługi, których maszyna nie pełni (serwer X, druk, NFS, DNS, poczta itp.).

```bash
# Przegląd nasłuchujących i uruchomionych
sudo ss -tulpn
systemctl list-units --type=service --state=running

# Przykłady wyłączeń (dostosuj do roli maszyny!)
sudo systemctl disable --now avahi-daemon cups rpcbind nfs-server 2>/dev/null
sudo apt purge -y xserver-xorg* 2>/dev/null   # jeśli to serwer bez GUI
sudo apt autoremove --purge -y
```
</Step>

<Step title="2.2 Klienci sieciowi i synchronizacja czasu (CIS 2.2, 2.3)">
```bash
# Usuń przestarzałych/niebezpiecznych klientów, jeśli nie są potrzebne
sudo apt purge -y telnet rsh-client 2>/dev/null

# Synchronizacja czasu (ważna dla logów i certyfikatów)
sudo systemctl enable --now systemd-timesyncd
timedatectl status
```

<EditableTable
  title="Tab. 3 Services — audyt"
  storageKey="hd-services"
  columns={[
    {key: 'usluga', label: 'Usługa', readOnly: true},
    {key: 'stan', label: 'Stan (aktywna / wyłączona / usunięta)'},
    {key: 'uzasadnienie', label: 'Uzasadnienie'},
  ]}
  initialRows={[
    {usluga: 'avahi-daemon'},
    {usluga: 'cups'},
    {usluga: 'rpcbind / nfs'},
    {usluga: 'telnet / rsh (klient)'},
    {usluga: 'synchronizacja czasu'},
  ]}
  allowAddRows={true}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## V. Sekcja 3 — Network Configuration (CIS 3 i 4)

<StepByStep>
<Step title="3.1 Parametry sieciowe jądra — sysctl (CIS 3.3)">
```bash
sudo tee /etc/sysctl.d/60-cis-network.conf <<'EOF'
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.tcp_syncookies = 1
net.ipv6.conf.all.accept_ra = 0
EOF
sudo sysctl --system
```

<KeywordAnswer
  title="tcp_syncookies"
  question="Przed jakim atakiem chroni włączenie net.ipv4.tcp_syncookies?"
  keywords={['SYN flood', 'SYN', 'flood', 'wyczerp', 'kolejk', 'DoS', 'poloczen', 'połączen']}
  explanation="SYN cookies chronią przed atakiem SYN flood — zalewaniem serwera pakietami SYN, które wypełniają kolejkę półotwartych połączeń i blokują obsługę prawdziwych klientów (DoS). Mechanizm pozwala obsłużyć połączenia bez utrzymywania stanu dla każdego niedokończonego SYN."
  storageKey="hd-syncookies"
/>
</Step>

<Step title="3.2 Zapora hosta — UFW (CIS 4.1.1–4.1.4)">
Debian domyślnie używa **nftables**; `ufw` jest wygodną nakładką. Ustaw domyślne odrzucanie ruchu przychodzącego.

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp          # tylko jeśli potrzebujesz SSH
sudo ufw enable
sudo ufw status verbose
```

<EditableTable
  title="Tab. 4 Network — weryfikacja"
  storageKey="hd-net"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'ip_forward = 0 (host nieroutujący)'},
    {kontrola: 'accept_redirects = 0'},
    {kontrola: 'tcp_syncookies = 1'},
    {kontrola: 'UFW: domyślnie deny incoming'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## VI. Sekcja 4 — Access Control (CIS 5)

<StepByStep>
<Step title="4.1 sudo (CIS 5.2.1–5.2.3)">
```bash
sudo apt install -y sudo
# Wymagaj terminala i loguj komendy sudo
echo 'Defaults use_pty'                              | sudo tee /etc/sudoers.d/cis-pty
echo 'Defaults logfile="/var/log/sudo.log"'          | sudo tee /etc/sudoers.d/cis-log
sudo visudo -c        # sprawdź poprawność plików sudoers
```
</Step>

<Step title="4.2 Utwardzenie SSH (CIS 5.1.6, 5.1.8, 5.1.9, 5.1.15, 5.1.18, 5.1.21–5.1.22)">
```bash
sudo tee /etc/ssh/sshd_config.d/60-cis.conf <<'EOF'
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 4
LoginGraceTime 60
ClientAliveInterval 300
ClientAliveCountMax 3
X11Forwarding no
Banner /etc/issue.net
EOF
sudo sshd -t && sudo systemctl restart ssh
sshd -T | grep -Ei 'permitrootlogin|maxauthtries|x11forwarding'
```
</Step>

<Step title="4.3 Polityka haseł i blokada konta — PAM (CIS 5.3.3.1.1, 5.3.3.2.2–5.3.3.2.3, 5.4.1.1, 5.4.1.3)">
```bash
sudo apt install -y libpam-pwquality
# /etc/security/pwquality.conf
sudo sed -i 's/^# *minlen.*/minlen = 14/'   /etc/security/pwquality.conf
sudo sed -i 's/^# *minclass.*/minclass = 4/' /etc/security/pwquality.conf

# Starzenie haseł w /etc/login.defs
sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS 365/' /etc/login.defs
sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS 1/'    /etc/login.defs

# Blokada po nieudanych logowaniach (pam_faillock) – skonfiguruj w /etc/pam.d/
```

<KeywordAnswer
  title="Dlaczego blokować konto po N próbach?"
  question="Jak blokada konta po kilku nieudanych logowaniach utrudnia atak na hasła?"
  keywords={['brute', 'zgadywan', 'slownik', 'słownik', 'spowaln', 'proby', 'próby', 'ogranicz']}
  explanation="Blokada po serii nieudanych prób zatrzymuje atak zgadywania haseł (brute force / słownikowy): napastnik nie może testować tysięcy haseł, bo po kilku błędach konto zostaje czasowo zablokowane. Znacząco spowalnia to atak i czyni go wykrywalnym."
  storageKey="hd-faillock"
/>
</Step>

<Step title="4.4 Konta i dostęp (CIS 5.4.1.5, 5.4.3.3)">
```bash
# Zablokuj bezpośrednie logowanie na roota (pracujemy przez sudo)
sudo passwd -l root
# Konta systemowe nie powinny mieć powłoki logowania
awk -F: '($3 < 1000 && $1 != "root" && $7 ~ /(bash|sh)$/)' /etc/passwd
# Domyślna umask
grep -E 'umask' /etc/login.defs
```

<EditableTable
  title="Tab. 5 Access/Auth — weryfikacja"
  storageKey="hd-access"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'SSH: PermitRootLogin = no'},
    {kontrola: 'SSH: baner i limity sesji ustawione'},
    {kontrola: 'Hasła: minlen 14, minclass 4'},
    {kontrola: 'Starzenie haseł (PASS_MAX_DAYS)'},
    {kontrola: 'sudo loguje komendy, use_pty'},
    {kontrola: 'Logowanie na root zablokowane'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## VII. Sekcja 5 — Logging and Auditing (CIS 6)

<StepByStep>
<Step title="5.1 auditd i reguły (CIS 6.2.1–6.2.3)">
```bash
sudo apt install -y auditd audispd-plugins
sudo systemctl enable --now auditd

# Przykładowe reguły CIS (monitorowanie zmian kont i sudoers)
sudo tee /etc/audit/rules.d/cis.rules <<'EOF'
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k scope
-w /etc/sudoers.d/ -p wa -k scope
-w /var/log/sudo.log -p wa -k actions
EOF
sudo augenrules --load
sudo auditctl -l
```
</Step>

<Step title="5.2 Logi journald i integralność — AIDE (CIS 6.1.1.1, 6.3.1)">
```bash
# Trwałe logi journald
sudo sed -i 's/^#\?Storage=.*/Storage=persistent/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald

# AIDE – kontrola integralności plików
sudo apt install -y aide aide-common
sudo aideinit            # budowa bazy (może chwilę potrwać)
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
sudo aide --check | tail
```

<KeywordAnswer
  title="Do czego służy AIDE?"
  question="Jaką rolę pełni AIDE i jak pomaga wykryć włamanie?"
  keywords={['integraln', 'zmian', 'plik', 'baza', 'hash', 'porówn', 'porown', 'wykry']}
  explanation="AIDE (Advanced Intrusion Detection Environment) tworzy bazę skrótów (hashy) i atrybutów plików systemowych, a następnie porównuje z nią stan bieżący. Każda nieautoryzowana zmiana krytycznego pliku (np. podmieniony plik systemowy po włamaniu) zostaje wykryta jako rozbieżność."
  storageKey="hd-aide"
/>

<EditableTable
  title="Tab. 6 Logging/Audit — weryfikacja"
  storageKey="hd-audit"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: 'auditd aktywny, reguły załadowane (auditctl -l)'},
    {kontrola: 'journald: Storage=persistent'},
    {kontrola: 'AIDE: baza utworzona, aide --check działa'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## VIII. Sekcja 6 — System Maintenance (CIS 7)

<StepByStep>
<Step title="6.1 Uprawnienia plików krytycznych (CIS 7.1.1–7.1.8)">
```bash
# Pliki haseł i kont
sudo chmod 644 /etc/passwd /etc/group
sudo chmod 640 /etc/shadow /etc/gshadow
sudo chown root:shadow /etc/shadow /etc/gshadow

# Weryfikacja
ls -l /etc/passwd /etc/shadow /etc/group /etc/gshadow
```
</Step>

<Step title="6.2 Audyt kont i uprawnień (CIS 7.2.1–7.2.3)">
```bash
# Konta z pustym hasłem (nie powinno być żadnego)
sudo awk -F: '($2 == "") {print $1}' /etc/shadow
# Więcej niż jedno konto z UID 0 (powinien być tylko root)
awk -F: '($3 == 0) {print $1}' /etc/passwd
# Pliki bez właściciela
sudo find / -xdev -nouser -o -nogroup 2>/dev/null | head
```

<EditableTable
  title="Tab. 7 System Maintenance — weryfikacja"
  storageKey="hd-maint"
  columns={[
    {key: 'kontrola', label: 'Kontrola', readOnly: true},
    {key: 'wynik', label: 'Wynik'},
  ]}
  initialRows={[
    {kontrola: '/etc/shadow = 640, root:shadow'},
    {kontrola: 'Brak kont z pustym hasłem'},
    {kontrola: 'Tylko root ma UID 0'},
    {kontrola: 'Brak plików bez właściciela'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

## IX. Weryfikacja końcowa i podsumowanie

<StepByStep>
<Step title="Ponowny audyt Lynis">
```bash
sudo lynis audit system | tee ~/lynis-po.txt | tail -25
# Porównaj z ~/lynis-przed.txt i uzupełnij kolumnę „Po” w Tab. 1
diff <(grep -i 'hardening index' ~/lynis-przed.txt) <(grep -i 'hardening index' ~/lynis-po.txt)
```

<ScreenshotPaste label="Zrzut ekranu: Hardening index przed i po" />
</Step>
</StepByStep>

<Checklist
title="Hardening Debiana — sekcje CIS"
storageKey="hd-check"
sections={[
{ title: 'Ukończone sekcje', items: [
'1. Initial Setup (moduły, montowania, ASLR, AppArmor, banery, aktualizacje)',
'2. Services (usunięte zbędne usługi i klienci, czas)',
'3. Network (sysctl, UFW default deny)',
'4. Access/Auth (sudo, SSH, PAM, konta)',
'5. Logging/Audit (auditd, journald, AIDE)',
'6. System Maintenance (uprawnienia, audyt kont)',
]},
]}
/>

<OpenQuestion
  title="Obrona w głąb na przykładzie Debiana"
  question="Wskaż, jak poszczególne sekcje tworzą razem „obronę w głąb”: podaj po jednym mechanizmie z warstwy jądra/procesów, sieci, uwierzytelniania i wykrywania. Które zmiany mogłyby wpłynąć na działanie usług i jak to kontrolowałeś?"
  modelAnswer="Przykłady warstw: jądro/procesy — AppArmor i ASLR; sieć — sysctl (syncookies, brak redirectów) i UFW default deny; uwierzytelnianie — SSH bez roota, polityka haseł i blokada konta; wykrywanie — auditd i AIDE. Razem tworzą wiele niezależnych barier (defense in depth). Zmiany ryzykowne dla usług to zapora i wyłączanie usług/modułów oraz opcje montowania (noexec) — kontrolowane testami po każdej sekcji, analizą logów i możliwością powrotu z migawki."
  minLength={120}
  storageKey="hd-wnioski"
/>

:::danger Po zajęciach
Jeśli ćwiczenie było testowe, przywróć maszynę z migawki `przed-hardeningiem`. Jeśli stan ma zostać — zrób migawkę `debian-hardened`.
:::

[^cis]: Center for Internet Security, **CIS Debian Linux 13 Benchmark v1.1.0**, cisecurity.org. Numery zaleceń (np. „CIS 1.1.1.10”) odnoszą się do tej wersji dokumentu; pełne opisy, uzasadnienia oraz procedury audytu i naprawy znajdują się w benchmarku.
