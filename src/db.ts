import { supabase } from './supabase';
import type { Database, InfoLocal, Producto } from './types';
export type { InfoLocal, Producto } from './types';

type ConfigTableName = 'shop_config' | 'configuracion';
type ProductoInsert = Database['public']['Tables']['productos']['Insert'];
type ProductoUpdate = Database['public']['Tables']['productos']['Update'];
type ShopConfigInsert = Database['public']['Tables']['shop_config']['Insert'];
type ShopConfigUpdate = Database['public']['Tables']['shop_config']['Update'];

type ConfigRowShape = {
  negocio_id?: string;
  info_local?: Partial<InfoLocal>;
  categorias?: string[];
};

type ConfigPayload = ConfigRowShape;

type MaybeSingleResult<T> = Promise<{ data: T | null; error: Error | null }>;

type ConfigTenantQuery = {
  select(columns: string): {
    eq(column: string, value: string): { maybeSingle(): MaybeSingleResult<ConfigRowShape> };
    maybeSingle(): MaybeSingleResult<ConfigRowShape>;
  };
};

type UpsertTenantQuery = {
  upsert(payload: unknown, options?: { onConflict?: string }): Promise<{ error: Error | null }>;
};

type InsertProductoQuery = {
  insert(payload: unknown): {
    select(): {
      maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
    };
  };
};

type UpdateProductoQuery = {
  update(payload: unknown): {
    eq(column: string, value: string): {
      eq(column: string, value: string): Promise<{ error: Error | null }>;
    };
  };
};

type DeleteTenantProductsQuery = {
  delete(): {
    eq(column: string, value: string): Promise<{ error: Error | null }>;
  };
};

type InsertManyProductosQuery = {
  insert(payload: ProductoInsert[]): Promise<{ error: Error | null }>;
};

const CONFIG_TABLES = ['shop_config', 'configuracion'] as const satisfies readonly ConfigTableName[];
const PRODUCTOS_TABLE = 'productos' as const;

export interface ShopConfigData {
  infoLocal: Partial<InfoLocal> | undefined;
  productos: Producto[];
  categorias: string[];
}

export const infoLocalPorDefecto: InfoLocal = {
  nombre: 'Mi Local',
  descripcion: 'Delicias caseras y atención rápida',
  direccion: 'Av. Siempre Viva 742',
  telefonoWhatsApp: '54911120345678',
  costoEnvio: 500,
  portadaUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
  avatarUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
  cbuCvu: '0000003100000000000000',
  alias: 'mi.local',
  instagram: '',
  facebook: '',
};

export const productosPorDefecto: Producto[] = [
  {
    id: 'prod_1',
    nombre: 'Pizza Especial',
    descripcion: 'Salsa de tomate, muzzarella y jamón',
    precio: 1800,
    categoria: 'pizzas',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80',
    hidden: false,
  },
  {
    id: 'prod_2',
    nombre: 'Limonada',
    descripcion: 'Refrescante y natural',
    precio: 700,
    categoria: 'bebidas',
    imagen: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=500&q=80',
    hidden: false,
  },
];

export const categoriesPorDefecto: string[] = ['pizzas', 'bebidas', 'postres'];

const mapProductoRow = (row: Record<string, unknown>): Producto => ({
  id: typeof row.id === 'string' ? row.id : '',
  nombre: typeof row.nombre === 'string' ? row.nombre : '',
  descripcion: typeof row.descripcion === 'string' ? row.descripcion : '',
  precio: Number(row.precio ?? 0),
  categoria: typeof row.categoria === 'string' ? row.categoria : '',
  imagen: typeof row.imagen === 'string' ? row.imagen : '',
  hidden: row.hidden === true,
  activo: row.activo === true,
  negocio_id: typeof row.negocio_id === 'string' ? row.negocio_id : undefined,
});

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prod_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
};

