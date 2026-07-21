import { supabase } from './supabase';
import type { InfoLocal, Producto } from './types';
export type { InfoLocal, Producto } from './types';

const CONFIG_ROW_ID = 'config';
const CONFIG_TABLE = 'shop_config';
const PRODUCTOS_TABLE = 'productos';

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
const STORAGE_KEY = 'mi_app_shop_config_v1';

const leerDatosLocales = (): ShopConfigData => {
  if (typeof window === 'undefined') {
    return {
      infoLocal: undefined,
      productos: [],
      categorias: [],
    };
  }

  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (!guardado) {
      return {
        infoLocal: undefined,
        productos: [],
        categorias: [],
      };
    }

    const parsed = JSON.parse(guardado) as Partial<ShopConfigData>;
    return {
      infoLocal: parsed.infoLocal ?? undefined,
      productos: Array.isArray(parsed.productos) ? parsed.productos : [],
      categorias: Array.isArray(parsed.categorias) ? parsed.categorias : [],
    };
  } catch {
    return {
      infoLocal: undefined,
      productos: [],
      categorias: [],
    };
  }
};

const guardarDatosLocales = (data: ShopConfigData) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

const mapProductoRow = (row: any): Producto => ({
  id: row.id ?? '',
  nombre: row.nombre ?? '',
  descripcion: row.descripcion ?? '',
  precio: Number(row.precio ?? 0),
  categoria: row.categoria ?? '',
  imagen: row.imagen ?? '',
  hidden: row.hidden === true,
  activo: row.activo === true,
  negocio_id: row.negocio_id ?? undefined,
});

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prod_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
};

export const getShopConfigData = async (negocioId?: string): Promise<ShopConfigData> => {
  try {
    let configQuery = supabase
      .from(CONFIG_TABLE)
      .select('info_local, categorias');

    if (negocioId) {
      configQuery = configQuery.eq('id', CONFIG_ROW_ID).eq('negocio_id', negocioId);
    } else {
      configQuery = configQuery.eq('id', CONFIG_ROW_ID);
    }

    const { data: configData, error: configError } = await configQuery.maybeSingle();

    if (configError) {
      throw configError;
    }

    let productosQuery = supabase.from(PRODUCTOS_TABLE).select('*');
    if (negocioId) {
      productosQuery = productosQuery.eq('negocio_id', negocioId);
    }

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
      categorias: Array.isArray(configData?.categorias) && configData!.categorias.length ? configData!.categorias : categoriesPorDefecto,
    };
  } catch (error) {
    console.warn('No se pudo leer Supabase, usando almacenamiento local:', error);
    const fallback = leerDatosLocales();
    if (fallback && (fallback.productos.length || fallback.categorias.length || fallback.infoLocal)) return fallback;
    return {
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
    };
  }
};

export type SaveShopConfigDataPayload = Partial<ShopConfigData>;

export const saveProductosToCollection = async (nuevosProductos: Producto[], negocioId?: string): Promise<void> => {
  const productosPayload = nuevosProductos.map((p) => ({
    ...p,
    precio: Number(p.precio ?? 0),
    negocio_id: negocioId ?? p.negocio_id,
  }));

  const { error } = await supabase.from(PRODUCTOS_TABLE).upsert(productosPayload, { onConflict: 'id' });
  if (error) {
    throw error;
  }
};

export const saveShopConfigData = async (
  payload: SaveShopConfigDataPayload,
  negocioId?: string,
): Promise<boolean> => {
  try {
    try {
      const existente = leerDatosLocales();
      const merged: ShopConfigData = {
        infoLocal: payload.infoLocal ?? existente.infoLocal ?? infoLocalPorDefecto,
        productos: payload.productos ?? existente.productos ?? productosPorDefecto,
        categorias: payload.categorias ?? existente.categorias ?? categoriesPorDefecto,
      };
      guardarDatosLocales(merged);
    } catch (err) {
      console.warn('Error actualizando localStorage:', err);
    }

    if (payload.productos !== undefined) {
      await saveProductosToCollection(payload.productos, negocioId);
    }

    if (payload.infoLocal !== undefined || payload.categorias !== undefined) {
      const configPayload: Record<string, unknown> = {
        id: CONFIG_ROW_ID,
      };
      if (payload.infoLocal !== undefined) configPayload.info_local = payload.infoLocal;
      if (payload.categorias !== undefined) configPayload.categorias = payload.categorias;
      if (negocioId) configPayload.negocio_id = negocioId;

      const onConflict = negocioId ? ['id', 'negocio_id'] : 'id';
      const { error } = await supabase.from(CONFIG_TABLE).upsert(configPayload, { onConflict });
      if (error) {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('No se pudo guardar:', error);
    throw error;
  }
};

export const crearProducto = async (producto: Omit<Producto, 'id'>, negocioId?: string): Promise<Producto> => {
  const nuevoProducto: Producto = { ...producto, id: producto.id ?? generateId(), negocio_id: negocioId ?? producto.negocio_id };
  const { data, error } = await supabase.from(PRODUCTOS_TABLE).insert(nuevoProducto).select().maybeSingle();
  if (error) {
    throw error;
  }
  return mapProductoRow(data);
};

export const actualizarProducto = async (id: string, cambios: Partial<Producto>, negocioId?: string): Promise<boolean> => {
  const query = supabase.from(PRODUCTOS_TABLE).update(cambios).eq('id', id);
  if (negocioId) {
    query.eq('negocio_id', negocioId);
  }

  const { error } = await query;
  if (error) {
    console.error('Error actualizando producto en Supabase:', error);
    return false;
  }
  return true;
};

export const eliminarProducto = async (id: string, negocioId?: string): Promise<boolean> => {
  const query = supabase.from(PRODUCTOS_TABLE).delete().eq('id', id);
  if (negocioId) {
    query.eq('negocio_id', negocioId);
  }

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
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRow?.id) {
            latestProductos = latestProductos.filter((p) => p.id !== newRow.id).concat(mapProductoRow(newRow));
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
        table: CONFIG_TABLE,
        ...(negocioId ? { filter: `negocio_id=eq.${negocioId}` } : {}),
      },
      (payload) => {
        const newRow = payload.new as any;
        if (newRow) {
          latestConfig = {
            infoLocal: newRow.info_local ?? undefined,
            categorias: Array.isArray(newRow.categorias) ? newRow.categorias : categoriesPorDefecto,
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
