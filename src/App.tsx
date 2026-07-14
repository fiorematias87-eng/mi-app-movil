import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, getDoc, type DocumentData, type DocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { InfoLocal, Producto } from './firebase/db';
import HomeCliente from './views/client/HomeCliente';
import EsqueletoCarga from './components/EsqueletoCarga';

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [infoLocal, setInfoLocal] = useState<Partial<InfoLocal> | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);

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
        // Do NOT read `productos` from shop/config here. The collection `productos`
        // is the single source of truth and is handled by its own onSnapshot below.
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
