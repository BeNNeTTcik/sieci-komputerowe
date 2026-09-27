import React, {useState, useEffect} from 'react';
import {readSharedField, subscribeSharedField} from './sharedFieldStore';

// Odczytuje wartość zapisaną pod KANONICZNYM kluczem PARY grup (mniejszy
// numer grupy – większy numer grupy), wyliczonym NA ŻYWO z numeru własnej
// grupy (X, ten sam magazyn co <RingNeighbor xShared="..." />) i wybranego
// kierunku sąsiedztwa (`direction`).
//
// PO CO TO ISTNIEJE: przy prostym <SharedValue shared="r1_gora_siec" /> +
// niezależnym polu do wpisania "moja sieć w górę" / "moja sieć w dół" na
// KAŻDEJ stronie osobno, nic nie gwarantuje, że sąsiad po drugiej stronie
// tego samego fizycznego łącza wpisze DOKŁADNIE tę samą wartość — jeden może
// wpisać ją jako "swoje w dół", drugi jako "swoje w górę", z innym
// przyjętym porządkiem oktetów, i finalnie obaj routery lądują w dwóch
// RÓŻNYCH podsieciach na tym samym kablu (sąsiedztwo nigdy się nie nawiąże).
//
// Rozwiązanie: adres danej pary jest wpisywany RAZ, w jednym wspólnym
// wierszu tabeli "Sieci między grupami" (patrz EditableTable niżej),
// pod kluczem `${keyPrefix}_${mniejszy}-${większy}` — ten sam klucz
// niezależnie od tego, który z dwóch sąsiadów go czyta. RingSharedValue
// tylko oblicza, KTÓRY to klucz dla Ciebie (w zależności od kierunku),
// i go odczytuje — sam nigdy nic nie zapisuje.
export default function RingSharedValue({xShared, totalGroups = 6, direction = 'down', keyPrefix, fallback = '…'}) {
  const [x, setX] = useState('');
  useEffect(() => {
    setX(readSharedField(xShared, ''));
    const unsubscribe = subscribeSharedField(xShared, (v) => setX(v));
    return unsubscribe;
  }, [xShared]);

  const n = parseInt(x, 10);
  const validX = Number.isInteger(n) && n >= 1 && n <= totalGroups;
  const neighbor = validX
    ? (direction === 'up' ? (n === 1 ? totalGroups : n - 1) : (n === totalGroups ? 1 : n + 1))
    : null;
  const canonicalKey = (validX && keyPrefix)
    ? `${keyPrefix}_${Math.min(n, neighbor)}-${Math.max(n, neighbor)}`
    : null;

  const [value, setValue] = useState('');
  useEffect(() => {
    if (!canonicalKey) { setValue(''); return undefined; }
    setValue(readSharedField(canonicalKey, ''));
    const unsubscribe = subscribeSharedField(canonicalKey, (v) => setValue(v));
    return unsubscribe;
  }, [canonicalKey]);

  const hasValue = value && String(value).trim() !== '';

  return (
    <code style={{
      padding: '2px 7px', borderRadius: '5px', fontWeight: 600,
      background: hasValue ? '#f0fdf4' : '#f3f4f6',
      color: hasValue ? '#16a34a' : '#9ca3af',
      border: hasValue ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
    }}>
      {hasValue ? value : fallback}
    </code>
  );
}
