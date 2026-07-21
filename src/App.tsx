import { useEffect, useState } from 'react';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';
import TenantNotFound from './components/TenantNotFound';
import { suscribirProductos } from './db';
import { NegocioProvider, useNegocio } from './context/NegocioContext';
import type { Producto, InfoLocal } from './types';

export default function App() {
  return (
    <NegocioProvider>
      <AppContent />
    </NegocioProvider>
  );
}

function AppContent() {
  const { negocioId, loading: negocioLoading, error, tenantNotFound } = useNegocio();
  const [productosLoading, setProductosLoading] = useState(true);
  const [productosState, setProductosState] = useState<Producto[]>([]);
  const [infoLocalState, setInfoLocalState] = useState<Partial<InfoLocal> | null>(null);
  const [categoriasState, setCategoriasState] = useState<string[]>([]);

  useEffect(() => {
    if (negocioLoading || tenantNotFound || error || !negocioId) return;

    let unsubscribe: (() => void) | undefined;

    setProductosLoading(true);

    unsubscribe = suscribirProductos((data) => {
      setProductosState(data.productos);
      setInfoLocalState(data.infoLocal ?? null);
      setCategoriasState(data.categorias);
      setProductosLoading(false);
    }, negocioId);

    return () => unsubscribe?.();
  }, [negocioId, negocioLoading, error, tenantNotFound]);

  if (negocioLoading) return <EsqueletoCarga />;
  if (tenantNotFound || error) return <TenantNotFound />;

  if (productosLoading && productosState.length === 0) {
    return <EsqueletoCarga />;
  }

  return (
    <div className="min-h-screen bg-slate-950 md:py-8">
      <HomeCliente
        productos={productosState}
        infoLocal={infoLocalState}
        categorias={categoriasState}
      />
    </div>
  );
}