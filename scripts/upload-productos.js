import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  throw new Error('Define FIREBASE_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS con la ruta a tu clave JSON de Firebase Admin.');
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const productos = JSON.parse(await readFile(new URL('./productos-seed.json', import.meta.url), 'utf-8'));

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function subirProductos() {
  console.log(`Subiendo ${productos.length} productos a la colección 'productos'...`);

  for (const producto of productos) {
    const id = slugify(producto.nombre);
    await db.collection('productos').doc(id).set(producto, { merge: true });
    console.log(`  - ${producto.nombre} -> ${id}`);
  }

  console.log('Carga completa. No se ha modificado el documento shop/config.');
}

subirProductos().catch((error) => {
  console.error('Error cargando productos:', error);
  process.exit(1);
});
