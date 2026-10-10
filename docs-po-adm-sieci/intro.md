---
sidebar_position: 0
title: Strona główna
---

# Administrowanie sieciami — instrukcje laboratoryjne

Witaj w materiałach do przedmiotu **Administrowanie sieciami**. Kurs składa sie z:

- **Ćwiczenie I** — Adresacja IPv4 i IPv6 (2h)
- **Ćwiczenie II** — Konfiguracja urządzeń końcowych i diagnostyka sieci (3h)
- **Ćwiczenie III** — Podsieci, segmentacja i kontrola ruchu (2h)
- **Ćwiczenie IV** — Routing i translacja adresów (3h)

## Zaliczenie przedmiotu

"..." [^sylabus]

[^sylabus]: [Karty przedmiotów]() Wydział Informatyki, Studia podyplomowe, Niestacjonarne, s. X.

## Budowa sieci laboratoryjnej

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
</div>

[Wireshark](https://www.wireshark.org) - przechwytywanie i analiza ruchu sieciowego na poziomie pakietów.

[hMailServer](https://www.hmailserver.com) - darmowy, lokalny serwer pocztowy (SMTP/POP3/IMAP) do demonstracji wysyłania maila między komputerami w sieci laboratoryjnej.
