import React, { useState, useMemo, useEffect } from 'react';
import { Visit, Property, Client } from '../types';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  addDays,
  subDays,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Pencil, 
  Clock, 
  User, 
  Building, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  FileText, 
  Check, 
  Search, 
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import { addVisitToFirebase, updateVisitInFirebase, deleteVisitFromFirebase } from '../lib/dbService';

interface CalendarViewProps {
  visits: Visit[];
  properties: Property[];
  clients: Client[];
  agentId?: string;
}

export function CalendarView({ visits, properties, clients, agentId }: CalendarViewProps) {
  const [viewType, setViewType] = useState<'mensual' | 'semanal'>('mensual');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Visit | null>(null);
  const [selectedDeadline, setSelectedDeadline] = useState<{ property: Property, date: Date } | null>(null);
  
  // Create / Edit Form State
  const [formType, setFormType] = useState<"Visita" | "Firma de Contrato" | "Reunión" | "Llamada" | "Tasación" | "Otro">("Visita");
  const [formTitle, setFormTitle] = useState('');
  const [formPropertyId, setFormPropertyId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');
  const [formStatus, setFormStatus] = useState<"Pendiente" | "Completada" | "Cancelada">("Pendiente");
  const [formNotes, setFormNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Normalize parsed visit date
  const parseVisitDate = (d: Date | string): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return d;
    try {
      return parseISO(d);
    } catch {
      return new Date(d);
    }
  };

  // Generate 42-day Month Grid starting on Monday
  const monthDays = useMemo(() => {
    const startM = startOfMonth(currentDate);
    const endM = endOfMonth(currentDate);
    const startGrid = startOfWeek(startM, { weekStartsOn: 1 });
    const endGrid = endOfWeek(endM, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startGrid, end: endGrid });
  }, [currentDate]);

  // Generate 7-day Week Grid starting on Monday of the current date week
  const weekDays = useMemo(() => {
    const startGrid = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endGrid = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startGrid, end: endGrid });
  }, [currentDate]);

  const activeDays = viewType === 'mensual' ? monthDays : weekDays;

  // Extract lease contract deadlines from properties
  const deadlines = useMemo(() => {
    const list: Array<{ id: string; property: Property; date: Date }> = [];
    properties.forEach(p => {
      if (p.contract?.endDate) {
        try {
          // Parse string date like YYYY-MM-DD
          const [year, month, day] = p.contract.endDate.split('-').map(Number);
          const d = new Date(year, month - 1, day);
          list.push({
            id: `deadline-${p.id}`,
            property: p,
            date: d
          });
        } catch (e) {
          console.error("Error parsing contract endDate: ", p.contract.endDate, e);
        }
      }
    });
    return list;
  }, [properties]);

  // Navigation helpers
  const handlePrev = () => {
    setCurrentDate(prev => viewType === 'mensual' ? subMonths(prev, 1) : subWeeks(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewType === 'mensual' ? addMonths(prev, 1) : addWeeks(prev, 1));
  };

  const handleToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDay(t);
  };

  // Match activities (visits) for a specific day
  const getActivitiesForDay = (day: Date) => {
    return visits.filter(v => {
      const vDate = parseVisitDate(v.date);
      return isSameDay(vDate, day);
    });
  };

  // Match deadlines (vencimiento contrato) for a specific day
  const getDeadlinesForDay = (day: Date) => {
    return deadlines.filter(d => isSameDay(d.date, day));
  };

  // Filter both activities and deadlines according to search and selected category filter
  const filterDayItems = (day: Date) => {
    const dayActs = getActivitiesForDay(day);
    const dayDeadlines = getDeadlinesForDay(day);

    const filteredActs = dayActs.filter(act => {
      const p = properties.find(prop => prop.id === act.propertyId);
      const c = clients.find(cl => cl.id === act.clientId);
      const title = act.title || act.type || 'Visita';
      const notes = act.notes || '';
      const address = p?.address || '';
      const clientName = c?.name || '';

      const matchesSearch = 
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase());

      const actType = act.type || 'Visita';
      const matchesType = typeFilter === 'all' || 
        (typeFilter === 'visitas' && actType === 'Visita') ||
        (typeFilter === 'firmas' && actType === 'Firma de Contrato') ||
        (typeFilter === 'reuniones' && actType === 'Reunión') ||
        (typeFilter === 'llamadas' && actType === 'Llamada') ||
        (typeFilter === 'tasaciones' && actType === 'Tasación') ||
        (typeFilter === 'otros' && actType === 'Otro');

      return matchesSearch && matchesType;
    });

    const filteredDeadlines = dayDeadlines.filter(dl => {
      const matchesSearch = dl.property.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            "vencimiento contrato".includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || typeFilter === 'vencimientos';
      return matchesSearch && matchesType;
    });

    return { activities: filteredActs, deadlines: filteredDeadlines };
  };

  // Quick activity styling mapper
  const getActivityTypeStyles = (type?: string) => {
    const t = type || 'Visita';
    switch (t) {
      case 'Firma de Contrato':
        return {
          bg: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/70',
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
          label: 'Firma de Contrato'
        };
      case 'Reunión':
        return {
          bg: 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100/70',
          dot: 'bg-purple-500',
          badge: 'bg-purple-500/10 text-purple-800 border-purple-500/20',
          label: 'Reunión'
        };
      case 'Llamada':
        return {
          bg: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100/70',
          dot: 'bg-blue-500',
          badge: 'bg-blue-500/10 text-blue-800 border-blue-500/20',
          label: 'Llamada'
        };
      case 'Tasación':
        return {
          bg: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/70',
          dot: 'bg-amber-500',
          badge: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
          label: 'Tasación'
        };
      case 'Otro':
        return {
          bg: 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100/70',
          dot: 'bg-zinc-500',
          badge: 'bg-zinc-500/10 text-zinc-800 border-zinc-500/20',
          label: 'Otro'
        };
      case 'Visita':
      default:
        return {
          bg: 'bg-teal-50 border-teal-100 text-teal-700 hover:bg-teal-100/70',
          dot: 'bg-teal-500',
          badge: 'bg-teal-500/10 text-teal-800 border-teal-500/20',
          label: 'Visita'
        };
    }
  };

  // Open creation modal
  const handleOpenAdd = (day?: Date) => {
    const targetDate = day || selectedDay || new Date();
    setFormType("Visita");
    setFormTitle('');
    setFormPropertyId('');
    setFormClientId('');
    setFormDate(format(targetDate, 'yyyy-MM-dd'));
    setFormTime(format(new Date(), 'HH:mm'));
    setFormStatus("Pendiente");
    setFormNotes('');
    setFormError('');
    setIsAddOpen(true);
  };

  // Submit new activity/event to Firestore
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) {
      setFormError('Por favor inicia sesión para programar actividades.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const combinedDateTime = new Date(`${formDate}T${formTime || '00:00'}:00`);
      const newActivity: Visit = {
        id: `event-${Date.now()}`,
        date: combinedDateTime,
        status: formStatus,
        type: formType,
        title: formType === "Visita" ? "" : formTitle.trim(),
        propertyId: formPropertyId || undefined,
        clientId: formClientId || undefined,
        notes: formNotes.trim() || undefined
      };

      await addVisitToFirebase(newActivity, agentId);
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Error al guardar la actividad en la base de datos.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open detail popup
  const handleOpenDetails = (activity: Visit) => {
    setSelectedActivity(activity);
    setSelectedDeadline(null);
    setIsEditing(false);
    setFormError('');

    // Prepopulate form state for potential editing
    setFormType(activity.type || "Visita");
    setFormTitle(activity.title || '');
    setFormPropertyId(activity.propertyId || '');
    setFormClientId(activity.clientId || '');
    
    const vDate = parseVisitDate(activity.date);
    setFormDate(format(vDate, 'yyyy-MM-dd'));
    setFormTime(format(vDate, 'HH:mm'));
    setFormStatus(activity.status);
    setFormNotes(activity.notes || '');

    setIsDetailsOpen(true);
  };

  const handleOpenDeadlineDetails = (deadline: { property: Property, date: Date }) => {
    setSelectedDeadline(deadline);
    setSelectedActivity(null);
    setIsDetailsOpen(true);
  };

  // Toggle status quickly
  const handleToggleStatus = async (activity: Visit) => {
    if (!agentId) return;
    const nextStatus = activity.status === "Completada" ? "Pendiente" : "Completada";
    try {
      await updateVisitInFirebase(activity.id, { status: nextStatus });
      // Update local detailed view if open
      if (selectedActivity && selectedActivity.id === activity.id) {
        setSelectedActivity(prev => prev ? { ...prev, status: nextStatus } : null);
        setFormStatus(nextStatus);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save edits
  const handleSaveEdits = async () => {
    if (!selectedActivity || !agentId) return;
    setSubmitting(true);
    setFormError('');

    try {
      const combinedDateTime = new Date(`${formDate}T${formTime || '00:00'}:00`);
      const updates: Partial<Visit> = {
        type: formType,
        title: formType === "Visita" ? "" : formTitle.trim(),
        propertyId: formPropertyId || undefined,
        clientId: formClientId || undefined,
        date: combinedDateTime,
        status: formStatus,
        notes: formNotes.trim() || undefined
      };

      await updateVisitInFirebase(selectedActivity.id, updates);
      setIsDetailsOpen(false);
      setSelectedActivity(null);
    } catch (err) {
      console.error(err);
      setFormError('No se pudieron actualizar los cambios.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteActivity = async (visitId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta actividad del calendario?')) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteVisitFromFirebase(visitId);
      setIsDetailsOpen(false);
      setSelectedActivity(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la actividad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 w-full animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-[#1D1D1F]">Calendario & Agenda</h1>
          <p className="text-base text-[#86868B] mt-1">
            Gestión integrada de visitas, firmas de contratos, llamadas y vencimientos.
          </p>
        </div>

        {/* View togglers & Add button */}
        <div className="flex items-center gap-3 self-start md:self-end">
          <div className="bg-zinc-100 p-1 rounded-xl flex gap-1 border border-black/5 shrink-0 shadow-xs">
            <button
              onClick={() => setViewType('mensual')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewType === 'mensual' 
                  ? "bg-white text-[#2E847A] shadow-xs" 
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setViewType('semanal')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewType === 'semanal' 
                  ? "bg-white text-[#2E847A] shadow-xs" 
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              Semanal
            </button>
          </div>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 bg-[#2E847A] hover:opacity-90 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wider"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Nueva Actividad</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por dirección, cliente, notas o tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/70 backdrop-blur-md rounded-xl text-sm border border-black/5 outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={handlePrev}
              className="p-2.5 bg-white border border-black/5 hover:bg-zinc-50 active:scale-95 rounded-xl cursor-pointer transition-all"
              title={viewType === 'mensual' ? "Mes anterior" : "Semana anterior"}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2.5 bg-white border border-black/5 hover:bg-zinc-50 active:scale-95 text-xs font-bold text-zinc-700 rounded-xl cursor-pointer transition-all uppercase tracking-wider"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-2.5 bg-white border border-black/5 hover:bg-zinc-50 active:scale-95 rounded-xl cursor-pointer transition-all"
              title={viewType === 'mensual' ? "Mes siguiente" : "Semana siguiente"}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <span>Filtros:</span>
          </span>
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
              typeFilter === 'all'
                ? "bg-zinc-800 text-white border-zinc-900 shadow-sm font-bold"
                : "bg-white text-zinc-600 border-black/5 hover:bg-zinc-50"
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('visitas')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'visitas'
                ? "bg-teal-600 text-white border-teal-700 shadow-sm font-bold"
                : "bg-white text-teal-700 border-teal-100 hover:bg-teal-50/50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
            Visitas
          </button>
          <button
            onClick={() => setTypeFilter('firmas')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'firmas'
                ? "bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold"
                : "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50/50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            Firmas Contrato
          </button>
          <button
            onClick={() => setTypeFilter('reuniones')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'reuniones'
                ? "bg-purple-600 text-white border-purple-700 shadow-sm font-bold"
                : "bg-white text-purple-700 border-purple-100 hover:bg-purple-50/50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
            Reuniones
          </button>
          <button
            onClick={() => setTypeFilter('llamadas')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'llamadas'
                ? "bg-blue-600 text-white border-blue-700 shadow-sm font-bold"
                : "bg-white text-blue-700 border-blue-100 hover:bg-blue-50/50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            Llamadas
          </button>
          <button
            onClick={() => setTypeFilter('tasaciones')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'tasaciones'
                ? "bg-amber-600 text-white border-amber-700 shadow-sm font-bold"
                : "bg-white text-amber-700 border-amber-100 hover:bg-amber-50/50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            Tasaciones
          </button>
          <button
            onClick={() => setTypeFilter('vencimientos')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'vencimientos'
                ? "bg-red-600 text-white border-red-700 shadow-sm font-bold"
                : "bg-white text-red-600 border-red-100 hover:bg-red-50"
            )}
          >
            <AlertCircle size={12} className="shrink-0" />
            Vencimientos Contrato
          </button>
          <button
            onClick={() => setTypeFilter('otros')}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5",
              typeFilter === 'otros'
                ? "bg-zinc-600 text-white border-zinc-700 shadow-sm font-bold"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0"></span>
            Otros
          </button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="bg-white/60 backdrop-blur-3xl flex flex-col border border-white/80 rounded-[1.5rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-1">
        
        {/* Navigation Month Heading Indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-[#2E847A]" />
            <span className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">
            {viewType === 'mensual' ? 'Vista Mensual Completa' : 'Vista Semanal de Agenda'}
          </span>
        </div>

        {/* Weekday Titles */}
        <div className="grid grid-cols-7 border-b border-black/5 bg-white/40 backdrop-blur-md">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => (
            <div key={idx} className="p-3 text-center border-r border-black/5 last:border-r-0 font-display">
              <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">
                {day}
              </p>
            </div>
          ))}
        </div>

        {/* Days Content Matrix */}
        <div className={cn(
          "grid grid-cols-7 bg-white/20 backdrop-blur-xs rounded-b-[1.3rem]",
          viewType === 'mensual' ? "min-h-[600px]" : "min-h-[250px]"
        )}>
          {activeDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const { activities: dayActs, deadlines: dayDeadlines } = filterDayItems(day);
            const totalItemsCount = dayActs.length + dayDeadlines.length;

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDay(day)}
                onDoubleClick={() => handleOpenAdd(day)}
                className={cn(
                  "p-2.5 border-r border-b border-black/5 last:border-r-0 last:border-b-0 min-h-[110px] group transition-all relative flex flex-col justify-between cursor-pointer hover:bg-zinc-50/30",
                  !isCurrentMonth && "bg-zinc-50/20 opacity-35",
                  isSameDay(day, selectedDay) && "bg-[#2E847A]/5 hover:bg-[#2E847A]/5 border-2 border-[#2E847A]/30 z-10"
                )}
              >
                {/* Day indicator */}
                <div className="flex justify-between items-start mb-2">
                  <div className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold leading-none transition-all",
                    isToday(day) 
                      ? "bg-[#2E847A] text-white shadow-sm font-extrabold" 
                      : isSameDay(day, selectedDay)
                        ? "bg-[#2E847A]/15 text-[#2E847A] font-extrabold"
                        : "text-[#1D1D1F]"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Invisible plus sign on hover for quick add */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAdd(day);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-zinc-200 text-zinc-500 transition-all"
                    title="Programar para este día"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Day content items stack */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-end">
                  {/* Render contract deadlines */}
                  {dayDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeadlineDetails(dl);
                      }}
                      className="bg-red-50 border border-red-200/50 hover:bg-red-100/80 px-2 py-1 rounded-lg text-[10px] font-bold text-red-700 flex items-center gap-1 shadow-2xs transition-all animate-in fade-in zoom-in-95 duration-150"
                      title={`Vencimiento Contrato: ${dl.property.address}`}
                    >
                      <AlertTriangle size={11} className="shrink-0 text-red-500" />
                      <span className="truncate flex-1">Vence: {dl.property.address.split(' ')[0]} {dl.property.address.split(' ')[1] || ''}</span>
                    </div>
                  ))}

                  {/* Render activities */}
                  {dayActs.slice(0, 4).map((act) => {
                    const styles = getActivityTypeStyles(act.type);
                    const prop = properties.find(p => p.id === act.propertyId);
                    const isCompleted = act.status === "Completada";
                    const isCancelled = act.status === "Cancelada";

                    const label = act.title || prop?.address || styles.label;

                    return (
                      <div
                        key={act.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(act);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 shadow-2xs transition-all leading-snug animate-in fade-in zoom-in-95 duration-100",
                          isCompleted 
                            ? "bg-zinc-100 border-zinc-200 text-zinc-400 hover:bg-zinc-200/50 line-through" 
                            : isCancelled
                              ? "bg-red-50/50 border-red-100 text-red-400 hover:bg-red-100/30 line-through"
                              : styles.bg
                        )}
                        title={`${styles.label}: ${label}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={10} className="shrink-0 text-zinc-400" />
                        ) : isCancelled ? (
                          <AlertCircle size={10} className="shrink-0 text-red-400" />
                        ) : (
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)}></span>
                        )}
                        <span className="truncate flex-1 font-bold">
                          {format(parseVisitDate(act.date), 'HH:mm')} {label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Indicator for extra activities */}
                  {dayActs.length > 4 && (
                    <div className="text-[9px] font-bold text-zinc-500 text-right px-1">
                      + {dayActs.length - 4} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL DIALOGS --- */}
      <AnimatePresence>
        
        {/* 1. NEW ACTIVITY MODAL */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] border border-black/10 shadow-[0_32px_80px_rgba(0,0,0,0.12)] p-8 overflow-hidden z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                    <CalendarIcon size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1D1D1F]">Programar Actividad</h3>
                    <p className="text-xs text-[#86868B]">Crea visitas, llamadas, reuniones u otros eventos</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black cursor-pointer transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateActivity} className="space-y-4">
                {/* Type Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Tipo de Actividad</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                  >
                    <option value="Visita">Visita Comercial</option>
                    <option value="Firma de Contrato">Firma de Contrato</option>
                    <option value="Reunión">Reunión Operativa</option>
                    <option value="Llamada">Llamada telefónica</option>
                    <option value="Tasación">Tasación de Propiedad</option>
                    <option value="Otro">Otro Evento</option>
                  </select>
                </div>

                {/* Custom Title (Only required if not Visita) */}
                {formType !== "Visita" && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Título del Evento</label>
                    <input
                      type="text"
                      placeholder="Ej: Reunión con martillero"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                    />
                  </div>
                )}

                {/* Date & Time Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Fecha</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Hora</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                    />
                  </div>
                </div>

                {/* Property Association */}
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Asociar Inmueble (Opcional)</label>
                  <div className="relative">
                    <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <select
                      value={formPropertyId}
                      onChange={(e) => setFormPropertyId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                    >
                      <option value="">-- Ningún Inmueble --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.address} ({p.operation})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Client Association */}
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Asociar Cliente (Opcional)</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <select
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                    >
                      <option value="">-- Ningún Cliente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes/Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Notas / Observaciones</label>
                  <textarea
                    placeholder="Detalles sobre el evento, llaves a retirar, requisitos del cliente..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all resize-none"
                  />
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Estado</label>
                  <div className="flex gap-4">
                    {["Pendiente", "Completada", "Cancelada"].map((status) => (
                      <label key={status} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          checked={formStatus === status}
                          onChange={() => setFormStatus(status as any)}
                          className="text-[#2E847A] focus:ring-[#2E847A]"
                        />
                        <span>{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-black/5 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#2E847A] hover:bg-[#256c64] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {submitting ? 'Guardando...' : 'Programar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. ACTIVITY DETAILS & EDIT MODAL */}
        {isDetailsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] border border-black/10 shadow-[0_32px_80px_rgba(0,0,0,0.12)] p-8 overflow-hidden z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center">
                    {selectedDeadline ? <AlertTriangle size={18} className="text-red-500 animate-pulse" /> : <Activity size={18} className="text-[#2E847A]" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1D1D1F]">
                      {selectedDeadline ? 'Alerta de Vencimiento' : isEditing ? 'Editar Actividad' : 'Detalles de Actividad'}
                    </h3>
                    <p className="text-xs text-[#86868B]">
                      {selectedDeadline ? 'Vencimiento de contrato de arrendamiento' : 'Organizador integrado de agenda'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black cursor-pointer transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Deadline specifics */}
              {selectedDeadline && (
                <div className="space-y-5">
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-700 flex flex-col gap-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-sm font-extrabold">
                      <AlertTriangle size={16} className="text-red-500" />
                      <span>CONTRATO POR VENCER</span>
                    </div>
                    <p className="text-xs font-semibold leading-relaxed">
                      El contrato de alquiler de este inmueble expira indefectiblemente el día{' '}
                      <strong className="font-bold">{format(selectedDeadline.date, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })}</strong>. 
                      Se recomienda contactar al propietario y al inquilino para coordinar la renovación o la entrega de llaves.
                    </p>
                  </div>

                  {/* Property Details */}
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5 space-y-3">
                    <h4 className="text-xs font-bold text-[#86868B] uppercase tracking-wider">Inmueble Afectado</h4>
                    <div className="flex items-start gap-3">
                      <Building size={16} className="text-zinc-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-zinc-800 leading-tight">{selectedDeadline.property.address}</p>
                        <p className="text-xs font-semibold text-zinc-500 mt-1">
                          {selectedDeadline.property.category} en {selectedDeadline.property.operation} · {selectedDeadline.property.currency} {selectedDeadline.property.price.toLocaleString('es-AR')}
                        </p>
                        <div className="mt-2.5 inline-block px-2 py-0.5 rounded bg-zinc-200 text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                          Estado: {selectedDeadline.property.status}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/5">
                    <button
                      onClick={() => setIsDetailsOpen(false)}
                      className="w-full py-2.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer shadow-md"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              )}

              {/* Activity details & editing */}
              {selectedActivity && (
                <div className="space-y-5">
                  {formError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {!isEditing ? (
                    // VIEW MODE
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border shadow-2xs",
                          getActivityTypeStyles(selectedActivity.type).badge
                        )}>
                          {selectedActivity.type || 'Visita'}
                        </div>

                        <div className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold border shadow-2xs uppercase tracking-wide",
                          selectedActivity.status === "Completada" ? "bg-zinc-100 border-zinc-200 text-zinc-500" :
                          selectedActivity.status === "Cancelada" ? "bg-red-50 border-red-100 text-red-600" :
                          "bg-amber-50 border-amber-100 text-amber-700"
                        )}>
                          {selectedActivity.status}
                        </div>
                      </div>

                      {/* Display title or description */}
                      {selectedActivity.type !== "Visita" && selectedActivity.title && (
                        <div>
                          <h4 className="text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1">Título del Evento</h4>
                          <p className="text-base font-bold text-zinc-800">{selectedActivity.title}</p>
                        </div>
                      )}

                      {/* Date & Time display */}
                      <div className="flex items-center gap-6 bg-zinc-50/75 p-4 rounded-2xl border border-black/5">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={16} className="text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Fecha</p>
                            <p className="text-xs font-bold text-zinc-800 leading-none">
                              {format(parseVisitDate(selectedActivity.date), 'EEEE d \'de\' MMMM', { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border-l border-black/10 pl-6">
                          <Clock size={16} className="text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Hora</p>
                            <p className="text-xs font-bold text-zinc-800 leading-none">
                              {format(parseVisitDate(selectedActivity.date), 'HH:mm')} hs
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Property connection details */}
                      {selectedActivity.propertyId && (
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">Inmueble Vinculado</span>
                          {(() => {
                            const p = properties.find(prop => prop.id === selectedActivity.propertyId);
                            if (!p) return <p className="text-xs text-zinc-400">Inmueble no encontrado en base de datos.</p>;
                            return (
                              <div className="flex items-start gap-3">
                                <Building size={16} className="text-[#2E847A] mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-zinc-800 truncate leading-tight">{p.address}</p>
                                  <p className="text-xs font-semibold text-zinc-500 mt-1">
                                    {p.category} en {p.operation} · {p.currency} {p.price.toLocaleString('es-AR')}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Client connection details */}
                      {selectedActivity.clientId && (
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">Cliente Vinculado</span>
                          {(() => {
                            const c = clients.find(cl => cl.id === selectedActivity.clientId);
                            if (!c) return <p className="text-xs text-zinc-400">Cliente no encontrado en base de datos.</p>;
                            return (
                              <div className="flex items-start gap-3">
                                <User size={16} className="text-[#2E847A] mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-zinc-800 truncate leading-tight">{c.name}</p>
                                  <p className="text-xs font-semibold text-zinc-500 mt-1 flex items-center gap-2">
                                    <span>{c.role}</span>
                                    {c.phone && <span>· {c.phone}</span>}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Notes Section */}
                      {selectedActivity.notes && (
                        <div>
                          <h4 className="text-xs font-bold text-[#86868B] uppercase tracking-wider mb-2">Notas / Observaciones</h4>
                          <div className="bg-zinc-50 p-4 rounded-2xl border border-black/5 text-xs font-semibold text-zinc-700 leading-relaxed max-h-[140px] overflow-y-auto">
                            {selectedActivity.notes}
                          </div>
                        </div>
                      )}

                      {/* Control buttons */}
                      <div className="flex flex-col gap-2 pt-4 border-t border-black/5 mt-6">
                        <div className="flex items-center gap-3">
                          {/* Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(selectedActivity)}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-transparent",
                              selectedActivity.status === "Completada"
                                ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                : "bg-teal-600 text-white hover:bg-teal-700"
                            )}
                          >
                            <CheckCircle2 size={14} />
                            <span>{selectedActivity.status === "Completada" ? "Reabrir Actividad" : "Completar"}</span>
                          </button>

                          {/* Edit Trigger */}
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl cursor-pointer transition-all"
                            title="Editar Datos"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete Trigger */}
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(selectedActivity.id)}
                            className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer transition-all border border-red-100"
                            title="Eliminar de Agenda"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // EDIT MODE FORM
                    <div className="space-y-4">
                      {/* Edit Type */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Tipo de Actividad</label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                        >
                          <option value="Visita">Visita Comercial</option>
                          <option value="Firma de Contrato">Firma de Contrato</option>
                          <option value="Reunión">Reunión Operativa</option>
                          <option value="Llamada">Llamada telefónica</option>
                          <option value="Tasación">Tasación de Propiedad</option>
                          <option value="Otro">Otro Evento</option>
                        </select>
                      </div>

                      {/* Edit Title */}
                      {formType !== "Visita" && (
                        <div>
                          <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Título</label>
                          <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                          />
                        </div>
                      )}

                      {/* Edit Date/Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Fecha</label>
                          <input
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Hora</label>
                          <input
                            type="time"
                            value={formTime}
                            onChange={(e) => setFormTime(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Edit Property Association */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Asociar Inmueble (Opcional)</label>
                        <select
                          value={formPropertyId}
                          onChange={(e) => setFormPropertyId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                        >
                          <option value="">-- Ningún Inmueble --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.address}</option>
                          ))}
                        </select>
                      </div>

                      {/* Edit Client Association */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Asociar Cliente (Opcional)</label>
                        <select
                          value={formClientId}
                          onChange={(e) => setFormClientId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all"
                        >
                          <option value="">-- Ningún Cliente --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Edit Notes */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Notas</label>
                        <textarea
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3.5 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#2E847A]/20 transition-all resize-none"
                        />
                      </div>

                      {/* Edit Status */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">Estado</label>
                        <div className="flex gap-4">
                          {["Pendiente", "Completada", "Cancelada"].map((status) => (
                            <label key={status} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                              <input
                                type="radio"
                                name="status"
                                value={status}
                                checked={formStatus === status}
                                onChange={() => setFormStatus(status as any)}
                                className="text-[#2E847A] focus:ring-[#2E847A]"
                              />
                              <span>{status}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 pt-4 border-t border-black/5 mt-6">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700 transition-all uppercase tracking-wider cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdits}
                          disabled={submitting}
                          className="flex-1 py-2.5 bg-[#2E847A] hover:bg-[#206158] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center cursor-pointer shadow-md"
                        >
                          {submitting ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
