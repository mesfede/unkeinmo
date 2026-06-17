import React from 'react';
import { FinancialState } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { TrendingUp, Activity, AlertTriangle, ArrowRight } from 'lucide-react';

interface MoneyMoodCardProps {
  finance: FinancialState;
}

export function MoneyMoodCard({ finance }: MoneyMoodCardProps) {
  const isCalm = finance.moneyMood === "Calma";
  const isNeutral = finance.moneyMood === "Neutral";
  const isStress = finance.moneyMood === "Estrés";

  const formatARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-[2rem] glass-panel p-8 transition-colors duration-700",
        isCalm ? "bg-emerald-50/40" : "",
        isNeutral ? "bg-blue-50/40" : "",
        isStress ? "bg-amber-50/40" : ""
      )}
    >
      {/* Ambient glowing effect inside card */}
      <div 
        className={cn(
          "absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-60 transition-colors duration-700 pointer-events-none mix-blend-multiply",
          isCalm ? "bg-emerald-300/40" : "",
          isNeutral ? "bg-blue-300/40" : "",
          isStress ? "bg-amber-400/40" : ""
        )}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-base font-semibold tracking-tight text-[#86868B]">Inteligencia Financiera (ARS)</h2>
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/50 shadow-sm transition-all",
            isCalm ? "bg-emerald-100/60 text-emerald-800" : "",
            isNeutral ? "bg-blue-100/60 text-blue-800" : "",
            isStress ? "bg-amber-100/60 text-amber-800" : ""
          )}>
            {isCalm && <Activity size={14} />}
            {isNeutral && <TrendingUp size={14} />}
            {isStress && <AlertTriangle size={14} />}
            <span>Estado: {finance.moneyMood}</span>
          </div>
        </div>

        <div>
          <div className="flex items-end gap-4 mb-2">
            <span className="text-5xl font-semibold tracking-tighter text-[#1D1D1F]">
              {formatARS(finance.cashFlowARS)}
            </span>
            <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-lg mb-1.5 backdrop-blur-sm border border-emerald-200/50">
              <TrendingUp size={14} />+4.2%
            </div>
          </div>
          <p className="text-sm font-medium text-[#86868B] mb-8">Ingresos Netos del Mes</p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-black/5">
            <div>
              <p className="text-xs font-medium text-[#86868B] mb-1.5">Proyección Mensual</p>
              <p className="font-semibold text-sm text-[#1D1D1F]">
                {formatARS(finance.expectedRevenueARS)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] mb-1.5">Capital Pendiente de Cobro</p>
              <p className={cn(
                "font-semibold text-sm flex items-center gap-2",
                finance.pendingUnreconciledARS > 0 ? "text-amber-600" : "text-[#1D1D1F]"
              )}>
                {formatARS(finance.pendingUnreconciledARS)}
                {finance.pendingUnreconciledARS > 0 && (
                  <button className="bg-amber-100/50 hover:bg-amber-200/50 text-amber-700 rounded-full p-1 transition-colors">
                    <ArrowRight size={14} />
                  </button>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
