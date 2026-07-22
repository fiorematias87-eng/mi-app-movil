import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  DollarSign,
  User,
  Camera,
  CreditCard,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';
import {
  guardarProductosEnFirebase,
  saveShopConfigData,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  type InfoLocal,
  type Producto,
  verificarSuscripcion,
} from '../db';
import { supabase } from '../supabase';
import { useNegocio } from '../context/NegocioContext';
import { syncPerfilNegocio } from '../services/tenant.service';

interface AdminPanelProps {
  infoLocal: Partial<InfoLocal> | null | undefined;
  setInfoLocal: React.Dispatch<React.SetStateAction<Partial<InfoLocal> | null>>;
  productos: Producto[];
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
  categorias: string[];
  setCategorias: React.Dispatch<React.SetStateAction<string[]>>;
  contadorPedidos: number;
  cajaAcumulada: number;
  onCerrarSesion: () => void;
  onVolverMenu: () => void;
  onEjecutarCierreCaja: () => void;
  subiendoImagen: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>, tipo: 'portada' | 'avatar' | 'producto', productId?: string) => Promise<string | undefined>;
  onInitialized?: () => void; // opcional: sólo añadir si realmente la usas desde App.tsx
}

type ProductoFormState = {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  hidden: boolean;
};

const crearProductoForm = (categoriaInicial: string): ProductoFormState => ({
  nombre: '',
  descripcion: '',
  precio: 0,
  categoria: categoriaInicial,
  imagen: '',
  hidden: false,
});

