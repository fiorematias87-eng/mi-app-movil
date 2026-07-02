// src/views/client/HomeCliente.tsx
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ShoppingCart, MessageSquare, MapPin, Plus, Minus, 
  Trash2, Star, User, Phone, Navigation, Settings, X, Edit2, 
  Save, DollarSign, Clock, Calendar, Image, Link, CreditCard, Layers 
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

  // Formulario del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [entreCalles, setEntreCalles] = useState('');

  // === ESTADOS INTERNOS DEL PANEL DE CONTROL ===
  const [editandoProductoId, setEditandoProductoId] = useState<string | null>(null);
  const [nuevaCat, setNuevaCat] = useState('');
  
  // Inputs temporales para agregar/editar producto
  const [prodForm, setProdForm] = useState({ nombre: '', descripcion: '', precio: 0, categoria: 'pizzas', imagen: '' });

  // === PROCESADOR DE ARCHIVOS DIRECTO A CLOUDINARY (MODO UNSIGNED SEGURO) ===
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'portada' | 'avatar' | 'producto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoImagen(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');

      // CLOUDINARY CORREGIDO: Apuntando a tu Cloud Name real -> wuykv9xw
      const respuesta = await fetch('https://api.cloudinary.com/v1_1/wuykv9xw/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!respuesta.ok) {
        throw new Error('Error al subir el archivo a Cloudinary. Revisa tu panel.');
      }

      const datosImagen = await respuesta.json();
      const urlNube = datosImagen.secure_url; 

      if (tipo === 'portada') setInfoLocal(p => ({ ...p, portadaUrl: urlNube }));
      if (tipo === 'avatar') setInfoLocal(p => ({ ...p, avatarUrl: urlNube }));
      if (tipo === 'producto') setProdForm(p => ({ ...p, imagen: urlNube }));

    } catch (error) {
      console.error(error);
      alert('Hubo un problema al subir la foto. Comprobá que el "upload_preset" en tu Cloudinary se llame "ml_default" y esté en modo Unsigned.');
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

  // Enviar WhatsApp e impactar métricas en el Panel
  const enviarPedidoWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !telefono || !direccion || !entreCalles) return;

    let mensaje = `⭐️ *NUEVO PEDIDO - ${infoLocal.nombre.toUpperCase()}* ⭐️\n\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n📞 *Teléfono:* ${telefono}\n📍 *Dirección:* ${direccion}\n🛣 *Entre Calles:* ${entreCalles}\n\n`;
    mensaje += `🛒 *Detalle:*\n`;
    carrito.forEach(item => { 
  mensaje += `• ${item.cantidad}x ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})\n`; 
});