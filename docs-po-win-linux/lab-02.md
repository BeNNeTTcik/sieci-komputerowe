---
sidebar_position: 2
title: "Laboratorium 2: Tożsamość, kontrola dostępu i ochrona danych"
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

# Laboratorium 2: Tożsamość, kontrola dostępu i ochrona danych

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium 2: Tożsamość, kontrola dostępu i ochrona danych"
  storageKey="win-lab-2"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-lab-2"
  storageKeys={['win-lab-2','win2-linux-upr','win2-acl','win2-win-ntfs','win2-wnioski']}
  sharedPrefix="win2_"
/>

:::danger Pracuj na maszynie laboratoryjnej
Wykonuj ćwiczenia na maszynie wirtualnej z migawką. Konta i hasła są wyłącznie testowe.
:::

## I. Wprowadzenie

<div className="justify">
**Tożsamość i kontrola dostępu** to odpowiedź na trzy pytania: kto to jest (**uwierzytelnianie**, *authentication*), co mu wolno (**autoryzacja**, *authorization*) i co faktycznie zrobił (**rozliczalność**, *accounting*). Razem składa się to na model **AAA**. Nadrzędną zasadą jest **najmniejszych uprawnień** (*least privilege*): każdy użytkownik i proces dostaje tylko te prawa, które są niezbędne do pracy.
</div>

<div className="justify">
Współczesnym rozwinięciem tej zasady jest **model zerowego zaufania** (zero trust). W tym modelu nie ufa się nikomu „z automatu” nawet użtykownikom znajdujacym się w sieci wewnętrznej. Każdy dostęp jest weryfikowany, nadawany na minimalnym poziomie i zakładamy, że naruszenie już nastąpiło (*assume breach*). Filarami są m.in. silne uwierzytelnianie (w tym **wieloskładnikowe, MFA**), nadawanie uprawnień per zasób oraz ciągła weryfikacja [^nist-207][^zerotrust].
</div>

<div className="justify">
**Ochrona danych** to dbałość o trzy własności informacji (**triada CIA**) [^nist-800-12]:
- **poufność** (Confideniality) - dane mają być widoczne tylko dla uprawnionych osób.,
- **integralność** (Integrity) - dane są dokładne, kompletne i niezmienione bez autoryzacji,
- **dostępność** (Availability) - dane są dostępne wtedy, gdy są potrzebne.

Dane występują w **trzech stanach**, gdzie każdy ze stanów chroni się inaczej:
- **w spoczynku (at rest)** - obejmuje pliki na dysku, kopie zapasowe; ochrona jako: szyfrowanie dysku/woluminu/plików (np. BitLocker [^bitlocker], LUKS [^luks]) [^nist-111]
- **w tranzycie (in transit)** - przesyłanie danych (ruch sieciowy, SSH, HTTPS); chronimy szyfrowaniem transmisji (TLS, SSH)
- **w użytku (in use)** - dane znajdujące się w pamięci dziłającego procesu; chronimy kontrolą dostępu, izolacj

</div>

<div className="justify"> </div>

## II. Zadania do wykonania

### Tożsamość: konta, grupy i podnoszenie uprawnień

<StepByStep>
<Step title="Debian - konta, grupy i sudo">
Wykonaj poniższe komendy w CLI Debiana.

```bash
# Utwórz konto zwykłego użytkownika i konto „administratora” (w grupie sudo)
sudo useradd -m -s /bin/bash pracownik
sudo passwd pracownik
sudo useradd -m -s /bin/bash admin1
sudo usermod -aG sudo admin1

# Zweryfikuj tożsamość i uprawnienia
id pracownik
id admin1
getent group sudo

# Sprawdź, że zwykły użytkownik NIE może użyć sudo
sudo -u pracownik sudo -n true 2>&1 | head -1
```

Uzupełnij Tabele 1 danymi wykorzystanymi w powyższych komendach.
</Step>

<Step title="Windows 11 — konta lokalne i grupy">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
# Utwórz konto standardowe i dodaj drugie do administratorów
New-LocalUser -Name "pracownik" -NoPassword:$false -Description "Konto testowe"
Add-LocalGroupMember -Group "Users" -Member "pracownik"

New-LocalUser -Name "admin1"
Add-LocalGroupMember -Group "Administratorzy" -Member "admin1"   # lub "Administrators"

# Weryfikacja
Get-LocalUser | Select-Object Name, Enabled
Get-LocalGroupMember -Group "Administratorzy"

