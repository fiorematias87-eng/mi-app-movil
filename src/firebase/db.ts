import { db } from "./config";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  CollectionReference,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";

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
  infoLocal: Partial<InfoLocal> | undefined;
  productos: Producto[];
  categorias: string[];
}

const CONFIG_DOC = doc(db, "shop", "config");
// Cambiado: la colección de productos ahora es una colección raíz "productos"
const PRODUCTOS_COL: CollectionReference<DocumentData> = collection(db, "productos");

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
    // Leer meta del doc config
    const snapshot = await getDoc(CONFIG_DOC);
    const configData = snapshot.exists() ? (snapshot.data() as Partial<ShopConfigData>) : undefined;

    // Leer productos desde la colección raíz 'productos' (fuente de verdad)
    const productosSnap = await getDocs(PRODUCTOS_COL);
    const productosFromCol: Producto[] = productosSnap.docs.map((d) => {
      const data = d.data() as Partial<Producto>;
      return {
        id: data.id ?? d.id,
        nombre: data.nombre ?? "",
        descripcion: data.descripcion ?? "",
        precio: typeof data.precio === "number" ? data.precio : 0,
        categoria: data.categoria ?? "",
        imagen: data.imagen ?? "",
        hidden: data.hidden ?? false,
      };
    });

    return {
      infoLocal: { ...infoLocalPorDefecto, ...(configData?.infoLocal ?? {}) },
      productos: productosFromCol.length ? productosFromCol : productosPorDefecto,
      categorias: Array.isArray(configData?.categorias) && configData!.categorias.length ? configData!.categorias : categoriesPorDefecto,
    };
  } catch (error) {
    console.warn("No se pudo leer Firestore, usando almacenamiento local:", error);
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

/**
 * Guarda/actualiza productos de forma individual en la colección `productos`.
 * Upsert por product.id.
 */
export const saveProductosToCollection = async (nuevosProductos: Producto[]): Promise<void> => {
  await Promise.all(
    nuevosProductos.map((p) =>
      setDoc(doc(db, "productos", p.id), {
        ...p,
      }),
    ),
  );
};

/**
 * saveShopConfigData ahora solo persiste meta (infoLocal, categorias) en shop/config.
 * Si payload.productos está presente, los persiste en la colección raíz 'productos' via saveProductosToCollection.
 */
export const saveShopConfigData = async (
  payload: SaveShopConfigDataPayload,
): Promise<boolean> => {
  const data: Partial<ShopConfigData> = {};

  if (payload.infoLocal !== undefined) {
    data.infoLocal = payload.infoLocal;
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
        productos: payload.productos ?? existente.productos ?? productosPorDefecto,
        categorias: data.categorias ?? existente.categorias ?? categoriesPorDefecto,
      };
      guardarDatosLocales(merged);
    } catch (err) {
      console.warn('Error actualizando localStorage:', err);
    }

    // Si vienen productos, persistirlos en la colección raíz 'productos' (fuente de verdad)
    if (payload.productos !== undefined) {
      saveProductosToCollection(payload.productos).catch((err) => {
        console.error("Error guardando productos en colección:", err);
      });
    }

    // Guardar meta en Firebase en background sin esperar
    setDoc(CONFIG_DOC, data, { merge: true }).catch((error) => {
      console.error('Error guardando en Firestore (config):', error);
    });

    return true;
  } catch (error) {
    console.error("No se pudo guardar:", error);
    throw error;
  }
};

export const guardarProductosEnFirebase = async (
  nuevosProductos: Producto[],
  infoLocal: Partial<InfoLocal> | undefined,
  categorias: string[],
): Promise<boolean> => {
  try {
    // Persistir productos en colección + meta en config
    await saveProductosToCollection(nuevosProductos);
    await saveShopConfigData({
      infoLocal,
      categorias,
    });
    return true;
  } catch (error) {
    console.error("No se pudo guardar el catálogo:", error);
    return false;
  }
};

export const verificarSuscripcion = async (): Promise<boolean> => {
  return true;
};

/**
 * Suscribe a cambios en la colección `productos` (fuente de verdad) y al doc `shop/config` para meta.
 * Devuelve una función de unsubscribe que limpia ambas suscripciones.
 */
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
    let latestConfig: Partial<ShopConfigData> | undefined = undefined;
    let latestProductos: Producto[] = [];

    const emitir = () => {
      const merged: ShopConfigData = {
        infoLocal: { ...infoLocalPorDefecto, ...(latestConfig?.infoLocal ?? {}) },
        productos: latestProductos.length ? latestProductos : productosPorDefecto,
        categorias: Array.isArray(latestConfig?.categorias) && latestConfig!.categorias.length ? latestConfig!.categorias : categoriesPorDefecto,
      };
      callback(merged);
    };

    const unsubProductos = onSnapshot(PRODUCTOS_COL, (snap: QuerySnapshot<DocumentData>) => {
      latestProductos = snap.docs.map((d) => {
        const data = d.data() as Partial<Producto>;
        return {
          id: data.id ?? d.id,
          nombre: data.nombre ?? "",
          descripcion: data.descripcion ?? "",
          precio: typeof data.precio === "number" ? data.precio : 0,
          categoria: data.categoria ?? "",
          imagen: data.imagen ?? "",
          hidden: data.hidden ?? false,
        };
      });
      emitir();
    }, (err) => {
      console.warn("Error suscribiendo a productos:", err);
    });

    const unsubConfig = onSnapshot(CONFIG_DOC, (snapshot) => {
      if (snapshot.exists()) {
        latestConfig = snapshot.data() as Partial<ShopConfigData>;
      } else {
        latestConfig = undefined;
      }
      emitir();
    }, (err) => {
      console.warn("Error suscribiendo a config:", err);
    });

    return () => {
      try { unsubProductos(); } catch {}
      try { unsubConfig(); } catch {}
    };
  } catch (error) {
    console.warn("No se pudo suscribir a Firestore:", error);
    return () => undefined;
  }
};
