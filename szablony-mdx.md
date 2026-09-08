---
sidebar_position: 99
title: "Szablony MDX — ściągawka"
---

# Szablony MDX — ściągawka

Zbiór sprawdzonych fragmentów kodu, które kompilator Docusaurusa (MDX) na pewno
zaakceptuje. Każdy blok możesz skopiować 1:1 do dowolnego pliku `.md` w folderze
`docs/`. Pamiętaj o dwóch zasadach MDX, które różnią się od zwykłego HTML:

1. **Każdy tag musi być zamknięty** — `<br />`, `<img />`, `<hr />` (nie `<br>`).
2. **Atrybut `style` to obiekt JS**, nie string — `style={{color: 'red'}}`,
   a nie `style="color: red;"`. Klasa CSS to `className`, nie `class`.

---

## 1. Wyśrodkowany tekst

Najprościej i zawsze zadziała:

````md
<center>
Ten tekst będzie wyśrodkowany.
</center>
````

Wariant z inline style (uwaga na podwójne klamry i camelCase):

````md
<div style={{textAlign: 'center'}}>
Wyśrodkowany tekst lub cały akapit.
</div>
````

Wyśrodkowanie obrazka:

````md
<div style={{textAlign: 'center'}}>

![Opis obrazka](/img/diagram.svg)

</div>
````

> Pusta linia przed i po `![...]` jest ważna — bez niej Markdown czasem nie
> rozpozna obrazka wewnątrz `<div>`.

---

## 2. Adnotacje (kolorowe ramki: tip / note / warning / danger / info)

Wbudowane w Docusaurusa, nie wymagają importu:

````md
:::tip Dobra praktyka
Treść porady, np. skrót klawiszowy albo szybszy sposób na coś.
:::

:::note
Neutralna notatka poboczna.
:::

:::info Do zapamiętania
Ważna informacja, na którą warto zwrócić uwagę.
:::

:::warning Uwaga
Coś, co może zaskoczyć albo wymaga ostrożności.
:::

:::danger Krytyczne
Błąd, którego popełnienie coś zepsuje (np. utrata konfiguracji).
:::
````

Własny tytuł ramki podajesz w tej samej linii co `:::tip`.

---

## 3. Bloki kodu z kolorowaniem składni

````md
```bash
ping 192.168.1.20
arp -a
```

```
Router(config)# interface gigabitEthernet 0/0
Router(config-if)# ip address 10.1.0.1 255.255.255.0
Router(config-if)# no shutdown
```

```python
print("Przykład kodu Python")
```
````

Podświetlenie konkretnych linii (np. do zaznaczenia ważnej komendy):

````md
```bash {2}
cd sieci-komputerowe
npm install
npm start
```
````

---

## 4. Zwijana sekcja (details/summary) — np. rozwiązanie zadania

````md
<details>
<summary>Kliknij, aby zobaczyć rozwiązanie</summary>

Tu wpisz treść, która domyślnie jest ukryta — np. odpowiedź do zadania,
przykładową konfigurację routera albo dłuższe wyjaśnienie.

```bash
show ip route
```

</details>
````

---

## 5. Zakładki (Tabs) — np. Windows / Linux / Cisco IOS

Zakładki **wymagają importu** na górze pliku (nad treścią, pod front matter):

````md
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="windows" label="Windows" default>

```bash
ipconfig /all
arp -a
```

  </TabItem>
  <TabItem value="linux" label="Linux">

```bash
ip link show
ip neigh
```

  </TabItem>
  <TabItem value="cisco" label="Cisco IOS">

```
Switch# show mac address-table
```

  </TabItem>
</Tabs>
````

---

## 6. Obrazy i diagramy (SVG, PNG, GIF) z `static/img/`

````md
![Opis obrazka (alt text)](/img/nazwa-pliku.svg)
````

Z podpisem pod obrazkiem (kursywa) i wyśrodkowaniem:

````md
<div style={{textAlign: 'center'}}>

![Ramka Ethernet](/img/ramka-ethernet.svg)

*Rysunek 1. Budowa ramki Ethernet wg IEEE 802.3*

</div>
````

Kontrola szerokości obrazka (czysty Markdown nie ma na to składni, potrzebny HTML):

````md
<img src="/img/diagram.svg" alt="Opis" width="500" />
````

---

## 7. Wideo z YouTube / Vimeo

````md
<div style={{position: 'relative', paddingBottom: '56.25%', height: 0}}>
  <iframe
    style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
    src="https://www.youtube.com/embed/ID_FILMU"
    title="Tytuł filmu"
    frameBorder="0"
    allowFullScreen>
  </iframe>
