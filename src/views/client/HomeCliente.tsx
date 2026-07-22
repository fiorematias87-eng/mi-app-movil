// src/views/client/HomeCliente.tsx
import React, { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ShoppingCart, Star, Minus, Plus, X, MapPin, Search, Trash2, ExternalLink, MessageSquare, ShoppingBag, Lock } from 'lucide-react';
import AdminPanel from '../../components/AdminPanel';
import EsqueletoCarga from '../../components/EsqueletoCarga';
import { supabase } from '../../supabase';
import { saveShopConfigData, uploadImageToSupabaseStorage } from '../../db';
import { useNegocio } from '../../context/NegocioContext';
import type { Producto, InfoLocal } from '../../types';

interface ItemDelCarrito {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

type MetodoPago = 'efectivo' | 'transferencia';

type ShopConfigDataState = {
  infoLocal?: Partial<InfoLocal>;
  productos: Producto[];
  categorias: string[];
};

export interface HomeClienteProps {
  productos: Producto[];
  infoLocal: Partial<InfoLocal> | null;
  categorias: string[];
}

export default function HomeCliente({ productos, infoLocal, categorias }: HomeClienteProps) {
  const [infoLocalState, setInfoLocalState] = useState<Partial<InfoLocal> | null>(infoLocal ?? null);
  const [productosState, setProductosState] = useState<Producto[]>(productos);
  const [categoriasState, setCategoriasState] = useState<string[]>(categorias);
  const [contadorPedidos, setContadorPedidos] = useState<number>(() => Number(localStorage.getItem('local_pedidos_count') || '0'));
  const [cajaAcumulada, setCajaAcumulada] = useState<number>(() => Number(localStorage.getItem('local_caja_acumulada') || '0'));
  const [isAdminAutenticado, setIsAdminAutenticado] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [animarCarrito, setAnimarCarrito] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [carrito, setCarrito] = useState<ItemDelCarrito[]>([]);
  const [vistaActual, setVistaActual] = useState<'menu' | 'carrito' | 'admin'>('menu');
  const [busqueda, setBusqueda] = useState('');

  // Timeout de seguridad para evitar que subiendoImagen se quede en true
  useEffect(() => {
    if (subiendoImagen) {
      const timeoutId = window.setTimeout(() => {
        console.warn('Timeout de carga detectado, reseteando subiendoImagen');
        setSubiendoImagen(false);
      }, 30000); // 30 segundos máximo
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [subiendoImagen]);

  // Resetear subiendoImagen al cambiar de vista
  useEffect(() => {
    if (vistaActual !== 'admin') {
      setSubiendoImagen(false);
    }
  }, [vistaActual]);
  const [nombre, setNombre] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('cliente_nombre') || '';
  });
  const [telefono, setTelefono] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('cliente_telefono') || '';
  });
  const [direccion, setDireccion] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('cliente_direccion') || '';
  });
  const [entreCalles, setEntreCalles] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('cliente_entrecalles') || '';
  });
  const [gmapsLink, setGmapsLink] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('cliente_gmaps') || '';
  });
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [pagaCon, setPagaCon] = useState<string>('');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('pizzas');
  const [infoLocalCacheVersion, setInfoLocalCacheVersion] = useState(0);
  const [productosCacheVersion, setProductosCacheVersion] = useState(0);
  const { negocioId: negocioIdFromContext, loading: negocioLoading } = useNegocio();
  const negocioId = negocioIdFromContext ?? undefined;
  const configuracion = infoLocalState ?? undefined;

  useEffect(() => {
    const cargarProductosPorNegocio = async () => {
      if (!negocioId) return;

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('negocio_id', negocioId);

      if (error) {
        console.error('Error cargando productos para negocio:', error.message);
        return;
      }

      if (Array.isArray(data)) {
        const productosDelNegocio = data as Array<Record<string, unknown>>;
        setProductosState(productosDelNegocio.map((producto) => ({
          id: typeof producto.id === 'string' ? producto.id : '',
          nombre: typeof producto.nombre === 'string' ? producto.nombre : '',
          descripcion: typeof producto.descripcion === 'string' ? producto.descripcion : '',
          precio: Number(producto.precio ?? 0),
          categoria: typeof producto.categoria === 'string' ? producto.categoria : '',
          imagen: typeof producto.imagen === 'string' ? producto.imagen : '',
          activo: producto.activo === true,
          hidden: producto.hidden === true,
          negocio_id: typeof producto.negocio_id === 'string' ? producto.negocio_id : undefined,
        })));
      }
    };

    // Only attempt to load after tenant resolved (negocioId present)
    void cargarProductosPorNegocio();
  }, [negocioId]);

  const getCacheBustedUrl = (url: string, version: number) => {
    if (!url?.trim()) return '';
    if (url.startsWith('data:')) return url;
    const stamp = version > 0 ? version : Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${stamp}`;
  };

  const infoLocalValues: InfoLocal = {
    nombre: configuracion?.nombre ?? '',
    descripcion: configuracion?.descripcion ?? '',
    direccion: configuracion?.direccion ?? '',
    telefonoWhatsApp: configuracion?.telefonoWhatsApp ?? '',
    costoEnvio: configuracion?.costoEnvio ?? 0,
    portadaUrl: configuracion?.portadaUrl ?? '',
    avatarUrl: configuracion?.avatarUrl ?? '',
    cbuCvu: configuracion?.cbuCvu ?? '',
    alias: configuracion?.alias ?? '',
    instagram: configuracion?.instagram ?? '',
    facebook: configuracion?.facebook ?? '',
  };

  const perfilVacio = !infoLocalState;

  useEffect(() => {
    setInfoLocalState(infoLocal ?? null);
    setProductosState(
      Array.isArray(productos)
        ? productos.map((producto) => ({
            ...producto,
            activo: producto.activo ?? false,
            hidden: producto.hidden === true,
          }))
        : []
    );
    setCategoriasState(Array.isArray(categorias) ? categorias : []);
    setLoadingDatos(false);
  }, [infoLocal, productos, categorias]);

  useEffect(() => {
    if (categoriasState.length > 0 && !categoriasState.includes(categoriaActiva)) {
      setCategoriaActiva(categoriasState[0]);
    }
  }, [categoriasState, categoriaActiva]);

  useEffect(() => {
    const channel = supabase
      .channel('shop_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        (payload) => {
          const nuevoProducto = payload.new as Producto | undefined;
          const productoAnterior = payload.old as Producto | undefined;

          if (payload.eventType === 'INSERT' && nuevoProducto) {
            setProductosState((prev) => {
              if (prev.some((producto) => producto.id === nuevoProducto.id)) {
                return prev;
              }
              return [...prev, {
                ...nuevoProducto,
                activo: nuevoProducto.activo ?? false,
                hidden: nuevoProducto.hidden === true,
              }];
            });
            return;
          }

          if (payload.eventType === 'UPDATE' && nuevoProducto) {
            setProductosState((prev) => prev.map((producto) => {
              if (producto.id !== nuevoProducto.id) {
                return producto;
              }

              return {
                ...producto,
                ...nuevoProducto,
                activo: nuevoProducto.activo ?? producto.activo ?? false,
                hidden: nuevoProducto.hidden === true,
              };
            }));
            return;
          }

          if (payload.eventType === 'DELETE' && productoAnterior) {
            setProductosState((prev) => prev.filter((producto) => producto.id !== productoAnterior.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_config' },
        (payload) => {
          const configNueva = payload.new as { info_local?: Partial<InfoLocal>; categorias?: string[] } | undefined;
          const configAnterior = payload.old as { info_local?: Partial<InfoLocal>; categorias?: string[] } | undefined;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (configNueva?.info_local) {
              setInfoLocalState((prev) => ({ ...(prev ?? {}), ...configNueva.info_local }));
            }

            if (Array.isArray(configNueva?.categorias)) {
              setCategoriasState(configNueva.categorias);
              setCategoriaActiva((prev) => (configNueva.categorias!.includes(prev) ? prev : configNueva.categorias![0] ?? 'pizzas'));
            }
            return;
          }

          if (payload.eventType === 'DELETE' && configAnterior) {
            if (configAnterior.info_local) {
              setInfoLocalState((prev) => ({ ...(prev ?? {}), ...configAnterior.info_local }));
            }

            if (Array.isArray(configAnterior.categorias)) {
              setCategoriasState(configAnterior.categorias);
              setCategoriaActiva((prev) => (configAnterior.categorias!.includes(prev) ? prev : configAnterior.categorias![0] ?? 'pizzas'));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // El estado se actualiza desde App mediante la suscripción global de Supabase.

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminAutenticado(Boolean(session?.user));
      if (!session?.user) {
        setAuthError(null);
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliente_nombre', nombre);
    }
  }, [nombre]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliente_telefono', telefono);
    }
  }, [telefono]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliente_direccion', direccion);
    }
  }, [direccion]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliente_entrecalles', entreCalles);
    }
  }, [entreCalles]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliente_gmaps', gmapsLink);
    }
  }, [gmapsLink]);

  const reproducirSonidoExito = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
    audio.volume = 0.3;
    audio.play().catch(() => {
      console.log('Audio bloqueado por el navegador del cliente hasta la primera interacción.');
    });
  };

  const persistirInfoLocalEnSupabase = async (campo: 'portadaUrl' | 'avatarUrl', urlNube: string) => {
    const nuevaInfoLocal = {
      ...(infoLocalState ?? {}),
      [campo]: urlNube,
    };

    setInfoLocalState(nuevaInfoLocal);
    await saveShopConfigData({
      infoLocal: nuevaInfoLocal,
      categorias: categoriasState,
      productos: productosState,
    }, negocioId);
  };

  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    tipo: 'portada' | 'avatar' | 'producto',
    productId?: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return undefined;

    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return undefined;
    }

    setSubiendoImagen(true);

    try {
      const urlNube = await uploadImageToSupabaseStorage(file, negocioId, tipo, productId);

      if (tipo === 'producto') {
        return urlNube;
      }

      const campo = tipo === 'portada' ? 'portadaUrl' : 'avatarUrl';
      await persistirInfoLocalEnSupabase(campo, urlNube);
      return urlNube;
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      const mensaje = error instanceof Error ? error.message : 'No se pudo subir la imagen.';
      alert(mensaje);
      return undefined;
    } finally {
      setSubiendoImagen(false);
    }
  };

  const iniciarSesionAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      });
      if (error) {
        throw error;
      }
      setAdminEmail('');
      setAdminPassword('');
      setIsAdminAutenticado(true);
      setVistaActual('admin');
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      setAuthError(mensaje);
    } finally {
      setAuthLoading(false);
    }
  };

  const accederAlAdminSeguro = () => {
    if (isAdminAutenticado) {
      setVistaActual('admin');
    } else {
      setVistaActual('admin');
      setAuthError(null);
    }
  };

  const cerrarSesionAdmin = async () => {
    if (window.confirm('¿Querés cerrar sesión en este dispositivo?')) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
      setIsAdminAutenticado(false);
      setVistaActual('menu');
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev: ItemDelCarrito[]) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        return prev.map((item) => (item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
      }

      return [...prev, {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
      }];
    });

    setAnimarCarrito(true);
    window.setTimeout(() => setAnimarCarrito(false), 350);
    reproducirSonidoExito();
  };

  const modificarCantidad = (id: string, accion: 'sumar' | 'restar') => {
    setCarrito((prev: ItemDelCarrito[]) => prev.flatMap((item) => {
      if (item.id !== id) return [item];
      if (accion === 'sumar') return [{ ...item, cantidad: item.cantidad + 1 }];
      if (item.cantidad <= 1) return [];
      return [{ ...item, cantidad: item.cantidad - 1 }];
    }));
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    setVistaActual('menu');
  };

  const abrirGoogleMapsExterno = () => {
    const query = (gmapsLink || `${direccion} ${entreCalles}`.trim() || infoLocalValues.direccion).trim();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const ejecutarCierreCaja = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('local_pedidos_count', '0');
      window.localStorage.setItem('local_caja_acumulada', '0');
    }
    setContadorPedidos(0);
    setCajaAcumulada(0);
  };

  const enviarPedidoWhatsApp = (e: FormEvent) => {
    e.preventDefault();

    const itemsTexto = carrito.map((item) => `• ${item.nombre} x${item.cantidad}`).join('\n');
    const total = subtotalCarrito + infoLocalValues.costoEnvio;
    const mensaje = [
      `Hola ${infoLocalValues.nombre || 'local'} 👋`,
      '',
      'Nuevo pedido:',
      itemsTexto,
      '',
      `Cliente: ${nombre}`,
      `Teléfono: ${telefono}`,
      `Dirección: ${direccion}`,
      `Entre calles: ${entreCalles}`,
      `Pago: ${metodoPago === 'efectivo' ? `Efectivo${pagaCon ? ` - Paga con ${pagaCon}` : ''}` : 'Transferencia'}`,
      `Total: $${total.toLocaleString('es-AR')}`,
      '',
      gmapsLink ? `Link ubicación: ${gmapsLink}` : '',
    ].filter(Boolean).join('\n');

    const telefonoDestino = infoLocalValues.telefonoWhatsApp?.replace(/\D/g, '');
    if (telefonoDestino) {
      const url = `https://wa.me/${telefonoDestino}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    setCarrito([]);
    setVistaActual('menu');
    setPagaCon('');

    setContadorPedidos((prev: number) => {
      const siguiente = prev + 1;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('local_pedidos_count', String(siguiente));
      }
      return siguiente;
    });

    setCajaAcumulada((prev: number) => {
      const siguiente = prev + total;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('local_caja_acumulada', String(siguiente));
      }
      return siguiente;
    });
  };

  if (negocioLoading || loadingDatos) {
    return <EsqueletoCarga />;
  }

  const cantidadTotalProductos = carrito.reduce((acc: number, item: ItemDelCarrito) => acc + item.cantidad, 0);
  const subtotalCarrito = carrito.reduce((acc: number, item: ItemDelCarrito) => acc + item.precio * item.cantidad, 0);

  const productosFiltradosCliente = productosState.filter((p: Producto) => {
    const estaActivo = !(p.hidden === true);
    const coincideCategoria = p.categoria === categoriaActiva;
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return busqueda.trim() !== ''
      ? estaActivo && coincideBusqueda
      : estaActivo && coincideCategoria && coincideBusqueda;
  });

  return (
    <div className="max-w-md mx-auto bg-neutral-900 min-h-screen pb-24 shadow-2xl relative font-sans text-white border-x border-neutral-800">
      {subiendoImagen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-500 text-neutral-950 px-6 py-4 rounded-2xl font-black text-sm z-50 shadow-2xl pointer-events-none flex flex-col items-center gap-2">
            <div className="animate-spin text-2xl">⏳</div>
            <span>Guardando en la nube...</span>
          </div>
        </>
      )}

      {vistaActual === 'menu' && cantidadTotalProductos > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
          <button
            onClick={() => setVistaActual('carrito')}
            className={`w-full text-neutral-950 font-black py-3 px-4 rounded-2xl flex items-center justify-between shadow-xl transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${
              animarCarrito
                ? 'scale-110 bg-gradient-to-r from-emerald-400 to-teal-500'
                : 'scale-100 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:opacity-90'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="bg-neutral-950 text-yellow-400 font-extrabold text-xs w-6 h-6 rounded-lg flex items-center justify-center">{cantidadTotalProductos}</div>
              <span className="text-xs uppercase tracking-wider">Ver Mi Carrito</span>
            </div>
            <div className="flex items-center gap-1 font-black text-sm">
              <span>${subtotalCarrito.toLocaleString('es-AR')}</span>
              <ShoppingCart size={16} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      )}

      {vistaActual === 'menu' && (
        <>
          <div className="h-44 bg-cover bg-center relative" style={infoLocalValues.portadaUrl ? { backgroundImage: `url(${getCacheBustedUrl(infoLocalValues.portadaUrl, infoLocalCacheVersion)})` } : undefined}>
            <div className="absolute inset-0 bg-black/30" />
            {!infoLocalValues.portadaUrl && (
              <div className="absolute inset-0 bg-neutral-950/80 flex items-center justify-center text-xs text-neutral-400">
                Portada no configurada. Cargá una imagen desde el panel admin.
              </div>
            )}
          </div>
          <div className="px-4 -mt-14 relative flex flex-col items-center text-center mb-2">
            {infoLocalValues.avatarUrl ? (
              <img src={getCacheBustedUrl(infoLocalValues.avatarUrl, infoLocalCacheVersion)} alt="Logo" className="w-24 h-24 rounded-full border-4 border-sky-400 object-cover shadow-xl bg-neutral-900" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-neutral-700 bg-neutral-950 flex items-center justify-center text-xs text-neutral-400 shadow-xl">
                Sin logo
              </div>
            )}
            <div className="flex gap-1 mt-2 text-yellow-500">
              <Star size={16} fill="currentColor" className="float-slow" style={{ animationDelay: '0s' }} />
              <Star size={20} fill="currentColor" className="-mt-1 float-slower" style={{ animationDelay: '0.12s' }} />
              <Star size={16} fill="currentColor" className="float-slow" style={{ animationDelay: '0.24s' }} />
            </div>
            <h1 className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-sky-400 tracking-tight">{infoLocalValues.nombre || 'Nombre no definido'}</h1>
            <p className="text-xs text-neutral-400 font-medium px-4 mt-1">{infoLocalValues.descripcion || 'Descripción no configurada.'}</p>

            <div className="flex gap-4 mt-3 text-neutral-400">
              {infoLocalValues.instagram && <a href={`https://instagram.com/${infoLocalValues.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/50">📸 Insta</a>}
              {infoLocalValues.facebook && <a href={`https://facebook.com/${infoLocalValues.facebook.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/50">🔵 Face</a>}
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-sky-400 font-semibold bg-sky-950/40 px-3 py-1 rounded-full border border-sky-900/40"><MapPin size={13} /><span>{infoLocalValues.direccion || 'Dirección no disponible'}</span></div>
          </div>

          <div className="px-4 py-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="¿Qué estás buscando? Escribí acá..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-750 rounded-xl py-2.5 pl-10 pr-8 text-xs text-white focus:outline-none focus:border-sky-400 transition-colors placeholder-neutral-500"
              />
              {busqueda && <X size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer" onClick={() => setBusqueda('')} />}
            </div>
          </div>

          {busqueda.trim() === '' && (
            <div className="flex gap-2 overflow-x-auto px-4 py-2 sticky top-0 bg-neutral-900/90 backdrop-blur-md z-10 scrollbar-none">
              {categoriasState.map((cat) => (
                <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-5 py-2.5 rounded-full capitalize font-black text-xs tracking-wider transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${categoriaActiva === cat ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-neutral-950 shadow-md hover:shadow-lg' : 'bg-neutral-800 text-neutral-400 hover:opacity-90'}`}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 mt-2 space-y-3">
            {productosFiltradosCliente.length === 0 ? (
              <p className="text-center py-6 text-neutral-500 text-xs">No hay productos disponibles en esta sección.</p>
            ) : (
              productosFiltradosCliente.map((producto) => (
                <div key={producto.id} className="bg-neutral-800/80 p-3 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-100 ease-in-out active:scale-95 active:shadow-lg border border-neutral-700/30 hover:border-sky-500/20 items-center justify-between flex gap-3">
                  <img src={getCacheBustedUrl(producto.imagen, productosCacheVersion)} alt={producto.nombre} className="w-20 h-20 rounded-xl object-cover bg-neutral-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{producto.nombre}</h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">{producto.descripcion}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-black text-yellow-500 text-lg">${producto.precio.toLocaleString('es-AR')}</span>
                      <button onClick={() => agregarAlCarrito(producto)} className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 p-2 rounded-xl transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90"><ShoppingCart size={15} strokeWidth={3} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {vistaActual === 'carrito' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-white">🛒 Tu Pedido</h2>
            {carrito.length > 0 && (
              <button type="button" onClick={vaciarCarrito} className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-red-500/20"><Trash2 size={13} /> Vaciar</button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-neutral-500 text-sm">El carrito está vacío.</p>
              <button onClick={() => setVistaActual('menu')} className="bg-neutral-800 text-sky-400 font-bold text-xs px-4 py-2 rounded-full border border-neutral-700/60 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-neutral-700/80">Volver al menú</button>
            </div>
          ) : (
            <form onSubmit={enviarPedidoWhatsApp} className="space-y-5">
              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-4 border border-neutral-700/30">
                {carrito.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-neutral-700/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1"><h4 className="font-bold text-white text-sm">{item.nombre}</h4><p className="text-xs text-neutral-400">${item.precio.toLocaleString('es-AR')} c/u</p></div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => modificarCantidad(item.id, 'restar')} className="bg-neutral-900 p-1 rounded text-neutral-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-neutral-800"><Minus size={12}/></button>
                      <span className="font-bold text-sm px-1">{item.cantidad}</span>
                      <button type="button" onClick={() => modificarCantidad(item.id, 'sumar')} className="bg-neutral-900 p-1 rounded text-neutral-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-neutral-800"><Plus size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-3 border border-neutral-700/30">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black tracking-widest text-sky-400 uppercase">Datos de Entrega</h3>
                  <button type="button" onClick={abrirGoogleMapsExterno} className="flex items-center gap-1.5 text-[11px] font-black bg-gradient-to-r from-sky-400 to-sky-500 text-neutral-950 px-3 py-2 rounded-xl shadow-md transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90 hover:shadow-lg">
                    🗺️ Abrir Google Maps <ExternalLink size={11} />
                  </button>
                </div>

                <input type="text" placeholder="Nombre y Apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                <input type="tel" placeholder="Teléfono de contacto" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                <input type="text" placeholder="Calle y Número (Ej: Av Belgrano 450)" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                <input type="text" placeholder="¿Entre qué calles o indicaciones de fachada?" value={entreCalles} onChange={(e) => setEntreCalles(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />

                <div className="pt-2 border-t border-neutral-700/40">
                  <label className="text-[10px] text-yellow-400 font-bold block mb-1">¿Pegaste el link de tu ubicación aquí abajo?</label>
                  <input
                    type="text"
                    placeholder="Mantené apretado acá y elegí 'Pegar'..."
                    value={gmapsLink}
                    onChange={(e) => setGmapsLink(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-sky-400 placeholder-neutral-600 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[9px] text-neutral-500 mt-1">Sirve para que el delivery llegue sin perderse usando el GPS.</p>
                </div>
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-4 border border-neutral-700/30">
                <h3 className="text-xs font-black tracking-widest text-sky-400 uppercase">Forma de Pago</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMetodoPago('efectivo')} className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${metodoPago === 'efectivo' ? 'bg-sky-950/40 border-sky-400 text-sky-400' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400 hover:bg-neutral-800/80'}`}>💵 Efectivo</button>
                  <button type="button" onClick={() => setMetodoPago('transferencia')} className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${metodoPago === 'transferencia' ? 'bg-sky-950/40 border-sky-400 text-sky-400' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400 hover:bg-neutral-800/80'}`}>📱 Transferencia</button>
                </div>
                {metodoPago === 'efectivo' ? (
                  <input type="number" placeholder="¿Con cuánto vas a pagar? (Para vuelto)" value={pagaCon} onChange={(e) => setPagaCon(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-4 text-sm text-white" />
                ) : (
                  <div className="bg-neutral-900/80 p-3 rounded-xl text-xs text-neutral-300">
                    <p className="font-bold text-yellow-500">Datos de transferencia:</p>
                    <p>Alias: {infoLocalValues.alias}</p><p>CVU: {infoLocalValues.cbuCvu}</p>
                  </div>
                )}
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 text-sm space-y-1">
                <div className="flex justify-between text-neutral-400"><span>Subtotal:</span><span>${subtotalCarrito.toLocaleString('es-AR')}</span></div>
                <div className="flex justify-between text-neutral-400"><span>Envío:</span><span>${infoLocalValues.costoEnvio.toLocaleString('es-AR')}</span></div>
                <div className="flex justify-between font-black text-white text-base mt-2"><span>Total Final:</span><span className="text-yellow-500">${(subtotalCarrito + infoLocalValues.costoEnvio).toLocaleString('es-AR')}</span></div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:shadow-xl"><MessageSquare size={18} fill="currentColor" />Enviar por WhatsApp</button>
            </form>
          )}
        </div>
      )}

      {vistaActual === 'admin' && (
        !isAdminAutenticado ? (
          <div className="p-4">
            <div className="rounded-2xl border border-neutral-700/40 bg-neutral-800/70 p-4 space-y-3">
              <div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">🔐 Acceso administrativo</h2>
                <p className="text-[11px] text-neutral-400 mt-1">Ingresá tu correo y contraseña de Firebase para administrar la tienda.</p>
              </div>
              <form onSubmit={iniciarSesionAdmin} className="space-y-2">
                <input type="email" placeholder="Correo del administrador" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" required />
                <input type="password" placeholder="Contraseña" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" required />
                {authError && <p className="text-[11px] text-red-400">{authError}</p>}
                <button type="submit" disabled={authLoading} className="w-full rounded-xl bg-sky-500 text-neutral-950 font-black py-2.5 text-xs uppercase tracking-wider disabled:opacity-60">
                  {authLoading ? 'Verificando...' : 'Ingresar al panel'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <AdminPanel
            infoLocal={infoLocalState}
            setInfoLocal={setInfoLocalState}
            productos={productosState}
            setProductos={setProductosState}
            categorias={categoriasState}
            setCategorias={setCategoriasState}
            contadorPedidos={contadorPedidos}
            cajaAcumulada={cajaAcumulada}
            onCerrarSesion={cerrarSesionAdmin}
            onVolverMenu={() => setVistaActual('menu')}
            onEjecutarCierreCaja={ejecutarCierreCaja}
            subiendoImagen={subiendoImagen}
            onFileChange={handleFileChange}
          />
        )
      )}

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex justify-around items-center py-3 rounded-t-2xl z-30">
        <button onClick={() => setVistaActual('menu')} className={`flex flex-col items-center transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${vistaActual === 'menu' ? 'text-sky-400 font-bold' : 'text-neutral-500 hover:text-sky-400'}`}>
          <ShoppingBag size={20} /><span className="text-[10px] mt-1">Menú</span>
        </button>

        <button onClick={() => setVistaActual('carrito')} className={`flex flex-col items-center relative transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${vistaActual === 'carrito' ? 'text-sky-400 font-bold' : 'text-neutral-500 hover:text-sky-400'}`}>
          <ShoppingCart size={20} /><span className="text-[10px] mt-1">Carrito</span>
          {cantidadTotalProductos > 0 && <span className="absolute -top-1 right-2 bg-sky-500 text-neutral-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cantidadTotalProductos}</span>}
        </button>

        <button onClick={accederAlAdminSeguro} className={`flex items-center gap-2 p-2 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${vistaActual === 'admin' ? 'text-sky-400 bg-neutral-800/60' : 'text-neutral-400 hover:text-sky-400'}`} aria-label="Acceso administrativo">
          <Lock size={16} />
          <span className="text-[10px] hidden">Admin</span>
        </button>
      </div>
    </div>
  );
}
