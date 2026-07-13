import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface InfoLocal {
  nombre: string;
  descripcion: string;
  telefonoWhatsApp: string;
  direccion: string;
  costoEnvio: number;
  portadaUrl: string;
  avatarUrl: string;
  facebook: string;
  instagram: string;
  cbuCvu: string;
  alias: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  activo?: boolean;
}

export interface TiendaConfigData {
  infoLocal: InfoLocal;
  productos: Producto[];
  categorias: string[];
  updatedAt?: string;
}

export const infoLocalPorDefecto: InfoLocal = {
  nombre: 'Lo de Fiore',
  descripcion: 'Las mejores pizzas y empanadas a la piedra 🍕🔥 ¡Horno de barro!',
  telefonoWhatsApp: '5491165099266',
  direccion: 'Av. Principal 1234, Buenos Aires',
  costoEnvio: 1500,
  portadaUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000',
  avatarUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=150',
  facebook: '@lodefiore',
  instagram: '@lodefiore.ok',
  cbuCvu: '0000003100000000000000',
  alias: 'fiore.pizza.mp',
};

export const productosPorDefecto: Producto[] = [
  {
    id: 'p1',
    nombre: 'Pizza Muzzarella',
    descripcion: 'Salsa de tomate artesanal, abundante muzzarella, aceitunas verdes.',
    precio: 8500,
    categoria: 'pizzas',
    imagen: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=500',
    activo: true,
  },
  {
    id: 'p2',
    nombre: 'Pizza Fugazzeta',
    descripcion: 'Mucha cebolla, muzzarella de primera calidad, olivas negras.',
    precio: 9500,
    categoria: 'pizzas',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500',
    activo: true,
  },
];

export const categoriesPorDefecto = ['pizzas', 'empanadas', 'bebidas', 'promos'];

const normalizeProducto = (producto: Partial<Producto> & { id?: string }): Producto => ({
  id: producto.id ?? `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  nombre: producto.nombre ?? '',
  descripcion: producto.descripcion ?? '',
  precio: Number(producto.precio ?? 0),
  categoria: producto.categoria ?? 'general',
  imagen: producto.imagen ?? '',
  activo: producto.activo ?? true,
});

export const getShopConfigData = async (): Promise<TiendaConfigData> => {
  const docRef = doc(db, 'tienda', 'configuracion');
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return {
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
      updatedAt: new Date().toISOString(),
    };
  }

  const data = snapshot.data() as Partial<TiendaConfigData>;
  const productos = Array.isArray(data.productos)
    ? data.productos.map(normalizeProducto)
    : productosPorDefecto;

  return {
    infoLocal: {
      ...infoLocalPorDefecto,
      ...(data.infoLocal ?? {}),
    },
    productos,
    categorias: Array.isArray(data.categorias) && data.categorias.length > 0 ? data.categorias : categoriesPorDefecto,
    updatedAt: data.updatedAt as string | undefined,
  };
};

export const saveShopConfigData = async (payload: Partial<TiendaConfigData>) => {
  const docRef = doc(db, 'tienda', 'configuracion');
  const data: Partial<TiendaConfigData> = {
    ...(payload.infoLocal ? { infoLocal: payload.infoLocal } : {}),
    ...(payload.productos ? { productos: payload.productos.map(normalizeProducto) } : {}),
    ...(payload.categorias ? { categorias: payload.categorias } : {}),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, data, { merge: true });
};

export const updateProductInStore = async (producto: Producto) => {
  const actual = await getShopConfigData();
  const productosActualizados = actual.productos.some((item) => item.id === producto.id)
    ? actual.productos.map((item) => (item.id === producto.id ? normalizeProducto(producto) : item))
    : [...actual.productos, normalizeProducto(producto)];

  await saveShopConfigData({ productos: productosActualizados });
  return productosActualizados;
};

export const deleteProductFromStore = async (productoId: string) => {
  const actual = await getShopConfigData();
  const productosActualizados = actual.productos.filter((item) => item.id !== productoId);
  await saveShopConfigData({ productos: productosActualizados });
  return productosActualizados;
};

export const updateShopConfigInStore = async (infoLocal: InfoLocal) => {
  await saveShopConfigData({ infoLocal });
};

export const updateCategoriesInStore = async (categorias: string[]) => {
  await saveShopConfigData({ categorias });
};

export const suscribirProductos = (
  onData: (data: TiendaConfigData) => void,
) => {
  const docRef = doc(db, 'tienda', 'configuracion');

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      onData({
        infoLocal: infoLocalPorDefecto,
        productos: productosPorDefecto,
        categorias: categoriesPorDefecto,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const data = snapshot.data() as Partial<TiendaConfigData>;
    const productos = Array.isArray(data.productos)
      ? data.productos.map(normalizeProducto)
      : productosPorDefecto;

    onData({
      infoLocal: {
        ...infoLocalPorDefecto,
        ...(data.infoLocal ?? {}),
      },
      productos,
      categorias: Array.isArray(data.categorias) && data.categorias.length > 0 ? data.categorias : categoriesPorDefecto,
      updatedAt: data.updatedAt as string | undefined,
    });
  });
};

export const guardarProductosEnFirebase = async (
  productos: Producto[],
  infoLocal: InfoLocal,
  categorias: string[],
  suscripcionActiva: boolean,
) => {
  const payload: Partial<TiendaConfigData> = {
    infoLocal,
    productos: productos.map(normalizeProducto),
    categorias,
    updatedAt: new Date().toISOString(),
  };

  await saveShopConfigData(payload);

  return {
    suscripcionActiva,
    actualizado: true,
  };
};

export const verificarSuscripcion = async () => {
  try {
    const docRef = doc(db, 'tienda', 'configuracion');
    const snapshot = await getDoc(docRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error al verificar suscripción:', error);
    return false;
  }
};
