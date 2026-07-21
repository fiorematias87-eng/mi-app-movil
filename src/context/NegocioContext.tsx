import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { supabase } from '../supabase';

interface NegocioContextType {
  negocioId: string | null;
  negocioNombre: string | null;
  loading: boolean;
  error: string | null;
}

const NegocioContext = createContext<NegocioContextType | undefined>(undefined);

export const NegocioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [negocioNombre, setNegocioNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const detectarNegocioPorSubdominio = async () => {
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const partes = hostname.split('.');

        let subdominioBuscado = '';

        if (!hostname || hostname.includes('localhost') || partes.length < 2) {
          subdominioBuscado = 'apppedidosnuevolocal';
        } else {
          subdominioBuscado = partes[0].toLowerCase();
        }

        if (!/^[a-z0-9-]{1,63}$/.test(subdominioBuscado)) {
          if (mounted) {
            setError('invalid_subdomain');
            setLoading(false);
          }
          return;
        }

        const cacheKey = `tenant_cache_${subdominioBuscado}`;
        const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(cacheKey) : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { id: string; nombre: string } | null;
            if (parsed && mounted) {
              setNegocioId(parsed.id);
              setNegocioNombre(parsed.nombre);
              setLoading(false);
              return;
            }
          } catch {}
        }

        const res = await supabase
          .from('negocios')
          .select('id, nombre')
          .eq('subdominio', subdominioBuscado)
          .maybeSingle();

        if (res.error || !res.data) {
          if (mounted) {
            setError('tenant_not_found');
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          const negocio = res.data as { id: string; nombre: string };
          setNegocioId(negocio.id);
          setNegocioNombre(negocio.nombre);
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify({ id: negocio.id, nombre: negocio.nombre }));
          } catch {}
        }
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'unknown_error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void detectarNegocioPorSubdominio();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({ negocioId, negocioNombre, loading, error }), [negocioId, negocioNombre, loading, error]);

  return <NegocioContext.Provider value={value}>{children}</NegocioContext.Provider>;
};

export const useNegocio = () => {
  const context = useContext(NegocioContext);
  if (!context) throw new Error('useNegocio debe usarse dentro de un NegocioProvider');
  return context;
};
