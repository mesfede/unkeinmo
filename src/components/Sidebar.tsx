import React from 'react';
import { LayoutDashboard, Building, Users, Calendar, LogOut, ShieldAlert, Sparkles, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  currentUser?: any;
  onLogout?: () => void;
  registeredAgents?: any[];
  userProfile?: any;
  onOpenSettings: () => void;
}

export function Sidebar({ 
  currentView, 
  onChangeView, 
  currentUser, 
  onLogout, 
  registeredAgents = [],
  userProfile,
  onOpenSettings
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'properties', label: 'Inmuebles', icon: Building },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
  ];

  const userAgencyName = userProfile?.agencyName || 'Unkeinmo';
  const isMesfedeAdmin = currentUser?.email?.toLowerCase() === 'mesfede@gmail.com' || 
                         currentUser?.email?.toLowerCase() === 'mesfede@unkeinmo.com' || 
                         userProfile?.email?.toLowerCase() === 'mesfede@gmail.com' || 
                         userProfile?.email?.toLowerCase() === 'mesfede@unkeinmo.com';

  return (
    <aside className="relative z-20 w-64 h-screen glass-sidebar flex flex-col pt-8 pb-3 shrink-0">
      <div className="px-7 mb-7">
        <div className="flex items-center gap-3">
          {userProfile?.logoUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-black/5 bg-white flex items-center justify-center shrink-0">
              <img 
                src={userProfile.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#2E847A] rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(46,132,122,0.25)] text-white font-bold text-xl leading-none font-display tracking-tight shrink-0">
              <span>{userAgencyName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-display font-bold text-lg tracking-tight text-[#1D1D1F] leading-none mb-1 truncate" title={userAgencyName}>
              {userAgencyName}
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#2E847A] uppercase leading-none font-display">by unke</span>
          </div>
        </div>
        
        <button
          onClick={onOpenSettings}
          className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-[#2E847A] hover:opacity-80 cursor-pointer transition-all uppercase tracking-wider"
          title="Personalizar Logo, Nombre de Inmobiliaria y Colores"
        >
          <Settings size={11} strokeWidth={2.5} />
          <span>Personalizar Marca</span>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-bold tracking-widest text-[#86868B] uppercase font-display">General</p>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={cn(
                "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[15px] font-display font-semibold tracking-wide transition-all duration-300 outline-none",
                isActive 
                  ? "bg-white shadow-sm text-[#2E847A] border border-white/80 animate-in fade-in zoom-in-95 duration-150 font-bold" 
                  : "text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/45 border border-transparent"
              )}
            >
              <Icon size={19} className={isActive ? "text-[#2E847A]" : "text-[#86868B]"} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}

        {/* Dynamic Registered Agents list (proof of multi-user database) */}
        {isMesfedeAdmin && registeredAgents.length > 0 && (
          <div className="pt-4 border-t border-black/5 px-3 space-y-2.5">
            <p className="text-[10px] font-bold tracking-widest text-[#86868B] uppercase flex items-center gap-1.5">
              <Users size={11} strokeWidth={2.5} />
              Agentes en DB ({registeredAgents.length})
            </p>
            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
              {registeredAgents.map((agent) => {
                const colors = [
                  'bg-teal-500', 'bg-blue-500', 'bg-emerald-500', 
                  'bg-indigo-500', 'bg-amber-500', 'bg-red-500'
                ];
                // simple deterministic color based on agent email or uid
                const idx = (agent.email?.length || 0) % colors.length;
                const activeColor = colors[idx];
                const isMe = agent.uid === currentUser?.uid;

                return (
                  <div key={agent.uid} className="flex items-center justify-between text-xs font-semibold px-2 py-1 bg-white/30 backdrop-blur-md rounded-lg border border-white/50 text-[#1D1D1F] truncate leading-none">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className={cn("w-5.5 h-5.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 uppercase", activeColor)}>
                        {agent.name?.charAt(0) || 'A'}
                      </div>
                      <span className="truncate max-w-[120px]" title={agent.email}>
                        {agent.name} {isMe && <span className="text-[9px] text-[#2E847A] font-bold">(tú)</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="px-5 mt-auto space-y-3">
        {/* Logged in User session info & logout button */}
        {currentUser && (
          <div className="p-3 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm flex items-center justify-between gap-2">
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-[#1D1D1F] truncate">{currentUser.displayName || currentUser.email?.split('@')[0]}</span>
              <span className="text-[9px] font-medium text-[#86868B] truncate">{currentUser.email}</span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
