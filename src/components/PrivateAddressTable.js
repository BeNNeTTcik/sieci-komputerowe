import React, {useState, useEffect, useRef} from 'react';
import {readSharedField, writeSharedField, subscribeSharedField, clearSharedField} from './sharedFieldStore';

// ---------- Logika walidacji IP/maski/bramy (czysty JS) ----------

function parseIp(str) {
  const parts = String(str ?? '').trim().split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(p => {
    if (!/^\d{1,3}$/.test(p)) return NaN;
    const n = parseInt(p, 10);
    return (n >= 0 && n <= 255) ? n : NaN;
  });
  if (octets.some(Number.isNaN)) return null;
  return octets;
}

function octetsToInt(octets) {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function intToOctets(int) {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255];
}

function octetsToBinary(octets) {
  return octets.map(o => o.toString(2).padStart(8, '0')).join('');
}

function isValidMask(maskOctets) {
  return /^1*0*$/.test(octetsToBinary(maskOctets));
}

function prefixLength(maskOctets) {
  return octetsToBinary(maskOctets).split('').filter(b => b === '1').length;
}

function isPrivate(ipOctets) {
  const [a, b] = ipOctets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function networkInt(ipOctets, maskOctets) {
  return (octetsToInt(ipOctets) & octetsToInt(maskOctets)) >>> 0;
}

function broadcastInt(ipOctets, maskOctets) {
  return (networkInt(ipOctets, maskOctets) | (~octetsToInt(maskOctets) >>> 0)) >>> 0;
}

function hostCount(prefix) {
  if (prefix >= 31) return 0;
  return Math.pow(2, 32 - prefix) - 2;
}

function fmt(octets) {
  return octets.join('.');
}

// ---------- Definicje dostępnych kolumn ----------

const COLUMN_DEFS = {
  device: {label: 'Urządzenie', width: '150px'},
  ip: {label: 'Adres IP', width: '150px', placeholder: 'np. 192.168.1.10'},
  mask: {label: 'Maska sieciowa', width: '150px', placeholder: 'np. 255.255.255.0'},
  gateway: {label: 'Brama domyślna', width: '150px', placeholder: 'np. 192.168.1.1'},
};

// ---------- Komponent ----------

export default function PrivateAddressTable({
  title,
  initialRows,
  storageKey,
  columns = ['device', 'ip', 'mask', 'gateway'],
  checkGroupOctet = true, // czy trzeci oktet ma się zgadzać z numerem grupy X
}) {
  const key = `private-addr-table:${storageKey || (title || 'domyslna').slice(0, 40)}`;
  const loadedRef = useRef(false);

  const [x, setX] = useState('1');

  function blankRow(r) {
    const row = {device: r?.device || 'Urządzenie'};
    columns.forEach(c => { if (c !== 'device') row[c] = ''; });
    return row;
  }

  const defaultRows = (initialRows && initialRows.length > 0)
    ? initialRows.map(r => blankRow(r))
    : [blankRow()];

  // Konfiguracja współdzielenia pól per wiersz — ten sam prop `shared`, co pole
  // `shared: 'klucz'` w TopologyBuilder, tylko tutaj jako obiekt (mapa kolumna
  // -> klucz), bo jeden wiersz ma kilka kolumn naraz, np.:
  // initialRows={[{device:'R1-X', shared: {ip: 'r1Lan', gateway: 'r1LanGw'}}]}
  // `sharedKeys` nadal działa jako przestarzały alias tej samej właściwości.
  const sharedKeysByRow = (initialRows || []).map(r => r.shared || r.sharedKeys || {});

  const [rows, setRows] = useState(defaultRows);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          setRows(saved); // kompatybilność ze starym formatem zapisu (bez X)
        } else {
          if (saved.rows) setRows(saved.rows);
          if (saved.x) setX(saved.x);
        }
      }
    } catch (e) { /* ignorujemy */ }

    // Nadpisz wartości tym, co jest we wspólnym magazynie (jeśli inny komponent
    // na innej stronie już to wcześniej ustawił).
    setRows(prev => prev.map((row, i) => {
      const map = sharedKeysByRow[i] || {};
      let updated = row;
      Object.entries(map).forEach(([col, sharedKey]) => {
        const v = readSharedField(sharedKey, null);
        if (v !== null) updated = {...updated, [col]: v};
      });
      return updated;
    }));

    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nasłuchuj zmian dokonanych w INNYM komponencie (np. w TopologyBuilder) dla
  // każdego pola, które ma tu przypisany współdzielony klucz.
  useEffect(() => {
    const unsubscribers = [];
    sharedKeysByRow.forEach((map, i) => {
      Object.entries(map).forEach(([col, sharedKey]) => {
        unsubscribers.push(subscribeSharedField(sharedKey, (newValue) => {
          setRows(prev => prev.map((row, idx) => (idx === i ? {...row, [col]: newValue} : row)));
        }));
      });
    });
    return () => unsubscribers.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify({rows, x}));
    } catch (e) { /* ignorujemy */ }
  }, [rows, x, key]);

  function setCell(i, field, value) {
    setRows(prev => prev.map((r, idx) => (idx === i ? {...r, [field]: value} : r)));
    setChecked(false);
    const sharedKey = (sharedKeysByRow[i] || {})[field];
    if (sharedKey) writeSharedField(sharedKey, value);
  }

  function resetAll() {
    setRows(defaultRows.map(r => ({...r})));
    setX('1');
    setChecked(false);
    // Wyczyść też pola we wspólnym magazynie należące do tej tabeli, żeby stare
    // wartości nie zostały widoczne np. w topologii w innym kroku/na innej stronie.
    sharedKeysByRow.forEach(map => {
      Object.values(map).forEach(sharedKey => clearSharedField(sharedKey));
    });
  }

  // Zwraca zbiór indeksów wierszy, których wartość w danej kolumnie powtarza się
  // w innym wierszu (porównanie bez rozróżniania wielkości liter, po przycięciu
  // białych znaków; puste wartości są ignorowane — brak wpisu to nie duplikat).
  function findDuplicateRowIndices(allRows, column) {
    const seen = {};
    const dup = new Set();
    allRows.forEach((r, i) => {
      const val = (r[column] || '').trim().toLowerCase();
      if (!val) return;
      if (Object.prototype.hasOwnProperty.call(seen, val)) {
        dup.add(seen[val]);
        dup.add(i);
      } else {
        seen[val] = i;
      }
    });
    return dup;
  }

  function evaluate(row, index) {
    const hasIp = columns.includes('ip');
    const hasMask = columns.includes('mask');
    const hasGateway = columns.includes('gateway');

    const ipOctets = hasIp ? parseIp(row.ip) : null;
    const maskOctets = hasMask ? parseIp(row.mask) : null;
    const gwOctets = hasGateway ? parseIp(row.gateway) : null;

    const result = {
      ipFormatOk: !hasIp || !!ipOctets,
      maskFormatOk: !hasMask || !!maskOctets,
      maskValid: false,
      isPrivate: !hasIp,
      ipGroupOctetOk: !hasIp || !checkGroupOctet,
      ipDuplicate: false,
      prefix: null,
      network: null,
      broadcast: null,
      hosts: null,
      gwFormatOk: !hasGateway || !!gwOctets,
      gwSameSubnet: !hasGateway,
      gwConventional: !hasGateway,
      gwGroupOctetOk: !hasGateway || !checkGroupOctet,
    };

    if (hasIp && ipOctets) {
      const dupIndices = findDuplicateRowIndices(rows, 'ip');
      result.ipDuplicate = dupIndices.has(index);
    }

    const xNum = parseInt(x, 10);
    const groupOctetValid = !Number.isNaN(xNum);

    if (ipOctets && checkGroupOctet) {
      result.ipGroupOctetOk = groupOctetValid && ipOctets[2] === xNum;
    }
    if (gwOctets && checkGroupOctet) {
      result.gwGroupOctetOk = groupOctetValid && gwOctets[2] === xNum;
    }

    if (maskOctets) {
      result.maskValid = isValidMask(maskOctets);
      if (result.maskValid) result.prefix = prefixLength(maskOctets);
    } else if (!hasMask) {
      result.maskValid = true;
    }

    if (ipOctets) result.isPrivate = isPrivate(ipOctets);

    if (ipOctets && maskOctets && result.maskValid) {
      const netInt = networkInt(ipOctets, maskOctets);
      const bcastInt = broadcastInt(ipOctets, maskOctets);
      result.network = fmt(intToOctets(netInt));
      result.broadcast = fmt(intToOctets(bcastInt));
      result.hosts = hostCount(result.prefix);

      if (hasGateway && gwOctets) {
        const gwInt = octetsToInt(gwOctets);
        result.gwSameSubnet = ((gwInt & octetsToInt(maskOctets)) >>> 0) === netInt;
        const firstUsable = (netInt + 1) >>> 0;
        const lastUsable = (bcastInt - 1) >>> 0;
        result.gwConventional = result.gwSameSubnet && (gwInt === firstUsable || gwInt === lastUsable);
      }
    }

    result.allOk = result.ipFormatOk && result.maskFormatOk && result.maskValid
      && result.isPrivate && result.ipGroupOctetOk && !result.ipDuplicate
      && result.gwFormatOk && result.gwSameSubnet && result.gwConventional && result.gwGroupOctetOk;
    return result;
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0', overflowX: 'auto',
  };
  const heading = {fontSize: '1.2rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0'};
  const subheading = {fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px 0'};

  const table = {borderCollapse: 'collapse', width: '100%', minWidth: `${columns.length * 150}px`};
  const th = {textAlign: 'left', padding: '8px 10px', fontSize: '0.8rem', color: '#6b7280', borderBottom: '2px solid #e5e7eb', fontWeight: 600};
  const td = {padding: '6px 8px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top'};

  function inputStyle(status, width) {
    const base = {width: width || '150px', padding: '7px 9px', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace', boxSizing: 'border-box'};
    if (status === true) return {...base, border: '1px solid #16a34a', background: '#f0fdf4'};
    if (status === false) return {...base, border: '1px solid #dc2626', background: '#fef2f2'};
    return {...base, border: '1px solid #e5e7eb', background: '#ffffff'};
  }

  const smallBtn = {padding: '5px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#ffffff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer'};
  const darkBtn = {padding: '9px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', background: '#111827', color: '#ffffff'};
  const xInputStyle = {
    width: '52px', padding: '5px 8px', borderRadius: '8px', border: '2px solid #2563eb',
    fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', color: '#2563eb', background: '#eff6ff',
  };

  return (
    <div style={card}>
      <h4 style={heading}>{title || 'Dobierz własną adresację prywatną'}</h4>
      <p style={subheading}>
        Wpisz dla każdego urządzenia adres IP z dowolnej puli prywatnej, odpowiadającą mu maskę
        {columns.includes('gateway') ? ' oraz bramę domyślną (standardowo pierwszy lub ostatni adres hosta w podsieci — np. „.1” lub „.254”).' : '.'}
        {checkGroupOctet ? ' Trzeci oktet adresu musi odpowiadać numerowi Twojej grupy.' : ''}
      </p>

      {checkGroupOctet && (
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px'}}>
          <label style={{fontSize: '0.85rem', color: '#374151'}}>Numer grupy (X):</label>
          <input type="text" value={x} onChange={e => { setX(e.target.value.replace(/[^0-9]/g, '')); setChecked(false); }} style={xInputStyle} />
        </div>
      )}

      <table style={table}>
        <thead>
          <tr>
            {columns.map(c => <th key={c} style={th}>{COLUMN_DEFS[c].label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const ev = checked ? evaluate(row, i) : null;
            return (
              <tr key={i}>
                {columns.map(c => {
                  if (c === 'device') {
                    return <td key={c} style={{...td, fontWeight: 600, color: '#374151'}}>{row.device}</td>;
                  }
                  let status = null;
                  if (ev) {
                    if (c === 'ip') status = ev.ipFormatOk && ev.isPrivate && ev.ipGroupOctetOk && !ev.ipDuplicate;
                    if (c === 'mask') status = ev.maskFormatOk && ev.maskValid;
                    if (c === 'gateway') status = ev.gwFormatOk && ev.gwSameSubnet && ev.gwConventional && ev.gwGroupOctetOk;
                  }
                  return (
                    <td key={c} style={td}>
                      <input
                        type="text" value={row[c] || ''} placeholder={COLUMN_DEFS[c].placeholder}
                        onChange={e => setCell(i, c, e.target.value)}
                        style={inputStyle(status, COLUMN_DEFS[c].width)}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{display: 'flex', gap: '10px', marginTop: '14px'}}>
        <button style={darkBtn} onClick={() => setChecked(true)}>Sprawdź</button>
        <button style={smallBtn} onClick={resetAll}>Restart</button>
      </div>

      {checked && (
        <div style={{marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {rows.map((row, i) => {
            const ev = evaluate(row, i);
            return (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem',
                border: `1px solid ${ev.allOk ? '#bbf7d0' : '#fecaca'}`,
                background: ev.allOk ? '#f0fdf4' : '#fef2f2',
              }}>
                <div style={{fontWeight: 600, marginBottom: '4px'}}>
                  {ev.allOk ? '✅' : '❌'} {row.device}
                </div>
                {!ev.ipFormatOk && <div style={{color: '#dc2626'}}>Adres IP ma niepoprawny format.</div>}
                {ev.ipFormatOk && !ev.isPrivate && <div style={{color: '#dc2626'}}>Adres nie należy do żadnej puli prywatnej (RFC 1918).</div>}
                {ev.ipFormatOk && ev.isPrivate && !ev.ipGroupOctetOk && <div style={{color: '#dc2626'}}>Trzeci oktet adresu IP powinien być równy numerowi grupy (X = {x || '?'}).</div>}
                {ev.ipFormatOk && ev.isPrivate && ev.ipDuplicate && <div style={{color: '#dc2626'}}>Ten adres IP powtarza się w innym wierszu tabeli — każde urządzenie musi mieć unikalny adres.</div>}
                {!ev.maskFormatOk && <div style={{color: '#dc2626'}}>Maska ma niepoprawny format.</div>}
                {ev.maskFormatOk && columns.includes('mask') && !ev.maskValid && <div style={{color: '#dc2626'}}>To nie jest poprawna maska sieciowa (musi być ciąg jedynek, a potem same zera).</div>}
                {columns.includes('gateway') && !ev.gwFormatOk && <div style={{color: '#dc2626'}}>Brama domyślna ma niepoprawny format.</div>}
                {columns.includes('gateway') && ev.gwFormatOk && ev.network && !ev.gwSameSubnet && <div style={{color: '#dc2626'}}>Brama nie leży w tej samej podsieci co adres hosta.</div>}
                {columns.includes('gateway') && ev.gwSameSubnet && ev.network && !ev.gwConventional && <div style={{color: '#dc2626'}}>Brama leży w tej podsieci, ale to niekonwencjonalny wybór — standardowo używa się pierwszego (.1) albo ostatniego (.254 dla /24) adresu hosta.</div>}
                {columns.includes('gateway') && ev.gwFormatOk && ev.gwSameSubnet && !ev.gwGroupOctetOk && <div style={{color: '#dc2626'}}>Trzeci oktet bramy powinien być równy numerowi grupy (X = {x || '?'}).</div>}
                {ev.allOk && ev.network && (
                  <div style={{color: '#374151', fontFamily: 'monospace', marginTop: '4px'}}>
                    prefiks /{ev.prefix} · sieć {ev.network} · rozgłoszeniowy {ev.broadcast} · hosty: {ev.hosts}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
