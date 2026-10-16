---
sidebar_position: 1
title: "Ćwiczenie 1: Adresacja IPv4 i IPv6"
---

import StepByStep from '@site/src/components/StepByStep';
import Step from '@site/src/components/Step';
import SprawozdanieHeader from '@site/src/components/SprawozdanieHeader';
import ScreenshotPaste from '@site/src/components/ScreenshotPaste';
import ProjectSaveLoad from '@site/src/components/ProjectSaveLoad';

# Ćwiczenie 1: Adresacja IPv4 i IPv6

<SprawozdanieHeader
  thema="Administrowanie sieciami"
  exerciseTitle="Ćwiczenie 1: Adresacja IPv4 i IPv6"
  storageKey="cwiczenie-1"
  solo
/>

<ProjectSaveLoad
  title="Zapisz / wczytaj postęp projektu"
  fileNamePrefix="cwiczenie-1"
  storageKeys={[]}
  sharedPrefix="cw1_"
/>

## I. Wprowadzenie

<StepByStep>
<Step title="IPv4">
<div className="justify">
**Adres IPv4** to 32-bitowa liczba, zapisywana w notacji dziesiętnej kropkowanej (cztery oktety po 8 bitów, np. 192.168.1.10) [^RFC791]. Każdy adres logicznie dzieli się na dwie części: **część sieciową** (identyfikującą sieć, do której należy urządzenie) i **część hosta** (identyfikującą konkretne urządzenie w tej sieci). To, gdzie dokładnie przebiega granica między tymi częściami, określa **maska podsieci**.

Nagłówek protokołu IP zawiera m.in. takie informacje jak:
- adres IP źródłowy i docelowy,
- wersja protokołu IP - IPv4 lub IPv6,
-  flagi - informują o tym, czy dany pakiet może być/jest podzielony i wysłany w ramach kilku ramek ethernetowych (ramka ethernetowa może zawierać ładunek o wielkości maksymalnie 1500 bajtów, jeśli pakiet wyższej warstwy jest większy, musi zostać podzielony, o ile nie jest ustawiona flaga Don’t fragment),
- TTL (ang. Time to Live) - czas życia, jaki pozostał pakietowi przed usunięciem go z sieci, innymi słowy maksymalna ilość przeskoków (routerów na trasie - ang. next hop), które może jeszcze dokonać dany pakiet,
- informacja o zawartości pakietu (PDU jakiego protokołu enkapsulowany jest w ramach pakietu).

**Klasy adresów** (adresacja klasowa). Historycznie, w pierwszej wersji protokołu IP, granica między częścią sieciową a hostową była sztywno przypisana do jednej z pięciu klas, rozpoznawanych po najstarszych bitach pierwszego oktetu (Rysunek 1)[^RFC791][^tanen]:

![Rys1](/img/3/ipv4.png)
<div className="text-center">
Rys.1 Klasy adresów [^comer][^claude]
</div>

**Maska podsieci** to 32-bitowa wartość, w której jedynki oznaczają bity części sieciowej, a zera bity części hosta (np. 255.255.255.0 = 24 jedynki, 8 zer). Adres i maska zestawione operacją logiczną AND wskazują adres sieci, do której należy dany host.
</div>
</Step>

<Step title="IPv6">
<div className="justify">
**Adres IPv6** to 128-bitowa liczba (czterokrotnie dłuższa niż w IPv4) zapisywana w notacji szesnastkowej, w ośmiu grupach po 16 bitów rozdzielonych dwukropkiem (np. `2001:0db8:0000:0000:0000:ff00:0042:8329`) [^RFC8200][^RFC4291]. Dla czytelności dopuszczone są dwa uproszczenia zapisu: **pominięcie zer początkowych** w każdej grupie (`0db8` -> `db8`) oraz **zastąpienie jednej, kolejnej sekwencji grup samych zer** podwójnym dwukropkiem `::`. Taką operację można wykonać tylko **raz** w całym adresie, bo inaczej nie byłoby wiadomo, ile grup zer reprezentuje [^RFC5952]. Powyższy adres można więc zapisać skrócenie jako `2001:db8::ff00:42:8329`.

W IPv6 **nie występuje maska podsieci** w postaci znanej z IPv4 (np. `255.255.255.0`) granicę między częścią sieciową a hostową zapisuje się wyłącznie jako **prefiks** po `/`, czyli liczbę bitów części sieciowej (np. `2001:db8:1::/64`) [^RFC4291]. Przyjętym standardem dla sieci użytkowników końcowych jest prefiks `/64`; pozostałe 64 bity (identyfikator interfejsu) mogą być generowane automatycznie, m.in. na podstawie adresu MAC (EUI-64) lub losowo (Privacy Extensions) [^RFC4862].
</div>

