import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { updateOrCreateUserProfile } from '../lib/dbService';
import { Key, Mail, Sparkles, Building, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async (targetEmail: string) => {
    setError('');
    setResetSuccess('');
    setLoading(true);
    setEmail(targetEmail);
    const defaultPass = '123456';
    setPassword(defaultPass);

    try {
      try {
        const credential = await signInWithEmailAndPassword(auth, targetEmail, defaultPass);
        const displayName = credential.user.displayName || credential.user.email?.split('@')[0] || 'Agente';
        await updateOrCreateUserProfile(credential.user.uid, displayName, credential.user.email || '');
      } catch (signInErr: any) {
        const isUserNotFound = signInErr.code === 'auth/user-not-found' || 
                               signInErr.code === 'auth/invalid-credential' || 
                               signInErr.message?.includes('invalid-credential') ||
                               signInErr.message?.includes('user-not-found');
        if (isUserNotFound) {
          console.log(`Auto-creating workspace dynamically for authorized tester: ${targetEmail}`);
          try {
            const credential = await createUserWithEmailAndPassword(auth, targetEmail, defaultPass);
            const userHandle = targetEmail.split('@')[0];
            const cleanName = userHandle.charAt(0).toUpperCase() + userHandle.slice(1);
            
            const defaultAgencyName = targetEmail === 'unkeinmomef@unkeinmo.com' ? 'UNKEINMO MEF' : (userHandle.toUpperCase() + ' INMOBILIARIA');
            const additionalData = {
              agencyName: defaultAgencyName,
              brandColor: '#2E847A',
              logoUrl: null
            };
            
            await updateOrCreateUserProfile(
              credential.user.uid,
              cleanName,
              targetEmail,
              additionalData
            );
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use' || createErr.message?.includes('email-already-in-use')) {
              throw new Error('Este usuario ya existe con otra contraseña. Por favor ingresa manualmente tu contraseña correcta en el formulario.');
            } else {
              throw createErr;
            }
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error en el acceso rápido.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetSuccess('');
    let emailToUse = email.trim();
    if (!emailToUse) {
      setError('Por favor ingresa tu correo primero en el campo de texto para poder enviarte el enlace de restauración.');
      return;
    }
    if (!emailToUse.includes('@')) {
      emailToUse = `${emailToUse.toLowerCase()}@unkeinmo.com`;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailToUse);
      setResetSuccess(`¡Listo! Se ha enviado un correo de restauración a ${emailToUse}. Revisa tu correo.`);
    } catch (err: any) {
      console.error(err);
      setError('Error al enviar el correo de restauración: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setLoading(true);

    let emailToUse = email.trim();
    if (!emailToUse.includes('@')) {
      emailToUse = `${emailToUse.toLowerCase()}@unkeinmo.com`;
    }

    try {
      // Sign in
      try {
        const credential = await signInWithEmailAndPassword(auth, emailToUse, password);
        // Sync profile just in case name isn't set
        const displayName = credential.user.displayName || credential.user.email?.split('@')[0] || 'Agente';
        await updateOrCreateUserProfile(credential.user.uid, displayName, credential.user.email || '');
      } catch (signInErr: any) {
        // Auto-registration IS RESTRICTED strictly to authorized tester accounts: unkeinmomef@unkeinmo.com, mesfede@gmail.com, and mesfede@unkeinmo.com
        const isAllowedTrial = 
          emailToUse.toLowerCase() === 'unkeinmomef@unkeinmo.com' || 
          emailToUse.toLowerCase() === 'mesfede@gmail.com' ||
          emailToUse.toLowerCase() === 'mesfede@unkeinmo.com';
        const isUserNotFound = signInErr.code === 'auth/user-not-found' || 
                               signInErr.code === 'auth/invalid-credential' || 
                               signInErr.message?.includes('invalid-credential') ||
                               signInErr.message?.includes('user-not-found');
        
        if (isAllowedTrial && isUserNotFound) {
          console.log(`No existing trial user found. Auto-creating trial workspace for authorized user ${emailToUse}.`);
          try {
            const credential = await createUserWithEmailAndPassword(auth, emailToUse, password);
            const userHandle = emailToUse.split('@')[0];
            const cleanName = userHandle.charAt(0).toUpperCase() + userHandle.slice(1);
            
            // Set dynamic branding values
            const defaultAgencyName = emailToUse.toLowerCase() === 'unkeinmomef@unkeinmo.com' ? 'UNKEINMO MEF' : (userHandle.toUpperCase() + ' INMOBILIARIA');
            const additionalData = {
              agencyName: defaultAgencyName,
              brandColor: '#2E847A',
              logoUrl: null
            };
            
            await updateOrCreateUserProfile(
              credential.user.uid, 
              cleanName, 
              emailToUse, 
              additionalData
            );
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use' || createErr.message?.includes('email-already-in-use')) {
              // Sign-in failed with incorrect credentials, but user actually exists!
              throw signInErr;
            } else {
              throw createErr;
            }
          }
        } else {
          // Do not allow auto-creation of other accounts
          if (emailToUse.toLowerCase().endsWith('@unkeinmo.com') && !isAllowedTrial) {
            throw new Error('Este usuario no está pre-autorizado. Contacta al administrador para habilitar un nuevo acceso.');
          }
          throw signInErr;
        }
      }
    } catch (err: any) {
      const isExpectedAuthError = 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.message?.includes('invalid-credential') ||
        err.message?.includes('user-not-found') ||
        err.message?.includes('wrong-password');

      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn("Intento de login controlado (sin errores críticos de sistema):", err.message || err);
      }

      let friendlyError = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        friendlyError = 'El inicio de sesión no está habilitado en tu consola de Firebase.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'Este correo ya se encuentra registrado.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.message?.includes('invalid-credential')) {
        friendlyError = 'Usuario o contraseña incorrectos. Por favor verifica tus credenciales.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F5F5F7] overflow-hidden p-6">
      {/* Background blur blobs */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-blue-400/15 mix-blend-multiply blur-[130px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-emerald-400/10 mix-blend-multiply blur-[130px] pointer-events-none animate-pulse duration-4000" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white/60 backdrop-blur-3xl border border-white/80 p-10 rounded-[2.5rem] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.05)]"
      >
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-16 h-16 bg-[#2E847A] rounded-2xl flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(46,132,122,0.3)]">
            <Building className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Unkeinmo CRM</h1>
          <p className="text-sm font-medium text-[#86868B] mt-1.5">
            Plataforma Profesional de Gestión Inmobiliaria
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50/70 border border-amber-200/50 rounded-2xl text-xs font-semibold text-amber-800 flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{error}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200/50 rounded-2xl text-xs font-semibold text-emerald-800 flex items-start gap-2.5">
            <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>{resetSuccess}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider mb-1.5 ml-1">Usuario o Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: unkeinmomef o tu@correo.com"
                className="w-full pl-9 pr-4 py-2.5 bg-white/70 border border-black/5 rounded-xl text-sm outline-none placeholder:text-[#86868B] focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1">
              <label className="block text-xs font-bold text-[#86868B] uppercase tracking-wider">Contraseña</label>
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[10px] font-bold text-[#2E847A] hover:underline hover:text-[#1F5F57] cursor-pointer disabled:opacity-50"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-white/70 border border-black/5 rounded-xl text-sm outline-none placeholder:text-[#86868B] focus:ring-2 ring-[#2E847A]/15 focus:border-[#2E847A]/30 transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#2E847A] hover:bg-[#1F5F57] text-white py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <Sparkles size={16} className={loading ? "animate-spin" : ""} />
            {loading ? 'Procesando...' : 'Entrar al Panel'}
          </button>
        </form>

        {/* Acceso Rápido Administrador / Testadores */}
        <div className="mt-6 pt-5 border-t border-black/5">
          <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider text-center mb-3">
            🔐 Acceso Rápido de Administrador
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('mesfede@unkeinmo.com')}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-black/5 hover:border-[#2E847A]/30 transition-all text-center group cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs font-bold text-[#1D1D1F] group-hover:text-[#2E847A] transition-colors">Federico (Admin)</span>
              <span className="text-[9px] font-medium text-[#86868B] mt-0.5 font-mono">mesfede@unkeinmo.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('unkeinmomef@unkeinmo.com')}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-black/5 hover:border-[#2E847A]/30 transition-all text-center group cursor-pointer disabled:opacity-50"
            >
              <span className="text-xs font-bold text-[#1D1D1F] group-hover:text-[#2E847A] transition-colors">UNKEINMO MEF</span>
              <span className="text-[9px] font-medium text-[#86868B] mt-0.5 font-mono">Trial Inmobiliaria</span>
            </button>
          </div>
        </div>

        {/* Console warning */}
        <div className="mt-8 border-t border-black/5 pt-5 text-center">
          <p className="text-[10px] leading-relaxed text-[#86868B]">
            💡 <strong>Acceso Restringido:</strong> La opción de registro público está desactivada. Inicia sesión con tus credenciales asignadas de inmobiliaria para acceder de forma segura.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
