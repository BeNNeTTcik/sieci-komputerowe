---
sidebar_position: 13
title: "Ćwiczenie 13: Listy kontroli dostępu (ACL)"
---

<!--- import bibliotek -->
import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import EditableTable from '@site/src/components/EditableTable';
import SharedValue from '@site/src/components/SharedValue';
import CodeBlock from '@site/src/components/CodeBlock';
import CodeBlank from '@site/src/components/CodeBlank';

# Ćwiczenie 13: Listy kontroli dostępu (ACL)

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 13: Listy kontroli dostępu (ACL)"
  storageKey="cwiczenie-13"
/>

## I. Wprowadzenie

<div className="justify">
**Listy ACL (Access Control List)** filtrują ruch IP na podstawie zdefiniowanych reguł. Router sprawdza pakiet po kolei od góry listy i stosuje pierwszą pasującą regułę (`permit` lub `deny`) — reszta wpisów jest ignorowana. Na końcu każdej listy ACL znajduje się niewidoczne, domniemane `deny any` — jeśli żadna reguła nie pasuje, pakiet zostaje odrzucony [^cisco].
</div>

Wyróżniamy dwa rodzaje ACL:
- **standardowa ACL** - przyjmuje wartości numeryczne 1-99 i 1300-1999 lub jako nazwa `ip access-list standard <NAZWA>`. Standrdowa ACL filtruje tylko po adresach źródłowych pakietów.
- **rozszerzone ACL** - przujmuje wartości numeryczne 100-199 i 2000-2699 lub jako nazwy `ip access-list extended <NAZWA>`. Filtruje po adresie źródłowym, docelowym, protokole (ip/tcp/udp/icmp) i porcie.

:::warning
Konfigurowanie Access Control List trzeba przejść świadomie i z wielką uwagą, ponieważ w bradzo prosty sposób można odciąć samego siebie od sieci i dostepu podając złe parametry fitrów.
:::

Wyjaśnienie składni komend:

**permit/deny** - przepuszczenie lub zablokowanie ruchu.

**Maska blankietowa (wildcard)** - odwrotność maski podsieci. Czyli z maski `255.255.255.0` odwrotność wynosi `0.0.0.255` co jest równoważne ze znaczeniem dla dowolonego hostem z sieci.

**Host X** - dokladnie ten adres (przyklad permit ip 192.168.2.0 0.0.0.255 `host 192.168.1.1`).

**any** - wszystko inne (inna sieć, inny host, niż te zadeklarowane itd.).

**eq 80, eq 23, echo** - porty i typy komunikatów.

## II. Zadania do wykonania

1. Zaprojektować politykę filtrowania z sąsiednią parą.
2. Standardowa ACL filtrująca po adresie źródłowym.
3. Rozszerzona ACL filtrująca po adresie i porcie/protokole.
4. Zastosować ACL na właściwym interfejsie i kierunku.
5. Testy weryfikacyjne i analiza show access-lists.

