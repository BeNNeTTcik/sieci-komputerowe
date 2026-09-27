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

// --- Tryb CIDR (adres + prefiks, np. "10.1.1.1/30") ---

// Filtruje wpisywany tekst dla pól typu "cidr" — dopuszcza cyfry, kropki i "/".
function filterCidrInput(value) {
  return value.replace(/[^0-9./]/g, '');
}

// Rozbija "10.1.1.1/30" na oktety adresu i liczbę prefiksu. Zwraca null,
// jeśli format jest niepoprawny na którymkolwiek etapie (brak "/", zły adres,
// prefiks spoza zakresu 0-32, prefiks niebędący samą liczbą).
function parseCidr(value) {
  const slashParts = value.split('/');
  if (slashParts.length !== 2) return null;
  const [ipPart, prefixPart] = slashParts;
  if (!isValidAddressFormat(ipPart)) return null;
  if (!/^\d{1,2}$/.test(prefixPart)) return null;
  const prefix = parseInt(prefixPart, 10);
  if (prefix < 0 || prefix > 32) return null;
  return {ipPart, prefix};
}

// Sprawdza, czy prefiks pasuje do oczekiwanej wartości — `expected` może być
// pojedynczą liczbą (np. 30) albo tablicą dozwolonych wartości (np. [24, 25]).
function prefixMatchesExpected(prefix, expected) {
  if (expected === undefined || expected === null) return true; // brak wymogu = każdy poprawny prefiks OK
  if (Array.isArray(expected)) return expected.includes(prefix);
  return prefix === expected;
}

// Zamienia długość prefiksu (np. 24) na oktety maski (255.255.255.0).
function prefixToMaskOctets(prefix) {
  const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  return [(maskInt >>> 24) & 255, (maskInt >>> 16) & 255, (maskInt >>> 8) & 255, maskInt & 255];
}

// Wylicza z adresu+prefiksu gotowy zapis "adres sieci + maska wildcard" —
// dokładnie w formacie, jakiego wymagają listy ACL na Cisco IOS (odwrócona
// maska: bity zerowe tam, gdzie maska podsieci ma jedynki, i na odwrót).
function computeAclNotation(ipPart, prefix) {
  const ipOctets = ipPart.split('.').map(Number);
  const maskOctets = prefixToMaskOctets(prefix);
  const networkOctets = ipOctets.map((o, i) => o & maskOctets[i]);
  const wildcardOctets = maskOctets.map(m => 255 - m);
  return {network: networkOctets.join('.'), wildcard: wildcardOctets.join('.')};
}

