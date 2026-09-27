import React from 'react';

// Question nie renderuje nic samo z siebie — Quiz czyta jego propsy
// (text, options, correct) oraz opcjonalne children (dodatkowa treść, np. obrazek).
export default function Question({children}) {
  return <>{children}</>;
}
