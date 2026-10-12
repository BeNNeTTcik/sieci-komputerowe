// Pula scenariuszy projektowych dla <DesignScenario /> (ćwiczenie 14).
//
// Każdy scenariusz to fikcyjna organizacja: opis, schemat topologii, grupy
// urządzeń [nazwa, gdzie, liczba dziś, wymagania dostępu], planowany wzrost
// i "pułapki" projektowe. Scenariusze są celowo zróżnicowane pod względem
// kształtu sieci (patrz `topo` niżej) i wielkości grup (część wymaga
// podsieci większych niż /24).
//
// Dodanie scenariusza = dopisanie obiektu na końcu tablicy. Kolejność ma
// znaczenie: grupa X dostaje scenariusz nr ((X - 1) mod liczba) + 1, więc
// zmiana kolejności zmienia przydział grup.

// --- Szablony topologii -----------------------------------------------------

const topo = {
  // jeden budynek, jeden przełącznik
  single: (where) => [
    `[ISP] ---- R1 ---- SW1 (${where})`,
  ],
  // jeden budynek, przełącznik rdzeniowy + przełączniki na kondygnacjach
  floors: (core, ...access) => [
    `[ISP] ---- R1 ---- SW-CORE (${core})`,
    ...access.map((a, i) => `                     ${i === access.length - 1 ? '└' : '├'}──── SW-${i + 1} (${a})`),
  ],
  // kampus: kilka budynków połączonych światłowodem z budynkiem głównym
  campus: (main, ...others) => [
    `[ISP] ---- R1 ---- SW-${main.code} (${main.name})`,
    ...others.map((o, i) => `                     ${i === others.length - 1 ? '└' : '├'}==== światłowód ==== SW-${o.code} (${o.name})`),
  ],
  // przełącznik warstwy 3 w rdzeniu + router brzegowy
  l3core: (core, ...access) => [
    `[ISP] ---- R-EDGE ---- SW-L3 (${core}, routing między VLAN-ami)`,
    ...access.map((a, i) => `                          ${i === access.length - 1 ? '└' : '├'}──── SW-${i + 1} (${a})`),
  ],
  // dwie lokalizacje, łącze dzierżawione, internet tylko w centrali
  leased: (a, b) => [
    `[ISP] ---- R-${a.code} ====== łącze dzierżawione ====== R-${b.code}`,
    `             |                                        |`,
    `           SW-${a.code} (${a.name})${' '.repeat(Math.max(1, 26 - a.name.length))}SW-${b.code} (${b.name})`,
  ],
  // dwie lokalizacje, każda z własnym internetem, tunel IPsec między nimi
  vpn: (a, b) => [
    `[ISP-1] ---- R-${a.code} ~~~~~ tunel IPsec przez internet ~~~~~ R-${b.code} ---- [ISP-2]`,
    `               |                                              |`,
    `             SW-${a.code} (${a.name})${' '.repeat(Math.max(1, 32 - a.name.length))}SW-${b.code} (${b.name})`,
  ],
  // centrala + dwa oddziały (gwiazda). Przy tunelach IPsec każda lokalizacja
  // ma własne wyjście do internetu; przy łączach dzierżawionych — tylko centrala.
  hub: (hq, b1, b2, link) => {
    const W = 18;
    const col = (a, b, c) => (a.padEnd(W) + b.padEnd(W) + c).replace(/\s+$/, '');
    const vpn = link.includes('IPsec');
    const lines = [];
    if (vpn) {
      lines.push(col('[ISP]', '[ISP]', '[ISP]'));
      lines.push(col('  |', '  |', '  |'));
    } else {
      lines.push(col('', '[ISP]', ''));
      lines.push(col('', '  |', ''));
    }
    const sep = vpn ? '~~' : '==';
    lines.push(`R-${b1.code} ${sep}${link}${sep}`.padEnd(W) + `R-${hq.code} ${sep}${link}${sep}`.padEnd(W) + `R-${b2.code}`);
    lines.push(col('  |', '  |', '  |'));
    lines.push(col(`SW-${b1.code}`, `SW-${hq.code}`, `SW-${b2.code}`));
    lines.push(col(`(${b1.name})`, `(${hq.name})`, `(${b2.name})`));
    if (vpn) lines.push('', `~~ — tunel IPsec przez internet do centrali (R-${hq.code})`);
    return lines;
  },
};

const LEASED_DESC = 'Lokalizacje łączy łącze dzierżawione od operatora (bezpośrednie połączenie punkt-punkt między routerami). Internet jest tylko w centrali — druga lokalizacja wychodzi do internetu przez nią.';
const VPN_DESC = 'Każda lokalizacja ma własne łącze do internetu. Ruch między lokalizacjami ma iść szyfrowanym tunelem IPsec site-to-site (jak w ćwiczeniu 11), a ruch do internetu — lokalnie.';

// --- Często powtarzające się wymagania ---------------------------------------

const PRAC = 'internet, serwery, drukarki';
const GOSC = 'TYLKO internet';
const CAM = 'TYLKO rejestrator nagrań — bez internetu';
const VOIP = 'TYLKO centrala telefoniczna (serwer)';
const DRUK = 'przyjmują wydruki od pracowników';
const SRV = '—';
const ADM = (kto) => `WYŁĄCZNIE z ${kto}`;

// --- Scenariusze -------------------------------------------------------------