<StepByStep>
<Step title="Konifugracja sieci w następujący sposób">
Adresacja nie jest z góry narzucona. Można wybrać sieć podaną w zadaniu lub rozpisać samemu.
<TopologyBuilder
  title="Topologia"
  storageKey="cwiczenie-13"
  topology={{
    vlan: { show: false },
    groups: [
      {
        node: { icon: '🖥️', label: 'PC-A' },
        fields: [
          { key: 'port1', label: 'port', placeholder: (x) => `10.10.${x}.10/24`, type: 'cidr', shared: 'pca', showAclHelper: true, deriveShared: { networkCidr: 'siec_pca_ip', ip: 'pca_ip', network: 'pca_net', wildcard: 'pca_wild', mask: 'maska' } }
        ],
      },
      {
        node: { icon: '🌐', label: 'R1' },
        fields: [
          { key: 'r1_pc1', label: 'brama dla PC-A : Gi0/0/0', placeholder: (x) => `10.10.${x}.1/24`, type: 'cidr', shared: 'r1-pc1', showAclHelper: true, showAclHelper: true, deriveShared: { networkCidr: 'siec_r1_pc1', ip: 'r1-pc1_ip', network: 'r1_pc1_net', wildcard: 'r1_pc1_wild'} },
          { key: 'r1-r2', label: 'połączenie do R2 : Gi0/0/1', placeholder: (x) => `10.${x}.10.1/30`,type: 'cidr', shared: 'r1-r2', showAclHelper: true, deriveShared: { networkCidr: 'siec_r1_r2', ip: 'r1-r2_ip', network: 'r1-r2_net', wildcard: 'r1-r2_wild' } },
        ],
      },
      {
        node: { icon: '🌐', label: 'R2' },
        fields: [
          { key: 'r2-r1', label: 'połączenie do R2 : Gi0/0/1', placeholder: (x) => `10.${x}.10.2/30`, type: 'cidr', shared: 'r2-r1', showAclHelper: true, deriveShared: { networkCidr: 'siec_r2_r1', ip: 'r2-r1_ip', network: 'r2-r1_net', wildcard: 'r2-r1_wild' } },
          { key: 'r2-pc2', label: 'brama dla PC-B : Gi0/0/0', placeholder: (x) => `192.168.${x}.1/24`, type: 'cidr', shared: 'r2-pc2', showAclHelper: true, deriveShared: { networkCidr: 'siec_r2_pc2', ip: 'r2-pc2_ip', network: 'r2-pc2_net', wildcard: 'r2-pc2_wild' } },
        ],
      },
      {
        node: { icon: '🖥️', label: 'PC-B' },
        fields: [
          { key: 'port2', label: 'port', placeholder: (x) => `192.168.${x}.10/24`, type: 'cidr', shared: 'pcb', showAclHelper: true, deriveShared: { networkCidr: 'siec_pcb_ip', ip: 'pcb_ip', network: 'pcb_net', wildcard: 'pcb_wild', mask: 'maskb' } },
        ],
      }
    ],
  }}
/>
</Step>

<Step title="Przygotowanie sieci do testów">
Bazując na adresacji z wcześniejszego kroku trzeba przygotować stanowisko przed wdrożeniem ACL.

W Windows wejdź w "Panel sterowania" → "Centrum sieci" → "Zmień ustawienia karty" → właściwości "IPv4":
- PC-A: <SharedValue shared="pca_ip" fallback="—" />, maska <SharedValue shared="maska" fallback="—" />
- PC-A: <SharedValue shared="pcb_ip" fallback="—" />, maska <SharedValue shared="maskb" fallback="—" />

