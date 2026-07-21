import { useEffect, useState } from 'react';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';
import { suscribirProductos } from './db';
import { useNegocio } from './context/NegocioContext';
import type { Producto, InfoLocal } from './types';

export default function App() {
  const { negocioId } = useNegocio();
  const [loading, setLoading] = useState(true);
  const [productosState, setProductosState] = useState<Producto[]>([]);
  const [infoLocalState, setInfoLocalState] = useState<Partial<InfoLocal> | null>(null);
  const [categoriasState, setCategoriasState] = useState<string[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    setLoading(true);

    unsubscribe = suscribirProductos((data) => {
      setProductosState(data.productos);
      setInfoLocalState(data.infoLocal ?? null);
      setCategoriasState(data.categorias);
      setLoading(false);
    }, negocioId);

    return () => unsubscribe?.();
  }, [negocioId]);

  if (loading && productosState.length === 0) {
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