export const DESIGN_SCENARIOS = [
  // 1
  {
    name: 'Spedycja Kormoran', kind: 'firma spedycyjna — dwa budynki',
    description: 'Budynek A to biuro z serwerownią, budynek B to magazyn oddalony o 150 m. Wyjście do internetu jest w budynku A.',
    growth: [50, 3],
    topology: topo.campus({code: 'A', name: 'biuro'}, {code: 'B', name: 'magazyn'}),
    groups: [
      ['Administracja i księgowość', 'A', 25, PRAC],
      ['Obsługa klienta', 'A', 40, PRAC],
      ['Dział IT', 'A', 5, 'wszystko, w tym zarządzanie urządzeniami'],
      ['Terminale magazynowe', 'B', 30, 'TYLKO serwer ERP i drukarki — bez internetu'],
      ['Goście Wi-Fi', 'A i B', 50, GOSC],
      ['Drukarki', 'A i B', 10, 'przyjmują wydruki od pracowników i terminali'],
      ['Kamery', 'A i B', 20, CAM],
      ['Serwery (plikowy, ERP, rejestrator, DNS/DHCP)', 'A', 6, SRV],
      ['Zarządzanie', 'A i B', 8, ADM('działu IT')],
    ],
    notes: ['Jedno łącze między budynkami — co się stanie przy jego awarii?'],
  },
  // 2
  {
    name: 'Przychodnia Pod Lipami', kind: 'przychodnia — jeden budynek, dwie kondygnacje',
    description: 'Parter: rejestracja, poczekalnia, gabinety 1–4. Piętro: gabinety 5–10, pracownia USG/RTG i serwerownia. Urządzeniami zarządza zewnętrzna firma z jednego komputera w rejestracji.',
    growth: [30, 5],
    topology: topo.floors('piętro, serwerownia', 'parter', 'piętro'),
    groups: [
      ['Rejestracja', 'parter', 6, 'internet, serwer dokumentacji, drukarki'],
      ['Gabinety lekarskie', 'parter i piętro', 18, 'internet, serwer dokumentacji, drukarki'],
      ['Aparatura medyczna (USG, RTG)', 'piętro', 8, 'TYLKO serwer dokumentacji obrazowej — bez internetu'],
      ['Telefony VoIP', 'parter i piętro', 20, VOIP],
      ['Pacjenci Wi-Fi', 'parter', 40, GOSC],
      ['Drukarki', 'parter i piętro', 6, 'przyjmują wydruki od rejestracji i gabinetów'],
      ['Kamery', 'parter i piętro', 10, CAM],
      ['Serwery (dokumentacja, obrazy, centrala VoIP, rejestrator)', 'piętro', 4, SRV],
      ['Zarządzanie', 'wszystkie przełączniki i router', 6, ADM('jednego komputera administratora w rejestracji')],
    ],
    notes: [
      'Dostęp do zarządzania ma jeden konkretny komputer, a nie cała rejestracja — jak to zapisać w planie adresacji?',
      'Telefon i komputer w gabinecie często dzielą jedno gniazdo (telefon ma wbudowany przełącznik).',
    ],
  },
  // 3
  {
    name: 'Szkoła Podstawowa nr 77', kind: 'szkoła — jeden budynek, trzy kondygnacje',
    description: 'Parter: sekretariat, dyrekcja i pokój nauczycielski. 1. piętro: dwie pracownie komputerowe. 2. piętro: sale z tablicami interaktywnymi. Uczniowie korzystają z Wi-Fi w całym budynku.',
    growth: [20, 4],
    topology: topo.floors('parter', '1. piętro', '2. piętro'),
    groups: [
      ['Sekretariat i dyrekcja', 'parter', 6, PRAC],
      ['Nauczyciele', 'wszystkie piętra', 35, 'internet, serwer, drukarki, tablice interaktywne'],
      ['Pracownia komputerowa P1', '1. piętro', 25, 'internet, serwer plików — NIE sekretariat, NIE pracownia P2'],
      ['Pracownia komputerowa P2', '1. piętro', 25, 'internet, serwer plików — NIE sekretariat, NIE pracownia P1'],
      ['Tablice interaktywne', '2. piętro', 15, 'dostępne z komputerów nauczycieli'],
      ['Uczniowie Wi-Fi', 'wszystkie piętra', 220, GOSC],
      ['Drukarki', 'parter i 1. piętro', 8, 'przyjmują wydruki od sekretariatu i nauczycieli'],
      ['Serwery (plikowy, dziennik, DNS/DHCP)', 'parter', 3, SRV],
      ['Zarządzanie', 'wszystkie przełączniki i router', 10, ADM('sekretariatu')],
    ],
    notes: [
      'Pracownie P1 i P2 nie mogą się widzieć nawzajem (sprawdziany), choć stoją na tym samym piętrze.',
      'Policz Wi-Fi uczniów po wzroście — czy jeden rozmiar podsieci wystarczy dla wszystkich VLAN-ów?',
    ],
  },
  // 4
  {
    name: 'Biuro Rachunkowe Bilans', kind: 'dwie lokalizacje, łącze dzierżawione',
    description: 'Centrala w Gdyni i oddział w Gdańsku, każda z własnym routerem i przełącznikiem. ' + LEASED_DESC,
    growth: [50, 3],
    topology: topo.leased({code: 'GDY', name: 'Gdynia'}, {code: 'GDA', name: 'Gdańsk'}),
    groups: [
      ['Księgowi — Gdynia', 'Gdynia', 20, PRAC],
      ['Księgowi — Gdańsk', 'Gdańsk', 12, PRAC],
      ['Kadry i płace', 'Gdynia', 5, 'internet, serwery (JEDYNI z dostępem do serwera kadrowego), drukarki'],
      ['Telefony VoIP', 'Gdynia i Gdańsk', 35, VOIP + ' w Gdyni'],
      ['Goście Wi-Fi', 'Gdynia i Gdańsk', 30, GOSC],
      ['Drukarki', 'Gdynia i Gdańsk', 6, 'przyjmują wydruki od pracowników z tej samej lokalizacji'],
      ['Serwery (księgowy, kadrowy, centrala VoIP, DNS/DHCP)', 'Gdynia', 5, SRV],
      ['Zarządzanie', 'oba routery i przełączniki', 6, ADM('komputera administratora w Gdyni')],
    ],
    notes: [
      'VLAN nie przechodzi przez router — grupy obecne w obu lokalizacjach potrzebują osobnych podsieci w każdej z nich.',
      'Zaplanuj adresy tak, żeby każdą lokalizację dało się opisać JEDNĄ trasą zbiorczą.',
    ],
  },
  // 5
  {
    name: 'Hotel Bursztynowa Fala', kind: 'hotel — jeden budynek, cztery kondygnacje',
    description: 'Parter: recepcja, restauracja, sala konferencyjna i biuro. Piętra 1–3: pokoje gości z telewizorami IP. Zaplecze techniczne i serwerownia w piwnicy.',
    growth: [25, 5],
    topology: topo.floors('piwnica, serwerownia', 'parter', '1. piętro', '2. piętro', '3. piętro'),
    groups: [
      ['Recepcja i biuro', 'parter', 8, PRAC + ', system rezerwacji'],
      ['Terminale płatnicze', 'parter', 6, 'TYLKO internet (operator płatności) — izolowane od wszystkiego innego'],
      ['Telewizory IP w pokojach', 'piętra 1–3', 90, 'TYLKO serwer telewizji'],
      ['Goście Wi-Fi', 'cały budynek', 250, GOSC],
      ['Sala konferencyjna (rzutniki, laptopy prelegentów)', 'parter', 20, GOSC],
      ['Kamery', 'cały budynek', 24, CAM],
      ['Serwery (rezerwacje, telewizja, rejestrator)', 'piwnica', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 10, ADM('biura')],
    ],
    notes: [
      'Terminale płatnicze muszą być odseparowane od reszty sieci (wymóg operatora kart).',
      'Goście Wi-Fi po wzroście nie zmieszczą się w /24.',
    ],
  },
  // 6
  {
    name: 'Kancelaria Prawna Paragraf', kind: 'biuro — jedno piętro biurowca',
    description: 'Kancelaria zajmuje jedno piętro biurowca: sekretariat, 12 pokoi prawników, sala spotkań z klientami i archiwum cyfrowe.',
    growth: [30, 3],
    topology: topo.single('piętro biurowca'),
    groups: [
      ['Sekretariat', 'piętro', 4, PRAC],
      ['Prawnicy', 'piętro', 18, PRAC + ', archiwum dokumentów'],
      ['Aplikanci', 'piętro', 8, 'internet, drukarki, archiwum TYLKO do odczytu — NIE serwer księgowy'],
      ['Księgowość', 'piętro', 3, PRAC + ', serwer księgowy'],
      ['Klienci Wi-Fi (sala spotkań)', 'piętro', 15, GOSC],
      ['Telefony VoIP', 'piętro', 30, VOIP],
      ['Drukarki i skanery', 'piętro', 5, DRUK],
      ['Serwery (archiwum, księgowy, centrala VoIP)', 'piętro', 3, SRV],
      ['Zarządzanie', 'router i przełącznik', 2, ADM('komputera administratora zewnętrznej firmy IT (zdalnie)')],
    ],
    notes: ['Jeden przełącznik i jeden router — wszystkie decyzje dotyczą logiki, nie fizycznego rozmieszczenia.'],
  },
  // 7
  {
    name: 'Apteki Rumianek', kind: 'centrala + dwie apteki, tunele IPsec',
    description: 'Centrala z magazynem w Sopocie i dwie apteki: w Rumi i Redzie. ' + VPN_DESC,
    growth: [40, 4],
    topology: topo.hub({code: 'SOP', name: 'centrala'}, {code: 'RUM', name: 'apteka Rumia'}, {code: 'RED', name: 'apteka Reda'}, 'IPsec'),
    groups: [
      ['Biuro centrali', 'Sopot', 10, PRAC],
      ['Magazyn — terminale', 'Sopot', 8, 'TYLKO serwer magazynowy'],
      ['Stanowiska farmaceutów', 'Rumia i Reda', 6, 'internet (e-recepty), serwer magazynowy, drukarki'],
      ['Kasy fiskalne i terminale płatnicze', 'Rumia i Reda', 4, 'TYLKO internet — izolowane'],
      ['Kamery', 'wszystkie lokalizacje', 15, 'TYLKO rejestrator w centrali — bez internetu'],
      ['Drukarki', 'wszystkie lokalizacje', 6, DRUK],
      ['Serwery (magazynowy, rejestrator, DNS/DHCP)', 'Sopot', 3, SRV],
      ['Zarządzanie', 'wszystkie routery i przełączniki', 9, ADM('biura centrali')],
    ],
    notes: [
      'Kamery w aptekach wysyłają obraz do rejestratora w centrali — przez tunel.',
      'Każda apteka powinna dać się opisać jedną trasą zbiorczą (łatwiej zdefiniować ruch „interesujący” dla IPsec).',
    ],
  },
  // 8
  {
    name: 'Biblioteka Miejska Księgozbiór', kind: 'biblioteka — dwa budynki',
    description: 'Budynek główny (wypożyczalnia, czytelnia, biuro) i oddalona o 80 m mediateka z pracownią komputerową dla czytelników.',
    growth: [20, 5],
    topology: topo.campus({code: 'GL', name: 'budynek główny'}, {code: 'MED', name: 'mediateka'}),
    groups: [
      ['Bibliotekarze', 'oba budynki', 15, PRAC + ', system biblioteczny'],
      ['Katalogi komputerowe dla czytelników', 'oba budynki', 10, 'TYLKO system biblioteczny (wyszukiwarka)'],
      ['Komputery dla czytelników', 'mediateka', 20, 'TYLKO internet i drukarka w mediatece'],
      ['Czytelnicy Wi-Fi', 'oba budynki', 120, GOSC],
      ['Bramki RFID przy wyjściach', 'oba budynki', 4, 'TYLKO system biblioteczny'],
      ['Drukarki', 'oba budynki', 4, 'przyjmują wydruki od bibliotekarzy; drukarka w mediatece także od czytelników'],
      ['Serwery (system biblioteczny, plikowy)', 'budynek główny', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura w budynku głównym')],
    ],
    notes: ['Jedna drukarka ma inne zasady niż reszta drukarek — czy powinna być w tym samym VLAN-ie?'],
  },
  // 9
  {
    name: 'Urząd Gminy Zielony Gaj', kind: 'urząd — jeden budynek, dwie kondygnacje',
    description: 'Parter: biuro obsługi mieszkańców i kasa. Piętro: wydziały merytoryczne, sekretariat wójta, sala obrad rady i serwerownia.',
    growth: [15, 5],
    topology: topo.floors('piętro, serwerownia', 'parter', 'piętro'),
    groups: [
      ['Biuro obsługi mieszkańców', 'parter', 10, PRAC + ', system ewidencji'],
      ['Kasa', 'parter', 2, 'TYLKO system finansowy i drukarka fiskalna'],
      ['Wydziały merytoryczne', 'piętro', 35, PRAC + ', system ewidencji'],
      ['Sekretariat i wójt', 'piętro', 4, PRAC],
      ['Sala obrad (system głosowania, transmisja)', 'piętro', 25, 'TYLKO serwer głosowania i internet (transmisja)'],
      ['Mieszkańcy Wi-Fi', 'parter', 40, GOSC],
      ['Drukarki', 'parter i piętro', 8, DRUK],
      ['Serwery (ewidencja, finanse, głosowanie, DNS/DHCP)', 'piętro', 5, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 5, ADM('komputera informatyka urzędu')],
    ],
    notes: ['Kasa ma dużo węższe uprawnienia niż obsługa mieszkańców, choć siedzi obok.'],
  },
  // 10
  {
    name: 'Przedszkole Słoneczko', kind: 'mała placówka — jeden budynek',
    description: 'Parterowy budynek: biuro dyrektora, pokój nauczycieli, sześć sal z tabletami edukacyjnymi i kamerami dla rodziców (podgląd przez aplikację).',
    growth: [10, 5],
    topology: topo.single('budynek'),
    groups: [
      ['Dyrekcja i administracja', 'budynek', 3, PRAC],
      ['Nauczyciele', 'budynek', 12, PRAC],
      ['Tablety edukacyjne', 'sale', 30, 'TYLKO internet (aplikacje edukacyjne)'],
      ['Kamery w salach', 'sale', 6, 'TYLKO serwer podglądu — bez bezpośredniego dostępu z internetu'],
      ['Serwer podglądu dla rodziców', 'budynek', 1, 'dostępny z internetu (aplikacja rodziców) i dla kamer'],
      ['Rodzice Wi-Fi (szatnia)', 'budynek', 20, GOSC],
      ['Drukarki', 'budynek', 2, DRUK],
      ['Zarządzanie', 'router i przełącznik', 2, ADM('biura dyrekcji')],
    ],
    notes: ['Serwer podglądu jest jedynym urządzeniem dostępnym z internetu — gdzie go umieścić (strefa DMZ)?'],
  },
  // 11
  {
    name: 'Liceum Ogólnokształcące nr 3', kind: 'szkoła średnia — trzy budynki',
    description: 'Budynek główny (sale, administracja, serwerownia), sala gimnastyczna i internat. Internat ma własną sieć Wi-Fi dla mieszkańców.',
    growth: [15, 4],
    topology: topo.campus({code: 'GL', name: 'budynek główny'}, {code: 'SG', name: 'sala gimnastyczna'}, {code: 'INT', name: 'internat'}),
    groups: [
      ['Administracja i sekretariat', 'budynek główny', 8, PRAC],
      ['Nauczyciele', 'wszystkie budynki', 60, PRAC + ', dziennik'],
      ['Pracownie komputerowe (3 sale)', 'budynek główny', 60, 'internet, serwer plików — NIE administracja'],
      ['Uczniowie Wi-Fi', 'budynek główny i sala gimnastyczna', 400, GOSC],
      ['Mieszkańcy internatu Wi-Fi', 'internat', 80, GOSC + ' (z limitem w nocy — poza zakresem projektu)'],
      ['Tablica wyników i nagłośnienie', 'sala gimnastyczna', 3, 'TYLKO z komputerów nauczycieli WF'],
      ['Drukarki', 'budynek główny', 10, DRUK],
      ['Serwery (plikowy, dziennik, DNS/DHCP)', 'budynek główny', 3, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 12, ADM('administracji')],
    ],
    notes: ['Wi-Fi uczniów po wzroście nie mieści się w /24 — jaki prefiks jest potrzebny?'],
  },
  // 12
  {
    name: 'Wydział Nawigacji — budynek dydaktyczny', kind: 'uczelnia — jeden budynek, L3 w rdzeniu',
    description: 'Budynek z aulą, salami wykładowymi, laboratorium symulatorów nawigacyjnych i pokojami pracowników. Routing między VLAN-ami robi przełącznik warstwy 3, router brzegowy łączy z siecią uczelni.',
    growth: [20, 5],
    topology: topo.l3core('serwerownia', 'parter — aula', '1. piętro — sale', '2. piętro — laboratoria'),
    groups: [
      ['Pracownicy naukowi', 'wszystkie piętra', 70, PRAC + ', system dziekanatu (tylko odczyt)'],
      ['Dziekanat', 'parter', 8, PRAC + ', system dziekanatu'],
      ['Symulatory nawigacyjne', '2. piętro', 24, 'TYLKO serwer symulacji — bez internetu'],
      ['Komputery w salach (prowadzący)', '1. piętro', 20, 'internet, drukarki'],
      ['Studenci Wi-Fi', 'cały budynek', 600, GOSC],
      ['Drukarki', 'wszystkie piętra', 12, DRUK],
      ['Serwery (symulacji, plikowy)', 'serwerownia', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 10, ADM('pokoju administratora')],
    ],
    notes: [
      'Gdzie postawić ACL, skoro routing między VLAN-ami robi przełącznik L3, a nie router?',
      'Studenci Wi-Fi po wzroście: ile adresów i jaki prefiks?',
    ],
  },
  // 13
  {
    name: 'Laboratorium Analiz Morskich', kind: 'laboratorium badawcze — jeden budynek',
    description: 'Dwie kondygnacje: na parterze laboratoria z aparaturą pomiarową, na piętrze biura naukowców i serwerownia z serwerem obliczeniowym.',
    growth: [30, 4],
    topology: topo.floors('piętro, serwerownia', 'parter — laboratoria', 'piętro — biura'),
    groups: [
      ['Naukowcy', 'piętro', 25, PRAC + ', serwer obliczeniowy'],
      ['Aparatura pomiarowa (spektrometry, chromatografy)', 'parter', 14, 'TYLKO serwer danych pomiarowych — bez internetu'],
      ['Komputery sterujące aparaturą', 'parter', 14, 'aparatura w tym samym laboratorium i serwer danych — bez internetu'],
      ['Administracja', 'piętro', 5, PRAC],
      ['Goście (stażyści, partnerzy)', 'cały budynek', 25, GOSC],
      ['Drukarki', 'piętro', 4, DRUK],
      ['Serwery (danych pomiarowych, obliczeniowy, plikowy)', 'piętro', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('administratora w biurze')],
    ],
    notes: ['Aparatura ma przestarzałe systemy, których nie da się aktualizować — dlaczego to argument za mocną izolacją?'],
  },
  // 14
  {
    name: 'Zakład Produkcyjny Stalbud', kind: 'fabryka — trzy budynki',
    description: 'Biurowiec, hala produkcyjna i magazyn wyrobów gotowych. W hali działają sterowniki maszyn (PLC) i panele operatorskie.',
    growth: [30, 5],
    topology: topo.campus({code: 'BIU', name: 'biurowiec'}, {code: 'HAL', name: 'hala'}, {code: 'MAG', name: 'magazyn'}),
    groups: [
      ['Biuro i zarząd', 'biurowiec', 30, PRAC],
      ['Inżynierowie produkcji', 'biurowiec i hala', 10, PRAC + ', sieć sterowników (PLC)'],
      ['Sterowniki maszyn (PLC)', 'hala', 40, 'TYLKO serwer SCADA — bez internetu'],
      ['Panele operatorskie', 'hala', 15, 'TYLKO serwer SCADA'],
      ['Terminale magazynowe', 'magazyn', 20, 'TYLKO serwer ERP'],
      ['Kamery', 'wszystkie budynki', 30, CAM],
      ['Goście Wi-Fi', 'biurowiec', 30, GOSC],
      ['Serwery (ERP, SCADA, rejestrator, DNS/DHCP)', 'biurowiec', 6, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 12, ADM('działu IT w biurowcu')],
    ],
    notes: ['Sieć sterowników maszyn (OT) wymaga najściślejszej izolacji — awaria lub atak może zatrzymać produkcję.'],
  },
  // 15
  {
    name: 'Warsztat Samochodowy Tłok', kind: 'mały warsztat — jeden budynek',
    description: 'Biuro obsługi klienta, hala z czterema stanowiskami naprawczymi (komputery diagnostyczne) i poczekalnia.',
    growth: [50, 3],
    topology: topo.single('budynek'),
    groups: [
      ['Biuro obsługi klienta', 'biuro', 3, PRAC],
      ['Komputery diagnostyczne', 'hala', 4, 'internet (aktualizacje producentów), serwer warsztatowy'],
      ['Tester diagnostyczny podłączany do aut', 'hala', 4, 'TYLKO komputery diagnostyczne'],
      ['Klienci Wi-Fi (poczekalnia)', 'poczekalnia', 15, GOSC],
      ['Kamery', 'hala i plac', 6, CAM],
      ['Drukarki', 'biuro', 2, DRUK],
      ['Serwer warsztatowy i rejestrator', 'biuro', 2, SRV],
      ['Zarządzanie', 'router i przełącznik', 2, ADM('biura')],
    ],
    notes: ['Sieć jest bardzo mała — czy ma sens aż tyle VLAN-ów? Uzasadnij każdy.'],
  },
  // 16
  {
    name: 'Salon Samochodowy AutoMewa', kind: 'salon z serwisem — dwa budynki',
    description: 'Salon sprzedaży z biurem oraz oddzielny budynek serwisu. Klienci czekają w salonie i mają Wi-Fi.',
    growth: [30, 4],
    topology: topo.campus({code: 'SAL', name: 'salon'}, {code: 'SER', name: 'serwis'}),
    groups: [
      ['Doradcy handlowi', 'salon', 10, PRAC + ', system dealerski'],
      ['Księgowość', 'salon', 4, PRAC + ', serwer księgowy'],
      ['Doradcy serwisowi', 'serwis', 6, PRAC + ', system dealerski'],
      ['Stanowiska diagnostyczne', 'serwis', 8, 'internet (producent), system dealerski'],
      ['Ekrany reklamowe w salonie', 'salon', 6, 'TYLKO serwer treści'],
      ['Klienci Wi-Fi', 'salon', 40, GOSC],
      ['Drukarki', 'oba budynki', 6, DRUK],
      ['Serwery (dealerski, księgowy, treści)', 'salon', 3, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 5, ADM('komputera kierownika IT w salonie')],
    ],
    notes: ['Serwer księgowy — kto ma do niego dostęp, a kto nie?'],
  },
  // 17
  {
    name: 'Klub Fitness Forma', kind: 'siłownia — jeden budynek, dwie kondygnacje',
    description: 'Parter: recepcja z bramkami wejściowymi, szatnie i strefa cardio z bieżniami podłączonymi do sieci. Piętro: sale zajęć i biuro.',
    growth: [40, 3],
    topology: topo.floors('piętro, biuro', 'parter', 'piętro'),
    groups: [
      ['Recepcja', 'parter', 3, PRAC + ', system karnetów'],
      ['Bramki wejściowe', 'parter', 4, 'TYLKO system karnetów'],
      ['Bieżnie i rowery z ekranami', 'parter', 30, 'TYLKO internet (treści treningowe)'],
      ['Biuro', 'piętro', 4, PRAC],
      ['Klubowicze Wi-Fi', 'cały budynek', 150, GOSC],
      ['Nagłośnienie sal', 'piętro', 4, 'TYLKO z komputera instruktora'],
      ['Komputer instruktora', 'piętro', 2, 'internet, nagłośnienie'],
      ['Serwer karnetów', 'piętro', 1, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura')],
    ],
    notes: ['Bieżnie mają internet, ale nie mogą sięgać do systemu karnetów.'],
  },
  // 18
  {
    name: 'Kino Studyjne Kadr', kind: 'kino — jeden budynek',
    description: 'Hol z kasami i barem, trzy sale kinowe z projektorami cyfrowymi i biuro. Seanse są sterowane z serwera kinowego.',
    growth: [20, 5],
    topology: topo.floors('kabina projekcyjna', 'hol', 'sale kinowe'),
    groups: [
      ['Kasy biletowe', 'hol', 4, 'internet (sprzedaż online), serwer biletowy'],
      ['Terminale płatnicze', 'hol', 5, 'TYLKO internet — izolowane'],
      ['Projektory cyfrowe i serwery odtwarzania', 'sale kinowe', 6, 'TYLKO serwer kinowy — bez internetu'],
      ['Ekrany repertuaru w holu', 'hol', 6, 'TYLKO serwer treści'],
      ['Biuro', 'kabina', 4, PRAC],
      ['Widzowie Wi-Fi', 'hol', 80, GOSC],
      ['Serwery (kinowy, biletowy, treści)', 'kabina', 3, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura')],
    ],
    notes: ['Filmy na serwerze kinowym są chronione prawem autorskim — projektory nie mogą mieć kontaktu z internetem.'],
  },
  // 19
  {
    name: 'Muzeum Morskie Latarnia', kind: 'muzeum — dwa budynki',
    description: 'Gmach wystawowy z interaktywnymi stanowiskami i budynek administracyjno-magazynowy ze zbiorami. Zbiory są monitorowane czujnikami temperatury i wilgotności.',
    growth: [20, 5],
    topology: topo.campus({code: 'WYS', name: 'gmach wystawowy'}, {code: 'ADM', name: 'administracja'}),
    groups: [
      ['Pracownicy administracji', 'administracja', 15, PRAC],
      ['Kustosze', 'oba budynki', 8, PRAC + ', system katalogu zbiorów'],
      ['Stanowiska interaktywne', 'gmach wystawowy', 20, 'TYLKO serwer treści multimedialnych'],
      ['Czujniki klimatu', 'oba budynki', 30, 'TYLKO serwer monitoringu klimatu'],
      ['Kamery', 'oba budynki', 40, CAM],
      ['Zwiedzający Wi-Fi', 'gmach wystawowy', 200, GOSC],
      ['Kasy', 'gmach wystawowy', 3, 'internet (bilety online), serwer biletowy'],
      ['Serwery (katalog, treści, klimat, rejestrator, biletowy)', 'administracja', 5, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 8, ADM('działu IT w administracji')],
    ],
    notes: ['Czujniki i kamery to urządzenia IoT — często mają słabe zabezpieczenia.'],
  },
  // 20
  {
    name: 'Marina Jachtowa Keja', kind: 'port jachtowy — dwa budynki',
    description: 'Bosmanat z recepcją i biurem oraz budynek sanitarno-techniczny przy pomostach. Żeglarze korzystają z Wi-Fi na całym terenie.',
    growth: [50, 4],
    topology: topo.campus({code: 'BOS', name: 'bosmanat'}, {code: 'POM', name: 'budynek przy pomostach'}),
    groups: [
      ['Bosmanat i recepcja', 'bosmanat', 6, PRAC + ', system rezerwacji miejsc'],
      ['Słupki energetyczne na pomostach (liczniki)', 'pomosty', 40, 'TYLKO serwer rozliczeń energii'],
      ['Stacja pogodowa i czujniki poziomu wody', 'pomosty', 6, 'TYLKO serwer pogodowy'],
      ['Ekran z prognozą pogody', 'bosmanat', 2, 'TYLKO serwer pogodowy'],
      ['Żeglarze Wi-Fi', 'cały teren', 300, GOSC],
      ['Kamery', 'cały teren', 20, CAM],
      ['Serwery (rezerwacje, rozliczenia, pogodowy, rejestrator)', 'bosmanat', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 8, ADM('biura bosmanatu')],
    ],
    notes: ['Liczba żeglarzy rośnie latem kilkukrotnie — przyjmij szczyt sezonu jako „dziś”.'],
  },
  // 21
  {
    name: 'Terminal Kontenerowy Nabrzeże', kind: 'terminal portowy — L3 w rdzeniu, trzy strefy',
    description: 'Biurowiec terminalu, brama wjazdowa dla ciężarówek i plac składowy z dźwigami. Routing między VLAN-ami robi przełącznik warstwy 3 w biurowcu.',
    growth: [30, 5],
    topology: topo.l3core('biurowiec', 'biurowiec — piętra', 'brama wjazdowa', 'plac składowy'),
    groups: [
      ['Pracownicy biurowi', 'biurowiec', 60, PRAC + ', system terminalowy'],
      ['Planiści operacji', 'biurowiec', 10, PRAC + ', system terminalowy, systemy dźwigów'],
      ['Czytniki tablic i kontenerów (OCR) na bramie', 'brama', 8, 'TYLKO system terminalowy'],
      ['Terminale w kabinach dźwigów i wozów', 'plac', 25, 'TYLKO system terminalowy'],
      ['Sterowniki dźwigów', 'plac', 10, 'TYLKO z komputerów planistów — bez internetu'],
      ['Kamery', 'cały teren', 60, CAM],
      ['Kierowcy Wi-Fi (brama)', 'brama', 40, GOSC],
      ['Serwery (system terminalowy, rejestrator, DNS/DHCP)', 'biurowiec', 6, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 15, ADM('działu IT')],
    ],
    notes: ['Sterowniki dźwigów to infrastruktura krytyczna — dostęp tylko z wąskiej grupy komputerów.'],
  },
  // 22
  {
    name: 'Stocznia Remontowa Dok', kind: 'stocznia — trzy budynki',
    description: 'Biurowiec z biurem konstrukcyjnym, hala warsztatowa i budynek przy suchym doku. W hali i przy doku pracują tablety brygadzistów.',
    growth: [25, 5],
    topology: topo.campus({code: 'BIU', name: 'biurowiec'}, {code: 'HAL', name: 'hala'}, {code: 'DOK', name: 'suchy dok'}),
    groups: [
      ['Biuro i zarząd', 'biurowiec', 25, PRAC],
      ['Biuro konstrukcyjne (stacje CAD)', 'biurowiec', 15, PRAC + ', serwer rysunków'],
      ['Tablety brygadzistów', 'hala i dok', 20, 'TYLKO serwer rysunków (odczyt) i system zleceń'],
      ['Maszyny CNC', 'hala', 6, 'TYLKO serwer programów CNC — bez internetu'],
      ['Czujniki doku (poziom wody, pompy)', 'dok', 10, 'TYLKO serwer SCADA'],
      ['Kamery', 'wszystkie budynki', 35, CAM],
      ['Serwery (rysunki, zlecenia, CNC, SCADA, rejestrator)', 'biurowiec', 6, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 10, ADM('działu IT')],
    ],
    notes: ['Tablety przemieszczają się między halą a dokiem — w którym VLAN-ie są w każdym z tych miejsc?'],
  },
  // 23
  {
    name: 'Biuro Projektowe Kreska', kind: 'biuro — jedno piętro',
    description: 'Architekci pracują na wydajnych stacjach roboczych, a duże pliki projektów trzymają na serwerze NAS. Klienci przychodzą na prezentacje.',
    growth: [40, 3],
    topology: topo.single('piętro'),
    groups: [
      ['Architekci (stacje robocze)', 'piętro', 20, PRAC + ', NAS'],
      ['Asystenci', 'piętro', 6, 'internet, drukarki, NAS tylko do odczytu'],
      ['Administracja', 'piętro', 3, PRAC],
      ['Ploter i drukarki', 'piętro', 4, DRUK],
      ['Ekran prezentacyjny w sali klientów', 'piętro', 1, 'TYLKO z komputerów architektów'],
      ['Klienci Wi-Fi', 'piętro', 15, GOSC],
      ['Serwer NAS i kopie zapasowe', 'piętro', 2, SRV],
      ['Zarządzanie', 'router i przełącznik', 2, ADM('komputera administracji')],
    ],
    notes: ['Duże pliki: zastanów się, czy ruch stacji do NAS powinien w ogóle przechodzić przez router.'],
  },
  // 24
  {
    name: 'Agencja Reklamowa Pixel', kind: 'dwie lokalizacje, tunel IPsec',
    description: 'Studio w Gdańsku i biuro handlowe w Warszawie. ' + VPN_DESC,
    growth: [60, 3],
    topology: topo.vpn({code: 'GDA', name: 'studio Gdańsk'}, {code: 'WAW', name: 'biuro Warszawa'}),
    groups: [
      ['Graficy', 'Gdańsk', 18, PRAC + ', serwer projektów'],
      ['Montażyści wideo', 'Gdańsk', 6, PRAC + ', serwer projektów'],
      ['Handlowcy', 'Warszawa', 10, 'internet, drukarki, serwer projektów tylko do odczytu'],
      ['Administracja', 'Gdańsk', 4, PRAC],
      ['Klienci Wi-Fi', 'Gdańsk i Warszawa', 25, GOSC],
      ['Drukarki', 'Gdańsk i Warszawa', 4, 'przyjmują wydruki od pracowników z tej samej lokalizacji'],
      ['Serwery (projektów, kopie zapasowe)', 'Gdańsk', 2, SRV],
      ['Zarządzanie', 'oba routery i przełączniki', 4, ADM('komputera administracji w Gdańsku')],
    ],
    notes: ['Ruch handlowców do serwera projektów idzie przez tunel; ruch do internetu — lokalnie. Jak odróżni je router?'],
  },
  // 25
  {
    name: 'Studio Nagrań Fala Dźwięku', kind: 'studio — jeden budynek',
    description: 'Dwie reżyserki, trzy pomieszczenia nagraniowe, biuro i strefa dla muzyków. Sprzęt audio przesyła dźwięk po sieci (audio-over-IP).',
    growth: [20, 4],
    topology: topo.floors('reżyserka A', 'reżyserki', 'nagraniowe i biuro'),
    groups: [
      ['Komputery realizatorów', 'reżyserki', 4, 'internet, serwer projektów, sieć audio'],
      ['Sieć audio-over-IP (konsolety, przetworniki)', 'reżyserki i nagraniowe', 20, 'TYLKO komputery realizatorów — bez internetu'],
      ['Biuro', 'biuro', 3, PRAC],
      ['Muzycy Wi-Fi', 'cały budynek', 30, GOSC],
      ['Kamery (podgląd sal)', 'nagraniowe', 4, 'TYLKO komputery realizatorów'],
      ['Serwer projektów i kopie', 'reżyserka A', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 3, ADM('komputera realizatora w reżyserce A')],
    ],
    notes: ['Ruch audio jest bardzo wrażliwy na opóźnienia i rozgłoszenia — osobny VLAN to tu kwestia jakości, nie tylko bezpieczeństwa.'],
  },
  // 26
  {
    name: 'Redakcja Gazety Puls Wybrzeża', kind: 'redakcja — jeden budynek, dwie kondygnacje',
    description: 'Parter: newsroom i studio wideo. Piętro: dział składu, reklamy, administracja i serwerownia.',
    growth: [20, 4],
    topology: topo.floors('piętro, serwerownia', 'parter — newsroom', 'piętro — biura'),
    groups: [
      ['Dziennikarze', 'parter', 40, PRAC + ', system redakcyjny'],
      ['Dział składu (DTP)', 'piętro', 8, PRAC + ', system redakcyjny, serwer materiałów'],
      ['Dział reklamy', 'piętro', 10, 'internet, drukarki, system reklamowy — NIE system redakcyjny'],
      ['Studio wideo (kamery IP, mikser)', 'parter', 8, 'TYLKO serwer materiałów i internet (transmisje na żywo)'],
      ['Administracja', 'piętro', 6, PRAC],
      ['Goście Wi-Fi', 'parter', 30, GOSC],
      ['Drukarki', 'oba piętra', 6, DRUK],
      ['Serwery (redakcyjny, materiałów, reklamowy)', 'piętro', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 5, ADM('działu IT')],
    ],
    notes: ['Rozdział redakcji od reklamy wynika z zasad etyki dziennikarskiej, nie tylko z techniki.'],
  },
  // 27
  {
    name: 'Call Center Linia Plus', kind: 'biuro — dwa piętra, L3 w rdzeniu',
    description: 'Dwa piętra stanowisk konsultantów z telefonami VoIP, salą szkoleniową i biurem kierownictwa. Routing między VLAN-ami robi przełącznik warstwy 3.',
    growth: [50, 2],
    topology: topo.l3core('serwerownia', '1. piętro', '2. piętro'),
    groups: [
      ['Konsultanci (komputery)', 'oba piętra', 120, 'internet (wybrane strony — poza zakresem), system CRM'],
      ['Telefony VoIP konsultantów', 'oba piętra', 120, VOIP],
      ['Kierownicy zmian', 'oba piętra', 8, PRAC + ', CRM, nagrania rozmów'],
      ['Sala szkoleniowa', '2. piętro', 20, 'internet, CRM (środowisko testowe)'],
      ['Administracja i HR', '2. piętro', 8, PRAC],
      ['Serwery (CRM, centrala VoIP, nagrania rozmów)', 'serwerownia', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 8, ADM('działu IT')],
    ],
    notes: ['Konsultanci i telefony po wzroście: po 180 urządzeń — sprawdź rozmiar podsieci.'],
  },
  // 28
  {
    name: 'Oddział Banku Spółdzielczego Kotwica', kind: 'oddział + centrala, łącze dzierżawione',
    description: 'Mały oddział w Pucku połączony z centralą w Wejherowie. ' + LEASED_DESC,
    growth: [10, 5],
    topology: topo.leased({code: 'WEJ', name: 'centrala'}, {code: 'PCK', name: 'oddział Puck'}),
    groups: [
      ['Pracownicy centrali', 'Wejherowo', 30, PRAC + ', system bankowy'],
      ['Kasjerzy oddziału', 'Puck', 4, 'TYLKO system bankowy i drukarki — bez internetu'],
      ['Doradcy klienta', 'Puck', 4, 'internet, system bankowy, drukarki'],
      ['Bankomat i wpłatomat', 'Puck', 2, 'TYLKO serwer obsługi bankomatów w centrali'],
      ['Kamery', 'obie lokalizacje', 20, 'TYLKO rejestrator w centrali — bez internetu'],
      ['Drukarki', 'obie lokalizacje', 6, DRUK],
      ['Serwery (bankowy, bankomatów, rejestrator)', 'Wejherowo', 4, SRV],
      ['Zarządzanie', 'oba routery i przełączniki', 6, ADM('działu IT w centrali')],
    ],
    notes: ['W tym scenariuszu nie ma sieci gości — dlaczego?'],
  },
  // 29
  {
    name: 'Biuro Podróży Kompas', kind: 'centrala + dwa salony, tunele IPsec',
    description: 'Centrala w Gdyni i dwa salony sprzedaży w galeriach handlowych. ' + VPN_DESC,
    growth: [50, 3],
    topology: topo.hub({code: 'GDY', name: 'centrala'}, {code: 'S1', name: 'salon 1'}, {code: 'S2', name: 'salon 2'}, 'IPsec'),
    groups: [
      ['Pracownicy centrali', 'Gdynia', 15, PRAC + ', system rezerwacji'],
      ['Sprzedawcy w salonach', 'salony', 6, 'internet, system rezerwacji, drukarki'],
      ['Ekrany z ofertami', 'salony', 4, 'TYLKO serwer treści w centrali'],
      ['Terminale płatnicze', 'salony', 3, 'TYLKO internet — izolowane'],
      ['Klienci Wi-Fi', 'salony', 20, GOSC],
      ['Drukarki', 'wszystkie lokalizacje', 5, 'przyjmują wydruki od pracowników z tej samej lokalizacji'],
      ['Serwery (rezerwacji, treści)', 'Gdynia', 2, SRV],
      ['Zarządzanie', 'wszystkie routery i przełączniki', 9, ADM('komputera administratora w centrali')],
    ],
    notes: ['Ekrany w salonach pobierają treści z centrali przez tunel — dobierz adresy, które łatwo opisać w ACL dla IPsec.'],
  },
  // 30
  {
    name: 'Hostel Pod Żaglami', kind: 'hostel — jeden budynek',
    description: 'Trzy kondygnacje z pokojami wieloosobowymi, recepcja całodobowa, kuchnia wspólna i pralnia z pralkami na karty.',
    growth: [30, 3],
    topology: topo.floors('parter', 'parter — recepcja', '1. piętro', '2. piętro'),
    groups: [
      ['Recepcja', 'parter', 2, PRAC + ', system rezerwacji'],
      ['Zamki elektroniczne w drzwiach', 'piętra', 30, 'TYLKO serwer zamków'],
      ['Pralki i suszarki na karty', 'parter', 6, 'TYLKO serwer rozliczeń'],
      ['Goście Wi-Fi', 'cały budynek', 180, GOSC],
      ['Kamery', 'korytarze i wejście', 12, CAM],
      ['Serwery (rezerwacje, zamki, rozliczenia, rejestrator)', 'parter', 3, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('recepcji')],
    ],
    notes: ['Zamki w drzwiach muszą być nieosiągalne z sieci gości — co by się stało, gdyby były?'],
  },
  // 31
  {
    name: 'Klinika Weterynaryjna Łapa', kind: 'klinika — jeden budynek',
    description: 'Recepcja, poczekalnia, cztery gabinety, sala operacyjna, pracownia RTG i laboratorium.',
    growth: [30, 4],
    topology: topo.single('budynek'),
    groups: [
      ['Recepcja', 'budynek', 3, PRAC + ', system kliniki'],
      ['Lekarze weterynarii', 'budynek', 10, PRAC + ', system kliniki, serwer RTG'],
      ['Aparat RTG i analizatory laboratoryjne', 'budynek', 5, 'TYLKO serwer RTG i system kliniki — bez internetu'],
      ['Monitory parametrów życiowych (sala operacyjna)', 'budynek', 3, 'TYLKO komputery lekarzy'],
      ['Klienci Wi-Fi', 'poczekalnia', 20, GOSC],
      ['Drukarki', 'budynek', 3, DRUK],
      ['Serwery (system kliniki, RTG)', 'budynek', 2, SRV],
      ['Zarządzanie', 'router i przełącznik', 2, ADM('recepcji')],
    ],
    notes: ['Monitory na sali operacyjnej — awaria sieci nie może im przeszkodzić. Co to oznacza dla projektu?'],
  },
  // 32
  {
    name: 'Centrum Stomatologiczne Uśmiech', kind: 'dwie lokalizacje, łącze dzierżawione',
    description: 'Gabinety w Gdyni (z pracownią tomografii) i mniejsza filia w Rumi. ' + LEASED_DESC,
    growth: [40, 4],
    topology: topo.leased({code: 'GDY', name: 'Gdynia'}, {code: 'RUM', name: 'Rumia'}),
    groups: [
      ['Recepcja', 'Gdynia i Rumia', 4, PRAC + ', system gabinetowy'],
      ['Stomatolodzy', 'Gdynia i Rumia', 12, PRAC + ', system gabinetowy, serwer zdjęć'],
      ['Tomograf i radiowizjografy', 'Gdynia i Rumia', 6, 'TYLKO serwer zdjęć w Gdyni — bez internetu'],
      ['Pacjenci Wi-Fi', 'Gdynia i Rumia', 25, GOSC],
      ['Telefony VoIP', 'Gdynia i Rumia', 12, VOIP + ' w Gdyni'],
      ['Serwery (gabinetowy, zdjęć, centrala VoIP)', 'Gdynia', 3, SRV],
      ['Zarządzanie', 'oba routery i przełączniki', 4, ADM('recepcji w Gdyni')],
    ],
    notes: ['Zdjęcia z tomografu są duże — czy łącze dzierżawione udźwignie ich przesyłanie z Rumi?'],
  },
  // 33
  {
    name: 'Market Spożywczy Koszyk', kind: 'sklep — jeden budynek',
    description: 'Sala sprzedaży z kasami i kasami samoobsługowymi, zaplecze z magazynem, biuro kierownika. Cenówki na półkach są elektroniczne.',
    growth: [20, 3],
    topology: topo.floors('zaplecze', 'sala sprzedaży', 'zaplecze i biuro'),
    groups: [
      ['Kasy i kasy samoobsługowe', 'sala sprzedaży', 12, 'TYLKO serwer sklepowy'],
      ['Terminale płatnicze', 'sala sprzedaży', 12, 'TYLKO internet — izolowane'],
      ['Elektroniczne cenówki (stacje bazowe)', 'sala sprzedaży', 8, 'TYLKO serwer sklepowy'],
      ['Skanery magazynowe', 'zaplecze', 10, 'TYLKO serwer sklepowy'],
      ['Biuro kierownika', 'zaplecze', 3, PRAC + ', serwer sklepowy'],
      ['Kamery', 'cały sklep', 30, CAM],
      ['Klienci Wi-Fi', 'sala sprzedaży', 100, GOSC],
      ['Serwery (sklepowy, rejestrator)', 'zaplecze', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura kierownika')],
    ],
    notes: ['Kasy i terminale płatnicze stoją obok siebie, ale mają zupełnie inne wymagania.'],
  },
  // 34
  {
    name: 'Centrum Logistyczne Paleta', kind: 'magazyn wysokiego składowania — L3 w rdzeniu',
    description: 'Duża hala magazynowa z regałami, strefą załadunku i biurowcem. Wózki widłowe i skanery pracują przez Wi-Fi. Routing między VLAN-ami robi przełącznik warstwy 3.',
    growth: [40, 4],
    topology: topo.l3core('biurowiec', 'biurowiec', 'hala — strefa A', 'hala — strefa B', 'rampy załadunkowe'),
    groups: [
      ['Pracownicy biurowi', 'biurowiec', 40, PRAC + ', system WMS'],
      ['Skanery ręczne', 'hala', 80, 'TYLKO system WMS'],
      ['Terminale na wózkach widłowych', 'hala', 30, 'TYLKO system WMS'],
      ['Drukarki etykiet', 'hala i rampy', 15, 'przyjmują wydruki od systemu WMS i biura'],
      ['Kierowcy Wi-Fi (rampy)', 'rampy', 50, GOSC],
      ['Kamery', 'cały obiekt', 60, CAM],
      ['Serwery (WMS, rejestrator, DNS/DHCP)', 'biurowiec', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 20, ADM('działu IT')],
    ],
    notes: ['Skanery po wzroście — 112 urządzeń; terminale i skanery mają te same zasady. Jeden VLAN czy dwa?'],
  },
  // 35
  {
    name: 'Hurtownia Budowlana Cegiełka', kind: 'dwie lokalizacje, tunel IPsec',
    description: 'Hurtownia z placem składowym w Kościerzynie i punkt sprzedaży w Kartuzach. ' + VPN_DESC,
    growth: [30, 4],
    topology: topo.vpn({code: 'KOS', name: 'hurtownia'}, {code: 'KAR', name: 'punkt Kartuzy'}),
    groups: [
      ['Biuro hurtowni', 'Kościerzyna', 12, PRAC + ', system magazynowy'],
      ['Sprzedawcy', 'Kościerzyna i Kartuzy', 8, 'internet, system magazynowy, drukarki'],
      ['Wagi samochodowe i czytniki tablic', 'Kościerzyna', 3, 'TYLKO system magazynowy'],
      ['Terminale płatnicze', 'Kościerzyna i Kartuzy', 4, 'TYLKO internet — izolowane'],
      ['Kamery', 'obie lokalizacje', 25, 'TYLKO rejestrator w Kościerzynie'],
      ['Klienci Wi-Fi', 'obie lokalizacje', 20, GOSC],
      ['Serwery (magazynowy, rejestrator)', 'Kościerzyna', 2, SRV],
      ['Zarządzanie', 'oba routery i przełączniki', 4, ADM('biura hurtowni')],
    ],
    notes: ['Kamery z Kartuz nagrywają do Kościerzyny przez tunel — policz, ile to ruchu.'],
  },
  // 36
  {
    name: 'Piekarnia Złoty Kłos', kind: 'zakład + dwa sklepy firmowe, tunele IPsec',
    description: 'Zakład produkcyjny z biurem i dwa sklepy firmowe w sąsiednich miejscowościach. ' + VPN_DESC,
    growth: [50, 3],
    topology: topo.hub({code: 'ZAK', name: 'zakład'}, {code: 'SK1', name: 'sklep 1'}, {code: 'SK2', name: 'sklep 2'}, 'IPsec'),
    groups: [
      ['Biuro', 'zakład', 5, PRAC + ', system zamówień'],
      ['Sterowniki pieców i chłodni', 'zakład', 8, 'TYLKO serwer produkcji — bez internetu'],
      ['Tablety piekarzy', 'zakład', 4, 'TYLKO serwer produkcji i system zamówień'],
      ['Kasy w sklepach', 'sklepy', 4, 'TYLKO system zamówień w zakładzie'],
      ['Terminale płatnicze', 'sklepy', 4, 'TYLKO internet — izolowane'],
      ['Czujniki temperatury lad chłodniczych', 'sklepy', 6, 'TYLKO serwer produkcji (alarmy)'],
      ['Serwery (zamówień, produkcji)', 'zakład', 2, SRV],
      ['Zarządzanie', 'wszystkie routery i przełączniki', 6, ADM('biura')],
    ],
    notes: ['Bardzo małe grupy w sklepach — jak nie przesadzić z rozmiarem podsieci, zachowując czytelną regułę?'],
  },
  // 37
  {
    name: 'Kawiarnie Mewka', kind: 'trzy kawiarnie, tunele IPsec do biura',
    description: 'Biuro firmy z magazynem i dwie kawiarnie w Gdyni. ' + VPN_DESC,
    growth: [100, 3],
    topology: topo.hub({code: 'BIU', name: 'biuro'}, {code: 'K1', name: 'kawiarnia 1'}, {code: 'K2', name: 'kawiarnia 2'}, 'IPsec'),
    groups: [
      ['Biuro', 'biuro', 4, PRAC + ', system sprzedaży'],
      ['Kasy (tablety)', 'kawiarnie', 4, 'TYLKO system sprzedaży w biurze'],
      ['Terminale płatnicze', 'kawiarnie', 4, 'TYLKO internet — izolowane'],
      ['Ekrany z menu', 'kawiarnie', 4, 'TYLKO serwer treści w biurze'],
      ['Ekspresy do kawy z telemetrią', 'kawiarnie', 4, 'TYLKO internet (serwis producenta)'],
      ['Klienci Wi-Fi', 'kawiarnie', 60, GOSC],
      ['Serwery (sprzedaży, treści)', 'biuro', 2, SRV],
      ['Zarządzanie', 'wszystkie routery i przełączniki', 6, ADM('biura')],
    ],
    notes: ['Firma planuje podwoić liczbę kawiarni — czy reguła adresacji przewiduje kolejne lokalizacje?'],
  },
  // 38
  {
    name: 'Software House Bajt', kind: 'biuro — dwa piętra',
    description: 'Programiści, testerzy i zespół DevOps. Na piętrze serwerownia z serwerami testowymi i serwerem budowania aplikacji.',
    growth: [80, 3],
    topology: topo.floors('piętro, serwerownia', 'parter', 'piętro'),
    groups: [
      ['Programiści', 'oba piętra', 45, 'internet, serwer kodu, środowisko testowe'],
      ['Testerzy', 'parter', 15, 'internet, środowisko testowe — NIE serwer kodu'],
      ['DevOps', 'piętro', 5, 'wszystko, w tym zarządzanie'],
      ['Środowisko testowe (serwery i maszyny wirtualne)', 'piętro', 30, 'odpowiada programistom i testerom — samo nie inicjuje połączeń do biura'],
      ['Administracja i HR', 'parter', 6, PRAC],
      ['Goście Wi-Fi (rekrutacja, klienci)', 'parter', 25, GOSC],
      ['Serwery (kod, budowanie, plikowy)', 'piętro', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('zespołu DevOps')],
    ],
    notes: ['Środowisko testowe ma działać jak „piaskownica” — co może pójść źle, jeśli testowana aplikacja zacznie skanować sieć?'],
  },
  // 39
  {
    name: 'Coworking Wspólna Przestrzeń', kind: 'coworking — jedno piętro',
    description: 'Open space z biurkami rotacyjnymi, sześć prywatnych biur wynajmowanych firmom, sale spotkań i recepcja.',
    growth: [50, 2],
    topology: topo.floors('recepcja', 'open space', 'biura prywatne'),
    groups: [
      ['Recepcja i obsługa', 'recepcja', 3, PRAC + ', system rezerwacji'],
      ['Użytkownicy open space', 'open space', 60, 'TYLKO internet i drukarki'],
      ['Biuro prywatne 1–6 (każde osobno)', 'biura prywatne', 30, 'internet; każda firma widzi TYLKO swoje urządzenia'],
      ['Sale spotkań (ekrany, systemy wideokonferencji)', 'open space', 6, 'dostępne dla wszystkich użytkowników'],
      ['Drukarki', 'open space', 3, 'przyjmują wydruki od wszystkich użytkowników'],
      ['Zamki do biur i system rezerwacji', 'cały obiekt', 10, 'TYLKO serwer rezerwacji'],
      ['Serwer rezerwacji', 'recepcja', 1, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('recepcji')],
    ],
    notes: ['Sześć firm, z których żadna nie może widzieć innej — ile VLAN-ów i podsieci to oznacza?'],
  },
  // 40
  {
    name: 'Akademik Bosman', kind: 'dom studencki — pięć kondygnacji, L3 w rdzeniu',
    description: 'Pięć pięter pokoi studenckich z gniazdami Ethernet i Wi-Fi, portiernia, sala nauki i pralnia. Routing między VLAN-ami robi przełącznik warstwy 3.',
    growth: [10, 5],
    topology: topo.l3core('piwnica', 'parter', '1.–2. piętro', '3.–4. piętro'),
    groups: [
      ['Portiernia i administracja', 'parter', 4, PRAC + ', system zakwaterowania'],
      ['Mieszkańcy — Ethernet w pokojach', 'piętra', 300, GOSC],
      ['Mieszkańcy — Wi-Fi', 'cały budynek', 500, GOSC],
      ['Komputery w sali nauki', 'parter', 10, 'internet, drukarka w sali nauki'],
      ['Czytniki kart przy wejściach', 'parter', 4, 'TYLKO system zakwaterowania'],
      ['Kamery', 'cały budynek', 20, CAM],
      ['Serwery (zakwaterowanie, rejestrator)', 'piwnica', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 12, ADM('administracji')],
    ],
    notes: ['Mieszkańcy nie powinni widzieć urządzeń innych mieszkańców — czy jeden ogromny VLAN to dobry pomysł?'],
  },
  // 41
  {
    name: 'Dom Kultury Kotwica', kind: 'dom kultury — dwa budynki',
    description: 'Budynek główny z salą widowiskową i pracowniami oraz pawilon z kinem plenerowym i kawiarnią.',
    growth: [20, 4],
    topology: topo.campus({code: 'GL', name: 'budynek główny'}, {code: 'PAW', name: 'pawilon'}),
    groups: [
      ['Pracownicy', 'budynek główny', 15, PRAC],
      ['Instruktorzy pracowni', 'budynek główny', 10, 'internet, drukarki'],
      ['Sterowanie sceną (światło, dźwięk)', 'budynek główny', 12, 'TYLKO z komputera realizatora — bez internetu'],
      ['Komputer realizatora', 'budynek główny', 2, 'internet, sterowanie sceną'],
      ['Kasa biletowa', 'oba budynki', 2, 'internet (bilety online)'],
      ['Uczestnicy zajęć Wi-Fi', 'oba budynki', 100, GOSC],
      ['Kamery', 'oba budynki', 15, CAM],
      ['Serwery (plikowy, rejestrator)', 'budynek główny', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura pracowników')],
    ],
    notes: ['Sterowanie sceną podczas spektaklu nie może zostać przerwane przez ruch gości.'],
  },
  // 42
  {
    name: 'Kryta Pływalnia Delfin', kind: 'basen — jeden budynek',
    description: 'Hala basenowa, szatnie z szafkami na opaski, kasa z bramkami, siłownia i pomieszczenie techniczne z instalacją uzdatniania wody.',
    growth: [15, 5],
    topology: topo.floors('pomieszczenie techniczne', 'kasa i szatnie', 'hala basenowa i siłownia'),
    groups: [
      ['Kasa i biuro', 'kasa', 5, PRAC + ', system biletowy'],
      ['Bramki i czytniki opasek', 'kasa i szatnie', 10, 'TYLKO system biletowy'],
      ['Sterowanie uzdatnianiem wody i wentylacją', 'techniczne', 6, 'TYLKO z komputera technika — bez internetu'],
      ['Komputer technika', 'techniczne', 1, 'internet, sterowanie instalacjami'],
      ['Tablica wyników zawodów', 'hala basenowa', 2, 'TYLKO z biura'],
      ['Klienci Wi-Fi', 'cały budynek', 80, GOSC],
      ['Kamery', 'cały budynek (bez szatni)', 20, CAM],
      ['Serwery (biletowy, rejestrator)', 'techniczne', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura')],
    ],
    notes: ['Sterowanie chemią wody to system bezpieczeństwa — dostęp z jednego komputera.'],
  },
  // 43
  {
    name: 'Aeroklub Skrzydło', kind: 'lotnisko sportowe — dwa budynki',
    description: 'Budynek administracyjny z wieżą informacyjną (FIS) i hangar z warsztatem. Piloci korzystają z Wi-Fi w poczekalni.',
    growth: [20, 5],
    topology: topo.campus({code: 'ADM', name: 'budynek administracyjny'}, {code: 'HAN', name: 'hangar'}),
    groups: [
      ['Administracja', 'budynek administracyjny', 6, PRAC],
      ['Stanowisko informacji lotniskowej (FIS)', 'budynek administracyjny', 2, 'internet (dane pogodowe), stacja meteo, radio — wymaga niezawodności'],
      ['Stacja meteo i wiatromierze', 'pole wzlotów', 4, 'TYLKO stanowisko FIS i serwer meteo'],
      ['Mechanicy', 'hangar', 6, 'internet (dokumentacja techniczna), drukarki'],
      ['Piloci Wi-Fi', 'poczekalnia', 40, GOSC],
      ['Kamery', 'hangar i płyta', 12, CAM],
      ['Serwery (meteo, rejestrator)', 'budynek administracyjny', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('administracji')],
    ],
    notes: ['Stanowisko FIS musi działać, nawet gdy goście obciążą łącze — jak to uwzględnić w projekcie?'],
  },
  // 44
  {
    name: 'Stacje Paliw Kropla', kind: 'centrala + dwie stacje, tunele IPsec',
    description: 'Biuro firmy i dwie stacje paliw przy drogach krajowych. ' + VPN_DESC,
    growth: [50, 4],
    topology: topo.hub({code: 'BIU', name: 'biuro'}, {code: 'ST1', name: 'stacja 1'}, {code: 'ST2', name: 'stacja 2'}, 'IPsec'),
    groups: [
      ['Biuro', 'biuro', 8, PRAC + ', system stacyjny'],
      ['Kasy', 'stacje', 4, 'TYLKO system stacyjny w biurze'],
      ['Sterowniki dystrybutorów i sond zbiorników', 'stacje', 10, 'TYLKO system stacyjny — bez internetu'],
      ['Terminale płatnicze (także przy dystrybutorach)', 'stacje', 8, 'TYLKO internet — izolowane'],
      ['Myjnia automatyczna', 'stacje', 2, 'TYLKO system stacyjny'],
      ['Klienci Wi-Fi', 'stacje', 40, GOSC],
      ['Kamery', 'stacje', 24, 'TYLKO rejestratory lokalne w każdej stacji'],
      ['Serwery (system stacyjny)', 'biuro', 2, SRV],
      ['Zarządzanie', 'wszystkie routery i przełączniki', 6, ADM('biura')],
    ],
    notes: ['Kamery nagrywają lokalnie w każdej stacji — to inna decyzja niż w scenariuszach z centralnym rejestratorem. Dlaczego może być lepsza?'],
  },
  // 45
  {
    name: 'Pensjonat Leśny Zakątek', kind: 'pensjonat — dwa budynki',
    description: 'Budynek główny z recepcją, restauracją i pokojami oraz domki letniskowe połączone światłowodem z budynkiem głównym.',
    growth: [30, 5],
    topology: topo.campus({code: 'GL', name: 'budynek główny'}, {code: 'DOM', name: 'domki'}),
    groups: [
      ['Recepcja i biuro', 'budynek główny', 4, PRAC + ', system rezerwacji'],
      ['Kuchnia i restauracja (tablety kelnerów, drukarki bonów)', 'budynek główny', 10, 'TYLKO system restauracyjny'],
      ['Terminale płatnicze', 'budynek główny', 3, 'TYLKO internet — izolowane'],
      ['Goście Wi-Fi', 'oba budynki', 120, GOSC],
      ['Zamki do pokoi i domków', 'oba budynki', 30, 'TYLKO system rezerwacji'],
      ['Kamery', 'teren', 10, CAM],
      ['Serwery (rezerwacje, restauracyjny, rejestrator)', 'budynek główny', 3, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 4, ADM('biura')],
    ],
    notes: ['Domki mają kilka grup urządzeń (goście, zamki, kamery) — które VLAN-y muszą przechodzić przez światłowód?'],
  },
  // 46
  {
    name: 'Biuro Nieruchomości Klucz', kind: 'dwie lokalizacje, łącze dzierżawione',
    description: 'Biuro główne w Sopocie i mniejsze biuro w Gdańsku. ' + LEASED_DESC,
    growth: [50, 3],
    topology: topo.leased({code: 'SOP', name: 'Sopot'}, {code: 'GDA', name: 'Gdańsk'}),
    groups: [
      ['Agenci', 'Sopot i Gdańsk', 20, PRAC + ', CRM'],
      ['Kierownictwo', 'Sopot', 3, PRAC + ', CRM, serwer umów'],
      ['Asystenci', 'Sopot i Gdańsk', 6, 'internet, drukarki, CRM — NIE serwer umów'],
      ['Ekrany z ofertami w witrynach', 'Sopot i Gdańsk', 4, 'TYLKO serwer treści'],
      ['Klienci Wi-Fi', 'Sopot i Gdańsk', 20, GOSC],
      ['Drukarki', 'Sopot i Gdańsk', 4, 'przyjmują wydruki od pracowników z tej samej lokalizacji'],
      ['Serwery (CRM, umów, treści)', 'Sopot', 3, SRV],
      ['Zarządzanie', 'oba routery i przełączniki', 4, ADM('komputera kierownika w Sopocie')],
    ],
    notes: ['Agenci są w obu miastach i mają identyczne zasady — ale VLAN nie przejdzie przez router.'],
  },
  // 47
  {
    name: 'Spółdzielnia Mieszkaniowa Przystań', kind: 'biuro + osiedle — trzy budynki',
    description: 'Biuro spółdzielni, budynek administracji technicznej i węzeł ciepłowniczy osiedla. Mieszkańcy załatwiają sprawy w biurze.',
    growth: [15, 5],
    topology: topo.campus({code: 'BIU', name: 'biuro'}, {code: 'TEC', name: 'administracja techniczna'}, {code: 'WEZ', name: 'węzeł ciepłowniczy'}),
    groups: [
      ['Pracownicy biura', 'biuro', 15, PRAC + ', system czynszowy'],
      ['Kasa', 'biuro', 2, 'TYLKO system czynszowy i drukarka fiskalna'],
      ['Administracja techniczna', 'administracja techniczna', 8, PRAC],
      ['Sterowniki węzła ciepłowniczego', 'węzeł', 6, 'TYLKO z komputerów administracji technicznej — bez internetu'],
      ['Odczyty liczników (koncentratory)', 'węzeł', 4, 'TYLKO serwer odczytów'],
      ['Mieszkańcy Wi-Fi (sala obsługi)', 'biuro', 20, GOSC],
      ['Serwery (czynszowy, odczytów)', 'biuro', 2, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 6, ADM('administracji technicznej')],
    ],
    notes: ['Sterowanie ogrzewaniem osiedla: kto i skąd może je zmieniać?'],
  },
  // 48
  {
    name: 'Gospodarstwo Ogrodnicze Zielona Szklarnia', kind: 'gospodarstwo — trzy budynki',
    description: 'Dom z biurem, szklarnia z automatyką nawadniania i klimatu oraz chłodnia z pakowalnią.',
    growth: [40, 4],
    topology: topo.campus({code: 'BIU', name: 'biuro'}, {code: 'SZK', name: 'szklarnia'}, {code: 'CHL', name: 'chłodnia'}),
    groups: [
      ['Biuro', 'biuro', 4, PRAC + ', serwer automatyki (podgląd)'],
      ['Automatyka szklarni (nawadnianie, klimat)', 'szklarnia', 20, 'TYLKO serwer automatyki — bez internetu'],
      ['Czujniki chłodni', 'chłodnia', 6, 'TYLKO serwer automatyki'],
      ['Wagi i drukarki etykiet w pakowalni', 'chłodnia', 6, 'TYLKO serwer zamówień'],
      ['Pracownicy sezonowi Wi-Fi', 'wszystkie budynki', 40, GOSC],
      ['Kamery', 'teren', 10, CAM],
      ['Serwery (automatyki, zamówień, rejestrator)', 'biuro', 3, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 6, ADM('biura')],
    ],
    notes: ['Właściciel chce podglądu automatyki z telefonu spoza gospodarstwa — jak to zrobić bezpiecznie? (pytanie do dyskusji, nie do wdrożenia)'],
  },
  // 49
  {
    name: 'Centrum Konferencyjne Horyzont', kind: 'centrum konferencyjne — L3 w rdzeniu',
    description: 'Trzy sale konferencyjne różnej wielkości, foyer, recepcja i biuro organizatorów. Każde wydarzenie dostaje własną sieć dla uczestników. Routing między VLAN-ami robi przełącznik warstwy 3.',
    growth: [30, 3],
    topology: topo.l3core('serwerownia', 'sala A (duża)', 'sale B i C', 'foyer i recepcja'),
    groups: [
      ['Biuro organizatorów', 'recepcja', 8, PRAC],
      ['Technika sal (projektory, mikrofony, tłumaczenia)', 'sale', 30, 'TYLKO z komputerów technika — bez internetu'],
      ['Komputery techników', 'sale', 3, 'internet, technika sal'],
      ['Uczestnicy wydarzenia A', 'sala A i foyer', 500, GOSC],
      ['Uczestnicy wydarzeń B i C (osobno)', 'sale B i C', 150, GOSC + '; uczestnicy B nie widzą C'],
      ['Transmisje na żywo (kamery, enkoder)', 'sala A', 5, 'TYLKO internet'],
      ['Serwer rejestracji uczestników', 'serwerownia', 1, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 12, ADM('komputerów techników')],
    ],
    notes: ['Sieć dla 650 uczestników A po wzroście — jaki prefiks?'],
  },
  // 50
  {
    name: 'Zajezdnia Autobusowa Linia 7', kind: 'zajezdnia — trzy budynki',
    description: 'Budynek dyspozytorni z biurem, hala obsługi autobusów i myjnia z parkingiem. Autobusy po zjeździe łączą się z siecią przez Wi-Fi, by pobrać aktualizacje rozkładów.',
    growth: [20, 5],
    topology: topo.campus({code: 'DYS', name: 'dyspozytornia'}, {code: 'HAL', name: 'hala obsługi'}, {code: 'PAR', name: 'parking i myjnia'}),
    groups: [
      ['Dyspozytorzy', 'dyspozytornia', 8, 'internet, system dyspozytorski — wymaga niezawodności'],
      ['Biuro i kadry', 'dyspozytornia', 12, PRAC],
      ['Komputery autobusów (biletomaty, tablice kierunkowe)', 'parking', 60, 'TYLKO serwer aktualizacji rozkładów'],
      ['Mechanicy (komputery diagnostyczne)', 'hala', 8, 'internet (producent), system zleceń'],
      ['Myjnia i dystrybutor paliwa', 'parking', 3, 'TYLKO system zleceń'],
      ['Kierowcy Wi-Fi (pokój socjalny)', 'dyspozytornia', 40, GOSC],
      ['Kamery', 'cały teren', 30, CAM],
      ['Serwery (dyspozytorski, rozkładów, zleceń, rejestrator)', 'dyspozytornia', 4, SRV],
      ['Zarządzanie', 'wszystkie urządzenia', 10, ADM('działu IT')],
    ],
    notes: ['Autobusy pojawiają się w sieci tylko na kilka godzin w nocy — czy to zmienia coś w projekcie?'],
  },
];
