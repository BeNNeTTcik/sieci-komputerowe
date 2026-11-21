---
sidebar_position: 0
title: Strona główna
---

# Utwardzanie systemu Windows i Linux — instrukcje laboratoryjne

Witaj w materiałach do przedmiotu **Utwardzanie systemu Windows i Linux**. Kurs realizowany jest na maszynach wirtualnych **Windows 11** oraz **Debian Linux** i składa się z laboratorium przygotowawczego oraz sześciu laboratoriów tematycznych:

- **[Przygotowanie środowiska](./00-srodowisko)** — VirtualBox i praca z migawkami
- **Laboratorium 1** — Utwardzona instalacja i konfiguracja systemów operacyjnych (3 h)
- **Laboratorium 2** — Tożsamość, kontrola dostępu i ochrona danych (2 h)
- **Laboratorium 3** — Wykrywanie zagrożeń i ochrona przed złośliwym oprogramowaniem (1 h)
- **Laboratorium 4** — Automatyzacja i administracja systemem (1 h)
- **Laboratorium 5** — Logowanie, audyt i bezpieczeństwo sieciowe hosta (2 h)
- **Laboratorium 6** — Wirtualizacja, konteneryzacja i środowiska chmurowe (1 h)

## Zaliczenie przedmiotu

"..." [^sylabus]

[^sylabus]: [Karty przedmiotów](/) Wydział Informatyki, Studia podyplomowe, Niestacjonarne, s. X.

## Środowisko pracy

