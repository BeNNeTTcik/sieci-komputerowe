import React, {useState, useEffect} from 'react';
import {readSharedField, subscribeSharedField} from './sharedFieldStore';

// Wstawia w dowolnym miejscu tekstu aktualną wartość pola współdzielonego
// (tego samego, którego używasz w `shared` w TopologyBuilder albo w
// `sharedKeys` w PrivateAddressTable). Aktualizuje się na żywo, jeśli student
// zmieni wartość w którymkolwiek z tych komponentów.
//
// Prop `shared` to ta sama nazwa klucza, co pole `shared: '...'` w TopologyBuilder.
export default function SharedValue({shared, fieldKey, fallback = '…'}) {
  // `fieldKey` zostawione jako przestarzały alias dla kompatybilności wstecznej —
  // nowy kod powinien używać `shared`.
  const key = shared || fieldKey;

  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(readSharedField(key, ''));
    const unsubscribe = subscribeSharedField(key, (v) => setValue(v));
    return unsubscribe;
  }, [key]);

  const hasValue = value && value.trim() !== '';

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
