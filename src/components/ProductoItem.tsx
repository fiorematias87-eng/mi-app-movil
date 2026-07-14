import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { Camera, Edit2, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { auth, db } from '../firebase';
import type { Producto } from '../firebase/db';

interface ProductoItemProps {
  producto: Producto;
  uid: string | null;
  disabled?: boolean;
  onSave: (producto: Producto, isNew: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onToggleHidden: (id: string) => Promise<void>;
  onProductUpdated?: (producto: Producto) => void;
  isNew?: boolean;
}

const crearDraft = (producto: Producto): Producto => ({
  ...producto,
  nombre: producto.nombre ?? '',
  descripcion: producto.descripcion ?? '',
  precio: producto.precio ?? 0,
  categoria: producto.categoria ?? '',
  imagen: producto.imagen ?? '',
  hidden: producto.hidden ?? false,
});

export default function ProductoItem({
  producto,
  uid,
  disabled = false,
  onSave,
  onDelete,
  onToggleHidden,
  onProductUpdated,
  isNew = false,
}: ProductoItemProps) {
  const [isEditing, setIsEditing] = useState(Boolean(isNew));
  const [draft, setDraft] = useState<Producto>(() => crearDraft(producto));
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(crearDraft(producto));
    if (isNew) {
      setIsEditing(true);
    }
  }, [producto, isNew]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!auth.currentUser) {
      alert('La sesión expiró. Se recargará para revalidar el acceso.');
      window.location.reload();
      return;
    }

    const productId = draft.id || producto.id;

    try {
      setIsUploading(true);

      let idParaSubir = productId;
      if (!idParaSubir) {
        const tempRef = await addDoc(collection(db, 'productos'), {
          nombre: draft.nombre.trim() || 'Nuevo producto',
          descripcion: draft.descripcion.trim(),
          precio: Number(draft.precio) || 0,
          categoria: draft.categoria.trim() || 'sin-categoria',
          imagen: '',
          hidden: draft.hidden ?? false,
        });
        idParaSubir = tempRef.id;
        setDraft((prev) => ({ ...prev, id: tempRef.id }));
      }

      // Preparar datos para Cloudinary
      const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
        throw new Error('Variables de entorno de Cloudinary no configuradas');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryUploadPreset);

      // Subir a Cloudinary
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        throw new Error('Error en la subida a Cloudinary');
      }

      const cloudinaryData = (await cloudinaryResponse.json()) as { secure_url: string };
      const urlNube = cloudinaryData.secure_url;

      // Guardar URL en Firestore
      await updateDoc(doc(db, 'productos', idParaSubir), { imagen: urlNube });
      const productoActualizado: Producto = { ...draft, id: idParaSubir, imagen: urlNube };
      setDraft(productoActualizado);
      onProductUpdated?.(productoActualizado);
    } catch (error) {
      console.error('Error al subir la imagen del producto:', error);
      alert('No se pudo subir la imagen del producto. Intenta nuevamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!draft.nombre.trim() || Number(draft.precio) <= 0) return;

    setIsSaving(true);
    try {
      const payload: Producto = {
        ...draft,
        id: draft.id || producto.id,
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        precio: Number(draft.precio),
        categoria: draft.categoria.trim(),
        imagen: draft.imagen.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500',
        hidden: draft.hidden ?? false,
      };

      const ok = await onSave(payload, Boolean(isNew));
      if (ok) {
        onProductUpdated?.(payload);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('No se pudo guardar el producto. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-2.5 transition-colors ${!draft.hidden ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-900 bg-neutral-950/40 opacity-70'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <img src={draft.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500'} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" alt={draft.nombre || 'Producto'} />
          <div className="truncate">
            <p className="truncate font-bold text-white">
              {draft.nombre || 'Sin nombre'}
              {draft.hidden === true && <span className="ml-1 rounded bg-red-500/20 px-1 text-[9px] font-medium text-red-400">Pausado</span>}
            </p>
            <p className="text-[10px] font-black text-yellow-500">${Number(draft.precio || 0).toLocaleString('es-AR')}</p>
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-1">
          <button
            type="button"
            onClick={() => void onToggleHidden(draft.id || producto.id)}
            className={`rounded-lg p-2 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 ${!draft.hidden ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}
            disabled={disabled}
          >
            {!draft.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-lg bg-neutral-800 p-2 text-sky-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90"
            disabled={disabled}
          >
            <Edit2 size={12} />
          </button>
          <button
            type="button"
            onClick={() => void onDelete(draft.id || producto.id)}
            className="rounded-lg bg-neutral-800 p-2 text-red-400 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90"
            disabled={disabled}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 space-y-2 border-t border-neutral-800/80 pt-3">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={draft.nombre}
            onChange={(event) => setDraft((prev) => ({ ...prev, nombre: event.target.value }))}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-white"
            disabled={disabled}
          />
          <input
            type="text"
            placeholder="Descripción"
            value={draft.descripcion}
            onChange={(event) => setDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-white"
            disabled={disabled}
          />
          <input
            type="number"
            placeholder="Precio"
            value={draft.precio || ''}
            onChange={(event) => setDraft((prev) => ({ ...prev, precio: Number(event.target.value) }))}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-white"
            disabled={disabled}
          />
          <input
            type="text"
            placeholder="Categoría"
            value={draft.categoria}
            onChange={(event) => setDraft((prev) => ({ ...prev, categoria: event.target.value }))}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-white"
            disabled={disabled}
          />

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-[10px] text-neutral-300">
            <Camera size={12} />
            {isUploading ? 'Subiendo imagen…' : 'Cambiar imagen'}
            <input type="file" accept="image/*" onChange={(event) => void handleImageUpload(event)} className="hidden" disabled={disabled || isUploading} />
          </label>

          <label className="flex items-center gap-2 text-[10px] text-neutral-400">
            <input
              type="checkbox"
              checked={draft.hidden ?? false}
              onChange={(event) => setDraft((prev) => ({ ...prev, hidden: event.target.checked }))}
              disabled={disabled}
            />
            Ocultar producto del menú
          </label>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={disabled || isSaving || isUploading || !draft.nombre.trim() || Number(draft.precio) <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 px-3 py-2 text-[11px] font-black uppercase text-neutral-950 transition-transform duration-100 ease-in-out active:scale-95 active:opacity-90 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
            {isSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
