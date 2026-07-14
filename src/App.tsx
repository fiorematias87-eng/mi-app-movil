import React, { useState } from 'react';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 md:py-8">
      <HomeCliente onInitialized={() => setIsHydrated(true)} />

      {!isHydrated && <EsqueletoCarga />}
    </div>
  );
}
