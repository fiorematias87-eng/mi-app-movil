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
}

export interface ProductoRow extends Producto {
  activo: boolean;
  hidden: boolean;
  inserted_at: string;
  updated_at: string;
}

export interface ShopConfigRow {
  id: string;
  info_local: InfoLocal;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
