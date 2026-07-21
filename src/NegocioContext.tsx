import React, { createContext, useContext, useState, ReactNode } from 'react';

// Definimos los tipos para TypeScript
export interface NegocioContextType {
  negocioId: string;
  setNegocioId: (id: string) => void;
}

// Creamos el contexto
const NegocioContext = createContext<NegocioContextType | undefined>(undefined);

// Creamos el Provider que envolverá nuestra app
export const NegocioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Inicializamos con tu negocio principal por defecto. 
  // A futuro, esto podría leerse dinámicamente de la URL (subdominio) o de la sesión del usuario.
  const [negocioId, setNegocioId] = useState<string>('b81c28fa-942b-4ea2-b06b-27b54b8fbc24');

  return (
    <NegocioContext.Provider value={{ negocioId, setNegocioId }}>
      {children}
    </NegocioContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácilmente
export const useNegocio = () => {
  const context = useContext(NegocioContext);
  if (context === undefined) {
    throw new Error('useNegocio debe ser usado dentro de un NegocioProvider');
  }
  return context;
};