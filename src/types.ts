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
  hidden?: boolean;
}
