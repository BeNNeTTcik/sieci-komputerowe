import React, {useState} from 'react';

const ROW_H = 36;

const ITEMS = [
  {id: 'tcp', label: 'TCP', y: 70, correct: 'transportowa'},
  {id: 'swiatlowod', label: 'światłowód', y: 114, correct: 'fizyczna'},
  {id: 'router', label: 'router', y: 158, correct: 'sieciowa'},
  {id: '8021q', label: 'IEEE 802.1Q', y: 202, correct: 'lacza'},
  {id: 'wifi', label: 'Wi-Fi', y: 246, correct: 'fizyczna'},
  {id: 'switch', label: 'switch', y: 290, correct: 'lacza'},
  {id: 'dns', label: 'DNS', y: 334, correct: 'aplikacji'},
  {id: 'fale', label: 'fale radiowe', y: 378, correct: 'fizyczna'},
  {id: 'http', label: 'HTTP', y: 422, correct: 'aplikacji'},
  {id: '8023', label: 'IEEE 802.3', y: 466, correct: 'lacza'},
  {id: 'utp', label: 'kabel UTP', y: 510, correct: 'fizyczna'},
  {id: 'ssl', label: 'SSL', y: 554, correct: 'prezentacji'},
  {id: 'ip', label: 'IP', y: 598, correct: 'sieciowa'},
];

const LAYERS = [
  {id: 'aplikacji', label: 'warstwa aplikacji', y: 70},
  {id: 'prezentacji', label: 'warstwa prezentacji', y: 158},
  {id: 'sesji', label: 'warstwa sesji', y: 246},
  {id: 'transportowa', label: 'warstwa transportowa', y: 334},
  {id: 'sieciowa', label: 'warstwa sieciowa', y: 422},
  {id: 'lacza', label: 'warstwa łącza danych', y: 510},
  {id: 'fizyczna', label: 'warstwa fizyczna', y: 598},
];

export default function OsiMatchingExercise({title}) {
  const [assignments, setAssignments] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [checked, setChecked] = useState(false);
  const [warning, setWarning] = useState('');

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  };
  const heading = {fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0'};
  const subheading = {fontSize: '0.9rem', color: '#6b7280', margin: '0 0 20px 0'};
  const darkBtn = {
    padding: '10px 22px', borderRadius: '8px', border: 'none', fontWeight: 600,
    fontSize: '0.95rem', cursor: 'pointer', background: '#111827', color: '#ffffff',
  };
  const lightBtn = {
    padding: '10px 22px', borderRadius: '8px', border: '1px solid #e5e7eb',
    fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', background: '#ffffff', color: '#111827',
  };

  function handleItemClick(id) {
    if (checked) return;
    setSelectedItem(id);
    setWarning('');
  }

  function handleLayerClick(id) {
    if (checked || !selectedItem) return;
    setAssignments(prev => ({...prev, [selectedItem]: id}));
    setSelectedItem(null);
    setWarning('');
  }

  function handleCheck() {
    const missing = ITEMS.filter(it => !assignments[it.id]);
    if (missing.length > 0) {
      setWarning('Brakuje połączenia dla: ' + missing.map(m => m.label).join(', '));
      return;
    }
    setWarning('');
    setChecked(true);
  }

  function handleReset() {
    setAssignments({});
    setSelectedItem(null);
    setChecked(false);
    setWarning('');
  }

  const correctCount = ITEMS.filter(it => assignments[it.id] === it.correct).length;
  const pct = Math.round((correctCount / ITEMS.length) * 100);

  function itemStroke(it) {
    if (selectedItem === it.id) return {stroke: '#2563eb', width: 2};
    if (checked) {
      return assignments[it.id] === it.correct
        ? {stroke: '#16a34a', width: 2}
        : {stroke: '#dc2626', width: 2};
    }
    return {stroke: '#e5e7eb', width: 0.5};
  }

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Dopasuj urządzenia i protokoły do warstw modelu OSI'}</h3>
      <p style={subheading}>
        Kliknij element po lewej, potem warstwę po prawej, aby je połączyć. Można zmieniać połączenia dowolną liczbę razy przed sprawdzeniem.
      </p>

      <svg viewBox="0 0 680 680" style={{width: '100%', height: 'auto', display: 'block'}}>
        <g>
          {ITEMS.map(it => {
            const layerId = assignments[it.id];
            if (!layerId) return null;
            const layer = LAYERS.find(l => l.id === layerId);
            const isOk = it.correct === layerId;
            const lineColor = checked ? (isOk ? '#16a34a' : '#dc2626') : '#9ca3af';
            return (
              <line
                key={it.id}
                x1={260} y1={it.y + ROW_H / 2}
                x2={420} y2={layer.y + ROW_H / 2}
                stroke={lineColor} strokeWidth={checked ? 2 : 1.5}
              />
            );
          })}
        </g>

        <g>
          {ITEMS.map(it => {
            const s = itemStroke(it);
            return (
              <g key={it.id} onClick={() => handleItemClick(it.id)} style={{cursor: checked ? 'default' : 'pointer'}}>
                <rect x={60} y={it.y} width={200} height={ROW_H} rx={8} fill="#ffffff" stroke={s.stroke} strokeWidth={s.width} />
                <text x={160} y={it.y + ROW_H / 2} textAnchor="middle" dominantBaseline="central" fontSize={13} fill="#111827">
                  {it.label}
                </text>
                <circle cx={260} cy={it.y + ROW_H / 2} r={3} fill="#9ca3af" />
              </g>
            );
          })}
        </g>

        <g>
          {LAYERS.map(ly => (
            <g key={ly.id} onClick={() => handleLayerClick(ly.id)} style={{cursor: checked ? 'default' : 'pointer'}}>
              <rect x={420} y={ly.y} width={200} height={ROW_H} rx={8} fill="#ffffff" stroke="#e5e7eb" strokeWidth={0.5} />
              <text x={520} y={ly.y + ROW_H / 2} textAnchor="middle" dominantBaseline="central" fontSize={13} fill="#111827">
                {ly.label}
              </text>
              <circle cx={420} cy={ly.y + ROW_H / 2} r={3} fill="#9ca3af" />
            </g>
          ))}
        </g>
      </svg>

      {warning && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          borderRadius: '8px', padding: '10px 14px', marginTop: '14px', fontSize: '0.9rem',
        }}>
          ⚠️ {warning}
        </div>
      )}

      {checked && (
        <div style={{
          textAlign: 'center', padding: '16px', borderRadius: '12px', marginTop: '16px',
          background: pct >= 50 ? '#f0fdf4' : '#fef2f2',
        }}>
          <div style={{fontSize: '1.4rem', fontWeight: 700, color: pct >= 50 ? '#16a34a' : '#dc2626'}}>
            {correctCount} / {ITEMS.length} poprawnych ({pct}%)
          </div>
        </div>
      )}

      <div style={{display: 'flex', gap: '12px', marginTop: '20px'}}>
        <button style={darkBtn} onClick={handleCheck}>Sprawdź</button>
        <button style={lightBtn} onClick={handleReset}>Resetuj</button>
      </div>
    </div>
  );
}
