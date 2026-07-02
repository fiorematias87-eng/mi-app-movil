// src/views/client/HomeCliente.tsx
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ShoppingCart, MessageSquare, MapPin, Plus, Minus, 
  Trash2, Star, User, Phone, Navigation, Settings, X, Edit2, 
  Save, DollarSign, Clock, Calendar, Image, Link, CreditCard, Layers, ChevronDown, ChevronUp
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
}

interface ItemDelCarrito {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

type MetodoPago = 'efectivo' | 'transferencia';

// === DATOS POR DEFECTO (PRIMER ARRANQUE) ===
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
  { id: "p1", nombre: "Pizza Muzzarella", descripcion: "Salsa de tomate artesanal, abundante muzzarella, aceitunas verdes.", precio: 8500, categoria: "pizzas", imagen: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=500" },
  { id: "p2", nombre: "Pizza Fugazzeta", descripcion: "Mucha cebolla, muzzarella de primera calidad, olivas negras.", precio: 9500, categoria: "pizzas", imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500" },
  { id: "e1", nombre: "Empanada de Carne a Cuchillo", descripcion: "Carne tierna, cebolla, huevo duro, comino. ¡Bien jugosa!", precio: 1200, categoria: "empanadas", imagen: "https://images.unsplash.com/photo-1555243833-c440d5e6f4a3?q=80&w=500" }
];

const categoriasPorDefecto = ["pizzas", "empanadas", "bebidas", "promos"];

export default function HomeCliente() {
  // === ESTADOS CON PERSISTENCIA LOCAL STORAGE ===
  const [infoLocal, setInfoLocal] = useState<InfoLocal>(() => {
    const guardado = localStorage.getItem('local_info');
    return guardado ? JSON.parse(guardado) : infoLocalPorDefecto;
  });

  const [productos, setProductos] = useState<Producto[]>(() => {
    const guardado = localStorage.getItem('local_productos');
    return guardado ? JSON.parse(guardado) : productosPorDefecto;
  });

  const [categorias, setCategorias] = useState<string[]>(() => {
    const guardado = localStorage.getItem('local_categorias');
    return guardado ? JSON.parse(guardado) : categoriasPorDefecto;
  });

  const [contadorPedidos, setContadorPedidos] = useState<number>(() => {
    return Number(localStorage.getItem('local_pedidos_count') || "0");
  });

  const [cajaAcumulada, setCajaAcumulada] = useState<number>(() => {
    return Number(localStorage.getItem('local_caja_acumulada') || "0");
  });

  // Estado para bloquear botones e informar la carga de archivos
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  // Guardado Automático al cambiar datos
  useEffect(() => { localStorage.setItem('local_info', JSON.stringify(infoLocal)); }, [infoLocal]);
  useEffect(() => { localStorage.setItem('local_productos', JSON.stringify(productos)); }, [productos]);
  useEffect(() => { localStorage.setItem('local_categorias', JSON.stringify(categorias)); }, [categorias]);

  // === ESTADOS DE NAVEGACIÓN Y CARRITO ===
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0] || 'pizzas');
  const [carrito, setCarrito] = useState<ItemDelCarrito[]>([]);
  const [vistaActual, setVistaActual] = useState<'menu' | 'carrito' | 'admin'>('menu');

  // Formulario del cliente con Persistencia en LocalStorage
  const [nombre, setNombre] = useState(() => localStorage.getItem('cliente_nombre') || '');
  const [telefono, setTelefono] = useState(() => localStorage.getItem('cliente_telefono') || '');
  const [direccion, setDireccion] = useState(() => localStorage.getItem('cliente_direccion') || '');
  const [entreCalles, setEntreCalles] = useState(() => localStorage.getItem('cliente_entrecalles') || '');
  const [gmapsLink, setGmapsLink] = useState(() => localStorage.getItem('cliente_gmaps') || '');

  // Métodos de pago y vuelto
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [pagaCon, setPagaCon] = useState<string>('');

