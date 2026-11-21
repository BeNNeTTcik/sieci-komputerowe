---
sidebar_position: 0.5
title: "Przygotowanie środowiska (VirtualBox, migawki)"
---

<!--- import bibliotek -->
import EditableTable from '@site/src/components/EditableTable';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';

# Przygotowanie środowiska pracy

:::warning Informacja
Kurs **nie jest powiązany** z firmami **Oracle, Microsoft** ani z projektem **Linux** i nie jest przez nie wspierany ani autoryzowany. Użycie powyższych nazw nie sugeruje żadnego związku ani poparcia.
:::

<div className="justify">
Wszystkie laboratoria wykonujesz na **maszynach wirtualnych** (**Windows 11** oraz **Debian Linux**). Ta strona opisuje, jak przygotować środowisko i jak pracować z **migawkami**. Do nich odwołuje się każde laboratorium.
</div>

## Oprogramowanie do wirtualizacji

<div className="justify">
Kurs jest przygotowany pod **VirtualBox (pakiet bazowy)[^virtualbox]**, który jest oprogramowaniem otwartym (licencja GPLv2) i można go używać bez opłat, także w celach edukacyjnych i komercyjnych.

:::warning Extension Pack — nieobowiązkowy i na innej licencji
Oracle **VM VirtualBox Extension Pack** (USB 2.0/3.0, RDP, PXE, szyfrowanie dysku VM) jest objęty licencją **PUEL**, który jest darmową wyłącznie do użytku osobistego/edukacyjnego/ewaluacji, a **użycie komercyjne wymaga płatnej licencji**.
:::

:::note Alternatywy w pełni otwarte
Zamiast VirtualBox możesz użyć **QEMU/KVM z virt-manager** (open source) albo **Hyper-V** (wbudowany w Windows Pro). Polecenia w systemie gościa są identyczne; zmienia się tylko narzędzie do zarządzania maszynami.
:::
</div>

## Utworzenie maszyn

### Maszyna wirtualna z Debianem