// Klasa adresu (A/B/C/D/E) na podstawie WYŁĄCZNIE pierwszego oktetu — tak samo
// jak w `EditableTable.js` (świadomie skopiowana funkcja, patrz komentarz przy
// `deriveCidrValues` niżej). Dla klas A/B/C zwraca też jej klasowy prefiks
// (/8, /16, /24) — granicę, do której IOS milcząco zaokrągla `network` w RIP,
// niezależnie od maski faktycznie wpisanej przez studenta. Klasy D i E nie
// mają sensownego klasowego prefiksu — `netclassPrefix` jest wtedy `null`.
function classifyNetwork(firstOctet) {
  if (firstOctet >= 0 && firstOctet <= 127) return {netclass: 'A', netclassPrefix: 8};
  if (firstOctet >= 128 && firstOctet <= 191) return {netclass: 'B', netclassPrefix: 16};
  if (firstOctet >= 192 && firstOctet <= 223) return {netclass: 'C', netclassPrefix: 24};
  if (firstOctet >= 224 && firstOctet <= 239) return {netclass: 'D', netclassPrefix: null};
  return {netclass: 'E', netclassPrefix: null};
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

function MiniField({label, value, placeholder, onChange, width, type = 'port', xVal, checkGroupOctet = true, isDuplicate = false, expectedPrefix, showAclHelper = false}) {
  const isAddress = type === 'address';
  const isVlan = type === 'vlan';
  const isCidr = type === 'cidr';

  function handleChange(raw) {
    if (isAddress) onChange(filterAddressInput(raw));
    else if (isCidr) onChange(filterCidrInput(raw));
    else if (isVlan) onChange(filterVlanInput(raw));
    else onChange(raw);
  }

  let status = null; // null = nieocenione (puste), true = ok, false = błąd
  if (value.trim() !== '') {
    if (isAddress) {
      const formatOk = isValidAddressFormat(value);
      const octetOk = !checkGroupOctet || thirdOctetMatchesX(value, xVal);
      status = formatOk && octetOk && !isDuplicate;
    } else if (isCidr) {
      const parsed = parseCidr(value);
      const octetOk = parsed && (!checkGroupOctet || thirdOctetMatchesX(parsed.ipPart, xVal));
      const prefixOk = parsed && prefixMatchesExpected(parsed.prefix, expectedPrefix);
      status = !!parsed && octetOk && prefixOk && !isDuplicate;
    } else if (isVlan) {
      status = isValidVlan(value);
    } else {
      status = true; // pola portu nie są walidowane — samo wypełnienie wystarczy
    }
  }

  const borderColor = status === false ? '#dc2626' : status === true ? '#16a34a' : '#e5e7eb';
  const bgColor = status === false ? '#fef2f2' : status === true ? '#f0fdf4' : '#ffffff';

  // Domyślna szerokość zależna od typu pola (nadpisywalna przez `width`):
  // adres IP potrzebuje więcej miejsca niż numer VLAN czy krótki port;
  // CIDR (adres + prefiks) potrzebuje jeszcze trochę więcej niż sam adres.
  const defaultWidth = isCidr ? '150px' : isAddress ? '132px' : isVlan ? '64px' : '92px';
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
      {isCidr && value.trim() !== '' && status === false && (
        <div style={{fontSize: '0.6rem', color: '#dc2626', textAlign: 'center', maxWidth: effectiveWidth, lineHeight: 1.2}}>
          {(() => {
            const parsed = parseCidr(value);
            if (!parsed) return 'format: IP/prefiks';
            if (checkGroupOctet && !thirdOctetMatchesX(parsed.ipPart, xVal)) return `3. oktet ≠ X (${xVal || '?'})`;
            if (!prefixMatchesExpected(parsed.prefix, expectedPrefix)) {
              const exp = Array.isArray(expectedPrefix) ? expectedPrefix.map(p => '/' + p).join(' lub ') : `/${expectedPrefix}`;
              return `wymagany prefiks ${exp}`;
            }
            return 'duplikat adresu';
          })()}
        </div>
      )}
      {isCidr && showAclHelper && status === true && (() => {
        const parsed = parseCidr(value);
        const acl = computeAclNotation(parsed.ipPart, parsed.prefix);
        return (
          <div style={{fontSize: '0.6rem', color: '#2563eb', textAlign: 'center', maxWidth: effectiveWidth, lineHeight: 1.3, fontFamily: 'monospace'}}>
            ACL: {acl.network} {acl.wildcard}
          </div>
        );
      })()}
      {isVlan && value.trim() !== '' && status === false && (
        <div style={{fontSize: '0.6rem', color: '#dc2626', textAlign: 'center', maxWidth: effectiveWidth, lineHeight: 1.2}}>
          {value === '1' ? 'VLAN 1 jest natywny' : 'zakres 2–4094'}
        </div>
      )}
    </div>
  );
}

// WAŻNE dla wyrównania linii łączących (`connectorLine` niżej): ta ikona
// zawsze zajmuje tę samą wysokość (`iconRowHeight`), niezależnie od tego, czy
// ma `sublabel`, czy węzeł ma 1 pole, czy 3. Dzięki temu pozioma linia
// łącząca sąsiednie węzły — pozycjonowana stałym `marginTop` względem góry
// całego wiersza grup — zawsze trafia dokładnie w środek ikony, a nie w
// przypadkowe miejsce zależne od liczby pól konfiguracyjnych pod spodem
// (który to błąd wcześniej powodował "unoszące się" w powietrzu, krzywo
// wyrównane odcinki na schematach z węzłami o różnej liczbie pól).
const iconRowHeight = 58; // mieści ikonę + label + opcjonalny sublabel (np. "ISR4331") bez obcinania

