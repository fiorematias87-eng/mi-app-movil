import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';

interface NegocioContextType {
  negocioId: string;
  negocioNombre: string;
  loading: boolean;
}

const NegocioContext = createContext<NegocioContextType | undefined>(undefined);

export const NegocioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [negocioId, setNegocioId] = useState<string>('');
  const [negocioNombre, setNegocioNombre] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const identificarNegocio = async () => {
      try {
        const hostname = window.location.hostname;
        const partes = hostname.split('.');

        let subdominioBuscado = '';

        if (partes.length > 2) {
          subdominioBuscado = partes[0];
        } else {
          subdominioBuscado = 'pedidos-lodefiore';
        }

        const { data, error } = await supabase
          .from('negocios')
          .select('id, nombre, subdominio')
          .eq('subdominio', subdominioBuscado)
          .single();

        if (error || !data) {
          console.error('No se encontró un negocio para este subdominio:', subdominioBuscado);
          const { data: defaultData, error: defaultError } = await supabase
            .from('negocios')
            .select('id, nombre')
            .limit(1)
            .single();

          if (!defaultError && defaultData) {
            setNegocioId(defaultData.id);
            setNegocioNombre(defaultData.nombre);
          }
        } else {
          setNegocioId(data.id);
          setNegocioNombre(data.nombre);
        }
      } catch (err) {
        console.error('Error identificando el negocio:', err);
      } finally {
        setLoading(false);
      }
    };

    identificarNegocio();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando local...</div>;
  }

  return (
    <NegocioContext.Provider value={{ negocioId, negocioNombre, loading }}>
      {children}
    </NegocioContext.Provider>
  );
};

export const useNegocio = () => {
  const context = useContext(NegocioContext);
  if (!context) throw new Error('useNegocio debe usarse dentro de un NegocioProvider');
  return context;
};
