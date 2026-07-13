import React, { useState } from 'react';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 md:py-8">
      <HomeCliente onInitialized={() => setIsInitializing(false)} />

      {isInitializing && <EsqueletoCarga />}
    </div>
  );
}
