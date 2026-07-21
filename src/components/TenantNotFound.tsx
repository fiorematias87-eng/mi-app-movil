import React from 'react';

export default function TenantNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
      <div className="max-w-lg text-center p-6">
        <h2 className="text-2xl font-bold mb-2">Sitio no encontrado</h2>
        <p className="text-sm text-neutral-300 mb-4">El subdominio que estás intentando acceder no está registrado. Si crees que esto es un error, contactá al soporte.</p>
        <a href="/" className="inline-block px-4 py-2 bg-sky-500 text-neutral-900 rounded-lg font-semibold">Volver al inicio</a>
      </div>
    </div>
  );
}