const ensureNegocioId = (negocioId?: string): string => {
  if (!negocioId) {
    throw new Error('Cargando datos del negocio... Por favor reintenta en un momento.');
  }

  return negocioId;
};

const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  return code === '42P01' || code === 'PGRST205' || /does not exist|relation/i.test(message);
};

const readConfigForTenant = async (
  tableName: ConfigTableName,
  negocioId?: string,
): Promise<{ data: ConfigRowShape | null; error: Error | null }> => {
  const query = supabase.from(tableName as keyof Database['public']['Tables']) as unknown as ConfigTenantQuery;
  const baseQuery = query.select('info_local, categorias');
  const result = negocioId
    ? await baseQuery.eq('negocio_id', negocioId).maybeSingle()
    : await baseQuery.maybeSingle();

  return result;
};

const saveConfigForTenant = async (payload: ConfigPayload, negocioId?: string) => {
  const tenantId = ensureNegocioId(negocioId);

  const configPayload: ConfigPayload = { ...payload, negocio_id: tenantId };

  for (const tableName of CONFIG_TABLES) {
    const upsertQuery = supabase.from(tableName as keyof Database['public']['Tables']) as unknown as UpsertTenantQuery;
    const { error } = await upsertQuery.upsert(configPayload as unknown as ShopConfigInsert, {
      onConflict: 'negocio_id',
    });

    if (error) {
      throw error;
    }
  }
};

export const getShopConfigData = async (negocioId?: string): Promise<ShopConfigData> => {
  const tenantId = ensureNegocioId(negocioId);

  let configData: ConfigPayload | null = null;
  let configError: Error | null = null;

  for (const tableName of CONFIG_TABLES) {
    const response = await readConfigForTenant(tableName, tenantId);

    if (!response.error && response.data) {
      const rawConfig = response.data as Record<string, unknown>;
      const nextInfoLocal = rawConfig['info_local'] as Partial<InfoLocal> | undefined;
      const nextCategorias = rawConfig['categorias'] as string[] | undefined;

      const mergedConfig: ConfigPayload = {
        info_local: nextInfoLocal ?? configData?.info_local ?? undefined,
        categorias: Array.isArray(nextCategorias) ? nextCategorias : configData?.categorias,
      };

      configData = mergedConfig;
      continue;
    }

    if (response.error && !isMissingTableError(response.error)) {
      configError = response.error as Error;
      break;
    }
  }

  if (configError) {
    throw configError;
  }

  const productosQuery = supabase
    .from(PRODUCTOS_TABLE)
    .select('*')
    .eq('negocio_id', tenantId);

  const { data: productosSnap, error: productosError } = await productosQuery;

  if (productosError) {
    throw productosError;
  }

  const productosFromCol: Producto[] = Array.isArray(productosSnap)
    ? productosSnap.map(mapProductoRow)
    : [];

  return {
    infoLocal: { ...infoLocalPorDefecto, ...(configData?.info_local ?? {}) },
    productos: productosFromCol,
    categorias: Array.isArray(configData?.categorias) && configData.categorias.length ? configData.categorias : categoriesPorDefecto,
  };
};

export type SaveShopConfigDataPayload = Partial<ShopConfigData>;

export const saveProductosToCollection = async (nuevosProductos: Producto[], negocioId?: string): Promise<void> => {
  const tenantId = ensureNegocioId(negocioId);

  const productosPayload: ProductoInsert[] = nuevosProductos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: Number(p.precio ?? 0),
    categoria: p.categoria,
    imagen: p.imagen,
    activo: p.activo ?? false,
    hidden: p.hidden ?? false,
    negocio_id: tenantId,
  }));

  const clearQuery = supabase.from(PRODUCTOS_TABLE as keyof Database['public']['Tables']) as unknown as DeleteTenantProductsQuery;
  const clearResult = await clearQuery.delete().eq('negocio_id', tenantId);
  if (clearResult.error) {
    throw clearResult.error;
  }

  const insertQuery = supabase.from(PRODUCTOS_TABLE as keyof Database['public']['Tables']) as unknown as InsertManyProductosQuery;
  const insertResult = await insertQuery.insert(productosPayload as unknown as ProductoInsert[]);
  if (insertResult.error) {
    throw insertResult.error;
  }
};

