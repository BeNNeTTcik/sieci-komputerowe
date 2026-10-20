import React from 'react';
import Layout from '@docusaurus/theme-classic/lib/theme/Layout';
import NetworkSimulator from '../components/NetworkSimulator';

export default function SymulatorPage() {
  return (
    <Layout
      title="Symulator sieci"
      description="Interaktywny symulator sieci komputerowej: ARP, ICMP, DHCP, TCP – krok po kroku."
      noFooter
    >
      <main
        style={{
          height: 'calc(100vh - var(--ifm-navbar-height))',
          minHeight: 600,
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h1 className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          Symulator sieci
        </h1>
        <div style={{ flex: 1, minHeight: 0 }}>
          <NetworkSimulator scenario="lan" fill />
        </div>
      </main>
    </Layout>
  );
}