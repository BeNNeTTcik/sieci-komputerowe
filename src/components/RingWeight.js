import React, {useState, useEffect} from 'react';
import {readSharedField, subscribeSharedField} from './sharedFieldStore';

// Wstawia WAGĘ (koszt OSPF) połączenia, wyliczoną NA ŻYWO z numeru własnej
// grupy (X, ten sam wspólny magazyn co <RingNeighbor xShared="..." />) oraz
// tablicy wag `weights` — tej samej listy liczb, którą i tak już wpisujesz
// ręcznie do tabeli z wagami (sekcja 2/2). Zamiast każdy student sam szukał
// swojego wiersza w statycznej tabeli, ten sam zestaw wag jest tu użyty do
// wyliczenia TYLKO tej jednej, właściwej dla niego liczby.
//
// Dwa tryby wskazywania, którą wagę z `weights` pokazać:
// - mode="edge" (domyślny, do pierścienia R1↔R1 / R2↔R2): `weights[k]`
//   to waga krawędzi między grupą (k+1) a grupą (k+2), z zawinięciem —
//   dokładnie w tej kolejności, w jakiej wiersze są wypisane w tabeli
//   "Sieci między grupami" (Grupa 1↔2, 2↔3, ..., 6↔1). `direction="down"`
//   pokazuje wagę krawędzi WYCHODZĄCEJ z własnej grupy w stronę grupy X+1,
//   `direction="up"` — krawędzi przychodzącej od strony grupy X-1.
// - mode="node" (do rungu R1↔R2, gdzie waga jest przypisana grupie, a nie
//   krawędzi): `weights[k]` to waga grupy (k+1) — `direction` jest wtedy
//   ignorowany.
export default function RingWeight({xShared, weights, totalGroups = 6, direction = 'down', mode = 'edge', fallback = '?'}) {
  const [x, setX] = useState('');

  useEffect(() => {
    setX(readSharedField(xShared, ''));
    const unsubscribe = subscribeSharedField(xShared, (v) => setX(v));
    return unsubscribe;
  }, [xShared]);

  const n = parseInt(x, 10);
  const validX = Number.isInteger(n) && n >= 1 && n <= totalGroups;
  const validWeights = Array.isArray(weights) && weights.length === totalGroups;

  let weight;
  if (validX && validWeights) {
    const idx = mode === 'node'
      ? (n - 1) % totalGroups
      : direction === 'up'
        ? (n - 2 + totalGroups) % totalGroups
        : (n - 1) % totalGroups;
    weight = weights[idx];
  }

  const hasValue = weight !== undefined && weight !== null && weight !== '';

  return (
    <code style={{
      padding: '2px 7px', borderRadius: '5px', fontWeight: 600,
      background: hasValue ? '#f0fdf4' : '#f3f4f6',
      color: hasValue ? '#16a34a' : '#9ca3af',
      border: hasValue ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
    }}>
      {hasValue ? weight : fallback}
    </code>
  );
}
