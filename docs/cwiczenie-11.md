---
sidebar_position: 11
title: "Ćwiczenie 11: Site-to-site IPsec VPN"
---

<!--- import bibliotek -->

import TopologyBuilder from '@site/src/components/TopologyBuilder';
import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import CodeBlock from '@site/src/components/CodeBlock';
import CodeBlank from '@site/src/components/CodeBlank';
import SharedValue from '@site/src/components/SharedValue';
import OpenQuestion from '@site/src/components/OpenQuestion';
import Checklist from '@site/src/components/Checklist';
import EditableTable from '@site/src/components/EditableTable';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 11: Site-to-site IPsec VPN

*Część II — Zajęcia praktyczne*

<SprawozdanieHeader
  exerciseTitle="Ćwiczenie 11: VPN site-to-site IPsec"
  storageKey="cwiczenie-11"
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-11"
  storageKeys={['cwiczenie-11','ipsec-grupy-segment', 'vpn-psk', 'vpn-test-tunelu']}
  sharedPrefix="cw11_"
/>

## I. Wprowadzenie

<div className="justify">
Instytucja działająca w wielu lokalizacjach (centrala, oddziały, pracownicy mobilni) potrzebuje sieci IP, w której hosty mogą wymieniać dane poufnie. Historycznie osiągano to budując **sieć prywatną** — całkowicie odrębną od publicznego internetu infrastrukturę fizyczną (własne routery, łącza, serwery DNS). Taka sieć jest bezpieczna z definicji (nikt obcy fizycznie do niej nie ma dostępu), ale bardzo kosztowna w zakupie, instalacji i bieżącym utrzymaniu [^kurose].

**VPN (Virtual Private Network) jest tańszą alternatywą osiągającą ten sam cel**. Zamiast budować odrębną sieć fizyczną, firma przesyła swój wewnętrzny ruch przez zwykły, publiczny internet. Każdy pakiet, zanim opuści sieć lokalną, jest szyfrowany. Efekt jest taki sam jak w sieci prywatnej (poufność, integralność danych), a koszt dużo niższy, bo korzysta się z już istniejącej infrastruktury publicznej [^kurose].
</div>

**VPN (Virtual Private Network)** może tworzyć szyfrowany tunel między dwoma punktami, prowadzony przez sieć, której nie ufamy (najczęściej publiczny internet). Wyróżnia się dwa główne warianty połączenia [^kurose]:
- **Remote-access VPN** - służy do połączenia pojedynczego użytkownika (laptop, telefon) do sieci firmowej. Pracownik zdalnie łączy się np. z domu do zasobów firmy.
- **Site-to-site VPN** - służy do połącznia dwóch routerów/firewalli na brzegu dwóch sieci lokalnych. Połączenie dwóch oddziałów firmy w jedną logiczną sieć.

---

<div className="justify">
**IPsec** nie jest jednym protokołem, tylko zestawem protokołów współpracujących ze sobą (Tabela 1). Zanim popłynie jakikolwiek zaszyfrowany ruch użytkownika, dwa routery muszą przejść dwuetapową negocjację nazywaną IKE (Internet Key Exchange) [^RFC2409]:
</div>
Tab. 1 Fazy zestawienia połączenia
| | Faza 1 (ISAKMP) | Faza 2 (IPsec, "właściwy" tunel) |
|---|---|---|
| **Co ustala** | bezpieczny, uwierzytelniony kanał kontrolny między routerami | jak konkretnie szyfrować ruch użytkownika |
| **Kluczowe parametry** | metoda uwierzytelnienia (pre-shared key lub certyfikaty), algorytm szyfrowania (np. AES), funkcja skrótu (np. SHA), grupa Diffie-Hellman (siła wymiany kluczy), czas życia (`lifetime`) | transform-set (algorytmy szyfrowania/integralności dla danych), tryb (tunelowy/transportowy), powiązanie z ruchem do ochrony (crypto ACL) |
| **W konfiguracji Cisco** | `crypto isakmp policy`, `crypto isakmp key ... address ...` | `crypto ipsec transform-set`, `crypto map` |
| **Analogia** | dwóch nieznajomych uzgadnia bezpieczny, tajny język i potwierdza nawzajem swoją tożsamość | w tym już uzgodnionym języku ustalają, jak dokładnie będą pakować i pieczętować przesyłki |

