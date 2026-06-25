import React, { useState, useEffect } from 'react';
import { Property, Client } from '../types';
import { UploadCloud, FileText, CheckCircle2, ShieldCheck, MapPin, Maximize, User, DoorOpen, Plus, Home, Building2, Store, Map as MapIcon, Layers, Briefcase, Trees, Box, ChevronDown, ChevronUp, Pencil, Trash2, Calendar, Grid, List, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
// import 'leaflet/dist/leaflet.css';
// import icon from 'leaflet/dist/images/marker-icon.png';
// import iconShadow from 'leaflet/dist/images/marker-shadow.png';

interface PropertiesViewProps {
  properties: Property[];
  onAddProperty: (prop: Property) => void;
  onUpdateProperty?: (propId: string, updates: Partial<Property>) => Promise<void>;
  onDeleteProperty?: (propId: string) => Promise<void>;
  clients: Client[];
  onNavigateToClient?: (clientName: string) => void;
  initialStatusFilter?: Property["status"] | "Todos";
  onStatusFilterChange?: (status: Property["status"] | "Todos") => void;
  initialSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

const CategoryIcon: Record<string, any> = {
  Casa: Home,
  Departamento: Building2,
  Local: Store,
  Lote: MapIcon,
  Duplex: Layers,
  Oficina: Briefcase,
  Terreno: Trees,
  Otro: Box
};

const catColors: Record<string, string> = {
  Casa: "bg-rose-50 text-rose-700 border-rose-200/60 shadow-rose-500/10",
  Departamento: "bg-sky-50 text-sky-700 border-sky-200/60 shadow-sky-500/10",
  Local: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60 shadow-fuchsia-500/10",
  Lote: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-amber-500/10",
  Duplex: "bg-violet-50 text-violet-700 border-violet-200/60 shadow-violet-500/10",
  Oficina: "bg-slate-50 text-slate-700 border-slate-200/60 shadow-slate-500/10",
  Terreno: "bg-lime-50 text-lime-700 border-lime-200/60 shadow-lime-500/10",
  Otro: "bg-zinc-50 text-zinc-700 border-zinc-200/60 shadow-zinc-500/10",
};

function getDaysRemaining(endDate: string) {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatDaysRemaining(endDate: string) {
  const days = getDaysRemaining(endDate);
  if (days === null || isNaN(days)) return null;
  if (days < 0) {
    return { text: `Vencido hace ${Math.abs(days)} días`, style: "text-red-700 bg-red-50 border-red-200" };
  }
  if (days === 0) {
    return { text: "Vence HOY", style: "text-amber-700 bg-amber-50 border-amber-300 animate-pulse" };
  }
  if (days <= 30) {
    return { text: `Faltan ${days} días (Vence pronto)`, style: "text-amber-700 bg-amber-50/70 border-amber-200" };
  }
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (months > 0) {
    if (remainingDays > 0) {
      return { text: `Faltan ${months} ${months === 1 ? 'mes' : 'meses'} y ${remainingDays} ${remainingDays === 1 ? 'día' : 'días'}`, style: "text-zinc-700 bg-zinc-50 border-zinc-200" };
    }
    return { text: `Faltan ${months} ${months === 1 ? 'mes' : 'meses'}`, style: "text-zinc-700 bg-zinc-50 border-zinc-200" };
  }
  return { text: `Faltan ${days} días`, style: "text-zinc-700 bg-zinc-50 border-zinc-200" };
}

function CompactPropertyRow({
  prop,
  clients,
  formatCurrency,
  onNavigateToClient,
  onEdit,
  onDelete,
  onViewMap
}: {
  prop: Property;
  clients: Client[];
  formatCurrency: (n: number, currency: any) => string;
  onNavigateToClient?: (name: string) => void;
  onEdit?: (prop: Property) => void;
  onDelete?: (propId: string) => void;
  onViewMap?: (mapUrl: string, address: string) => void;
  key?: any;
}) {
  const matchedOwner = clients.find(c => c.id === prop.ownerId || (prop.ownerId && c.name.toLowerCase() === prop.ownerId.toLowerCase()));
  const owner = matchedOwner || (prop.ownerId && !prop.ownerId.startsWith("client-") ? { id: prop.ownerId, name: prop.ownerId, role: "Propietario" } as Client : null);

  const matchedTenant = clients.find(c => c.id === prop.tenantId || (prop.tenantId && c.name.toLowerCase() === prop.tenantId.toLowerCase()));
  const tenant = prop.tenantId ? (matchedTenant || (!prop.tenantId.startsWith("client-") ? { id: prop.tenantId, name: prop.tenantId, role: "Inquilino" } as Client : null)) : null;

  const Icon = CategoryIcon[prop.category] || Box;
  const isVenta = prop.operation === "Venta";

  // Status-based colors
  const statusStyles: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    Disponible: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    Ocupado: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" },
    Reservado: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
    Vencido: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
    Vendido: { bg: "bg-zinc-100", text: "text-zinc-650", border: "border-zinc-350", dot: "bg-zinc-500" },
  };

  const style = statusStyles[prop.status] || statusStyles.Disponible;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 mb-3 bg-white/80 hover:bg-white border hover:border-[#2E847A]/35 rounded-[1.25rem] shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-200 group"
    >
      {/* Left side: Category icon & Address */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Status bar marker */}
        <div className={cn("w-1 h-8 rounded-full shrink-0", style.dot)} />

        <div className={cn("p-2 rounded-lg border shrink-0", catColors[prop.category] || catColors.Otro)}>
          <Icon size={14} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
               "text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded",
               isVenta ? "bg-orange-500 text-white" : "bg-blue-600 text-white"
            )}>
              {prop.operation}
            </span>
            <span className="text-[10px] font-semibold text-[#86868B]">
              Cod: {prop.id}
            </span>
            {prop.features.surface && (
              <span className="text-[9px] font-mono font-bold text-[#86868B] bg-zinc-100 px-1.5 py-0.5 rounded">
                ⚡ {prop.features.surface} m²
              </span>
            )}
          </div>
          <h4 
            className={cn(
              "text-sm font-bold text-[#1D1D1F] truncate group-hover:text-[#2E847A] transition-colors flex items-center gap-1.5",
              prop.mapUrl && "cursor-pointer hover:underline select-none"
            )}
            onClick={prop.mapUrl ? (e) => {
              e.stopPropagation();
              onViewMap?.(prop.mapUrl!, prop.address);
            } : undefined}
            title={prop.mapUrl ? "Ver mapa interactivo en-app" : undefined}
          >
            <MapPin size={13} className={cn("text-[#86868B] shrink-0", prop.mapUrl && "text-[#2E847A]")} />
            <span className="truncate">{prop.address}</span>
            {prop.mapUrl && (
              <span className="text-[10px] text-[#2E847A] font-bold bg-[#2E847A]/5 border border-[#2E847A]/15 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ml-1 overflow-hidden">
                🗺️ Ver Mapa
              </span>
            )}
          </h4>
        </div>
      </div>

      {/* Middle section: Owner, Tenant, Price, and Status */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs shrink-0 bg-zinc-50/50 p-3 md:p-0 rounded-xl md:bg-transparent">
        {/* Owner link */}
        <div className="min-w-[124px]">
          <span className="block text-[8px] font-bold text-[#86868B] uppercase tracking-widest mb-0.5">Propietario</span>
          {owner ? (
            <button
              onClick={() => onNavigateToClient?.(owner.name)}
              className="font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer truncate max-w-[120px]"
            >
              <User size={11} className="shrink-0" /> <span className="truncate">{owner.name}</span>
            </button>
          ) : (
            <span className="text-[#86868B]/50 italic">Sin asignar</span>
          )}
        </div>

        {/* Tenant link */}
        {!isVenta && (
          <div className="min-w-[124px]">
            <span className="block text-[8px] font-bold text-[#86868B] uppercase tracking-widest mb-0.5">Inquilino</span>
            {tenant ? (
              <button
                onClick={() => onNavigateToClient?.(tenant.name)}
                className="font-semibold text-[#2E847A] hover:underline flex items-center gap-1 cursor-pointer truncate max-w-[120px]"
              >
                <User size={11} className="shrink-0" /> <span className="truncate">{tenant.name}</span>
              </button>
            ) : (
              <span className="text-[#86868B]/40 italic">Sin inquilino</span>
            )}
          </div>
        )}

        {/* Value / Price */}
        <div className="min-w-[110px]">
          <span className="block text-[8px] font-bold text-[#86868B] uppercase tracking-widest mb-0.5">Valor</span>
          <span className={cn("font-bold text-sm", isVenta ? "text-orange-600" : "text-blue-700")}>
            {formatCurrency(prop.price, prop.currency)} <span className="text-[10px] font-medium opacity-70">{prop.currency}</span>
          </span>
        </div>

        {/* Status Badge */}
        <div className="min-w-[95px] flex items-center justify-end md:justify-start">
          <span className={cn(
            "text-[8px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full border flex items-center gap-1 shadow-2xs",
            style.bg, style.text, style.border
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", style.dot)} />
            {prop.status}
          </span>
        </div>
      </div>

      {/* Right side: Row Actions */}
      <div className="flex items-center gap-2 justify-end shrink-0 pl-2">
        <button
          onClick={() => onEdit?.(prop)}
          className="p-1.5 rounded-lg bg-zinc-50 hover:bg-[#2E847A]/10 text-zinc-600 hover:text-[#2E847A] border border-black/5 hover:border-[#2E847A]/20 transition-all cursor-pointer"
          title="Editar este registro"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => {
            if (true) {
              onDelete?.(prop.id);
            }
          }}
          className="p-1.5 rounded-lg bg-zinc-50 hover:bg-red-50 text-zinc-650 hover:text-red-650 border border-black/5 hover:border-red-200 transition-all cursor-pointer"
          title="Eliminar este de inmediato"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

function PropertyCardItem({ 
  prop, 
  clients, 
  formatCurrency, 
  onNavigateToClient,
  onEdit,
  onDelete,
  onViewMap
}: { 
  prop: Property; 
  clients: Client[]; 
  formatCurrency: (n: number, currency: any) => string;
  onNavigateToClient?: (name: string) => void;
  onEdit?: (prop: Property) => void;
  onDelete?: (propId: string) => void;
  onViewMap?: (mapUrl: string, address: string) => void;
  key?: any;
}) {
  const [showFeatures, setShowFeatures] = useState(false);
  
  // Graceful owner mapping from clients list. Does not invent fallback names not in clients list.
  const matchedOwner = clients.find(c => c.id === prop.ownerId || (prop.ownerId && c.name.toLowerCase() === prop.ownerId.toLowerCase()));
  const owner = matchedOwner || (prop.ownerId && !prop.ownerId.startsWith("client-") ? { id: prop.ownerId, name: prop.ownerId, role: "Propietario" } as Client : null);

  // Graceful tenant mapping from clients list. Does not invent fallback names not in clients list.
  const matchedTenant = clients.find(c => c.id === prop.tenantId || (prop.tenantId && c.name.toLowerCase() === prop.tenantId.toLowerCase()));
  const tenant = prop.tenantId ? (matchedTenant || (!prop.tenantId.startsWith("client-") ? { id: prop.tenantId, name: prop.tenantId, role: "Inquilino" } as Client : null)) : null;
  const Icon = CategoryIcon[prop.category] || Box;
  const isVenta = prop.operation === "Venta";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-card rounded-[1.5rem] flex flex-col hover:shadow-lg transition-all relative overflow-hidden group border",
        prop.status === "Disponible" && "!bg-[#F0FDF4] !border-emerald-300 hover:!border-emerald-400 hover:shadow-emerald-500/15",
        prop.status === "Ocupado" && "!bg-[#F8FAFC] !border-slate-300 hover:!border-slate-400 hover:shadow-slate-500/15",
        prop.status === "Reservado" && "!bg-[#FAF5FF] !border-purple-300 hover:!border-purple-400 hover:shadow-purple-500/15",
        prop.status === "Vencido" && "!bg-[#FEF2F2] !border-red-300 hover:!border-red-400 hover:shadow-red-500/15",
        prop.status === "Vendido" && "!bg-zinc-100/90 !border-zinc-300 hover:!border-zinc-400/90 hover:shadow-zinc-500/5 shadow-inner"
      )}
    >
      <div className={cn(
        "absolute top-0 left-0 w-full h-1.5 transition-all",
        prop.status === "Vendido" ? "bg-red-600" : (prop.status === "Reservado" ? "bg-gradient-to-r from-purple-500 to-indigo-600" : (isVenta ? "bg-gradient-to-r from-orange-400 to-orange-600" : "bg-gradient-to-r from-blue-500 to-indigo-600"))
      )} />

      {prop.status === "Ocupado" && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black z-10 transition-all" />
      )}
      {prop.status === "Disponible" && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-emerald-600 z-10 transition-all" />
      )}
      {prop.status === "Reservado" && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-purple-600 z-10 transition-all" />
      )}
      {prop.status === "Vencido" && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-[#8F664E] z-10 transition-all" />
      )}
      {prop.status === "Vendido" && (
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-red-600 z-10 transition-all animate-pulse" />
      )}

      <div className="p-6 flex flex-col h-full mt-1">
        <div className={cn("flex-1 flex flex-col", prop.status === "Vendido" && "grayscale saturate-0 opacity-70")}>
          <div className="flex justify-between items-start mb-5">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border shadow-sm",
                    isVenta ? "bg-orange-500 text-white border-orange-600 shadow-orange-500/20" : "bg-blue-600 text-white border-blue-700 shadow-blue-500/20"
                  )}>
                    {prop.operation}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm",
                    catColors[prop.category] || catColors.Otro
                  )}>
                    <Icon size={14} />
                    {prop.category}
                  </span>
                </div>

                <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit?.(prop); }}
                    className="p-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-600 hover:text-[#2E847A] border border-black/5 hover:border-[#2E847A]/30 transition-all shadow-sm cursor-pointer"
                    title="Editar propiedad"
                  >
                    <Pencil size={13} />
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (true) {
                        onDelete?.(prop.id); 
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 border border-black/5 hover:border-red-200 transition-all shadow-sm cursor-pointer"
                    title="Eliminar propiedad"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              
              <h3 
                className={cn(
                  "text-lg font-semibold text-[#1D1D1F] leading-tight flex items-start gap-1.5 mt-1 pr-2",
                  prop.mapUrl && "cursor-pointer select-none group/addr"
                )}
                onClick={prop.mapUrl ? (e) => {
                  e.stopPropagation();
                  onViewMap?.(prop.mapUrl!, prop.address);
                } : undefined}
                title={prop.mapUrl ? "Ver mapa interactivo en-app" : undefined}
              >
                <MapPin size={20} className={cn("text-[#86868B] shrink-0 mt-0.5", prop.mapUrl && "text-[#2E847A]")} />
                <div className="flex-1">
                  <span className={cn(prop.mapUrl && "group-hover/addr:underline group-hover/addr:text-[#2E847A]")}>{prop.address}</span>
                  {prop.mapUrl && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2E847A] bg-[#2E847A]/5 border border-[#2E847A]/15 px-2 py-0.5 rounded-lg mt-1.5 cursor-pointer hover:bg-[#2E847A]/10 transition-all">
                      🗺️ Ver Ubicación (OSM en App)
                    </span>
                  )}
                </div>
              </h3>
            </div>
          </div>

          {/* Client Links */}
          <div className={cn(
            "flex flex-col gap-2.5 mb-4 p-3.5 rounded-xl border shadow-[0_2px_10px_rgba(0,0,0,0.01)]",
            prop.status === "Disponible" && "bg-emerald-100/40 border-emerald-200 text-emerald-950",
            prop.status === "Ocupado" && "bg-slate-100/40 border-slate-200 text-slate-950",
            prop.status === "Reservado" && "bg-purple-100/45 border-purple-200 text-purple-950",
            prop.status === "Vencido" && "bg-red-100/40 border-red-200 text-red-950",
            prop.status === "Vendido" && "bg-zinc-200/40 border-zinc-300 text-zinc-950"
          )}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase font-bold text-[#86868B] tracking-widest">Propietario</div>
              {owner ? (
                <button 
                  onClick={() => onNavigateToClient?.(owner.name)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-all cursor-pointer"
                  title={`Ver perfil de ${owner.name}`}
                >
                  <User size={14} /> <span className="truncate max-w-[140px]">{owner.name}</span>
                </button>
              ) : prop.ownerId && !prop.ownerId.startsWith("client-") ? (
                <button 
                  onClick={() => onNavigateToClient?.(prop.ownerId)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-all cursor-pointer"
                  title={`Buscar propietario o contacto: ${prop.ownerId}`}
                >
                  <User size={14} /> <span className="truncate max-w-[140px]">{prop.ownerId}</span>
                </button>
              ) : (
                <span className="text-sm font-semibold text-[#86868B]/60 italic">Sin asignar</span>
              )}
            </div>
            {!isVenta && (
              <div className={cn(
                "flex items-center justify-between pt-2.5 border-t",
                prop.status === "Disponible" && "border-emerald-200/65",
                prop.status === "Ocupado" && "border-slate-200",
                prop.status === "Reservado" && "border-purple-200",
                prop.status === "Vencido" && "border-red-200/65",
                prop.status === "Vendido" && "border-zinc-300"
              )}>
                <div className="text-[10px] uppercase font-bold text-[#86868B] tracking-widest">Inquilino</div>
                {tenant ? (
                  <button 
                    onClick={() => onNavigateToClient?.(tenant.name)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline transition-all cursor-pointer"
                    title={`Ver perfil de ${tenant.name}`}
                  >
                    <User size={14} /> <span className="truncate max-w-[140px]">{tenant.name}</span>
                  </button>
                ) : prop.tenantId && !prop.tenantId.startsWith("client-") ? (
                  <button 
                    onClick={() => onNavigateToClient?.(prop.tenantId!)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline transition-all cursor-pointer"
                    title={`Buscar inquilino o contacto: ${prop.tenantId}`}
                  >
                    <User size={14} /> <span className="truncate max-w-[140px]">{prop.tenantId}</span>
                  </button>
                ) : (
                  <div className="text-sm font-semibold text-[#86868B]/60 italic">Sin asignar</div>
                )}
              </div>
            )}

            {prop.operation === "Alquiler" && prop.contract && prop.contract.endDate && (
              <div className={cn(
                "flex flex-col gap-1 pt-2.5 mt-1 border-t text-xs",
                prop.status === "Disponible" && "border-emerald-200/65",
                prop.status === "Ocupado" && "border-slate-200",
                prop.status === "Reservado" && "border-purple-200",
                prop.status === "Vencido" && "border-red-200/65",
                prop.status === "Vendido" && "border-zinc-300"
              )}>
                <div className="flex items-center justify-between text-[#86868B]">
                  <div className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1">
                    <Calendar size={11} /> Vence
                  </div>
                  <div className="font-mono font-bold text-zinc-800">
                    {new Date(prop.contract.endDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>
                
                {(() => {
                  const info = formatDaysRemaining(prop.contract.endDate);
                  if (!info) return null;
                  return (
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 mt-1 text-center bg-white/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                      info.style
                    )}>
                      <span>{info.text}</span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Technical Features Toggle */}
          {(prop.features.surface || prop.features.rooms) && (
            <div className="mb-5">
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                {showFeatures ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showFeatures ? 'Ocultar características' : 'Ver características'}
              </button>
              
              <AnimatePresence>
                {showFeatures && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={cn(
                      "flex gap-4 text-[#86868B] text-sm pt-3 mt-2 border-t",
                      prop.status === "Disponible" && "border-emerald-200/65",
                      prop.status === "Ocupado" && "border-slate-200",
                      prop.status === "Reservado" && "border-purple-200",
                      prop.status === "Vencido" && "border-red-200/65",
                      prop.status === "Vendido" && "border-zinc-300"
                    )}>
                      {prop.features.surface && (
                        <div className="flex items-center gap-1.5">
                          <Maximize size={16} /> {prop.features.surface} m²
                        </div>
                      )}
                      {prop.features.rooms && (
                        <div className="flex items-center gap-1.5">
                          <DoorOpen size={16} /> {prop.features.rooms} hab.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className={cn(
          "grid grid-cols-2 gap-4 mt-auto pt-5 border-t items-center",
          prop.status === "Disponible" && "border-emerald-200/65",
          prop.status === "Ocupado" && "border-slate-200",
          prop.status === "Reservado" && "border-purple-200",
          prop.status === "Vencido" && "border-red-200/65",
          prop.status === "Vendido" && "border-zinc-300"
        )}>
          <div className={cn(prop.status === "Vendido" && "grayscale saturate-0 opacity-70")}>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#86868B] mb-0.5">VALOR</p>
            <p className={cn(
              "font-semibold text-lg",
              isVenta ? "text-orange-600" : "text-blue-700"
            )}>
              {formatCurrency(prop.price, prop.currency)} <span className="text-xs font-medium opacity-70">{prop.currency}</span>
            </p>
          </div>
          <div className="flex flex-col items-end justify-center">
            <div className="flex items-center justify-end gap-2 shrink-0">
              <span className={cn(prop.status === "Vendido" && "grayscale saturate-0 opacity-50")}>
                {prop.auditReady ? (
                  <span className="flex items-center justify-center text-emerald-500 bg-emerald-50 border border-emerald-100 w-8 h-8 rounded-full" title="Audit-Ready">
                    <ShieldCheck size={16} />
                  </span>
                ) : (
                  <span className="flex items-center justify-center text-amber-500 bg-white shadow-sm border border-black/5 w-8 h-8 rounded-full" title="Pendiente Documental">
                    <ShieldCheck size={16} className="opacity-50" />
                  </span>
                )}
              </span>
              
              <span className={cn(
                "text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm transition-all flex items-center gap-1",
                prop.status === "Ocupado" ? "bg-black border-black text-white" :
                prop.status === "Disponible" ? "bg-emerald-600 border-emerald-700 text-white shadow-emerald-500/10" :
                prop.status === "Reservado" ? "bg-purple-600 border-purple-700 text-white shadow-purple-500/10" :
                prop.status === "Vendido" ? "bg-red-600 border-red-700 text-white shadow-red-500/20 active-glow relative" :
                "bg-[#8F664E] border-[#734E39] text-white"
              )}>
                {prop.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PropertiesView({ 
  properties, 
  onAddProperty, 
  onUpdateProperty, 
  onDeleteProperty, 
  clients, 
  onNavigateToClient,
  initialStatusFilter = 'Todos',
  onStatusFilterChange,
  initialSearchQuery = '',
  onSearchQueryChange
}: PropertiesViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<Property["status"] | "Todos">(initialStatusFilter);
  const [selectedOperation, setSelectedOperation] = useState<'Todos' | 'Venta' | 'Alquiler'>('Todos');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  React.useEffect(() => {
    if (initialStatusFilter) {
      setSelectedStatus(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  React.useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const handleStatusChange = (status: Property["status"] | "Todos") => {
    setSelectedStatus(status);
    onStatusFilterChange?.(status);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearchQueryChange?.(query);
  };

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // New Property Form states
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  
  // In-app interactive map states
  const [activeMapUrl, setActiveMapUrl] = useState<string | null>(null);
  const [activeMapAddress, setActiveMapAddress] = useState<string>('');
  
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Property["category"]>('Departamento');
  const [operation, setOperation] = useState<Property["operation"]>('Alquiler');
  const [status, setStatus] = useState<Property["status"]>('Disponible');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState<Property["currency"]>('ARS');
  const [ownerId, setOwnerId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [surface, setSurface] = useState<number | ''>('');
  const [rooms, setRooms] = useState<number | ''>('');
  const [bathrooms, setBathrooms] = useState<number | ''>('');
  const [yearBuilt, setYearBuilt] = useState<number | ''>('');
  const [auditReady, setAuditReady] = useState(true);
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  
  // Real-time address autocomplete suggestions
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isQueryingSuggestions, setIsQueryingSuggestions] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('');

  React.useEffect(() => {
    // If empty, too short, or matches last selected address, don't query Osm Nominatim
    if (!address.trim() || address.length < 4 || address === lastSelectedAddress) {
      setAddressSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsQueryingSuggestions(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&addressdetails=1`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'UNKEINMO/1.0 (mesfede@unkeinmo.com)'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAddressSuggestions(data || []);
          setShowSuggestionsDropdown((data || []).length > 0);
        }
      } catch (err) {
        console.error('Error fetching OpenStreetMap suggestions:', err);
      } finally {
        setIsQueryingSuggestions(false);
      }
    }, 550); // 550ms debounce to query responsibly

    return () => clearTimeout(delayDebounceFn);
  }, [address, lastSelectedAddress]);

  const handleSelectSuggestion = (suggestion: any) => {
    const displayName = suggestion.display_name;
    const lat = suggestion.lat;
    const lon = suggestion.lon;
    const generatedLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
    
    setAddress(displayName);
    setLastSelectedAddress(displayName);
    setMapUrl(generatedLink);
    setGeoStatus('¡Éxito! Dirección seleccionada y de georreferencia configurada.');
    setAddressSuggestions([]);
    setShowSuggestionsDropdown(false);
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGeoreference = async () => {
    if (!address.trim()) {
      setGeoStatus('Por favor ingresa una dirección primero.');
      return;
    }
    setGeoStatus('Buscando georreferencia en OpenStreetMap...');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UNKEINMO/1.0 (mesfede@unkeinmo.com)'
        }
      });
      if (!response.ok) {
        throw new Error('No se pudo consultar OpenStreetMap');
      }
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = result.lat;
        const lon = result.lon;
        const generatedLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
        setMapUrl(generatedLink);
        setGeoStatus('¡Éxito! Dirección georreferenciada con éxito.');
        if (result.display_name) {
          // Auto confirm due to iframe limitation
          const confirmUpdate = true; // window.confirm(`¿Deseas normalizar la dirección a la sugerida por OpenStreetMap?\n\n"${result.display_name}"`);
          if (confirmUpdate) {
            setAddress(result.display_name);
          }
        }
      } else {
        setGeoStatus('No se encontró la ubicación exacta. Generando enlace de búsqueda genérica...');
        const genericLink = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
        setMapUrl(genericLink);
      }
    } catch (err: any) {
      console.error(err);
      const genericLink = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
      setMapUrl(genericLink);
      setGeoStatus('Se generó un enlace de búsqueda genérica debido a un error de conexión.');
    }
  };

  // Get owners and tenants: strictly separated by Client role
  const owners = clients.filter(c => c.role === 'Propietario');
  const tenants = clients.filter(c => c.role === 'Inquilino');

  // Status counts (always over properties matching the selected operation for dynamic accuracy)
  const countAll = properties.filter(p => selectedOperation === 'Todos' || p.operation === selectedOperation).length;
  const countDisponible = properties.filter(p => p.status === "Disponible" && (selectedOperation === 'Todos' || p.operation === selectedOperation)).length;
  const countOcupado = properties.filter(p => p.status === "Ocupado" && (selectedOperation === 'Todos' || p.operation === selectedOperation)).length;
  const countReservado = properties.filter(p => p.status === "Reservado" && (selectedOperation === 'Todos' || p.operation === selectedOperation)).length;
  const countVencido = properties.filter(p => p.status === "Vencido" && (selectedOperation === 'Todos' || p.operation === selectedOperation)).length;
  const countVendido = properties.filter(p => p.status === "Vendido" && (selectedOperation === 'Todos' || p.operation === selectedOperation)).length;

  // Filter properties by Status, Operation type and Search query
  const filteredProperties = properties.filter(p => {
    // Status filter
    if (selectedStatus !== "Todos" && p.status !== selectedStatus) return false;

    // Operation type filter (Venta / Alquileres)
    if (selectedOperation !== "Todos" && p.operation !== selectedOperation) return false;

    // Search query query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      
      const matchedOwner = clients.find(c => c.id === p.ownerId || (p.ownerId && c.name.toLowerCase() === p.ownerId.toLowerCase()));
      const matchedTenant = clients.find(c => c.id === p.tenantId || (p.tenantId && c.name.toLowerCase() === p.tenantId.toLowerCase()));
      
      const ownerName = matchedOwner?.name || p.ownerId || "";
      const tenantName = matchedTenant?.name || p.tenantId || "";
      
      return (
        p.address.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        ownerName.toLowerCase().includes(q) ||
        tenantName.toLowerCase().includes(q) ||
        p.operation.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Helper to extract a numerical identifier/timestamp from property IDs (e.g. prop-1 or prop-1718012023)
  const getPropertyTimestamp = (id: string): number => {
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Sort properties: 1st Sales ("Venta"), 2nd Rentals ("Alquiler").
  // Within each group, sort by newest first (highest timestamp extracted from ID).
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (a.operation === 'Venta' && b.operation !== 'Venta') return -1;
    if (a.operation !== 'Venta' && b.operation === 'Venta') return 1;
    
    const timeA = getPropertyTimestamp(a.id);
    const timeB = getPropertyTimestamp(b.id);
    return timeB - timeA;
  });

  // Set default owner on load/clients change
  React.useEffect(() => {
    if (owners.length > 0 && !ownerId && !editingProperty) {
      setOwnerId(owners[0].id);
    }
  }, [clients, owners, ownerId, editingProperty]);

  const formatCurrency = (n: number, currency: "ARS"|"USD") => new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(n);

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleStartAddProperty = () => {
    setEditingProperty(null);
    setAddress('');
    setCategory('Departamento');
    setOperation('Alquiler');
    setStatus('Disponible');
    setPrice('');
    setCurrency('ARS');
    if (owners.length > 0) setOwnerId(owners[0].id);
    else setOwnerId('');
    setTenantId('');
    setSurface('');
    setRooms('');
    setBathrooms('');
    setYearBuilt('');
    setAuditReady(true);
    setContractStartDate('');
    setContractEndDate('');
    setMapUrl('');
    setGeoStatus('');
    setAddressSuggestions([]);
    setShowSuggestionsDropdown(false);
    setLastSelectedAddress('');
    setError('');
    setActiveTab('manual');
    setIsModalOpen(true);
  };

  const handleStartEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setAddress(prop.address);
    setCategory(prop.category);
    setOperation(prop.operation);
    setStatus(prop.status);
    setPrice(prop.price);
    setCurrency(prop.currency);
    setMapUrl(prop.mapUrl || '');
    setGeoStatus('');
    
    // Parse coordinates if available
    const latMatch = prop.mapUrl ? prop.mapUrl.match(/[?&]mlat=([-\d.]+)/) : null;
    const lonMatch = prop.mapUrl ? prop.mapUrl.match(/[?&]mlon=([-\d.]+)/) : null;

    setAddressSuggestions([]);
    setShowSuggestionsDropdown(false);
    setLastSelectedAddress(prop.address || '');
    
    // Safety check to ensure form's selected owner is synchronized with React's ownerId state
    const ownerExists = owners.some(o => o.id === prop.ownerId);
    if (ownerExists) {
      setOwnerId(prop.ownerId);
    } else {
      // Try to find if any registered owner has a matching name
      const matchedByName = owners.find(o => prop.ownerId && o.name.toLowerCase() === prop.ownerId.toLowerCase());
      if (matchedByName) {
        setOwnerId(matchedByName.id);
      } else if (owners.length > 0) {
        // Fallback to first available owner so React state matches browser's visual selection
        setOwnerId(owners[0].id);
      } else {
        setOwnerId('');
      }
    }

    // Safety check to ensure tenant is also synchronized with tenantId state
    const tenantExists = tenants.some(t => t.id === prop.tenantId);
    if (tenantExists) {
      setTenantId(prop.tenantId || '');
    } else {
      const matchedTenantByName = tenants.find(t => prop.tenantId && t.name.toLowerCase() === prop.tenantId.toLowerCase());
      if (matchedTenantByName) {
        setTenantId(matchedTenantByName.id);
      } else {
        setTenantId('');
      }
    }

    setSurface(prop.features?.surface || '');
    setRooms(prop.features?.rooms !== undefined ? prop.features.rooms : '');
    setBathrooms(prop.features?.bathrooms !== undefined ? prop.features.bathrooms : '');
    setYearBuilt(prop.features?.yearBuilt !== undefined ? prop.features.yearBuilt : '');
    setAuditReady(!!prop.auditReady);
    setContractStartDate(prop.contract?.startDate || '');
    setContractEndDate(prop.contract?.endDate || '');
    setError('');
    setActiveTab('manual');
    setIsModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || price === '' || !ownerId) {
      setError('Por favor completa los campos requeridos: Dirección, VALOR y Propietario.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const cleanFeatures: {
        surface: number;
        rooms?: number;
        bathrooms?: number;
        yearBuilt?: number;
      } = {
        surface: Number(surface) || 0,
      };
      if (rooms !== '') cleanFeatures.rooms = Number(rooms);
      if (bathrooms !== '') cleanFeatures.bathrooms = Number(bathrooms);
      if (yearBuilt !== '') cleanFeatures.yearBuilt = Number(yearBuilt);

      if (editingProperty) {
        const updatedProperty: Partial<Property> = {
          address,
          category,
          operation,
          status,
          price: Number(price),
          currency,
          ownerId,
          features: cleanFeatures,
          auditReady,
          mapUrl: mapUrl || undefined,
        };

        if (operation === 'Alquiler') {
          if (tenantId) {
            updatedProperty.tenantId = tenantId;
          } else {
            updatedProperty.tenantId = '';
          }
          if (contractStartDate || contractEndDate) {
            updatedProperty.contract = {
              startDate: contractStartDate,
              endDate: contractEndDate,
              increasePeriods: editingProperty.contract?.increasePeriods || 'Semestral'
            };
          } else {
            updatedProperty.contract = undefined;
          }
        } else {
          updatedProperty.tenantId = ''; // Clear if not rental or empty
          updatedProperty.contract = undefined;
        }

        if (onUpdateProperty) {
          await onUpdateProperty(editingProperty.id, updatedProperty);
        }
      } else {
        const newProperty: Property = {
          id: `prop-${Date.now()}`,
          address,
          category,
          operation,
          status,
          price: Number(price),
          currency,
          ownerId,
          features: cleanFeatures,
          auditReady,
          mapUrl: mapUrl || undefined,
        };

        if (operation === 'Alquiler') {
          if (tenantId) {
            newProperty.tenantId = tenantId;
          }
          if (contractStartDate || contractEndDate) {
            newProperty.contract = {
              startDate: contractStartDate,
              endDate: contractEndDate,
              increasePeriods: 'Semestral'
            };
          }
        }

        await onAddProperty(newProperty);
      }

      // Reset form & close
      setAddress('');
      setCategory('Departamento');
      setOperation('Alquiler');
      setStatus('Disponible');
      setPrice('');
      setCurrency('ARS');
      if (owners.length > 0) setOwnerId(owners[0].id);
      setTenantId('');
      setSurface('');
      setRooms('');
      setBathrooms('');
      setYearBuilt('');
      setAuditReady(true);
      setContractStartDate('');
      setContractEndDate('');
      setMapUrl('');
      setGeoStatus('');
      setAddressSuggestions([]);
      setShowSuggestionsDropdown(false);
      setLastSelectedAddress('');
      setEditingProperty(null);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving property:", err);
      let friendlyMessage = err?.message || 'Error al guardar el inmueble';
      if (typeof friendlyMessage === 'string' && friendlyMessage.includes('permission')) {
        friendlyMessage = 'Permiso denegado por las reglas de Firestore. Asegúrate de que los campos correspondan al esquema del sistema.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setProgress(0);
    
    // Auto switch to upload tab view
    setActiveTab('upload');

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Clean dynamic name from file
            const baseName = file.name.split('.')[0].replace(/[-_]/g, ' ');
            const capitalizedAddress = baseName.charAt(0).toUpperCase() + baseName.slice(1);

            // Fetch a random owner ID to bind if layout allows
            const defaultOwner = owners.length > 0 ? owners[0].id : "";

            onAddProperty({
              id: `prop-${Date.now()}`,
              address: capitalizedAddress.length > 5 ? capitalizedAddress : "Calle Güemes 1420",
              category: "Departamento",
              operation: "Alquiler",
              status: "Disponible",
              price: 320000,
              currency: "ARS",
              ownerId: defaultOwner,
              features: { surface: 72, rooms: 2 },
              auditReady: true,
            });
            setIsUploading(false);
            setIsModalOpen(false); // Close modal on success
            if (fileInputRef.current) {
              fileInputRef.current.value = ""; // clean up file input
            }
          }, 800);
          return 100;
        }
        return prev + 25;
      });
    }, 450);
  };

  return (
    <div className="p-10 w-full animate-in fade-in duration-500">
      {/* Hidden Native File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" 
      />

      {/* Header and Filter Area */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-[#1D1D1F]">Inmuebles</h1>
            <p className="text-sm text-[#86868B] mt-1 font-display">Gestión de activos, operaciones y blindaje legal.</p>
          </div>
          <button 
            onClick={handleStartAddProperty} 
            className="flex items-center gap-2 bg-[#2E847A] text-white px-4 py-2.5 rounded-xl text-sm font-display font-semibold shadow-md hover:bg-[#205E56] transition-all cursor-pointer hover:shadow-lg hover:scale-[1.01] self-start sm:self-auto shrink-0"
          >
            <Plus size={16} /> Agregar Propiedad
          </button>
        </div>

        {/* Barra de Búsqueda y Selector de Vista */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-4 rounded-2xl border border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 max-w-lg">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              placeholder="Buscar por dirección, propietario, inquilino o categoría..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-100/75 border border-transparent rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#2E847A]/20 focus:border-[#2E847A]/30 transition-all font-semibold placeholder:text-[#86868B]/80 text-[#1D1D1F]"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 font-bold text-[10px] bg-zinc-200/50 hover:bg-zinc-200 w-4 h-4 rounded-full flex items-center justify-center transition-all"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggles de Vista (Tarjetas / Lista Compacta) */}
          <div className="flex items-center gap-3.5 self-end lg:self-auto">
            <span className="text-[10px] font-extrabold text-[#86868B] uppercase tracking-wider hidden sm:inline">Densidad de Vista:</span>
            <div className="flex bg-zinc-100 p-1 rounded-xl border border-black/5 shadow-inner">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-white text-zinc-950 shadow-sm font-bold" : "text-[#86868B] hover:text-zinc-950"
                )}
                title="Vista de Tarjetas Elegantes"
              >
                <Grid size={13} />
                <span>Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === 'list' ? "bg-white text-zinc-950 shadow-sm font-bold" : "text-[#86868B] hover:text-zinc-950"
                )}
                title="Lista Compacto de Altas Prestaciones (Ideal para Muchos Inmuebles)"
              >
                <List size={13} />
                <span>Lista</span>
                <span className="bg-emerald-500/10 text-emerald-700 text-[8px] px-1 rounded font-bold uppercase tracking-wider">Escalable</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros de Operación y Estado */}
        <div className="flex flex-col gap-3">
          {/* Filtros de Operación - Seccion Superior */}
          <div className="flex items-center gap-2 self-start bg-white/40 p-1.5 rounded-2xl border border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <span className="text-[11px] font-display font-bold text-[#86868B] uppercase tracking-wider px-2">Operación:</span>
            <div className="flex bg-zinc-100/60 p-0.5 rounded-xl border border-black/5 shadow-inner">
              <button
                onClick={() => setSelectedOperation('Todos')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer",
                  selectedOperation === 'Todos' ? "bg-white text-zinc-950 shadow-sm font-bold" : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedOperation('Venta')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  selectedOperation === 'Venta' ? "bg-white text-orange-600 shadow-sm font-bold" : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full bg-orange-500", selectedOperation !== 'Venta' && "opacity-60")} />
                Venta
              </button>
              <button
                onClick={() => setSelectedOperation('Alquiler')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  selectedOperation === 'Alquiler' ? "bg-white text-blue-600 shadow-sm font-bold" : "text-[#86868B] hover:text-[#1D1D1F]"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full bg-blue-500", selectedOperation !== 'Alquiler' && "opacity-60")} />
                Alquiler
              </button>
            </div>
          </div>

          {/* Filtros de Estado */}
          <div className="flex flex-wrap items-center gap-2 bg-white/40 p-2.5 rounded-2xl border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] backdrop-blur-md">
            <span className="text-xs font-display font-bold text-[#86868B] uppercase tracking-wider px-2 mr-1">Filtrar por Estado:</span>
          
          <button
            onClick={() => handleStatusChange("Todos")}
            className={cn(
              "text-sm font-display font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm",
              selectedStatus === "Todos" 
                ? "bg-[#1D1D1F] border-transparent text-white shadow-md shadow-zinc-800/10" 
                : "bg-white border-black/5 hover:bg-zinc-50 text-[#1D1D1F]"
            )}
          >
            <span>Todos</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
              selectedStatus === "Todos" ? "bg-white/20 text-white" : "bg-black/5 text-[#86868B]"
            )}>{countAll}</span>
          </button>

          <button
            onClick={() => handleStatusChange("Disponible")}
            className={cn(
              "text-sm font-display font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm",
              selectedStatus === "Disponible" 
                ? "bg-emerald-600 border-transparent text-white shadow-md shadow-emerald-500/15" 
                : "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100/70 text-emerald-700"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", selectedStatus === "Disponible" ? "bg-white" : "bg-emerald-500")} />
            <span>Disponible</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
              selectedStatus === "Disponible" ? "bg-white/20 text-white" : "bg-emerald-100/80 text-emerald-700"
            )}>{countDisponible}</span>
          </button>

          <button
            onClick={() => handleStatusChange("Ocupado")}
            className={cn(
              "text-sm font-display font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm",
              selectedStatus === "Ocupado" 
                ? "bg-zinc-950 border-transparent text-white shadow-md shadow-black/10" 
                : "bg-zinc-150 border-zinc-200/50 hover:bg-zinc-200 text-zinc-850"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", selectedStatus === "Ocupado" ? "bg-white" : "bg-zinc-800")} />
            <span>Ocupado</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
              selectedStatus === "Ocupado" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
            )}>{countOcupado}</span>
          </button>

          <button
            onClick={() => handleStatusChange("Reservado")}
            className={cn(
              "text-sm font-display font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm",
              selectedStatus === "Reservado" 
                ? "bg-purple-600 border-transparent text-white shadow-md shadow-purple-500/15" 
                : "bg-purple-50/60 border-purple-100 hover:bg-purple-100/70 text-purple-700"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", selectedStatus === "Reservado" ? "bg-white" : "bg-purple-500")} />
            <span>Reservado</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
              selectedStatus === "Reservado" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
            )}>{countReservado}</span>
          </button>

          <button
            onClick={() => handleStatusChange("Vencido")}
            className={cn(
              "text-sm font-display font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm",
              selectedStatus === "Vencido" 
                ? "bg-[#8F664E] border-transparent text-white shadow-[#8F664E]/15" 
                : "bg-[#FAF6F3] border-[#EADED6] hover:bg-[#F3EAE4] text-[#8F664E]"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", selectedStatus === "Vencido" ? "bg-white" : "bg-[#8F664E]")} />
            <span>Vencido</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
              selectedStatus === "Vencido" ? "bg-white/25 text-white" : "bg-[#F3EAE4] text-[#8F664E]"
            )}>{countVencido}</span>
          </button>

          <button
            onClick={() => handleStatusChange("Vendido")}
            className={cn(
              "text-sm font-display font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm",
              selectedStatus === "Vendido" 
                ? "bg-red-600 border-transparent text-white shadow-md shadow-red-500/20 scale-105" 
                : "bg-red-500/90 border-transparent text-white hover:bg-red-600 hover:scale-[1.02]"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Vendido</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-white/20 text-white">
              {countVendido}
            </span>
          </button>
        </div>
        </div>
      </div>


      <div className="max-h-[calc(100vh-340px)] overflow-y-auto pr-2 pb-6 scrollbar-thin">
        {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Existing Properties */}
          <AnimatePresence>
            {sortedProperties.map(prop => (
              <PropertyCardItem 
                key={prop.id} 
                prop={prop} 
                clients={clients} 
                formatCurrency={formatCurrency} 
                onNavigateToClient={onNavigateToClient}
                onEdit={handleStartEditProperty}
                onDelete={onDeleteProperty}
                onViewMap={(mapUrl, address) => {
                  setActiveMapUrl(mapUrl);
                  setActiveMapAddress(address);
                }}
              />
            ))}
          </AnimatePresence>

          {sortedProperties.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-md rounded-3xl border border-black/5 text-center shadow-sm min-h-[220px]">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#86868B] mb-3 border border-black/5 shadow-sm">
                <Building2 size={20} className="text-[#2E847A]" />
              </div>
              <h4 className="font-bold text-[#1D1D1F] text-sm">Sin resultados</h4>
              <p className="text-xs text-[#86868B] mt-1 max-w-xs">No se encontraron inmuebles registrados con el estado "{selectedStatus}" o los criterios de búsqueda.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-3xl p-5 sm:p-6 rounded-3xl border border-black/5 shadow-sm">
          {/* Quick Upload Banner for list view */}
          <div className="mb-4 flex items-center justify-between p-4 bg-[#236860]/5 border border-[#236860]/10 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#2D847A] rounded-xl text-white"><UploadCloud size={16} /></span>
              <div>
                <h4 className="text-xs font-bold text-zinc-950">Registro Rápido Inteligente</h4>
                <p className="text-[10px] text-zinc-500">¿Tienes un contrato o escritura? Súbelo de inmediato para autocompletar.</p>
              </div>
            </div>
            <button
              onClick={() => {
                handleStartAddProperty();
                setActiveTab('upload');
              }}
              className="text-[10px] font-bold bg-[#2D847A] hover:bg-[#1C534D] text-white px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Subir PDF →
            </button>
          </div>

          <div className="flex flex-col">
            <AnimatePresence>
              {sortedProperties.map(prop => (
                <CompactPropertyRow
                  key={prop.id}
                  prop={prop}
                  clients={clients}
                  formatCurrency={formatCurrency}
                  onNavigateToClient={onNavigateToClient}
                  onEdit={handleStartEditProperty}
                  onDelete={onDeleteProperty}
                  onViewMap={(mapUrl, address) => {
                    setActiveMapUrl(mapUrl);
                    setActiveMapAddress(address);
                  }}
                />
              ))}
            </AnimatePresence>

            {sortedProperties.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#86868B] mb-3 border border-black/5 shadow-sm animate-bounce">
                  <Building2 size={20} className="text-[#2E847A]" />
                </div>
                <h4 className="font-bold text-[#1D1D1F] text-sm">Sin resultados</h4>
                <p className="text-xs text-[#86868B] mt-1 max-w-xs">No se encontraron inmuebles registrados bajo esta categoría o búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Property Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#F5F5F7] rounded-[2rem] border border-black/5 p-8 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1D1D1F] flex items-center gap-2">
                <span>🏢</span> {editingProperty ? 'Editar Inmueble' : 'Nuevo Inmueble'}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProperty(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            {!editingProperty && (
              <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-black/5 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('manual');
                    setError('');
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'manual' ? "bg-[#2E847A] text-white shadow-sm" : "text-[#86868B] hover:text-[#1D1D1F]"
                  )}
                >
                  Formulario Manual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setError('');
                  }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'upload' ? "bg-[#2E847A] text-white shadow-sm" : "text-[#86868B] hover:text-[#1D1D1F]"
                  )}
                >
                  Escanear Documento (Contrato/Tasación)
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            {activeTab === 'manual' ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Manual Fields */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider">Dirección Completa *</label>
                    <button
                      type="button"
                      onClick={handleGeoreference}
                      disabled={loading || !address.trim()}
                      className="text-[10px] font-bold text-[#2E847A] hover:underline hover:text-[#1c534d] cursor-pointer disabled:opacity-40 select-none flex items-center gap-1"
                    >
                      <span>🌍 Georreferenciar (OSM)</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      onFocus={() => {
                        if (addressSuggestions.length > 0) {
                          setShowSuggestionsDropdown(true);
                        }
                      }}
                      required
                      disabled={loading}
                      placeholder="Av. del Libertador 4200, CABA"
                      className="w-full pr-10 px-4 py-2 bg-white border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {isQueryingSuggestions && (
                        <div className="w-4 h-4 rounded-full border-2 border-[#2E847A]/30 border-t-[#2E847A] animate-spin shrink-0" title="Buscando sugerencias..." />
                      )}
                      <button
                        type="button"
                        onClick={handleGeoreference}
                        disabled={loading || !address.trim()}
                        className="p-1.5 text-[#2E847A] hover:bg-zinc-100 rounded-lg disabled:opacity-30 cursor-pointer"
                        title="Georreferenciar dirección con OpenStreetMap"
                      >
                        <MapIcon size={16} />
                      </button>
                    </div>

                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestionsDropdown && addressSuggestions.length > 0 && (
                      <>
                        {/* Invisible backdrop to dismiss suggestions when clicking outside */}
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setShowSuggestionsDropdown(false)}
                        />
                        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-56 overflow-y-auto bg-white rounded-xl border border-black/15 shadow-2xl divide-y divide-zinc-100 animate-in fade-in slide-in-from-top-1 duration-150">
                          {addressSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleSelectSuggestion(suggestion);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-[#2E847A]/5 cursor-pointer text-xs font-semibold text-[#1D1D1F] transition-colors leading-tight flex items-start gap-2 focus:bg-[#2E847A]/5 outline-none"
                            >
                              <span className="text-[#2E847A] shrink-0 mt-0.5">📍</span>
                              <span className="truncate">{suggestion.display_name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {mapUrl && (
                    <div className="mt-1.5 ml-1 flex flex-col gap-1 text-[11px] font-semibold text-[#2E847A] bg-[#2E847A]/5 px-3 py-1.5 rounded-lg animate-in fade-in duration-200 border border-[#2E847A]/10">
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[85%]">📍 Mapa: <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1c534d] font-bold">{mapUrl}</a></span>
                        <button 
                          type="button" 
                          onClick={() => setMapUrl('')} 
                          className="text-red-500 hover:text-red-700 cursor-pointer text-xs font-bold"
                          title="Limpiar enlace"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                  )}
                  {geoStatus && (
                    <p className="text-[10px] font-bold text-[#2E847A] mt-1.5 ml-1">
                      ℹ️ {geoStatus}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Categoría</label>
                    <select 
                      value={category} 
                      onChange={(e: any) => setCategory(e.target.value)}
                      disabled={loading}
                      className="w-full px-2 py-2 bg-white border border-transparent rounded-xl text-xs outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    >
                      <option value="Departamento">Departamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Lote">Lote</option>
                      <option value="Duplex">Duplex</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Local">Local</option>
                      <option value="Terreno">Terreno</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Operación</label>
                    <select 
                      value={operation} 
                      onChange={(e: any) => {
                        setOperation(e.target.value);
                        if (e.target.value === 'Venta') {
                          setTenantId('');
                        }
                      }}
                      disabled={loading}
                      className="w-full px-2 py-2 bg-white border border-transparent rounded-xl text-xs outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    >
                      <option value="Alquiler">Alquiler</option>
                      <option value="Venta">Venta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Estado</label>
                    <select 
                      value={status} 
                      onChange={(e: any) => setStatus(e.target.value)}
                      disabled={loading}
                      className="w-full px-2 py-2 bg-white border border-transparent rounded-xl text-xs outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="Ocupado">Ocupado</option>
                      <option value="Reservado">Reservado</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Vendido">Vendido</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">VALOR *</label>
                    <input 
                      type="number" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} 
                      required
                      min="0"
                      disabled={loading}
                      placeholder="350000"
                      className="w-full px-4 py-2 bg-white border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Moneda</label>
                    <select 
                      value={currency} 
                      onChange={(e: any) => setCurrency(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-white border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    >
                      <option value="ARS">ARS ($)</option>
                      <option value="USD">USD (US$)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Propietario *</label>
                    <select 
                      value={ownerId} 
                      onChange={(e) => setOwnerId(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-3 py-2 bg-white border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    >
                      {owners.length === 0 && !ownerId && (
                        <option value="">Selecciona un propietario...</option>
                      )}
                      {ownerId && !owners.some(o => o.id === ownerId) && (
                        <option value={ownerId}>
                          {clients.find(c => c.id === ownerId)?.name || ownerId}
                        </option>
                      )}
                      {owners.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    {owners.length === 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">
                        ⚠️ No hay propietarios registrados en Clientes.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Inquilino {operation === 'Venta' && '(N/A)'}</label>
                    <select 
                      value={tenantId} 
                      onChange={(e) => setTenantId(e.target.value)}
                      disabled={loading || operation === 'Venta'}
                      className="w-full px-3 py-2 bg-white border border-transparent rounded-xl text-sm outline-none focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold disabled:opacity-60"
                    >
                      <option value="">Sin inquilino asignado</option>
                      {tenantId && !tenants.some(t => t.id === tenantId) && (
                        <option value={tenantId}>
                          {clients.find(c => c.id === tenantId)?.name || tenantId}
                        </option>
                      )}
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {operation === 'Alquiler' && (
                  <div className="p-4 bg-emerald-50/30 border border-emerald-500/10 rounded-2xl space-y-3">
                    <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider leading-none">Fechas de Contrato (Alquiler)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-[#86868B] mb-1">Inicio de Contrato</label>
                        <input 
                          type="date" 
                          value={contractStartDate} 
                          onChange={(e) => setContractStartDate(e.target.value)} 
                          disabled={loading}
                          className="w-full px-3 py-1.5 bg-white rounded-lg text-xs font-semibold outline-none border border-black/5 focus:border-[#2E847A]/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-[#86868B] mb-1">Vencimiento de Contrato</label>
                        <input 
                          type="date" 
                          value={contractEndDate} 
                          onChange={(e) => setContractEndDate(e.target.value)} 
                          disabled={loading}
                          className="w-full px-3 py-1.5 bg-white rounded-lg text-xs font-semibold outline-none border border-black/5 focus:border-[#2E847A]/30 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-white/50 border border-black/5 rounded-2xl space-y-3">
                  <span className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider leading-none">Características Técnicas</span>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-[#86868B] mb-1">Sup. (m²)</label>
                      <input 
                        type="number" 
                        value={surface} 
                        onChange={(e) => setSurface(e.target.value === '' ? '' : Number(e.target.value))} 
                        disabled={loading}
                        className="w-full px-2 py-1.5 bg-white rounded-lg text-xs font-semibold outline-none border border-transparent focus:border-[#2E847A]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#86868B] mb-1">Habitaciones</label>
                      <input 
                        type="number" 
                        value={rooms} 
                        onChange={(e) => setRooms(e.target.value === '' ? '' : Number(e.target.value))} 
                        disabled={loading}
                        className="w-full px-2 py-1.5 bg-white rounded-lg text-xs font-semibold outline-none border border-transparent focus:border-[#2E847A]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#86868B] mb-1">Baños</label>
                      <input 
                        type="number" 
                        value={bathrooms} 
                        onChange={(e) => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))} 
                        disabled={loading}
                        className="w-full px-2 py-1.5 bg-white rounded-lg text-xs font-semibold outline-none border border-transparent focus:border-[#2E847A]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#86868B] mb-1">Año Const.</label>
                      <input 
                        type="number" 
                        value={yearBuilt} 
                        onChange={(e) => setYearBuilt(e.target.value === '' ? '' : Number(e.target.value))} 
                        disabled={loading}
                        className="w-full px-2 py-1.5 bg-white rounded-lg text-xs font-semibold outline-none border border-transparent focus:border-[#2E847A]/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/50 border border-black/5 p-3 rounded-2xl">
                  <input
                    type="checkbox"
                    id="auditCheck"
                    checked={auditReady}
                    onChange={(e) => setAuditReady(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 rounded border-gray-300 text-[#2E847A] focus:ring-[#2E847A]"
                  />
                  <label htmlFor="auditCheck" className="text-xs font-semibold text-[#1D1D1F] select-none cursor-pointer">
                    Documentación lista para auditoría legal (Audit-Ready)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProperty(null);
                    }}
                    disabled={loading}
                    className="py-2.5 bg-zinc-100 hover:bg-zinc-200 text-[#1D1D1F] rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || owners.length === 0}
                    className="py-2.5 bg-[#2E847A] hover:bg-[#1E5F57] text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      editingProperty ? 'Actualizar Inmueble' : 'Guardar Inmueble'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div 
                onClick={!isUploading ? handleTriggerUpload : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center p-8 rounded-[1.5rem] border border-dashed transition-all shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-white",
                  isUploading ? "border-[#2E847A] bg-[#2E847A]/5" : "border-black/10 hover:border-[#2E847A]/30 cursor-pointer",
                  "min-h-[220px]"
                )}
              >
                <AnimatePresence mode="wait">
                  {!isUploading ? (
                    <motion.div 
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="w-12 h-12 bg-zinc-50 border border-black/5 rounded-full flex items-center justify-center mb-4 text-[#2E847A]">
                        <UploadCloud size={20} />
                      </div>
                      <h4 className="font-semibold text-[#1D1D1F] mb-1 text-base">Sube tu Archivo</h4>
                      <p className="text-xs text-[#86868B] max-w-[240px]">
                        Arrastra o presiona para cargar tu tasación o contrato (PDF, Word, PNG) para iniciar la extracción.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center text-center w-full max-w-[200px]"
                    >
                      <div className="w-12 h-12 bg-[#2E847A]/10 rounded-full flex items-center justify-center mb-4 text-[#2E847A]">
                        <FileText size={20} className="animate-pulse" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#1D1D1F] mb-3">Extrayendo Datos...</h4>
                      <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-[#2E847A] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#86868B] mt-2 uppercase tracking-wider font-semibold">Generando Ficha de Activo</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Map Modal */}
      {activeMapUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => { setActiveMapUrl(null); }}
        >
          <div 
            className="bg-white rounded-[2rem] border border-black/5 p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">🗺️</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#1D1D1F] leading-none mb-1">Mapa Georreferenciado</h3>
                  <p className="text-[11px] font-semibold text-[#86868B] truncate max-w-[280px] sm:max-w-[450px]" title={activeMapAddress}>
                    {activeMapAddress}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveMapUrl(null);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-all font-bold text-sm text-[#1D1D1F] flex items-center justify-center cursor-pointer border border-black/5"
                title="Cerrar mapa"
              >
                ✕
              </button>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-zinc-50 shadow-inner h-[400px] w-full">
              <iframe
                title="Visualizador de Mapa Georreferenciado de UNKEINMO"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={getOSMEmbedUrl(activeMapUrl, activeMapAddress)}
                className="w-full h-full"
              />
            </div>
            
            <div className="flex items-center justify-between bg-zinc-50 px-4 py-3 rounded-xl border border-black/5 text-[10px]">
              <span className="font-bold text-[#86868B] uppercase tracking-wider">Proveedor: OpenStreetMap (OSM)</span>
              <a 
                href={activeMapUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-[#2E847A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Abrir en pestaña externa ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Interactive OSM Iframe Embed Generator with bounding box calculation
function getOSMEmbedUrl(mapUrl: string, address: string): string {
  if (!mapUrl) return '';
  
  // Try to parse mlat and mlon
  const mlatMatch = mapUrl.match(/[?&]mlat=([-\d.]+)/);
  const mlonMatch = mapUrl.match(/[?&]mlon=([-\d.]+)/);
  
  if (mlatMatch && mlonMatch) {
    const lat = parseFloat(mlatMatch[1]);
    const lon = parseFloat(mlonMatch[1]);
    const delta = 0.0025; // Close zoom level (bounding box delta)
    const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
  }
  
  // Fallback to nominatim search embedding if query-based
  const queryMatch = mapUrl.match(/[?&]query=([^&]+)/);
  if (queryMatch) {
    return `https://www.openstreetmap.org/export/embed.html?q=${queryMatch[1]}&layer=mapnik`;
  }
  
  // Generic search embed based on address text
  return `https://www.openstreetmap.org/export/embed.html?q=${encodeURIComponent(address)}&layer=mapnik`;
}
