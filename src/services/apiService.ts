/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5ahmcqzHk3aSgwucAo_xLgBHnqi9-r8nQsghPE0ijMlD7xsEM65bWeh1dVZwL8vgx/exec';

const STORAGE_KEYS = {
  CLIENTES: 'pos_clientes',
  PRODUCTOS: 'pos_productos',
  FACTURAS: 'pos_facturas',
  ORDENES: 'pos_ordenes',
  CONFIG: 'pos_config',
  ULTIMO_NUMERO: 'pos_ultimo_numero'
};

async function fetchFromSheets(action: string, data?: any) {
  try {
    const method = data ? 'POST' : 'GET';
    const url = new URL(SCRIPT_URL);
    if (!data) url.searchParams.append('action', action);

    const response = await fetch(url.toString(), {
      method,
      mode: 'cors',
      body: data ? JSON.stringify({ action, ...data }) : undefined,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });

    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error(`Error in Sheets API (${action}):`, error);
    throw error;
  }
}

// Local Storage Fallback Helpers
function getLocal(key: string, defaultValue: any = []) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

function setLocal(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const apiService = {
  // Config
  async getConfig() {
    try {
      const cloud = await fetchFromSheets('getConfig');
      setLocal(STORAGE_KEYS.CONFIG, cloud);
      return cloud;
    } catch {
      return getLocal(STORAGE_KEYS.CONFIG, {
        nombre: 'Mi Negocio',
        nit: '',
        direccion: '',
        telefono: '',
        email: '',
        mensajePie: 'Gracias por su compra'
      });
    }
  },
  async saveConfig(config: any) {
    setLocal(STORAGE_KEYS.CONFIG, config);
    try { await fetchFromSheets('saveConfig', config); } catch {}
  },

  // Clientes
  async getClientes() {
    try {
      const cloud = await fetchFromSheets('getClientes');
      setLocal(STORAGE_KEYS.CLIENTES, cloud);
      return cloud;
    } catch {
      return getLocal(STORAGE_KEYS.CLIENTES);
    }
  },
  async saveCliente(cliente: any) {
    const clientes = getLocal(STORAGE_KEYS.CLIENTES);
    const index = clientes.findIndex((c: any) => c.id === cliente.id);
    if (index >= 0) clientes[index] = cliente;
    else clientes.push(cliente);
    setLocal(STORAGE_KEYS.CLIENTES, clientes);
    try { await fetchFromSheets('saveCliente', cliente); } catch {}
  },
  async deleteCliente(id: string) {
    const clientes = getLocal(STORAGE_KEYS.CLIENTES).filter((c: any) => c.id !== id);
    setLocal(STORAGE_KEYS.CLIENTES, clientes);
    try { await fetchFromSheets('deleteCliente', { id }); } catch {}
  },

  // Productos
  async getProductos() {
    try {
      const cloud = await fetchFromSheets('getProductos');
      setLocal(STORAGE_KEYS.PRODUCTOS, cloud);
      return cloud;
    } catch {
      return getLocal(STORAGE_KEYS.PRODUCTOS);
    }
  },
  async saveProducto(producto: any) {
    const productos = getLocal(STORAGE_KEYS.PRODUCTOS);
    const index = productos.findIndex((p: any) => p.id === producto.id);
    if (index >= 0) productos[index] = producto;
    else productos.push(producto);
    setLocal(STORAGE_KEYS.PRODUCTOS, productos);
    try { await fetchFromSheets('saveProducto', producto); } catch {}
  },
  async deleteProducto(id: string) {
    const productos = getLocal(STORAGE_KEYS.PRODUCTOS).filter((p: any) => p.id !== id);
    setLocal(STORAGE_KEYS.PRODUCTOS, productos);
    try { await fetchFromSheets('deleteProducto', { id }); } catch {}
  },

  // Facturas
  async getFacturas() {
    try {
      const cloud = await fetchFromSheets('getFacturas');
      setLocal(STORAGE_KEYS.FACTURAS, cloud);
      return cloud;
    } catch {
      return getLocal(STORAGE_KEYS.FACTURAS);
    }
  },
  async saveFactura(factura: any) {
    const facturas = getLocal(STORAGE_KEYS.FACTURAS);
    const index = facturas.findIndex((f: any) => f.id === factura.id);
    if (index >= 0) facturas[index] = factura;
    else facturas.push(factura);
    setLocal(STORAGE_KEYS.FACTURAS, facturas);
    setLocal(STORAGE_KEYS.ULTIMO_NUMERO, factura.numeroFactura);
    try { await fetchFromSheets('saveFactura', factura); } catch {}
  },
  async updateFactura(factura: any) {
    return this.saveFactura(factura);
  },
  async finalizarOrden(id: string) {
    const facturas = getLocal(STORAGE_KEYS.FACTURAS);
    const index = facturas.findIndex((f: any) => f.id === id);
    if (index === -1) throw new Error('Orden no encontrada');
    
    facturas[index].estado = 'finalizada';
    facturas[index].fechaFinalizacion = new Date().toISOString();
    
    setLocal(STORAGE_KEYS.FACTURAS, facturas);
    try { await fetchFromSheets('saveFactura', facturas[index]); } catch {}
    return facturas[index];
  },

  // Ordenes
  async getOrdenes() {
    try {
      const cloud = await fetchFromSheets('getOrdenes');
      setLocal(STORAGE_KEYS.ORDENES, cloud);
      return cloud;
    } catch {
      return getLocal(STORAGE_KEYS.ORDENES);
    }
  },
  async saveOrden(orden: any) {
    const ordenes = getLocal(STORAGE_KEYS.ORDENES);
    const index = ordenes.findIndex((o: any) => o.id === orden.id);
    if (index >= 0) ordenes[index] = orden;
    else ordenes.push(orden);
    setLocal(STORAGE_KEYS.ORDENES, ordenes);
    try { await fetchFromSheets('saveOrden', orden); } catch {}
  },

  // Utils
  async getUltimoNumero() {
    try {
      const cloud = await fetchFromSheets('getUltimoNumero');
      return cloud.numero || '0';
    } catch {
      return getLocal(STORAGE_KEYS.ULTIMO_NUMERO, '0');
    }
  }
};
