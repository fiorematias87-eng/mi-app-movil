import { useEffect, useState } from 'react';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';
import TenantNotFound from './components/TenantNotFound.tsx';
import { suscribirProductos } from './db';
import { useNegocio } from './context/NegocioContext';
import type { Producto, InfoLocal } from './types';

export default function App() {
  const { negocioId, loading: negocioLoading, error } = useNegocio();
  const [productosLoading, setProductosLoading] = useState(true);
  const [productosState, setProductosState] = useState<Producto[]>([]);
  const [infoLocalState, setInfoLocalState] = useState<Partial<InfoLocal> | null>(null);
  const [categoriasState, setCategoriasState] = useState<string[]>([]);

  useEffect(() => {
    if (negocioLoading) return;
    if (error || !negocioId) return;

    let unsubscribe: (() => void) | undefined;

    setProductosLoading(true);

    unsubscribe = suscribirProductos((data) => {
      setProductosState(data.productos);
      setInfoLocalState(data.infoLocal ?? null);
      setCategoriasState(data.categorias);
      setProductosLoading(false);
    }, negocioId);

    return () => unsubscribe?.();
  }, [negocioId, negocioLoading, error]);

  if (negocioLoading) return <EsqueletoCarga />;
  if (error) return <TenantNotFound />;

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