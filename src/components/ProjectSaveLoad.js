import React, {useState, useRef} from 'react';

// Eksport/import postępu jednej strony (np. projektu zaliczeniowego) jako
// plik .json — POMYŚLANY JAKO WYJĄTEK od reguły "dane znikają po zamknięciu
// karty" (patrz `sharedFieldStore.js`): ta reguła ma sens dla zwykłych,
// krótkich ćwiczeń, ale projekt zaliczeniowy bywa rozciągnięty na wiele dni,
// a student MOŻE chcieć celowo zamknąć kartę/przeglądarkę i wrócić później
// na innym urządzeniu. sessionStorage nie oferuje niczego takiego samo z
// siebie — więc ten komponent pozwala RĘCZNIE zgrać cały stan strony do pliku
// i wczytać go z powrotem (na tym samym albo innym urządzeniu/w innej karcie).
//
// Jak to działa (bez żadnej wiedzy o konkretnych komponentach strony):
// każdy komponent na tej stronie (EditableTable, TopologyBuilder, Checklist,
// OpenQuestion, TopologyGenerator, SprawozdanieHeader, KeywordAnswer) zapisuje
// swój stan w sessionStorage pod kluczem `${prefiks-komponentu}:${storageKey}`
// (dokładnie ten sam `storageKey`, który podajesz w JSX tego komponentu na
// stronie). Wystarczy więc znać listę `storageKey`-y użytych na stronie
// (`storageKeys` — props tego komponentu) i sprawdzić WSZYSTKIE możliwe
// prefiksy komponentów dla każdego z nich.
//
// Współdzielone pola (SharedValue/xShared, np. adres ISP wpisany w
// TopologyBuilder) żyją NIE pod własnym kluczem, tylko w jednym wspólnym
// obiekcie w `sharedFieldStore.js` (`network-config-shared`) — RAZEM z polami
// współdzielonymi innych ćwiczeń w tej samej karcie. Żeby import/eksport nie
// mieszał danych między różnymi ćwiczeniami, eksportujemy z tego wspólnego
// obiektu WYŁĄCZNIE klucze zaczynające się od `sharedPrefix` (konwencja
// nazewnicza — patrz przykład użycia niżej), a przy imporcie DOPISUJEMY je do
// istniejącego obiektu (nie nadpisujemy go w całości), żeby nie skasować stanu
// innych, niepowiązanych ćwiczeń w tej samej karcie przeglądarki.
//
// Screenshoty wklejone przez <ScreenshotPaste> celowo NIE są tu uwzględnione —
// ten komponent zapisuje swój stan tylko w pamięci (RAM), nigdy w
// sessionStorage (żeby nie natrafić na limit pojemności) — trzeba je wkleić
// ponownie po imporcie.
//
// Użycie (projekt zaliczeniowy — wszystkie shared pola mają wspólny prefiks):
// <ProjectSaveLoad
//   title="Zapisz / wczytaj postęp projektu"
//   fileNamePrefix="projekt-zaliczeniowy"
//   storageKeys={['cwiczenie-15', 'final-wymagania', 'final-weryfikacja', 'final-segment', 'final-podsumowanie', 'final-generated']}
//   sharedPrefix="final_"
// />
//
// Użycie na stronie, która korzysta z `xShared` (np. RIP/OSPF — numer grupy
// zapisany pod POJEDYNCZYM kluczem bez wspólnego prefiksu, np. "grupa_x"):
// <ProjectSaveLoad
//   storageKeys={['cwiczenie-10', 'ospf-grupy-segment', 'rip-pary-grup', ...]}
//   sharedKeys={['grupa_x', 'k1-r1_*', 'r1-r2_*', 'r1_pair_*', 'r2_pair_*']}
// />