function DeviceIcon({icon, label, sublabel}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1px', minHeight: `${iconRowHeight}px`,
    }}>
      <div style={{fontSize: '1.6rem', lineHeight: 1}}>{icon}</div>
      <div style={{fontSize: '0.78rem', fontWeight: 600, color: '#111827', textAlign: 'center'}}>{label}</div>
      {sublabel && <div style={{fontSize: '0.66rem', color: '#9ca3af'}}>{sublabel}</div>}
    </div>
  );
}

// `marginTop` = połowa `iconRowHeight` minus połowa grubości linii (2px) —
// tak, żeby linia trafiała dokładnie w poziomy środek ikony każdego węzła,
// niezależnie od tego, ile pól konfiguracyjnych jest wyrenderowanych pod nią.
const connectorLine = {
  flex: '1 1 12px', minWidth: '12px', height: '2px', background: '#9ca3af',
  alignSelf: 'flex-start', marginTop: `${iconRowHeight / 2 - 1}px`,
};

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
        {key: 'r1Lan', label: 'adr. LAN', placeholder: (x) => `172.16.${x}.254/24`, type: 'cidr', expectedPrefix: 24},
        {key: 'r1WanPort', label: 'port do R2', placeholder: () => 'Gi0/1', width: '78px', type: 'port'},
        {key: 'r1Wan', label: 'adr. do R2', placeholder: (x) => `10.10.${x}.5/30`, type: 'cidr', expectedPrefix: 30},
      ],
    },
    {
      node: {icon: '🌐', label: 'R2', sublabel: 'ISR4331'},
      fields: [
        {key: 'r2WanPort', label: 'port do R1', placeholder: () => 'Gi0/0', width: '78px', type: 'port'},
        {key: 'r2Wan', label: 'adr. do R1', placeholder: (x) => `10.10.${x}.6/30`, type: 'cidr', expectedPrefix: 30},
      ],
    },
  ],
};

// Zwraca płaską listę WSZYSTKICH pól w topologii — zarówno tych z pojedynczych
// węzłów (`group.fields`), jak i tych przypisanych do poszczególnych urządzeń
// wewnątrz stosu (`group.stacked[].fields`). Jedno miejsce, z którego korzystają
// wszystkie poniższe funkcje zbierające — żeby nie powtarzać tej samej pętli
// cztery razy i nie zapomnieć o stosie w którejś z nich.
function getAllFields(topology) {
  const fields = [];
  topology.groups.forEach(g => {
    (g.fields || []).forEach(f => fields.push(f));
    (g.stacked || []).forEach(dev => {
      (dev.fields || []).forEach(f => fields.push(f));
    });
  });
  return fields;
}

function collectFieldKeys(topology) {
  const keys = [];
  getAllFields(topology).forEach(f => { if (!keys.includes(f.key)) keys.push(f.key); });
  return keys;
}

// Mapa: klucz pola w tej topologii -> współdzielony klucz (jeśli pole ma `shared`).
function collectSharedMap(topology) {
  const map = {};
  getAllFields(topology).forEach(f => { if (f.shared) map[f.key] = f.shared; });
  return map;
}

// Zbiera konfigurację "rozbicia" pól typu cidr na osobne wartości pochodne —
// {fieldKey: {type, deriveShared: {network: 'klucz1', wildcard: 'klucz2', ...}}}.
// Dostępne nazwy pochodnych: ip, prefix, network, wildcard, mask.
function collectDeriveSharedMap(topology) {
  const map = {};
  getAllFields(topology).forEach(f => {
    if (f.deriveShared) map[f.key] = {type: f.type, deriveShared: f.deriveShared};
  });
  return map;
}

