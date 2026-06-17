import React from 'react';
import { Client } from '../types';
import { ShieldAlert, ShieldCheck, Mail, Phone, Building, UserCheck, Search, Users, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ClientsViewProps {
  clients: Client[];
  initialSearchQuery?: string;
  onClearSearch?: () => void;
  onAddClient?: (client: Client) => void;
  onUpdateClient?: (clientId: string, updates: Partial<Client>) => Promise<void>;
  onDeleteClient?: (clientId: string) => Promise<void>;
}

export function ClientsView({ 
  clients, 
  initialSearchQuery = '', 
  onClearSearch, 
  onAddClient,
  onUpdateClient,
  onDeleteClient
}: ClientsViewProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery);

  React.useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  // New Client Form States
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [role, setRole] = React.useState<'Propietario' | 'Inquilino'>('Propietario');
  const [valoration, setValoration] = React.useState<'Excelente' | 'Normal' | 'Mora' | 'Riesgo'>('Normal');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleStartAddClient = () => {
    setEditingClient(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('Propietario');
    setValoration('Normal');
    setError('');
    setIsModalOpen(true);
  };

  const handleStartEditClient = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setEmail(client.email);
    setPhone(client.phone || '');
    setRole(client.role);
    setValoration(client.valoration || 'Normal');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    setError('');

    try {
      if (editingClient) {
        if (onUpdateClient) {
          const updates: Partial<Client> = {
            name,
            email,
            phone,
            role,
            valoration,
          };
          await onUpdateClient(editingClient.id, updates);
        }
      } else {
        if (onAddClient) {
          // Since onAddClient is an async call to Firebase, wait for its resolution
          await onAddClient({
            id: 'client-' + Date.now(),
            name,
            email,
            phone,
            role,
            valoration,
            activeContracts: role === 'Inquilino' ? 1 : 0,
          });
        }
      }

      // Reset details
      setName('');
      setEmail('');
      setPhone('');
      setRole('Propietario');
      setValoration('Normal');
      setEditingClient(null);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving client:", err);
      let friendlyMessage = err?.message || 'Error desconocido';
      if (typeof friendlyMessage === 'string' && friendlyMessage.includes('permission')) {
        friendlyMessage = 'Permiso denegado por reglas de Firestore. Revisa que tu sesión esté activa y los campos tengan el formato correcto.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-10 w-full animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">Directorio de Clientes</h1>
          <p className="text-base text-[#86868B] mt-1">Visualiza propietarios, inquilinos reales y potenciales.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value === '' && onClearSearch) {
                  onClearSearch();
                }
              }}
              className="pl-10 pr-9 py-2 bg-white/60 backdrop-blur-md border border-white/80 rounded-xl text-sm outline-none placeholder:text-[#86868B] shadow-sm w-64 focus:ring-2 ring-[#2E847A]/25"
              placeholder="Buscar por nombre..." 
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  if (onClearSearch) onClearSearch();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          <button 
            onClick={handleStartAddClient}
            className="flex items-center gap-2 bg-[#2E847A] hover:bg-[#1E5F57] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Users size={16} /> Agregar Cliente
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="mb-4 text-xs font-medium text-[#2E847A] bg-[#2E847A]/5 border border-[#2E847A]/15 px-3 py-1.5 rounded-lg w-fit flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <span>Filtrado por: <strong>"{searchQuery}"</strong></span>
          <button 
            onClick={() => {
              setSearchQuery('');
              if (onClearSearch) onClearSearch();
            }} 
            className="hover:underline font-bold text-[#1F5F57]"
          >
            Mostrar todos
          </button>
        </div>
      )}

      <div className="glass-panel rounded-[1.5rem] overflow-hidden">
        <div className="grid grid-cols-12 gap-6 p-5 border-b border-white/50 bg-white/20 text-[11px] font-bold uppercase tracking-wider text-[#86868B]">
          <div className="col-span-3">Entidad / Nombre</div>
          <div className="col-span-2 border-r border-[#86868B]/10 pr-2">Contacto</div>
          <div className="col-span-2 text-center">Tipo de Cliente</div>
          <div className="col-span-2 text-center">Valoración</div>
          <div className="col-span-2 text-right">Contratos</div>
          <div className="col-span-1 text-right">Acciones</div>
        </div>
        
        <div className="divide-y divide-black/5">
          {filteredClients.length === 0 ? (
            <div className="p-10 text-center text-sm font-medium text-[#86868B]">
              No se encontraron clientes que coincidan con la búsqueda.
            </div>
          ) : (
            filteredClients.map((client) => (
            <motion.div 
              key={client.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 gap-6 p-5 items-center hover:bg-white/50 transition-colors cursor-pointer group"
            >
              <div className="col-span-3">
                <div className="font-semibold text-sm text-[#1D1D1F] flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-full border border-white shadow-sm flex items-center justify-center shrink-0",
                    client.role === "Propietario" ? "bg-indigo-50 text-indigo-500" :
                    client.role === "Inquilino" ? "bg-emerald-50 text-emerald-500" :
                    "bg-zinc-50 text-zinc-500"
                  )}>
                    <UserCheck size={16} />
                  </div>
                  {client.name}
                </div>
              </div>
              <div className="col-span-2 flex flex-col gap-1 text-[11px] text-[#86868B] font-medium truncate">
                <span className="flex items-center gap-1.5 truncate"><Mail size={11} className="text-[#1D1D1F]" /> {client.email}</span>
                <span className="flex items-center gap-1.5"><Phone size={11} className="text-[#1D1D1F]" /> {client.phone}</span>
              </div>
              <div className="col-span-2 flex justify-center">
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                  client.role === "Propietario" ? "bg-indigo-50 border-indigo-100/50 text-indigo-700" :
                  client.role === "Inquilino" ? "bg-emerald-50 border-emerald-100/50 text-emerald-700" :
                  "bg-zinc-50 border-zinc-200/50 text-zinc-600"
                )}>
                  {client.role}
                </span>
              </div>
              <div className="col-span-2 flex justify-center">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border shadow-sm backdrop-blur-sm",
                  client.valoration === "Excelente" ? "bg-emerald-50/80 text-emerald-700 border-emerald-200" :
                  client.valoration === "Mora" ? "bg-red-50/80 text-red-700 border-red-200" :
                  "bg-amber-50/80 text-amber-700 border-amber-200"
                )}>
                  {client.valoration === "Excelente" && <ShieldCheck size={14} />}
                  {(client.valoration === "Riesgo" || client.valoration === "Mora") && <ShieldAlert size={14} />}
                  {client.valoration}
                </div>
              </div>
              <div className="col-span-2 text-right">
                {client.role === 'Propietario' ? (
                  <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50/80 w-fit ml-auto px-3 py-1.5 rounded-xl border border-indigo-100/50">
                    <Building size={14} /> {client.propertiesOwned?.length || 0}
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-emerald-600 w-fit ml-auto px-3 py-1.5 rounded-xl border border-emerald-100/50 bg-emerald-50/80">
                    Activos: {client.activeContracts}
                  </div>
                )}
              </div>
              <div className="col-span-1 flex justify-end gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pr-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleStartEditClient(client); }}
                  className="p-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-600 hover:text-[#2E847A] border border-black/5 hover:border-[#2E847A]/30 transition-all shadow-sm cursor-pointer"
                  title="Editar cliente"
                >
                  <Pencil size={12} />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (window.confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
                      if (onDeleteClient) onDeleteClient(client.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 border border-[#b91c1c]/10 hover:border-[#b91c1c]/25 transition-all shadow-sm cursor-pointer"
                  title="Eliminar cliente"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))
          )}
        </div>
      </div>

      {/* High-Contrast Design Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-black/5 p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1D1D1F] flex items-center gap-2">
                <span>👤</span> {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClient(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl leading-relaxed">
                  ⚠️ Error: {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  disabled={loading}
                  placeholder="Elena Rodríguez"
                  className="w-full px-4 py-2 bg-[#F5F5F7] border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:bg-white focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                  disabled={loading}
                  placeholder="elena@example.com"
                  className="w-full px-4 py-2 bg-[#F5F5F7] border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:bg-white focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Teléfono</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  disabled={loading}
                  placeholder="+54 9 11 1234-5678"
                  className="w-full px-4 py-2 bg-[#F5F5F7] border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:bg-white focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Rol</label>
                  <select 
                    value={role} 
                    onChange={(e: any) => setRole(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-[#F5F5F7] border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:bg-white focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                  >
                    <option value="Propietario">Propietario</option>
                    <option value="Inquilino">Inquilino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Valoración</label>
                  <select 
                    value={valoration} 
                    onChange={(e: any) => setValoration(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-[#F5F5F7] border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:bg-white focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Excelente">Excelente</option>
                    <option value="Mora">Mora</option>
                    <option value="Riesgo">Riesgo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingClient(null);
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#2E847A] hover:bg-[#1E5F57] text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {editingClient ? 'Guardando...' : 'Registrando...'}
                    </>
                  ) : (
                    editingClient ? 'Actualizar' : 'Registrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