// PEŁNA lista prefiksów kluczy sessionStorage używanych przez WSZYSTKIE
// komponenty w bibliotece, które same coś zapisują (nie tylko czytają
// wspólny magazyn). Celowo trzymana w jednym miejscu i komentowana przy
// każdym wpisie źródłem prawdy (plik komponentu) — jeśli powstanie NOWY
// komponent z własnym zapisem do sessionStorage, jego prefiks trzeba dopisać
// tutaj, inaczej ProjectSaveLoad będzie go CICHO pomijał przy eksporcie
// (bez błędu — więc łatwo to przeoczyć, stąd ta lista jest kompletna i
// zweryfikowana względem całej biblioteki na dzień jej powstania).
//
// Komponenty BEZ własnego zapisu (celowo pominięte, nie brakuje ich tutaj):
// CodeBlock, CodeBlank, CodeLine, SharedValue, RingSharedValue, RingNeighbor,
// RingWeight, StepByStep, Step, Question, TestKoncowyCzesc1, OsiMatchingExercise
// — nie mają własnego stanu do zapamiętania (albo tylko czytają wspólny
// magazyn `network-config-shared`, co i tak jest objęte osobno przez
// `sharedPrefix`/`sharedKeys` niżej). ScreenshotPaste ma stan CELOWO tylko
// w RAM (nigdy w sessionStorage) — zrzuty ekranu nigdy nie da się
// wyeksportować tą drogą, trzeba je wkleić ponownie po imporcie.
const COMPONENT_PREFIXES = [
  'sprawozdanie-header',   // SprawozdanieHeader.js
  'checklist',             // Checklist.js
  'editable-table',        // EditableTable.js
  'topology-builder',      // TopologyBuilder.js
  'topology-generator',    // TopologyGenerator.js
  'open-question',         // OpenQuestion.js
  'keyword-answer',        // KeywordAnswer.js
  'quiz-pool',             // Quiz.js (tylko WYLOSOWANY zestaw z puli — same odpowiedzi w Quiz nigdy nie są zapisywane, więc nie da się ich odtworzyć po odświeżeniu ani po imporcie)
  'private-addr-table',    // PrivateAddressTable.js (starszy odpowiednik TopologyBuilder z wcześniejszych ćwiczeń)
  'number-base-trainer',   // NumberBaseTrainer.js
  'subnet-trainer',        // SubnetTrainer.js
  'topologia',             // TopologiaInteraktywna.js (starsza wersja topologii)
  'topologia-pt',          // TopologiaPacketTracer.js (starsza wersja topologii PT)
];

const SHARED_STORE_KEY = 'network-config-shared';

// Dopasowanie klucza ze wspólnego magazynu (`network-config-shared`) do
// eksportu tej strony. Dwa niezależne sposoby, można użyć jednego, drugiego
// albo obu naraz:
// - `sharedPrefix` (string) — dopasowuje każdy klucz zaczynający się od tego
//   prefiksu. Wygodne, gdy WSZYSTKIE pola współdzielone tej strony celowo
//   mają wspólny prefiks w nazwie (konwencja przyjęta np. w projekcie
//   zaliczeniowym — `final_isp_ip`, `final_core_wan_ip`, ...).
// - `sharedKeys` (tablica stringów) — lista dokładnych nazw kluczy (np.
//   `xShared="grupa_x"` w TopologyBuilder — pojedynczy klucz BEZ wspólnego
//   prefiksu z resztą pól tej strony) LUB wzorzec z gwiazdką na końcu
//   (`"final_*"` — działa tak samo jak `sharedPrefix`, ale pozwala podać
//   więcej niż jeden prefiks/wzorzec naraz).
function matchesSharedKey(key, sharedPrefix, sharedKeys) {
  if (sharedPrefix && key.startsWith(sharedPrefix)) return true;
  if (Array.isArray(sharedKeys)) {
    for (const pattern of sharedKeys) {
      if (typeof pattern !== 'string') continue;
      if (pattern.endsWith('*')) {
        if (key.startsWith(pattern.slice(0, -1))) return true;
      } else if (key === pattern) {
        return true;
      }
    }
  }
  return false;
}

function collectExportData(storageKeys, sharedPrefix, sharedKeys) {
  const storage = {};
  (storageKeys || []).forEach(sk => {
    COMPONENT_PREFIXES.forEach(prefix => {
      const fullKey = `${prefix}:${sk}`;
      try {
        const raw = window.sessionStorage.getItem(fullKey);
        if (raw !== null) storage[fullKey] = raw;
      } catch (e) { /* ignorujemy */ }
    });
  });

  let shared = {};
  if (sharedPrefix || (Array.isArray(sharedKeys) && sharedKeys.length > 0)) {
    try {
      const raw = window.sessionStorage.getItem(SHARED_STORE_KEY);
      const fullStore = raw ? JSON.parse(raw) : {};
      Object.entries(fullStore).forEach(([k, v]) => {
        if (matchesSharedKey(k, sharedPrefix, sharedKeys)) shared[k] = v;
      });
    } catch (e) { /* ignorujemy */ }
  }

  return {version: 1, exportedAt: new Date().toISOString(), storage, shared};
}

