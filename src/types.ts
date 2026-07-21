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
  id: string;
  info_local: InfoLocal;
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
      perfiles: {
        Row: PerfilRow;
        Insert: Omit<PerfilRow, 'id'> & { id: string };
        Update: Partial<PerfilRow>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
