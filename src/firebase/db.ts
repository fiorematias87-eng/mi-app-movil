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
  hidden?: boolean;
}

interface ShopConfigData {
  infoLocal: Partial<InfoLocal> | null;
  productos: Producto[];
  categorias: string[];
}

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
    hidden: false,
  },
  {
    id: "prod_2",
    nombre: "Limonada",
    descripcion: "Refrescante y natural",
    precio: 700,
    categoria: "bebidas",
    imagen: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=500&q=80",
    hidden: false,
  },
];

export const categoriesPorDefecto: string[] = ["pizzas", "bebidas", "postres"];
const STORAGE_KEY = "mi_app_shop_config_v1";

const leerDatosLocales = (): ShopConfigData => {
  if (typeof window === "undefined") {
    return {
      infoLocal: null,
      productos: [],
      categorias: [],
    };
  }

  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (!guardado) {
      return {
        infoLocal: null,
        productos: [],
        categorias: [],
      };
    }

    const parsed = JSON.parse(guardado) as Partial<ShopConfigData>;
    return {
      infoLocal: parsed.infoLocal ?? null,
      productos: Array.isArray(parsed.productos) ? parsed.productos : [],
      categorias: Array.isArray(parsed.categorias) ? parsed.categorias : [],
    };
  } catch {
    return {
      infoLocal: null,
      productos: [],
      categorias: [],
    };
  }
};

const guardarDatosLocales = (data: ShopConfigData) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

const normalizarDatos = (data: Partial<ShopConfigData> | null | undefined): ShopConfigData => ({
  infoLocal: { ...infoLocalPorDefecto, ...(data?.infoLocal ?? {}) },
  productos: Array.isArray(data?.productos) ? data!.productos : productosPorDefecto,
  categorias: Array.isArray(data?.categorias) ? data!.categorias : categoriesPorDefecto,
});

export const getShopConfigData = async (): Promise<ShopConfigData> => {
  try {
    const snapshot = await getDoc(CONFIG_DOC);
    if (snapshot.exists()) {
      return normalizarDatos(snapshot.data() as Partial<ShopConfigData> | undefined);
    }

    // No existe documento: devolver valores por defecto normalizados
    return normalizarDatos(undefined);
  } catch (error) {
    console.warn("No se pudo leer Firestore, usando almacenamiento local:", error);
    const fallback = leerDatosLocales();
    if (fallback && (fallback.productos.length || fallback.categorias.length || fallback.infoLocal)) return fallback;
    // Si no hay datos locales, devolver valores por defecto
    return {
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
    };
  }
};

export type SaveShopConfigDataPayload = Partial<ShopConfigData>;

export const saveShopConfigData = async (
  payload: SaveShopConfigDataPayload,
): Promise<boolean> => {
  const data: Partial<ShopConfigData> = {};

  if (payload.infoLocal !== undefined) {
    data.infoLocal = payload.infoLocal;
  }

  if (payload.productos !== undefined) {
    data.productos = payload.productos;
  }

  if (payload.categorias !== undefined) {
    data.categorias = payload.categorias;
  }

  try {
    // Guardar en localStorage PRIMERO para feedback inmediato
    try {
      const existente = leerDatosLocales();
      const merged: ShopConfigData = {
        infoLocal: data.infoLocal ?? existente.infoLocal ?? infoLocalPorDefecto,
        productos: data.productos ?? existente.productos ?? productosPorDefecto,
        categorias: data.categorias ?? existente.categorias ?? categoriesPorDefecto,
      };
      guardarDatosLocales(merged);
    } catch (err) {
      console.warn('Error actualizando localStorage:', err);
    }

    // Guardar en Firebase en background sin esperar
    setDoc(CONFIG_DOC, data, { merge: true }).catch((error) => {
      console.error('Error guardando en Firestore:', error);
    });

    return true;
  } catch (error) {
    console.error("No se pudo guardar:", error);
    throw error;
  }
};

export const guardarProductosEnFirebase = async (
  nuevosProductos: Producto[],
  infoLocal: Partial<InfoLocal> | null,
  categorias: string[],
): Promise<boolean> => {
  try {
    // To ensure the collection `productos` is the single source of truth,
    // avoid writing the full products array into the shop/config document.
    // Persist only meta (infoLocal and categorias) in the config doc.
    return await saveShopConfigData({
      infoLocal,
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
    callback({
      infoLocal: infoLocalPorDefecto,
      productos: productosPorDefecto,
      categorias: categoriesPorDefecto,
    });
    return () => undefined;
  }

  try {
    return onSnapshot(CONFIG_DOC, (snapshot) => {
      if (snapshot.exists()) {
        const data = normalizarDatos(snapshot.data() as Partial<ShopConfigData> | undefined);
        callback(data);
        return;
      }

      callback({
        infoLocal: infoLocalPorDefecto,
        productos: productosPorDefecto,
        categorias: categoriesPorDefecto,
      });
    });
  } catch (error) {
    console.warn("No se pudo suscribir a Firestore:", error);
    return () => undefined;
  }
};
