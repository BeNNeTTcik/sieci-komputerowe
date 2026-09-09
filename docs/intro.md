---
sidebar_position: 0
title: Strona główna
slug: /
---

# Sieci komputerowe — instrukcje laboratoryjne

Witaj w materiałach do przedmiotu **Sieci komputerowe**. Kurs podzielony jest na dwie części:

- **Część I (Ćwiczenia 1–5)** — model ISO/OSI: warstwy, enkapsulacja, adresacja, protokoły.
- **Część II (Ćwiczenia 6–15)** — zajęcia praktyczne w parach: konfiguracja routerów i przełącznika, routing statyczny i dynamiczny, VLAN, ACL, NAT/DHCP oraz projekt zaliczeniowy.

## Zaliczenie przedmiotu

XXXXXXXXXXXXXXXXXXXXXXXXXX

### Budowa sieci laboratoryjnej

![Siec](/img/0/siec.png)
<div className="text-center">
Rys.1 Sieć laboratoryjna [^cisco]
</div>
<div className="justify">
Każda **para studentów** pracuje na własnym zestawie: **2 routery** (R1-**X**, R2-**X**) i **1 przełącznik** (SW-**X**). Adresacja LAN: 172.16.**X**.0/24; Adresacja pomiedzy Routerami: 10.10.**X**.0/30.

**X - numer pary studentów liczony od strony drzwi wejsciowych do sali.**
</div>
[Pełna dokumentacja sieci laboratoryjnej wraz z konfiguracją urządzeń](/files/dokumentacja-lab-WI.pdf)

Szablony plików konfiguracyjnych urządzeń:
- Router [R1](/files/R1.txt).
- Router [R2](/files/R2.txt).
- Switch [SW](/files/SW.txt).

:::warning **Wykorzystanie plików konfiguracyjnych wymaga edycji pliku**
Należy zwrócić uwagę na adresacje IP, a dokładnie 3 oktet gdzie wartość oznacza numer pary studentów. 
:::

### Aplikacje wykorzystywane podczas zajęć
<div className="justify">
[Cisco Packet Tracer](https://www.netacad.com/resources/lab-downloads?courseLang=en-US)	- symulator routerów, przełączników i topologii sieciowych — pozwala ćwiczyć konfigurację bez fizycznego sprzętu. Posiada ograniecznia związane z konfiguracją niektórych protokołów. Wymaga konta w Cisco Networking Academy.

[Wireshark](https://www.wireshark.org) - przechwytywanie i analiza ruchu sieciowego na poziomie pakietów.

[hMailServer](https://www.hmailserver.com) - darmowy, lokalny serwer pocztowy (SMTP/POP3/IMAP) do demonstracji wysyłania maila między komputerami w sieci laboratoryjnej.

#### Dodatkowe platformy/aplikacje umozliwiające nauke w tej dziedzinie (HOME LAB)

[GNS3](https://www.gns3.com) - emulator routerów, przełączników i topologii sieciowych — pozwala ćwiczyć konfigurację bez fizycznego sprzętu. Posiadając obrazy urządzeń sieciowych użytkownik posiada pełne możliwości konfiguracyjne.

[VirtualBox](https://www.virtualbox.org) - wirtualizacji systemów operacyjnych w formie hipernadzorca typu drugiego. Element pozwalajacy emulować działanie PC w sieci stworzonej w GNS3.
</div>

[^cisco]: Grafika wykonana w programie - [Cisco Packet Tracer](https://www.netacad.com/resources/lab-downloads?courseLang=en-US)