  // Persistencia de los datos del cliente
  useEffect(() => { localStorage.setItem('cliente_nombre', nombre); }, [nombre]);
  useEffect(() => { localStorage.setItem('cliente_telefono', telefono); }, [telefono]);
  useEffect(() => { localStorage.setItem('cliente_direccion', direccion); }, [direccion]);
  useEffect(() => { localStorage.setItem('cliente_entrecalles', entreCalles); }, [entreCalles]);
  useEffect(() => { localStorage.setItem('cliente_gmaps', gmapsLink); }, [gmapsLink]);

  // === ESTADOS INTERNOS DEL PANEL DE CONTROL ===
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null);
  const [nuevaCat, setNuevaCat] = useState('');
  
  // UX Mejorada: Estados para colapsar secciones del Admin y pestañas de filtro interna
  const [mostrarFormularioProd, setMostrarFormularioProd] = useState(false);
  const [categoriaAdminActiva, setCategoriaAdminActiva] = useState(categorias[0] || 'pizzas');
  
  // Inputs temporales para agregar/editar producto (La categoría inicial se acopla dinámicamente)
  const [prodForm, setProdForm] = useState({ nombre: '', descripcion: '', precio: 0, categoria: categorias[0] || 'pizzas', imagen: '' });

  // Sincronizar la categoría por defecto del formulario si cambian las categorías disponibles
  useEffect(() => {
    if (categorias.length > 0 && !categorias.includes(prodForm.categoria)) {
      setProdForm(p => ({ ...p, categoria: categorias[0] }));
    }
    if (categorias.length > 0 && !categorias.includes(categoriaAdminActiva)) {
      setCategoriaAdminActiva(categorias[0]);
    }
  }, [categorias]);

  // === PROCESADOR DE ARCHIVOS DIRECTO A CLOUDINARY ===
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'portada' | 'avatar' | 'producto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // @ts-ignore
    const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
    // @ts-ignore
    const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Faltan configurar las variables de entorno de Cloudinary (VITE_CLOUDINARY_CLOUD_NAME o VITE_CLOUDINARY_UPLOAD_PRESET)");
      alert("Error de configuración del sistema de imágenes. Verifique las variables de entorno.");
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

      if (!respuesta.ok) {
        throw new Error('Error al subir el archivo a Cloudinary.');
      }

      const datosImagen = await respuesta.json();
      const urlNube = datosImagen.secure_url; 

      if (tipo === 'portada') setInfoLocal(p => ({ ...p, portadaUrl: urlNube }));
      if (tipo === 'avatar') setInfoLocal(p => ({ ...p, avatarUrl: urlNube }));
      if (tipo === 'producto') setProdForm(p => ({ ...p, imagen: urlNube }));

    } catch (error) {
      console.error(error);
      alert('Hubo un problema al subir la foto. Comprobá las variables del entorno en tu host o archivo .env, y que el preset esté en modo Unsigned.');
    } finally {
      setSubiendoImagen(false);
    }
  };

  // Funciones del menú interactivo
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      return [...prev, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id: string, accion: 'sumar' | 'restar') => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCantidad = accion === 'sumar' ? item.cantidad + 1 : item.cantidad - 1;
        return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : item;
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const vaciarCarrito = () => {
    if (window.confirm("¿Estás seguro de que querés vaciar por completo el carrito?")) {
      setCarrito([]);
    }
  };

  // API Nativa de Geolocalización para Google Maps
  const obtenerGeolocalizacion = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización.");
      return;
    }
    alert("Solicitando permisos de ubicación... Asegúrate de aceptarlos.");
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const lat = posicion.coords.latitude;
        const lon = posicion.coords.longitude;
        const linkGoogleMaps = `https://www.google.com/maps?q=${lat},${lon}`;
        setGmapsLink(linkGoogleMaps);
        alert("📍 ¡Ubicación GPS guardada correctamente con éxito!");
      },
      (error) => {
        console.error(error);
        alert("No se pudo obtener la ubicación exacta. Asegúrate de tener el GPS activado.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Enviar WhatsApp e impactar métricas en el Panel
  const enviarPedidoWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono || !direccion || !entreCalles) return;

    const subtotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const totalFinal = subtotal + infoLocal.costoEnvio;

    let mensaje = `⭐️ *NUEVO PEDIDO - ${infoLocal.nombre.toUpperCase()}* ⭐️\n\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n📞 *Teléfono:* ${telefono}\n📍 *Dirección:* ${direccion}\n🛣 *Entre Calles:* ${entreCalles}\n`;
    
    if (gmapsLink) {
      mensaje += `🗺️ *Ubicación GPS:* ${gmapsLink}\n`;
    }
    mensaje += `\n🛒 *Detalle:*\n`;
    
    carrito.forEach(item => { 
      mensaje += `• ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})\n`; 
    });
    
    mensaje += `\n💵 *Subtotal:* $${subtotal.toLocaleString('es-AR')}\n🛵 *Envío:* $${infoLocal.costoEnvio.toLocaleString('es-AR')}\n💰 *TOTAL:* $${totalFinal.toLocaleString('es-AR')}\n\n`;
    
    mensaje += `💳 *Método de Pago:* ${metodoPago === 'efectivo' ? 'Efectivo Cash 💵' : 'Transferencia Bancaria/Virtual 📱'}\n`;
    
    if (metodoPago === 'efectivo') {
      const montoPagaCon = Number(pagaCon);
      if (montoPagaCon && montoPagaCon > totalFinal) {
        mensaje += `💸 *Paga con:* $${montoPagaCon.toLocaleString('es-AR')}\n🪙 *Vuelto para el repartidor:* $${(montoPagaCon - totalFinal).toLocaleString('es-AR')}\n`;
      } else {
        mensaje += `💸 *Paga con:* Importe exacto\n`;
      }
    } else {
      mensaje += `🏛 *CVU:* ${infoLocal.cbuCvu}\n🔑 *Alias:* ${infoLocal.alias}\n_Por favor, envíe el comprobante por este chat._\n`;
    }

    const nuevosPedidos = contadorPedidos + 1;
    const nuevaCaja = cajaAcumulada + totalFinal;
    setContadorPedidos(nuevosPedidos);
    setCajaAcumulada(nuevaCaja);
    localStorage.setItem('local_pedidos_count', nuevosPedidos.toString());
    localStorage.setItem('local_caja_acumulada', nuevaCaja.toString());

    window.open(`https://wa.me/${infoLocal.telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const ejecutarCierreCaja = () => {
    alert(`📢 CIERRE DE CAJA EFECTUADO\n\nPedidos del Turno: ${contadorPedidos}\nTotal Recaudado: $${cajaAcumulada.toLocaleString('es-AR')}\n\nLos valores se reiniciarán a cero.`);
    setContadorPedidos(0);
    setCajaAcumulada(0);
    localStorage.setItem('local_pedidos_count', "0");
    localStorage.setItem('local_caja_acumulada', "0");
  };

  const cantidadTotalProductos = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const subtotalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  return (
    <div className="max-w-md mx-auto bg-neutral-900 min-h-screen pb-24 shadow-2xl relative font-sans text-white border-x border-neutral-800">
      
      {/* Indicador visual flotante de subida */}
      {subiendoImagen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-neutral-950 px-5 py-2.5 rounded-full font-black text-xs z-50 shadow-xl animate-bounce">
          ⏳ Guardando foto en la nube...
        </div>
      )}

      {/* === BOTÓN FLOTANTE DINÁMICO DEL CARRITO === */}
      {vistaActual === 'menu' && cantidadTotalProductos > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
          <button 
            onClick={() => setVistaActual('carrito')}
            className="w-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-neutral-950 font-black py-3 px-4 rounded-2xl flex items-center justify-between shadow-xl shadow-yellow-600/20 active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2">
              <div className="bg-neutral-950 text-yellow-400 font-extrabold text-xs w-6 h-6 rounded-lg flex items-center justify-center">
                {cantidadTotalProductos}
              </div>
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
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
          </div>
          <div className="px-4 -mt-14 relative flex flex-col items-center text-center mb-4">
            <img src={infoLocal.avatarUrl} alt="Logo" className="w-24 h-24 rounded-full border-4 border-sky-400 object-cover shadow-xl bg-neutral-900" />
            <div className="flex gap-1 mt-2 text-yellow-500 animate-pulse"><Star size={16} fill="currentColor" /><Star size={20} fill="currentColor" className="-mt-1" /><Star size={16} fill="currentColor" /></div>
            <h1 className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-sky-400 tracking-tight">{infoLocal.nombre}</h1>
            <p className="text-xs text-neutral-400 font-medium px-4 mt-1">{infoLocal.descripcion}</p>
            
            <div className="flex gap-4 mt-3 text-neutral-400">
              {infoLocal.instagram && (
                <a href={`https://instagram.com/${infoLocal.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:text-pink-400 transition bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/50">
                  <span className="font-bold">📸 Insta</span>
                </a>
              )}
              {infoLocal.facebook && (
                <a href={`https://facebook.com/${infoLocal.facebook.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:text-blue-400 transition bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/50">
                  <span className="font-bold">🔵 Face</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-1 mt-3 text-xs text-sky-400 font-semibold bg-sky-950/40 px-3 py-1 rounded-full border border-sky-900/40"><MapPin size={13} /><span>{infoLocal.direccion}</span></div>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 py-2 sticky top-0 bg-neutral-900/90 backdrop-blur-md z-10 scrollbar-none">
            {categorias.map((cat) => (
              <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-5 py-2.5 rounded-full capitalize font-black text-xs tracking-wider transition-all ${categoriaActiva === cat ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-neutral-950 shadow-md shadow-sky-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="px-4 mt-4 space-y-3">
            {productos.filter(p => p.categoria === categoriaActiva).map((producto) => (
              <div key={producto.id} className="bg-neutral-800/80 p-3 rounded-2xl shadow-md flex gap-3 border border-neutral-700/30 items-center justify-between">
                <img src={producto.imagen} alt={producto.nombre} className="w-20 h-20 rounded-xl object-cover bg-neutral-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base truncate">{producto.nombre}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">{producto.descripcion}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-black text-yellow-500 text-lg">${producto.precio.toLocaleString('es-AR')}</span>
                    <button onClick={() => agregarAlCarrito(producto)} className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 p-2 rounded-xl transition active:scale-95"><ShoppingCart size={15} strokeWidth={3} /></button>
                  </div>
                </div>
              </div>
            ))}
            {productos.filter(p => p.categoria === categoriaActiva).length === 0 && (
              <p className="text-center text-neutral-500 text-xs py-8">No hay artículos cargados en esta sección todavía.</p>
            )}
          </div>
        </>
      )}

      {/* VISTA 2: CARRITO DE COMPRAS */}
      {vistaActual === 'carrito' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-white">🛒 Tu Pedido</h2>
            {carrito.length > 0 && (
              <button 
                type="button" 
                onClick={vaciarCarrito}
                className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} /> Vaciar
              </button>
            )}
          </div>

          {carrito.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-neutral-500 text-sm">El carrito está totalmente vacío.</p>
              <button onClick={() => setVistaActual('menu')} className="bg-neutral-800 text-sky-400 font-bold text-xs px-4 py-2 rounded-full border border-neutral-700/60">Volver al menú</button>
            </div>
          ) : (
            <form onSubmit={enviarPedidoWhatsApp} className="space-y-5">
              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-4 border border-neutral-700/30">
                {carrito.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b border-neutral-700/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1"><h4 className="font-bold text-white text-sm">{item.nombre}</h4><p className="text-xs text-neutral-400">${item.precio.toLocaleString('es-AR')} c/u</p></div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => modificarCantidad(item.id, 'restar')} className="bg-neutral-900 p-1 rounded text-neutral-400"><Minus size={12} /></button>
                      <span className="font-bold text-sm px-1">{item.cantidad}</span>
                      <button type="button" onClick={() => modificarCantidad(item.id, 'sumar')} className="bg-neutral-900 p-1 rounded text-neutral-400"><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-3 border border-neutral-700/30">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black tracking-widest text-sky-400 uppercase">Datos de Entrega</h3>
                  <button 
                    type="button" 
                    onClick={obtenerGeolocalizacion} 
                    className="flex items-center gap-1 text-[11px] font-black bg-sky-500 text-neutral-950 px-2.5 py-1 rounded-lg shadow-md active:scale-95 transition-transform"
                  >
                    <Navigation size={11} fill="currentColor" /> {gmapsLink ? "📍 GPS Guardado" : "Fijar Mi Ubicación GPS"}
                  </button>
                </div>
                <input type="text" placeholder="Nombre y Apellido" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-sky-400" required />
                <input type="tel" placeholder="Teléfono" value={telefono} onChange={e=>setTelefono(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-sky-400" required />
                <input type="text" placeholder="Dirección (Calle y Altura)" value={direccion} onChange={e=>setDireccion(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-sky-400" required />
                <input type="text" placeholder="¿Entre qué calles?" value={entreCalles} onChange={e=>setEntreCalles(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-sky-400" required />
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl space-y-4 border border-neutral-700/30">
                <h3 className="text-xs font-black tracking-widest text-sky-400 uppercase">Forma de Pago</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setMetodoPago('efectivo')}
                    className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase flex flex-col items-center gap-1.5 transition-all ${metodoPago === 'efectivo' ? 'bg-sky-950/40 border-sky-400 text-sky-400 shadow-md' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}`}
                  >
                    <DollarSign size={16} /> Efectivo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setMetodoPago('transferencia')}
                    className={`py-3 px-4 rounded-xl border font-bold text-xs uppercase flex flex-col items-center gap-1.5 transition-all ${metodoPago === 'transferencia' ? 'bg-sky-950/40 border-sky-400 text-sky-400 shadow-md' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}`}
                  >
                    <CreditCard size={16} /> Transferencia
                  </button>
                </div>

                {metodoPago === 'efectivo' ? (
                  <div className="pt-1">
                    <label className="text-[10px] text-neutral-400 font-bold block mb-1.5 uppercase">¿Con cuánto vas a pagar?</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-bold">$</span>
                      <input 
                        type="number" 
                        placeholder="Ej: 20000 (Dejar vacío si es exacto)" 
                        value={pagaCon} 
                        onChange={e=>setPagaCon(e.target.value)} 
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 pl-7 pr-4 text-sm focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    {Number(pagaCon) > (subtotalCarrito + infoLocal.costoEnvio) && (
                      <p className="text-[11px] text-emerald-400 font-bold mt-2 px-1">
                        🪙 Vuelto estimado: ${(Number(pagaCon) - (subtotalCarrito + infoLocal.costoEnvio)).toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 text-xs space-y-1 text-neutral-300">
                    <p className="font-bold text-yellow-500 mb-1">Datos de transferencia:</p>
                    <p><span className="text-neutral-500">Alias:</span> {infoLocal.alias}</p>
                    <p><span className="text-neutral-500">CVU:</span> {infoLocal.cbuCvu}</p>
                  </div>
                )}
              </div>

              <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 text-sm space-y-1">
                <div className="flex justify-between text-neutral-400"><span>Subtotal:</span><span>${subtotalCarrito.toLocaleString('es-AR')}</span></div>
                <div className="flex justify-between text-neutral-400"><span>Envío:</span><span>${infoLocal.costoEnvio.toLocaleString('es-AR')}</span></div>
                <div className="flex justify-between font-black text-white text-base mt-2"><span>Total Final:</span><span className="text-yellow-500">${(subtotalCarrito + infoLocal.costoEnvio).toLocaleString('es-AR')}</span></div>
              </div>

              <button type="submit" disabled={subiendoImagen} className="w-full bg-emerald-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg disabled:opacity-40"><MessageSquare size={18} fill="currentColor" />Enviar Pedido por WhatsApp</button>
            </form>
          )}
        </div>
      )}

      {/* VISTA 3: PANEL DE CONTROL DE ADMINISTRADOR */}
      {vistaActual === 'admin' && (
        <div className="p-4 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">⚙️ Panel de Control</h2>
              <span className="text-[11px] text-neutral-500 font-medium">{new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <button onClick={() => setVistaActual('menu')} className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition">Cerrar Panel</button>
          </div>

          {/* Cierre de Caja */}
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-850 p-4 rounded-2xl border border-neutral-700/50 space-y-4">
            <h3 className="text-xs font-black text-yellow-500 tracking-wider uppercase flex items-center gap-1.5"><DollarSign size={14}/> Cierre de Caja y Métricas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-bold uppercase">Pedidos del Turno</p>
                <p className="text-2xl font-black text-sky-400 mt-1">{contadorPedidos}</p>
              </div>
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                <p className="text-[10px] text-neutral-500 font-bold uppercase">Caja Acumulada</p>
                <p className="text-xl font-black text-emerald-400 mt-1">${cajaAcumulada.toLocaleString('es-AR')}</p>
              </div>
            </div>
            <button onClick={ejecutarCierreCaja} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl transition text-xs uppercase tracking-wider">Efectuar Cierre de Caja / Turno</button>
          </div>

          {/* Datos del Comercio */}
          <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 space-y-3">
            <h3 className="text-xs font-black text-sky-400 tracking-wider uppercase flex items-center gap-1.5"><User size={14}/> Datos Básicos del Comercio</h3>
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1">Cambiar Foto Portada</label>
              <input type="file" accept="image/*" onChange={e=>handleFileChange(e,'portada')} className="text-xs text-neutral-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:bg-neutral-700 file:text-white" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1">Cambiar Foto Perfil/Logo</label>
              <input type="file" accept="image/*" onChange={e=>handleFileChange(e,'avatar')} className="text-xs text-neutral-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:bg-neutral-700 file:text-white" />
            </div>
            <input type="text" placeholder="Nombre del Local" value={infoLocal.nombre} onChange={e=>setInfoLocal({...infoLocal, nombre: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs" />
            <textarea placeholder="Descripción" value={infoLocal.descripcion} onChange={e=>setInfoLocal({...infoLocal, descripcion: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs h-16" />
            <input type="text" placeholder="Dirección Comercial" value={infoLocal.direccion} onChange={e=>setInfoLocal({...infoLocal, direccion: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs" />
            <input type="text" placeholder="WhatsApp Destino" value={infoLocal.telefonoWhatsApp} onChange={e=>setInfoLocal({...infoLocal, telefonoWhatsApp: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs" />
            <input type="number" placeholder="Costo de Envío ($)" value={infoLocal.costoEnvio || ''} onChange={e=>setInfoLocal({...infoLocal, costoEnvio: Number(e.target.value)})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs" />
          </div>

          {/* Redes y Cobros */}
          <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 space-y-3">
            <h3 className="text-xs font-black text-sky-400 tracking-wider uppercase flex items-center gap-1.5"><CreditCard size={14}/> Redes, CBU y Cobros</h3>
            <div className="relative"><Link size={12} className="absolute left-3 top-3 text-neutral-500"/><input type="text" placeholder="Instagram (ej: @local.ok)" value={infoLocal.instagram} onChange={e=>setInfoLocal({...infoLocal, instagram: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2 pl-8 pr-3 text-xs" /></div>
            <div className="relative"><Link size={12} className="absolute left-3 top-3 text-neutral-500"/><input type="text" placeholder="Facebook (ej: @local)" value={infoLocal.facebook} onChange={e=>setInfoLocal({...infoLocal, facebook: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2 pl-8 pr-3 text-xs" /></div>
            <input type="text" placeholder="CBU / CVU Mercado Pago" value={infoLocal.cbuCvu} onChange={e=>setInfoLocal({...infoLocal, cbuCvu: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs" />
            <input type="text" placeholder="Alias de Transferencia" value={infoLocal.alias} onChange={e=>setInfoLocal({...infoLocal, alias: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs" />
          </div>

          {/* Gestión de Secciones / Categorías */}
          <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 space-y-3">
            <h3 className="text-xs font-black text-sky-400 tracking-wider uppercase flex items-center gap-1.5"><Layers size={14}/> Agregar Secciones / Categorías</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Nueva sección (ej: heladeria, ropa)" value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl py-2 px-3 text-xs" />
              <button type="button" onClick={()=>{ if(nuevaCat){ const n = nuevaCat.toLowerCase().trim(); setCategorias([...categorias, n]); setNuevaCat(''); } }} className="bg-sky-500 text-neutral-950 px-4 rounded-xl text-xs font-black">+</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categorias.map(cat => {
                const count = productos.filter(p => p.categoria === cat).length;
                return (
                  <span key={cat} className="bg-neutral-900 text-neutral-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-neutral-700 flex items-center gap-1 capitalize">
                    {cat} <span className="text-sky-400 font-extrabold">({count})</span>
                    <X size={10} className="text-red-400 cursor-pointer ml-1" onClick={()=>{
                      if(window.confirm(`¿Seguro que querés borrar la sección "${cat}"? Los productos quedarán sin categoría.`)){
                        setCategorias(categorias.filter(c=>c!==cat));
                      }
                    }} />
                  </span>
                );
              })}
            </div>
          </div>

          {/* === MEJORA CRÍTICA: ADMINISTRAR COMIDAS / ARTÍCULOS === */}
          <div className="bg-neutral-800/60 p-4 rounded-2xl border border-neutral-700/30 space-y-4">
            
            {/* Cabecera Colapsable del Formulario */}
            <div 
              className="flex justify-between items-center cursor-pointer bg-neutral-900 p-3 rounded-xl border border-neutral-800"
              onClick={() => setMostrarFormularioProd(!mostrarFormularioProd)}
            >
              <div className="flex flex-col">
                <span className="text-xs font-black text-yellow-400 uppercase flex items-center gap-1.5">
                  <ShoppingBag size={13}/> {editandoProductoId ? "✏️ Modificando Artículo" : "➕ Cargar / Subir Artículo"}
                </span>
                <span className="text-[10px] text-neutral-500 mt-0.5">Click para abrir/cerrar el editor</span>
              </div>
              {mostrarFormularioProd ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-yellow-400" />}
            </div>

            {/* Formulario que se despliega u oculta */}
            {mostrarFormularioProd && (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2 animate-fade-in">
                <input type="text" placeholder="Nombre del producto / plato" value={prodForm.nombre} onChange={e=>setProdForm({...prodForm, nombre: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs" />
                <input type="text" placeholder="Descripción / Detalles / Talles" value={prodForm.descripcion} onChange={e=>setProdForm({...prodForm, descripcion: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs" />
                <input type="number" placeholder="Precio ($)" value={prodForm.precio || ''} onChange={e=>setProdForm({...prodForm, precio: Number(e.target.value)})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs" />
                
                <div>
                  <label className="text-[10px] text-neutral-400 font-bold block mb-1 uppercase">¿A qué sección va destinado?</label>
                  <select value={prodForm.categoria} onChange={e=>setProdForm({...prodForm, categoria: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg py-1.5 px-3 text-xs capitalize text-white font-bold">
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-neutral-400 block mb-0.5 uppercase font-bold">Foto del Artículo (Galería de tu celular)</label>
                  <input type="file" accept="image/*" onChange={e=>handleFileChange(e,'producto')} className="text-[10px] text-neutral-400" />
                  {prodForm.imagen && <p className="text-[10px] text-emerald-400 font-bold mt-1">✓ Foto subida con éxito</p>}
                </div>
                
                <div className="flex gap-2 pt-1">
                  <button 
                    type="button" 
                    disabled={subiendoImagen || !prodForm.nombre || !prodForm.precio}
                    onClick={() => {
                      const imagenFinal = prodForm.imagen.trim() !== "" ? prodForm.imagen : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500";
                      let listaNueva;
                      if (editandoProductoId) {
                        listaNueva = productos.map(p => p.id === editandoProductoId ? { ...prodForm, imagen: imagenFinal, id: editandoProductoId } : p);
                        setEditandoProductoId(null);
                      } else {
                        listaNueva = [...productos, { ...prodForm, imagen: imagenFinal, id: 'prod_' + Date.now() }];
                      }
                      setProductos(listaNueva);
                      localStorage.setItem('local_productos', JSON.stringify(listaNueva));
                      setProdForm({ nombre: '', descripcion: '', precio: 0, categoria: categoriaAdminActiva, imagen: '' });
                      setMostrarFormularioProd(false); // Cerramos automáticamente al guardar para ahorrar espacio
                    }}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-neutral-950 font-black py-2 rounded-lg text-xs uppercase disabled:opacity-40"
                  >
                    {editandoProductoId ? "Guardar Cambios" : "Confirmar y Subir"}
                  </button>
                  {editandoProductoId && (
                    <button type="button" onClick={()=>{ setEditandoProductoId(null); setProdForm({ nombre: '', descripcion: '', precio: 0, categoria: categoriaAdminActiva, imagen: '' }); setMostrarFormularioProd(false); }} className="bg-neutral-800 text-neutral-400 font-bold px-3 py-2 rounded-lg text-xs">Cancelar</button>
                  )}
                </div>
              </div>
            )}

            {/* Selector de Pestaña interna para el Panel de Control (No se mezcla con el cliente) */}
            <div className="border-t border-neutral-700/40 pt-3">
              <p className="text-[10px] text-neutral-400 font-bold uppercase mb-2">Filtrar lista por Sección para editar fácil:</p>
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {categorias.map(cat => (
                  <button 
                    key={cat} 
                    type="button" 
                    onClick={() => setCategoriaAdminActiva(cat)} 
                    className={`px-3 py-1.5 rounded-xl capitalize font-bold text-[11px] whitespace-nowrap transition-all ${categoriaAdminActiva === cat ? 'bg-sky-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}
                  >
                    {cat} ({productos.filter(p=>p.categoria===cat).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Listado filtrado y ordenado por espacio limpio */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {productos.filter(p => p.categoria === categoriaAdminActiva).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-neutral-900/60 p-2 rounded-xl border border-neutral-800 text-xs animate-fade-in">
                  <div className="flex items-center gap-2 truncate">
                    <img src={p.imagen} className="w-10 h-10 rounded-lg object-cover bg-neutral-800 flex-shrink-0" alt="" />
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{p.nombre}</p>
                      <p className="text-[10px] text-yellow-500 font-black">${p.precio.toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 ml-2">
                    <button onClick={()=>{ setEditandoProductoId(p.id); setProdForm(p); setMostrarFormularioProd(true); }} className="p-2 text-sky-400 bg-neutral-800 rounded-lg hover:bg-neutral-700"><Edit2 size={12}/></button>
                    <button 
                      onClick={()=>{
                        if(window.confirm(`¿Seguro de eliminar "${p.nombre}"?`)){
                          const filtrados = productos.filter(pr=>pr.id!==p.id);
                          setProductos(filtrados);
                          localStorage.setItem('local_productos', JSON.stringify(filtrados));
                        }
                      }} 
                      className="p-2 text-red-400 bg-neutral-800 rounded-lg hover:bg-neutral-700"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
              {productos.filter(p => p.categoria === categoriaAdminActiva).length === 0 && (
                <p className="text-center text-neutral-600 text-[11px] py-6">No hay artículos guardados en esta sección.</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* NAV INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 flex justify-around py-3 shadow-xl rounded-t-2xl z-30">
        <button onClick={() => setVistaActual('menu')} className={`flex flex-col items-center transition-colors ${vistaActual === 'menu' ? 'text-sky-400 font-bold' : 'text-neutral-500 font-medium'}`}>
          <ShoppingBag size={20} /><span className="text-[10px] mt-1">Menú</span>
        </button>
        <button onClick={() => setVistaActual('carrito')} className={`flex flex-col items-center relative transition-colors ${vistaActual === 'carrito' ? 'text-sky-400 font-bold' : 'text-neutral-500 font-medium'}`}>
          <ShoppingCart size={20} /><span className="text-[10px] mt-1">Carrito</span>
          {cantidadTotalProductos > 0 && <span className="absolute -top-1 right-2 bg-sky-500 text-neutral-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cantidadTotalProductos}</span>}
        </button>
      </div>

      {/* ACCESO ADMIN CAMUFLADO */}
      <button 
        onClick={() => {
          const password = prompt("Ingresá la contraseña del administrador:");
          if (password === "applodefiore") {
            setVistaActual('admin');
          } else if (password !== null) {
            alert("Contraseña incorrecta.");
          }
        }}
        className="absolute bottom-0 left-0 right-0 h-4 bg-transparent z-40 cursor-default focus:outline-none"
      />

    </div>
  );
}