import React, { useEffect, useState } from 'react';
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
  type InfoLocal,
  type Producto,
  verificarSuscripcion,
} from '../firebase/db';

interface AdminPanelProps {
  infoLocal: InfoLocal;
  setInfoLocal: React.Dispatch<React.SetStateAction<InfoLocal>>;
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
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>, tipo: 'portada' | 'avatar' | 'producto') => Promise<void>;
}

type ProductoFormState = {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  activo: boolean;
};

const crearProductoForm = (categoriaInicial: string): ProductoFormState => ({
  nombre: '',
  descripcion: '',
  precio: 0,
  categoria: categoriaInicial,
  imagen: '',
  activo: true,
});

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
}: AdminPanelProps) {
  const [seccionAdminAbierta, setSeccionAdminAbierta] = useState<string | null>('productos');
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null);
  const [nuevaCat, setNuevaCat] = useState('');
  const [mostrarFormularioProd, setMostrarFormularioProd] = useState(false);
  const [categoriaAdminActiva, setCategoriaAdminActiva] = useState<string>(categorias[0] ?? 'pizzas');
  const [prodForm, setProdForm] = useState<ProductoFormState>(crearProductoForm(categorias[0] ?? 'pizzas'));
  const [busquedaAdmin, setBusquedaAdmin] = useState('');
  const [suscripcionActiva, setSuscripcionActiva] = useState<boolean | null>(null);
  const [suscripcionCargando, setSuscripcionCargando] = useState(true);
  const [errorSuscripcion, setErrorSuscripcion] = useState<string | null>(null);

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

  const productosFiltradosAdmin = (productos ?? []).filter((p) => {
    const nombre = (p.nombre ?? '').toLowerCase();
    const descripcion = (p.descripcion ?? '').toLowerCase();

    if (textoBusqueda !== '') {
      return nombre.includes(textoBusqueda) || descripcion.includes(textoBusqueda);
    }
    return p.categoria === categoriaAdminActiva;
  });

  const guardarCatalogo = async (nuevosProductos: Producto[]) => {
    await guardarProductosEnFirebase(nuevosProductos, infoLocal, categorias, suscripcionActiva ?? true);
    setProductos(nuevosProductos);
  };

  const handleGuardarProducto = async () => {
    if (!prodForm.nombre.trim() || !prodForm.precio) return;

    const imagenFinal = prodForm.imagen.trim() !== '' ? prodForm.imagen : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';
    const productoBase: Producto = {
      id: editandoProductoId || `prod_${Date.now()}`,
      nombre: prodForm.nombre.trim(),
      descripcion: prodForm.descripcion.trim(),
      precio: Number(prodForm.precio),
      categoria: prodForm.categoria.trim(),
      imagen: imagenFinal,
      activo: prodForm.activo,
    };

    const nuevosProductos = editandoProductoId
      ? productos.map((p) => (p.id === editandoProductoId ? productoBase : p))
      : [...productos, productoBase];

    await guardarCatalogo(nuevosProductos);
    setEditandoProductoId(null);
    setProdForm(crearProductoForm(categorias[0] ?? 'pizzas'));
    setMostrarFormularioProd(false);
  };

  const handleToggleActivoProducto = async (id: string) => {
    const nuevosProductos = productos.map((p) => (p.id === id ? { ...p, activo: p.activo === false ? true : false } : p));
    await guardarCatalogo(nuevosProductos);
  };

  const handleEliminarProducto = async (id: string) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    const nuevosProductos = productos.filter((p) => p.id !== id);
    await guardarCatalogo(nuevosProductos);
  };

  const handleAgregarCategoria = async () => {
    if (!nuevaCat.trim()) return;
    const nombre = nuevaCat.toLowerCase().trim();
    if (categorias.includes(nombre)) {
      setNuevaCat('');
      return;
    }

    const nuevasCategorias = [...categorias, nombre];
    setCategorias(nuevasCategorias);
    await guardarProductosEnFirebase(productos, infoLocal, nuevasCategorias, suscripcionActiva ?? true);
    setNuevaCat('');
  };

  const handleEliminarCategoria = async (categoria: string) => {
    if (!window.confirm(`¿Borrar la sección "${categoria}"?`)) return;
    const nuevasCategorias = categorias.filter((c) => c !== categoria);
    setCategorias(nuevasCategorias);
    await guardarProductosEnFirebase(productos, infoLocal, nuevasCategorias, suscripcionActiva ?? true);
  };

  const handleInfoLocalChange = async (campo: keyof InfoLocal, valor: string | number) => {
    const actualizada = { ...infoLocal, [campo]: valor };
    setInfoLocal(actualizada);
    await saveShopConfigData({ infoLocal: actualizada, categorias });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">⚙️ Panel Admin</h2>
          <span className="text-[11px] text-neutral-500">Manejo Masivo de Stock</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onCerrarSesion} className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-xl hover:bg-red-500/20"><LogOut size={14} /></button>
          <button onClick={onVolverMenu} className="bg-neutral-800 text-white font-bold py-2 px-3 rounded-xl text-xs">Menu</button>
        </div>
      </div>

      {suscripcionCargando && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">Verificando permisos de edición…</div>
      )}

      {!suscripcionCargando && suscripcionActiva === false && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {errorSuscripcion || 'La edición está deshabilitada para esta sesión.'}
        </div>
      )}

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'caja' ? null : 'caja')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-yellow-500">
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
            <button onClick={onEjecutarCierreCaja} className="w-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">Efectuar Cierre de Turno</button>
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'datos' ? null : 'datos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
          <span className="flex items-center gap-2"><User size={14}/> Información del Comercio</span>
          {seccionAdminAbierta === 'datos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'datos' && (
          <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
            <input type="text" placeholder="Nombre del Local" value={infoLocal.nombre} onChange={(e) => void handleInfoLocalChange('nombre', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <textarea placeholder="Descripción / Slogan" value={infoLocal.descripcion} onChange={(e) => void handleInfoLocalChange('descripcion', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs h-16 text-white" disabled={suscripcionActiva === false} />
            <input type="text" placeholder="Dirección Comercial" value={infoLocal.direccion} onChange={(e) => void handleInfoLocalChange('direccion', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <input type="text" placeholder="WhatsApp (Con código de área, ej: 549...)" value={infoLocal.telefonoWhatsApp} onChange={(e) => void handleInfoLocalChange('telefonoWhatsApp', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <input type="number" placeholder="Costo de Envío Fijo ($)" value={infoLocal.costoEnvio || ''} onChange={(e) => void handleInfoLocalChange('costoEnvio', Number(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'fotos' ? null : 'fotos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
          <span className="flex items-center gap-2"><Camera size={14}/> Identidad Visual e Imágenes</span>
          {seccionAdminAbierta === 'fotos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'fotos' && (
          <div className="p-4 pt-3 grid grid-cols-2 gap-4 border-t border-neutral-800/50">
            <div className="flex flex-col items-center justify-center p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-2">Foto Portada</span>
              <img src={infoLocal.portadaUrl} className="w-full h-16 rounded-md object-cover opacity-60 mb-2" alt="" />
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                Cambiar
                <input type="file" accept="image/*" onChange={(event) => void onFileChange(event, 'portada')} className="hidden" />
              </label>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-2">Logo / Perfil</span>
              <img src={infoLocal.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-sky-400/30 mb-2" alt="" />
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                Cambiar
                <input type="file" accept="image/*" onChange={(event) => void onFileChange(event, 'avatar')} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'cobros' ? null : 'cobros')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
          <span className="flex items-center gap-2"><CreditCard size={14}/> Cuentas de Transferencia</span>
          {seccionAdminAbierta === 'cobros' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'cobros' && (
          <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
            <input type="text" placeholder="CBU / CVU Bancario" value={infoLocal.cbuCvu} onChange={(e) => void handleInfoLocalChange('cbuCvu', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <input type="text" placeholder="Alias de Cuenta" value={infoLocal.alias} onChange={(e) => void handleInfoLocalChange('alias', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
          </div>
        )}
      </div>

      <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'categorias' ? null : 'categorias')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
          <span className="flex items-center gap-2"><Layers size={14}/> Estructura de Secciones</span>
          {seccionAdminAbierta === 'categorias' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
        </button>
        {seccionAdminAbierta === 'categorias' && (
          <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
            <div className="flex gap-2">
              <input type="text" placeholder="Agregar nueva sección (Ej: postres)" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
              <button type="button" onClick={() => void handleAgregarCategoria()} className="bg-sky-500 text-neutral-950 px-4 rounded-xl text-xs font-black disabled:opacity-60" disabled={suscripcionActiva === false}>+</button>
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
        <button onClick={() => setSeccionAdminAbierta(seccionAdminAbierta === 'productos' ? null : 'productos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-emerald-400">
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

            <div className="flex justify-between items-center bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 cursor-pointer" onClick={() => setMostrarFormularioProd(!mostrarFormularioProd)}>
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
                <input type="file" accept="image/*" onChange={(e) => void onFileChange(e, 'producto')} className="text-[10px]" disabled={suscripcionActiva === false} />
                <button type="button" disabled={subiendoImagen || suscripcionActiva === false || !prodForm.nombre || !prodForm.precio} onClick={() => void handleGuardarProducto()} className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 font-black py-2 rounded-lg text-xs uppercase disabled:opacity-60">Guardar Artículo</button>
              </div>
            )}

            {!busquedaAdmin.trim() && (
              <div className="border-t border-neutral-800/80 pt-2">
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {categorias.map((cat) => (
                    <button key={cat} type="button" onClick={() => setCategoriaAdminActiva(cat)} className={`px-3 py-1.5 rounded-xl capitalize font-bold text-[11px] ${categoriaAdminActiva === cat ? 'bg-sky-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {productosFiltradosAdmin.length === 0 ? (
                <p className="text-center py-4 text-neutral-500 text-[11px]">No se encontraron artículos.</p>
              ) : (
                productosFiltradosAdmin.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${p.activo !== false ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-950/40 border-neutral-900 opacity-60'}`}>
                    <div className="flex items-center gap-2 truncate">
                      <img src={p.imagen} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                      <div className="truncate">
                        <p className="font-bold text-white truncate flex items-center gap-1">
                          {p.nombre}
                          {p.activo === false && <span className="text-[9px] px-1 bg-red-500/20 text-red-400 font-medium rounded">Pausado</span>}
                        </p>
                        <p className="text-[10px] text-yellow-500 font-black">${p.precio}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button onClick={() => void handleToggleActivoProducto(p.id)} className={`p-2 rounded-lg transition-colors ${p.activo !== false ? 'text-emerald-400 bg-emerald-950/40' : 'text-red-400 bg-red-950/40'}`} disabled={suscripcionActiva === false}>
                        {p.activo !== false ? <Eye size={12}/> : <EyeOff size={12}/>} 
                      </button>
                      <button onClick={() => { setEditandoProductoId(p.id); setProdForm({ ...p, activo: p.activo !== false }); setMostrarFormularioProd(true); }} className="p-2 text-sky-400 bg-neutral-800 rounded-lg" disabled={suscripcionActiva === false}><Edit2 size={12}/></button>
                      <button onClick={() => void handleEliminarProducto(p.id)} className="p-2 text-red-400 bg-neutral-800 rounded-lg" disabled={suscripcionActiva === false}><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
