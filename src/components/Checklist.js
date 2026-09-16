import React, {useState, useEffect, useRef} from 'react';

export default function Checklist({title, sections, storageKey}) {
  const key = `checklist:${storageKey || (title || 'domyslna').slice(0, 40)}`;
  const loadedRef = useRef(false);

  // Płaska lista wszystkich itemów z unikalnym id (sekcja-index_item-index),
  // żeby dwie sekcje mogły mieć identyczny tekst punktu bez kolizji.
  const allItems = [];
  sections.forEach((s, si) => {
    s.items.forEach((_, ii) => allItems.push(`${si}-${ii}`));
  });

  const [checkedMap, setCheckedMap] = useState({});

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) setCheckedMap(JSON.parse(raw));
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(checkedMap));
    } catch (e) { /* ignorujemy */ }
  }, [checkedMap, key]);

  function toggle(id) {
    setCheckedMap(prev => ({...prev, [id]: !prev[id]}));
  }

  function reset() {
    setCheckedMap({});
  }

  const doneCount = allItems.filter(id => checkedMap[id]).length;
  const totalCount = allItems.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '28px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
  };
  const heading = {fontSize: '1.2rem', fontWeight: 600, color: '#111827', margin: '0 0 4px 0'};
  const sectionTitle = {fontSize: '0.9rem', fontWeight: 700, color: '#374151', margin: '20px 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.03em'};

  const progressWrap = {display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 4px 0'};
  const progressBarOuter = {flex: 1, height: '8px', borderRadius: '999px', background: '#e5e7eb', overflow: 'hidden'};
  const progressBarInner = {
    height: '100%', borderRadius: '999px', width: `${pct}%`,
    background: allDone ? '#16a34a' : '#2563eb', transition: 'width 0.2s',
  };
  const progressLabel = {fontSize: '0.82rem', color: '#6b7280', whiteSpace: 'nowrap'};

  const itemRow = (checked) => ({
    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 4px',
    cursor: 'pointer', borderRadius: '6px',
  });
  const checkbox = (checked) => ({
    marginTop: '2px', width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer', accentColor: '#16a34a',
  });
  const itemText = (checked) => ({
    fontSize: '0.92rem', lineHeight: 1.5,
    color: checked ? '#9ca3af' : '#111827',
    textDecoration: checked ? 'line-through' : 'none',
  });

  const smallBtn = {
    padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
    background: '#ffffff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer',
  };

  return (
    <div style={card}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap'}}>
        <h4 style={heading}>{title || 'Checklista'}</h4>
        <button style={smallBtn} onClick={reset}>Resetuj</button>
      </div>

      <div style={progressWrap}>
        <div style={progressBarOuter}><div style={progressBarInner} /></div>
        <span style={progressLabel}>{doneCount} / {totalCount}{allDone ? ' ✅' : ''}</span>
      </div>

      {sections.map((section, si) => (
        <div key={si}>
          {section.title && <div style={sectionTitle}>{section.title}</div>}
          {section.items.map((itemText_, ii) => {
            const id = `${si}-${ii}`;
            const isChecked = !!checkedMap[id];
            return (
              <label key={id} style={itemRow(isChecked)}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(id)}
                  style={checkbox(isChecked)}
                />
                <span style={itemText(isChecked)}>{itemText_}</span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
