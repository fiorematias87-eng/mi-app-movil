import React, { useState, useEffect } from 'react';
import { addDoc, collection, doc, onSnapshot, type DocumentData, type DocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { InfoLocal, Producto } from './firebase/db';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [infoLocal, setInfoLocal] = useState<Partial<InfoLocal> | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const isDev = import.meta.env.DEV;

  const seedDatabase = async () => {
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
      { nombre: 'Chocotorta Individual', descripcion: 'Capas de galleta de chocolate con dulce de leche y queso crema.', precio: 690, categoria: 'postres', imagen: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=900&q=80' }
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
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    ;(window as any).seedDatabase = seedDatabase;
    return () => {
      delete (window as any).seedDatabase;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let configReady = false;
    let productosReady = false;

    const configRef = doc(db, 'shop', 'config');
    const productosRef = collection(db, 'productos');

    const checkHydration = () => {
      if (configReady && productosReady && mounted) {
        console.log('App hidratada: configuración y productos cargados');
        setIsHydrated(true);
      }
    };

    const unsubscribeConfig = onSnapshot(
      configRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (!mounted) return;
        const data = snapshot.exists() ? snapshot.data() : undefined;
        setInfoLocal(data?.infoLocal ?? null);
        setCategorias(Array.isArray(data?.categorias) ? data.categorias : []);
        if (Array.isArray(data?.productos)) {
          setProductos(data.productos as Producto[]);
        }
        console.log('Configuración cargada');
        configReady = true;
        checkHydration();
      },
      (error: unknown) => {
        console.error('Error cargando configuración:', error);
      }
    );

    const unsubscribeProductos = onSnapshot(
      productosRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (!mounted) return;
        const listaProductos = snapshot.docs.map((document) => {
          const data = document.data() as Omit<Producto, 'id'>;
          return {
            id: document.id,
            ...data,
          };
        });
        setProductos(listaProductos);
        console.log('Productos cargados desde coleccion', listaProductos.length);
        productosReady = true;
        checkHydration();
      },
      (error: unknown) => {
        console.error('Error cargando productos:', error);
      }
    );

    return () => {
      mounted = false;
      unsubscribeConfig();
      unsubscribeProductos();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 md:py-8">
      <HomeCliente productos={productos} infoLocal={infoLocal} categorias={categorias} />

      {!isHydrated && <EsqueletoCarga />}
    </div>
  );
}
