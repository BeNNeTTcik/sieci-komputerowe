import React, {useState, useEffect, useRef} from 'react';
import {pseudoRandomInt} from './pseudoRandom';

// Generator INDYWIDUALNEJ topologii projektu zaliczeniowego.
//
// W przeciwieństwie do TopologyBuilder (gdzie kształt sieci jest stały, a
// zmienia się tylko adresacja), tu z numeru grupy (X) losowana jest CAŁA
// struktura — liczba routerów, switchy, VLAN-ów, komputerów, wymagany
// protokół routingu i konkretne wymaganie ACL. Losowanie jest w pełni
// deterministyczne (ten sam `pseudoRandomInt` co w laboratorium OSPF do
// wag połączeń) — ta sama grupa zawsze dostanie dokładnie tę samą
// topologię, więc nie trzeba nigdzie przechowywać wyniku ani obawiać się
// niezgodności między odświeżeniami strony czy urządzeniami.
//
// Każda grupa dostaje inny zestaw, ale wszystkie zestawy są z tej samej,
// kontrolowanej puli (te same zakresy liczbowe, ten sam katalog możliwych
// wymagań) — więc żadna wersja nie jest istotnie trudniejsza od innej.

const VLAN_NAME_POOL = ['Biuro', 'Serwery', 'Goście', 'Magazyn', 'Produkcja', 'Księgowość'];

function pickCycled(pool, startIndex, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(pool[(startIndex + i) % pool.length]);
  return out;
}

