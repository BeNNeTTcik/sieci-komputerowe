---
sidebar_position: 0
title: Strona główna
---

# Testowanie bezpieczeństwa sieci TCP/IP — instrukcje laboratoryjne

Witaj w materiałach do przedmiotu **Testowanie bezpieczeństwa sieci TCP/IP**. Kurs składa się z pięciu laboratoriów (każde do 1 h):

- **Laboratorium 1** — Audyt konfiguracji i hardening urządzeń sieciowych
- **Laboratorium 2** — Monitorowanie infrastruktury i logowanie zdarzeń
- **Laboratorium 3** — Rozpoznawanie prób naruszenia bezpieczeństwa (anomalie w ruchu)
- **Laboratorium 4** — Analiza prób naruszenia sieci TCP/IP i wstępna klasyfikacja zdarzeń
- **Laboratorium 5** — Analiza incydentów i reagowanie na naruszenia

## Zaliczenie przedmiotu

"..." [^sylabus]

[^sylabus]: [Karty przedmiotów](/) Wydział Informatyki, Studia podyplomowe, Niestacjonarne, s. X.

## Budowa sieci laboratoryjnej

<div className="justify">
Każda **para studentów** pracuje na własnym zestawie: **2 routery** (R1-**X**, R2-**X**) i **1 przełącznik** (SW-**X**). Adresacja LAN: 172.16.**X**.0/24; adresacja między routerami: 10.10.**X**.0/30; podsieć zarządzania (administrator): 172.16.**X**.240/28.

**X — numer pary studentów liczony od strony drzwi wejściowych do sali.**
</div>

:::warning Zakres i zasady
Wszystkie ćwiczenia z atakami i podatnościami wykonujemy **wyłącznie w środowisku laboratoryjnym** (symulator / Packet Tracer), na własnym zestawie. Celem jest nauka **obrony**: rozpoznawania, analizy i reagowania. Hasła ustawiane w pracowni służą tylko do zajęć.
:::

### Aplikacje wykorzystywane podczas zajęć
<div className="justify">
[Cisco Packet Tracer](https://www.netacad.com/resources/lab-downloads?courseLang=en-US) — symulator routerów, przełączników i topologii sieciowych; pozwala ćwiczyć konfigurację i obserwować ruch bez fizycznego sprzętu.
</div>

[Wireshark](https://www.wireshark.org) — przechwytywanie i analiza ruchu sieciowego na poziomie pakietów.

[Narzędzia systemowe Windows](https://learn.microsoft.com/windows-server/administration/windows-commands/windows-commands) — `ipconfig`, `netstat`, `arp`, `route`, `tracert` oraz Podgląd zdarzeń (Event Viewer) do analizy logów lokalnych.
