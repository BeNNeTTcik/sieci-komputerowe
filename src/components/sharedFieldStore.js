// Wspólny "magazyn" wartości pól, współdzielony między różnymi komponentami
// na stronie (np. TopologyBuilder i PrivateAddressTable). Wartość zapisana pod
// danym kluczem w jednym komponencie jest natychmiast widoczna w drugim, jeśli
// oba odwołują się do tego samego klucza `shared`.
//
// Używa sessionStorage (nie localStorage) — dane są dostępne w obrębie jednej
// karty przeglądarki, przetrwają nawigację między podstronami w tej samej
// karcie, ale ZNIKAJĄ AUTOMATYCZNIE po zamknięciu karty/przeglądarki. To
// celowe: każda "sesja pracy" studenta zaczyna się od czystego stanu, bez
// ręcznego czyszczenia i bez ryzyka "widmowych" starych wartości z poprzednich
// zajęć. W obrębie tej samej wizyty działa dodatkowo zdarzenie
// `shared-field-change`, dzięki któremu zmiana w jednym komponencie na stronie
// jest widoczna w drugim natychmiast, bez potrzeby odświeżania.

const STORE_KEY = 'network-config-shared';
const EVENT_NAME = 'shared-field-change';

export function readSharedStore() {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function readSharedField(fieldKey, fallback = '') {
  const store = readSharedStore();
  return Object.prototype.hasOwnProperty.call(store, fieldKey) ? store[fieldKey] : fallback;
}

export function writeSharedField(fieldKey, value) {
  try {
    const store = readSharedStore();
    store[fieldKey] = value;
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    /* ignorujemy błędy zapisu (np. tryb prywatny) */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {detail: {fieldKey, value}}));
  } catch (e) {
    /* starsze przeglądarki bez CustomEvent — pomijamy, zadziała i tak po odświeżeniu */
  }
}

// Całkowicie usuwa pole ze wspólnego magazynu (nie tylko ustawia pusty string)
// i powiadamia wszystkie podłączone komponenty, żeby wyczyściły je u siebie.
// Używane przez przyciski "Resetuj"/"Restart", żeby reset w JEDNYM komponencie
// nie zostawiał "widmowej" starej wartości widocznej w innych krokach/komponentach
// podłączonych pod ten sam klucz `shared`.
export function clearSharedField(fieldKey) {
  try {
    const store = readSharedStore();
    delete store[fieldKey];
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    /* ignorujemy */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {detail: {fieldKey, value: ''}}));
  } catch (e) {
    /* ignorujemy */
  }
}

// Nasłuchuje zmian danego pola dokonanych przez INNY komponent na stronie.
// `callback` dostaje nową wartość. Zwraca funkcję czyszczącą nasłuch (do useEffect).
export function subscribeSharedField(fieldKey, callback) {
  function handler(e) {
    if (e.detail && e.detail.fieldKey === fieldKey) {
      callback(e.detail.value);
    }
  }
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