<div className="justify">
**Ruch "interesujący" (crypto ACL) i Security Association (SA)**

Router musi wiedzieć, który ruch w ogóle ma szyfrować, a resztę przepuścić jako cel Internet, który przepuszcza bez szyfrowania i bez tunelu. Do tego służy tzw. crypto ACL (który włapuje ruch przeznaczony dla VPN). Wykorzystuje sie ACL jako listę `permit` opisującą pary sieci źródło-cel, które mają być objęte VPN-em.

W konsekwencji negocjacja IPsec tworzy jednokierunkowe powiązania nazywane SA (Security Association) [^RFC4301], które są osobne dla kierunku K1 -> K2 i osobne dla K2 -> K1. Crypto ACL na R1 i R2 muszą być lustrzanym odbiciem względem siebie, ponieważ w innym wypadku ruch w jedną stronę zostanie zaszyfrowany, a w drugą nie (albo tunel w ogóle się nie zestawi).

**Tunel** - mimo że cała konfiguracja jest już wpisana to nie nawiązuje się od razu. IPsec jest "leniwy" i uruchamia negocjację IKE dopiero w momencie, gdy przez interfejs z podpiętą crypto map popłynie pierwszy pakiet pasujący do crypto ACL.
</div>

## II. Zadania do wykonania
Przypomnienie adresacji z Twojej grupy (musi się zgadzać z tym, co masz już skonfigurowane na routerach):

<TopologyBuilder
title="Segment Twojej grupy"
storageKey="ipsec-grupy-segment"
xShared="grupa_x"
topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🖥️', label: 'K1' }, fields: [
        { key: 'k1_ip', label: 'adres IP', placeholder: (x) => `10.1.${x}.2/24`, type: 'cidr', expectedPrefix: 24, shared: 'k1_ip' },
      ]},
      { node: { icon: '🌐', label: 'R1' }, fields: [
        { key: 'r1_k1', label: 'do K1 - Gi0/0/0', placeholder: (x) => `10.1.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'k1-r1_ip', mask: 'k1-r1_mask', network: 'k1-r1_net', wildcard: 'k1-r1_wild'} },
        { key: 'r1_r2', label: 'do R2 - Gi0/0/1', placeholder: (x) => `10.2.${x}.1/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'r1-r2_ip', mask: 'r1-r2_mask', network: 'r1-r2_net', wildcard: 'r1-r2_wild'} },
        { key: 'r1_lo', label: 'Loopback1', placeholder: (x) => `10.100.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'r1-loop_ip', mask: 'r1-loop_mask'} },
      ]},
      { node: { icon: '🌐', label: 'R2' }, fields: [
        { key: 'r2_k2', label: 'do K2 - Gi0/0/0', placeholder: (x) => `10.3.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'k2-r2_ip', mask: 'k2-r2_mask', network: 'k2-r2_net', wildcard: 'k2-r2_wild'} },
        { key: 'r2_r1', label: 'do R1 - Gi0/0/1', placeholder: (x) => `10.2.${x}.2/30`, type: 'cidr', expectedPrefix: 30, deriveShared: { ip: 'r2-r1_ip', mask: 'r2-r1_mask', network: 'r2-r1_net', wildcard: 'r2-r1_wild'} },
        { key: 'r2_lo', label: 'Loopback1', placeholder: (x) => `10.101.${x}.1/24`, type: 'cidr', expectedPrefix: 24, deriveShared: { ip: 'r2-loop_ip', mask: 'r2-loop_mask'} },
      ]},
      { node: { icon: '🖥️', label: 'K2' }, fields: [
        { key: 'k2_ip', label: 'adres IP', placeholder: (x) => `10.3.${x}.2/24`, type: 'cidr', expectedPrefix: 24, shared: 'k2_ip' },
      ]},
    ],
  }}