function applyImportedData(data) {
  if (!data || typeof data !== 'object') throw new Error('Nieprawidłowy format pliku.');
  const storage = data.storage && typeof data.storage === 'object' ? data.storage : {};
  const shared = data.shared && typeof data.shared === 'object' ? data.shared : {};

  Object.entries(storage).forEach(([k, v]) => {
    try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignorujemy */ }
  });

  if (Object.keys(shared).length > 0) {
    try {
      const raw = window.sessionStorage.getItem(SHARED_STORE_KEY);
      const fullStore = raw ? JSON.parse(raw) : {};
      Object.entries(shared).forEach(([k, v]) => { fullStore[k] = v; });
      window.sessionStorage.setItem(SHARED_STORE_KEY, JSON.stringify(fullStore));
    } catch (e) { /* ignorujemy */ }
  }
}

export default function ProjectSaveLoad({title, fileNamePrefix = 'projekt', storageKeys = [], sharedPrefix, sharedKeys}) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null); // {type: 'ok'|'error', message}

  function handleExport() {
    try {
      const data = collectExportData(storageKeys, sharedPrefix, sharedKeys);
      const totalFields = Object.keys(data.storage).length + Object.keys(data.shared).length;
      if (totalFields === 0) {
        setStatus({type: 'error', message: 'Nie znaleziono jeszcze żadnych zapisanych danych do wyeksportowania — uzupełnij najpierw chociaż jedno pole na stronie.'});
        return;
      }
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${fileNamePrefix}-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({type: 'ok', message: 'Plik został pobrany. Zachowaj go — pozwoli wrócić do tego samego stanu strony.'});
    } catch (e) {
      setStatus({type: 'error', message: 'Nie udało się wyeksportować danych.'});
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        applyImportedData(data);
        setStatus({type: 'ok', message: 'Wczytano. Strona zaraz się odświeży, żeby pokazać wczytane dane...'});
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setStatus({type: 'error', message: 'Nie udało się wczytać pliku — sprawdź, czy to właściwy plik eksportu.'});
      }
    };
    reader.onerror = () => setStatus({type: 'error', message: 'Nie udało się odczytać pliku.'});
    reader.readAsText(file);
    e.target.value = ''; // pozwala wczytać ten sam plik ponownie, jeśli trzeba
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#fffbeb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
    borderColor: '#fde68a',
  };
  const heading = {fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0'};
  const desc = {fontSize: '0.85rem', color: '#78716c', margin: '0 0 16px 0', lineHeight: 1.5};

  const darkBtn = {
    padding: '9px 18px', borderRadius: '8px', border: 'none', fontWeight: 600,
    fontSize: '0.9rem', cursor: 'pointer', background: '#111827', color: '#ffffff',
  };
  const lightBtn = {
    padding: '9px 18px', borderRadius: '8px', border: '1px solid #d6d3d1', fontWeight: 600,
    fontSize: '0.9rem', cursor: 'pointer', background: '#ffffff', color: '#111827',
  };

  return (
    <div style={card}>
      <h4 style={heading}>{title || 'Zapisz / wczytaj postęp'}</h4>
      <p style={desc}>
        Dane na tej stronie znikają po zamknięciu karty przeglądarki. Jeśli pracujesz nad projektem
        w kilku sesjach (albo na innym urządzeniu), pobierz plik z postępem, a przy powrocie wczytaj
        go z powrotem — strona wróci do dokładnie tego samego stanu (wpisane adresy, zaznaczone
        checklisty, odpowiedzi). <strong>Wklejone zrzuty ekranu nie są zapisywane w ten sposób - te trzeba wkleić ponownie. </strong>
      </p>

      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        <button style={darkBtn} onClick={handleExport}>⬇ Pobierz plik z postępem</button>
        <button style={lightBtn} onClick={handleImportClick}>⬆ Wczytaj plik z postępem</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          style={{display: 'none'}}
        />
      </div>

      {status && (
        <div style={{
          marginTop: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem',
          background: status.type === 'ok' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${status.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
          color: '#111827',
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
