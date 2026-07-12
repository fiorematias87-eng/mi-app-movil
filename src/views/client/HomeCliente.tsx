// src/views/client/HomeCliente.tsx
// Importa las funciones de firestore
import { doc, setDoc, getDoc } from 'firebase/firestore'; 
// Importa la base de datos (db) desde la raíz src
import { db } from '../../firebase';
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ShoppingCart, MessageSquare, MapPin, Plus, Minus, 
  Trash2, Star, User, Phone, Navigation, Settings, X, Edit2, 
  Save, DollarSign, Clock, Calendar, Image, Link, CreditCard, Layers, 
  ChevronDown, ChevronUp, Search, LogOut, Camera, ExternalLink, Eye, EyeOff
} from 'lucide-react';

// === ESTRUCTURAS DE DATOS VALIDADAS ===
interface InfoLocal {
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

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  activo?: boolean;
}

interface ItemDelCarrito {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

type MetodoPago = 'efectivo' | 'transferencia';

// === DATOS POR DEFECTO ===
const infoLocalPorDefecto: InfoLocal = {
  nombre: "Lo de Fiore",
  descripcion: "Las mejores pizzas y empanadas a la piedra 🍕🔥 ¡Horno de barro!",
  telefonoWhatsApp: "5491165099266", 
  direccion: "Av. Principal 1234, Buenos Aires",
  costoEnvio: 1500,
  portadaUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000",
  avatarUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=150",
  facebook: "@lodefiore",
  instagram: "@lodefiore.ok",
  cbuCvu: "0000003100000000000000",
  alias: "fiore.pizza.mp"
};

const productosPorDefecto: Producto[] = [
  { id: "p1", nombre: "Pizza Muzzarella", descripcion: "Salsa de tomate artesanal, abundante muzzarella, aceitunas verdes.", precio: 8500, categoria: "pizzas", imagen: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=500", activo: true },
  { id: "p2", nombre: "Pizza Fugazzeta", descripcion: "Mucha cebolla, muzzarella de primera calidad, olivas negras.", precio: 9500, categoria: "pizzas", imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500", activo: true }
];

const categoriesPorDefecto = ["pizzas", "empanadas", "bebidas", "promos"];

export default function HomeCliente() {
  // === ESTADOS CON PERSISTENCIA LOCAL STORAGE ===
  const [infoLocal, setInfoLocal] = useState<InfoLocal>(() => {
    const guardado = localStorage.getItem('local_info');
    return guardado ? JSON.parse(guardado) : infoLocalPorDefecto;
  });

  const [productos, setProductos] = useState<Producto[]>(() => {
    const guardado = localStorage.getItem('local_productos');
    if (guardado) {
      const prods = JSON.parse(guardado);
      return prods.map((p: Producto) => p.activo !== undefined ? p : { ...p, activo: true });
    }
    return productosPorDefecto;
  });

  const [categorias, setCategorias] = useState<string[]>(() => {
    const guardado = localStorage.getItem('local_categorias');
    return guardado ? JSON.parse(guardado) : categoriesPorDefecto;
  });

  const [contadorPedidos, setContadorPedidos] = useState<number>(() => {
    return Number(localStorage.getItem('local_pedidos_count') || "0");
  });

  const [cajaAcumulada, setCajaAcumulada] = useState<number>(() => {
    return Number(localStorage.getItem('local_caja_acumulada') || "0");
  });

  const [isAdminAutenticado, setIsAdminAutenticado] = useState<boolean>(() => {
    return localStorage.getItem('admin_sesion_activa') === 'true';
  });

  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [animarCarrito, setAnimarCarrito] = useState(false);

  useEffect(() => { localStorage.setItem('local_info', JSON.stringify(infoLocal)); }, [infoLocal]);
  useEffect(() => { localStorage.setItem('local_productos', JSON.stringify(productos)); }, [productos]);
  useEffect(() => { localStorage.setItem('local_categorias', JSON.stringify(categorias)); }, [categorias]);

  // === SINCRONIZACIÓN AUTOMÁTICA CON FIREBASE ===
  useEffect(() => {
    const syncToCloud = async () => {
      try {
        await setDoc(doc(db, "tienda", "configuracion"), {
          infoLocal,
          productos,
          categorias,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Error al sincronizar con Firebase:", e);
      }
    };
    
    // Solo sincronizamos si ya tenemos datos cargados para evitar vaciar la BD
    if (infoLocal.nombre) syncToCloud();
  }, [infoLocal, productos, categorias]);

  // === CARGA INICIAL DESDE FIREBASE (Al abrir la App) ===
  useEffect(() => {
    const cargarDesdeNube = async () => {
      try {
        const docRef = doc(db, "tienda", "configuracion");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Actualizamos los estados si Firebase tiene datos más recientes
          if (data.productos) setProductos(data.productos);
          if (data.infoLocal) setInfoLocal(data.infoLocal);
          if (data.categorias) setCategorias(data.categorias);
        }
      } catch (e) {
        console.error("Error al cargar datos de Firebase:", e);
      }
    };
    cargarDesdeNube();
  }, []);

  // === ESTADOS DE NAVEGACIÓN, BUSCADOR Y CARRITO ===
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0] || 'pizzas');
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
  const [seccionAdminAbierta, setSeccionAdminAbierta] = useState<string | null>('productos');

  // === ESTADOS INTERNOS DEL PANEL ===
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null);
  const [nuevaCat, setNuevaCat] = useState('');
  const [mostrarFormularioProd, setMostrarFormularioProd] = useState(false);
  const [categoriaAdminActiva, setCategoriaAdminActiva] = useState(categorias[0] || 'pizzas');
  const [prodForm, setProdForm] = useState({ nombre: '', descripcion: '', precio: 0, categoria: categorias[0] || 'pizzas', imagen: '', activo: true });

  useEffect(() => {
    if (categorias.length > 0 && !categorias.includes(prodForm.categoria)) {
      setProdForm(p => ({ ...p, categoria: categorias[0] }));
    }
    if (categorias.length > 0 && !categorias.includes(categoriaAdminActiva)) {
      setCategoriaAdminActiva(categorias[0]);
    }
  }, [categorias]);

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
    if (!file) return;

    // @ts-ignore
    const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
    // @ts-ignore
    const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert("Error de configuración de Cloudinary en las variables de entorno.");
      return;
    }

