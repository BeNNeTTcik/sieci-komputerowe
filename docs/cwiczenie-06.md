---
sidebar_position: 6
title: "Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary"
---

<!--- import bibliotek -->
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import TopologyBuilder from '@site/src/components/TopologyBuilder';
import KeywordAnswer from '@site/src/components/KeywordAnswer';

# Ćwiczenie 6: Podstawowa konfiguracja urządzeń i topologii pary

*Część II — Zajęcia praktyczne*

## I. Wprowadzenie

Ćwiczenie rozpoczyna część praktyczną kursu. Każda **para studentów** pracuje na własnym zestawie: **2 routery** (R1-X, R2-X) i **1 przełącznik** (SW-X), połączonych w stałą topologię używaną w pozostałych ćwiczeniach. Adresacja pary: np. **10.X.0.0/24** (LAN) i **10.100.X.0/30** (łącze do sąsiada).

![Siec](/img/0/siec.png)
<div className="text-center">
Rys.1 Sieć laboratoryjna [^cisco]
</div>

## II. Zadania do wykonania

1. Połączyć urządzenia zgodnie ze schematem (PC–SW-X–R1-X–R2-X).
2. Nadać nazwy hostów, skonfigurować hasła dostępu i baner.
3. Skonfigurować interfejsy routerów i aktywować je (no shutdown).
4. Podstawowa konfiguracja przełącznika (nazwa, adres zarządzania).
5. Weryfikacja: show ip interface brief, ping.+

### Połączenie PC - PC i konfiguracja adresacji

<StepByStep>
<Step title="Połączenie PC-PC i konfiguracja adresacji">
Połącz dwa komputery bezpośrednio kablem prostym. **Wykorzystaj dolną kartę sieciową.**

<KeywordAnswer
  title="Pytanie"
  question="Dlaczego bezpośrednie połączenie dwóch komputerów zwykłym kablem prostym działa dziś bez problemu, mimo że kiedyś wymagałoby to wykorzystania kabla krosowego?"
  keywords="Auto-MDIX"
  explanation="Nowoczesne karty sieciowe obsługują funkcję Auto-MDIX, która automatycznie wykrywa, czy potrzebna jest konfiguracja dla kabla zwykłego lub krosowego. Karta sieciowa sama dostosowuje które piny odpowiadają za nadawanie, a które za odbiór danych. Dzięki temu rodzaj kabla (prosty czy krosowany) przestał mieć znaczenie w większości współczesnych połączeń."
  storageKey="cwiczenie-6-auto-mdix"
/>
</Step>

<Step title="Połączenie PC-PC i konfiguracja adresacji">
Ustaw statyczną adresację IP w tej samej sieci na obu komputerach:

<TopologyBuilder
  title="Topologia — VLAN i trunking"
  storageKey="cwiczenie-12"
  topology={{
    vlan: { show: false },
    groups: [
      {
        node: { icon: '🖥️', label: 'PC-B' },
        fields: [
          { key: 'trunk', label: 'port access', placeholder: (x) => 'Fa0/2' },
        ],
      },
      {
        node: { icon: '🖥️', label: 'PC-B' },
        fields: [
          { key: 'trunk', label: 'port access', placeholder: (x) => 'Fa0/2' },
        ],
      },
    ],
  }}
/>

Panel sterowania → Centrum sieci → Zmień ustawienia karty → właściwości IPv4:
- PC-A: `192.168.1.10`, maska `255.255.255.0`
- PC-B: `192.168.1.20`, maska `255.255.255.0`



```bash
sudo ip addr add 192.168.1.10/24 dev eth0   # na PC-A
sudo ip addr add 192.168.1.20/24 dev eth0   # na PC-B
```


Zweryfikuj łączność:

```
ping 192.168.1.20
```

Jeśli ping działa — masz najprostszą możliwą, działającą sieć: dwa hosty w tej samej domenie rozgłoszeniowej, bez żadnego urządzenia pośredniczącego.

</Step>
</StepByStep>

## III. Podsumowanie

Działająca, zaadresowana sieć lokalna pojedynczej pary.