// Rozbija poprawną wartość pola cidr ("10.10.1.10/24") na wszystkie możliwe
// wartości pochodne naraz.
function deriveCidrValues(value) {
  const parsed = parseCidr(value);
  if (!parsed) return null;
  const acl = computeAclNotation(parsed.ipPart, parsed.prefix);
  const maskOctets = prefixToMaskOctets(parsed.prefix);
  const mask = maskOctets.join('.');
  const firstOctet = Number(parsed.ipPart.split('.')[0]);
  const {netclass, netclassPrefix} = classifyNetwork(firstOctet);
  const netclassAcl = netclassPrefix !== null ? computeAclNotation(parsed.ipPart, netclassPrefix) : null;
  return {
    ip: parsed.ipPart,
    prefix: String(parsed.prefix),
    network: acl.network,
    wildcard: acl.wildcard,
    mask: mask,
    // Gotowe, POŁĄCZONE zapisy — po jednym kluczu zamiast dwóch osobnych
    // <SharedValue>, gdy i tak zawsze wstawiasz je razem obok siebie:
    networkCidr: `${acl.network}/${parsed.prefix}`,        // "10.10.1.0/24"      — np. do opisu sieci
    networkMask: `${acl.network} ${mask}`,                  // "10.10.1.0 255.255.255.0" — np. do "ip route"
    networkWildcard: `${acl.network} ${acl.wildcard}`,      // "10.10.1.0 0.0.0.255"     — np. do ACL / "network" w OSPF
    // Pochodne KLASOWE — liczone z pierwszego oktetu, NIEZALEŻNIE od prefiksu
    // wpisanego przez studenta (patrz `classifyNetwork` wyżej):
    netclass: netclass,                                     // "A" / "B" / "C" / "D" / "E"
    netclassPrefix: netclassPrefix !== null ? String(netclassPrefix) : '', // "8"/"16"/"24", puste dla D/E
    netclassMask: netclassPrefix !== null ? prefixToMaskOctets(netclassPrefix).join('.') : '', // np. "255.255.0.0"
    netclassNetwork: netclassAcl ? netclassAcl.network : '', // adres zaokrąglony do granicy KLASOWEJ, np. "172.16.0.0"
  };
}