# Wyłącz konto Gość, jeśli aktywne
Get-LocalUser -Name "Gość","Guest" -ErrorAction SilentlyContinue | Disable-LocalUser
```

Uzupełnij Tabele 1 danymi wykorzystanymi w powyższych komendach.
</Step>
</StepByStep>

<EditableTable
  title="Tab. 1 Konta i role"
  storageKey="l2z-konta-tab"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'konto', label: 'Konto'},
    {key: 'rola', label: 'Rola (standard / administrator)'},
    {key: 'uzasadnienie', label: 'Uzasadnienie (least privilege)'},
  ]}
  initialRows={[
    {system: 'Debian'},
    {system: 'Debian'},
    {system: 'Windows 11'},
    {system: 'Windows 11'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Uwierzytelnianie: polityka haseł i blokada konta

<StepByStep>
<Step title="Debian - polityka haseł i starzenie">
Wykonaj poniższe komendy w CLI Debiana.

```bash
sudo apt install -y libpam-pwquality
# /etc/security/pwquality.conf
sudo sed -i 's/^# *minlen.*/minlen = 12/'    /etc/security/pwquality.conf
sudo sed -i 's/^# *minclass.*/minclass = 3/' /etc/security/pwquality.conf

# Starzenie hasła dla konta testowego
sudo chage -M 90 -m 1 -W 7 pracownik
sudo chage -l pracownik
```

Uzupełnij Tabele 2 danymi wykorzystanymi w powyższych komendach.
</Step>

<Step title="Windows 11 - polityka haseł i blokady konta">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
net accounts /minpwlen:12 /maxpwage:90 /minpwage:1 /uniquepw:5
net accounts /lockoutthreshold:5 /lockoutduration:15 /lockoutwindow:15
net accounts
```

Uzupełnij Tabele 2 danymi wykorzystanymi w powyższych komendach.
</Step>
</StepByStep>

