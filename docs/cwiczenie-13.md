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

# Ćwiczenie 13: Listy kontroli dostępu (ACL)

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 13: Listy kontroli dostępu (ACL)"
  storageKey="cwiczenie-13"
/>

## I. Wprowadzenie

<div className="justify">
**Listy ACL (Access Control List)** filtrują ruch IP na podstawie zdefiniowanych reguł. Router sprawdza pakiet po kolei od góry listy i stosuje pierwszą pasującą regułę (`permit` lub `deny`) — reszta wpisów jest ignorowana. Na końcu każdej listy ACL znajduje się niewidoczne, domniemane `deny any` — jeśli żadna reguła nie pasuje, pakiet zostaje odrzucony.
</div>

Wyróżniamy dwa rodzaje ACL:
- **standardowa ACL** - przyjmuje wartości numeryczne 1-99 i 1300-1999 lub jako nazwa `ip access-list standard <NAZWA>`. Standrdowa ACL filtruje tylko po adresach źródłowych pakietów.
- **rozszerzone ACL** - przujmuje wartości numeryczne 100-199 i 2000-2699 lub jako nazwy `ip access-list extended <NAZWA>`. Filtruje po adresie źródłowym, docelowym, protokole (ip/tcp/udp/icmp) i porcie.

:::warning
Konfigurowanie Access Control List trzeba przejść świadomie i z wielką uwagą, ponieważ w bradzo prosty sposób można odciąć samego siebie od sieci i dostepu podając złe parametry fitrów.
:::

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
          { key: 'port1', label: 'port', placeholder: (x) => `10.10.${x}.10`, type: 'address', shared: 'pca_ip' },
        ],
      },
      {
        node: { icon: '🌐', label: 'R1' },
        fields: [
          { key: 'r1_pc1', label: 'brama dla PC-A', placeholder: (x) => `10.10.${x}.1`, type: 'address', shared: 'r1-pc1' },
          { key: 'r1-r2', label: 'połączenie do R2', placeholder: (x) => `10.${x}.10.1`,type: 'address', shared: 'r1-r2' },
        ],
      },
      {
        node: { icon: '🌐', label: 'R2' },
        fields: [
          { key: 'r2-r1', label: 'połączenie do R2', placeholder: (x) => `10.${x}.10.2`, type: 'address', shared: 'r2-r1' },
          { key: 'r2-pc2', label: 'brama dla PC-B', placeholder: (x) => `192.168.${x}.1`, type: 'address', shared: 'r2-pc2' },
        ],
      },
      {
        node: { icon: '🖥️', label: 'PC-B' },
        fields: [
          { key: 'port2', label: 'port', placeholder: (x) => `192.168.${x}.10`, type: 'address', shared: 'pcb_ip' },
        ],
      }
    ],
  }}
/>
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
    {zrodlo: <SharedValue shared="pca_ip" fallback="—" />, cel: <SharedValue shared="r1_pc1" fallback="—" />, akcja: "permit", wyjasnienie: "PC2 ma mieć dostęp do routera R1" },
    {zrodlo: <SharedValue shared="pca_ip" fallback="—" />, cel: <SharedValue shared="pcb_ip" fallback="—" />, akcja: "deny", wyjasnienie: "blokada dostępu PC2 → sieć PC1"},
    {zrodlo: <SharedValue shared="pca_ip" fallback="—" />, cel: 'dowolny inny cel', akcja: "permit", wyjasnienie: "reszta ruchu PC2 ma działać normalnie"},
    {zrodlo: <SharedValue shared="pcb_ip" fallback="—" />, cel: <SharedValue shared="pca_ip" fallback="—" />, akcja: "deny", wyjasnienie: "blokada dostępu PC1 → sieć PC2"},
    {zrodlo: <SharedValue shared="pcb_ip" fallback="—" />, cel: 'dowolny inny cel', akcja: "permit", wyjasnienie: "reszta ruchu PC1 ma działać normalnie"},
  ]}
  allowAddRows={false}
  allowRemoveRows={false}
/>

:::warning KOLEJNOŚĆ!!!
**Uwaga na kolejność** - reguła zezwalająca na dostęp (permit) musi znaleźć się przed regułą blokującą (deny). Inaczej (deny) może uwzględnić całą podsieć i zablokować pewien ruch.
:::
</Step>

<Step title="Konfiguracja R2">
<CodeBlock lines={[
  'enable',
  'configure terminal',
  <>ping <SharedValue shared="pcb_ip" fallback="adres_IP" /></>,
]} />
```
enable
configure terminal

ip access-list extended BLOKADA_DO_PCB
permit ip 192.168.1.0 0.0.0.255 host 10.0.0.2
remark Zablokuj PC1 -> reszta sieci PC2
deny   ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255
remark Zezwól na cały pozostały ruch
permit ip any any
exit

interface GigabitEthernet0/0
ip access-group BLOKADA_DO_PC2 in
exit
```
</Step>

<Step title="Konfiguracja R1">
przedstaw komedy do konfiguracji

</Step>
</StepByStep>

[^cisco]: [Configure IP Access Lists](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html)