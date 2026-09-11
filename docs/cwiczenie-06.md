---
sidebar_position: 6
title: "Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary"
---

<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import TopologyBuilder from '@site/src/components/TopologyBuilder';
import KeywordAnswer from '@site/src/components/KeywordAnswer';
import PrivateAddressTable from '@site/src/components/PrivateAddressTable';
import SharedValue from '@site/src/components/SharedValue';
import CodeLine from '@site/src/components/CodeLine';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';

# Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary"
  storageKey="cwiczenie-6"
/>

## I. Wprowadzenie

Ćwiczenie rozpoczyna część praktyczną kursu. Każda **para studentów** pracuje na własnym zestawie: **2 routery** (R1-X, R2-X) i **1 przełącznik** (SW-X), połączonych w stałą topologię używaną w pozostałych ćwiczeniach. Adresacja pary: np. **10.X.0.0/24** (LAN) i **10.100.X.0/30** (łącze do sąsiada).

![Siec](/img/0/siec.png)
<div className="text-center">
Rys.1 Sieć laboratoryjna [^cisco]
</div>

## II. Zadania do wykonania

1. Połączyć urządzenia zgodnie ze schematem (PC-A-PC-B).
2. Nadać nazwy hostów, skonfigurować hasła dostępu i baner.
3. Skonfigurować interfejsy routerów i aktywować je (no shutdown).
4. Podstawowa konfiguracja przełącznika (nazwa, adres zarządzania).
5. Weryfikacja: show ip interface brief, ping.+

### Połączenie PC - PC i konfiguracja adresacji

<StepByStep>
<Step title="Połączenie PC-PC">
Połącz dwa komputery bezpośrednio kablem prostym. **Wykorzystaj dolną kartę sieciową.**

<KeywordAnswer
  title="Pytanie"
  question="Dlaczego bezpośrednie połączenie dwóch komputerów zwykłym kablem prostym działa dziś bez problemu, mimo że kiedyś wymagałoby to wykorzystania kabla krosowego?"
  keywords="Auto-MDIX"
  explanation="Nowoczesne karty sieciowe obsługują funkcję Auto-MDIX, która automatycznie wykrywa, czy potrzebna jest konfiguracja dla kabla zwykłego lub krosowego. Karta sieciowa sama dostosowuje które piny odpowiadają za nadawanie, a które za odbiór danych. Dzięki temu rodzaj kabla (prosty czy krosowany) przestał mieć znaczenie w większości współczesnych połączeń."
  storageKey="cwiczenie-6-auto-mdix"
/>
</Step>

<Step title="Konfiguracja adresacji">
Adresacja IP nie jest z góry narzucona. Samemu trzeba określić adresację, która zostanie wykorzystana w ćwiczeniu.

:::warning Uwaga!!!
Trzeci oktet adresu IP powinien być równy numerowi pary. Np. pierwsza para = 1.
:::

<PrivateAddressTable
  title="Wprowadź adres IP i maskę, którą wykorzystasz w zadaniu"
  checkGroupOctet={true}
  storageKey="cwiczenie-6-zad1"
  columns={['device', 'ip', 'mask']}
  initialRows={[{device: 'PC-A', shared: { ip: 'pca_ip', mask: 'maska' }}, {device: 'PC-B', shared: { ip: 'pcb_ip', mask: 'maskb' }}]}
/>

</Step>

<Step title="Połączenie PC-PC i konfiguracja adresacji">
Ustaw statyczną adresację IP zgdnie z poniższym schematem:

<TopologyBuilder
  title="Topologia"
  storageKey="cwiczenie-6"
  topology={{
    vlan: { show: false },
    groups: [
      {
        node: { icon: '🖥️', label: 'PC-A' },
        fields: [
          { key: 'port1', label: 'port', placeholder: () => 'IP', type: 'address', shared: 'pca_ip' },
        ],
      },
      {
        node: { icon: '🖥️', label: 'PC-B' },
        fields: [
          { key: 'port2', label: 'port', placeholder: () => 'IP', type: 'address', shared: 'pcb_ip' },
        ],
      }
    ],
  }}
/>

W Windows wejdź w "Panel sterowania" → "Centrum sieci" → "Zmień ustawienia karty" → właściwości "IPv4":
- PC-A: <SharedValue shared="pca_ip" fallback="—" />, maska <SharedValue shared="maska" fallback="—" />
- PC-A: <SharedValue shared="pcb_ip" fallback="—" />, maska <SharedValue shared="maskb" fallback="—" />

Zweryfikuj łączność w Wierszu poleceń:

<CodeLine>ping <SharedValue fieldKey="pcb_ip" fallback="adres_IP" /></CodeLine>

<ScreenshotPaste label="Zrzut ekranu: polecania ping na adres drugiego komputera" />
</Step>
</StepByStep>

[^cisco]: Grafika wykonana w programie - [Cisco Packet Tracer](https://www.netacad.com/resources/lab-downloads?courseLang=en-US)
