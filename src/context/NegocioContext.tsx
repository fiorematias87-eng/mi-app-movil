import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../supabase';

export interface NegocioContextType {
  negocioId: string | null;
  negocioNombre: string | null;
  configuracion: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  tenantNotFound: boolean;
  subdominio: string | null;
}

interface NegocioRecord {
  id: string;
  nombre: string;
  subdominio?: string | null;
}

const DEFAULT_SUBDOMAIN = 'apppedidosnuevolocal';

const isLoopbackOrIp = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '0.0.0.0' || normalized === '::1') {
    return true;
  }

  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized);
};

const extractSubdominio = (hostname: string): string | null => {
  if (!hostname) return null;

  const normalizedHost = hostname.trim().toLowerCase();
  if (!normalizedHost) return null;

  if (isLoopbackOrIp(normalizedHost)) {
    return DEFAULT_SUBDOMAIN;
  }

  // Obtener el primer segmento explicitamente y sanitizarlo
  const firstSegment = normalizedHost.split('.')[0] ?? '';
  const subdominioLimpio = firstSegment.trim().toLowerCase();
  if (!subdominioLimpio) return null;

  // Validar formato razonable para subdominios
  return /^[a-z0-9-]{1,63}$/.test(subdominioLimpio) ? subdominioLimpio : null;
};

const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  return code === '42P01' || code === 'PGRST205' || /does not exist|relation/i.test(message);
};

const NegocioContext = createContext<NegocioContextType | undefined>(undefined);

export const NegocioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [negocioNombre, setNegocioNombre] = useState<string | null>(null);
  const [configuracion, setConfiguracion] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantNotFound, setTenantNotFound] = useState<boolean>(false);
  const [subdominio, setSubdominio] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const detectarNegocioPorSubdominio = async () => {
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const subdominioLimpio = extractSubdominio(hostname);

        setSubdominio(subdominioLimpio);
        setError(null);
        setTenantNotFound(false);
        setConfiguracion(null);

        if (!subdominioLimpio) {
          if (mounted) {
            setTenantNotFound(true);
            setLoading(false);
          }
          return;
        }

        const negocioResponse = await supabase
          .from('negocios')
          .select('id, nombre, subdominio')
          .eq('subdominio', subdominioLimpio)
          .maybeSingle();

        const negocio = negocioResponse.data as NegocioRecord | null;

        if (negocioResponse.error || !negocio) {
          console.error(
            `Subdominio buscado: '${subdominioLimpio}'`,
            negocioResponse.error ?? 'no data returned',
          );

          if (mounted) {
            setTenantNotFound(true);
          }
          return;
        }

        if (mounted) {
          setNegocioId(negocio.id);
          setNegocioNombre(negocio.nombre);
        }

        let configuracionData: Record<string, unknown> | null = null;
        let configError: Error | null = null;

        for (const tableName of ['configuracion', 'shop_config']) {
          const response = await supabase.from(tableName).select('*').eq('negocio_id', negocio.id).maybeSingle();

          if (!response.error && response.data) {
            configuracionData = response.data as Record<string, unknown>;
            break;
          }

          if (response.error && !isMissingTableError(response.error)) {
            configError = response.error as Error;
            break;
          }
        }

        if (configError) {
          throw configError;
        }

        if (mounted) {
          setConfiguracion(configuracionData);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'unknown_error');
          setTenantNotFound(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void detectarNegocioPorSubdominio();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<NegocioContextType>(
    () => ({
      negocioId,
      negocioNombre,
      configuracion,
      loading,
      error,
      tenantNotFound,
      subdominio,
    }),
    [negocioId, negocioNombre, configuracion, loading, error, tenantNotFound, subdominio],
  );

  return <NegocioContext.Provider value={value}>{children}</NegocioContext.Provider>;
};

export const useNegocio = () => {
  const context = useContext(NegocioContext);
  if (!context) throw new Error('useNegocio debe usarse dentro de un NegocioProvider');
  return context;
};