const esUrlValida = (valor: string): boolean => {
  if (!valor.trim()) return false;

  try {
    const url = new URL(valor);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export default function AdminPanel({
  infoLocal,
  setInfoLocal,
  productos,
  setProductos,
  categorias,
  setCategorias,
  contadorPedidos,
  cajaAcumulada,
  onCerrarSesion,
  onVolverMenu,
  onEjecutarCierreCaja,
  subiendoImagen,
  onFileChange,
  onInitialized,
}: AdminPanelProps) {
  const [seccionAdminAbierta, setSeccionAdminAbierta] = useState<string | null>('productos');
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null);
  const [nuevaCat, setNuevaCat] = useState('');
  const [mostrarFormularioProd, setMostrarFormularioProd] = useState(false);
  const [categoriaAdminActiva, setCategoriaAdminActiva] = useState<string>(categorias[0] ?? 'pizzas');
  
  const [prodForm, setProdForm] = useState<ProductoFormState>(crearProductoForm(categorias[0] ?? 'pizzas'));
  const [productoImageUrl, setProductoImageUrl] = useState<string>('');
  const [busquedaAdmin, setBusquedaAdmin] = useState('');
  const [suscripcionActiva, setSuscripcionActiva] = useState<boolean | null>(null);
  const [suscripcionCargando, setSuscripcionCargando] = useState(true);
  const [errorSuscripcion, setErrorSuscripcion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [imageCacheVersion, setImageCacheVersion] = useState(0);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);
  const { negocioId: negocioIdFromContext } = useNegocio();
  const negocioId = negocioIdFromContext ?? undefined;

  useEffect(() => {
    let activo = true;

    const verificarAdmin = async () => {
      try {
        const {
          data: { user },
          error: errorUser,
        } = await supabase.auth.getUser();

        if (errorUser || !user) {
          await supabase.auth.signOut();

          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }

          if (activo) {
            setEsAdmin(false);
          }
          return;
        }

        if (!negocioId) {
          if (activo) {
            setEsAdmin(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('perfiles')
          .select('rol, negocio_id')
          .eq('id', user.id)
          .maybeSingle<{ rol: string | null; negocio_id: string | null }>();

        if (error) {
          throw error;
        }

        const perfilActualizado = await syncPerfilNegocio(
          user.id,
          negocioId,
          data?.rol ?? 'admin',
        );

        if (activo) {
          setEsAdmin(perfilActualizado?.rol === 'admin');
        }
      } catch (error) {
        console.error('Error verificando permisos de administrador:', error);

        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn('No se pudo cerrar la sesión tras el error de autenticación:', signOutError);
        }

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        if (activo) {
          setEsAdmin(false);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    void verificarAdmin();

    return () => {
      activo = false;
    };
  }, [negocioId]);

  useEffect(() => {
    console.log('AdminPanel montado', {
      infoLocal,
      productosLength: productos.length,
      categoriasLength: categorias.length,
    });

    if (!infoLocal) {
      console.warn('AdminPanel: infoLocal es null o undefined al montar el componente');
    }
  }, []);

  const getCacheBustedUrl = (url?: string) => {
    if (!url) return '';
    const stamp = imageCacheVersion || Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${stamp}`;
  };

  useEffect(() => {
    let activo = true;

    const chequearSuscripcion = async () => {
      try {
        setSuscripcionCargando(true);
        const estado = await verificarSuscripcion();
        if (!activo) return;
        setSuscripcionActiva(estado);
        setErrorSuscripcion(null);
      } catch (error) {
        console.error('Error al verificar suscripción:', error);
        if (activo) {
          setSuscripcionActiva(false);
          setErrorSuscripcion('No se pudo verificar el acceso de edición.');
        }
      } finally {
        if (activo) setSuscripcionCargando(false);
      }
    };

    void chequearSuscripcion();
    return () => {
      activo = false;
    };
  }, []);

  const textoBusqueda = busquedaAdmin.trim().toLowerCase();

  const productosFiltradosAdmin = useMemo(() => {
    if (!productos?.length) return [];

    return productos.filter((p) => {
      const nombre = (p.nombre ?? '').toLowerCase();
      const descripcion = (p.descripcion ?? '').toLowerCase();

      if (textoBusqueda !== '') {
        return nombre.includes(textoBusqueda) || descripcion.includes(textoBusqueda);
      }

      return p.categoria === categoriaAdminActiva;
    });
  }, [productos, textoBusqueda, categoriaAdminActiva]);

  const handleInfoLocalInputChange = useCallback(
    (campo: keyof InfoLocal, valor: string | number) => {
      setInfoLocal((prev) => ({
        ...(prev ?? {}),
        [campo]: valor,
      }));
    },
    [setInfoLocal]
  );

  const persistInfoLocalChanges = useCallback(async () => {
    if (!negocioId) return;

    try {
      await saveShopConfigData(
        {
          infoLocal: infoLocal ?? {},
          categorias,
          productos,
        },
        negocioId
      );
    } catch (err) {
      console.error('Error guardando infoLocal:', err);
    }
  }, [negocioId, infoLocal, categorias, productos]);

  const handleGuardarProducto = async () => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    if (!prodForm.nombre.trim() || !prodForm.precio) return;
    if (subiendoImagen) {
      alert('Espera a que la imagen termine de subir antes de guardar el producto.');
      return;
    }

    const imagenValida =
      prodForm.imagen.trim() !== '' && esUrlValida(prodForm.imagen.trim());

    const imagenFinal = imagenValida
      ? prodForm.imagen.trim()
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';

    const campos: Omit<Producto, 'id'> = {
      nombre: prodForm.nombre.trim(),
      descripcion: prodForm.descripcion.trim(),
      precio: Number(prodForm.precio),
      categoria: prodForm.categoria.trim(),
      imagen: imagenFinal,
      hidden: prodForm.hidden,
    };

    setGuardando(true);

    if (editandoProductoId) {
      const ok = await actualizarProducto(editandoProductoId, campos, negocioId);
      setGuardando(false);
      if (!ok) return;
    } else {
      try {
        const nuevoProd = await crearProducto(campos as Omit<Producto, 'id'>, negocioId);
        setProductos((prev) => [...prev, nuevoProd]);
      } catch (error) {
        console.error('Error creando producto en Supabase:', error);
        alert('No se pudo crear el producto. Verifica la conexión e intenta nuevamente.');
        setGuardando(false);
        return;
      } finally {
        setGuardando(false);
      }
    }

    setEditandoProductoId(null);
    setProdForm(crearProductoForm(categorias[0] ?? 'pizzas'));
    setProductoImageUrl('');
    setMostrarFormularioProd(false);
  };

  const handleToggleHiddenProducto = async (id: string) => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    const producto = productos.find((p) => p.id === id);
    if (!producto) return;
    const nuevoEstado = producto.hidden === true ? false : true;

    const ok = await actualizarProducto(id, { hidden: nuevoEstado }, negocioId);
    if (ok) {
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, hidden: nuevoEstado } : p)));
    } else {
      alert('No se pudo actualizar el estado en la base. Revisa la conexión e intenta nuevamente.');
    }
  };

  const handleEliminarProducto = async (id: string) => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    if (!window.confirm('¿Eliminar este producto?')) return;

    const ok = await eliminarProducto(id, negocioId);
    if (ok) {
      setProductos((p) => p.filter((x) => x.id !== id));
    } else {
      alert('No se pudo eliminar el producto. Intenta nuevamente.');
    }
  };

  const handleAgregarCategoria = async () => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    if (!nuevaCat.trim()) return;
    const nombre = nuevaCat.toLowerCase().trim();
    if (categorias.includes(nombre)) {
      setNuevaCat('');
      return;
    }

    const nuevasCategorias = [...categorias, nombre];
    try {
      const ok = await guardarProductosEnFirebase(productos, infoLocal ?? undefined, nuevasCategorias, negocioId);
      if (!ok) {
        alert('No se pudo guardar la nueva sección. Intenta nuevamente.');
        return;
      }
      setCategorias(nuevasCategorias);
      setNuevaCat('');
    } catch (error) {
      console.error('Error guardar nueva categoría:', error);
      alert('Error al guardar la nueva categoría. Revisa la conexión e intenta nuevamente.');
    }
  };

  const handleEliminarCategoria = async (categoria: string) => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    if (!window.confirm(`¿Borrar la sección "${categoria}"?`)) return;
    const nuevasCategorias = categorias.filter((c) => c !== categoria);
    try {
      const ok = await guardarProductosEnFirebase(productos, infoLocal ?? undefined, nuevasCategorias, negocioId);
      if (!ok) {
        alert('No se pudo eliminar la categoría. Intenta nuevamente.');
        return;
      }
      setCategorias(nuevasCategorias);
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      alert('Error al eliminar la categoría. Revisa la conexión e intenta nuevamente.');
    }
  };

  // Seed action removed from admin UI to avoid accidental overwrites.

  const infoLocalValues: Partial<InfoLocal> = infoLocal ?? {};

  const handleInfoLocalChange = async (campo: keyof InfoLocal, valor: string | number) => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    const actualizada = { ...(infoLocal ?? {}), [campo]: valor };
    setInfoLocal(actualizada);
    try {
      // Enviar productos y categorias para evitar sobrescribir con arrays vacíos
      await saveShopConfigData({ infoLocal: actualizada, categorias, productos }, negocioId);
    } catch (err) {
      console.error('Error guardando infoLocal:', err);
    }
  };

  const handleProductoImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!negocioId) {
      alert('Cargando datos del negocio... Por favor reintenta en un momento.');
      return;
    }

    if (!event.currentTarget.files?.length) return;

    let productoId = editandoProductoId;

    if (!productoId) {
      try {
        const nuevoProducto = await crearProducto(
          {
            nombre: '',
            descripcion: '',
            precio: 0,
            categoria: prodForm.categoria.trim(),
            imagen: '',
            hidden: false,
          },
          negocioId
        );

        productoId = nuevoProducto.id;
        setEditandoProductoId(nuevoProducto.id);
        setProductos((prev) => [...prev, nuevoProducto]);
      } catch (error) {
        console.error('No se pudo crear un registro temporal del producto:', error);
        alert('No se pudo preparar el producto para subir la imagen.');
        return;
      }
    }

    const url = await onFileChange(event, 'producto', productoId);

    if (!url) {
      event.currentTarget.value = '';
      return;
    }

    setProductoImageUrl(url);
    setProdForm((prev) => ({ ...prev, imagen: url }));
    await actualizarProducto(productoId, { imagen: url }, negocioId);
    event.currentTarget.value = '';
  };

  const handlePerfilImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    tipo: 'portada' | 'avatar'
  ) => {
    if (!event.currentTarget.files?.length) return;
    await onFileChange(event, tipo);
    event.currentTarget.value = '';
  };

  if (cargando) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-3 text-sm text-sky-300">
          Cargando panel...
        </div>
      </div>
    );
  }

  if (!esAdmin) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-300">
          Acceso denegado: No tienes permisos de administrador.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">⚙️ Panel Admin</h2>
          <span className="text-[11px] text-neutral-500">Manejo Masivo de Stock</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCerrarSesion} className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-xl hover:bg-red-500/20 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90"><LogOut size={14} /></button>
          <button onClick={onVolverMenu} className="bg-neutral-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-neutral-700/90">Menu</button>
        </div>
      </div>

      {suscripcionCargando && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300 backdrop-blur-sm bg-opacity-80">Verificando permisos de edición…</div>
      )}

      {!suscripcionCargando && suscripcionActiva === false && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 backdrop-blur-sm bg-opacity-80">
          {errorSuscripcion || 'La edición está deshabilitada para esta sesión.'}
        </div>
      )}

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden backdrop-blur-sm bg-opacity-80">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'caja' ? null : 'caja')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-yellow-500 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90">
          <span className="flex items-center gap-2"><DollarSign size={14}/> Cierre de Caja y Métricas</span>
          {seccionAdminAbierta === 'caja' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'caja' && (
          <div className="p-4 pt-0 space-y-3 border-t border-neutral-800/50">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-bold uppercase">Pedidos en Turno</p>
                <p className="text-2xl font-black text-sky-400 mt-1">{contadorPedidos}</p>
              </div>
              <div className="bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-bold uppercase">Total Recaudado</p>
                <p className="text-xl font-black text-emerald-400 mt-1">${cajaAcumulada.toLocaleString('es-AR')}</p>
              </div>
            </div>
            <button onClick={onEjecutarCierreCaja} className="w-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-red-500/20">Efectuar Cierre de Turno</button>
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'datos' ? null : 'datos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90">
          <span className="flex items-center gap-2"><User size={14}/> Información del Comercio</span>
          {seccionAdminAbierta === 'datos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'datos' && (
          <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
            <input type="text" placeholder="Nombre del Local" value={infoLocalValues.nombre ?? ''} onChange={(e) => void handleInfoLocalChange('nombre', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />

            <textarea
              placeholder="Descripción / Slogan"
              value={infoLocalValues.descripcion ?? ''}
              onChange={(e) => void handleInfoLocalChange('descripcion', e.target.value)}
              onBlur={() => void persistInfoLocalChanges()}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs h-16 text-white"
              disabled={suscripcionActiva === false}
            />

            <input
              type="text"
              placeholder="Dirección Comercial"
              value={infoLocalValues.direccion ?? ''}
              onChange={(e) => void handleInfoLocalChange('direccion', e.target.value)}
              onBlur={() => void persistInfoLocalChanges()}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white"
              disabled={suscripcionActiva === false}
            />

            <input
              type="text"
              placeholder="WhatsApp (Con código de área, ej: 549...)"
              value={infoLocalValues.telefonoWhatsApp ?? ''}
              onChange={(e) => void handleInfoLocalChange('telefonoWhatsApp', e.target.value)}
              onBlur={() => void persistInfoLocalChanges()}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white"
              disabled={suscripcionActiva === false}
            />

            <input
              type="number"
              placeholder="Costo de Envío Fijo ($)"
              value={infoLocalValues.costoEnvio ?? ''}
              onChange={(e) => void handleInfoLocalChange('costoEnvio', Number(e.target.value))}
              onBlur={() => void persistInfoLocalChanges()}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white"
              disabled={suscripcionActiva === false}
            />
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'fotos' ? null : 'fotos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90">
          <span className="flex items-center gap-2"><Camera size={14}/> Identidad Visual e Imágenes</span>
          {seccionAdminAbierta === 'fotos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'fotos' && (
          <div className="p-4 pt-3 grid grid-cols-2 gap-4 border-t border-neutral-800/50">
            <div className="flex flex-col items-center justify-center p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-2">Foto Portada</span>
              {infoLocalValues.portadaUrl ? (
                <img src={getCacheBustedUrl(infoLocalValues.portadaUrl)} className="w-full h-16 rounded-md object-cover opacity-60 mb-2" alt="Portada" />
              ) : (
                <div className="w-full h-16 rounded-md border border-dashed border-neutral-700 bg-neutral-950/70 flex items-center justify-center text-[10px] text-neutral-500 mb-2">
                  No hay imagen de portada cargada
                </div>
              )}
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                {infoLocalValues.portadaUrl ? 'Cambiar' : 'Subir Imagen'}
                <input type="file" accept="image/*" onChange={(event) => void handlePerfilImageUpload(event, 'portada')} className="hidden" />
              </label>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-2">Logo / Perfil</span>
              {infoLocalValues.avatarUrl ? (
                <img src={getCacheBustedUrl(infoLocalValues.avatarUrl)} className="w-12 h-12 rounded-full object-cover border border-sky-400/30 mb-2" alt="Logo" />
              ) : (
                <div className="w-12 h-12 rounded-full border border-dashed border-neutral-700 bg-neutral-950/70 mb-2 flex items-center justify-center text-[10px] text-neutral-500">
                  Sin logo
                </div>
              )}
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                {infoLocalValues.avatarUrl ? 'Cambiar' : 'Subir Imagen'}
                <input type="file" accept="image/*" onChange={(event) => void handlePerfilImageUpload(event, 'avatar')} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'cobros' ? null : 'cobros')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90">
          <span className="flex items-center gap-2"><CreditCard size={14}/> Cuentas de Transferencia</span>
          {seccionAdminAbierta === 'cobros' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'cobros' && (
          <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
            <input type="text" placeholder="CBU / CVU Bancario" value={infoLocalValues.cbuCvu ?? ''} onChange={(e) => void handleInfoLocalChange('cbuCvu', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <input type="text" placeholder="Alias de Cuenta" value={infoLocalValues.alias ?? ''} onChange={(e) => void handleInfoLocalChange('alias', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'categorias' ? null : 'categorias')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90">
          <span className="flex items-center gap-2"><Layers size={14}/> Estructura de Secciones</span>
          {seccionAdminAbierta === 'categorias' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'categorias' && (
          <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
            <div className="flex gap-2">
              <input type="text" placeholder="Agregar nueva sección (Ej: postres)" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
              <button type="button" onClick={() => void handleAgregarCategoria()} className="bg-sky-500 text-neutral-950 px-4 rounded-xl text-xs font-black transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 disabled:opacity-60" disabled={suscripcionActiva === false}>+</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categorias.map((cat) => (
                <span key={cat} className="bg-neutral-900 text-neutral-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-neutral-700 flex items-center gap-1 capitalize">
                  {cat}
                  <X size={10} className="text-red-400 cursor-pointer" onClick={() => void handleEliminarCategoria(cat)} />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'productos' ? null : 'productos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-emerald-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:opacity-90">
          <span className="flex items-center gap-2"><ShoppingBag size={14}/> Gestión de Productos</span>
          {seccionAdminAbierta === 'productos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'productos' && (
          <div className="p-4 pt-3 space-y-4 border-t border-neutral-800/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input type="text" placeholder="Buscar producto por nombre..." value={busquedaAdmin} onChange={(e) => setBusquedaAdmin(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-8 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-neutral-600" disabled={suscripcionActiva === false} />
              {busquedaAdmin && <X size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer" onClick={() => setBusquedaAdmin('')} />}
            </div>

            <div className="flex justify-between items-center bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 cursor-pointer transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-neutral-900/90" onClick={() => setMostrarFormularioProd(!mostrarFormularioProd)}>
              <span className="text-[11px] font-black text-yellow-400 uppercase">{editandoProductoId ? '✏️ Editando Producto' : '➕ Crear Nuevo Artículo'}</span>
              {mostrarFormularioProd ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {mostrarFormularioProd && (
              <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/60 space-y-2">
                <input type="text" placeholder="Nombre del plato/bebida" value={prodForm.nombre} onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
                <input type="text" placeholder="Detalle o descripción del contenido" value={prodForm.descripcion} onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
                <input type="number" placeholder="Precio de Venta ($)" value={prodForm.precio || ''} onChange={(e) => setProdForm({ ...prodForm, precio: Number(e.target.value) })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
                <select value={prodForm.categoria} onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs capitalize text-white" disabled={suscripcionActiva === false}>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleProductoImageUpload(event)}
                  className="text-[10px]"
                  disabled={suscripcionActiva === false}
                />
                <button type="button" disabled={subiendoImagen || suscripcionActiva === false || guardando || !prodForm.nombre || !prodForm.precio} onClick={() => void handleGuardarProducto()} className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 font-black py-2 rounded-lg text-xs uppercase transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 hover:shadow-xl disabled:opacity-60">{guardando ? 'Guardando…' : 'Guardar Artículo'}</button>
              </div>
            )}

            {!busquedaAdmin.trim() && (
              <div className="border-t border-neutral-800/80 pt-2">
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {categorias.map((cat) => (
                    <button key={cat} type="button" onClick={() => setCategoriaAdminActiva(cat)} className={`px-3 py-1.5 rounded-xl capitalize font-bold text-[11px] transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${categoriaAdminActiva === cat ? 'bg-sky-500 text-neutral-950 shadow-md hover:shadow-lg' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800/80'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {productosFiltradosAdmin.length === 0 ? (
                <p className="text-center py-4 text-neutral-500 text-[11px]">No se encontraron artículos.</p>
              ) : (
                productosFiltradosAdmin.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${!p.hidden ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-950/40 border-neutral-900 opacity-60'}`}>
                    <div className="flex items-center gap-2 truncate">
                      <img src={getCacheBustedUrl(p.imagen)} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                      <div className="truncate">
                        <p className="font-bold text-white truncate flex items-center gap-1">
                          {p.nombre}
                          {p.hidden === true && <span className="text-[9px] px-1 bg-red-500/20 text-red-400 font-medium rounded">Pausado</span>}
                        </p>
                        <p className="text-[10px] text-yellow-500 font-black">${p.precio}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button onClick={() => void handleToggleHiddenProducto(p.id)} className={`p-2 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${!p.hidden ? 'text-emerald-400 bg-emerald-950/40' : 'text-red-400 bg-red-950/40'}`} disabled={suscripcionActiva === false}>
                        {!p.hidden ? <Eye size={12}/> : <EyeOff size={12}/>} 
                      </button>
                      <button onClick={() => { setEditandoProductoId(p.id); setProdForm({ ...p, hidden: p.hidden ?? false }); setMostrarFormularioProd(true); }} className="p-2 text-sky-400 bg-neutral-800 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90" disabled={suscripcionActiva === false}><Edit2 size={12}/></button>
                      <button onClick={() => void handleEliminarProducto(p.id)} className="p-2 text-red-400 bg-neutral-800 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90" disabled={suscripcionActiva === false}><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-neutral-800/50 pt-3">
              <div className="text-[10px] text-neutral-500 text-center">Seed deshabilitado en producción para proteger datos del negocio.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
