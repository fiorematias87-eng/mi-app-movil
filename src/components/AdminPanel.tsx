import React, { useEffect, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
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
  infoLocal: Partial<InfoLocal> | null;
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
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>, tipo: 'portada' | 'avatar' | 'producto') => Promise<string | undefined>;
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
  const [seedCargando, setSeedCargando] = useState(false);
  const [prodForm, setProdForm] = useState<ProductoFormState>(crearProductoForm(categorias[0] ?? 'pizzas'));
  const [busquedaAdmin, setBusquedaAdmin] = useState('');
  const [suscripcionActiva, setSuscripcionActiva] = useState<boolean | null>(null);
  const [suscripcionCargando, setSuscripcionCargando] = useState(true);
  const [errorSuscripcion, setErrorSuscripcion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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

  const guardarCatalogo = async (nuevosProductos: Producto[]): Promise<boolean> => {
    setGuardando(true);

    try {
      const ok = await guardarProductosEnFirebase(nuevosProductos, infoLocal, categorias);
      if (!ok) {
        return false;
      }

      setProductos(nuevosProductos);
      return true;
    } catch (error) {
      console.error('Error al guardar el catálogo en Firebase:', error);
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const esUrlValida = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleGuardarProducto = async () => {
    if (!prodForm.nombre.trim() || !prodForm.precio) return;
    if (subiendoImagen) {
      alert('Espera a que la imagen termine de subir antes de guardar el producto.');
      return;
    }

    const imagenValida = prodForm.imagen.trim() !== '' && esUrlValida(prodForm.imagen.trim());
    const imagenFinal = imagenValida
      ? prodForm.imagen.trim()
      : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';

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

    const guardado = await guardarCatalogo(nuevosProductos);
    if (!guardado) {
      alert('No se pudo guardar el producto. Verifica la conexión y vuelve a intentarlo.');
      return;
    }

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
    const guardado = await guardarCatalogo(nuevosProductos);
    if (!guardado) {
      alert('No se pudo eliminar el producto. Intenta nuevamente.');
    }
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
    const ok = await guardarProductosEnFirebase(productos, infoLocal, nuevasCategorias);
    if (!ok) {
      alert('No se pudo guardar la nueva sección. Intenta nuevamente.');
      return;
    }
    setNuevaCat('');
  };

  const handleEliminarCategoria = async (categoria: string) => {
    if (!window.confirm(`¿Borrar la sección "${categoria}"?`)) return;
    const nuevasCategorias = categorias.filter((c) => c !== categoria);
    setCategorias(nuevasCategorias);
    const ok = await guardarProductosEnFirebase(productos, infoLocal, nuevasCategorias);
    if (!ok) {
      alert('No se pudo eliminar la sección. Intenta nuevamente.');
      return;
    }
  };

  const handleSeedDatabase = async () => {
    if (suscripcionActiva === false) return;
    if (!window.confirm('¿Seguro que quieres sobrescribir los datos? Esta acción cargará los productos de prueba en Firestore.')) return;

    setSeedCargando(true);
    const productosSeed: Omit<Producto, 'id'>[] = [
      { nombre: 'Pizza Napolitana Premium', descripcion: 'Masa de fermentación lenta, salsa San Marzano, mozzarella fior di latte y albahaca fresca.', precio: 3800, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Cuatro Quesos Trufada', descripcion: 'Mozzarella, provolone, roquefort y parmesano con un hilo de aceite de trufa blanca.', precio: 4550, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza de Jamón Crudo y Rúcula', descripcion: 'Mozzarella, jamón crudo artesanal, rúcula fresca y lascas de parmesano.', precio: 4700, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Caprese Gourmet', descripcion: 'Tomate en rodajas, mozzarella fresca, pesto de albahaca y reducción de balsámico.', precio: 4350, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Barbacoa de Pollo', descripcion: 'Salsa BBQ casera, pollo crocante, cebolla roja y queso fundido.', precio: 4250, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1511174511562-5f7f18b87291?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Mediterránea de Berenjena', descripcion: 'Berenjenas grilladas, tomates secos, aceitunas y mozzarella fresca.', precio: 4450, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Hawaiana Delicata', descripcion: 'Jamón natural, piña asada, mozzarella y un toque de miel de caña.', precio: 4100, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1601924582975-4f8bfbd2d5a8?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Serrana con Provolone', descripcion: 'Salsa de tomate intensa, provoleta fundida y jamón serrano crujiente.', precio: 4600, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza de Champiñones Silvestres', descripcion: 'Champiñones salteados, ajo, mozzarella y crema ligera.', precio: 4350, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Pizza Fugazza con Provoleta', descripcion: 'Cebolla blanca caramelizada, provolone y orégano en masa dorada.', precio: 3650, categoria: 'pizzas', imagen: 'https://images.unsplash.com/photo-1622964277888-a4ab42fcbcfd?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada Criolla Clásica', descripcion: 'Carne vacuna, cebolla, huevo duro y especias tradicionales en masa crocante.', precio: 520, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1555992336-03a23c04be87?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Jamón y Queso Artesanal', descripcion: 'Jamón natural, queso provolone y puerro en masa dorada.', precio: 600, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Humita Cremosa', descripcion: 'Maíz dulce, salsa blanca suave y queso fundido en cada bocado.', precio: 580, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Pollo al Verdeo', descripcion: 'Pollo deshilachado, verdeo y crema ligera en masa casera.', precio: 610, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Ricota y Espinaca', descripcion: 'Ricota suave, espinaca fresca y queso parmesano en masa artesanal.', precio: 580, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1604908177227-6b6c065c83d8?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Calabaza Ahumada', descripcion: 'Calabaza glaseada, queso de cabra y semillas tostadas.', precio: 650, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Roquefort y Cebolla', descripcion: 'Roquefort cremoso, cebolla caramelizada y pimienta negra.', precio: 680, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Cordero con Menta', descripcion: 'Cordero patagónico, menta fresca y especias suaves.', precio: 720, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1555949963-aa79dcee981d?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada de Verduras Asadas', descripcion: 'Calabaza, berenjena y pimientos asados con queso fresco.', precio: 630, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1549045696-0ddd4b1d77f1?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Empanada Caprese con Pesto', descripcion: 'Tomates cherry, mozzarella y pesto de albahaca en masa crocante.', precio: 650, categoria: 'empanadas', imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Angus Clásica', descripcion: 'Carne Angus, cheddar maduro, lechuga fresca y salsa secreta en pan brioche.', precio: 4800, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Doble Cheddar', descripcion: 'Dos medallones, doble queso cheddar, bacon crocante y pickles.', precio: 5200, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Portobello Veggie', descripcion: 'Champiñón portobello grillado, queso vegano y alioli de ajo.', precio: 4650, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa BBQ Smoke', descripcion: 'Medallón jugoso, salsa BBQ casera, cebolla caramelizada y queso fundido.', precio: 5250, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Chicken Crunch', descripcion: 'Pollo crispy, repollo marinado, queso suizo y salsa mostaza miel.', precio: 4700, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1562059390-a761a084768e?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Blue Cheese', descripcion: 'Carne premium, queso azul, rúcula y cebolla caramelizada.', precio: 5350, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Tzatziki', descripcion: 'Cordero, salsa tzatziki, tomate confitado y queso feta.', precio: 5550, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Hamburguesa Bacon Jam', descripcion: 'Carne Angus, bacon glaseado, cheddar y jalea de cebolla.', precio: 5600, categoria: 'hamburguesas', imagen: 'https://images.unsplash.com/photo-1542345812-d98b5cd6cf98?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Limonada Fresca de Menta', descripcion: 'Limón recién exprimido, menta fresca y un toque de azúcar de caña.', precio: 450, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1510626176961-4b537f4226b4?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Cerveza Artesanal Rubia', descripcion: 'Rubia refrescante con notas cítricas y final seco.', precio: 780, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Cerveza IPA de Lúpulo', descripcion: 'IPA aromática con cuerpo liviano y amargor equilibrado.', precio: 920, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1519936745653-3fb0f3b0c20c?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Spritz de Pomelo', descripcion: 'Pomelo rosado, soda y un toque de hierbabuena.', precio: 780, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1526318472351-b7da3b6863d9?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Té Helado de Durazno', descripcion: 'Té negro frío infusionado con durazno natural.', precio: 620, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Agua Mineral con Gas', descripcion: 'Agua mineral premium burbujeante, ideal para limpiar el paladar.', precio: 330, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Jugo de Naranja Natural', descripcion: 'Naranjas exprimidas al momento con sabor intenso y fresco.', precio: 470, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Ginger Ale Casera', descripcion: 'Ginger Ale artesana con jengibre natural y toque cítrico.', precio: 530, categoria: 'bebidas', imagen: 'https://images.unsplash.com/photo-1510626176961-4b537f4226b4?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Copa de Frutos Rojos', descripcion: 'Mousse ligera con frutos rojos frescos y crumble crocante.', precio: 790, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Brownie de Chocolate Belga', descripcion: 'Brownie caliente con corazón de dulce de leche y nueces tostadas.', precio: 820, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1542826438-4c7a08c15fb8?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Tiramisú Clásico', descripcion: 'Tiramisú esponjoso con café expreso y crema mascarpone.', precio: 850, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Cheesecake de Frutos del Bosque', descripcion: 'Cheesecake cremoso con coulis de frutos rojos y base de galleta.', precio: 820, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1527515637461-6f4c4ee8f229?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Panqueque de Nutella', descripcion: 'Panqueque recién hecho relleno de Nutella y frutas de estación.', precio: 770, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Flan Casero con Dulce de Leche', descripcion: 'Flan suave con dulce de leche y crema chantilly.', precio: 710, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1505253219025-5ad0c0ffe17f?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Helado de Dulce de Leche', descripcion: 'Helado cremoso de dulce de leche argentino con chips de caramelo.', precio: 760, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1505253219025-5ad0c0ffe17f?auto=format&fit=crop&w=900&q=80' },
      { nombre: 'Chocotorta Individual', descripcion: 'Capas de galleta de chocolate con dulce de leche y queso crema.', precio: 690, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1497534446932-c925b458314e084d2?auto=format&fit=crop&w=900&q=80' }
    ];

    console.log('seedDatabase: iniciando carga de productos');

    try {
      for (const producto of productosSeed) {
        await addDoc(collection(db, 'productos'), producto);
        console.log('seedDatabase: producto agregado ->', producto.nombre);
      }
      console.log('seedDatabase: carga completa. No se modificó shop/config.');
    } catch (error) {
      console.error('seedDatabase: error al cargar productos:', error);
      alert('Error al cargar los productos de seed. Revisa la consola.');
    } finally {
      setSeedCargando(false);
    }
  };

  const infoLocalValues: Partial<InfoLocal> = infoLocal ?? {};

  const handleInfoLocalChange = async (campo: keyof InfoLocal, valor: string | number) => {
    const actualizada = { ...infoLocalValues, [campo]: valor };
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
            <textarea placeholder="Descripción / Slogan" value={infoLocalValues.descripcion ?? ''} onChange={(e) => void handleInfoLocalChange('descripcion', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs h-16 text-white" disabled={suscripcionActiva === false} />
            <input type="text" placeholder="Dirección Comercial" value={infoLocalValues.direccion ?? ''} onChange={(e) => void handleInfoLocalChange('direccion', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <input type="text" placeholder="WhatsApp (Con código de área, ej: 549...)" value={infoLocalValues.telefonoWhatsApp ?? ''} onChange={(e) => void handleInfoLocalChange('telefonoWhatsApp', e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
            <input type="number" placeholder="Costo de Envío Fijo ($)" value={infoLocalValues.costoEnvio ?? ''} onChange={(e) => void handleInfoLocalChange('costoEnvio', Number(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl py-2.5 px-3 text-xs text-white" disabled={suscripcionActiva === false} />
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
                <img src={infoLocalValues.portadaUrl} className="w-full h-16 rounded-md object-cover opacity-60 mb-2" alt="Portada" />
              ) : (
                <div className="w-full h-16 rounded-md border border-dashed border-neutral-700 bg-neutral-950/70 flex items-center justify-center text-[10px] text-neutral-500 mb-2">
                  No hay imagen de portada cargada
                </div>
              )}
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                {infoLocalValues.portadaUrl ? 'Cambiar' : 'Subir Imagen'}
                <input type="file" accept="image/*" onChange={(event) => void onFileChange(event, 'portada')} className="hidden" />
              </label>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-2">Logo / Perfil</span>
              {infoLocalValues.avatarUrl ? (
                <img src={infoLocalValues.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-sky-400/30 mb-2" alt="Logo" />
              ) : (
                <div className="w-12 h-12 rounded-full border border-dashed border-neutral-700 bg-neutral-950/70 mb-2 flex items-center justify-center text-[10px] text-neutral-500">
                  Sin logo
                </div>
              )}
              <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] py-1 px-2.5 rounded border border-neutral-700 transition-colors">
                {infoLocalValues.avatarUrl ? 'Cambiar' : 'Subir Imagen'}
                <input type="file" accept="image/*" onChange={(event) => void onFileChange(event, 'avatar')} className="hidden" />
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
                  onChange={async (e) => {
                    const url = await onFileChange(e, 'producto');
                    if (url) {
                      setProdForm((prev) => ({ ...prev, imagen: url }));
                    }
                  }}
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
                      <button onClick={() => void handleToggleActivoProducto(p.id)} className={`p-2 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${p.activo !== false ? 'text-emerald-400 bg-emerald-950/40' : 'text-red-400 bg-red-950/40'}`} disabled={suscripcionActiva === false}>
                        {p.activo !== false ? <Eye size={12}/> : <EyeOff size={12}/>} 
                      </button>
                      <button onClick={() => { setEditandoProductoId(p.id); setProdForm({ ...p, activo: p.activo !== false }); setMostrarFormularioProd(true); }} className="p-2 text-sky-400 bg-neutral-800 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90" disabled={suscripcionActiva === false}><Edit2 size={12}/></button>
                      <button onClick={() => void handleEliminarProducto(p.id)} className="p-2 text-red-400 bg-neutral-800 rounded-lg transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90" disabled={suscripcionActiva === false}><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-neutral-800/50 pt-3">
              <button
                type="button"
                onClick={() => void handleSeedDatabase()}
                disabled={suscripcionActiva === false || seedCargando}
                className="w-full bg-neutral-900 text-neutral-400 border border-neutral-700 text-[10px] uppercase font-black py-2 rounded-xl transition duration-100 ease-in-out active:scale-95 active:opacity-90 hover:bg-neutral-800 disabled:opacity-60"
              >
                {seedCargando ? 'Cargando productos de prueba…' : 'Cargar productos de prueba'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
