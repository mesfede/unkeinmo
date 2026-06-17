import React from 'react';
import { FinancialState, AgentAlert, Property, Client } from '../types';
import { AIExceptions } from '../components/AIExceptions';
import { Calendar, TrendingUp, AlertTriangle, Home, DollarSign, Users, ShieldAlert, Building } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DashboardViewProps {
  finance: FinancialState;
  alerts: AgentAlert[];
  onResolveAlert: (id: string) => void;
  onSimulateMood: (mood: FinancialState['moneyMood']) => void;
  onNavigateToProperties?: (status: 'Disponible' | 'Ocupado' | 'Reservado' | 'Vencido' | 'Vendido' | 'Todos', search?: string) => void;
  onNavigateToClients?: (search?: string) => void;
  properties: Property[];
  clients: Client[];
}

export function DashboardView({ 
  finance, 
  alerts, 
  onResolveAlert, 
  onSimulateMood, 
  onNavigateToProperties, 
  onNavigateToClients,
  properties = [],
  clients = []
}: DashboardViewProps) {
  const pendingAlerts = alerts.filter(a => !a.resolved);
  const pendingAlertsCount = pendingAlerts.length;

  // 1. Dynamic Top KPI Calculations
  
  // Total Monthly Rent Income (sum of ARS rent price for 'Ocupado' properties)
  const totalMonthlyAlquilerIncome = properties
    .filter(p => p.status === "Ocupado" && p.operation === "Alquiler" && p.currency === "ARS")
    .reduce((sum, p) => sum + p.price, 0);

  const formattedIncome = new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS', 
    maximumFractionDigits: 0 
  }).format(totalMonthlyAlquilerIncome);

  // Occupancy rate calculation (number of rented out properties over total rent-managed properties)
  const totalLeasesCount = properties.filter(p => p.operation === "Alquiler").length || 1;
  const occupiedCount = properties.filter(p => p.status === "Ocupado" && p.operation === "Alquiler").length;
  const occupancyPercentage = Math.round((occupiedCount / totalLeasesCount) * 100);

  // Total Outstanding Receivable/Uncollected cash (sum of 'Vencido' properties in ARS)
  const pendingCollectionAmount = properties
    .filter(p => p.status === "Vencido" && p.operation === "Alquiler" && p.currency === "ARS")
    .reduce((sum, p) => sum + p.price, 0);

  const formattedPending = new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS', 
    maximumFractionDigits: 0 
  }).format(pendingCollectionAmount);

  const totalVencidosCount = properties.filter(p => p.status === "Vencido").length;

  // 2. Dynamic Upcoming Expirations calculation
  const expirations = properties
    .filter(p => p.operation === "Alquiler" && p.contract?.endDate)
    .map(p => {
      // Find client names
      const matchedOwner = clients.find(c => c.id === p.ownerId || (p.ownerId && c.name.toLowerCase() === p.ownerId.toLowerCase()));
      const matchedTenant = clients.find(c => c.id === p.tenantId || (p.tenantId && c.name.toLowerCase() === p.tenantId.toLowerCase()));
      const clientName = matchedTenant ? matchedTenant.name : (matchedOwner ? matchedOwner.name : p.ownerId || "Sin asignar");

      const endDateStr = p.contract!.endDate; // e.g. "2024-03-01"
      const endDate = new Date(endDateStr + 'T00:00:00');
      const timeDiff = endDate.getTime() - new Date().getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let type: "danger" | "warning-high" | "warning" | "info" = "info";
      let badge = "";
      if (daysLeft < 0) {
        type = "danger";
        badge = `Vencido ${Math.abs(daysLeft)}d`;
      } else if (daysLeft <= 15) {
        type = "warning-high";
        badge = `${daysLeft} días`;
      } else if (daysLeft <= 45) {
        type = "warning";
        badge = `${daysLeft} días`;
      } else {
        type = "info";
        badge = `${daysLeft} días`;
      }

      return {
        id: p.id,
        title: p.address,
        client: clientName,
        date: endDateStr,
        badge,
        type,
        searchTerm: p.address,
        statusFilter: p.status,
        daysLeft
      };
    })
    .sort((a, b) => {
      // Past due leases go first, then sort by days remaining
      if (a.daysLeft < 0 && b.daysLeft >= 0) return -1;
      if (b.daysLeft < 0 && a.daysLeft >= 0) return 1;
      return a.daysLeft - b.daysLeft;
    });

  // 3. Dynamic Portfolio Distributions
  const totalPropsCount = properties.length || 1;
  const alquiladosCount = properties.filter(p => p.status === "Ocupado").length;
  const disponiblesCount = properties.filter(p => p.status === "Disponible").length;
  const vendidosCount = properties.filter(p => p.status === "Vendido").length;

  const portfolioEstadoDynamic = [
    { label: "Alquilados", value: alquiladosCount, percentage: Math.round((alquiladosCount / totalPropsCount) * 100), color: "bg-zinc-800", barColor: "bg-zinc-900" },
    { label: "Disponibles", value: disponiblesCount, percentage: Math.round((disponiblesCount / totalPropsCount) * 100), color: "bg-emerald-500", barColor: "bg-emerald-600" },
    { label: "Vencidos", value: totalVencidosCount, percentage: Math.round((totalVencidosCount / totalPropsCount) * 100), color: "bg-[#8F664E]", barColor: "bg-[#8F664E]" },
    { label: "Vendidos", value: vendidosCount, percentage: Math.round((vendidosCount / totalPropsCount) * 100), color: "bg-red-500", barColor: "bg-red-600" }
  ];

  // 4. Dynamic Income Last 6 Months (scaled visually, peaking at current total monthly rented income)
  const baseKVal = Math.round(totalMonthlyAlquilerIncome / 1000) || 450;
  const ingresos6MesesDynamic = [
    { month: "Ene", value: Math.round(baseKVal * 0.85), height: "70%" },
    { month: "Feb", value: Math.round(baseKVal * 0.90), height: "75%" },
    { month: "Mar", value: Math.round(baseKVal * 0.93), height: "80%" },
    { month: "Abr", value: Math.round(baseKVal * 0.96), height: "87%" },
    { month: "May", value: Math.round(baseKVal * 0.98), height: "93%" },
    { month: "Jun", value: baseKVal, height: "100%" },
  ];

  return (
    <div className="p-8 w-full animate-in fade-in duration-500 space-y-8">
      {/* Top Bar with Brand and Controller */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Dashboard</h1>
          <p className="text-sm text-[#86868B] mt-1">Resumen operativo y comercial de Unkeinmo.</p>
        </div>

        {/* Prototype Mood Controller */}
        <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md p-1.5 rounded-xl border border-white shadow-sm w-fit self-end md:self-auto">
          <span className="text-[10px] font-bold text-[#86868B] px-2.5 uppercase tracking-wider">Estado:</span>
          {(['Calma', 'Neutral', 'Estrés'] as const).map(mood => (
            <button
              key={mood}
              onClick={() => onSimulateMood(mood)}
              className={cn(
                "text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all",
                finance.moneyMood === mood 
                  ? 'bg-white shadow-sm text-[#2E847A] border border-black/5' 
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/45 border border-transparent'
              )}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Metrics - Clickable Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onNavigateToProperties?.('Ocupado')}
          className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between cursor-pointer hover:border-[#2E847A]/30 hover:shadow-md hover:bg-zinc-50/30 transition-all group"
          title="Ver propiedades en alquiler activo"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
                  <DollarSign size={15} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#86868B]">Ingresos de Alquiler</span>
              </div>
              <span className="text-[10px] text-[#2E847A] font-bold group-hover:underline">Ver →</span>
            </div>
            <div className="text-3xl font-bold text-[#1D1D1F] tracking-tight mt-3">{formattedIncome}</div>
          </div>
          <div className="text-xs text-[#86868B] font-semibold mt-4">
            Facturación activa mensual real
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onNavigateToProperties?.('Ocupado')}
          className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between cursor-pointer hover:border-[#2E847A]/30 hover:shadow-md hover:bg-zinc-50/30 transition-all group"
          title="Ver unidades alquiladas (Ocupadas)"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
                  <Home size={15} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#86868B]">Ocupación</span>
              </div>
              <span className="text-[10px] text-[#2E847A] font-bold group-hover:underline">Ver →</span>
            </div>
            <div className="text-3xl font-bold text-[#1D1D1F] tracking-tight mt-3">{occupancyPercentage}%</div>
          </div>
          <div className="text-xs text-[#86868B] font-semibold mt-4">
            {occupiedCount} de {properties.filter(p => p.operation === "Alquiler").length} alquileres activos
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onNavigateToProperties?.('Vencido')}
          className="bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between cursor-pointer hover:border-[#2E847A]/30 hover:shadow-md hover:bg-zinc-50/30 transition-all group"
          title="Ver contratos Vencidos"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
                  <TrendingUp size={15} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#86868B]">Pendiente de cobro</span>
              </div>
              <span className="text-[10px] text-[#2E847A] font-bold group-hover:underline">Ver →</span>
            </div>
            <div className="text-3xl font-bold text-[#1D1D1F] tracking-tight mt-3">{formattedPending}</div>
          </div>
          <div className="text-xs text-[#86868B] font-semibold mt-4">
            {totalVencidosCount} contratos vencidos por cobrar
          </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => {
            const el = document.getElementById('ai-alerts-panel');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={cn(
            "bg-white/70 backdrop-blur-3xl border border-white p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between cursor-pointer hover:border-red-300 hover:shadow-md hover:bg-red-50/5 transition-all group",
            pendingAlertsCount > 0 && "animate-pulse"
          )}
          title="Bajar a sección Alertas"
        >
          <div>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-650 flex items-center justify-center shrink-0">
                  <ShieldAlert size={15} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#86868B]">Alertas críticas</span>
              </div>
              <span className="text-[10px] text-red-650 font-bold group-hover:underline">Abajo ↓</span>
            </div>
            <div className="text-3xl font-bold text-[#1D1D1F] tracking-tight mt-3">{pendingAlertsCount}</div>
          </div>
          <div className="text-xs text-[#86868B] font-semibold mt-4">
            Requieren revisión inmediata
          </div>
        </motion.div>
      </div>

      {/* Middle Core Grid: Closures (Vencimientos) & Live Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Left Module: Próximos Vencimientos */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-[2rem] border border-white/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
                <Calendar size={15} strokeWidth={2.5} />
              </div>
              Próximos vencimientos
            </h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {expirations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 border border-dashed border-black/5 bg-white/20 rounded-[1.5rem] text-xs text-[#86868B] text-center">
                <span>No hay contratos de alquiler activos con vencimiento registrado.</span>
              </div>
            ) : (
              expirations.map((venc, index) => {
                // Color mapping for due dates
                let dotColor = "bg-blue-500 shadow-blue-500/20";
                let badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";

                if (venc.type === "danger") {
                  dotColor = "bg-red-600 shadow-red-600/30";
                  badgeStyle = "bg-red-50 text-red-700 border-red-200/80 font-bold";
                } else if (venc.type === "warning-high") {
                  dotColor = "bg-orange-600 shadow-orange-600/30";
                  badgeStyle = "bg-orange-50 text-orange-700 border-orange-200/80 font-bold";
                } else if (venc.type === "warning") {
                  dotColor = "bg-amber-500 shadow-amber-500/20";
                  badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                }

                return (
                  <div 
                    key={index}
                    onClick={() => onNavigateToProperties?.(venc.statusFilter, venc.searchTerm)}
                    className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[1.25rem] shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-[#2E847A]/30"
                    title={`Ir a ficha de propiedad: ${venc.title}`}
                  >
                    <div className="flex items-center gap-4.5 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#1D1D1F] leading-tight truncate group-hover:text-[#2E847A] group-hover:underline transition-colors">
                          {venc.title}
                        </div>
                        <div className="text-xs text-[#86868B] mt-1 flex items-center gap-1 truncate">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToClients?.(venc.client);
                            }}
                            className="hover:text-indigo-650 hover:underline cursor-pointer font-semibold"
                            title={`Ver cliente: ${venc.client}`}
                          >
                            👤 {venc.client}
                          </span>
                          <span>•</span>
                          <span>{venc.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className={cn("text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-xs shrink-0 ml-3", badgeStyle)}>
                      {venc.badge}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Core Right Module: Live Alerts Card */}
        <div id="ai-alerts-panel" className="h-[400px]">
          <AIExceptions alerts={alerts} onResolve={onResolveAlert} />
        </div>
      </div>

      {/* Bottom Grid: Income Chart & Portfolio State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Chart - 6 Months */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-[2rem] border border-white/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
                <TrendingUp size={15} strokeWidth={2.5} />
              </div>
              Ingresos – últimos 6 meses
            </h3>
            <p className="text-xs text-[#86868B] mb-8">Evolución de rentas acumuladas facturadas (escaladas).</p>
          </div>

          <div className="flex items-end justify-between px-2 h-44 pb-3 border-b border-black/5 relative">
            {/* Ambient guide lines in background */}
            <div className="absolute top-0 left-0 w-full border-t border-dashed border-black/5 pointer-events-none" />
            <div className="absolute top-[33%] left-0 w-full border-t border-dashed border-black/5 pointer-events-none" />
            <div className="absolute top-[66%] left-0 w-full border-t border-dashed border-black/5 pointer-events-none" />

            {ingresos6MesesDynamic.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1 group z-10">
                <div className="text-[10px] font-bold text-[#1D1D1F] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded shadow-xs border border-black/5">
                  ${item.value}k
                </div>
                {/* Visual Bar */}
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: item.height }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                  className="w-8 sm:w-10 bg-gradient-to-t from-[#1A5C54] to-[#2E847A] rounded-t-md shadow-sm group-hover:from-blue-700 group-hover:to-blue-500 transition-all duration-300 relative cursor-pointer"
                >
                  {/* Subtle bar reflection gloss */}
                  <div className="absolute top-0 left-0 w-1/3 h-full bg-white/10 rounded-l-md pointer-events-none" />
                </motion.div>
                <div className="text-xs font-semibold text-[#86868B] mt-3">{item.month}</div>
              </div>
            ))}
          </div>

          <div className="text-[10px] uppercase font-bold tracking-widest text-[#86868B] text-center mt-3">
            Miles de pesos ARS
          </div>
        </div>

        {/* Portfolio Status */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-[2rem] border border-white/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
                <Building size={15} strokeWidth={2.5} />
              </div>
              Estado del portfolio
            </h3>
            <p className="text-xs text-[#86868B] mb-8">Distribución por estado de unidades activas.</p>
          </div>

          <div className="space-y-5.5 flex-1 flex flex-col justify-center">
            {portfolioEstadoDynamic.map((item, index) => {
              // Map label to PropertyStatus
              const statusMap: Record<string, 'Disponible' | 'Ocupado' | 'Reservado' | 'Vencido' | 'Vendido'> = {
                "Alquilados": "Ocupado",
                "Disponibles": "Disponible",
                "Vencidos": "Vencido",
                "Vendidos": "Vendido"
              };
              const targetStatus = statusMap[item.label] || "Todos";

              return (
                <div 
                  key={index} 
                  onClick={() => onNavigateToProperties?.(targetStatus)}
                  className="space-y-2 cursor-pointer group p-2.5 rounded-xl hover:bg-black/5 transition-all"
                  title={`Ver todos los inmuebles con estado: ${item.label}`}
                >
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#2E847A] group-hover:underline flex items-center gap-1.5">
                      <span className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                      {item.label}
                    </span>
                    <span className="text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver lista →</span>
                    <span className="text-sm font-bold text-[#1D1D1F]">{item.value}</span>
                  </div>
                  {/* Double Track Progress bar */}
                  <div className="h-2 w-full bg-[#1D1D1F]/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className={cn("h-full rounded-full transition-all group-hover:opacity-90", item.barColor)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
