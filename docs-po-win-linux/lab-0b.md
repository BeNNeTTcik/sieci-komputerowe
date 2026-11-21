---
sidebar_position: 0.8
title: "Wstęp do pracy w Windows 11 i Debian"
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
import PermissionCalculator from '@site/src/components/Permissioncalculator';

# Laboratorium wstępne: Podstawy pracy w Windows 11 i Debian

<SprawozdanieHeader
  thema="Utwardzanie systemu Windows i Linux"
  exerciseTitle="Laboratorium wstępne: Podstawy pracy w Windows 11 i Debian"
  storageKey="win-podstawy"
  solo
/>

<ProjectSaveLoad
  thema="Utwardzanie systemu Windows i Linux"
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="win-podstawy"
  storageKeys={['win-podstawy','winp-debian','winp-win','winp-mapa','winp-gotowosc','winp-wnioski']}
  sharedPrefix="winp_"
/>

:::note Warunek wstępny
Pracuj na maszynach przygotowanych w [Laboratorium 0](./lab-00) (migawki `debian-baza`, `win11-baza`). Celem jest **swobodne poruszanie się po obu systemach** z wiersza poleceń — to fundament, na którym opierają się kolejne laboratoria z utwardzania.
:::

## I. Wprowadzenie

<div className="justify">
Administracja i utwardzanie systemu odbywają się głównie z **wiersza poleceń**: w Debianie przez powłokę **bash**, w Windows przez **PowerShell**. Oba środowiska realizują te same zadania (nawigacja, pliki, pakiety, użytkownicy, usługi, sieć, logi), choć różnią się składnią. Poniżej przedstawiono podstawowe komendy do pracy w systemach Windows oraz Debian.
</div>

## Debian - bash

<StepByStep>
<Step title="Orientacja i pomoc">
```bash
whoami            # kim jestem
hostname          # nazwa maszyny
pwd               # bieżący katalog
uname -a          # informacje o systemie i jądrze
ls --help         # krótka pomoc polecenia
man ls            # pełna dokumentacja (q = wyjście)
```
</Step>

<Step title="Nawigacja i pliki">
```bash
cd /etc           # przejście do katalogu
ls -la            # zawartość ze szczegółami i plikami ukrytymi
cd ~              # powrót do katalogu domowego
mkdir lab         # utworzenie katalogu
cd lab
echo "test" > plik.txt     # utworzenie pliku
cat plik.txt               # podgląd zawartości
cp plik.txt kopia.txt      # kopiowanie
mv kopia.txt druga.txt     # zmiana nazwy / przeniesienie
rm druga.txt               # usunięcie
```
</Step>

<Step title="Pakiety (apt)">
```bash
sudo apt update                 # odświeżenie listy pakietów
apt search htop                 # wyszukanie pakietu
sudo apt install -y htop        # instalacja
dpkg -l | grep htop             # sprawdzenie, czy zainstalowany
sudo apt remove -y htop         # usunięcie
```
</Step>

<Step title="Użytkownicy i uprawnienia">
```bash
id                       # mój UID, GID i grupy
getent passwd | tail     # konta w systemie
sudo useradd -m test1    # utworzenie konta testowego
ls -l plik.txt           # odczyt uprawnień (rwx)
chmod 640 plik.txt       # zmiana uprawnień
sudo chown root plik.txt # zmiana właściciela
```
</Step>

<Step title="Usługi i procesy">
```bash
systemctl list-units --type=service --state=running   # uruchomione usługi
systemctl status ssh                                   # stan usługi
sudo systemctl restart ssh                             # restart usługi
ps aux | head                                          # procesy
top                                                    # podgląd na żywo (q = wyjście)
```
</Step>

<Step title="Sieć">
```bash
ip a                     # adresy interfejsów
ip route                 # tablica routingu
ping -c3 debian.org      # test łączności
ss -tulpn                # porty nasłuchujące
journalctl -p err -b     # błędy z bieżącego uruchomienia
```
</Step>
</StepByStep>

## Windows 11 - PowerShell

<StepByStep>
<Step title="Orientacja i pomoc">
Uruchom **PowerShell jako administrator**.
```powershell
whoami                                                          # kim jestem
$env:COMPUTERNAME                                               # nazwa maszyny
Get-Location                                                    # bieżący katalog
Get-ComputerInfo -Property WindowsProductName, OsVersion        # informacje o systemie
Get-Help Get-ChildItem                                          # pomoc do polecenia
Get-Command *service*                                           # wyszukanie poleceń
```
</Step>

<Step title="Nawigacja i pliki">
```powershell
Set-Location C:\                      # przejście do katalogu
Get-ChildItem -Force                  # zawartość z plikami ukrytymi
Set-Location $HOME                    # przejscie do katalogu domowego
New-Item -ItemType Directory lab      # nowy folder o nazwie lab
Set-Location lab                      # wejscie do folderu lab
"test" | Out-File plik.txt            # utworzenie pliku
Get-Content plik.txt                  # podgląd zawartości
Copy-Item plik.txt kopia.txt          # kopiuje plik.txt do nowego pliku kopia.txt
Rename-Item kopia.txt druga.txt       # zmiana nazwy z kopia.txt na druga.txt
Remove-Item druga.txt                 # usuniecie pliku druga.txt
```
</Step>

<Step title="Pakiety (winget)">
```powershell
winget search 7zip                  # wyszukanie pakietu
winget install --id 7zip.7zip -e    # instalacja
winget list                         # zainstalowane pakiety
winget uninstall --id 7zip.7zip     # usunięcie
```
</Step>

<Step title="Użytkownicy i uprawnienia">
```powershell
Get-LocalUser                                   # konta lokalne
Get-LocalGroupMember -Group "Administratorzy"   # lub "Administrators"
icacls $HOME\lab\plik.txt                       # uprawnienia pliku (NTFS)
```
</Step>

<Step title="Usługi i procesy">
```powershell
Get-Service | Where-Object Status -eq 'Running' | Sort-Object DisplayName   # aktywne usługi
Get-Service -Name Spooler                                                   # stan konkretnej usługi
Restart-Service -Name Spooler                                               # restart usługi
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10         # pierwsze 10 procesów
```
</Step>

<Step title="Sieć i zdarzenia">
```powershell
Get-NetIPConfiguration                                                                      # konfiguracja sieci
Test-NetConnection microsoft.com                                                            # test łączności
Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess   # nasłuchiwane porty
Get-WinEvent -LogName System -MaxEvents 10                                                  # ostatnie zdarzenia systemowe
```
</Step>
</StepByStep>

## Kalkulator uprawnień do plików

<PermissionCalculator />

:::danger Po zajęciach
Usuń utworzone pliki i konta testowe (`sudo userdel -r test1`, `Remove-Item` katalogu `lab`) albo przywróć maszyny z migawek bazowych.
:::
