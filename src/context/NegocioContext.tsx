import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getRootBaseDomain, extractSubdomainFromHostname } from '../utils/subdomain';
import {
  getConfiguracion,
  getNegocioBySubdominio,
} from '../services/tenant.service';
import type { NegocioRecord } from '../services/tenant.service';

export interface NegocioContextType {
  negocioId: string | null;
  negocioNombre: string | null;
  configuracion: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  tenantNotFound: boolean;
  subdominio: string | null;
}

const NegocioContext = createContext<NegocioContextType | undefined>(undefined);

const resetTenantState = (
  setNegocioId: React.Dispatch<React.SetStateAction<string | null>>,
  setNegocioNombre: React.Dispatch<React.SetStateAction<string | null>>,
  setConfiguracion: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setTenantNotFound: React.Dispatch<React.SetStateAction<boolean>>,
  setSubdominio: React.Dispatch<React.SetStateAction<string | null>>,
): void => {
  setNegocioId(null);
  setNegocioNombre(null);
  setConfiguracion(null);
  setLoading(true);
  setError(null);
  setTenantNotFound(false);
  setSubdominio(null);
};

export const NegocioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [negocioNombre, setNegocioNombre] = useState<string | null>(null);
  const [configuracion, setConfiguracion] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantNotFound, setTenantNotFound] = useState<boolean>(false);
  const [subdominio, setSubdominio] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const resolveTenant = async (): Promise<void> => {
      resetTenantState(
        setNegocioId,
        setNegocioNombre,
        setConfiguracion,
        setLoading,
        setError,
        setTenantNotFound,
        setSubdominio,
      );

      try {
        const hostname =
          typeof window !== 'undefined' ? window.location.hostname : '';

        const baseDomain = getRootBaseDomain();
        const resolvedSubdomain = extractSubdomainFromHostname(hostname, baseDomain);

        if (!active) return;
        setSubdominio(resolvedSubdomain);

        if (!resolvedSubdomain) {
          setTenantNotFound(true);
          return;
        }

        const negocio: NegocioRecord | null = await getNegocioBySubdominio(resolvedSubdomain);

        if (!active) return;
        if (!negocio) {
          setTenantNotFound(true);
          return;
        }

        setNegocioId(negocio.id);
        setNegocioNombre(negocio.nombre);

        const configuracionData = await getConfiguracion(negocio.id);

        if (!active) return;
        setConfiguracion(configuracionData);
      } catch (err) {
        if (!active) return;

        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo resolver el tenant.';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void resolveTenant();

    return () => {
      active = false;
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

export const useNegocio = (): NegocioContextType => {
  const context = useContext(NegocioContext);
  if (!context) {
    throw new Error('useNegocio debe usarse dentro de un NegocioProvider');
  }
  return context;
};
