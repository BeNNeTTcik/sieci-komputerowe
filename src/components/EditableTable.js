import React, {useState, useEffect, useRef} from 'react';
import {readSharedField, writeSharedField, clearSharedField} from './sharedFieldStore';

// --- Rozbijanie adresu CIDR na wartości pochodne (dla `deriveShared`) ---
// Ta sama logika co w `TopologyBuilder.js` (świadomie skopiowana, nie
// importowana — obydwa pliki mają zostać samodzielne, bez wzajemnych
// zależności), więc format wynikowy (network/wildcard/mask/…) jest identyczny
// w obu komponentach i można je mieszać na jednej stronie bez niespodzianek.

function isValidAddressFormat(value) {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function parseCidr(value) {
  const slashParts = value.split('/');
  if (slashParts.length !== 2) return null;
  const [ipPart, prefixPart] = slashParts;
  if (!isValidAddressFormat(ipPart)) return null;
  if (!/^\d{1,2}$/.test(prefixPart)) return null;
  const prefix = parseInt(prefixPart, 10);
  if (prefix < 0 || prefix > 32) return null;
  return {ipPart, prefix};
}

function prefixToMaskOctets(prefix) {
  const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  return [(maskInt >>> 24) & 255, (maskInt >>> 16) & 255, (maskInt >>> 8) & 255, maskInt & 255];
}

function computeAclNotation(ipPart, prefix) {
  const ipOctets = ipPart.split('.').map(Number);
  const maskOctets = prefixToMaskOctets(prefix);
  const networkOctets = ipOctets.map((o, i) => o & maskOctets[i]);
  const wildcardOctets = maskOctets.map(m => 255 - m);
  return {network: networkOctets.join('.'), wildcard: wildcardOctets.join('.')};
}

// Klasa adresu (A/B/C/D/E) na podstawie WYŁĄCZNIE pierwszego oktetu — dokładnie
// tak, jak wyznacza ją klasowy routing (RIPv1/RIPv2 `network`, IGRP): nie ma to
// nic wspólnego z prefiksem CIDR faktycznie wpisanym przez studenta. Dla klas
// A/B/C zwraca też "swój" klasowy prefiks (/8, /16, /24) — to właśnie ta granica,
// do której IOS milcząco zaokrągla polecenie `network` w RIP, niezależnie od
// maski, jaką student poda. Klasy D (multicast) i E (zarezerwowana) nie mają
// sensownego klasowego prefiksu — `netclassPrefix` jest wtedy `null`.
function classifyNetwork(firstOctet) {
  if (firstOctet >= 0 && firstOctet <= 127) return {netclass: 'A', netclassPrefix: 8};
  if (firstOctet >= 128 && firstOctet <= 191) return {netclass: 'B', netclassPrefix: 16};
  if (firstOctet >= 192 && firstOctet <= 223) return {netclass: 'C', netclassPrefix: 24};
  if (firstOctet >= 224 && firstOctet <= 239) return {netclass: 'D', netclassPrefix: null};
  return {netclass: 'E', netclassPrefix: null};
}

// Rozbija poprawną wartość CIDR ("10.10.1.10/24") na wszystkie możliwe
// wartości pochodne naraz. Zwraca `null`, jeśli `value` nie jest poprawnym
// zapisem CIDR (komórka jeszcze pusta albo student wpisał coś błędnego).
// Dostępne nazwy pochodnych: ip, prefix, network, wildcard, mask,
// networkCidr ("10.10.1.0/24"), networkMask ("10.10.1.0 255.255.255.0"),
// networkWildcard ("10.10.1.0 0.0.0.255" — gotowe pod `network` w OSPF/ACL),
// netclass ("A"/"B"/"C"/"D"/"E" — klasa adresu, patrz `classifyNetwork`),
// netclassPrefix (klasowy prefiks danej klasy, np. "16" dla B; puste dla D/E),
// netclassMask (klasowa maska dziesiętna, np. "255.255.0.0"; puste dla D/E),
// netclassNetwork (adres sieci PO ZAOKRĄGLENIU do granicy klasowej, a nie do
// wpisanego przez studenta prefiksu — dokładnie to, na co IOS "ucina" adres w
// poleceniu `network` w RIP, niezależnie od realnej maski na interfejsie).
function deriveCidrValues(value) {
  const parsed = parseCidr(value);
  if (!parsed) return null;
  const acl = computeAclNotation(parsed.ipPart, parsed.prefix);
  const maskOctets = prefixToMaskOctets(parsed.prefix);
  const mask = maskOctets.join('.');
  const firstOctet = Number(parsed.ipPart.split('.')[0]);
  const {netclass, netclassPrefix} = classifyNetwork(firstOctet);
  const netclassAcl = netclassPrefix !== null ? computeAclNotation(parsed.ipPart, netclassPrefix) : null;
  return {
    ip: parsed.ipPart,
    prefix: String(parsed.prefix),
    network: acl.network,
    wildcard: acl.wildcard,
    mask: mask,
    networkCidr: `${acl.network}/${parsed.prefix}`,
    networkMask: `${acl.network} ${mask}`,
    networkWildcard: `${acl.network} ${acl.wildcard}`,
    netclass: netclass,
    netclassPrefix: netclassPrefix !== null ? String(netclassPrefix) : '',
    netclassMask: netclassPrefix !== null ? prefixToMaskOctets(netclassPrefix).join('.') : '',
    netclassNetwork: netclassAcl ? netclassAcl.network : '',
  };
}

function makeEmptyRow(columns) {
  const row = {};
  columns.forEach(c => { row[c.key] = c.default || ''; });
  return row;
}

function normalize(s) {
  return String(s ?? '').trim().toLowerCase();
}

// Zwraca oczekiwaną wartość dla danej komórki, jeśli jakąkolwiek zdefiniowano:
// - row.expectedShared[colKey] — klucz we wspólnym magazynie (ten sam mechanizm
//   co w TopologyBuilder/CodeBlank — wartość ustalona np. w diagramie topologii),
// - row.expected[colKey] — zwykła, wpisana na sztywno wartość tekstowa,
// - col.autoValue(row, rowIndex) — dla kolumn EDYTOWALNYCH (nie `readOnly`)
//   z ustawionym `autoValue`: student ma sam skonfigurować i wpisać wartość
//   (np. koszt OSPF), a poprawność sprawdzana jest względem tej samej
//   deterministycznie przydzielonej wartości, którą widać w kolumnach
//   `readOnly` z tym samym `autoValue` (patrz `pseudoRandom.js`).
// Zwraca undefined, jeśli dla tej komórki nie zdefiniowano żadnej z nich —
// wtedy komórka zachowuje się jak dotychczas, bez żadnej walidacji.
function getExpectedValue(row, col, rowIndex) {
  const colKey = col.key;
  if (row.expectedShared && row.expectedShared[colKey] !== undefined) {
    return readSharedField(row.expectedShared[colKey], '');
  }
  if (row.expected && row.expected[colKey] !== undefined) {
    return row.expected[colKey];
  }
  if (!col.readOnly && typeof col.autoValue === 'function') {
    return col.autoValue(row, rowIndex);
  }
  return undefined;
}

// Zwraca wartość faktycznie pokazywaną w komórce: dla kolumn `readOnly` z
// funkcją `autoValue` jest to wynik jej wywołania (wartość przydzielona
// automatycznie, np. deterministycznie "wylosowana" waga połączenia — patrz
// `pseudoRandom.js`), w przeciwnym razie zwykła wartość z `row[c.key]`
// wpisana przez studenta.
function getDisplayValue(row, c, rowIndex) {
  if (c.readOnly && typeof c.autoValue === 'function') {
    return c.autoValue(row, rowIndex);
  }
  return row[c.key];
}

// Klucz we wspólnym magazynie, do którego ma być zapisywana wartość wpisana
// przez studenta w danej komórce — ten sam mechanizm i ta sama nazwa propsa
// (`shared`) co w `TopologyBuilder`/`PrivateAddressTable`, tylko że tutaj
// definiowany PER WIERSZ (bo jeden wiersz ma wiele kolumn, a jedna kolumna
// występuje w wielu wierszach): `row.shared[colKey]`. Undefined = ta komórka
// nic nie zapisuje do wspólnego magazynu (zachowanie jak dotychczas).
function getSharedKey(row, colKey) {
  if (row.shared && row.shared[colKey] !== undefined) return row.shared[colKey];
  return undefined;
}

// Konfiguracja "rozbicia" wartości CIDR wpisanej w danej komórce na osobne
// klucze pochodne we wspólnym magazynie — ten sam mechanizm co `deriveShared`
// w `TopologyBuilder`, tylko znowu (jak `shared` wyżej) definiowany PER WIERSZ:
// `row.deriveShared[colKey] = { network: 'klucz1', wildcard: 'klucz2', ... }`.
// Nazwy po prawej stronie to klucze do zapisania, nazwy po lewej — które z
// wartości zwracanych przez `deriveCidrValues` mają pod nie trafić (patrz lista
// dostępnych nazw w komentarzu nad `deriveCidrValues`).
function getDeriveSharedConfig(row, colKey) {
  if (row.deriveShared && row.deriveShared[colKey] !== undefined) return row.deriveShared[colKey];
  return undefined;
}

// Wywołuje `deriveCidrValues` dla `value` i zapisuje każdą skonfigurowaną
// pochodną do wspólnego magazynu. Gdy `value` nie jest poprawnym CIDR-em
// (np. student dopiero zaczął pisać, albo się pomylił), wszystkie pochodne
// są jawnie czyszczone na '' — żeby gdzieś dalej w dokumencie nie zostawała
// "zamrożona" poprawna wartość z poprzedniej, już nieaktualnej wpisanej treści.
function deriveAndWriteShared(cfg, value) {
  if (!cfg) return;
  const derived = deriveCidrValues(value);
  Object.entries(cfg).forEach(([name, sharedKey]) => {
    writeSharedField(sharedKey, derived ? (derived[name] ?? '') : '');
  });
}

// Dla kolumn oznaczonych `checkDuplicates: true` zwraca zbiór kluczy
// "rowIndex:colKey", których wartość powtarza się w innym wierszu TEJ SAMEJ
// kolumny (porównanie bez rozróżniania wielkości liter, puste wartości
// ignorowane). Ten sam mechanizm co `findDuplicateAddressKeys` w
// TopologyBuilder, tylko po wierszach jednej tabeli zamiast po wszystkich
// polach topologii. Działa też na kolumnach `autoValue` (np. gdyby dwa
// różne połączenia dostały tę samą "wylosowaną" wagę).
function findDuplicateCells(rows, columns) {
  const dup = new Set();
  columns.forEach(c => {
    if (!c.checkDuplicates) return;
    const seen = {};
    rows.forEach((row, i) => {
      const val = normalize(getDisplayValue(row, c, i));
      if (!val) return;
      const cellId = `${i}:${c.key}`;
      if (Object.prototype.hasOwnProperty.call(seen, val)) {
        dup.add(seen[val]);
        dup.add(cellId);
      } else {
        seen[val] = cellId;
      }
    });
  });
  return dup;
}

export default function EditableTable({title, columns, initialRows, allowAddRows = true, allowRemoveRows = true, storageKey}) {
  const key = `editable-table:${storageKey || (title || 'domyslna').slice(0, 40)}`;
  const loadedRef = useRef(false);

  const [rows, setRows] = useState(() =>
    (initialRows && initialRows.length > 0) ? initialRows.map(r => ({...r})) : [makeEmptyRow(columns)]
  );
  const [checked, setChecked] = useState(false);

  // WAŻNE — przyczyna błędu "React error #31" po buildzie:
  // Kolumny `readOnly` mogą zawierać PRAWDZIWE elementy React (np. <SharedValue />),
  // a nie tylko zwykły tekst. Element React zawiera niewidoczny znacznik $$typeof
  // (typu Symbol), który JSON.stringify po cichu gubi — po zapisaniu do
  // sessionStorage i ponownym wczytaniu (JSON.parse) zostaje z niego "zepsuty",
  // zwykły obiekt {key, ref, props, _owner, ...}, którego React odmawia
  // wyrenderować (stąd "Ta strona uległa awarii").
  //
  // Rozwiązanie: nigdy nie zapisujemy ani nie wczytujemy wartości kolumn
  // `readOnly` — te i tak zawsze pochodzą świeżo z `initialRows` przy każdym
  // renderze, nigdy nie są wpisywane przez studenta, więc nie ma potrzeby ich
  // przechowywać. Do sessionStorage trafiają WYŁĄCZNIE wartości kolumn
  // edytowalnych, i tylko jeśli są zwykłym tekstem/liczbą.

  const editableKeys = columns.filter(c => !c.readOnly).map(c => c.key);

  function sanitizeForStorage(allRows) {
    return allRows.map(row => {
      const slim = {};
      editableKeys.forEach(k => {
        const v = row[k];
        if (typeof v === 'string' || typeof v === 'number') slim[k] = v;
      });
      return slim;
    });
  }

  // Dla komórek, których wiersz ma zdefiniowany `shared[colKey]` i/lub
  // `deriveShared[colKey]`, wysyła ich BIEŻĄCĄ wartość (i/lub jej pochodne
  // CIDR) do wspólnego magazynu (ten sam magazyn co `TopologyBuilder` /
  // `SharedValue` — `sharedFieldStore.js`). Puste komórki są pomijane przy
  // zwykłym `shared` (żeby świeżo zamontowana, jeszcze niewypełniona tabela
  // nie nadpisywała pustką wartości zapisanej wcześniej gdzie indziej) —
  // `deriveAndWriteShared` sama decyduje, co zrobić z pustą/niepoprawną
  // wartością (czyści pochodne). Używane zarówno po przywróceniu zapisanego
  // stanu z `sessionStorage`, jak i (patrz `setCell`) na bieżąco przy każdej
  // zmianie.
  function broadcastSharedValues(rowsToBroadcast) {
    rowsToBroadcast.forEach(row => {
      columns.forEach(c => {
        if (c.readOnly) return;
        const v = row[c.key];
        const sharedKey = getSharedKey(row, c.key);
        if (sharedKey && v !== undefined && v !== null && String(v).trim() !== '') {
          writeSharedField(sharedKey, v);
        }
        // Tak jak zwykły `shared` wyżej — pomijamy puste komórki przy
        // rozgłaszaniu po zamontowaniu, żeby świeżo załadowana (jeszcze
        // niewypełniona) tabela nie czyściła pochodnych zapisanych przez
        // inny, już wypełniony komponent na tej samej stronie. Aktywne
        // czyszczenie na '' dzieje się tylko przy realnej edycji — patrz
        // `setCell`.
        const deriveCfg = getDeriveSharedConfig(row, c.key);
        if (deriveCfg && v !== undefined && v !== null && String(v).trim() !== '') {
          deriveAndWriteShared(deriveCfg, v);
        }
      });
    });
  }

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        setRows(prev => {
          const merged = prev.map((row, i) => {
            const savedRow = saved[i];
            if (!savedRow) return row;
            const next = {...row};
            editableKeys.forEach(k => {
              const v = savedRow[k];
              // Przyjmujemy tylko zwykły tekst/liczbę — na wypadek, gdyby w
              // sessionStorage nadal leżały stare, uszkodzone dane sprzed tej
              // poprawki, nie próbujemy ich reanimować.
              if (typeof v === 'string' || typeof v === 'number') next[k] = v;
            });
            return next;
          });
          // Dodatkowe wiersze dodane wcześniej przez studenta przyciskiem
          // "+ Dodaj wiersz" (wykraczające poza initialRows) — to zawsze
          // zwykłe obiekty, bez ryzyka elementów React w środku.
          const extra = saved.slice(prev.length).filter(r => r && typeof r === 'object');
          const finalRows = extra.length > 0 ? [...merged, ...extra] : merged;
          broadcastSharedValues(finalRows);
          return finalRows;
        });
      }
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(sanitizeForStorage(rows)));
    } catch (e) { /* ignorujemy */ }
  }, [rows, key]);

  function setCell(rowIndex, colKey, value) {
    setRows(prev => prev.map((r, i) => (i === rowIndex ? {...r, [colKey]: value} : r)));
    setChecked(false); // edycja po sprawdzeniu unieważnia stary wynik
    // Jeśli ten wiersz ma zdefiniowany `shared[colKey]`, od razu (nie czekając
    // na re-render) wyślij wpisaną wartość do wspólnego magazynu — dokładnie
    // tak samo jak `setFieldValue` w `TopologyBuilder`. Tu, w przeciwieństwie
    // do `broadcastSharedValues`, świadomie wysyłamy też pustą wartość (student
    // wyczyścił pole) — bo to jawna akcja studenta, a nie efekt montowania.
    const row = rows[rowIndex];
    const sharedKey = row && getSharedKey(row, colKey);
    if (sharedKey) writeSharedField(sharedKey, value);
    // Jeśli ta komórka ma `deriveShared[colKey]`, rozbij wpisaną wartość na
    // pochodne CIDR (network/wildcard/mask/…) i zapisz każdą pod jej własnym
    // kluczem — na bieżąco, przy każdym wciśniętym znaku (dopóki wartość nie
    // jest poprawnym CIDR-em, pochodne po prostu stoją wyzerowane na '').
    const deriveCfg = row && getDeriveSharedConfig(row, colKey);
    if (deriveCfg) deriveAndWriteShared(deriveCfg, value);
  }

  function addRow() {
    setRows(prev => [...prev, makeEmptyRow(columns)]);
    setChecked(false);
  }

  function removeRow(rowIndex) {
    setRows(prev => prev.filter((_, i) => i !== rowIndex));
    setChecked(false);
  }

  function resetAll() {
    // Wyczyść też klucze `shared` I `deriveShared` przypisane w bieżących
    // wierszach — inaczej reset tabeli zostawiałby "duchy" starych wartości,
    // nadal widoczne np. w <SharedValue shared="..." /> gdzieś indziej na
    // stronie.
    rows.forEach(row => {
      columns.forEach(c => {
        if (c.readOnly) return;
        const sharedKey = getSharedKey(row, c.key);
        if (sharedKey) clearSharedField(sharedKey);
        const deriveCfg = getDeriveSharedConfig(row, c.key);
        if (deriveCfg) Object.values(deriveCfg).forEach(k => clearSharedField(k));
      });
    });
    setRows((initialRows && initialRows.length > 0) ? initialRows.map(r => ({...r})) : [makeEmptyRow(columns)]);
    setChecked(false);
  }

  // Czy w ogóle jest co sprawdzać — jeśli żaden wiersz nie ma ani `expected`,
  // ani `expectedShared`, ani żadna edytowalna kolumna nie ma `autoValue`,
  // przycisk "Sprawdź" w ogóle się nie pokazuje.
  const hasAutoValueColumn = columns.some(c => !c.readOnly && typeof c.autoValue === 'function');
  const hasAnyExpected = hasAutoValueColumn || rows.some(r =>
    (r.expected && Object.keys(r.expected).length > 0) ||
    (r.expectedShared && Object.keys(r.expectedShared).length > 0)
  );

  // Podsumowanie po kliknięciu "Sprawdź": ile komórek Z ustaloną wartością
  // oczekiwaną jest poprawnych, na ile w ogóle takich komórek jest.
  function computeSummary() {
    let total = 0, correct = 0;
    const duplicateCells = findDuplicateCells(rows, columns);
    rows.forEach((row, rowIndex) => {
      columns.forEach(c => {
        if (c.readOnly) return;
        const expected = getExpectedValue(row, c, rowIndex);
        if (expected === undefined) return;
        total++;
        const isDuplicate = c.checkDuplicates && duplicateCells.has(`${rowIndex}:${c.key}`);
        if (normalize(row[c.key]) === normalize(expected) && !isDuplicate) correct++;
      });
    });
    return {total, correct};
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0', overflowX: 'auto',
  };
  const heading = {fontSize: '1.2rem', fontWeight: 600, color: '#111827', margin: '0 0 16px 0'};

  const table = {borderCollapse: 'collapse', width: '100%', minWidth: `${columns.length * 140}px`};
  const th = {
    textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem', color: '#6b7280',
    borderBottom: '2px solid #e5e7eb', fontWeight: 600,
  };
  const td = {padding: '6px 8px', borderBottom: '1px solid #f3f4f6'};

  // status: null (nieocenione/zwykłe "wypełnione") | true (poprawne) | false (błędne)
  const inputStyle = (status, readOnly) => {
    let border = readOnly ? '1px solid transparent' : '1px solid #e5e7eb';
    let background = readOnly ? 'transparent' : '#ffffff';
    if (!readOnly) {
      if (status === true) { border = '1px solid #16a34a'; background = '#f0fdf4'; }
      else if (status === false) { border = '1px solid #dc2626'; background = '#fef2f2'; }
    }
    return {
      width: '100%', padding: '7px 9px', borderRadius: '6px', fontSize: '0.85rem',
      fontFamily: readOnly ? 'inherit' : 'monospace', boxSizing: 'border-box',
      border, background,
      color: readOnly ? '#374151' : '#111827', fontWeight: readOnly ? 600 : 400,
      cursor: readOnly ? 'default' : 'text',
    };
  };
  const dupHint = {fontSize: '0.68rem', color: '#dc2626', marginTop: '3px', lineHeight: 1.2};

  const smallBtn = {
    padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
    background: '#ffffff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer',
  };
  const darkBtn = {...smallBtn, background: '#111827', color: '#ffffff', border: 'none', fontWeight: 600};
  const removeBtn = {
    padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca',
    background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer',
  };

  const summary = checked ? computeSummary() : null;
  const duplicateCells = findDuplicateCells(rows, columns);

  return (
    <div style={card}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px'}}>
        <h4 style={heading}>{title || 'Tabela do wypełnienia'}</h4>
        <div style={{display: 'flex', gap: '8px'}}>
          {hasAnyExpected && <button style={darkBtn} onClick={() => setChecked(true)}>Sprawdź</button>}
          <button style={smallBtn} onClick={resetAll}>Resetuj</button>
        </div>
      </div>

      <table style={table}>
        <thead>
          <tr>
            {columns.map(c => <th key={c.key} style={th}>{c.label}</th>)}
            {allowRemoveRows && <th style={{...th, width: '40px'}}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map(c => {
                if (c.readOnly) {
                  // Kolumny tylko-do-odczytu renderują się jako zwykły <div>, a nie
                  // <input> — dzięki temu mogą zawierać CAŁY komponent React (np.
                  // <SharedValue shared="..." />), a nie tylko zwykły tekst.
                  // Jeśli kolumna ma `autoValue`, wartość jest wyliczana "w locie"
                  // (nie trzeba jej ręcznie wpisywać do `initialRows`).
                  const isAutoDuplicate = c.checkDuplicates && duplicateCells.has(`${rowIndex}:${c.key}`);
                  return (
                    <td key={c.key} style={td}>
                      <div style={{
                        ...inputStyle(null, true), display: 'flex', alignItems: 'center', minHeight: '20px',
                        ...(isAutoDuplicate ? {border: '1px solid #dc2626', background: '#fef2f2'} : {}),
                      }}>
                        {getDisplayValue(row, c, rowIndex)}
                      </div>
                      {isAutoDuplicate && <div style={dupHint}>duplikat wartości</div>}
                    </td>
                  );
                }
                const expected = getExpectedValue(row, c, rowIndex);
                const filled = (row[c.key] || '').trim() !== '';
                const isDuplicate = c.checkDuplicates && duplicateCells.has(`${rowIndex}:${c.key}`);
                let status = null;
                if (checked && expected !== undefined) {
                  status = normalize(row[c.key]) === normalize(expected) && !isDuplicate;
                } else if (filled) {
                  status = isDuplicate ? false : null; // brak walidacji — samo wypełnienie, bez oceny (jak dotychczas), poza duplikatami
                }
                return (
                  <td key={c.key} style={td}>
                    <input
                      type="text"
                      value={row[c.key] || ''}
                      onChange={e => setCell(rowIndex, c.key, e.target.value)}
                      placeholder={typeof c.placeholder === 'function' ? c.placeholder(row, rowIndex) : (c.placeholder || '')}
                      style={inputStyle(checked && expected !== undefined ? status : (filled ? (isDuplicate ? false : true) : null), false)}
                    />
                    {isDuplicate && <div style={dupHint}>duplikat adresu</div>}
                  </td>
                );
              })}
              {allowRemoveRows && (
                <td style={td}>
                  <button style={removeBtn} onClick={() => removeRow(rowIndex)} title="Usuń wiersz">✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {allowAddRows && (
        <button style={{...darkBtn, marginTop: '14px'}} onClick={addRow}>+ Dodaj wiersz</button>
      )}

      {summary && (
        <div style={{
          marginTop: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem',
          background: summary.correct === summary.total ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${summary.correct === summary.total ? '#bbf7d0' : '#fecaca'}`,
          color: '#111827',
        }}>
          Wynik: {summary.correct} / {summary.total} poprawnych pól (tylko te z ustaloną wartością oczekiwaną).
        </div>
      )}
    </div>
  );
}