<EditableTable
  title="Tab. 2 Polityka uwierzytelniania"
  storageKey="l2z-hasla-tab"
  columns={[
    {key: 'parametr', label: 'Parametr', readOnly: true},
    {key: 'debian', label: 'Debian'},
    {key: 'win', label: 'Windows 11'},
  ]}
  initialRows={[
    {parametr: 'Min. długość hasła'},
    {parametr: 'Maks. okres ważności'},
    {parametr: 'Próg blokady konta'},
    {parametr: 'Złożoność / klasy znaków'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

### Kontrola dostępu: uprawnienia plików

<StepByStep>
<Step title="Debian - uprawnienia i listy ACL">
Wykonaj poniższe komendy w CLI Debiana.

```bash
# Plik z danymi i dwa konta testowe (z zadania II)
echo "dane poufne pracownika" | sudo tee /srv/akta.txt
sudo chmod 600 /srv/akta.txt
sudo chown admin1 /srv/akta.txt

# Standardowe uprawnienia nie wystarczą, gdy dostęp ma mieć JEDEN dodatkowy user → ACL
sudo setfacl -m u:pracownik:r /srv/akta.txt
getfacl /srv/akta.txt

# Testy dostępu
sudo -u pracownik cat /srv/akta.txt      # odczyt – powinien zadziałać (ACL r)
sudo -u pracownik bash -c 'echo X >> /srv/akta.txt' 2>&1 | head -1   # zapis – odmowa
```

Uzupełnij Tabele 3 danymi wykorzystanymi w powyższych komendach.

<EditableTable
  title="Tab. 3 Testy dostępu (Debian)"
  storageKey="l2z-acl"
  columns={[
    {key: 'test', label: 'Test', readOnly: true},
    {key: 'wynik', label: 'Wynik (dozwolone / odmowa)'},
  ]}
  initialRows={[
    {test: 'admin1 odczyt /srv/akta.txt'},
    {test: 'pracownik odczyt (ACL r)'},
    {test: 'pracownik zapis'},
    {test: 'inny użytkownik bez wpisu ACL'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>

<Step title="Windows 11 - uprawnienia NTFS">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
New-Item -ItemType Directory C:\LabAkta -Force
"dane poufne" | Out-File C:\LabAkta\akta.txt

# Podejrzyj bieżące uprawnienia
icacls C:\LabAkta

# Zasada najmniejszych uprawnień: usuń dziedziczenie i nadmiarowy dostęp, dodaj tylko potrzebny
icacls C:\LabAkta /inheritance:r
icacls C:\LabAkta /grant:r "admin1:(OI)(CI)F" "pracownik:(OI)(CI)R"
icacls C:\LabAkta
```


Uzupełnij Tabele 4 danymi wykorzystanymi w powyższych komendach.
<EditableTable
  title="Tab. 4 Uprawnienia NTFS"
  storageKey="l2z-ntfs"
  columns={[
    {key: 'podmiot', label: 'Konto / grupa', readOnly: true},
    {key: 'przed', label: 'Dostęp przed'},
    {key: 'po', label: 'Dostęp po'},
  ]}
  initialRows={[
    {podmiot: 'admin1'},
    {podmiot: 'pracownik'},
    {podmiot: 'Users (dziedziczone)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
</Step>
</StepByStep>

### Ochrona danych: szyfrowanie w spoczynku

<StepByStep>
<Step title="Debian - zaszyfrowany kontener LUKS">
Zaszyfrujemy „sejf” w pliku (bez przebudowy dysku). Wykonaj poniższe komendy w CLI Debiana.

```bash
sudo apt install -y cryptsetup
# Utwórz plik-kontener 50 MB
dd if=/dev/zero of=$HOME/sejf.img bs=1M count=50
# Zaszyfruj (LUKS) — podasz hasło (laboratoryjne)
sudo cryptsetup luksFormat $HOME/sejf.img
# Otwórz, sformatuj i zamontuj
sudo cryptsetup luksOpen $HOME/sejf.img sejf
sudo mkfs.ext4 /dev/mapper/sejf
sudo mkdir -p /mnt/sejf && sudo mount /dev/mapper/sejf /mnt/sejf
echo "tajne dane" | sudo tee /mnt/sejf/tajne.txt

# Zamknięcie: po odmontowaniu i zamknięciu dane są nieczytelne bez hasła
sudo umount /mnt/sejf
sudo cryptsetup luksClose sejf
sudo cryptsetup luksDump $HOME/sejf.img | head
```

Uzupełnij Tabele 5 danymi wykorzystanymi w powyższych komendach.
</Step>

<Step title="Windows 11 - BitLocker i szyfrowanie plików">
Wykonaj poniższe komendy w PowerShell jako administrator.

```powershell
# Stan szyfrowania dysku (BitLocker wymaga TPM — masz go z Lab 0)
Get-BitLockerVolume
manage-bde -status C:

# Szyfrowanie pojedynczego folderu plikowym EFS (bez restartu)
New-Item -ItemType Directory C:\LabPoufne -Force
"tajne dane" | Out-File C:\LabPoufne\tajne.txt
cipher /e /s:C:\LabPoufne
cipher /c C:\LabPoufne\tajne.txt
```

Uzupełnij Tabele 5 danymi wykorzystanymi w powyższych komendach.

:::warning Klucz odzyskiwania
Włączając BitLocker, zapisz **klucz odzyskiwania** w bezpiecznym miejscu. Dla EFS utrata profilu/certyfikatu użytkownika = utrata dostępu do zaszyfrowanych plików.
:::
</Step>
</StepByStep>

<EditableTable
  title="Tab. 5 Ochrona danych w spoczynku"
  storageKey="l2z-dane-tab"
  columns={[
    {key: 'system', label: 'System', readOnly: true},
    {key: 'mechanizm', label: 'Mechanizm', readOnly: true},
    {key: 'zakres', label: 'Co chroni (dysk / kontener / plik)'},
    {key: 'wynik', label: 'Zweryfikowano?'},
  ]}
  initialRows={[
    {system: 'Debian', mechanizm: 'LUKS (cryptsetup)'},
    {system: 'Windows 11', mechanizm: 'BitLocker'},
    {system: 'Windows 11', mechanizm: 'EFS (cipher)'},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

:::danger Po zajęciach
Przywróć maszyny wirtualne z migawki sprzed laboratorium albo pozostaw je w znanym, czystym stanie.
:::

[^nist-207]: S. Rose i in., [NIST SP 800-207 — Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final), NIST, 2020.

[^zerotrust]: R. Rais, C. Morillo, E. Gilman, D. Barth, *Zero Trust Networks*, wyd. 2, O'Reilly, 2024 — rozdz. 1 „Zero Trust Fundamentals” (pięć założeń, płaszczyzna sterowania i danych).

[^nist-111]: K. Scarfone, M. Souppaya, M. Sexton, [NIST SP 800-111 — Guide to Storage Encryption Technologies for End User Devices](https://csrc.nist.gov/pubs/sp/800/111/final), NIST, 2007.

[^nist-800-12]: M. Nieles, K. Dempsey, V. Pillitteri, [NIST SP 800-12 Rev. 1 — An Introduction to Information Security](https://csrc.nist.gov/pubs/sp/800/12/r1/final), NIST, 2017.

[^bitlocker]: Microsoft, [BitLocker overview](https://learn.microsoft.com/windows/security/operating-system-security/data-protection/bitlocker/), learn.microsoft.com.

[^luks]: [cryptsetup / LUKS — dokumentacja i FAQ](https://gitlab.com/cryptsetup/cryptsetup).