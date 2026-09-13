import React, {useState, useEffect, useRef} from 'react';

function makeEmptyRow(columns) {
  const row = {};
  columns.forEach(c => { row[c.key] = c.default || ''; });
  return row;
}

export default function EditableTable({title, columns, initialRows, allowAddRows = true, allowRemoveRows = true, storageKey}) {
  const key = `editable-table:${storageKey || (title || 'domyslna').slice(0, 40)}`;
  const loadedRef = useRef(false);

  const [rows, setRows] = useState(() =>
    (initialRows && initialRows.length > 0) ? initialRows.map(r => ({...r})) : [makeEmptyRow(columns)]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setRows(JSON.parse(raw));
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(rows));
    } catch (e) { /* ignorujemy */ }
  }, [rows, key]);

  function setCell(rowIndex, colKey, value) {
    setRows(prev => prev.map((r, i) => (i === rowIndex ? {...r, [colKey]: value} : r)));
  }

  function addRow() {
    setRows(prev => [...prev, makeEmptyRow(columns)]);
  }

  function removeRow(rowIndex) {
    setRows(prev => prev.filter((_, i) => i !== rowIndex));
  }

  function resetAll() {
    setRows((initialRows && initialRows.length > 0) ? initialRows.map(r => ({...r})) : [makeEmptyRow(columns)]);
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
  const inputStyle = (filled, readOnly) => ({
    width: '100%', padding: '7px 9px', borderRadius: '6px', fontSize: '0.85rem',
    fontFamily: readOnly ? 'inherit' : 'monospace', boxSizing: 'border-box',
    border: readOnly ? '1px solid transparent' : (filled ? '1px solid #16a34a' : '1px solid #e5e7eb'),
    background: readOnly ? 'transparent' : (filled ? '#f0fdf4' : '#ffffff'),
    color: readOnly ? '#374151' : '#111827', fontWeight: readOnly ? 600 : 400,
    cursor: readOnly ? 'default' : 'text',
  });

  const smallBtn = {
    padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
    background: '#ffffff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer',
  };
  const darkBtn = {...smallBtn, background: '#111827', color: '#ffffff', border: 'none', fontWeight: 600};
  const removeBtn = {
    padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca',
    background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer',
  };

  return (
    <div style={card}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px'}}>
        <h4 style={heading}>{title || 'Tabela do wypełnienia'}</h4>
        <div style={{display: 'flex', gap: '8px'}}>
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
              {columns.map(c => (
                <td key={c.key} style={td}>
                  <input
                    type="text"
                    value={row[c.key] || ''}
                    onChange={e => setCell(rowIndex, c.key, e.target.value)}
                    placeholder={c.placeholder || ''}
                    readOnly={!!c.readOnly}
                    style={inputStyle((row[c.key] || '').trim() !== '', !!c.readOnly)}
                  />
                </td>
              ))}
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
    </div>
  );
}