// Klucze wszystkich pól typu "address" w tej topologii — potrzebne do wykrycia,
// czy dwa różne urządzenia dostały przypadkiem ten sam adres IP.
function collectAddressFieldKeys(topology) {
  const keys = [];
  getAllFields(topology).forEach(f => { if (f.type === 'address' || f.type === 'cidr') keys.push(f.key); });
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

export default function TopologyBuilder({title, storageKey, topology = defaultTopology, checkGroupOctet = true, xShared}) {
  const key = `topology-builder:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);
  const fieldKeys = collectFieldKeys(topology);
  const sharedMap = collectSharedMap(topology); // {fieldKey: sharedKey}
  const deriveSharedMap = collectDeriveSharedMap(topology); // {fieldKey: {type, deriveShared}}
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
        if (saved.values) {
          setValues(prev => ({...prev, ...saved.values}));
          // Odtwórz też pochodne klucze (ip/prefix/network/wildcard/mask) dla
          // pól cidr wczytanych z własnego zapisu — inaczej po odświeżeniu
          // strony <SharedValue> pokazywałby puste pole, dopóki ktoś ręcznie
          // czegoś nie wpisze ponownie.
          Object.entries(saved.values).forEach(([fk, v]) => deriveAndWriteShared(fk, v));
        }
      }
    } catch (e) { /* ignorujemy */ }

    const fromShared = {};
    Object.entries(sharedMap).forEach(([fieldKey, sharedKey]) => {
      const v = readSharedField(sharedKey, null);
      if (v !== null) fromShared[fieldKey] = v;
    });
    if (Object.keys(fromShared).length > 0) {
      setValues(prev => ({...prev, ...fromShared}));
      Object.entries(fromShared).forEach(([fk, v]) => deriveAndWriteShared(fk, v));
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

  // Jeśli podano `xShared`, publikuje bieżący numer grupy (X) do wspólnego
  // magazynu przy każdej zmianie — dzięki temu inne komponenty na stronie
  // (np. `RingNeighbor`, albo kolumna `readOnly` w `EditableTable` zawierająca
  // <RingNeighbor xShared="..." />) mogą na żywo wyliczyć numery sąsiednich
  // grup w pierścieniu (X-1 / X+1), bez ręcznego przepisywania numeru gdzie
  // indziej. Świadomie NIE czytamy stąd z powrotem do `x` — to pole jest tu
  // źródłem prawdy, nie odbiorcą.
  useEffect(() => {
    if (!xShared) return;
    writeSharedField(xShared, x);
  }, [x, xShared]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify({x, vlan, values}));
    } catch (e) { /* ignorujemy */ }
  }, [x, vlan, values, key]);

  // Jeśli pole ma skonfigurowane `deriveShared`, rozbija jego wartość na osobne
  // klucze współdzielone (ip/prefix/network/wildcard/mask). Wywoływane zarówno
  // przy każdej zmianie pola, jak i raz po wczytaniu zapisanej wcześniej wartości
  // — żeby pochodne klucze zawsze były aktualne, nawet bez ponownego wpisywania.
  function deriveAndWriteShared(fieldKey, val) {
    const cfg = deriveSharedMap[fieldKey];
    if (!cfg || cfg.type !== 'cidr') return;
    const derived = deriveCidrValues(val);
    Object.entries(cfg.deriveShared).forEach(([name, sharedKey]) => {
      writeSharedField(sharedKey, derived ? (derived[name] ?? '') : '');
    });
  }

  function setFieldValue(fieldKey, val) {
    setValues(prev => ({...prev, [fieldKey]: val}));
    if (sharedMap[fieldKey]) {
      writeSharedField(sharedMap[fieldKey], val);
    }
    deriveAndWriteShared(fieldKey, val);
  }

  function reset() {
    setX('1');
    setVlan(topology.vlan?.defaultVlan || '');
    setValues(Object.fromEntries(fieldKeys.map(k => [k, ''])));
    // Wyczyść też pola we wspólnym magazynie — tylko te, które NALEŻĄ do tej
    // topologii (mają `shared`), żeby reset tutaj nie zostawiał starych wartości
    // widocznych np. w tabeli adresacji w innym kroku/na innej stronie.
    Object.values(sharedMap).forEach(sharedKey => clearSharedField(sharedKey));
    // To samo dla kluczy pochodnych (ip/prefix/network/wildcard/mask) z pól cidr.
    Object.values(deriveSharedMap).forEach(cfg => {
      Object.values(cfg.deriveShared).forEach(sharedKey => clearSharedField(sharedKey));
    });
  }

  const xVal = x || 'X';
  const duplicateAddressKeys = findDuplicateAddressKeys(addressFieldKeys, values);

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '24px 0',
    // Węzły topologii mają zawsze zmieścić się w JEDNEJ linii (nigdy nie
    // "łamać się" na dwa rzędy — patrz `flexWrap: 'nowrap'` niżej). Na wąskich
    // ekranach/kontenerach oznacza to poziomy scroll całej karty zamiast
    // zawijania — dokładnie tak samo, jak już działa w `EditableTable`.
    overflowX: 'auto',
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

      <div style={{display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap', justifyContent: 'center', gap: '6px', minWidth: 'min-content'}}>

        {topology.groups.map((group, i) => (
          <React.Fragment key={i}>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0}}>

              {group.stacked ? (
                <>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
                    {group.stacked.map((dev, j) => (
                      <div key={j} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>
                        <DeviceIcon icon={dev.icon} label={dev.label} sublabel={dev.sublabel} />
                        {(dev.fields || []).length > 0 && (
                          <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px', maxWidth: '190px'}}>
                            {dev.fields.map(f => (
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
                                expectedPrefix={f.expectedPrefix}
                                showAclHelper={f.showAclHelper}
                              />
                            ))}
                          </div>
                        )}
                      </div>
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
                        expectedPrefix={f.expectedPrefix}
                        showAclHelper={f.showAclHelper}
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

- `type: 'cidr'` — pole adresu Z PREFIKSEM, np. "10.1.1.1/30":
    * dopuszczone cyfry, kropki i "/" (litery odrzucane natychmiast),
    * wymaga poprawnego adresu IP, ukośnika i liczby prefiksu w zakresie 0-32,
    * opcjonalny prop `expectedPrefix` wymusza KONKRETNY prefiks — pojedyncza
      liczba (np. `expectedPrefix: 30` — łącze punkt-punkt między routerami)
      albo tablica dozwolonych wartości (np. `expectedPrefix: [24, 25]`),
    * bez podanego `expectedPrefix` akceptowany jest dowolny poprawny prefiks 0-32,
    * komunikaty błędów: "format: IP/prefiks", "3. oktet ≠ X", "wymagany prefiks /30",
    * opcjonalny prop `showAclHelper: true` — gdy pole jest poprawnie wypełnione,
      pod spodem (na niebiesko) pokazuje gotowy zapis do listy ACL na Cisco IOS:
      adres sieci + maska WILDCARD (odwrócona maska), np. dla "10.10.1.10/24"
      pokaże "ACL: 10.10.1.0 0.0.0.255" — zero liczenia w pamięci przez studenta,
    * opcjonalny prop `deriveShared` — ROZBIJA wartość pola cidr na osobne klucze
      we wspólnym magazynie, które możesz potem wstawić gdziekolwiek na stronie
      przez <SharedValue shared="..." />. Dostępne nazwy pochodnych:
        - `ip`              → sam adres, bez prefiksu, np. "10.10.1.10"
        - `prefix`          → sama liczba, np. "24"
        - `network`         → adres sieci, np. "10.10.1.0"
        - `wildcard`        → maska wildcard (do ACL), np. "0.0.0.255"
        - `mask`            → zwykła maska dziesiętna, np. "255.255.255.0"
        - `networkCidr`     → połączone "sieć/prefiks", np. "10.10.1.0/24"
        - `networkMask`     → połączone "sieć maska", np. "10.10.1.0 255.255.255.0"
                              (gotowe np. do polecenia `ip route`)
        - `networkWildcard` → połączone "sieć wildcard", np. "10.10.1.0 0.0.0.255"
                              (gotowe np. do `network ... area 0` w OSPF albo ACL)
        - `netclass`        → klasa adresu wg PIERWSZEGO OKTETU: "A" / "B" / "C" / "D" / "E"
                              (niezależnie od wpisanego prefiksu — to realna klasa adresu)
        - `netclassPrefix`  → klasowy prefiks tej klasy, np. "16" dla adresu klasy B
                              (puste dla D/E, które nie mają klasowego prefiksu)
        - `netclassMask`    → klasowa maska dziesiętna, np. "255.255.0.0" dla klasy B
        - `netclassNetwork` → adres zaokrąglony do granicy KLASOWEJ (a nie do wpisanego
                              prefiksu), np. dla "172.16.5.10/24" da "172.16.0.0" —
                              dokładnie to, do czego IOS "ucina" adres w poleceniu
                              `network` w RIP, niezależnie od realnej maski na interfejsie
      Przykład:

      { key: 'aclSource', type: 'cidr', showAclHelper: true,
        deriveShared: { networkCidr: 'sieć_x', networkWildcard: 'siec_wild_x' } }

      Po wpisaniu "10.10.1.10/24" w to pole, gdziekolwiek indziej na stronie:
      <SharedValue shared="sieć_x" />        → pokaże "10.10.1.0/24"
      <SharedValue shared="siec_wild_x" />   → pokaże "10.10.1.0 0.0.0.255"

Jeśli pominiesz `type`, pole domyślnie zachowuje się jak `'port'` (bez walidacji) — żeby
nie zepsuć topologii pisanych przed tą zmianą.

Aby WYŁĄCZYĆ sprawdzanie trzeciego oktetu (X) dla całego komponentu naraz — tak samo jak
w PrivateAddressTable:

<TopologyBuilder checkGroupOctet={false} topology={{...}} />
*/
