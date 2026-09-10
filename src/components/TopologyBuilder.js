import React, {useState, useEffect, useRef} from 'react';

// --- Komponenty pomocnicze — ZAWSZE na najwyższym poziomie pliku ---
// (definiowanie ich wewnątrz funkcji głównego komponentu powoduje utratę
// fokusu w polach tekstowych po każdym wpisanym znaku).

function MiniField({label, value, placeholder, onChange, width}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
      <div style={{fontSize: '0.66rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.2}}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: width || '92px', padding: '5px 6px', borderRadius: '6px', fontSize: '0.75rem',
          textAlign: 'center', fontFamily: 'monospace',
          border: value.trim() ? '1px solid #16a34a' : '1px solid #e5e7eb',
          background: value.trim() ? '#f0fdf4' : '#ffffff',
        }}
      />
    </div>
  );
}

function DeviceIcon({icon, label, sublabel}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px'}}>
      <div style={{fontSize: '1.6rem', lineHeight: 1}}>{icon}</div>
      <div style={{fontSize: '0.78rem', fontWeight: 600, color: '#111827'}}>{label}</div>
      {sublabel && <div style={{fontSize: '0.66rem', color: '#9ca3af'}}>{sublabel}</div>}
    </div>
  );
}

const connectorLine = {flex: '1 1 12px', minWidth: '12px', height: '2px', background: '#9ca3af', alignSelf: 'center', marginTop: '34px'};

// --- Domyślna topologia: PC1/PC2 -> SW -> R1 -> R2, z polami PORT + ADRES ---

export const defaultTopology = {
  vlan: {
    show: true,
    labelPrefix: 'VLAN',
    defaultVlan: '10',
    addressPattern: (x) => `172.16.${x}.1–252`,
  },
  groups: [
    {
      stacked: [
        {icon: '🖥️', label: 'PC1'},
        {icon: '🖥️', label: 'PC2'},
      ],
    },
    {
      node: {icon: '🔀', label: 'SW', sublabel: '2960-24TT'},
      fields: [
        {key: 'swPort', label: 'port do R1', placeholder: () => 'Fa0/24', width: '78px'},
        {key: 'swMgmt', label: 'adr. zarządz.', placeholder: (x) => `172.16.${x}.253`},
      ],
    },
    {
      node: {icon: '🌐', label: 'R1', sublabel: 'ISR4331'},
      fields: [
        {key: 'r1LanPort', label: 'port LAN', placeholder: () => 'Gi0/0', width: '78px'},
        {key: 'r1Lan', label: 'adr. LAN', placeholder: (x) => `172.16.${x}.254`},
        {key: 'r1WanPort', label: 'port do R2', placeholder: () => 'Gi0/1', width: '78px'},
        {key: 'r1Wan', label: 'adr. do R2', placeholder: (x) => `10.10.${x}.5`},
      ],
    },
    {
      node: {icon: '🌐', label: 'R2', sublabel: 'ISR4331'},
      fields: [
        {key: 'r2WanPort', label: 'port do R1', placeholder: () => 'Gi0/0', width: '78px'},
        {key: 'r2Wan', label: 'adr. do R1', placeholder: (x) => `10.10.${x}.6`},
      ],
    },
  ],
};

function collectFieldKeys(topology) {
  const keys = [];
  topology.groups.forEach(g => {
    (g.fields || []).forEach(f => { if (!keys.includes(f.key)) keys.push(f.key); });
  });
  return keys;
}

