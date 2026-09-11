import React, {useState, useEffect, useRef} from 'react';
import {readSharedField, writeSharedField, subscribeSharedField, clearSharedField} from './sharedFieldStore';

// --- Komponenty pomocnicze — ZAWSZE na najwyższym poziomie pliku ---
// (definiowanie ich wewnątrz funkcji głównego komponentu powoduje utratę
// fokusu w polach tekstowych po każdym wpisanym znaku).

// Filtruje wpisywany tekst dla pól typu "address" — dopuszcza wyłącznie cyfry i kropki,
// więc litera jest odrzucana natychmiast przy wpisywaniu (nie trzeba czekać na "Sprawdź").
function filterAddressInput(value) {
  return value.replace(/[^0-9.]/g, '');
}

// Sprawdza, czy wpisany adres ma poprawny format (4 oktety 0-255) — używane tylko
// do kolorowania pola, nie blokuje wpisywania w trakcie pisania.
function isValidAddressFormat(value) {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

// Sprawdza, czy trzeci oktet adresu zgadza się z numerem grupy X.
function thirdOctetMatchesX(value, xVal) {
  const parts = value.split('.');
  const xNum = parseInt(xVal, 10);
  if (parts.length < 3 || Number.isNaN(xNum)) return false;
  return parseInt(parts[2], 10) === xNum;
}

// Filtruje wpisywany tekst dla pól typu "vlan" — dopuszcza wyłącznie cyfry.
function filterVlanInput(value) {
  return value.replace(/[^0-9]/g, '');
}

// Sprawdza, czy numer VLAN jest poprawny: pełny zakres 802.1Q to 1-4094,
// ale VLAN 1 jest wyłączony z użycia w tym ćwiczeniu (zarezerwowany jako
// VLAN natywny / domyślny na porcie trunk).
function isValidVlan(value) {
  if (!/^\d+$/.test(value)) return false;
  const n = parseInt(value, 10);
  return n >= 2 && n <= 4094;
}

function MiniField({label, value, placeholder, onChange, width, type = 'port', xVal, checkGroupOctet = true, isDuplicate = false}) {
  const isAddress = type === 'address';
  const isVlan = type === 'vlan';

  function handleChange(raw) {
    if (isAddress) onChange(filterAddressInput(raw));
    else if (isVlan) onChange(filterVlanInput(raw));
    else onChange(raw);
  }

  let status = null; // null = nieocenione (puste), true = ok, false = błąd
  if (value.trim() !== '') {
    if (isAddress) {
      const formatOk = isValidAddressFormat(value);
      const octetOk = !checkGroupOctet || thirdOctetMatchesX(value, xVal);
      status = formatOk && octetOk && !isDuplicate;
    } else if (isVlan) {
      status = isValidVlan(value);
    } else {
      status = true; // pola portu nie są walidowane — samo wypełnienie wystarczy
    }
  }

  const borderColor = status === false ? '#dc2626' : status === true ? '#16a34a' : '#e5e7eb';
  const bgColor = status === false ? '#fef2f2' : status === true ? '#f0fdf4' : '#ffffff';

  // Domyślna szerokość zależna od typu pola (nadpisywalna przez `width`):
  // adres IP potrzebuje więcej miejsca niż numer VLAN czy krótki port.
  const defaultWidth = isAddress ? '132px' : isVlan ? '64px' : '92px';
  const effectiveWidth = width || defaultWidth;

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
      <div style={{fontSize: '0.66rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.2}}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: effectiveWidth, padding: '5px 6px', borderRadius: '6px', fontSize: '0.75rem',
          textAlign: 'center', fontFamily: 'monospace', boxSizing: 'border-box',
          border: `1px solid ${borderColor}`, background: bgColor,
        }}
      />
      {isAddress && value.trim() !== '' && status === false && (
        <div style={{fontSize: '0.6rem', color: '#dc2626', textAlign: 'center', maxWidth: effectiveWidth, lineHeight: 1.2}}>
          {!isValidAddressFormat(value)
            ? 'zły format'
            : (checkGroupOctet && !thirdOctetMatchesX(value, xVal))
              ? `3. oktet ≠ X (${xVal || '?'})`
              : 'duplikat adresu'}
        </div>
      )}
      {isVlan && value.trim() !== '' && status === false && (
        <div style={{fontSize: '0.6rem', color: '#dc2626', textAlign: 'center', maxWidth: effectiveWidth, lineHeight: 1.2}}>
          {value === '1' ? 'VLAN 1 jest natywny' : 'zakres 2–4094'}
        </div>
      )}
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
        {key: 'swPort', label: 'port do R1', placeholder: () => 'Fa0/24', width: '78px', type: 'port'},
        {key: 'swMgmt', label: 'adr. zarządz.', placeholder: (x) => `172.16.${x}.253`, type: 'address'},
      ],
    },
    {
      node: {icon: '🌐', label: 'R1', sublabel: 'ISR4331'},
      fields: [
        {key: 'r1LanPort', label: 'port LAN', placeholder: () => 'Gi0/0', width: '78px', type: 'port'},
        {key: 'r1Lan', label: 'adr. LAN', placeholder: (x) => `172.16.${x}.254`, type: 'address'},
        {key: 'r1WanPort', label: 'port do R2', placeholder: () => 'Gi0/1', width: '78px', type: 'port'},
        {key: 'r1Wan', label: 'adr. do R2', placeholder: (x) => `10.10.${x}.5`, type: 'address'},
      ],
    },
    {
      node: {icon: '🌐', label: 'R2', sublabel: 'ISR4331'},
      fields: [
        {key: 'r2WanPort', label: 'port do R1', placeholder: () => 'Gi0/0', width: '78px', type: 'port'},
        {key: 'r2Wan', label: 'adr. do R1', placeholder: (x) => `10.10.${x}.6`, type: 'address'},
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

// Mapa: klucz pola w tej topologii -> współdzielony klucz (jeśli pole ma `shared`).
function collectSharedMap(topology) {
  const map = {};
  topology.groups.forEach(g => {
    (g.fields || []).forEach(f => { if (f.shared) map[f.key] = f.shared; });
  });
  return map;
}

// Klucze wszystkich pól typu "address" w tej topologii — potrzebne do wykrycia,
// czy dwa różne urządzenia dostały przypadkiem ten sam adres IP.
function collectAddressFieldKeys(topology) {
  const keys = [];
  topology.groups.forEach(g => {
    (g.fields || []).forEach(f => { if (f.type === 'address') keys.push(f.key); });
  });
  return keys;
}

// Zwraca zbiór kluczy pól, których wartość powtarza się w innym polu adresu
// w tej samej topologii (porównanie bez rozróżniania wielkości liter, puste
// wartości ignorowane).
function findDuplicateAddressKeys(addressFieldKeys, values) {
  const seen = {};
  const dup = new Set();
  addressFieldKeys.forEach(k => {
    const val = (values[k] || '').trim().toLowerCase();
    if (!val) return;
    if (Object.prototype.hasOwnProperty.call(seen, val)) {
      dup.add(seen[val]);
      dup.add(k);
    } else {
      seen[val] = k;
    }
  });
  return dup;
}

export default function TopologyBuilder({title, storageKey, topology = defaultTopology, checkGroupOctet = true}) {
  const key = `topology-builder:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);
  const fieldKeys = collectFieldKeys(topology);
  const sharedMap = collectSharedMap(topology); // {fieldKey: sharedKey}
  const addressFieldKeys = collectAddressFieldKeys(topology);

  const [x, setX] = useState('1');
  const [vlan, setVlan] = useState(topology.vlan?.defaultVlan || '');
  const [values, setValues] = useState(() => Object.fromEntries(fieldKeys.map(k => [k, ''])));

  // Kolejność ma tu znaczenie: najpierw wczytujemy WŁASNY zapis komponentu,
  // a DOPIERO POTEM nadpisujemy wartościami ze wspólnego magazynu — dzięki temu
  // pole współdzielone zawsze wygrywa, nawet jeśli własny zapis zawiera starszą,
  // pustą wartość sprzed podłączenia synchronizacji.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.x) setX(saved.x);
        if (saved.vlan) setVlan(saved.vlan);
        if (saved.values) setValues(prev => ({...prev, ...saved.values}));
      }
    } catch (e) { /* ignorujemy */ }

    const fromShared = {};
    Object.entries(sharedMap).forEach(([fieldKey, sharedKey]) => {
      const v = readSharedField(sharedKey, null);
      if (v !== null) fromShared[fieldKey] = v;
    });
    if (Object.keys(fromShared).length > 0) {
      setValues(prev => ({...prev, ...fromShared}));
    }

    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nasłuchuj zmian dokonanych w INNYM komponencie (np. w tabeli adresacji) dla
  // każdego pola, które ma tu przypisany współdzielony klucz.
  useEffect(() => {
    const unsubscribers = Object.entries(sharedMap).map(([fieldKey, sharedKey]) =>
      subscribeSharedField(sharedKey, (newValue) => {
        setValues(prev => ({...prev, [fieldKey]: newValue}));
      })
    );
    return () => unsubscribers.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify({x, vlan, values}));
    } catch (e) { /* ignorujemy */ }
  }, [x, vlan, values, key]);

  function setFieldValue(fieldKey, val) {
    setValues(prev => ({...prev, [fieldKey]: val}));
    if (sharedMap[fieldKey]) {
      writeSharedField(sharedMap[fieldKey], val);
    }
  }

  function reset() {
    setX('1');
    setVlan(topology.vlan?.defaultVlan || '');
    setValues(Object.fromEntries(fieldKeys.map(k => [k, ''])));
    // Wyczyść też pola we wspólnym magazynie — tylko te, które NALEŻĄ do tej
    // topologii (mają `shared`), żeby reset tutaj nie zostawiał starych wartości
    // widocznych np. w tabeli adresacji w innym kroku/na innej stronie.
    Object.values(sharedMap).forEach(sharedKey => clearSharedField(sharedKey));
  }

  const xVal = x || 'X';
  const duplicateAddressKeys = findDuplicateAddressKeys(addressFieldKeys, values);

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
                  <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', maxWidth: '230px'}}>
                    {(group.fields || []).map(f => (
                      <MiniField
                        key={f.key}
                        label={f.label}
                        value={values[f.key] || ''}
                        placeholder={f.placeholder(xVal)}
                        onChange={v => setFieldValue(f.key, v)}
                        width={f.width}
                        type={f.type}
                        xVal={xVal}
                        checkGroupOctet={checkGroupOctet}
                        isDuplicate={duplicateAddressKeys.has(f.key)}
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
          { key: 'port1', label: 'port', placeholder: () => 'Fa0/1', width: '78px', type: 'port' },
        ],
      },
      {
        node: { icon: '🌐', label: 'R1-X' },
        fields: [
          { key: 'p1', label: 'port', placeholder: () => 'Gi0/0', width: '78px', type: 'port' },
          { key: 'a1', label: 'adres', placeholder: (x) => `10.${x}.0.1`, type: 'address' },
        ],
      },
    ],
  }}
/>

Każde pole w `fields` ma teraz jawny `type`:
- `type: 'port'`  — wolny tekst (np. "Gi0/0"), BEZ żadnej walidacji poza samym wypełnieniem.
  Litery są tu jak najbardziej dozwolone.
- `type: 'address'` — pole adresu IP:
    * litery są odrzucane NATYCHMIAST podczas wpisywania (dopuszczone tylko cyfry i kropki),
    * po wpisaniu pełnego adresu pole koloruje się na czerwono/zielono w zależności od tego,
      czy format jest poprawny ORAZ (jeśli `checkGroupOctet` nie jest wyłączone) czy trzeci
      oktet zgadza się z numerem grupy (X) wpisanym w polu na górze komponentu,
    * pod polem pojawia się krótki komunikat błędu ("zły format" albo "3. oktet ≠ X").
- `type: 'vlan'` — pole numeru VLAN:
    * dopuszczone tylko cyfry (litery i kropki odrzucane natychmiast),
    * poprawny zakres to 2–4094 (pełny zakres 802.1Q, bez VLAN 1),
    * **VLAN 1 jest celowo odrzucany** — zarezerwowany jako VLAN natywny/domyślny,
      nie do wykorzystania jako "własny" VLAN w ćwiczeniu,
    * pod polem pojawia się komunikat "VLAN 1 jest natywny" albo "zakres 2–4094".

Jeśli pominiesz `type`, pole domyślnie zachowuje się jak `'port'` (bez walidacji) — żeby
nie zepsuć topologii pisanych przed tą zmianą.

Aby WYŁĄCZYĆ sprawdzanie trzeciego oktetu (X) dla całego komponentu naraz — tak samo jak
w PrivateAddressTable:

<TopologyBuilder checkGroupOctet={false} topology={{...}} />
*/