    try {
      setSubiendoImagen(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      if (!respuesta.ok) throw new Error('Error de subida');
      const datosImagen = await respuesta.json();
      const urlNube = datosImagen.secure_url; 

      if (tipo === 'portada') setInfoLocal(p => ({ ...p, portadaUrl: urlNube }));
      if (tipo === 'avatar') setInfoLocal(p => ({ ...p, avatarUrl: urlNube }));
      if (tipo === 'producto') setProdForm(p => ({ ...p, imagen: urlNube }));
    } catch (error) {
      console.error(error);
      alert('Error al subir la imagen.');
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

  const toggleActivoProducto = (id: string) => {
    const listadoActualizado = productos.map(p => p.id === id ? { ...p, activo: p.activo === false ? true : false } : p);
    setProductos(listadoActualizado);
    localStorage.setItem('local_productos', JSON.stringify(listadoActualizado));
  };

  const abrirGoogleMapsExterno = () => {
    window.open("https://www.google.com/maps", "_blank");
    alert("📍 Te redirigimos a Google Maps:\n\n1. Buscá tu casa o ubicación exacta.\n2. Tocá el botón 'Compartir'.\n3. Elegí 'Copiar enlace'.\n4. Regresá acá y pegalo en el cuadro de abajo.");
  };

  const enviarPedidoWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono || !direccion || !entreCalles) return;

    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const totalFinal = subtotal + infoLocal.costoEnvio;

    let mensaje = `⭐️ *NUEVO PEDIDO - ${infoLocal.nombre.toUpperCase()}* ⭐️\n\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n📞 *Teléfono:* ${telefono}\n📍 *Dirección:* ${direccion}\n🛣 *Entre Calles:* ${entreCalles}\n`;
    
    if (gmapsLink.trim() !== "") {
      mensaje += `📌 *UBICACIÓN GOOGLE MAPS REPARTIDOR:*\n${gmapsLink.trim()}\n`;
    }
    
    mensaje += `\n🛒 *Detalle:*\n`;
    carrito.forEach(item => { mensaje += `• ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})\n`; });
    mensaje += `\n💵 *Subtotal:* $${subtotal.toLocaleString('es-AR')}\n🛵 *Envío:* $${infoLocal.costoEnvio.toLocaleString('es-AR')}\n💰 *TOTAL:* $${totalFinal.toLocaleString('es-AR')}\n\n`;
    mensaje += `💳 *Método de Pago:* ${metodoPago === 'efectivo' ? 'Efectivo Cash 💵' : 'Transferencia Bancaria/Virtual 📱'}\n`;
    
    if (metodoPago === 'efectivo') {
      const m = Number(pagaCon);
      mensaje += m && m > totalFinal ? `💸 *Paga con:* $${m}\n🪙 *Vuelto:* $${m - totalFinal}\n` : `💸 *Paga con:* Importe exacto\n`;
    } else {
      mensaje += `🏛 *CVU:* ${infoLocal.cbuCvu}\n🔑 *Alias:* ${infoLocal.alias}\n_Por favor, envíe el comprobante._\n`;
    }

    const nP = contadorPedidos + 1;
    const nC = cajaAcumulada + totalFinal;
    setContadorPedidos(nP); setCajaAcumulada(nC);
    localStorage.setItem('local_pedidos_count', nP.toString());
    localStorage.setItem('local_caja_acumulada', nC.toString());

    window.open(`https://wa.me/${infoLocal.telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const ejecutarCierreCaja = () => {
    alert(`📢 Turno Cerrado\n\nPedidos: ${contadorPedidos}\nRecaudado: $${cajaAcumulada.toLocaleString('es-AR')}`);
    setContadorPedidos(0); setCajaAcumulada(0);
    localStorage.setItem('local_pedidos_count', "0"); localStorage.setItem('local_caja_acumulada', "0");
  };

  const accederAlAdminSeguro = () => {
    if (isAdminAutenticado) {
      setVistaActual('admin');
    } else {
      const password = prompt("Ingresá la contraseña del administrador:");
      if (password === "applodefiore") {
        setIsAdminAutenticado(true);
        localStorage.setItem('admin_sesion_activa', 'true');
        setVistaActual('admin');
      } else if (password !== null) {
        alert("Contraseña incorrecta.");
      }
    }
  };

  const cerrarSesionAdmin = () => {
    if (window.confirm("¿Querés cerrar sesión en este dispositivo?")) {
      setIsAdminAutenticado(false);
      localStorage.removeItem('admin_sesion_activa');
      setVistaActual('menu');
    }
  };

  const toggleSeccionAdmin = (seccion: string) => {
    setSeccionAdminAbierta(seccionAdminAbierta === seccion ? null : seccion);
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

  const productosFiltradosAdmin = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busquedaAdmin.toLowerCase()) || 
                             p.descripcion.toLowerCase().includes(busquedaAdmin.toLowerCase());
    if (busquedaAdmin.trim() !== "") {
      return coincideBusqueda;
    }
    return p.categoria === categoriaAdminActiva;
  });

  return (
    <div className="max-w-md mx-auto bg-neutral-900 min-h-screen pb-24 shadow-2xl relative font-sans text-white border-x border-neutral-800">
      
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
          <div className="h-44 bg-cover bg-center relative" style={{ backgroundImage: `url(${infoLocal.portadaUrl})` }}>
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="px-4 -mt-14 relative flex flex-col items-center text-center mb-2">
            <img src={infoLocal.avatarUrl} alt="Logo" className="w-24 h-24 rounded-full border-4 border-sky-400 object-cover shadow-xl bg-neutral-900" />
            <div className="flex gap-1 mt-2 text-yellow-500"><Star size={16} fill="currentColor" /><Star size={20} fill="currentColor" className="-mt-1" /><Star size={16} fill="currentColor" /></div>
            <h1 className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-sky-400 tracking-tight">{infoLocal.nombre}</h1>
            <p className="text-xs text-neutral-400 font-medium px-4 mt-1">{infoLocal.descripcion}</p>
            
            <div className="flex gap-4 mt-3 text-neutral-400">
              {infoLocal.instagram && <a href={`https://instagram.com/${infoLocal.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/50">📸 Insta</a>}
              {infoLocal.facebook && <a href={`https://facebook.com/${infoLocal.facebook.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/50">🔵 Face</a>}
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-sky-400 font-semibold bg-sky-950/40 px-3 py-1 rounded-full border border-sky-900/40"><MapPin size={13} /><span>{infoLocal.direccion}</span></div>
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
                    <p>Alias: {infoLocal.alias}</p><p>CVU: {infoLocal.cbuCvu}</p>
                  </div>
                )}
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 text-sm space-y-1">
                <div className="flex justify-between text-neutral-400"><span>Subtotal:</span><span>${subtotalCarrito.toLocaleString('es-AR')}</span></div>
                <div className="flex justify-between text-neutral-400"><span>Envío:</span><span>${infoLocal.costoEnvio.toLocaleString('es-AR')}</span></div>
                <div className="flex justify-between font-black text-white text-base mt-2"><span>Total Final:</span><span className="text-yellow-500">${(subtotalCarrito + infoLocal.costoEnvio).toLocaleString('es-AR')}</span></div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"><MessageSquare size={18} fill="currentColor" />Enviar por WhatsApp</button>
            </form>
          )}
        </div>
      )}

      {/* VISTA 3: PANEL ADMINISTRADOR */}
      {vistaActual === 'admin' && (
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">⚙️ Panel Admin</h2>
              <span className="text-[11px] text-neutral-500">Manejo Masivo de Stock</span>
            </div>
            <div className="flex gap-2">
              <button onClick={cerrarSesionAdmin} className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded-xl hover:bg-red-500/20"><LogOut size={14} /></button>
              <button onClick={() => setVistaActual('menu')} className="bg-neutral-800 text-white font-bold py-2 px-3 rounded-xl text-xs">Menu</button>
            </div>
          </div>

          {/* CAJA */}
          <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
            <button onClick={() => toggleSeccionAdmin('caja')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-yellow-500">
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
                <button onClick={ejecutarCierreCaja} className="w-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">Efectuar Cierre de Turno</button>
              </div>
            )}
          </div>

          {/* DATOS COMERCIO */}
          <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
            <button onClick={() => toggleSeccionAdmin('datos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
              <span className="flex items-center gap-2"><User size={14}/> Información del Comercio</span>
              {seccionAdminAbierta === 'datos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            {seccionAdminAbierta === 'datos' && (
              <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
                <input type="text" placeholder="Nombre del Local" value={infoLocal.nombre} onChange={e=>setInfoLocal({...infoLocal, nombre: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" />
                <textarea placeholder="Descripción / Slogan" value={infoLocal.descripcion} onChange={e=>setInfoLocal({...infoLocal, descripcion: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs h-16 text-white" />
                <input type="text" placeholder="Dirección Comercial" value={infoLocal.direccion} onChange={e=>setInfoLocal({...infoLocal, direccion: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" />
                <input type="text" placeholder="WhatsApp (Con código de área, ej: 549...)" value={infoLocal.telefonoWhatsApp} onChange={e=>setInfoLocal({...infoLocal, telefonoWhatsApp: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" />
                <input type="number" placeholder="Costo de Envío Fijo ($)" value={infoLocal.costoEnvio || ''} onChange={e=>setInfoLocal({...infoLocal, costoEnvio: Number(e.target.value)})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" />
              </div>
            )}
          </div>

          {/* IMÁGENES */}
          <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
            <button onClick={() => toggleSeccionAdmin('fotos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
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
                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'portada')} className="hidden" />
                  </label>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-center">
                  <span className="text-[10px] text-neutral-400 font-bold mb-2">Logo / Perfil</span>
                  <img src={infoLocal.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-sky-400/30 mb-2" alt="" />
                  <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                     Cambiar
                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'avatar')} className="hidden" />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* COBROS */}
          <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
            <button onClick={() => toggleSeccionAdmin('cobros')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
              <span className="flex items-center gap-2"><CreditCard size={14}/> Cuentas de Transferencia</span>
              {seccionAdminAbierta === 'cobros' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            {seccionAdminAbierta === 'cobros' && (
              <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
                <input type="text" placeholder="CBU / CVU Bancario" value={infoLocal.cbuCvu} onChange={e=>setInfoLocal({...infoLocal, cbuCvu: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" />
                <input type="text" placeholder="Alias de Cuenta" value={infoLocal.alias} onChange={e=>setInfoLocal({...infoLocal, alias: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" />
              </div>
            )}
          </div>

          {/* CATEGORÍAS */}
          <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
            <button onClick={() => toggleSeccionAdmin('categorias')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-sky-400">
              <span className="flex items-center gap-2"><Layers size={14}/> Estructura de Secciones</span>
              {seccionAdminAbierta === 'categorias' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            {seccionAdminAbierta === 'categorias' && (
              <div className="p-4 pt-3 space-y-3 border-t border-neutral-800/50">
                <div className="flex gap-2">
                  <input type="text" placeholder="Agregar nueva sección (Ej: postres)" value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl py-2 px-3 text-xs text-white" />
                  <button type="button" onClick={()=>{ if(nuevaCat){ const n = nuevaCat.toLowerCase().trim(); setCategorias([...categorias, n]); setNuevaCat(''); } }} className="bg-sky-500 text-neutral-950 px-4 rounded-xl text-xs font-black">+</button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categorias.map(cat => (
                    <span key={cat} className="bg-neutral-900 text-neutral-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-neutral-700 flex items-center gap-1 capitalize">
                      {cat}
                      <X size={10} className="text-red-400 cursor-pointer" onClick={()=>{ if(window.confirm(`¿Borrar "${cat}"?`)) setCategorias(categorias.filter(c=>c!==cat)); }} />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PRODUCTOS */}
          <div className="bg-neutral-800/60 rounded-2xl border border-neutral-700/30 overflow-hidden">
            <button onClick={() => toggleSeccionAdmin('productos')} className="w-full p-4 flex justify-between items-center font-black text-xs uppercase tracking-wider text-emerald-400">
              <span className="flex items-center gap-2"><ShoppingBag size={14}/> Gestión de Productos</span>
              {seccionAdminAbierta === 'productos' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            {seccionAdminAbierta === 'productos' && (
              <div className="p-4 pt-3 space-y-4 border-t border-neutral-800/50">
                
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar producto por nombre..." 
                    value={busquedaAdmin}
                    onChange={e => setBusquedaAdmin(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-8 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-neutral-600"
                  />
                  {busquedaAdmin && <X size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer" onClick={() => setBusquedaAdmin('')} />}
                </div>

                <div className="flex justify-between items-center bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 cursor-pointer" onClick={() => setMostrarFormularioProd(!mostrarFormularioProd)}>
                  <span className="text-[11px] font-black text-yellow-400 uppercase">{editandoProductoId ? "✏️ Editando Producto" : "➕ Crear Nuevo Artículo"}</span>
                  {mostrarFormularioProd ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {mostrarFormularioProd && (
                  <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/60 space-y-2">
                    <input type="text" placeholder="Nombre del plato/bebida" value={prodForm.nombre} onChange={e=>setProdForm({...prodForm, nombre: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white" />
                    <input type="text" placeholder="Detalle o descripción del contenido" value={prodForm.descripcion} onChange={e=>setProdForm({...prodForm, descripcion: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white" />
                    <input type="number" placeholder="Precio de Venta ($)" value={prodForm.precio || ''} onChange={e=>setProdForm({...prodForm, precio: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs text-white" />
                    <select value={prodForm.categoria} onChange={e=>setProdForm({...prodForm, categoria: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs capitalize text-white">
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="file" accept="image/*" onChange={e=>handleFileChange(e,'producto')} className="text-[10px]" />
                    <button type="button" disabled={subiendoImagen || !prodForm.nombre || !prodForm.precio} onClick={() => {
                      const imgF = prodForm.imagen.trim() !== "" ? prodForm.imagen : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500";
                      let lN = editandoProductoId ? productos.map(p => p.id === editandoProductoId ? { ...prodForm, imagen: imgF, id: editandoProductoId } : p) : [...productos, { ...prodForm, imagen: imgF, id: 'prod_' + Date.now(), activo: true }];
                      setProductos(lN); localStorage.setItem('local_productos', JSON.stringify(lN));
                      setEditandoProductoId(null); setProdForm({ nombre: '', descripcion: '', precio: 0, categoria: categoriaAdminActiva, imagen: '', activo: true }); setMostrarFormularioProd(false);
                    }} className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 font-black py-2 rounded-lg text-xs uppercase">Guardar Artículo</button>
                  </div>
                )}

                {!busquedaAdmin.trim() && (
                  <div className="border-t border-neutral-800/80 pt-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                      {categorias.map(cat => (
                        <button key={cat} type="button" onClick={() => setCategoriaAdminActiva(cat)} className={`px-3 py-1.5 rounded-xl capitalize font-bold text-[11px] ${categoriaAdminActiva === cat ? 'bg-sky-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'}`}>{cat}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {productosFiltradosAdmin.length === 0 ? (
                    <p className="text-center py-4 text-neutral-500 text-[11px]">No se encontraron artículos.</p>
                  ) : (
                    productosFiltradosAdmin.map(p => (
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
                          <button onClick={() => toggleActivoProducto(p.id)} className={`p-2 rounded-lg transition-colors ${p.activo !== false ? 'text-emerald-400 bg-emerald-950/40' : 'text-red-400 bg-red-950/40'}`}>
                            {p.activo !== false ? <Eye size={12}/> : <EyeOff size={12}/>}
                          </button>
                          <button onClick={()=>{ setEditandoProductoId(p.id); setProdForm({ ...p, activo: p.activo !== false }); setMostrarFormularioProd(true); }} className="p-2 text-sky-400 bg-neutral-800 rounded-lg"><Edit2 size={12}/></button>
                          <button onClick={()=>{ if(window.confirm(`¿Eliminar?`)){ const f = productos.filter(pr=>pr.id!==p.id); setProductos(f); localStorage.setItem('local_productos', JSON.stringify(f)); } }} className="p-2 text-red-400 bg-neutral-800 rounded-lg"><Trash2 size={12}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NAV INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex justify-around py-3 rounded-t-2xl z-30">
        <button onClick={() => setVistaActual('menu')} className={`flex flex-col items-center ${vistaActual === 'menu' ? 'text-sky-400 font-bold' : 'text-neutral-500'}`}>
          <ShoppingBag size={20} /><span className="text-[10px] mt-1">Menú</span>
        </button>
        <button onClick={() => setVistaActual('carrito')} className={`flex flex-col items-center relative ${vistaActual === 'carrito' ? 'text-sky-400 font-bold' : 'text-neutral-500'}`}>
          <ShoppingCart size={20} /><span className="text-[10px] mt-1">Carrito</span>
          {cantidadTotalProductos > 0 && <span className="absolute -top-1 right-2 bg-sky-500 text-neutral-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cantidadTotalProductos}</span>}
        </button>
      </div>

      {/* ACCESO OCULTO AL PANEL DE CONTROL */}
      <button onClick={accederAlAdminSeguro} className="absolute bottom-0 left-0 right-0 h-4 bg-transparent z-40 cursor-default focus:outline-none" />

    </div>
  );
}