<StepByStep>
<Step title="Utworzenie maszyny">
Pobierz obraz **Debian netinst** z [debian.org](https://www.debian.org) i utwórz maszynę w VirtualBox:
- Typ: Linux, wersja: Debian (64-bit)
- Pamięć: 2048 MB
- Procesory: 2
- Dysk: 20 GB (dynamiczny)
- Sieć: na początek **NAT** (dostęp do internetu do pobrania pakietów)

:::info Kilka kart sieciowych
Z doświadczenia polecam skonfigurować maszynie dwie karty sieciowe: pierwszą w trybie **sieci host-only** (dostęp do maszyny z komputera gospodarza, np. przez SSH) oraz drugą w trybie **NAT** (dostęp maszyny do internetu, np. do pobierania pakietów).
:::
</Step>

<Step title="Instalacja minimalna">
Zainstaluj system w wariancie minimalnym:
- W wyborze oprogramowania **odznacz środowisko graficzne** (chyba że go potrzebujesz) i pozostaw **standardowe narzędzia systemowe** oraz **serwer SSH**.
- Utwórz konto zwykłego użytkownika (do pracy) — **nie będziemy pracować jako root**.
</Step>

<Step title="Aktualizacja i narzędzia bazowe">
Po pierwszym uruchomieniu zaktualizuj system i zainstaluj podstawowe narzędzia używane w kolejnych laboratoriach.

```bash
su -                       # lub skonfiguruj sudo (niżej)
apt update && apt upgrade -y
apt install -y sudo curl nano ufw net-tools
# Dodaj swoje konto do grupy sudo, potem wyloguj się i zaloguj ponownie
usermod -aG sudo twoj_uzytkownik
```

Sprawdź wersję i stan systemu:

```bash
cat /etc/os-release
ip a
sudo systemctl status ssh
```
</Step>

<Step title="Migawka bazowa">
Najczystszy punkt startowy uzyskasz, robiąc migawkę na **wyłączonej** maszynie (mniejszy plik, brak zrzutu RAM). Wykonaj migawkę o nazwie **`debian-baza`** (patrz [Praca z migawkami (snapshots)](#praca-z-migawkami-snapshots)).
</Step>
</StepByStep>

### Maszyna wirtualna z Windows 11

<StepByStep>
<Step title="Utworzenie maszyny (wymagania Windows 11)">
Windows 11 wymaga **UEFI, Secure Boot i TPM 2.0** (VirtualBox 7 je obsługuje) minimalnego zestawu parametrów maszyny:
- Typ: Microsoft Windows, wersja: Windows 11 (64-bit)
- Pamięć: 4096 MB
- Procesory: 2
- Dysk: 64 GB
- W ustawieniach **System → włącz EFI**, dodaj **TPM 2.0**, włącz **Secure Boot**.
- Sieć: na początek **NAT** (dostęp do internetu do pobrania pakietów)

:::info Kilka kart sieciowych
Z doświadczenia polecam skonfigurować maszynie dwie karty sieciowe: pierwszą w trybie **sieci host-only** (dostęp do maszyny z komputera gospodarza, np. przez SSH) oraz drugą w trybie **NAT** (dostęp maszyny do internetu, np. do pobierania pakietów).
:::
</Step>

<Step title="Instalacja i konto lokalne">
Zainstaluj Windows 11. Podczas konfiguracji wstępnej (OOBE) utwórz **konto lokalne** (do celów laboratoryjnych wygodniejsze niż konto Microsoft).

:::note
Jeśli instalator wymusza konto Microsoft i połączenie z siecią, można przerwać ten krok kombinacją **Shift+F10** → `OOBE\BYPASSNRO` (restart i konfiguracja offline) lub `start ms-cxh:localonly` (uruchomi dodatkowe okno do konfiguracji użytkownika), zgodnie z dokumentacją Microsoftu. Stosuj wyłącznie na maszynie laboratoryjnej.
:::
</Step>

<Step title="Aktualizacja i stan wyjściowy">
Uruchom Windows Update i doprowadź system do aktualnego stanu. Następnie w **PowerShell (jako administrator)** sprawdź stan wyjściowy:

```powershell
# Wersja systemu
winver            # okno z wersją; lub:
Get-ComputerInfo -Property WindowsProductName, OsVersion, OsHardwareAbstractionLayer

# Stan zabezpieczeń bazowych
Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, AMServiceEnabled
Get-NetFirewallProfile | Select-Object Name, Enabled
(Get-Tpm).TpmPresent
```

</Step>

<Step title="Migawka bazowa">
Najczystszy punkt startowy uzyskasz, robiąc migawkę na **wyłączonej** maszynie (mniejszy plik, brak zrzutu RAM). Wykonaj migawkę o nazwie **`win11-baza`** (patrz [Praca z migawkami (snapshots)](#praca-z-migawkami-snapshots)).
</Step>
</StepByStep>

## Praca z migawkami (snapshots)

**Migawka** to zapis stanu maszyny w danej chwili: dysk, ustawienia, a przy włączonej maszynie także zawartość RAM. Pozwala cofnąć wszystkie zmiany zrobione po jej utworzeniu.

### Tworzenie migawki
1. Zaznacz maszynę → otwórz panel **Snapshots** (Migawki).
2. Kliknij **Take** (Utwórz).
3. Nadaj mówiącą nazwę, np. `czysty-system-przed-lab1`, dodaj opis.
4. Zatwierdź — migawka pojawi się w drzewie, a bieżący stan jako **Current State**.

### Przywracanie migawki
1. Wyłącz maszynę (Power Off).
2. Zaznacz migawkę w drzewie → **Restore** (Przywróć).
3. Gdy VirtualBox zapyta o zapisanie bieżącego stanu — zwykle **odznacz** (nie chcesz zachowywać zmian po laborce).
4. Uruchom maszynę — jest w stanie sprzed zmian.

### Usuwanie migawki
- Zaznacz migawkę → **Delete**. To nie przywraca stanu, tylko scala zmiany i zwalnia miejsce.

## Dobre praktyki

<div className="justify">
- **Migawkę rób przed każdym laboratorium** i po udanej konfiguracji. Zamiast stawiać system od zera, wracasz do punktu.
- **Migawka to nie kopia zapasowa** ponieważ znajduje się na tym samym dysku co maszyna. Do trwałego backupu użyj **File → Export Appliance** (plik `.ova`).
- Po kursie **usuń stare migawki** z czasem zajmują dużo miejsca.

:::danger Zasada bezpiecznej pracowni
Ćwiczenia wykonuj **wyłącznie na maszynach wirtualnych**, nigdy na systemie produkcyjnym. Konta i hasła są tylko testowe. Złośliwe oprogramowanie testujemy wyłącznie bezpiecznym plikiem **EICAR**.
:::


</div>

[^virtualbox]: [WirtualBox](https://www.virtualbox.org) - oficjalna strona oprogramowania.