export const saveShopConfigData = async (
  payload: SaveShopConfigDataPayload,
  negocioId?: string,
): Promise<boolean> => {
  const tenantId = ensureNegocioId(negocioId);

  if (payload.productos !== undefined) {
    await saveProductosToCollection(payload.productos, tenantId);
  }

  if (payload.infoLocal !== undefined || payload.categorias !== undefined) {
    const configPayload: Record<string, unknown> = {};
    if (payload.infoLocal !== undefined) configPayload.info_local = payload.infoLocal;
    if (payload.categorias !== undefined) configPayload.categorias = payload.categorias;

    await saveConfigForTenant(configPayload, tenantId);
  }

  return true;
};

export const crearProducto = async (producto: Omit<Producto, 'id'> & { id?: string }, negocioId?: string): Promise<Producto> => {
  const tenantId = ensureNegocioId(negocioId);

  const nuevoProducto: ProductoInsert = {
    id: producto.id ?? generateId(),
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: Number(producto.precio ?? 0),
    categoria: producto.categoria,
    imagen: producto.imagen,
    activo: producto.activo ?? false,
    hidden: producto.hidden ?? false,
    negocio_id: tenantId,
  };

  const productosQuery = supabase.from(PRODUCTOS_TABLE as keyof Database['public']['Tables']) as unknown as InsertProductoQuery;
  const { data, error } = await productosQuery
    .insert(nuevoProducto as unknown as ProductoInsert)
    .select()
    .maybeSingle();
  if (error) {
    throw error;
  }
  return mapProductoRow((data ?? {}) as Record<string, unknown>);
};

export const actualizarProducto = async (id: string, cambios: Partial<Producto>, negocioId?: string): Promise<boolean> => {
  const tenantId = ensureNegocioId(negocioId);

  const payload = { ...cambios, negocio_id: tenantId };
  const query = supabase.from(PRODUCTOS_TABLE as keyof Database['public']['Tables']) as unknown as UpdateProductoQuery;
  const { error } = await query
    .update(payload as unknown as ProductoUpdate)
    .eq('id', id)
    .eq('negocio_id', tenantId);

  if (error) {
    console.error('Error actualizando producto en Supabase:', error);
    return false;
  }
  return true;
};

export const eliminarProducto = async (id: string, negocioId?: string): Promise<boolean> => {
  const tenantId = ensureNegocioId(negocioId);

  const query = supabase.from(PRODUCTOS_TABLE).delete().eq('id', id).eq('negocio_id', tenantId);

  const { error } = await query;
  if (error) {
    console.error('Error eliminando producto en Supabase:', error);
    return false;
  }
  return true;
};

export const saveCatalogData = async (
  nuevosProductos: Producto[],
  infoLocal: Partial<InfoLocal> | undefined,
  categorias: string[],
  negocioId?: string,
): Promise<boolean> => {
  try {
    await saveProductosToCollection(nuevosProductos, negocioId);
    await saveShopConfigData({
      infoLocal,
      categorias,
    }, negocioId);
    return true;
  } catch (error) {
    console.error('No se pudo guardar el catálogo:', error);
    return false;
  }
};

export const isAdminSessionActive = async (): Promise<boolean> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Error verificando sesión de Supabase:', error);
    return false;
  }
  return Boolean(data.session?.user);
};

