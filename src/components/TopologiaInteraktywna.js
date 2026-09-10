import React, {useState, useEffect, useRef} from 'react';

export default function TopologiaInteraktywna({title, storageKey}) {
  const key = `topologia:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);

  const [x, setX] = useState('1');
  const [ifaces, setIfaces] = useState({
    sw_to_r1: '', r1_to_sw: '', r1_to_r2: '', r2_to_r1: '', r2_to_pcc: '',
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.x) setX(saved.x);
        if (saved.ifaces) setIfaces(saved.ifaces);
      }
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({x, ifaces}));
    } catch (e) { /* ignorujemy */ }
  }, [x, ifaces, key]);

  function setIface(fieldKey, value) {
    setIfaces(prev => ({...prev, [fieldKey]: value}));
  }

  function reset() {
    setX('1');
    setIfaces({sw_to_r1: '', r1_to_sw: '', r1_to_r2: '', r2_to_r1: '', r2_to_pcc: ''});
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  };
  const heading = {fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: '0 0 20px 0'};

  const xInputStyle = {
    width: '60px', padding: '6px 10px', borderRadius: '8px', border: '2px solid #2563eb',
    fontSize: '1rem', fontWeight: 700, textAlign: 'center', color: '#2563eb', background: '#eff6ff',
  };

  const node = {
    padding: '14px 18px', borderRadius: '10px', border: '1px solid #e5e7eb',
    background: '#f9fafb', fontWeight: 600, color: '#111827', textAlign: 'center',
    whiteSpace: 'nowrap', fontSize: '0.95rem',
  };
  const pcNode = {...node, background: '#eff6ff', borderColor: '#bfdbfe'};

  const ifaceInput = (filled) => ({
    width: '128px', padding: '6px 8px', borderRadius: '6px', fontSize: '0.78rem',
    border: filled ? '1px solid #16a34a' : '1px solid #e5e7eb',
    background: filled ? '#f0fdf4' : '#ffffff', textAlign: 'center',
  });
  const ifaceLabel = {fontSize: '0.7rem', color: '#6b7280', marginBottom: '3px', textAlign: 'center'};

  const line = {flex: 1, minWidth: '30px', height: '2px', background: '#9ca3af'};

  function IfaceField({fieldKey, label}) {
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={ifaceLabel}>{label}</div>
        <input
          type="text"
          value={ifaces[fieldKey]}
          onChange={e => setIface(fieldKey, e.target.value)}
          placeholder="np. Gi0/0"
          style={ifaceInput(ifaces[fieldKey].trim() !== '')}
        />
      </div>
    );
  }

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Topologia pary — schemat interaktywny'}</h3>

      <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', flexWrap: 'wrap'}}>
        <label style={{fontSize: '0.95rem', color: '#374151'}}>Numer Twojej grupy (X):</label>
        <input
          type="text"
          value={x}
          onChange={e => setX(e.target.value.replace(/[^0-9]/g, ''))}
          style={xInputStyle}
        />
        <button
          onClick={reset}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
            background: '#ffffff', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          Resetuj
        </button>
      </div>

      <div style={{overflowX: 'auto', paddingBottom: '8px'}}>
        <div style={{display: 'flex', alignItems: 'center', minWidth: '900px', gap: '4px'}}>

          {/* PC-A / PC-B */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <div style={pcNode}>PC-A</div>
            <div style={pcNode}>PC-B</div>
          </div>

          <div style={line} />

          {/* SW-X */}
          <div style={node}>{`SW-${x || 'X'}`}</div>

          {/* SW <-> R1 */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
            <IfaceField fieldKey="sw_to_r1" label={`SW-${x || 'X'} →`} />
            <div style={{width: '100%', height: '2px', background: '#9ca3af'}} />
            <IfaceField fieldKey="r1_to_sw" label={`R1-${x || 'X'} →`} />
          </div>

          {/* R1-X */}
          <div style={node}>{`R1-${x || 'X'}`}</div>

          {/* R1 <-> R2 */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
            <IfaceField fieldKey="r1_to_r2" label={`R1-${x || 'X'} →`} />
            <div style={{width: '100%', height: '2px', background: '#9ca3af'}} />
            <IfaceField fieldKey="r2_to_r1" label={`R2-${x || 'X'} →`} />
          </div>

          {/* R2-X */}
          <div style={node}>{`R2-${x || 'X'}`}</div>

          {/* R2 <-> PC-C */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
            <IfaceField fieldKey="r2_to_pcc" label={`R2-${x || 'X'} →`} />
            <div style={{width: '100%', height: '2px', background: '#9ca3af'}} />
          </div>

          {/* PC-C */}
          <div style={pcNode}>PC-C</div>

        </div>
      </div>

      <p style={{fontSize: '0.8rem', color: '#9ca3af', marginTop: '20px', marginBottom: 0}}>
        Wpisz swój numer grupy — automatycznie podstawi się we wszystkich nazwach urządzeń. Uzupełnij nazwy interfejsów zgodnie ze swoją konfiguracją (np. <code>Gi0/0</code>, <code>Fa0/24</code>) — pola zapisują się automatycznie w tej przeglądarce.
      </p>
    </div>
  );
}
