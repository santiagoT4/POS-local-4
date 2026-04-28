/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  latitud: string;
  longitud: string;
  cuentaContable: string;
}

export interface Producto {
  id: string;
  nombre: string;
  masa: number; // Peso base (ej: 1kg)
  unidad: 'kg' | 'g' | 'L' | 'ud';
  valorUnitario: number;
  cuentaContable: string;
}

export interface ItemFactura {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Factura {
  id: string;
  numeroFactura: string;
  clienteId: string;
  clienteNombre: string;
  items: ItemFactura[];
  total: number;
  fecha: string;
  hora: string;
  notas: string;
  esPublica: boolean;
  estado: 'activa' | 'finalizada' | 'cancelada';
  fechaCreacion: string;
  fechaFinalizacion?: string;
}

export interface OrdenCompra {
  id: string;
  proveedor: string;
  fechaEmision: string;
  fechaEntrega: string;
  total: number;
  estado: 'Pendiente' | 'En Proceso' | 'Completada' | 'Cancelada';
  notas: string;
}

export interface NegocioConfig {
  nombre: string;
  logo: string; // base64
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  mensajePie: string;
  mostrarNIT: boolean;
  mostrarEmail: boolean;
}