</div>
````

`paddingBottom: 56.25%` wymusza proporcje 16:9 niezależnie od szerokości ekranu
(responsywne wideo). Zwróć uwagę na `frameBorder` i `allowFullScreen` —
w JSX to camelCase, nie `frameborder`/`allowfullscreen` jak w zwykłym HTML.

---

## 8. Osadzenie własnego interaktywnego widżetu (HTML/JS/quiz)

1. Zapisz gotowy plik `.html` w `static/` (np. `static/quiz-osi.html`).
2. Osadź go przez `<iframe>`:

````md
<iframe
  src="/quiz-osi.html"
  width="100%"
  height="500"
  style={{border: 'none'}}
  title="Quiz — warstwy OSI">
</iframe>
````

---

## 9. Tabele

````md
| Warstwa | PDU     | Przykładowy protokół |
|---------|---------|-----------------------|
| 7       | Dane    | HTTP, DNS             |
| 4       | Segment | TCP, UDP              |
| 3       | Pakiet  | IP                    |
| 2       | Ramka   | Ethernet              |
````

---

## 10. Dwie kolumny obok siebie (np. tekst + obrazek)

````md
<div style={{display: 'flex', gap: '24px', alignItems: 'flex-start'}}>
  <div style={{flex: 1}}>

  Tekst po lewej stronie — może zawierać zwykły Markdown,
  **pogrubienia**, listy itd.

  </div>
  <div style={{flex: 1}}>

  ![Diagram](/img/diagram.svg)

  </div>
</div>
````

---

## 11. Przycisk / link stylizowany jako przycisk

````md
<a
  href="/cwiczenie-01"
  style={{
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '6px',
    background: 'var(--ifm-color-primary)',
    color: '#fff',
    textDecoration: 'none'
  }}>
  Przejdź do Ćwiczenia 1
</a>
````

---

## 12. Linki wewnętrzne między stronami

Linkowanie do innej strony w `docs/` — **bez** rozszerzenia `.md`, ścieżka
względna do bieżącego pliku:

````md
Zobacz też [Ćwiczenie 3 — warstwa sieciowa](./cwiczenie-03.md).
````

Link do konkretnego nagłówka na innej stronie (kotwica = nagłówek pisany
małymi literami, spacje zamienione na `-`):

````md
Patrz [sekcja Zadania w Ćwiczeniu 6](./cwiczenie-06.md#ii-zadania-do-wykonania).
````

---

## 13. Cytat blokowy

````md
> Ramka jest opisana w standardzie IEEE 802.3, Clause 3 —
> *MAC frame and packet specification*.
````

---

## 14. Znak specjalny / dosłowne klamry `{ }` w tekście

MDX interpretuje `{...}` jako kod JavaScript nawet w zwykłym tekście — jeśli
chcesz pokazać dosłowne klamry (np. we wzorze), zabezpiecz je:

````md
Adres zapisujemy jako `{IP, maska}` (w bloku kodu — zawsze bezpieczne).

Albo poza blokiem kodu: znak otwierający to \{ a zamykający to \}.
````

Najbezpieczniej: **zawsze owijaj fragmenty z `{ }` w pojedyncze backticki**
(`` `{tekst}` ``) — wtedy MDX traktuje to jako zwykły tekst, nie kod.

---

## 15. Emoji i ikony (bez dodatkowych bibliotek)

````md
✅ Zrobione | ❌ Do poprawy | ⚠️ Uwaga | 💡 Wskazówka | 📌 Ważne
````

---

## 16. Front matter — nagłówek każdego pliku ćwiczenia

Zawsze na samej górze pliku, przed jakąkolwiek treścią:

````md
---
sidebar_position: 6
title: "Ćwiczenie 6: Podstawowa konfiguracja urządzeń"
description: "Krótki opis widoczny w wynikach wyszukiwania"
---
````

---

## Najczęstsze błędy kompilacji MDX i jak ich unikać

| Objaw błędu | Przyczyna | Poprawka |
|---|---|---|
| `Unexpected token` przy `style="..."` | `style` jako string HTML | `style={{klucz: 'wartość'}}` |
| `Could not parse expression with acorn` | dosłowne `{` lub `}` w tekście | owiń w `` `backtiki` `` lub `\{` `\}` |
| `Expected a closing tag` | niezamknięty `<br>`, `<img>`, `<hr>` | dopisz `/` → `<br />` |
| Obrazek w `<div>` się nie wyświetla | brak pustej linii wokół `![...]` | dodaj pustą linię przed i po |
| `'class' is not a valid prop, did you mean 'className'?` | użyto `class=` zamiast `className=` | zamień na `className` |
