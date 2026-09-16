import React, {useState, useEffect, useRef} from 'react';

export default function SprawozdanieHeader({exerciseTitle, storageKey}) {
  const key = `sprawozdanie-header:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);

  const [fields, setFields] = useState({
    student1: '',
    student2: '',
    semestr: '',
    rok: '',
    grupa: '',
  });
  const [warning, setWarning] = useState('');

  // Tylko krótkie pola tekstowe trzymamy w sessionStorage — dane znikają po
  // zamknięciu karty, ale przetrwają przypadkowe odświeżenie (F5) w trakcie
  // wypełniania. Screenshoty (osobny komponent ScreenshotPaste) celowo NIE są
  // tu zapisywane — żyją tylko w pamięci przeglądarki (RAM) na czas sesji,
  // żeby nie natrafić na limit pojemności sessionStorage/localStorage.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) setFields(JSON.parse(raw));
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(fields));
    } catch (e) { /* ignorujemy */ }
  }, [fields, key]);

  function setField(name, value) {
    setFields(prev => ({...prev, [name]: value}));
    setWarning('');
  }

  const STUDENTS = [
    {key: 'student1', label: 'Imię i nazwisko (osoba 1)'},
    {key: 'student2', label: 'Imię i nazwisko (osoba 2)'},
  ];
  const OTHER = [
    {key: 'semestr', label: 'Semestr'},
    {key: 'rok', label: 'Rok akademicki'},
    {key: 'grupa', label: 'Grupa'},
  ];
  const REQUIRED = [...STUDENTS, ...OTHER];

  function handleGenerate() {
    const missing = REQUIRED.filter(f => !fields[f.key] || !fields[f.key].trim());
    if (missing.length > 0) {
      setWarning(
        'Uzupełnij przed wygenerowaniem: ' + missing.map(f => f.label).join(', ') + '.'
      );
      return;
    }
    setWarning('');
    // Cała reszta strony (Wprowadzenie, Zadania, wklejone zrzuty ekranu,
    // Bibliografia) to zwykła treść MDX poniżej tego komponentu — drukujemy
    // więc całą stronę; reguły @media print w custom.css chowają navbar,
    // sidebar, stopkę i przyciski (klasa .no-print), zostawiając samą treść.
    window.print();
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
  };
  const titleStyle = {fontSize: '1.6rem', fontWeight: 700, color: '#111827', textAlign: 'center', margin: '0 0 4px 0'};
  const subtitleStyle = {fontSize: '1.05rem', color: '#6b7280', textAlign: 'center', margin: '0 0 24px 0'};

  const columnsWrap = {display: 'flex', gap: '40px', flexWrap: 'wrap'};
  const column = {flex: '1 1 240px', minWidth: '240px'};
  const fieldWrap = {marginBottom: '16px'};
  const fieldLabel = {display: 'block', fontSize: '0.85rem', color: '#374151', fontWeight: 600, marginBottom: '5px'};
  const inputStyle = (filled) => ({
    width: '100%', padding: '9px 11px', borderRadius: '6px', fontSize: '0.92rem', boxSizing: 'border-box',
    border: filled ? '1px solid #16a34a' : '1px solid #e5e7eb',
    background: filled ? '#f0fdf4' : '#ffffff',
  });

  const darkBtn = {
    padding: '11px 24px', borderRadius: '8px', border: 'none', fontWeight: 600,
    fontSize: '0.95rem', cursor: 'pointer', background: '#111827', color: '#ffffff', marginTop: '20px',
  };

  return (
    <div style={card} className="sprawozdanie-header">
      <h1 style={titleStyle}>Sieci komputerowe</h1>
      {exerciseTitle && <p style={subtitleStyle}>{exerciseTitle}</p>}

      <div style={columnsWrap}>
        <div style={column}>
          {STUDENTS.map(f => (
            <div key={f.key} style={fieldWrap}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                type="text"
                value={fields[f.key]}
                onChange={e => setField(f.key, e.target.value)}
                style={inputStyle(fields[f.key].trim() !== '')}
                placeholder={f.label}
              />
            </div>
          ))}
        </div>
        <div style={column}>
          {OTHER.map(f => (
            <div key={f.key} style={fieldWrap}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                type="text"
                value={fields[f.key]}
                onChange={e => setField(f.key, e.target.value)}
                style={inputStyle(fields[f.key].trim() !== '')}
                placeholder={f.label}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="no-print">
        {warning && (
          <div style={{
            marginTop: '16px', padding: '10px 14px', borderRadius: '8px',
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.9rem',
          }}>
            ⚠️ {warning}
          </div>
        )}
        <button style={darkBtn} onClick={handleGenerate}>Wygeneruj sprawozdanie (PDF)</button>
        <p style={{fontSize: '0.78rem', color: '#9ca3af', marginTop: '8px'}}>
          Sprawdza, czy powyższe dane są uzupełnione, a następnie otwiera okno drukowania —
          wybierz w nim drukarkę „Zapisz jako PDF”, żeby uzyskać gotowe sprawozdanie.
        </p>
      </div>
    </div>
  );
}
