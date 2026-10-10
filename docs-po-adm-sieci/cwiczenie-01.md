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
</StepByStep>


[^RFC791]: IETF, [RFC 791](https://www.rfc-editor.org/info/rfc791/) — Internet Protocol.

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^comer]: D. E. Comer, [Sieci komputerowe i intersieci]((https://www.google.com/search?q=%22Sieci+komputerowe+i+intersieci%22+Comer+Helion+wydanie+V)), wyd. V, Helion, Gliwice 2012.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).