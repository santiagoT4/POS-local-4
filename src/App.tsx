/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Users, 
  Package, 
  ShoppingCart, 
  History, 
  Printer, 
  Settings, 
  Eye, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Check, 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  Search, 
  ArrowLeft,
  Info,
  CheckCircle,
  Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiService } from './services/apiService';
import { Cliente, Producto, ItemFactura, Factura, OrdenCompra, NegocioConfig } from './types';

// --- COMPONENTES AUXILIARES ---

const Badge = ({ children, color = 'blue' }: { children: React.ReactNode, color?: string }) => {
  const getColors = () => {
    switch(color) {
      case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      case 'yellow': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getColors()}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '', ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 ${className}`} {...props}>
    {children}
  </div>
);

// --- APP COMPONENT ---

export default function App() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [editingFacturaId, setEditingFacturaId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('todo');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [config, setConfig] = useState<NegocioConfig>({
    nombre: 'Mi Negocio',
    logo: '',
    nit: '',
    direccion: '',
    telefono: '',
    email: '',
    mensajePie: 'Gracias por su compra',
    mostrarNIT: true,
    mostrarEmail: true
  });
  const [ultimoNumero, setUltimoNumero] = useState('0');

  // Estado de Facturación Actual
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [currentPeso, setCurrentPeso] = useState<number>(0);
  const [currentUnitPrice, setCurrentUnitPrice] = useState<number>(0);
  const [cartItems, setCartItems] = useState<ItemFactura[]>([]);
  const [facturaNotes, setFacturaNotes] = useState('');
  const [previewFactura, setPreviewFactura] = useState<Factura | null>(null);

  // Estados de búsqueda para selectores (Combobox)
  const [clienteSearch, setClienteSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);

  // Estados de Edición
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingOrden, setEditingOrden] = useState<OrdenCompra | null>(null);

  // Buscadores
  const [searchQuery, setSearchQuery] = useState('');

  // Efectos Iniciales
  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [c, p, f, o, cfg, num] = await Promise.all([
          apiService.getClientes(),
          apiService.getProductos(),
          apiService.getFacturas(),
          apiService.getOrdenes(),
          apiService.getConfig(),
          apiService.getUltimoNumero()
        ]);
        setClientes(c || []);
        setProductos(p || []);
        setFacturas(f || []);
        setOrdenes(o || []);
        setConfig(cfg);
        setUltimoNumero(num);
      } catch (e) {
        console.error("Error al cargar datos iniciales:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Helpers Facturación
  const generateNumeroFactura = () => {
    const num = parseInt(ultimoNumero) + 1;
    return num.toString().padStart(6, '0');
  };

  const currentTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cartItems]);

  const addToCart = () => {
    if (!selectedProductoId || currentPeso <= 0) return;
    
    let nombre = "";
    let precio = currentUnitPrice;
    let prodId = "";

    if (selectedProductoId === 'manual') {
      nombre = productoSearch || "Item Manual";
      prodId = "manual";
      if (!precio) precio = 0;
    } else {
      const prod = productos.find(p => p.id === selectedProductoId);
      if (!prod) return;
      nombre = prod.nombre;
      prodId = prod.id;
      if (precio === 0) precio = prod.valorUnitario;
    }

    const newItem: ItemFactura = {
      id: Math.random().toString(36).substr(2, 9),
      productoId: prodId,
      nombre: nombre,
      cantidad: currentPeso,
      precioUnitario: precio,
      subtotal: currentPeso * precio
    };

    setCartItems([...cartItems, newItem]);
    setSelectedProductoId('');
    setProductoSearch('');
    setCurrentPeso(0);
    setCurrentUnitPrice(0);
  };

  const saveFactura = async (direct = true) => {
    if (cartItems.length === 0 || !selectedClienteId) {
      alert("Faltan datos para la factura");
      return;
    }

    const cliente = clientes.find(c => c.id === selectedClienteId);
    const date = new Date();
    
    // Si estamos editando, usamos el ID y número existente
    const facturaExistente = editingFacturaId ? facturas.find(f => f.id === editingFacturaId) : null;

    const facturaData: Factura = {
      id: editingFacturaId || Math.random().toString(36).substr(2, 9),
      numeroFactura: facturaExistente?.numeroFactura || generateNumeroFactura(),
      clienteId: selectedClienteId,
      clienteNombre: cliente?.nombre || 'Consumidor Final',
      items: [...cartItems],
      total: currentTotal,
      fecha: facturaExistente?.fecha || date.toLocaleDateString(),
      hora: facturaExistente?.hora || date.toLocaleTimeString(),
      notas: facturaNotes,
      esPublica: true,
      estado: facturaExistente?.estado || 'activa',
      fechaCreacion: facturaExistente?.fechaCreacion || date.toISOString(),
    };

    if (!direct) {
      setPreviewFactura(facturaData);
      setActiveScreen(7);
      return;
    }

    try {
      if (editingFacturaId) {
        await apiService.updateFactura(facturaData);
        setFacturas(facturas.map(f => f.id === editingFacturaId ? facturaData : f));
      } else {
        await apiService.saveFactura(facturaData);
        setFacturas([...facturas, facturaData]);
        setUltimoNumero(facturaData.numeroFactura);
      }
      
      // Reset
      setCartItems([]);
      setSelectedClienteId('');
      setClienteSearch('');
      setProductoSearch('');
      setFacturaNotes('');
      setEditingFacturaId(null);
      alert(editingFacturaId ? "Orden actualizada" : "Orden guardada como activa");
      if (editingFacturaId) setActiveScreen(8); // Volver a órdenes activas
    } catch (e) {
      alert("Error al guardar factura");
    }
  };

  // Import / Export
  const exportData = () => {
    const data = { clientes, productos, facturas, ordenes, config };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_pos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.clientes) {
          setClientes(data.clientes);
          setProductos(data.productos);
          setFacturas(data.facturas);
          setOrdenes(data.ordenes);
          setConfig(data.config);
          alert("Datos importados exitosamente");
        }
      } catch (err) {
        alert("Error al importar datos");
      }
    };
    reader.readAsText(file);
  };

  const editFactura = (factura: Factura) => {
    setCartItems([...factura.items]);
    setSelectedClienteId(factura.clienteId);
    setClienteSearch(factura.clienteNombre);
    setFacturaNotes(factura.notas);
    setEditingFacturaId(factura.id);
    setActiveScreen(0);
  };

  const finalizarFactura = async (facturaId: string) => {
    const f = facturas.find(fact => fact.id === facturaId);
    if (!f) return;

    if (!confirm(`¿Finalizar orden #${f.numeroFactura}? Esta acción moverá la orden al historial.`)) return;

    try {
      const actualizada = await apiService.finalizarOrden(facturaId);
      setFacturas(facturas.map(fact => fact.id === facturaId ? actualizada : fact));
      alert("✅ Orden finalizada");
    } catch (e) {
      alert("Error al finalizar orden");
    }
  };

  // --- RENDERS DE PANTALLAS ---

  const renderFacturacion = () => (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Columna Izquierda: Selección de Productos */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {editingFacturaId && (
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center animate-pulse">
            <div className="flex items-center gap-2 text-blue-700">
              <Edit size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Modificando Orden #INV-{facturas.find(f => f.id === editingFacturaId)?.numeroFactura}</span>
            </div>
            <button 
              onClick={() => {
                setEditingFacturaId(null);
                setCartItems([]);
                setSelectedClienteId('');
                setClienteSearch('');
                setFacturaNotes('');
              }}
              className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-600 underline"
            >
              Cancelar y Nueva Venta
            </button>
          </div>
        )}
        {/* Barra Superior: Búsqueda y Pesaje */}
        <Card className="bg-white p-4 flex flex-col sm:flex-row gap-4 items-end shadow-sm border-slate-200">
          <div className="flex-1 w-full">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Buscar Producto o Cliente</label>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Buscador de Producto */}
              <div className="relative flex-1">
                <input 
                  type="text"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-4 text-sm font-medium outline-none focus:border-primary transition-all pr-12"
                  placeholder="Escriba nombre del producto..."
                  value={productoSearch}
                  onFocus={() => setShowProductoDropdown(true)}
                  onChange={(e) => {
                    setProductoSearch(e.target.value);
                    setShowProductoDropdown(true);
                    if (!e.target.value) setSelectedProductoId('');
                  }}
                />
                <div className="absolute right-3 top-3.5 text-slate-400">
                  <Search size={18} />
                </div>
                
                {showProductoDropdown && productoSearch && (
                  <div className="absolute z-[120] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto no-scrollbar">
                    {productos
                      .filter(p => p.nombre.toLowerCase().includes(productoSearch.toLowerCase()))
                      .map(p => (
                        <div 
                          key={p.id} 
                          className="p-3 text-sm hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                          onClick={() => {
                            setSelectedProductoId(p.id);
                            setProductoSearch(p.nombre);
                            setCurrentUnitPrice(p.valorUnitario);
                            setShowProductoDropdown(false);
                          }}
                        >
                          <div>
                            <div className="font-bold text-slate-800">{p.nombre}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{p.unidad !== 'ud' ? 'Venta por peso' : 'Venta x unidad'}</div>
                          </div>
                          <div className="text-emerald-600 font-bold font-mono">${p.valorUnitario.toFixed(2)}</div>
                        </div>
                      ))}
                    {/* Opción para Item Manual */}
                    <div 
                      className="p-3 text-sm bg-slate-50 hover:bg-emerald-100 cursor-pointer flex items-center gap-2 border-t border-slate-200"
                      onClick={() => {
                        setSelectedProductoId('manual');
                        // Mantenemos el nombre que escribió
                        setShowProductoDropdown(false);
                      }}
                    >
                      <Plus size={14} className="text-primary" />
                      <span className="font-bold text-primary italic">Usar "{productoSearch}" como item manual</span>
                    </div>
                  </div>
                )}
                {showProductoDropdown && <div className="fixed inset-0 z-[110]" onClick={() => setShowProductoDropdown(false)} />}
              </div>

              {/* Buscador de Cliente */}
              <div className="relative w-full sm:w-64">
                <input 
                  type="text"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-4 text-sm font-medium outline-none focus:border-primary transition-all"
                  placeholder="Cliente..."
                  value={clienteSearch}
                  onFocus={() => setShowClienteDropdown(true)}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setShowClienteDropdown(true);
                    if (!e.target.value) setSelectedClienteId('');
                  }}
                />
                {showClienteDropdown && (
                  <div className="absolute z-[120] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto no-scrollbar">
                    {clientes
                      .filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()))
                      .map(c => (
                        <div 
                          key={c.id} 
                          className="p-3 text-sm hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setSelectedClienteId(c.id);
                            setClienteSearch(c.nombre);
                            setShowClienteDropdown(false);
                          }}
                        >
                          <div className="font-bold text-slate-800">{c.nombre}</div>
                          <div className="text-[10px] text-slate-400">{c.telefono}</div>
                        </div>
                      ))}
                  </div>
                )}
                {showClienteDropdown && <div className="fixed inset-0 z-[110]" onClick={() => setShowClienteDropdown(false)} />}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-28">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Precio ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={currentUnitPrice || ''}
              onChange={(e) => setCurrentUnitPrice(parseFloat(e.target.value))}
              className="w-full h-11 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 font-mono font-bold text-base text-center outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div className="w-full sm:w-28">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Peso (Kg)</label>
            <input 
              type="number" 
              step="0.001"
              value={currentPeso || ''}
              onChange={(e) => setCurrentPeso(parseFloat(e.target.value))}
              className="w-full h-11 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 font-mono font-bold text-base text-center outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0.000"
            />
          </div>
          
          <button 
            onClick={addToCart}
            className="h-11 bg-primary text-white px-6 rounded-lg font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-900/10 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Añadir</span>
          </button>
        </Card>

        {/* Rejilla de Productos (Quick Selection) */}
        <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col min-h-0 border border-slate-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atajos de Productos</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <div className="w-2 h-2 rounded-full bg-slate-200"></div>
              <div className="w-2 h-2 rounded-full bg-slate-200"></div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {productos
                .filter(p => !productoSearch || p.nombre.toLowerCase().includes(productoSearch.toLowerCase()))
                .map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      setSelectedProductoId(p.id);
                      setProductoSearch(p.nombre);
                      setCurrentUnitPrice(p.valorUnitario);
                    }}
                    className={`p-3 text-left border rounded-xl transition-all duration-200 group ${selectedProductoId === p.id ? 'border-primary bg-emerald-50 ring-1 ring-primary shadow-sm' : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
                  >
                    <div className={`font-bold text-sm ${selectedProductoId === p.id ? 'text-primary' : 'text-slate-800'}`}>{p.nombre}</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-mono text-slate-500">${p.valorUnitario.toFixed(0)}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-300 group-hover:text-primary transition-colors">{p.unidad}</span>
                    </div>
                  </button>
                ))}
              {productos.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-300 italic flex flex-col items-center gap-2">
                  <Package size={48} className="opacity-10" />
                  No hay productos en el catálogo
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Columna Derecha: El Ticket / Carrito */}
      <aside className="w-full lg:w-96 flex flex-col gap-4">
        <Card className="flex flex-col h-full overflow-hidden p-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
                    <Users size={18} />
                 </div>
                 <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">Cliente Seleccionado</div>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedClienteId ? (clientes.find(c => c.id === selectedClienteId)?.nombre) : 'Consumidor Final'}
                    </div>
                 </div>
              </div>
              <button 
                onClick={() => { setSelectedClienteId(''); setClienteSearch(''); }}
                className="text-[10px] uppercase font-bold text-primary hover:underline"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
             <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2">Items</th>
                    <th className="pb-2 text-center">Cant/Kg</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cartItems.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-3 pr-2">
                        <div className="text-sm font-bold text-slate-800">{item.nombre}</div>
                        <div className="text-[10px] text-slate-400">${item.precioUnitario.toFixed(2)}/kg</div>
                      </td>
                      <td className="py-3 text-center font-mono text-sm text-slate-600">{item.cantidad.toFixed(3)}</td>
                      <td className="py-3 text-right">
                        <div className="font-mono font-bold text-slate-800">${item.subtotal.toFixed(2)}</div>
                        <button 
                          onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                          className="text-[9px] uppercase font-bold text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cartItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-300 italic text-xs">
                        Tu ticket de venta está vacío
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
             <div className="flex justify-between items-center text-slate-500">
                <span className="text-xs font-semibold">Subtotal</span>
                <span className="font-mono">${currentTotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-slate-500">
                <span className="text-xs font-semibold">Impuestos (0%)</span>
                <span className="font-mono">$0.00</span>
             </div>
             <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-lg font-bold text-slate-800">TOTAL</span>
                <span className="text-2xl font-mono font-black text-primary">${currentTotal.toFixed(2)}</span>
             </div>
             
             <textarea 
               placeholder="Notas de la venta..."
               className="w-full mt-2 text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-primary resize-none h-12"
               value={facturaNotes}
               onChange={(e) => setFacturaNotes(e.target.value)}
             />

             <div className="mt-2 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => saveFactura(false)}
                  className="h-12 border border-primary text-primary font-bold rounded-xl hover:bg-emerald-50 transition-colors active:scale-95"
                >
                  Previsualizar
                </button>
                <button 
                  onClick={() => saveFactura(true)}
                  className="h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-colors active:scale-95 disabled:opacity-50"
                  disabled={cartItems.length === 0}
                >
                  Facturar Ahora
                </button>
             </div>
          </div>
        </Card>
      </aside>
    </div>
  );

  const renderClientes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Directorio de Clientes</h3>
        <button 
          onClick={() => setEditingCliente({ id: Math.random().toString(36).substr(2, 9), nombre: '', telefono: '', direccion: '', latitud: '', longitud: '', cuentaContable: '' })}
          className="bg-primary text-white text-xs h-8 px-3 rounded-lg flex items-center gap-2 font-bold hover:bg-emerald-800 transition active:scale-95 shadow-sm"
        >
          <Plus size={14} /> Nuevo Cliente
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <Search className="text-slate-400" size={16} />
          <input 
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-300" 
            placeholder="Filtrar por nombre o contacto..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
              <tr>
                <th className="p-3 text-left">Nombre / Empresa</th>
                <th className="p-3 text-left">Contacto</th>
                <th className="p-3 text-left">Cuenta Contable</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientes.filter(c => c.nombre.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{c.nombre}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{c.direccion || 'Sin dirección'}</div>
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{c.telefono || '-'}</td>
                  <td className="p-3"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-500">{c.cuentaContable || '00000'}</code></td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => setEditingCliente(c)} className="p-1 px-2 text-primary hover:bg-emerald-50 rounded transition-colors"><Edit size={14} /></button>
                    <button onClick={async () => {
                      if (confirm("¿Eliminar cliente?")) {
                        await apiService.deleteCliente(c.id);
                        setClientes(clientes.filter(cl => cl.id !== c.id));
                      }
                    }} className="p-1 px-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={4} className="p-10 text-center text-slate-300 italic">No hay clientes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {editingCliente && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">{editingCliente.id ? 'Editar' : 'Nuevo'} Cliente</h3>
              <div className="space-y-4">
                <input placeholder="Nombre Completo" className="w-full p-2 border rounded" value={editingCliente.nombre} onChange={e => setEditingCliente({...editingCliente, nombre: e.target.value})} />
                <input placeholder="Teléfono" className="w-full p-2 border rounded" value={editingCliente.telefono} onChange={e => setEditingCliente({...editingCliente, telefono: e.target.value})} />
                <input placeholder="Dirección" className="w-full p-2 border rounded" value={editingCliente.direccion} onChange={e => setEditingCliente({...editingCliente, direccion: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Latitud" className="w-full p-2 border rounded" value={editingCliente.latitud} onChange={e => setEditingCliente({...editingCliente, latitud: e.target.value})} />
                  <input placeholder="Longitud" className="w-full p-2 border rounded" value={editingCliente.longitud} onChange={e => setEditingCliente({...editingCliente, longitud: e.target.value})} />
                </div>
                <input placeholder="Cuenta Contable (ej: 43000...)" className="w-full p-2 border rounded" value={editingCliente.cuentaContable} onChange={e => setEditingCliente({...editingCliente, cuentaContable: e.target.value})} />
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setEditingCliente(null)} className="flex-1 py-2 border rounded">Cancelar</button>
                <button onClick={async () => {
                  await apiService.saveCliente(editingCliente);
                  const updated = [...clientes];
                  const idx = updated.findIndex(u => u.id === editingCliente.id);
                  if (idx >= 0) updated[idx] = editingCliente;
                  else updated.push(editingCliente);
                  setClientes(updated);
                  setEditingCliente(null);
                }} className="flex-1 py-2 bg-primary text-white rounded">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderProductos = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Inventario de Productos</h3>
        <button 
          onClick={() => setEditingProducto({ id: Math.random().toString(36).substr(2, 9), nombre: '', masa: 1, unidad: 'kg', valorUnitario: 0, cuentaContable: '' })}
          className="bg-primary text-white text-xs h-8 px-3 rounded-lg flex items-center gap-2 font-bold hover:bg-emerald-800 transition active:scale-95 shadow-sm"
        >
          <Plus size={14} /> Nuevo Item
        </button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <Package className="text-slate-400" size={16} />
          <input 
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-300" 
            placeholder="Buscar en el catálogo..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
              <tr>
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-center">Unidad de Medida</th>
                <th className="p-3 text-right">Valor Venta</th>
                <th className="p-3 text-right">Cuenta</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{p.nombre}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{p.unidad !== 'ud' ? 'Venta por peso' : 'Venta x unidad'}</div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge color="green">{p.masa} {p.unidad}</Badge>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-700">${p.valorUnitario.toFixed(2)}</td>
                  <td className="p-3 text-right"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-500 font-mono">{p.cuentaContable || '-'}</code></td>
                  <td className="p-3 text-right space-x-1">
                    <button onClick={() => setEditingProducto(p)} className="p-1 px-2 text-primary hover:bg-emerald-50 rounded transition-colors"><Edit size={14} /></button>
                    <button onClick={async () => {
                      if (confirm("¿Eliminar producto?")) {
                        await apiService.deleteProducto(p.id);
                        setProductos(productos.filter(pr => pr.id !== p.id));
                      }
                    }} className="p-1 px-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {editingProducto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">{editingProducto.id ? 'Editar' : 'Nuevo'} Producto</h3>
              <div className="space-y-4">
                <input placeholder="Nombre" className="w-full p-2 border rounded" value={editingProducto.nombre} onChange={e => setEditingProducto({...editingProducto, nombre: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Valor Unitario" className="w-full p-2 border rounded" value={editingProducto.valorUnitario} onChange={e => setEditingProducto({...editingProducto, valorUnitario: parseFloat(e.target.value)})} />
                  <select className="w-full p-2 border rounded" value={editingProducto.unidad} onChange={e => setEditingProducto({...editingProducto, unidad: e.target.value as any})}>
                    <option value="kg">kilogramo (kg)</option>
                    <option value="g">gramo (g)</option>
                    <option value="L">litro (L)</option>
                    <option value="ud">unidad (ud)</option>
                  </select>
                </div>
                <input placeholder="Cuenta Contable Ingresos" className="w-full p-2 border rounded" value={editingProducto.cuentaContable} onChange={e => setEditingProducto({...editingProducto, cuentaContable: e.target.value})} />
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setEditingProducto(null)} className="flex-1 py-2 border rounded">Cancelar</button>
                <button onClick={async () => {
                  await apiService.saveProducto(editingProducto);
                  const updated = [...productos];
                  const idx = updated.findIndex(u => u.id === editingProducto.id);
                  if (idx >= 0) updated[idx] = editingProducto;
                  else updated.push(editingProducto);
                  setProductos(updated);
                  setEditingProducto(null);
                }} className="flex-1 py-2 bg-primary text-white rounded">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderOrdenes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Órdenes de Compra</h3>
        <button 
          onClick={() => setEditingOrden({ id: Math.random().toString(36).substr(2, 9), proveedor: '', fechaEmision: new Date().toISOString().split('T')[0], fechaEntrega: '', total: 0, estado: 'Pendiente', notas: '' })}
          className="bg-primary text-white text-xs h-8 px-3 rounded-lg flex items-center gap-2 font-bold hover:bg-emerald-800 transition active:scale-95 shadow-sm"
        >
          <Plus size={14} /> Nueva Orden
        </button>
      </div>

      <div className="grid gap-3">
        {ordenes.map(o => (
          <Card key={o.id} className="flex justify-between items-center p-3 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                <ShoppingCart size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800">{o.proveedor}</h3>
                  <Badge color={o.estado === 'Completada' ? 'green' : o.estado === 'Pendiente' ? 'yellow' : 'blue'}>{o.estado}</Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Entrega: {o.fechaEntrega} | <span className="font-mono font-bold text-slate-600">${o.total.toFixed(2)}</span></p>
              </div>
            </div>
            <button onClick={() => setEditingOrden(o)} className="p-2 text-slate-300 hover:text-primary transition-colors"><Edit size={16} /></button>
          </Card>
        ))}
        {ordenes.length === 0 && (
          <div className="p-12 text-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-xl">No hay órdenes registradas</div>
        )}
      </div>

      <AnimatePresence>
        {editingOrden && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Orden de Compra</h3>
              <div className="space-y-4">
                <input placeholder="Proveedor" className="w-full p-2 border rounded" value={editingOrden.proveedor} onChange={e => setEditingOrden({...editingOrden, proveedor: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs">Fecha Emisión</label>
                    <input type="date" className="w-full p-2 border rounded" value={editingOrden.fechaEmision} onChange={e => setEditingOrden({...editingOrden, fechaEmision: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Fecha Entrega</label>
                    <input type="date" className="w-full p-2 border rounded" value={editingOrden.fechaEntrega} onChange={e => setEditingOrden({...editingOrden, fechaEntrega: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Total" className="w-full p-2 border rounded" value={editingOrden.total || ''} onChange={e => setEditingOrden({...editingOrden, total: parseFloat(e.target.value)})} />
                  <select className="w-full p-2 border rounded" value={editingOrden.estado} onChange={e => setEditingOrden({...editingOrden, estado: e.target.value as any})}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Completada">Completada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
                <textarea placeholder="Notas internas..." className="w-full p-2 border rounded" rows={3} value={editingOrden.notas} onChange={e => setEditingOrden({...editingOrden, notas: e.target.value})} />
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setEditingOrden(null)} className="flex-1 py-2 border rounded">Cancelar</button>
                <button onClick={async () => {
                  await apiService.saveOrden(editingOrden);
                  const updated = [...ordenes];
                  const idx = updated.findIndex(u => u.id === editingOrden.id);
                  if (idx >= 0) updated[idx] = editingOrden;
                  else updated.push(editingOrden);
                  setOrdenes(updated);
                  setEditingOrden(null);
                }} className="flex-1 py-2 bg-primary text-white rounded">Guardar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHistorial = () => {
    const filterByDate = (f: Factura) => {
      const facturaDate = new Date(f.fechaCreacion);
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (historyFilter === 'hoy') return facturaDate >= startOfDay;
      if (historyFilter === 'semana') return facturaDate >= startOfWeek;
      if (historyFilter === 'mes') return facturaDate >= startOfMonth;
      return true;
    };

    const finalizadas = facturas.filter(f => (f.estado === 'finalizada' || !f.estado) && filterByDate(f));
    
    const stats = {
      total: finalizadas.reduce((a, b) => a + b.total, 0),
      count: finalizadas.length,
      average: finalizadas.length > 0 ? finalizadas.reduce((a, b) => a + b.total, 0) / finalizadas.length : 0
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {(['todo', 'hoy', 'semana', 'mes'] as const).map(period => (
            <button
              key={period}
              onClick={() => setHistoryFilter(period)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${historyFilter === period ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {period}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-3">
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">Venta Periodo</p>
            <p className="text-lg font-black text-primary font-mono">${stats.total.toLocaleString()}</p>
          </Card>
          <Card className="text-center p-3 border-b-2 border-b-emerald-500">
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">Nº Tickets</p>
            <p className="text-lg font-black text-slate-800 font-mono">{stats.count}</p>
          </Card>
          <Card className="text-center p-3">
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1">PROMEDIO</p>
            <p className="text-lg font-black text-slate-800 font-mono">${stats.average.toFixed(0)}</p>
          </Card>
        </div>

        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Historial Operativo</h3>
            <div className="relative w-40">
              <Search className="absolute left-2 top-2 text-slate-300" size={12} />
              <input 
                className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-medium outline-none focus:border-primary" 
                placeholder="Buscar ticket..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-slate-50 max-h-[450px] overflow-y-auto no-scrollbar">
            {finalizadas.filter(f => f.numeroFactura.includes(searchQuery) || f.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase())).reverse().map(f => (
              <div key={f.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => { setPreviewFactura(f); setActiveScreen(7); }}>
                <div className="flex gap-2.5 items-center min-w-0">
                  <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-slate-400 font-bold text-[9px]">#</div>
                  <div className="min-w-0">
                    <p className="font-bold text-[10px] text-primary leading-none mb-0.5">INV-{f.numeroFactura}</p>
                    <p className="text-[11px] font-bold text-slate-800 truncate">{f.clienteNombre}</p>
                    <p className="text-[9px] text-slate-400 leading-none">{f.fecha} • {f.hora}</p>
                  </div>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="font-mono font-black text-slate-800 text-xs">${f.total.toFixed(0)}</p>
                </div>
              </div>
            ))}
            {finalizadas.length === 0 && (
              <div className="p-10 text-center text-slate-300 text-[10px] italic">No se encontraron registros para este periodo</div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderOrdenesActivas = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Órdenes Activas</h3>
        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
          {facturas.filter(f => f.estado === 'activa').length} Pendientes
        </span>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {facturas.filter(f => f.estado === 'activa').reverse().map(f => (
          <div key={f.id} className="bg-white rounded-lg shadow-sm border border-slate-100 p-2 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-primary block">#{f.numeroFactura}</span>
                <p className="text-xs font-bold text-slate-800 truncate" title={f.clienteNombre}>{f.clienteNombre}</p>
              </div>
              <span className="text-[9px] text-slate-400 font-medium ml-2">{f.hora}</span>
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-slate-400">{f.items?.length || 0} items</span>
              <span className="text-xs font-black text-slate-800 font-mono">${f.total.toFixed(0)}</span>
            </div>
            
            <div className="flex gap-1 mt-2 pt-1 border-t border-slate-50 justify-end">
              <button 
                onClick={() => { setPreviewFactura(f); setActiveScreen(7); }}
                title="Vista previa" 
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
              >
                <Eye size={14}/>
              </button>
              <button 
                onClick={() => editFactura(f)}
                title="Editar" 
                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
              >
                <Edit size={14}/>
              </button>
              <button 
                onClick={() => finalizarFactura(f.id)}
                title="Finalizar" 
                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
              >
                <CheckCircle size={14}/>
              </button>
            </div>
          </div>
        ))}
        {facturas.filter(f => f.estado === 'activa').length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center gap-2">
            <Zap size={32} className="opacity-10" />
            <span className="text-xs">No hay órdenes activas</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Perfil de Negocio</h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden mb-2">
              {config.logo ? <img src={config.logo} className="w-full h-full object-contain" alt="Logo" /> : <Upload size={24} className="text-slate-300" />}
            </div>
            <input type="file" className="hidden" id="logoUpload" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setConfig({...config, logo: ev.target?.result as string});
                reader.readAsDataURL(file);
              }
            }} />
            <label htmlFor="logoUpload" className="text-primary font-bold text-[10px] uppercase cursor-pointer border border-primary px-3 py-1 rounded hover:bg-emerald-50 transition-colors tracking-widest">Cambiar Logo</label>
          </div>

          <div className="space-y-3">
            <div className="grid gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Comercial</label>
              <input className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-primary" value={config.nombre} onChange={e => setConfig({...config, nombre: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">NIT / RUC</label>
                <input className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-primary" value={config.nit} onChange={e => setConfig({...config, nit: e.target.value})} />
              </div>
              <div className="grid gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</label>
                <input className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-primary" value={config.telefono} onChange={e => setConfig({...config, telefono: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
              <input className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-primary" value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Dirección</label>
              <textarea className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-primary resize-none" rows={2} value={config.direccion} onChange={e => setConfig({...config, direccion: e.target.value})} />
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mensaje Pie</label>
              <textarea className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-primary resize-none italic" rows={1} maxLength={100} value={config.mensajePie} onChange={e => setConfig({...config, mensajePie: e.target.value})} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Visibilidad en Ticket</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.mostrarNIT ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}>
                {config.mostrarNIT && <Check size={14} className="text-white" />}
                <input type="checkbox" className="hidden" checked={config.mostrarNIT} onChange={e => setConfig({...config, mostrarNIT: e.target.checked})} />
              </div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Mostrar NIT / Documento</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.mostrarEmail ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}>
                {config.mostrarEmail && <Check size={14} className="text-white" />}
                <input type="checkbox" className="hidden" checked={config.mostrarEmail} onChange={e => setConfig({...config, mostrarEmail: e.target.checked})} />
              </div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Mostrar Correo Electrónico</span>
            </label>
          </Card>

          <Card className="space-y-4 border-emerald-100 bg-emerald-50/20">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gestión de Datos</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={exportData} className="h-9 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition active:scale-95 shadow-sm"><Download size={14} /> Exportar</button>
              <label className="h-9 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-2 text-xs font-bold cursor-pointer hover:bg-slate-50 transition active:scale-95 shadow-sm">
                <Upload size={14} /> Importar
                <input type="file" className="hidden" accept=".json" onChange={importData} />
              </label>
            </div>
            <button 
              onClick={async () => {
                await apiService.saveConfig(config);
                alert("Configuración actualizada correctamente");
              }}
              className="w-full h-12 bg-primary text-white rounded-lg font-bold text-base hover:bg-emerald-800 transition active:scale-95 shadow-lg shadow-emerald-900/10"
            >
              Guardar Cambios
            </button>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!previewFactura) return <div className="text-center p-10">Seleccione una factura</div>;

    const cliente = clientes.find(c => c.id === previewFactura.clienteId);

    return (
      <div className="flex flex-col items-center py-6">
        <div className="fixed top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none hidden lg:flex">
           <div className="bg-white rounded-lg p-2 shadow-2xl border border-slate-200 transform rotate-2 w-48 opacity-90">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                 <div className="text-[10px] font-bold uppercase">{config.nombre}</div>
                 <div className="text-[8px] font-mono">FACTURA #{previewFactura.numeroFactura}</div>
              </div>
              <div className="py-2 space-y-1 font-mono text-[8px]">
                 {previewFactura.items.slice(0, 3).map((item, i) => (
                   <div key={i} className="flex justify-between"><span>{item.nombre.substring(0, 10)}...</span><span>${item.subtotal.toFixed(2)}</span></div>
                 ))}
                 {previewFactura.items.length > 3 && <div className="text-center">...</div>}
                 <div className="flex justify-between pt-1 border-t border-dashed border-slate-200 font-bold">
                    <span>TOTAL:</span><span>${previewFactura.total.toFixed(2)}</span>
                 </div>
              </div>
           </div>
        </div>

        <div id="printable-area" className="w-[58mm] bg-white p-4 border border-slate-200 shadow-xl mb-8 font-mono text-slate-800 antialiased">
          <center className="space-y-1 mb-4 border-b border-dashed border-slate-200 pb-4">
            {config.logo && <img src={config.logo} className="w-12 h-12 mb-2 object-contain" alt="Logo" />}
            <h1 className="font-bold text-xs uppercase tracking-tight">{config.nombre}</h1>
            {config.mostrarNIT && <p className="text-[9px]">NIT: {config.nit}</p>}
            <p className="text-[8px] leading-tight text-slate-500">{config.direccion}</p>
            <p className="text-[9px]">TEL: {config.telefono}</p>
          </center>
          
          <div className="py-2 mb-2 border-b border-dashed border-slate-200">
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span>FACTURA #</span>
              <span>{previewFactura.numeroFactura}</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>FECHA: {previewFactura.fecha}</span>
              <span>{previewFactura.hora}</span>
            </div>
          </div>

          <div className="mb-3 space-y-0.5 text-[10px]">
            <div className="flex gap-1">
              <span className="font-bold uppercase text-[9px] text-slate-400">CLIENTE:</span>
              <span className="font-bold">{previewFactura.clienteNombre}</span>
            </div>
            {cliente?.telefono && (
              <div className="flex gap-1">
                <span className="font-bold uppercase text-[9px] text-slate-400">TEL:</span>
                <span>{cliente.telefono}</span>
              </div>
            )}
          </div>

          <table className="w-full text-[10px] mb-4">
            <thead>
              <tr className="text-[8px] text-slate-400 font-bold uppercase border-b border-slate-100">
                <th className="text-left pb-1 font-normal">ITEM</th>
                <th className="text-center pb-1 font-normal pr-1">KG</th>
                <th className="text-right pb-1 font-normal">SUBT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {previewFactura.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-1.5 leading-none pr-1">
                    <div className="font-bold">{item.nombre}</div>
                    <div className="text-[8px] text-slate-400">${item.precioUnitario.toFixed(2)}/kg</div>
                  </td>
                  <td className="text-center pt-1.5 align-top">{item.cantidad.toFixed(3)}</td>
                  <td className="text-right pt-1.5 font-bold align-top">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-dashed border-slate-300">
                <td colSpan={2} className="pt-3 font-bold text-xs">TOTAL:</td>
                <td className="text-right pt-3 font-black text-sm text-primary">${previewFactura.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {previewFactura.notas && (
            <div className="bg-slate-50 p-2 mb-4 border border-slate-100 italic text-[9px] text-slate-500 leading-tight">
              {previewFactura.notas}
            </div>
          )}

          <center className="mt-6 border-t border-dashed border-slate-200 pt-4 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest">{config.mensajePie}</p>
            <p className="text-[7px] text-slate-400 tracking-tighter">SISTEMA POS WEIGHT - VER v1.0</p>
          </center>
        </div>

        <div className="flex gap-3 no-print">
          <button 
            onClick={() => setActiveScreen(0)} 
            className="h-10 px-6 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition active:scale-95 shadow-sm"
          >
            <ArrowLeft size={16}/> Volver
          </button>
          <button 
            onClick={() => window.print()} 
            className="h-10 px-8 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-emerald-800 transition active:scale-95"
          >
            <Printer size={18}/> Imprimir Ticket
          </button>
        </div>
      </div>
    );
  };

  const screens = [
    renderFacturacion(),
    renderClientes(),
    renderProductos(),
    renderOrdenes(),
    renderHistorial(),
    <div key="5"><center className="p-20 text-gray-400">Funcionalidad en desarrollo</center></div>,
    renderConfig(),
    renderPreview(),
    renderOrdenesActivas()
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-[#F3F4F6] text-slate-800 font-sans overflow-hidden">
      {/* Header Desktop */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 hidden md:flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold">P</div>
          <h1 className="text-lg font-bold tracking-tight">{config.nombre}</h1>
          {isOnline ? (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">En Línea</span>
          ) : (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase tracking-wider">Local</span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">N° Factura</div>
            <div className="font-mono font-bold text-sm text-primary">0000{ultimoNumero}</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-200"></div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Fecha y Hora</div>
            <div className="text-sm font-semibold">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
          </div>
          <button className="text-slate-400 bg-slate-50 p-1.5 rounded border border-slate-200" onClick={() => localStorage.clear()} title="Limpiar Caché"><Info size={16} /></button>
        </div>
      </header>

      {/* Header Mobile */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex md:hidden items-center justify-between flex-shrink-0 shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-white font-bold text-xs">P</div>
          <h1 className="font-bold text-sm truncate max-w-[120px]">{config.nombre}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
          )}
          <span className="font-mono font-bold text-xs text-primary">#000{ultimoNumero}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 mt-14 md:mt-0 mb-16 md:mb-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto w-full"
            >
              {screens[activeScreen]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation Bar */}
      <nav className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 flex-shrink-0 fixed bottom-0 left-0 right-0 z-[90]">
        {[
          { icon: <Calculator size={20} />, label: 'Venta', screen: 0 },
          { icon: <Zap size={20} />, label: 'Activas', screen: 8 },
          { icon: <Users size={20} />, label: 'Clientes', screen: 1 },
          { icon: <Package size={20} />, label: 'Productos', screen: 2 },
          { icon: <History size={20} />, label: 'Historial', screen: 4 },
          { icon: <Settings size={20} />, label: 'Negocio', screen: 6 }
        ].map((item, idx) => (
          <button 
            key={idx}
            onClick={() => setActiveScreen(item.screen)}
            className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-95 ${activeScreen === item.screen ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {item.icon}
            <span className={`text-[10px] uppercase tracking-tighter ${activeScreen === item.screen ? 'font-black' : 'font-bold'}`}>{item.label}</span>
            {activeScreen === item.screen && <div className="w-1 h-1 bg-primary rounded-full"></div>}
          </button>
        ))}
      </nav>
    </div>
  );
}
