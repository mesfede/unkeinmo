import React, { useMemo } from 'react';
import { Visit, Property, Client } from '../types';
import { eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CalendarViewProps {
  visits: Visit[];
  properties: Property[];
  clients: Client[];
}

export function CalendarView({ visits, properties, clients }: CalendarViewProps) {
  const today = new Date();
  
  // Create a 7-day view starting from today
  const days = useMemo(() => {
    const start = today;
    const end = new Date(today);
    end.setDate(today.getDate() + 6);
    return eachDayOfInterval({ start, end });
  }, [today]);

  const getVisitsForDay = (date: Date) => {
    return visits.filter(v => isSameDay(new Date(v.date), date));
  };

  return (
    <div className="p-10 w-full animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-[#1D1D1F]">Calendario & Visitas</h1>
          <p className="text-base font-display text-[#86868B] mt-1">Sincronización operativa para ventas y alquileres.</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-3xl flex flex-col border border-white/80 rounded-[1.5rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-1">
        {/* Header Days */}
        <div className="grid grid-cols-7 border-b border-black/5 bg-white/40 backdrop-blur-md rounded-t-[1.3rem]">
          {days.map((day, idx) => (
            <div key={idx} className="p-4 text-center border-r border-black/5 last:border-r-0">
              <p className="text-[11px] font-bold text-[#86868B] uppercase tracking-widest mb-2">
                {format(day, 'EEE', { locale: es })}
              </p>
              <div className={cn(
                "w-10 h-10 mx-auto flex items-center justify-center rounded-full text-base font-semibold transition-colors",
                isToday(day) ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-[#1D1D1F]"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-7 min-h-[500px] bg-white/30 backdrop-blur-sm rounded-b-[1.3rem]">
          {days.map((day, idx) => {
            const dayVisits = getVisitsForDay(day);
            return (
              <div key={idx} className="p-4 border-r border-black/5 last:border-r-0">
                <div className="space-y-4">
                  {dayVisits.map((visit) => {
                    const prop = properties.find(p => p.id === visit.propertyId);
                    const client = clients.find(c => c.id === visit.clientId);
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={visit.id} 
                        className="bg-white/80 backdrop-blur-xl border border-white/80 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm",
                            visit.status === "Completada" ? "bg-zinc-100 text-zinc-500" : "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            {visit.status}
                          </div>
                          <div className="text-[11px] uppercase font-bold tracking-wider text-[#1D1D1F]">
                            {format(new Date(visit.date), 'HH:mm')}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[#1D1D1F] leading-tight line-clamp-2" title={prop?.address}>
                          {prop?.address}
                        </p>
                        <p className="text-xs font-medium text-[#86868B] mt-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1D1D1F]/20"></span>
                          {client?.name}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
