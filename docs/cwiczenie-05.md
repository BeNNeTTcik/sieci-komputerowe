---
sidebar_position: 5
title: "Ćwiczenie 5: Warstwy sesji, prezentacji i aplikacji. Podsumowanie OSI"
---

# Ćwiczenie 5: Warstwy sesji, prezentacji i aplikacji.

*Część I — Model ISO/OSI*

## I. Wprowadzenie
<div className="justify">
**Warstwa sesji** - odpowiada za nawiązywanie, utrzymywanie, synchronizację i kończenie sesji komunikacyjnej — czyli logicznego, trwającego dłużej niż pojedyncza transakcja "dialogu" między dwiema aplikacjami [^tanen]. Głowne funkcje jakie pełni warstwa to [^kurose]:
</div>
- **Zarządzanie dialogiem (dialog control)** - określa, w jaki sposób strony mogą się komunikować: pełny dupleks (obie strony nadają jednocześnie) albo półdupleks (strony na przemian przekazują sobie "prawo głosu", jak walkie-talkie).
- **Synchronizacja (synchronization points / checkpointing)** - przy długotrwałym transferze danych (np. przesyłaniu wielkiego pliku) warstwa sesji wstawia w strumień danych punkty synchronizacji (checkpointy). Jeśli w trakcie transferu dojdzie do awarii, wznowienie następuje od ostatniego checkpointu, a nie od samego początku.
- **Zarządzanie sesją (session management)** - obejmuje samo nawiązanie sesji (często z uwierzytelnieniem stron), utrzymywanie jej aktywności oraz uporządkowane zakończenie.

<div className="justify">
**Warstwa prezentacji** - odpowiada za to, żeby dane wysłane przez aplikację na jednym urządzeniu były zrozumiałe dla aplikacji na urządzeniu odbierającym [^tanen]. To warstwa, która zajmuje się **składnią przesyłanych danych**, a nie ich znaczeniem (tym zajmuje się dopiero warstwa aplikacji). Wewnątrz warstwy można wyróznic trzy głwone funkcje (Rysunek 1):
</div>

![Rys1](/img/5/funkcje.png)
<div className="text-center">
Rys.1 Kolejne etapy obróbki danych z aplikacji [^claude]
</div>

**Warstwa aplikacji** -

Ćwiczenie domyka model OSI, przedstawiając trzy górne warstwy: **sesji**, **prezentacji** i **aplikacji** (HTTP/HTTPS, DNS, DHCP, FTP, SMTP).

- **warstwa sesji** — zarządzanie cyklem życia sesji,
- **warstwa prezentacji** — kodowanie, kompresja, szyfrowanie,
- **warstwa aplikacji** — protokoły użytkowe,
- **pełna enkapsulacja** — dane → segment → pakiet → ramka → bity.

<!-- 💡 Tu możesz wstawić diagram, np.: ![Diagram](/img/cwiczenie-05-diagram.svg) -->

## II. Zadania do wykonania

1. Przechwycić zapytanie HTTP i DNS, wskazać warstwy OSI.
2. Przeanalizować proces DHCP (DORA).
3. Opisać krok po kroku, co dzieje się na każdej warstwie OSI dla scenariusza „otwarcie strony WWW”.
4. Rozwiązać test zamykający część teoretyczną.

## III. Bibliografia

[^tanen]: A. S. Tanenbaum, D. J. Wetherall, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Tanenbaum+Wetherall+Helion+wydanie+V), wyd. V, Helion, Gliwice 2012.

[^kurose]: J. F. Kurose, K. W. Ross, [Sieci komputerowe](https://www.google.com/search?q=%22Sieci+komputerowe%22+Kurose+Ross+Helion+wydanie+3), wyd. 7, Helion, Gliwice 2006.

[^claude]: Grafika wygenerowana przy pomocy – [Claude](https://claude.ai) (Anthropic).