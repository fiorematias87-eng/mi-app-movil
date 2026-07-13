import { db } from "./config";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

export interface InfoLocal {
  nombre: string;
  descripcion: string;
  direccion: string;
  telefonoWhatsApp: string;
  costoEnvio: number;
  portadaUrl: string;
  avatarUrl: string;
  cbuCvu: string;
  alias: string;
  instagram?: string;
  facebook?: string;
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

interface ShopConfigData {
  infoLocal: InfoLocal;
  productos: Producto[];
  categorias: string[];
}

const STORAGE_KEY = "mi_app_movil_shop_data";
const CONFIG_DOC = doc(db, "shop", "config");

export const infoLocalPorDefecto: InfoLocal = {
  nombre: "Mi Local",
  descripcion: "Delicias caseras y atención rápida",
  direccion: "Av. Siempre Viva 742",
  telefonoWhatsApp: "5491112345678",
  costoEnvio: 500,
  portadaUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80",
  avatarUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
  cbuCvu: "0000003100000000000000",
  alias: "mi.local",
  instagram: "",
  facebook: "",
};

export const productosPorDefecto: Producto[] = [
  {
    id: "prod_1",
    nombre: "Pizza Especial",
    descripcion: "Salsa de tomate, muzzarella y jamón",
    precio: 1800,
    categoria: "pizzas",
    imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
    activo: true,
  },
  {
    id: "prod_2",
    nombre: "Limonada",
    descripcion: "Refrescante y natural",
    precio: 700,
    categoria: "bebidas",
    imagen: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=500&q=80",
    activo: true,
  },
];

export const categoriesPorDefecto: string[] = ["pizzas", "bebidas", "postres"];

const leerDatosLocales = (): ShopConfigData => {
  if (typeof window === "undefined") {
    return {
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
    };
  }

  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (!guardado) {
      return {
        infoLocal: infoLocalPorDefecto,
        productos: productosPorDefecto,
        categorias: categoriesPorDefecto,
      };
    }

    const parsed = JSON.parse(guardado) as Partial<ShopConfigData>;
    return {
      infoLocal: { ...infoLocalPorDefecto, ...(parsed.infoLocal ?? {}) },
      productos: Array.isArray(parsed.productos) ? parsed.productos : productosPorDefecto,
      categorias: Array.isArray(parsed.categorias) ? parsed.categorias : categoriesPorDefecto,
    };
  } catch {
    return {
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
    };
  }
};

const guardarDatosLocales = (data: ShopConfigData) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

const normalizarDatos = (data: Partial<ShopConfigData> | null | undefined): ShopConfigData => {
  const fallback = leerDatosLocales();
  return {
    infoLocal: { ...fallback.infoLocal, ...(data?.infoLocal ?? {}) },
    productos: Array.isArray(data?.productos) ? data.productos : fallback.productos,
    categorias: Array.isArray(data?.categorias) ? data.categorias : fallback.categorias,
  };
};

export const getShopConfigData = async (): Promise<ShopConfigData> => {
  const fallback = leerDatosLocales();

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const snapshot = await getDoc(CONFIG_DOC);
    if (snapshot.exists()) {
      const data = normalizarDatos(snapshot.data() as Partial<ShopConfigData> | undefined);
      guardarDatosLocales(data);
      return data;
    }
  } catch (error) {
    console.warn("No se pudo leer Firestore, usando almacenamiento local:", error);
  }

  return fallback;
};

export const saveShopConfigData = async (payload: { infoLocal: InfoLocal; categorias: string[]; productos?: Producto[] }): Promise<boolean> => {
  const data: ShopConfigData = {
    infoLocal: payload.infoLocal,
    productos: payload.productos ?? leerDatosLocales().productos,
    categorias: payload.categorias,
  };

  try {
    await setDoc(CONFIG_DOC, data, { merge: true });
    return true;
  } catch (error) {
    console.error("No se pudo guardar en Firestore:", error);
    throw error;
  }
};

export const guardarProductosEnFirebase = async (
  nuevosProductos: Producto[],
  infoLocal: InfoLocal,
  categorias: string[],
  _suscripcionActiva?: boolean,
): Promise<boolean> => {
  try {
    return await saveShopConfigData({
      infoLocal,
      productos: nuevosProductos,
      categorias,
    });
  } catch (error) {
    console.error("No se pudo guardar el catálogo:", error);
    return false;
  }
};

export const verificarSuscripcion = async (): Promise<boolean> => {
  return true;
};

export const suscribirProductos = (callback: (data: ShopConfigData) => void) => {
  if (typeof window === "undefined") {
    callback(leerDatosLocales());
    return () => undefined;
  }

  const emitir = () => {
    const data = leerDatosLocales();
    callback(data);
  };

  emitir();

  try {
    return onSnapshot(CONFIG_DOC, (snapshot) => {
      if (snapshot.exists()) {
        const data = normalizarDatos(snapshot.data() as Partial<ShopConfigData> | undefined);
        guardarDatosLocales(data);
        callback(data);
      }
    });
  } catch (error) {
    console.warn("No se pudo suscribir a Firestore, usando almacenamiento local:", error);
    return () => undefined;
  }
};
