import React from 'react';
import { CheckCircle2, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentAlert } from '../types';
import { cn } from '../lib/utils';

interface AIExceptionsProps {
  alerts: AgentAlert[];
  onResolve: (id: string) => void;
}

export function AIExceptions({ alerts, onResolve }: AIExceptionsProps) {
  const pendingAlerts = alerts.filter(a => !a.resolved);

  // Helper to resolve level styling
  const getLevelStyle = (level: string) => {
    switch (level) {
      case "Urgente":
        return {
          dot: "bg-red-500 shadow-red-500/30",
          badge: "bg-red-50 text-red-700 border-red-200/60"
        };
      case "Alerta":
        return {
          dot: "bg-amber-500 shadow-amber-500/30",
          badge: "bg-amber-50 text-amber-700 border-amber-200/60"
        };
      case "Pendiente":
        return {
          dot: "bg-yellow-500 shadow-yellow-500/30",
          badge: "bg-yellow-50 text-yellow-700 border-yellow-200/60"
        };
      case "Aviso":
      default:
        return {
          dot: "bg-blue-500 shadow-blue-500/30",
          badge: "bg-blue-50 text-blue-700 border-blue-200/60"
        };
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white/60 backdrop-blur-3xl rounded-[2rem] border border-white/80 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h3 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2E847A]/10 text-[#2E847A] flex items-center justify-center shrink-0">
            <AlertTriangle size={15} strokeWidth={2.5} />
          </div>
          Alertas activas
        </h3>
        <span className="text-xs font-semibold px-3 py-1.5 bg-white border border-black/5 rounded-lg text-[#1D1D1F] shadow-sm">
          {pendingAlerts.length} alarmas
        </span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {pendingAlerts.length === 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-[220px] p-6 border border-dashed border-black/5 bg-white/20 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-[#86868B]"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
                <CheckCircle2 size={24} />
              </div>
              <span className="text-sm font-semibold">Todo al día. No hay alertas pendientes.</span>
            </motion.div>
          ) : (
            pendingAlerts.map(alert => {
              const style = getLevelStyle(alert.level);
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[1.25rem] p-4 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    {/* Status Dot */}
                    <div className="mt-2 shrink-0">
                      <div className={cn("w-2.5 h-2.5 rounded-full shadow-md", style.dot)} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-[#1D1D1F] leading-snug">{alert.title}</h4>
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0", style.badge)}>
                          {alert.level}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                      
                      {alert.actionRequired && (
                        <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-black/5 pt-3">
                          <button
                            onClick={() => onResolve(alert.id)}
                            className="text-[10px] font-bold text-[#2E847A] bg-[#2E847A]/5 hover:bg-[#2E847A]/10 border border-[#2E847A]/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                          >
                            {alert.actionRequired}
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      )}
                      {!alert.actionRequired && (
                        <div className="mt-3.5 flex justify-end border-t border-black/5 pt-3">
                          <button
                            onClick={() => onResolve(alert.id)}
                            className="text-[10px] font-bold text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                          >
                            Descartar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
