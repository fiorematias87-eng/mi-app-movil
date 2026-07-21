export interface InfoLocal {
  nombre: string;
  descripcion: string;
  direccion: string;
  telefonoWhatsApp: string;
  costoEnvio: number;
  portadaUrl: string;
  avatarUrl: string;
  cbuCvu: string;
  alias: string;
  instagram?: string;
  facebook?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
  activo?: boolean;
  hidden?: boolean;
  negocio_id?: string;
}

export interface ProductoRow extends Producto {
  negocio_id: string;
  activo: boolean;
  hidden: boolean;
  inserted_at: string;
  updated_at: string;
}

export interface ShopConfigRow {
  id?: string;
  negocio_id?: string;
  info_local?: Partial<InfoLocal>;
  categorias?: string[];
}

export interface PerfilRow {
  id: string;
  rol: string | null;
}

export interface Database {
  public: {
    Tables: {
      productos: {
        Row: ProductoRow;
        Insert: Omit<ProductoRow, 'inserted_at' | 'updated_at'>;
        Update: Partial<Omit<ProductoRow, 'inserted_at' | 'updated_at'>>;
      };
      shop_config: {
        Row: ShopConfigRow;
        Insert: Omit<ShopConfigRow, 'id'>;
        Update: Partial<ShopConfigRow>;
      };
      configuracion: {
        Row: ShopConfigRow;
        Insert: Omit<ShopConfigRow, 'id'>;
        Update: Partial<ShopConfigRow>;
      };
      perfiles: {
        Row: PerfilRow;
        Insert: Omit<PerfilRow, 'id'> & { id: string };
        Update: Partial<PerfilRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
