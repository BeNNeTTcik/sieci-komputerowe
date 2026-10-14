import React, {useState, useEffect} from 'react';
import {readSharedField, writeSharedField, subscribeSharedField} from './sharedFieldStore';
import {DESIGN_SCENARIOS} from './designScenariosPool';

// Scenariusz projektowy przydzielany parze na podstawie numeru grupy (X).
//
// Każdy scenariusz to inna (fikcyjna) organizacja z INNYM kształtem sieci —
// inną liczbą budynków/lokalizacji, przełączników i routerów oraz innymi
// "pułapkami" projektowymi. Przydział jest deterministyczny:
// scenariusz nr ((X - 1) mod liczba_scenariuszy) + 1, więc ta sama grupa
// zawsze widzi ten sam scenariusz, a sąsiednie grupy dostają różne.
//
// Numer grupy jest zapisywany we wspólnym magazynie pod kluczem `xShared`
// (domyślnie 'grupa_x') — tym samym, którego używają TopologyBuilder,
// SharedValue i tabele w innych ćwiczeniach.
//
// Scenariusze leżą w osobnym pliku `designScenariosPool.js` (50 sztuk).
// Własną listę można przekazać propem `scenarios` w tym samym formacie.
//
// Przenoszenie tabeli grup do <EditableTable>:
//  - `copyToTable` — storageKey docelowej tabeli; pojawia się przycisk
//    „Wstaw grupy do tabeli”, który wysyła zdarzenie `editable-table-fill`,
//  - `copyColumns` — klucze kolumn docelowej tabeli dla kolejnych pól grupy:
//    [nazwa, gdzie, liczba dziś, wymagania dostępu]; `null` pomija pole,
//  - przycisk „Kopiuj tabelę” zawsze kopiuje grupy do schowka jako tekst
//    rozdzielony tabulatorami — da się go wkleić (Ctrl+V) w dowolną
//    EditableTable, Excel albo Arkusze.

export default function DesignScenario({
  scenarios = DESIGN_SCENARIOS,
  xShared = 'grupa_x',
  copyToTable,
  copyColumns = ['grupa', 'gdzie', 'dzis', 'dostep'],
}) {
  const [x, setX] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  useEffect(() => {
    setX(readSharedField(xShared, ''));
    const unsubscribe = subscribeSharedField(xShared, (v) => setX(v));
    return unsubscribe;
  }, [xShared]);

  function handleX(value) {
    const clean = value.replace(/[^0-9]/g, '');
    setX(clean);
    writeSharedField(xShared, clean);
  }

  const xNum = parseInt(x, 10);
  const hasX = Number.isInteger(xNum) && xNum > 0;
  const index = hasX ? (xNum - 1) % scenarios.length : -1;
  const s = hasX ? scenarios[index] : null;

  function flash(msg) {
    setCopyMsg(msg);
    window.setTimeout(() => setCopyMsg(''), 3000);
  }

  function insertIntoTable() {
    if (!s || !copyToTable) return;
    const rows = s.groups.map(g => {
      const obj = {};
      copyColumns.forEach((key, i) => { if (key) obj[key] = String(g[i]); });
      return obj;
    });
    window.dispatchEvent(new CustomEvent('editable-table-fill', {detail: {storageKey: copyToTable, rows}}));
    flash(`Wstawiono ${rows.length} wierszy do tabeli w kroku 1.`);
  }

  function copyAsText() {
    if (!s) return;
    const tsv = s.groups.map(g => g.join('\t')).join('\n');
    const done = () => flash('Skopiowano — kliknij pierwszą komórkę tabeli i wklej (Ctrl+V).');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsv).then(done, () => flash('Nie udało się skopiować — zaznacz tabelę myszą i użyj Ctrl+C.'));
    } else {
      flash('Przeglądarka nie pozwala kopiować — zaznacz tabelę myszą i użyj Ctrl+C.');
    }
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
  };
  const xInputStyle = {
    width: '52px', padding: '5px 8px', borderRadius: '8px', border: '2px solid #2563eb',
    fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', color: '#2563eb', background: '#eff6ff',
  };
  const pill = {
    display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem',
    fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
  };
  const th = {textAlign: 'left', padding: '8px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem', color: '#374151'};
  const btn = {
    padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#ffffff',
    color: '#111827', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
  };
  const btnDark = {...btn, background: '#111827', color: '#ffffff', border: 'none'};
  const td = {padding: '8px 10px', borderBottom: '1px solid #f3f4f6', fontSize: '0.88rem', color: '#111827', verticalAlign: 'top'};

  return (
    <div style={card}>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
        <label style={{fontSize: '0.9rem', color: '#374151'}}>Numer grupy (X):</label>
        <input type="text" value={x} onChange={e => handleX(e.target.value)} style={xInputStyle} />
        {s && <span style={pill}>Scenariusz {index + 1} z {scenarios.length}</span>}
      </div>

      {!s && (
        <div style={{fontSize: '0.9rem', color: '#9ca3af'}}>Wpisz numer grupy, aby zobaczyć swój scenariusz.</div>
      )}

      {s && (
        <>
          <h3 style={{margin: '0 0 2px 0', color: '#111827'}}>{s.name}</h3>
          <div style={{fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px'}}>{s.kind} (organizacja fikcyjna)</div>
          <p style={{margin: '0 0 14px 0', lineHeight: 1.6}}>{s.description}</p>

          <pre style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem', overflowX: 'auto', margin: '0 0 16px 0'}}>
            {s.topology.join('\n')}
          </pre>

          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', display: 'table'}}>
              <thead>
                <tr>
                  <th style={th}>Grupa</th>
                  <th style={th}>Gdzie</th>
                  <th style={th}>Urządzeń dziś</th>
                  <th style={th}>Wymagania dostępu</th>
                </tr>
              </thead>
              <tbody>
                {s.groups.map((g, i) => (
                  <tr key={i}>
                    <td style={td}>{g[0]}</td>
                    <td style={td}>{g[1]}</td>
                    <td style={{...td, textAlign: 'center'}}>{g[2]}</td>
                    <td style={td}>{g[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px'}}>
            {copyToTable && (
              <button style={btnDark} onClick={insertIntoTable}>Wstaw grupy do tabeli w kroku 1</button>
            )}
            <button style={btn} onClick={copyAsText}>Kopiuj tabelę</button>
            {copyMsg && <span style={{fontSize: '0.82rem', color: '#16a34a'}}>{copyMsg}</span>}
          </div>

          <div style={{fontSize: '0.9rem', margin: '14px 0 0 0', lineHeight: 1.6}}>
            {s.growth && (
              <div><b>Planowany wzrost:</b> o {s.growth[0]}% w ciągu {s.growth[1]} lat.</div>
            )}
            <div>
              <b>Pula do Waszej dyspozycji:</b> <code>10.{x}.0.0/16</code>. Jak ją podzielicie — decydujecie sami.
            </div>
          </div>

          {s.notes && s.notes.length > 0 && (
            <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginTop: '14px', fontSize: '0.88rem', lineHeight: 1.6}}>
              <b>Na co uważać:</b>
              <ul style={{margin: '4px 0 0 0', paddingLeft: '20px'}}>
                {s.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
