import React, {useState, useEffect, useRef} from 'react';

// WAŻNE: komponent pola tekstowego zdefiniowany POZA głównym komponentem.
// To naprawia błąd z poprzedniej wersji — gdy taki komponent był zdefiniowany
// WEWNĄTRZ funkcji głównego komponentu, React tworzył go od nowa przy każdym
// renderze (czyli po każdym wciśniętym znaku), co powodowało utratę fokusu
// i wygląd "resetowania się" pola po każdej literze.
function AddrField({label, value, placeholder, onChange}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'}}>
      <div style={{fontSize: '0.72rem', color: '#6b7280'}}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '150px', padding: '6px 8px', borderRadius: '6px', fontSize: '0.82rem',
          textAlign: 'center', fontFamily: 'monospace',
          border: value.trim() ? '1px solid #16a34a' : '1px solid #e5e7eb',
          background: value.trim() ? '#f0fdf4' : '#ffffff',
        }}
      />
    </div>
  );
}

function DeviceIcon({emoji, label, sublabel}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
      <div style={{fontSize: '2rem', lineHeight: 1}}>{emoji}</div>
      <div style={{fontSize: '0.85rem', fontWeight: 600, color: '#111827'}}>{label}</div>
      {sublabel && <div style={{fontSize: '0.72rem', color: '#9ca3af'}}>{sublabel}</div>}
    </div>
  );
}

export default function TopologiaPacketTracer({title, storageKey}) {
  const key = `topologia-pt:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);

  const [x, setX] = useState('1');
  const [vlan, setVlan] = useState('10');
  const [addr, setAddr] = useState({
    swMgmt: '',      // 172.16.X.253
    r1Lan: '',       // 172.16.X.254
    r1Wan: '',       // 10.10.X.5
    r2Wan: '',       // 10.10.X.6
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.x) setX(saved.x);
        if (saved.vlan) setVlan(saved.vlan);
        if (saved.addr) setAddr(saved.addr);
      }
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({x, vlan, addr}));
    } catch (e) { /* ignorujemy */ }
  }, [x, vlan, addr, key]);

  function setField(fieldKey, value) {
    setAddr(prev => ({...prev, [fieldKey]: value}));
  }

  function reset() {
    setX('1');
    setVlan('10');
    setAddr({swMgmt: '', r1Lan: '', r1Wan: '', r2Wan: ''});
  }

  const xVal = x || 'X';

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  };
  const heading = {fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: '0 0 20px 0'};
  const xInputStyle = {
    width: '60px', padding: '6px 10px', borderRadius: '8px', border: '2px solid #2563eb',
    fontSize: '1rem', fontWeight: 700, textAlign: 'center', color: '#2563eb', background: '#eff6ff',
  };
  const vlanBox = {
    border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 16px',
    background: '#f9fafb', fontSize: '0.82rem', color: '#374151', minWidth: '160px',
  };
  const line = {flex: 1, minWidth: '30px', height: '2px', background: '#9ca3af', alignSelf: 'center'};

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Topologia pary — schemat interaktywny'}</h3>

      <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <label style={{fontSize: '0.95rem', color: '#374151'}}>Numer grupy (X):</label>
          <input
            type="text"
            value={x}
            onChange={e => setX(e.target.value.replace(/[^0-9]/g, ''))}
            style={xInputStyle}
          />
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <label style={{fontSize: '0.95rem', color: '#374151'}}>VLAN:</label>
          <input
            type="text"
            value={vlan}
            onChange={e => setVlan(e.target.value.replace(/[^0-9]/g, ''))}
            style={{...xInputStyle, borderColor: '#e5e7eb', color: '#111827', background: '#ffffff'}}
          />
        </div>
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
        <div style={{display: 'flex', alignItems: 'flex-start', minWidth: '950px', gap: '10px'}}>

          {/* VLAN info box */}
          <div style={vlanBox}>
            <div><strong>VLAN:</strong> {vlan || '?'}</div>
            <div style={{fontFamily: 'monospace', marginTop: '4px'}}>172.16.{xVal}.1–252</div>
          </div>

          {/* PC1 / PC2 */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '4px'}}>
            <DeviceIcon emoji="🖥️" label="PC1" />
            <DeviceIcon emoji="🖥️" label="PC2" />
          </div>

          <div style={{...line, marginTop: '46px'}} />

          {/* SW */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'}}>
            <DeviceIcon emoji="🔀" label="SW" sublabel="2960-24TT" />
            <AddrField
              label="adres zarządzania"
              value={addr.swMgmt}
              placeholder={`172.16.${xVal}.253`}
              onChange={v => setField('swMgmt', v)}
            />
          </div>

          <div style={{...line, marginTop: '46px'}} />

          {/* R1 */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'}}>
            <DeviceIcon emoji="🌐" label="R1" sublabel="ISR4331" />
            <AddrField
              label="interfejs LAN"
              value={addr.r1Lan}
              placeholder={`172.16.${xVal}.254`}
              onChange={v => setField('r1Lan', v)}
            />
            <AddrField
              label="interfejs do R2"
              value={addr.r1Wan}
              placeholder={`10.10.${xVal}.5`}
              onChange={v => setField('r1Wan', v)}
            />
          </div>

          <div style={{...line, marginTop: '46px'}} />

          {/* R2 */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'}}>
            <DeviceIcon emoji="🌐" label="R2" sublabel="ISR4331" />
            <AddrField
              label="interfejs do R1"
              value={addr.r2Wan}
              placeholder={`10.10.${xVal}.6`}
              onChange={v => setField('r2Wan', v)}
            />
          </div>

        </div>
      </div>

      <p style={{fontSize: '0.8rem', color: '#9ca3af', marginTop: '20px', marginBottom: 0}}>
        Wpisz numer grupy i VLAN — podpowiedzi w polach (szary tekst) automatycznie pokażą oczekiwany wzór adresu. Uzupełnij rzeczywiste adresy ze swojej konfiguracji — zapisują się automatycznie w tej przeglądarce.
      </p>
    </div>
  );
}