export const subscribeShopConfigData = (callback: (data: ShopConfigData) => void, negocioId?: string) => {
  if (typeof window === 'undefined') {
    callback({
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
    });
    return () => undefined;
  }

  let latestConfig: Partial<ShopConfigData> | undefined = undefined;
  let latestProductos: Producto[] = [];

  const emitir = () => {
    const merged: ShopConfigData = {
      infoLocal: { ...infoLocalPorDefecto, ...(latestConfig?.infoLocal ?? {}) },
      productos: latestProductos,
      categorias: Array.isArray(latestConfig?.categorias) && latestConfig!.categorias.length ? latestConfig!.categorias : categoriesPorDefecto,
    };
    callback(merged);
  };

  void getShopConfigData(negocioId)
    .then((data) => {
      latestConfig = { infoLocal: data.infoLocal, categorias: data.categorias };
      latestProductos = data.productos;
      emitir();
    })
    .catch((error) => {
      console.warn('Error cargando datos iniciales de Supabase:', error);
    });

  const productosChannel = supabase
    .channel('realtime_productos')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: PRODUCTOS_TABLE,
        ...(negocioId ? { filter: `negocio_id=eq.${negocioId}` } : {}),
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as Partial<Producto> | undefined;
        const oldRow = payload.old as Partial<Producto> | undefined;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRow?.id) {
            latestProductos = latestProductos
              .filter((p) => p.id !== newRow.id)
              .concat(mapProductoRow(newRow as Record<string, unknown>));
          }
        } else if (eventType === 'DELETE') {
          if (oldRow?.id) {
            latestProductos = latestProductos.filter((p) => p.id !== oldRow.id);
          }
        }

        emitir();
      },
    )
    .subscribe();

  const configChannel = supabase
    .channel('realtime_shop_config')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shop_config',
        ...(negocioId ? { filter: `negocio_id=eq.${negocioId}` } : {}),
      },
      (payload) => {
        const newRow = payload.new as { info_local?: Partial<InfoLocal>; categorias?: string[] } | undefined;
        const oldRow = payload.old as { info_local?: Partial<InfoLocal>; categorias?: string[] } | undefined;

        if (payload.eventType === 'DELETE' && oldRow) {
          latestConfig = {
            infoLocal: oldRow.info_local ?? latestConfig?.infoLocal ?? undefined,
            categorias: Array.isArray(oldRow.categorias) ? oldRow.categorias : latestConfig?.categorias ?? categoriesPorDefecto,
          };
          emitir();
          return;
        }

        if (newRow) {
          latestConfig = {
            infoLocal: newRow.info_local ?? latestConfig?.infoLocal ?? undefined,
            categorias: Array.isArray(newRow.categorias) ? newRow.categorias : latestConfig?.categorias ?? categoriesPorDefecto,
          };
          emitir();
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'configuracion',
        ...(negocioId ? { filter: `negocio_id=eq.${negocioId}` } : {}),
      },
      (payload) => {
        const newRow = payload.new as { info_local?: Partial<InfoLocal>; categorias?: string[] } | undefined;
        const oldRow = payload.old as { info_local?: Partial<InfoLocal>; categorias?: string[] } | undefined;

        if (payload.eventType === 'DELETE' && oldRow) {
          latestConfig = {
            infoLocal: oldRow.info_local ?? latestConfig?.infoLocal ?? undefined,
            categorias: Array.isArray(oldRow.categorias) ? oldRow.categorias : latestConfig?.categorias ?? categoriesPorDefecto,
          };
          emitir();
          return;
        }

        if (newRow) {
          latestConfig = {
            infoLocal: newRow.info_local ?? latestConfig?.infoLocal ?? undefined,
            categorias: Array.isArray(newRow.categorias) ? newRow.categorias : latestConfig?.categorias ?? categoriesPorDefecto,
          };
          emitir();
        }
      },
    )
    .subscribe();

  return () => {
    try {
      void supabase.removeChannel(productosChannel);
    } catch {
      // ignore
    }
    try {
      void supabase.removeChannel(configChannel);
    } catch {
      // ignore
    }
  };
};

export const guardarProductosEnFirebase = saveCatalogData;
export const verificarSuscripcion = isAdminSessionActive;
export const suscribirProductos = subscribeShopConfigData;
