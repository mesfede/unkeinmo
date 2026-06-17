import React, { useState, useEffect } from 'react';
import { X, Upload, Check, RefreshCw, Sparkles, Building, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateUserProfileInFirebase } from '../lib/dbService';

export const BRAND_PRESETS = [
  { id: 'teal', label: 'Verde Azulado', color: '#2E847A', class: 'bg-[#2E847A]' },
  { id: 'navy', label: 'Azul Real', color: '#1E3A8A', class: 'bg-[#1E3A8A]' },
  { id: 'emerald', label: 'Esmeralda', color: '#059669', class: 'bg-[#059669]' },
  { id: 'amber', label: 'Ámbar Cálido', color: '#D97706', class: 'bg-[#D97706]' },
  { id: 'indigo', label: 'Índigo Moderno', color: '#4F46E5', class: 'bg-[#4F46E5]' },
  { id: 'rose', label: 'Rosa Premium', color: '#E11D48', class: 'bg-[#E11D48]' },
  { id: 'cocoa', label: 'Marrón Otoño', color: '#8F664E', class: 'bg-[#8F664E]' },
  { id: 'slate', label: 'Gris Grafito', color: '#1D1D1F', class: 'bg-[#1D1D1F]' },
];

interface BrandingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  uid: string;
}

export function BrandingSettingsModal({ isOpen, onClose, userProfile, uid }: BrandingSettingsModalProps) {
  const [agencyName, setAgencyName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#2E847A');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state with loaded user profile when modal opens
  useEffect(() => {
    if (userProfile) {
      setAgencyName(userProfile.agencyName || 'Unkeinmo');
      setSelectedColor(userProfile.brandColor || '#2E847A');
      setLogoUrl(userProfile.logoUrl || null);
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  // Handle image conversion to Base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPEG, SVG).');
      return;
    }
    if (file.size > 800 * 1024) { // 800KB max to avoid Firestore document limits
      alert('Para un rendimiento óptimo de la aplicación, el logo debe ser menor a 800 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      await updateUserProfileInFirebase(uid, {
        agencyName: agencyName.trim() || 'Unkeinmo',
        brandColor: selectedColor,
        logoUrl: logoUrl,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error al guardar los cambios en la base de datos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setSubmitting(true);
    setShowResetConfirm(false);
    try {
      const currentUserEmail = userProfile?.email || '';
      let defaultAgencyName = 'Unkeinmo';
      
      // Determine the true original name based on the user handle
      if (currentUserEmail.toLowerCase() === 'unkeinmomef@unkeinmo.com') {
        defaultAgencyName = 'UNKEINMO MEF';
      } else if (currentUserEmail.toLowerCase().endsWith('@unkeinmo.com')) {
        const userHandle = currentUserEmail.split('@')[0];
        defaultAgencyName = userHandle.toUpperCase() + ' INMOBILIARIA';
      }

      await updateUserProfileInFirebase(uid, {
        agencyName: defaultAgencyName,
        brandColor: '#2E847A',
        logoUrl: null,
      });
      
      setAgencyName(defaultAgencyName);
      setSelectedColor('#2E847A');
      setLogoUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      console.error(err);
      alert('Error al restablecer los valores prederminados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop glass blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/35 backdrop-blur-md" 
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.1)] p-8 overflow-hidden z-10"
        >
          {/* Accent decoration */}
          <div 
            style={{ backgroundColor: selectedColor }}
            className="absolute top-0 left-0 right-0 h-2 opacity-80" 
          />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div 
                style={{ backgroundColor: `${selectedColor}1A`, color: selectedColor }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              >
                <Palette strokeWidth={2.4} size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#1D1D1F]">Identidad Visual</h3>
                <p className="text-xs font-semibold text-[#86868B]">Configura el diseño de tu inmobiliaria</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 text-zinc-500 hover:text-[#1D1D1F] transition-all cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Agency Name */}
            <div>
              <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-2 ml-1">Nombre Comercial de la Inmobiliaria</label>
              <div className="relative">
                <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Ej: MEF Propiedades"
                  maxLength={24}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 rounded-xl text-sm border border-black/5 outline-none focus:ring-2 focus:bg-white font-semibold transition-all"
                  style={{ '--tw-ring-color': selectedColor } as any}
                  required
                />
              </div>
            </div>

            {/* Brand Primary Color Selection */}
            <div>
              <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-2.5 ml-1">Color de Identidad (Paleta)</label>
              <div className="grid grid-cols-4 gap-2 bg-zinc-50/50 p-2.5 rounded-2xl border border-black/5">
                {BRAND_PRESETS.map((preset) => {
                  const isSelected = selectedColor === preset.color;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedColor(preset.color)}
                      className="p-2 flex flex-col items-center justify-center rounded-xl border border-transparent hover:bg-white hover:shadow-xs transition-all cursor-pointer outline-none relative"
                    >
                      <span className={`w-6 h-6 rounded-full ${preset.class} shadow-sm shrink-0 flex items-center justify-center text-white`}>
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 mt-1 uppercase tracking-wide leading-none">{preset.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logo Image Upload with base64 conversion */}
            <div>
              <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-2 ml-1">Logotipo Comercial (trial sin cargas)</label>
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all ${
                  dragActive ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {logoUrl ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm border border-black/5 bg-white flex items-center justify-center shrink-0">
                      <img src={logoUrl} alt="Logo Prev" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1D1D1F] truncate">Logotipo Cargado Correctamente</p>
                      <button 
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="text-[10px] font-bold text-red-500 hover:underline mt-1 cursor-pointer"
                      >
                        Eliminar Logotipo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center justify-center py-2">
                    <Upload size={22} className="text-zinc-400 mb-1.5" />
                    <p className="text-xs font-bold text-zinc-500">Arrastra tu logo aquí o busca en tu carpeta</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 font-semibold">Formatos recomendados: PNG cuadrados o transparentes</p>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleChangeFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              {showResetConfirm ? (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200/50 p-1.5 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold text-red-700 px-1">¿Restablecer?</span>
                  <button
                    type="button"
                    onClick={confirmReset}
                    disabled={submitting}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-lg text-[10px] font-bold text-zinc-700 transition-all cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResetClick}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-black/5 rounded-xl text-xs font-bold text-zinc-600 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={submitting ? 'animate-spin' : ''} />
                  Restablecer
                </button>
              )}

              <button
                type="submit"
                disabled={submitting || success}
                style={{ backgroundColor: selectedColor }}
                className="flex-1 py-2.5 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {success ? (
                  <>
                    <Check size={14} className="animate-bounce" />
                    ¡Guardado Exitosamente!
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {submitting ? 'Procesando...' : 'Aplicar Imagen de Marca'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
