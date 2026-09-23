import React, {useState, useEffect} from 'react';
import {readSharedField, subscribeSharedField} from './sharedFieldStore';

// Wstawia w dowolnym miejscu tekstu numer SĄSIEDNIEJ grupy w pierścieniu,
// wyliczony NA ŻYWO z numeru własnej grupy (X) wpisanego przez studenta w
// <TopologyBuilder xShared="klucz" />. Nie ma tu żadnego własnego stanu do
// wpisywania — to czysto pochodna wartość, tak jak <SharedValue>, tylko
// zamiast pokazywać wartość wprost, dolicza do niej +1 albo -1 z zawijaniem
// na granicach pierścienia (grupa 1 "w górę" to ostatnia grupa, ostatnia
// grupa "w dół" to grupa 1).
//
// Przykład: przy 6 grupach i X=1, `direction="up"` da 6, a `direction="down"` da 2.
export default function RingNeighbor({xShared, totalGroups = 6, direction = 'down', fallback = '?'}) {
  const [x, setX] = useState('');

  useEffect(() => {
    setX(readSharedField(xShared, ''));
    const unsubscribe = subscribeSharedField(xShared, (v) => setX(v));
    return unsubscribe;
  }, [xShared]);

  const n = parseInt(x, 10);
  const valid = Number.isInteger(n) && n >= 1 && n <= totalGroups;
  let neighbor = null;
  if (valid) {
    neighbor = direction === 'up'
      ? (n === 1 ? totalGroups : n - 1)
      : (n === totalGroups ? 1 : n + 1);
  }

  return (
    <code style={{
      padding: '2px 7px', borderRadius: '5px', fontWeight: 600,
      background: neighbor !== null ? '#f0fdf4' : '#f3f4f6',
      color: neighbor !== null ? '#16a34a' : '#9ca3af',
      border: neighbor !== null ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
    }}>
      {neighbor !== null ? neighbor : fallback}
    </code>
  );
}
