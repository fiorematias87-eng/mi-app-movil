import { supabase } from '../supabase';

export interface NegocioRecord {
  id: string;
  nombre: string;
  subdominio?: string | null;
}

export interface ConfiguracionRecord {
  negocio_id: string;
  [key: string]: unknown;
}

const CONFIGURATION_TABLES = ['configuracion', 'shop_config'] as const;

const isMissingTableError = (
  error: { code?: string; message?: string } | null,
): boolean => {
  const code = error?.code ?? '';
  const message = error?.message ?? '';

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /does not exist|relation/i.test(message)
  );
};

export const getNegocioBySubdominio = async (
  subdominio: string,
): Promise<NegocioRecord | null> => {
  const { data, error } = await supabase
    .from('negocios')
    .select('id, nombre, subdominio')
    .eq('subdominio', subdominio)
    .maybeSingle<NegocioRecord>();

  if (error) {
    throw new Error('No se pudo consultar el negocio asociado al subdominio.');
  }

  return data ?? null;
};

export const getConfiguracion = async (
  negocioId: string,
): Promise<Record<string, unknown> | null> => {
  const responses = await Promise.allSettled(
    CONFIGURATION_TABLES.map(async (tableName) => {
      const result = await supabase
        .from(tableName)
        .select('*')
        .eq('negocio_id', negocioId)
        .maybeSingle<ConfiguracionRecord>();

      return result;
    }),
  );

  for (const response of responses) {
    if (response.status === 'rejected') {
      throw response.reason instanceof Error
        ? response.reason
        : new Error('No se pudo cargar la configuración del negocio.');
    }

    const { data, error } = response.value;

    if (error && !isMissingTableError(error)) {
      throw new Error('No se pudo cargar la configuración del negocio.');
    }

    if (data) {
      return data as Record<string, unknown>;
    }
  }

  return null;
};