Nagłówek IPv6 jest **uproszczony** względem IPv4 ma stałą długość 40 bajtów i mniej pól, co ułatwia szybkie przetwarzanie przez routery [^RFC8200][^kurose]:
- adres IPv6 źródłowy i docelowy (po 128 bitów każdy, zamiast 32 w IPv4),
- **Hop Limit** - maksymalna liczba przeskoków (routerów)(IPv4 - pola TTL), jaką może jeszcze wykonać pakiet, zanim zostanie usunięty z sieci,
- **Next Header** - odpowiednik pola Protocol z IPv4, wskazujący, jaki protokół/nagłówek rozszerzeń następuje po nagłówku głównym,
- **Flow Label** - pole nieobecne w IPv4, pozwalające oznaczyć pakiety należące do tego samego "przepływu" (np. jednej sesji streamingu), co ułatwia routerom jednolite traktowanie ruchu bez analizy wyższych warstw,
- **brak pola checksum** oraz **brak fragmentacji przez routery po drodze** - w IPv6 fragmentacji (jeśli jest potrzebna) dokonuje wyłącznie host źródłowy, a nie routery na trasie, co dodatkowo odciąża te urządzenia [^RFC8200].

**Typy adresów** (odpowiednik "klas" z IPv4, choć działający na zupełnie innej zasadzie - podział nie jest sztywno przypisany do bitów adresu, a do jego przeznaczenia) [^RFC4291][^cisco-ipv6]:
- **Unicast globalny** (*Global Unicast*) - publicznie routowalny w Internecie, zaczyna się od prefiksu `2000::/3`; odpowiednik publicznego adresu IPv4,
- **Unicast lokalny łącza** (*Link-Local*, `FE80::/10`) - automatycznie generowany na **każdym** interfejsie z obsługą IPv6, używany wyłącznie w ramach jednej sieci lokalnej (nie jest routowany).
- **Unikalny lokalny** (*Unique Local*, `FC00::/7`) - odpowiednik prywatnych adresów IPv4 (`10.0.0.0/8` itd.) - używany wewnątrz organizacji, nieroutowany w Internecie,
- **Multicast** (`FF00::/8`) — adres grupowy, odpowiednik multicastu z IPv4, ale w IPv6 **całkowicie zastępuje broadcast**, który w tym protokole **nie istnieje** - zamiast rozsyłać ruch do wszystkich hostów w sieci, używa się dedykowanych adresów multicast (np. `FF02::1` = wszystkie węzły w danym łączu),
- **Anycast** - ten sam adres przypisany wielu urządzeniom; pakiet dociera do **najbliższego** z nich (wg metryki routingu) - koncepcyjnie obecny też w IPv4, ale w IPv6 formalnie zdefiniowany jako osobny typ.

:::note
Głównym powodem powstania IPv6 było **wyczerpywanie się przestrzeni adresowej IPv4** (ok. 4,3 mld adresów, co przy liczbie urządzeń podłączonych do Internetu okazało się niewystarczające) — IPv6 oferuje przestrzeń adresową rzędu 2^128, praktycznie nieograniczoną na obecne potrzeby [^RFC8200][^tanen].
:::
</Step>
</StepByStep>

---

<div className="justify">
**Notacja CIDR** zastąpiła klasy: długość części sieciowej podaje się jako prefiks /n (od 0 do 32) [^RFC4632]. Umożliwia to podział na podsieci o dowolnej wielkości oraz agregację (sumaryzację, supernetting): np. 192.168.4.0/24–192.168.7.0/24 da się zapisać jako 192.168.4.0/22, co zmniejsza tablice routingu [^RFC4632][^tanen].
</div>

[^RFC791]: IETF, [RFC 791](https://www.rfc-editor.org/info/rfc791/) — Internet Protocol.

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^comer]: D. E. Comer, [Sieci komputerowe i intersieci]((https://www.google.com/search?q=%22Sieci+komputerowe+i+intersieci%22+Comer+Helion+wydanie+V)), wyd. V, Helion, Gliwice 2012.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).

[^RFC8200]: Deering, S., Hinden, R. — [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200).

[^RFC4291]: Hinden, R., Deering, S. — [RFC 4291: IP Version 6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291).

[^RFC4862]: Thomson, S., Narten, T., Jinmei, T. — [RFC 4862: IPv6 Stateless Address Autoconfiguration (SLAAC)](https://www.rfc-editor.org/rfc/rfc4862).

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 3, Helion, Gliwice 2006.

[^cisco-ipv6]: Cisco — [IPv6 Address Types](https://www.cisco.com/c/en/us/products/collateral/ios-nx-os-software/ios-ipv6/qa_c67-574995.html).

[^RFC5952]: Kawamura, S., Kawashima, M. — [RFC 5952: A Recommendation for IPv6 Address Text Representation](https://www.rfc-editor.org/rfc/rfc5952).

[^RFC4632]: RFC 4632 – [Classless Inter-domain Routing (CIDR)](https://www.rfc-editor.org/rfc/rfc4632), 2006.

[^jozefiok]: Józefiok A., CCNA 200-301. Zostań administratorem sieci komputerowych Cisco, wyd. II, Helion – rozdziały o routingu i NAT.