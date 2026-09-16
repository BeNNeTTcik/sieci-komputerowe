import React, {useState, useEffect, useRef} from 'react';
import {readSharedField} from './sharedFieldStore';

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
// - row.expected[colKey] — zwykła, wpisana na sztywno wartość tekstowa.
// Zwraca undefined, jeśli dla tej komórki nie zdefiniowano żadnej z nich —
// wtedy komórka zachowuje się jak dotychczas, bez żadnej walidacji.
function getExpectedValue(row, colKey) {
  if (row.expectedShared && row.expectedShared[colKey] !== undefined) {
    return readSharedField(row.expectedShared[colKey], '');
  }
  if (row.expected && row.expected[colKey] !== undefined) {
    return row.expected[colKey];
  }
  return undefined;
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
  // localStorage i ponownym wczytaniu (JSON.parse) zostaje z niego "zepsuty",
  // zwykły obiekt {key, ref, props, _owner, ...}, którego React odmawia
  // wyrenderować (stąd "Ta strona uległa awarii").
  //
  // Rozwiązanie: nigdy nie zapisujemy ani nie wczytujemy wartości kolumn
  // `readOnly` — te i tak zawsze pochodzą świeżo z `initialRows` przy każdym
  // renderze, nigdy nie są wpisywane przez studenta, więc nie ma potrzeby ich
  // przechowywać. Do localStorage trafiają WYŁĄCZNIE wartości kolumn
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
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
              // localStorage nadal leżały stare, uszkodzone dane sprzed tej
              // poprawki, nie próbujemy ich reanimować.
              if (typeof v === 'string' || typeof v === 'number') next[k] = v;
            });
            return next;
          });
          // Dodatkowe wiersze dodane wcześniej przez studenta przyciskiem
          // "+ Dodaj wiersz" (wykraczające poza initialRows) — to zawsze
          // zwykłe obiekty, bez ryzyka elementów React w środku.
          const extra = saved.slice(prev.length).filter(r => r && typeof r === 'object');
          return extra.length > 0 ? [...merged, ...extra] : merged;
        });
      }
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(sanitizeForStorage(rows)));
    } catch (e) { /* ignorujemy */ }
  }, [rows, key]);

  function setCell(rowIndex, colKey, value) {
    setRows(prev => prev.map((r, i) => (i === rowIndex ? {...r, [colKey]: value} : r)));
    setChecked(false); // edycja po sprawdzeniu unieważnia stary wynik
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
    setRows((initialRows && initialRows.length > 0) ? initialRows.map(r => ({...r})) : [makeEmptyRow(columns)]);
    setChecked(false);
  }

  // Czy w ogóle jest co sprawdzać — jeśli żaden wiersz nie ma ani `expected`,
  // ani `expectedShared`, przycisk "Sprawdź" w ogóle się nie pokazuje.
  const hasAnyExpected = rows.some(r =>
    (r.expected && Object.keys(r.expected).length > 0) ||
    (r.expectedShared && Object.keys(r.expectedShared).length > 0)
  );

  // Podsumowanie po kliknięciu "Sprawdź": ile komórek Z ustaloną wartością
  // oczekiwaną jest poprawnych, na ile w ogóle takich komórek jest.
  function computeSummary() {
    let total = 0, correct = 0;
    rows.forEach(row => {
      columns.forEach(c => {
        if (c.readOnly) return;
        const expected = getExpectedValue(row, c.key);
        if (expected === undefined) return;
        total++;
        if (normalize(row[c.key]) === normalize(expected)) correct++;
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
                  return (
                    <td key={c.key} style={td}>
                      <div style={{...inputStyle(null, true), display: 'flex', alignItems: 'center', minHeight: '20px'}}>
                        {row[c.key]}
                      </div>
                    </td>
                  );
                }
                const expected = getExpectedValue(row, c.key);
                const filled = (row[c.key] || '').trim() !== '';
                let status = null;
                if (checked && expected !== undefined) {
                  status = normalize(row[c.key]) === normalize(expected);
                } else if (filled) {
                  status = null; // brak walidacji — samo wypełnienie, bez oceny (jak dotychczas)
                }
                return (
                  <td key={c.key} style={td}>
                    <input
                      type="text"
                      value={row[c.key] || ''}
                      onChange={e => setCell(rowIndex, c.key, e.target.value)}
                      placeholder={c.placeholder || ''}
                      style={inputStyle(checked && expected !== undefined ? status : (filled ? true : null), false)}
                    />
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