<div className="justify">
Laboratoria wykonuje się na **maszynach wirtualnych** (**Windows 11** oraz **Debian Linux**) uruchomionych w [VirtualBox](https://www.virtualbox.org) (pakiet bazowy, licencja otwarta) lub innym narzędziu wirtualizacji.
</div>

:::danger Zasada bezpiecznej pracowni
Wszystkie ćwiczenia wykonuj **wyłącznie na maszynach wirtualnych**, nigdy na systemie produkcyjnym. **Przed każdym laboratorium zrób migawkę (snapshot)** maszyny, pozwoli cofnąć zmiany. Konta i hasła zakładane w pracowni służą **tylko do ćwiczeń**. Narzędzia wykrywania zagrożeń testujemy wyłącznie bezpiecznym plikiem testowym EICAR i **nie używamy** prawdziwego złośliwego oprogramowania.
:::

### Narzędzia wykorzystywane podczas zajęć

Poniżej zebrano narzędzia używane w laboratoriach, pogrupowane tematycznie. Wbudowane polecenia systemowe (np. `auditpol`, `icacls`, `secpol.msc`, `sfc`, `ss`) opisano przy konkretnych ćwiczeniach.

#### Wirtualizacja i środowisko

- [VirtualBox](https://www.virtualbox.org) — podstawowe środowisko maszyn wirtualnych (licencja GPLv2); migawki, eksport `.ova`.
- [QEMU](https://www.qemu.org) / [KVM](https://linux-kvm.org) z [virt-manager](https://virt-manager.org) — w pełni otwarta alternatywa dla VirtualBox.
- [Hyper-V](https://learn.microsoft.com/virtualization/hyper-v-on-windows/) — hipernadzorca wbudowany w Windows Pro.

#### Audyt i utwardzanie — Debian / Linux

- [Lynis](https://cisofy.com/lynis/) — audyt konfiguracji i utwardzenia systemów Linux/Unix (Hardening index).
- [OpenSCAP (oscap)](https://www.open-scap.org/) — weryfikacja zgodności z profilami SCAP/SSG.
- [CIS-CAT](https://www.cisecurity.org/cybersecurity-tools/cis-cat-pro) — ocena zgodności z benchmarkami CIS.
- [AIDE](https://aide.github.io/) — kontrola integralności plików (baza skrótów).
- [debsums](https://packages.debian.org/stable/debsums) — weryfikacja integralności plików z pakietów .deb.
- [AppArmor](https://apparmor.net) — obowiązkowa kontrola dostępu (MAC) dla aplikacji.
- [auditd](https://github.com/linux-audit/audit-userspace) — rejestrowanie zdarzeń na poziomie jądra (`auditctl`, `ausearch`, `aureport`).
- [UFW](https://help.ubuntu.com/community/UFW) / [nftables](https://wiki.nftables.org) — zapora hosta i jej silnik.
- [fail2ban](https://github.com/fail2ban/fail2ban) — automatyczna blokada adresów po nieudanych logowaniach.
- [cryptsetup / LUKS](https://gitlab.com/cryptsetup/cryptsetup) — szyfrowanie woluminów/kontenerów w spoczynku.
- [GnuPG (GPG)](https://gnupg.org) — weryfikacja podpisów ISO, pakietów i repozytoriów (SecureApt).

#### Audyt i utwardzanie — Windows 11

- [PowerShell](https://learn.microsoft.com/powershell/) — główne narzędzie administracji i weryfikacji.
- [Sysinternals](https://learn.microsoft.com/sysinternals/) — Autoruns, Process Explorer i in. do analizy systemu.
- [Microsoft Security Compliance Toolkit (LGPO / PolicyAnalyzer)](https://learn.microsoft.com/windows/security/operating-system-security/device-management/windows-security-configuration-framework/windows-security-baselines) — import i porównywanie z baseline’em Microsoftu.
- [SCAP Compliance Checker (SCC)](https://public.cyber.mil/stigs/scap/) — audyt zgodności SCAP/STIG.
- [BitLocker](https://learn.microsoft.com/windows/security/operating-system-security/data-protection/bitlocker/) — szyfrowanie dysku w spoczynku (+ EFS `cipher` dla plików).
- [winget](https://learn.microsoft.com/windows/package-manager/) — menedżer pakietów z weryfikacją źródeł.
- [AppLocker / WDAC](https://learn.microsoft.com/windows/security/application-security/application-control/) — ograniczanie uruchamiania aplikacji (allowlisting).

#### Wykrywanie zagrożeń i ochrona antywirusowa

- [Microsoft Defender Antivirus](https://learn.microsoft.com/defender-endpoint/) — ochrona w czasie rzeczywistym, PUA i reguły ASR (Attack Surface Reduction).
- [ClamAV](https://www.clamav.net) — otwarty skaner antywirusowy dla Linuksa.
- [rkhunter](https://rkhunter.sourceforge.net) / [chkrootkit](https://www.chkrootkit.org) — wykrywanie rootkitów i anomalii systemowych.
- [Plik testowy EICAR](https://www.eicar.org/download-anti-malware-testfile/) — bezpieczny plik do sprawdzenia działania antywirusa.

#### Logowanie, audyt zdarzeń i SIEM

- [Sysmon](https://learn.microsoft.com/sysinternals/downloads/sysmon) — szczegółowe rejestrowanie zdarzeń w Windows.
- [Wazuh](https://wazuh.com) — otwarta platforma SIEM/XDR.
- [Elastic Security](https://www.elastic.co/security) — analiza i korelacja logów (stos Elastic).
- [Graylog Open](https://graylog.org) — centralne zbieranie i analiza logów.

#### Konteneryzacja i chmura

- [Docker](https://www.docker.com) ([dokumentacja](https://docs.docker.com/)) — uruchamianie i budowanie kontenerów.
- [Podman](https://docs.podman.io/en/latest/) — bezdemonowa, bezrootowa alternatywa dla Dockera.
- [Trivy](https://trivy.dev) — skaner podatności obrazów kontenerów.
- [Docker Bench for Security](https://github.com/docker/docker-bench-security) — audyt hosta Dockera wg CIS Docker Benchmark.
- [Docker Hub](https://hub.docker.com/search?badges=official) — rejestr obrazów (obrazy oficjalne/zaufane).

#### Automatyzacja, wersjonowanie i zarządzanie sekretami

- [Ansible](https://docs.ansible.com/) — bezagentowe zarządzanie konfiguracją (przez SSH).
- [Terraform](https://developer.hashicorp.com/terraform/docs) — infrastruktura jako kod (IaC).
- [SaltStack](https://docs.saltproject.io/en/latest/contents.html) — zarządzanie konfiguracją w skali.
- [Git](https://git-scm.com) — wersjonowanie skryptów i konfiguracji.
- [ShellCheck](https://www.shellcheck.net) — statyczna analiza skryptów bash.
- [PSScriptAnalyzer](https://github.com/PowerShell/PSScriptAnalyzer) — statyczna analiza skryptów PowerShell.
- [Pester](https://pester.dev) — testy jednostkowe dla PowerShell.
- [HashiCorp Vault](https://developer.hashicorp.com/vault) — menedżer sekretów.
- [PowerShell SecretManagement](https://learn.microsoft.com/powershell/utility-modules/secretmanagement/overview) — magazyn sekretów w Windows (+ Credential Manager).
- [Gitleaks](https://github.com/gitleaks/gitleaks) — wykrywanie sekretów przypadkowo dodanych do repozytorium.
- Asystenci AI: [Claude Code](https://www.anthropic.com/claude-code), [GitHub Copilot](https://github.com/features/copilot) — wspomaganie pisania i wyjaśniania skryptów (kod traktuj jak z nieznanego źródła).

#### Bazy wiedzy i modele ataków

- [MITRE ATT&CK](https://attack.mitre.org/) — baza technik ataku i wykrywania.
- [Attack Flow](https://ctid.mitre.org/projects/attack-flow/) — modelowanie przebiegu ataku.
- [Cyber Kill Chain](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html) — klasyczny model faz ataku.

