import { supabase } from '../supabase';
import type { Database, PedidoRow, PerfilRow } from '../types';

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

type PerfilUpsertQuery = {
  upsert(payload: unknown, options?: { onConflict?: string }): {
    select(): {
      maybeSingle(): Promise<{ data: PerfilRow | null; error: Error | null }>;
    };
  };
};

const requireTenantId = (negocioId: string | null | undefined): string => {
  if (!negocioId?.trim()) {
    throw new Error('No hay un negocio activo para ejecutar esta operación.');
  }

  return negocioId;
};

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
  const normalizedSubdominio = subdominio.trim().toLowerCase();

  console.log('[tenant.service] querying negocios with subdominio:', normalizedSubdominio);

  const { data, error } = await supabase
    .from('negocios')
    .select('id, nombre, subdominio')
    .eq('subdominio', normalizedSubdominio)
    .maybeSingle<NegocioRecord>();

  console.log('[tenant.service] Supabase response for negocios:', { data, error });

  if (error) {
    throw new Error('No se pudo consultar el negocio asociado al subdominio.');
  }

  return data ?? null;
};

export const getConfiguracion = async (
  negocioId: string,
): Promise<Record<string, unknown> | null> => {
  const tenantId = requireTenantId(negocioId);

  const responses = await Promise.allSettled(
    CONFIGURATION_TABLES.map(async (tableName) => {
      const result = await supabase
        .from(tableName)
        .select('*')
        .eq('negocio_id', tenantId)
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

export const getNegocioPedidos = async (
  negocioId: string,
): Promise<PedidoRow[]> => {
  const tenantId = requireTenantId(negocioId);

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('negocio_id', tenantId);

  if (error) {
    throw new Error('No se pudo consultar los pedidos del negocio.');
  }

  return (data ?? []) as PedidoRow[];
};

export const getNegocioUsuarios = async (
  negocioId: string,
): Promise<PerfilRow[]> => {
  const tenantId = requireTenantId(negocioId);

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('negocio_id', tenantId);

  if (error) {
    throw new Error('No se pudo consultar los usuarios del negocio.');
  }

  return (data ?? []) as PerfilRow[];
};

export const syncPerfilNegocio = async (
  userId: string,
  negocioId: string,
  rol: string = 'admin',
): Promise<PerfilRow | null> => {
  const tenantId = requireTenantId(negocioId);

  const perfilPayload = {
    id: userId,
    negocio_id: tenantId,
    rol,
  } satisfies Partial<PerfilRow> & { id: string };

  const upsertQuery = supabase.from('perfiles' as keyof Database['public']['Tables']) as unknown as PerfilUpsertQuery;
  const result = await upsertQuery.upsert(perfilPayload, { onConflict: 'id' }).select().maybeSingle();

  if (result.error) {
    throw new Error('No se pudo sincronizar el perfil del usuario con el negocio activo.');
  }

  return result.data ?? null;
};