export default function TopologyBuilder({title, storageKey, topology = defaultTopology}) {
  const key = `topology-builder:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);
  const fieldKeys = collectFieldKeys(topology);

  const [x, setX] = useState('1');
  const [vlan, setVlan] = useState(topology.vlan?.defaultVlan || '');
  const [values, setValues] = useState(() => Object.fromEntries(fieldKeys.map(k => [k, ''])));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.x) setX(saved.x);
        if (saved.vlan) setVlan(saved.vlan);
        if (saved.values) setValues(prev => ({...prev, ...saved.values}));
      }
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({x, vlan, values}));
    } catch (e) { /* ignorujemy */ }
  }, [x, vlan, values, key]);

  function setFieldValue(fieldKey, val) {
    setValues(prev => ({...prev, [fieldKey]: val}));
  }

  function reset() {
    setX('1');
    setVlan(topology.vlan?.defaultVlan || '');
    setValues(Object.fromEntries(fieldKeys.map(k => [k, ''])));
  }

  const xVal = x || 'X';

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
  };
  const heading = {fontSize: '1.3rem', fontWeight: 600, color: '#111827', margin: '0 0 16px 0'};
  const xInputStyle = {
    width: '52px', padding: '5px 8px', borderRadius: '8px', border: '2px solid #2563eb',
    fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', color: '#2563eb', background: '#eff6ff',
  };
  const vlanInputStyle = {...xInputStyle, borderColor: '#e5e7eb', color: '#111827', background: '#ffffff'};
  const vlanBox = {
    border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 10px',
    background: '#f9fafb', fontSize: '0.72rem', color: '#374151', textAlign: 'center', marginTop: '8px',
  };

  return (
    <div style={card}>
      <h3 style={heading}>{title || 'Topologia — schemat interaktywny'}</h3>

      <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', flexWrap: 'wrap'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <label style={{fontSize: '0.85rem', color: '#374151'}}>Numer grupy (X):</label>
          <input type="text" value={x} onChange={e => setX(e.target.value.replace(/[^0-9]/g, ''))} style={xInputStyle} />
        </div>
        {topology.vlan?.show && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <label style={{fontSize: '0.85rem', color: '#374151'}}>{topology.vlan.labelPrefix || 'VLAN'}:</label>
            <input type="text" value={vlan} onChange={e => setVlan(e.target.value.replace(/[^0-9]/g, ''))} style={vlanInputStyle} />
          </div>
        )}
        <button
          onClick={reset}
          style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
            background: '#ffffff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          Resetuj
        </button>
      </div>

      <div style={{display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', rowGap: '20px'}}>

        {topology.groups.map((group, i) => (
          <React.Fragment key={i}>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>

              {group.stacked ? (
                <>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                    {group.stacked.map((dev, j) => (
                      <DeviceIcon key={j} icon={dev.icon} label={dev.label} sublabel={dev.sublabel} />
                    ))}
                  </div>
                  {topology.vlan?.show && i === 0 && (
                    <div style={vlanBox}>
                      <div><strong>{topology.vlan.labelPrefix || 'VLAN'}:</strong> {vlan || '?'}</div>
                      <div style={{fontFamily: 'monospace', marginTop: '3px'}}>
                        {topology.vlan.addressPattern(xVal)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <DeviceIcon icon={group.node.icon} label={group.node.label} sublabel={group.node.sublabel} />
                  <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', maxWidth: '190px'}}>
                    {(group.fields || []).map(f => (
                      <MiniField
                        key={f.key}
                        label={f.label}
                        value={values[f.key] || ''}
                        placeholder={f.placeholder(xVal)}
                        onChange={v => setFieldValue(f.key, v)}
                        width={f.width}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {i < topology.groups.length - 1 && <div style={connectorLine} />}
          </React.Fragment>
        ))}

      </div>

      <p style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '18px', marginBottom: 0}}>
        Wpisz numer grupy{topology.vlan?.show ? ' i VLAN' : ''} — podpowiedzi w polach (szary tekst) pokażą oczekiwany wzór. Uzupełnij port/interfejs i adres IP ze swojej konfiguracji — zapisują się automatycznie w tej przeglądarce.
      </p>
    </div>
  );
}

/*
=== JAK ZBUDOWAĆ WŁASNĄ TOPOLOGIĘ ===

<TopologyBuilder
  title="Moja topologia"
  storageKey="cwiczenie-x"
  topology={{
    vlan: { show: false },
    groups: [
      { node: { icon: '🖥️', label: 'PC-A' } },
      {
        node: { icon: '🔀', label: 'SW-X' },
        fields: [
          { key: 'port1', label: 'port', placeholder: () => 'Fa0/1', width: '78px' },
        ],
      },
      {
        node: { icon: '🌐', label: 'R1-X' },
        fields: [
          { key: 'p1', label: 'port', placeholder: () => 'Gi0/0', width: '78px' },
          { key: 'a1', label: 'adres', placeholder: (x) => `10.${x}.0.1` },
        ],
      },
    ],
  }}
/>

Każde pole w `fields` to teraz osobno PORT (krótkie, `width: '78px'`) albo ADRES (szersze,
domyślne 92px) — oba typy renderują się obok siebie w małej siatce pod danym urządzeniem,
więc dodanie portu obok adresu nie psuje układu w pionie.
*/
