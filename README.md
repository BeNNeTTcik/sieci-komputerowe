# Sieci komputerowe — szablon strony (Docusaurus + GitHub Pages)

Gotowy szablon strony z materiałami do przedmiotu *Sieci komputerowe*, zawierający już
15 stron ćwiczeń (Część I: model ISO/OSI, Część II: zajęcia praktyczne).

## 1. Wymagania

- **Node.js** w wersji 18 lub nowszej — pobierz z [nodejs.org](https://nodejs.org) (wersja LTS).
- Konto na **GitHub** (darmowe).
- Zainstalowany **Git** — [git-scm.com](https://git-scm.com).

Sprawdź instalację w terminalu:

```bash
node -v
npm -v
git --version
```

## 2. Praca lokalna (podgląd na własnym komputerze)

W folderze `sieci-komputerowe` uruchom:

```bash
npm install
npm start
```

Strona otworzy się automatycznie pod adresem `http://localhost:3000/sieci-komputerowe/`
i będzie się odświeżać na żywo przy każdej zmianie pliku.

## 3. Dodawanie i edycja treści

- Każde ćwiczenie to osobny plik w folderze `docs/` (`cwiczenie-01.md` ... `cwiczenie-15.md`),
  edytowalny zwykłym edytorem tekstu — format to Markdown.
- Kolejność w menu bocznym określa pole `sidebar_position` w nagłówku pliku.
- **Obrazy, diagramy (SVG), gify** — wrzucaj do `static/img/` i wstawiaj w treści:

  ```md
  ![Opis obrazka](/img/nazwa-pliku.svg)
  ```

- **Wideo** — najprościej osadzić z YouTube/Vimeo bezpośrednio w pliku `.md`:

  ```md
  <iframe width="560" height="315" src="https://www.youtube.com/embed/ID_FILMU"
    title="Tytuł" frameborder="0" allowfullscreen></iframe>
  ```

- **Interaktywne widżety (quizy, klikane diagramy)** — zapisz jako plik `.html`
  w `static/` i osadź przez `<iframe src="/nazwa.html" width="100%" height="500" />`,
  albo wklej kod bezpośrednio do pliku `.md` (Docusaurus obsługuje MDX, czyli HTML/JSX
  wewnątrz Markdown).

## 4. Publikacja na GitHub Pages (za darmo)

### Krok 1 — utwórz repozytorium na GitHub

1. Wejdź na [github.com/new](https://github.com/new).
2. Nazwa repozytorium: **sieci-komputerowe** (dokładnie taka, jak nazwa tego folderu).
3. Ustaw jako **Public**, nie zaznaczaj żadnych dodatkowych opcji (README itp.).
4. Kliknij **Create repository**.

### Krok 2 — dostosuj konfigurację

W pliku `docusaurus.config.js` zamień `TWOJ-LOGIN` na swoją nazwę użytkownika GitHub
(pojawia się w kilku miejscach: `url`, `organizationName`, link do GitHub w navbarze).

### Krok 3 — wypchnij kod na GitHub

W terminalu, w folderze `sieci-komputerowe`:

```bash
git init
git add .
git commit -m "Pierwsza wersja strony"
git branch -M main
git remote add origin https://github.com/TWOJ-LOGIN/sieci-komputerowe.git
git push -u origin main
```

### Krok 4 — włącz GitHub Pages

1. Na stronie repozytorium wejdź w **Settings → Pages**.
2. W sekcji **Build and deployment → Source** wybierz **GitHub Actions**.
3. Gotowe — załączony w tym szablonie plik `.github/workflows/deploy.yml`
   automatycznie zbuduje i opublikuje stronę przy każdym `git push` na gałąź `main`.
4. Po chwili strona będzie dostępna pod adresem:
   `https://TWOJ-LOGIN.github.io/sieci-komputerowe/`

### Kolejne aktualizacje

Za każdym razem, gdy zmienisz treść (np. dodasz nowe ćwiczenie lub diagram),
wystarczy:

```bash
git add .
git commit -m "Opis zmiany"
git push
```

Strona zaktualizuje się automatycznie w ciągu ok. 1–2 minut.

## 5. Struktura folderów

```
sieci-komputerowe/
├── docs/                     ← treść ćwiczeń (Markdown)
│   ├── intro.md              ← strona główna
│   └── cwiczenie-01.md ... 15
├── static/
│   └── img/                  ← diagramy, gify, favicon, logo
├── src/
│   └── css/custom.css        ← kolory i style strony
├── docusaurus.config.js      ← główna konfiguracja (nazwa, adres, navbar)
├── sidebars.js               ← konfiguracja menu bocznego
└── .github/workflows/deploy.yml  ← automatyczna publikacja na GitHub Pages
```
