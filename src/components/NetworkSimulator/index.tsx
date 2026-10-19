// SPDX-License-Identifier: MIT
// Punkt wejścia dla Docusaurusa. Symulator korzysta z API przeglądarki,
// więc renderujemy go wyłącznie po stronie klienta (BrowserOnly).
import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import type { SimulatorProps } from './Simulator';

export type { SimulatorProps };

export default function NetworkSimulator(props: SimulatorProps) {
  return (
    <BrowserOnly fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Ładowanie symulatora sieci…</div>}>
      {() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Simulator = require('./Simulator').default;
        return <Simulator {...props} />;
      }}
    </BrowserOnly>
  );
}