Skonfiguruj routery R1 oraz R2 według bazując na wiedzy z poprzednik zadań. Poniżej znajduje się "Checklista", która pomoże w prawidłowej konfiguracji oraz dokumentacja z [ćwiczenia 5.5](http://localhost:3000/sieci-komputerowe/cwiczenie-05%20i%205)

CheckLsita co trzeba skonfigurowac na obu routerach

</Step>

<Step title="Projekt polityki">
<EditableTable
  title="Polityki do wdrożenia"
  storageKey="cwiczenie-13"
  columns={[
    {key: 'zrodlo', label: 'IP źródłowy', readOnly: true},
    {key: 'cel', label: 'IP docelowy', readOnly: true},
    {key: 'akcja', label: 'Akcja', readOnly: true},
    {key: 'wyjasnienie', label: 'Uzasadnienie', readOnly: true}
  ]}
  initialRows={[
    {zrodlo: <SharedValue shared="siec_pcb_ip" fallback="—" />, cel: <SharedValue shared="r1_pc1_ip" fallback="—" />, akcja: "permit", wyjasnienie: "PC2 ma mieć dostęp do routera R1" },
    {zrodlo: <SharedValue shared="siec_pcb_ip" fallback="—" />, cel: <SharedValue shared="siec_pca_ip" fallback="—" />, akcja: "deny", wyjasnienie: "blokada dostępu PC2 → sieć PC1"},
    {zrodlo: <SharedValue shared="siec_pcb_ip" fallback="—" />, cel: 'dowolny inny cel', akcja: "permit", wyjasnienie: "reszta ruchu PC2 ma działać normalnie"},
    {zrodlo: <SharedValue shared="siec_pca_ip" fallback="—" />, cel: <SharedValue shared="siec_pcb_ip" fallback="—" />, akcja: "deny", wyjasnienie: "blokada dostępu PC1 → sieć PC2"},
    {zrodlo: <SharedValue shared="siec_pca_ip" fallback="—" />, cel: 'dowolny inny cel', akcja: "permit", wyjasnienie: "reszta ruchu PC1 ma działać normalnie"},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

:::warning KOLEJNOŚĆ!!!
**Uwaga na kolejność** - reguła zezwalająca na dostęp (permit) musi znaleźć się przed regułą blokującą (deny). Inaczej (deny) może uwzględnić całą podsieć i zablokować pewien ruch.
:::
</Step>

<Step title="Konfiguracja R2">
Wejscie w tryb konfiguracyjny **R2(config)#** przy pomocy komend (`enable` i `configure terminal`).
<CodeBlock lines={[
  'ip access-list extended BLOKADA_DO_PCA',
  'remark Zezwól PCA na dostęp do routera R1',
  <>permit ip <SharedValue shared="pcb_net" fallback="—" /> <SharedValue shared="pcb_wild" fallback="—" /> host <SharedValue shared="r1-r2_ip" fallback="—" /></>,
  'remark Zablokuj PCB do reszta sieci PCA',
  <>deny ip <SharedValue shared="pcb_net" fallback="—" /> <SharedValue shared="pcb_wild" fallback="—" /> <SharedValue shared="pca_net" fallback="—" /> <SharedValue shared="pca_wild" fallback="—" /></>,
  'remark Zezwól na cały pozostały ruch',
  'permit ip any any',
  'exit'
]} />

Przypisanie konfiguracji do interfjsu.

<CodeBlock lines={[
  'interface GigabitEthernet0/1',
  'ip access-group BLOKADA_DO_PCA in',
  'exit'
]} />

:::warning KOLEJNOŚĆ!!!
**Uwaga na kolejność** - pominięcie reguła zezwalająca na dostęp (permit) przed regułą blokującą (deny) spowowduje, że utracimy dotęp do jednego z routerów.
:::
</Step>

<Step title="Konfiguracja R1">
Wejscie w tryb konfiguracyjny **R1(config)#** przy pomocy komend (`enable` i `configure terminal`).
<CodeBlock lines={[
  'ip access-list extended BLOKADA_DO_PCB',
  'remark Zezwól PCA na dostęp do routera R2',
  <>permit ip <CodeBlank shared="r1Lan_ip" /> <CodeBlank shared="pca_wild" /> host <CodeBlank shared="r2-r1_ip" /></>,
  'remark Zablokuj PCA do reszta sieci PCB',
  <>deny ip <CodeBlank shared="pca_net" /> <CodeBlank shared="pca_wild" /> <CodeBlank shared="pcb_net" /> <CodeBlank shared="pcb_wild" /></>,
  'remark Zezwól na cały pozostały ruch',
  'permit ip any any',
  'exit'
]} />

Przypisanie konfiguracji do interfjsu.

<CodeBlock lines={[
  'interface GigabitEthernet0/1',
  'ip access-group BLOKADA_DO_PCB in',
  'exit'
]} />
</Step>

<Step title="Wyniki testów - ping IP">
<EditableTable
  title="Wyniki"
  storageKey="cwiczenie-13"
  columns={[
    {key: 'zrodlo', label: 'IP źródłowy', readOnly: true},
    {key: 'cel', label: 'IP docelowy', readOnly: true},
    {key: 'wynik', label: 'Ping działa (tak/nie)?'}
  ]}
  initialRows={[
    {zrodlo: <SharedValue shared="pca_ip" fallback="—" />, cel: <SharedValue shared="pcb_ip" fallback="—" /> },
    {zrodlo: <SharedValue shared="pca_ip" fallback="—" />, cel: <SharedValue shared="r2-r1_ip" fallback="—" />},
    {zrodlo: <SharedValue shared="pcb_ip" fallback="—" />, cel: <SharedValue shared="pca_ip" fallback="—" />},
    {zrodlo: <SharedValue shared="pcb_ip" fallback="—" />, cel: <SharedValue shared="r1-r2_ip" fallback="—" />},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>
<ScreenshotPaste label="Zrzut ekranu: polecania ping z testów" />
</Step>
</StepByStep>

[^cisco]: [Configure IP Access Lists](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html)