/>

Ustalcie w parze (R1 i R2) wspólny klucz **pre-shared key** (Tabela 2) - dowolny ciąg znaków, ale **musi być identyczny po obu stronach**:

<EditableTable
title="Tab. 2 Wspólny klucz PSK — uzgodnij z partnerem"
storageKey="vpn-psk"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'opis', label: 'Parametr', readOnly: true },
{ key: 'wartosc', label: 'Wartość (identyczna na R1 i R2)', shared: 'vpn_psk' },
]}
initialRows={[
{ opis: 'Pre-shared key (ISAKMP)', wartosc: '' },
]}
/>

<StepByStep>
<Step title="ACL ruchu interesującego (co ma być szyfrowane)">
IPsec musi wiedzieć, **jaki ruch** ma chronić - do tego służy tzw. crypto ACL. Chcemy szyfrować wyłącznie ruch między siecią K1 a siecią K2 (nie cały ruch przechodzący przez router).

Na R1:

<CodeBlock lines={[
<>R1-X(config)# access-list 100 permit ip <SharedValue shared="k1-r1_net" fallback="sieć K1" /> <SharedValue shared="k1-r1_wild" fallback="wildcard sieci K1" /> <SharedValue shared="k2-r2_net" fallback="sieć K2" /> <SharedValue shared="k2-r2_wild" fallback="wildcard sieci K2" /></>,
]} />

Na R2 - **lustrzane odbicie** (kierunek odwrotny):

<CodeBlock lines={[
<>R2-X(config)# access-list 100 permit ip <SharedValue shared="k2-r2_net" fallback="sieć K2" /> <SharedValue shared="k2-r2_wild" fallback="wildcard sieci K2" /> <SharedValue shared="k1-r1_net" fallback="sieć K1" /> <SharedValue shared="k1-r1_wild" fallback="wildcard sieci K1" /></>,
]} />

:::warning
Ta ACL **musi być lustrzana** na obu routerach - jeśli kierunki się nie zgadzają, tunel może się nawiązać, ale ruch w jedną stronę i tak nie zostanie zaszyfrowany.
:::

</Step>

<Step title="IKE Fazy 1 (ISAKMP) — uwierzytelnienie i klucz sesji">
Faza 1 negocjuje bezpieczny kanał, w którym routery uzgodnią klucze do szyfrowania danych zanim popłynie jakikolwiek ruch użytkownika.

Na R1:

<CodeBlock lines={[
'R1-X(config)# crypto isakmp policy 10',
'R1-X(config-isakmp)# encryption aes 256',
'R1-X(config-isakmp)# hash sha256',
'R1-X(config-isakmp)# authentication pre-share',
'R1-X(config-isakmp)# group 14',
'R1-X(config-isakmp)# lifetime 3600',
'R1-X(config-isakmp)# exit',
<>R1-X(config)# crypto isakmp key <SharedValue shared="vpn_psk" fallback="uzgodniony PSK" /> address <SharedValue shared="r2-r1_ip" fallback="adres R2 (peer)" /></>,
]} />

Analogicznie na routerze R2 - te same parametry polityki, klucz **taki sam**, adres peera **odwrotny**.
</Step>

<Step title="IPsec Fazy 2 — transform-set i crypto map">
Faza 2 określa, **jak konkretnie** ma być szyfrowany ruch użytkownika (transform-set), i spina to wszystko w jedną politykę (crypto map): jaki ruch (ACL z kroku 1), z jakim peerem (krok 2) i jakim transform-setem.

Na R1:

<CodeBlock lines={[
'R1-X(config)# crypto ipsec transform-set TSET esp-aes 256 esp-sha256-hmac',
'R1-X(cfg-crypto-trans)# mode tunnel',
'R1-X(cfg-crypto-trans)# exit',
'R1-X(config)# crypto map CMAP 10 ipsec-isakmp',
<>R1-X(config-crypto-map)# set peer <SharedValue shared="r2-r1_ip" fallback="adres R2 (peer)" /></>,
'R1-X(config-crypto-map)# set transform-set TSET',
'R1-X(config-crypto-map)# match address 100',
'R1-X(config-crypto-map)# exit',
]} />

Analogicznie na routerze R2 - analogicznie, peer wskazuje na R1.
</Step>

<Step title="Podpięcie crypto map do interfejsu">
Sama zdefiniowana `crypto map` niczego jeszcze nie robi dopóki nie powiążemy z interfejsem, przez który faktycznie przechodzi ruch do drugiego routera (tu: łącze `R1 ↔ R2`, czyli nasza „sieć publiczna”).

<CodeBlock lines={[
'R1-X(config)# interface GigabitEthernet0/0/1',
'R1-X(config-if)# crypto map CMAP',
'R1-X(config-if)# exit',
]} />

<Checklist
title="Sprawdź przed testem ruchu"
storageKey="vpn-checklist-przed-testem"
sections={[{
items: [
'Ten sam PSK wpisany identycznie na R1 i R2 (uwaga na wielkość liter)',
'ACL na R1 i R2 są lustrzanym odbiciem (kierunki sieci odwrócone)',
'crypto map ma tę samą nazwę (CMAP) i numer sekwencji (10) po obu stronach',
'crypto map podpięta na właściwym interfejsie (do drugiego routera, nie do komputera)',
],
}]}
/>

</Step>

<Step title="Test tunelu i weryfikacja">
Tunel IPsec nawiązuje się **dopiero gdy popłynie pierwszy pasujący pakiet** (Tabela 3) - samo wpisanie konfiguracji jeszcze niczego nie uruchamia. Wykonaj ping z `K1` do `K2` (musi to być ruch między sieciami z ACL z kroku 1):

<EditableTable
title="Tab. 3 Test tunelu VPN"
storageKey="vpn-test-tunelu"
allowAddRows={false}
allowRemoveRows={false}
columns={[
{ key: 'polecenie', label: 'Polecenie', readOnly: true },
{ key: 'wynik', label: 'Wynik / obserwacja' },
]}
initialRows={[
{ polecenie: <>Z K1: ping <SharedValue shared="k2_ip" fallback="adres K2" /></>, wynik: '' },
{ polecenie: 'Na R1: show crypto isakmp sa (stan QM_IDLE?)', wynik: '' },
{ polecenie: 'Na R1: show crypto ipsec sa (liczniki #pkts encaps/decaps > 0?)', wynik: '' },
{ polecenie: 'Na R2: show crypto ipsec sa (liczniki po drugiej stronie)', wynik: '' },
]}
/>

<ScreenshotPaste label="Zrzut ekranu: show crypto ipsec sa (R1)" />
<ScreenshotPaste label="Zrzut ekranu: ping z K1 do Loopback routera R2" />
<ScreenshotPaste label="Zrzut ekranu: show crypto ipsec sa (R1)" />
</Step>
</StepByStep>

:::danger Przywracanie domyślnej konfiguracji
**ZAWSZE** po zakończonej pracy pozostaw stanowisko z domyślnymi ustawieniami.
:::

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.

[^RFC2409]: Harkins, D., Carrel, D. — [RFC 2409](https://datatracker.ietf.org/doc/rfc2409/): The Internet Key Exchange (IKE).

[^RFC4301]: Kent, S., Seo, K. — [RFC 2409](https://datatracker.ietf.org/doc/rfc4301/): Security Architecture for the Internet Protocol.