export default function TopologyGenerator({
  title,
  storageKey,
  routersExtraRange = [0, 1],       // dodatkowy router "branch" poza ISP+CORE: 0 albo 1
  switchesRange = [1, 2],
  vlanCountRange = [2, 3],
  pcsPerVlanRange = [1, 3],
  protocolPool = ['routing statyczny', 'RIP', 'OSPF'],
}) {
  const key = `topology-generator:${storageKey || 'domyslna'}`;
  const loadedRef = useRef(false);
  const [x, setX] = useState('');

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) setX(JSON.parse(raw).x || '');
    } catch (e) { /* ignorujemy */ }
    loadedRef.current = true;
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try { window.sessionStorage.setItem(key, JSON.stringify({x})); } catch (e) { /* ignorujemy */ }
  }, [x, key]);

  const xNum = parseInt(x, 10);
  const hasX = Number.isInteger(xNum) && xNum > 0;
  const seed = `${storageKey || 'domyslna'}-grupa-${xNum}`;

  let plan = null;
  if (hasX) {
    const routersExtra = pseudoRandomInt(`${seed}-routers-extra`, routersExtraRange[0], routersExtraRange[1]);
    const switches = pseudoRandomInt(`${seed}-switches`, switchesRange[0], switchesRange[1]);
    const vlanCount = pseudoRandomInt(`${seed}-vlan-count`, vlanCountRange[0], vlanCountRange[1]);
    const vlanStart = pseudoRandomInt(`${seed}-vlan-start`, 0, VLAN_NAME_POOL.length - 1);
    const vlanNames = pickCycled(VLAN_NAME_POOL, vlanStart, vlanCount);

    const vlans = vlanNames.map((name, i) => ({
      id: 10 * (i + 1),
      name,
      pcCount: name === 'Serwery'
        ? 1
        : pseudoRandomInt(`${seed}-vlan-${i}-pcs`, pcsPerVlanRange[0], pcsPerVlanRange[1]),
    }));

    const protocol = protocolPool[pseudoRandomInt(`${seed}-protocol`, 0, protocolPool.length - 1)];

    // ACL: który VLAN ma mieć zablokowany dostęp do którego (zawsze dwa RÓŻNE
    // indeksy spośród wylosowanych VLAN-ów).
    let aclFrom = 0, aclTo = 0;
    if (vlans.length >= 2) {
      aclFrom = pseudoRandomInt(`${seed}-acl-from`, 0, vlans.length - 1);
      const toOffset = pseudoRandomInt(`${seed}-acl-to`, 1, vlans.length - 1);
      aclTo = (aclFrom + toOffset) % vlans.length;
    }

    // DHCP: pierwszy VLAN inny niż "Serwery" (serwer zawsze ma adres statyczny).
    const dhcpVlan = vlans.find(v => v.name !== 'Serwery') || vlans[0];

    plan = {
      routers: 2 + routersExtra, // R-ISP + R-CORE (+ R-BRANCH)
      hasBranch: routersExtra > 0,
      switches,
      vlans,
      protocol,
      aclFrom: vlans[aclFrom],
      aclTo: vlans[aclTo],
      dhcpVlan,
    };
  }

  const card = {
    border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px',
    background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', margin: '20px 0',
  };
  const heading = {fontSize: '1.2rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0'};
  const subheading = {fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px 0'};
  const xInputStyle = {
    width: '52px', padding: '5px 8px', borderRadius: '8px', border: '2px solid #2563eb',
    fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', color: '#2563eb', background: '#eff6ff',
  };
  const pill = {
    display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem',
    fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', margin: '2px',
  };
  const box = {
    border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px',
    background: '#f9fafb', fontSize: '0.85rem', color: '#374151', textAlign: 'center', minWidth: '100px',
  };
  const row = {display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', margin: '10px 0'};
  const arrow = {color: '#9ca3af', fontSize: '1.1rem'};
  const reqList = {margin: '4px 0 14px 0', paddingLeft: '20px', fontSize: '0.88rem', color: '#374151', lineHeight: 1.7};

  return (
    <div style={card}>
      <h4 style={heading}>{title || 'Wylosowana topologia'}</h4>
      <p style={subheading}>
        Wpisz numer swojej grupy — topologia i wymagania są jednoznacznie wyznaczone przez ten numer
        (ta sama grupa zawsze dostanie ten sam zestaw).
      </p>

      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px'}}>
        <label style={{fontSize: '0.85rem', color: '#374151'}}>Numer grupy (X):</label>
        <input
          type="text" value={x}
          onChange={e => setX(e.target.value.replace(/[^0-9]/g, ''))}
          style={xInputStyle}
        />
      </div>

      {!hasX && (
        <div style={{fontSize: '0.85rem', color: '#9ca3af'}}>Wpisz numer grupy, aby wygenerować topologię.</div>
      )}

      {plan && (
        <>
          <div style={row}>
            <div style={box}>🌐 R-ISP-X</div>
            <span style={arrow}>—</span>
            <div style={box}>🌐 R-CORE-X</div>
            {plan.hasBranch && <><span style={arrow}>—</span><div style={box}>🌐 R-BRANCH-X<br/><small>({plan.protocol})</small></div></>}
            <span style={arrow}>—</span>
            <div style={box}>🔀 {plan.switches === 1 ? '1 switch' : `${plan.switches} switche`}</div>
          </div>

          <div style={row}>
            {plan.vlans.map(v => (
              <div key={v.id} style={{...box, borderColor: '#bfdbfe', background: '#eff6ff'}}>
                VLAN {v.id} „{v.name}"<br/>
                <small>{v.pcCount} {v.pcCount === 1 ? 'urządzenie' : 'urządzenia'}</small>
              </div>
            ))}
          </div>

          <h4 style={{...heading, fontSize: '1rem', marginTop: '18px'}}>Wylosowane wymagania</h4>
          <ul style={reqList}>
            <li>Routery: <b>{plan.routers}</b> ({plan.hasBranch ? 'R-ISP + R-CORE + R-BRANCH' : 'R-ISP + R-CORE'})</li>
            <li>Przełączniki: <b>{plan.switches}</b>, wszystkie VLAN-y na trunku do R-CORE-X</li>
            <li>VLAN-y: {plan.vlans.map(v => <span key={v.id} style={pill}>VLAN {v.id} „{v.name}" ({v.pcCount})</span>)}</li>
            {plan.hasBranch && <li>Routing między R-CORE-X a R-BRANCH-X: <b>{plan.protocol}</b></li>}
            <li>DHCP: pula dla VLAN „{plan.dhcpVlan?.name}" (pozostałe VLAN-y — adresacja statyczna)</li>
            <li>Trasa domyślna z R-CORE-X do R-ISP-X (routing do „internetu")</li>
            {plan.vlans.length >= 2 && (
              <li>
                ACL: VLAN „{plan.aclFrom?.name}" <b>NIE może</b> inicjować połączeń do VLAN „{plan.aclTo?.name}"
                (ruch powrotny i dostęp do internetu — dozwolone)
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
