// src/views/client/HomeCliente.tsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import {
  getShopConfigData,
  saveShopConfigData,
  type InfoLocal,
  type Producto,
} from '../../firebase/db';
import {
  ShoppingBag, ShoppingCart, MessageSquare, MapPin, Plus, Minus,
  Trash2, Star, X, ExternalLink, Search, Lock,
} from 'lucide-react';
import AdminPanel from '../../components/AdminPanel';

// === ESTRUCTURAS DE DATOS VALIDADAS ===
interface ItemDelCarrito {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

type MetodoPago = 'efectivo' | 'transferencia';

export default function HomeCliente({ onInitialized }: { onInitialized?: () => void }) {
  const [infoLocal, setInfoLocal] = useState<Partial<InfoLocal> | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
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

  const infoLocalValues: InfoLocal = {
    nombre: infoLocal?.nombre ?? '',
    descripcion: infoLocal?.descripcion ?? '',
    direccion: infoLocal?.direccion ?? '',
    telefonoWhatsApp: infoLocal?.telefonoWhatsApp ?? '',
    costoEnvio: infoLocal?.costoEnvio ?? 0,
    portadaUrl: infoLocal?.portadaUrl ?? '',
    avatarUrl: infoLocal?.avatarUrl ?? '',
    cbuCvu: infoLocal?.cbuCvu ?? '',
    alias: infoLocal?.alias ?? '',
    instagram: infoLocal?.instagram ?? '',
    facebook: infoLocal?.facebook ?? '',
  };

  const perfilVacio = !infoLocal;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdminAutenticado(Boolean(user));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let activo = true;
    const docRef = doc(db, 'shop', 'config');

    /**
     * Aplica datos desde Firestore al estado.
     * Garantiza que infoLocal preserve todos sus campos incluyendo portadaUrl y avatarUrl.
     */
    const aplicarDatosDesdeFirestore = (data: Partial<{ infoLocal: InfoLocal; productos: Producto[]; categorias: string[] }> | null | undefined) => {
      if (!activo) return;

      if (!data) {
        setInfoLocal(null);
        setProductos([]);
        setCategorias([]);
        setLoadingDatos(false);
        return;
      }

      if (data.infoLocal) {
        setInfoLocal(data.infoLocal);
      } else {
        setInfoLocal(null);
      }

      setProductos(
        Array.isArray(data.productos)
          ? data.productos.map((producto) => ({ ...producto, activo: producto.activo !== false }))
          : []
      );
      setCategorias(Array.isArray(data.categorias) ? data.categorias : []);
      setErrorDatos(null);
      setLoadingDatos(false);
    };

    // Carga inicial desde Firestore y luego activa el listener en tiempo real
    const cargarDesdeNube = async () => {
      try {
        setLoadingDatos(true);
        setErrorDatos(null);
        const data = await getShopConfigData();

        if (!activo) return;
        aplicarDatosDesdeFirestore(data);
        // Notifica al contenedor que la carga inicial ya finalizó
        try {
          onInitialized?.();
        } catch {}
      } catch (error) {
        console.error('Error al cargar datos de Firebase:', error);
        if (activo) {
          setErrorDatos('No se pudieron cargar los datos desde Firebase.');
          setInfoLocal(null);
          setProductos([]);
          setCategorias([]);
          setLoadingDatos(false);
          try {
            onInitialized?.();
          } catch {}
        }
      }
    };

    // Inicia carga inicial
    void cargarDesdeNube();

    // Listener en tiempo real: escucha cambios en el documento de configuración
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!activo) return;
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<{ infoLocal: InfoLocal; productos: Producto[]; categorias: string[] }> | undefined;
          aplicarDatosDesdeFirestore(data);
        } else {
          aplicarDatosDesdeFirestore(null);
        }
      },
      (error) => {
        console.error('Error al escuchar cambios en Firestore:', error);
        if (activo) {
          setErrorDatos('Se perdió la conexión con la base de datos en tiempo real.');
        }
      }
    );

    return () => {
      activo = false;
      unsubscribe();
    };
  }, []);

  // === ESTADOS DE NAVEGACIÓN, BUSCADOR Y CARRITO ===
  const [carrito, setCarrito] = useState<ItemDelCarrito[]>([]);
  const [vistaActual, setVistaActual] = useState<'menu' | 'carrito' | 'admin'>('menu');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAdmin, setBusquedaAdmin] = useState('');

  // Formulario del cliente
  const [nombre, setNombre] = useState(() => localStorage.getItem('cliente_nombre') || '');
  const [telefono, setTelefono] = useState(() => localStorage.getItem('cliente_telefono') || '');
  const [direccion, setDireccion] = useState(() => localStorage.getItem('cliente_direccion') || '');
  const [entreCalles, setEntreCalles] = useState(() => localStorage.getItem('cliente_entrecalles') || '');
  const [gmapsLink, setGmapsLink] = useState(() => localStorage.getItem('cliente_gmaps') || '');

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [pagaCon, setPagaCon] = useState<string>('');

  useEffect(() => { localStorage.setItem('cliente_nombre', nombre); }, [nombre]);
  useEffect(() => { localStorage.setItem('cliente_telefono', telefono); }, [telefono]);
  useEffect(() => { localStorage.setItem('cliente_direccion', direccion); }, [direccion]);
  useEffect(() => { localStorage.setItem('cliente_entrecalles', entreCalles); }, [entreCalles]);
  useEffect(() => { localStorage.setItem('cliente_gmaps', gmapsLink); }, [gmapsLink]);

  // === ESTADOS PARA ACORDEONES DEL ADMIN ===
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0] || 'pizzas');
  // === REPRODUCCIÓN DE AUDIO ASINCRÓNICO EVITANDO FILTROS ===
  const reproducirSonidoExito = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav");
    audio.volume = 0.3;
    audio.play().catch(() => {
      console.log("Audio bloqueado por el navegador del cliente hasta la primera interacción.");
    });
  };

  // === MANEJADOR CLOUDINARY ===
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'portada' | 'avatar' | 'producto') => {
    const file = e.target.files?.[0];
    if (!file) return undefined;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert('Error de configuración de Cloudinary en las variables de entorno.');
      return undefined;
    }

    try {
      setSubiendoImagen(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!respuesta.ok) throw new Error('Error de subida');
      const datosImagen = await respuesta.json();
      const urlNube = datosImagen.secure_url;
      const campoFirestore = tipo === 'portada' ? 'infoLocal.portadaUrl' : 'infoLocal.avatarUrl';
      const docRef = doc(db, 'shop', 'config');

      try {
        await updateDoc(docRef, { [campoFirestore]: urlNube } as any);
      } catch (error) {
        console.warn('No se pudo usar updateDoc, guardando con setDoc merge:', error);
        await setDoc(docRef, { infoLocal: { [tipo === 'portada' ? 'portadaUrl' : 'avatarUrl']: urlNube } }, { merge: true });
      }

      setInfoLocal((prev) => ({ ...(prev ?? {}), [tipo === 'portada' ? 'portadaUrl' : 'avatarUrl']: urlNube }));
      return urlNube;
    } catch (error) {
      console.error(error);
      alert('Error al subir la imagen.');
      return undefined;
    } finally {
      setSubiendoImagen(false);
    }
  };

  const agregarAlCarrito = (producto: Producto) => {
    reproducirSonidoExito();
    setAnimarCarrito(true);
    setTimeout(() => setAnimarCarrito(false), 300);

    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      return [...prev, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id: string, accion: 'sumar' | 'restar') => {
    if (accion === 'sumar') reproducirSonidoExito();
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = accion === 'sumar' ? item.cantidad + 1 : item.cantidad - 1;
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : item;
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const vaciarCarrito = () => {
    if (window.confirm("¿Vaciar carrito?")) setCarrito([]);
  };

  const abrirGoogleMapsExterno = () => {
    window.open("https://www.google.com/maps", "_blank");
    alert("📍 Te redirigimos a Google Maps:\n\n1. Buscá tu casa o ubicación exacta.\n2. Tocá el botón 'Compartir'.\n3. Elegí 'Copiar enlace'.\n4. Regresá acá y pegalo en el cuadro de abajo.");
  };

  const enviarPedidoWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
      if (!nombre || !telefono || !direccion || !entreCalles || perfilVacio) return;

      const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      const totalFinal = subtotal + infoLocalValues.costoEnvio;

      let mensaje = `⭐️ *NUEVO PEDIDO - ${infoLocalValues.nombre.toUpperCase()}* ⭐️\n\n`;
    if (gmapsLink.trim() !== "") {
      mensaje += `📌 *UBICACIÓN GOOGLE MAPS REPARTIDOR:*\n${gmapsLink.trim()}\n`;
    }
    
    mensaje += `\n🛒 *Detalle:*\n`;
    carrito.forEach(item => { mensaje += `• ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})\n`; });
mensaje += `\n💵 *Subtotal:* $${subtotal.toLocaleString('es-AR')}\n🛵 *Envío:* $${infoLocalValues.costoEnvio.toLocaleString('es-AR')}\n💰 *TOTAL:* $${totalFinal.toLocaleString('es-AR')}\n\n`;
      mensaje += `💳 *Método de Pago:* ${metodoPago === 'efectivo' ? 'Efectivo Cash 💵' : 'Transferencia Bancaria/Virtual 📱'}\n`;
      
      if (metodoPago === 'efectivo') {
        const m = Number(pagaCon);
        mensaje += m && m > totalFinal ? `💸 *Paga con:* $${m}\n🪙 *Vuelto:* $${m - totalFinal}\n` : `💸 *Paga con:* Importe exacto\n`;
      } else {
        mensaje += `🏛 *CVU:* ${infoLocalValues.cbuCvu}\n🔑 *Alias:* ${infoLocalValues.alias}\n_Por favor, envíe el comprobante._\n`;
      }

      const nP = contadorPedidos + 1;
      const nC = cajaAcumulada + totalFinal;
      setContadorPedidos(nP); setCajaAcumulada(nC);
      localStorage.setItem('local_pedidos_count', nP.toString());
      localStorage.setItem('local_caja_acumulada', nC.toString());

      window.open(`https://wa.me/${infoLocalValues.telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const ejecutarCierreCaja = () => {
    alert(`📢 Turno Cerrado\n\nPedidos: ${contadorPedidos}\nRecaudado: $${cajaAcumulada.toLocaleString('es-AR')}`);
    setContadorPedidos(0); setCajaAcumulada(0);
    localStorage.setItem('local_pedidos_count', "0"); localStorage.setItem('local_caja_acumulada', "0");
  };

  const iniciarSesionAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      setAdminEmail('');
      setAdminPassword('');
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
        await signOut(auth);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
      setVistaActual('menu');
    }
  };

  const cantidadTotalProductos = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const subtotalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const productosFiltradosCliente = productos.filter(p => {
    const estaActivo = p.activo !== false;
    const coincideCategoria = p.categoria === categoriaActiva;
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                             p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return busqueda.trim() !== "" ? (estaActivo && coincideBusqueda) : (estaActivo && coincideCategoria && coincideBusqueda);
  });

  return (
    <div className="max-w-md mx-auto bg-neutral-900 min-h-screen pb-24 shadow-2xl relative font-sans text-white border-x border-neutral-800">
      {loadingDatos && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 text-center shadow-2xl">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-sm font-semibold text-sky-400">Cargando tu tienda...</p>
          </div>
        </div>
      )}

      {errorDatos && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {errorDatos}
        </div>
      )}
      
      {subiendoImagen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-neutral-950 px-5 py-2.5 rounded-full font-black text-xs z-50 shadow-xl">
          ⏳ Guardando en la nube...
        </div>
      )}

      {/* BOTÓN FLOTANTE CARRITO CON REBOTE Y CAMBIO DE COLOR */}
      {vistaActual === 'menu' && cantidadTotalProductos > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
          <button 
            onClick={() => setVistaActual('carrito')}
            className={`w-full text-neutral-950 font-black py-3 px-4 rounded-2xl flex items-center justify-between shadow-xl transition-all duration-200 ${
              animarCarrito 
                ? 'scale-110 bg-gradient-to-r from-emerald-400 to-teal-500' 
                : 'scale-100 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500'
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

      {/* VISTA 1: MENÚ DEL CLIENTE */}
      {vistaActual === 'menu' && (
        <>
          <div className="h-44 bg-cover bg-center relative" style={infoLocalValues.portadaUrl ? { backgroundImage: `url(${infoLocalValues.portadaUrl})` } : undefined}>
            <div className="absolute inset-0 bg-black/30" />
            {!infoLocalValues.portadaUrl && (
              <div className="absolute inset-0 bg-neutral-950/80 flex items-center justify-center text-xs text-neutral-400">
                Portada no configurada. Cargá una imagen desde el panel admin.
              </div>
            )}
          </div>
          <div className="px-4 -mt-14 relative flex flex-col items-center text-center mb-2">
            {infoLocalValues.avatarUrl ? (
              <img src={infoLocalValues.avatarUrl} alt="Logo" className="w-24 h-24 rounded-full border-4 border-sky-400 object-cover shadow-xl bg-neutral-900" />
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
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-750 rounded-xl py-2.5 pl-10 pr-8 text-xs text-white focus:outline-none focus:border-sky-400 transition-colors placeholder-neutral-500"
              />
              {busqueda && <X size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer" onClick={() => setBusqueda('')} />}
            </div>
          </div>

          {busqueda.trim() === "" && (
            <div className="flex gap-2 overflow-x-auto px-4 py-2 sticky top-0 bg-neutral-900/90 backdrop-blur-md z-10 scrollbar-none">
              {categorias.map((cat) => (
                <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-5 py-2.5 rounded-full capitalize font-black text-xs tracking-wider transition-all ${categoriaActiva === cat ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-neutral-950 shadow-md' : 'bg-neutral-800 text-neutral-400'}`}>
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
                <div key={producto.id} className="bg-neutral-800/80 p-3 rounded-2xl shadow-md flex gap-3 border border-neutral-700/30 items-center justify-between">
                  <img src={producto.imagen} alt={producto.nombre} className="w-20 h-20 rounded-xl object-cover bg-neutral-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{producto.nombre}</h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">{producto.descripcion}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-black text-yellow-500 text-lg">${producto.precio.toLocaleString('es-AR')}</span>
                      <button onClick={() => agregarAlCarrito(producto)} className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 p-2 rounded-xl active:scale-95"><ShoppingCart size={15} strokeWidth={3} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* VISTA 2: CARRITO CON SECCIÓN DE GOOGLE MAPS INTUITIVA */}
      {vistaActual === 'carrito' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-white">🛒 Tu Pedido</h2>
            {carrito.length > 0 && (
              <button type="button" onClick={vaciarCarrito} className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl"><Trash2 size={13} /> Vaciar</button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-neutral-500 text-sm">El carrito está vacío.</p>
              <button onClick={() => setVistaActual('menu')} className="bg-neutral-800 text-sky-400 font-bold text-xs px-4 py-2 rounded-full border border-neutral-700/60">Volver al menú</button>
            </div>
          ) : (
            <form onSubmit={enviarPedidoWhatsApp} className="space-y-5">
              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-4 border border-neutral-700/30">
                {carrito.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b border-neutral-700/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1"><h4 className="font-bold text-white text-sm">{item.nombre}</h4><p className="text-xs text-neutral-400">${item.precio.toLocaleString('es-AR')} c/u</p></div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => modificarCantidad(item.id, 'restar')} className="bg-neutral-900 p-1 rounded text-neutral-400"><Minus size={12}/></button>
                      <span className="font-bold text-sm px-1">{item.cantidad}</span>
                      <button type="button" onClick={() => modificarCantidad(item.id, 'sumar')} className="bg-neutral-900 p-1 rounded text-neutral-400"><Plus size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SECTOR DATOS ENTREGA - REESTRUCTURADO PAUTAS GPS Y MAPS */}
              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-3 border border-neutral-700/30">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black tracking-widest text-sky-400 uppercase">Datos de Entrega</h3>
                  <button type="button" onClick={abrirGoogleMapsExterno} className="flex items-center gap-1.5 text-[11px] font-black bg-gradient-to-r from-sky-400 to-sky-500 text-neutral-950 px-3 py-2 rounded-xl shadow-md active:scale-95 transition-transform">
                    🗺️ Abrir Google Maps <ExternalLink size={11} />
                  </button>
                </div>
                
                <input type="text" placeholder="Nombre y Apellido" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                <input type="tel" placeholder="Teléfono de contacto" value={telefono} onChange={e=>setTelefono(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                <input type="text" placeholder="Calle y Número (Ej: Av Belgrano 450)" value={direccion} onChange={e=>setDireccion(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                <input type="text" placeholder="¿Entre qué calles o indicaciones de fachada?" value={entreCalles} onChange={e=>setEntreCalles(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm text-white focus:border-sky-400 focus:outline-none" required />
                
                <div className="pt-2 border-t border-neutral-700/40">
                  <label className="text-[10px] text-yellow-400 font-bold block mb-1">¿Pegaste el link de tu ubicación aquí abajo?</label>
                  <input 
                    type="text" 
                    placeholder="Mantené apretado acá y elegí 'Pegar'..." 
                    value={gmapsLink} 
                    onChange={e=>setGmapsLink(e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-3 text-xs text-sky-400 placeholder-neutral-600 focus:outline-none focus:border-sky-500" 
                  />
                  <p className="text-[9px] text-neutral-500 mt-1">Sirve para que el delivery llegue sin perderse usando el GPS.</p>
                </div>
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-4 border border-neutral-700/30">
                <h3 className="text-xs font-black tracking-widest text-sky-400 uppercase">Forma de Pago</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMetodoPago('efectivo')} className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase ${metodoPago === 'efectivo' ? 'bg-sky-950/40 border-sky-400 text-sky-400' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}`}>💵 Efectivo</button>
                  <button type="button" onClick={() => setMetodoPago('transferencia')} className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase ${metodoPago === 'transferencia' ? 'bg-sky-950/40 border-sky-400 text-sky-400' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}`}>📱 Transferencia</button>
                </div>
                {metodoPago === 'efectivo' ? (
                  <input type="number" placeholder="¿Con cuánto vas a pagar? (Para vuelto)" value={pagaCon} onChange={e=>setPagaCon(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-4 text-sm text-white" />
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
              <button type="submit" className="w-full bg-emerald-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"><MessageSquare size={18} fill="currentColor" />Enviar por WhatsApp</button>
            </form>
          )}
        </div>
      )}

      {/* VISTA 3: PANEL ADMINISTRADOR */}
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
            infoLocal={infoLocal}
            setInfoLocal={setInfoLocal}
            productos={productos}
            setProductos={setProductos}
            categorias={categorias}
            setCategorias={setCategorias}
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

      {/* NAV INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex justify-around items-center py-3 rounded-t-2xl z-30">
        <button onClick={() => setVistaActual('menu')} className={`flex flex-col items-center ${vistaActual === 'menu' ? 'text-sky-400 font-bold' : 'text-neutral-500'}`}>
          <ShoppingBag size={20} /><span className="text-[10px] mt-1">Menú</span>
        </button>

        <button onClick={() => setVistaActual('carrito')} className={`flex flex-col items-center relative ${vistaActual === 'carrito' ? 'text-sky-400 font-bold' : 'text-neutral-500'}`}>
          <ShoppingCart size={20} /><span className="text-[10px] mt-1">Carrito</span>
          {cantidadTotalProductos > 0 && <span className="absolute -top-1 right-2 bg-sky-500 text-neutral-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cantidadTotalProductos}</span>}
        </button>

        <button onClick={accederAlAdminSeguro} className={`flex items-center gap-2 p-2 rounded-lg ${vistaActual === 'admin' ? 'text-sky-400 bg-neutral-800/60' : 'text-neutral-400 hover:text-sky-400'}`} aria-label="Acceso administrativo">
          <Lock size={16} />
          <span className="text-[10px] hidden">Admin</span>
        </button>
      </div>

    </div>
  );
}