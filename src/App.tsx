/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { PropertiesView } from './views/PropertiesView';
import { ClientsView } from './views/ClientsView';
import { CalendarView } from './views/CalendarView';
import { LoginView } from './components/LoginView';
import { BrandingSettingsModal } from './components/BrandingSettingsModal';
import { auth, logoutUser, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  seedDatabaseIfEmpty, 
  syncProperties, 
  syncClients, 
  syncAlerts, 
  syncVisits, 
  syncUsers,
  addPropertyToFirebase, 
  updatePropertyInFirebase,
  deletePropertyFromFirebase,
  updateAlertInFirebase,
  addClientToFirebase,
  updateClientInFirebase,
  deleteClientFromFirebase,
  updateUserProfileInFirebase
} from './lib/dbService';
import { MOCK_FINANCE } from './data/mockData';
import { AgentAlert, FinancialState, Property, Client, Visit } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<'Disponible' | 'Ocupado' | 'Reservado' | 'Vencido' | 'Vendido' | 'Todos'>('Todos');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  
  // Real-time Cloud Sourced States
  const [finance, setFinance] = useState<FinancialState>(MOCK_FINANCE);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [registeredAgents, setRegisteredAgents] = useState<any[]>([]);

  // Convert hex color to RGB for opacity styling classes
  const hexToRgb = (hex: string): string => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '46, 132, 122'; // fallback to teal
  };

  // 1. Auth Subscription
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        // Run database seeding if collections are empty for a safe initial boot
        await seedDatabaseIfEmpty(firebaseUser.uid);
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 1b. Real-time User Profile Synchronization
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        const email = currentUser.email || '';
        setUserProfile({
          uid: currentUser.uid,
          name: currentUser.displayName || email.split('@')[0] || 'Agente',
          email: email,
          agencyName: email.toLowerCase().endsWith('@unkeinmo.com')
            ? email.split('@')[0].toUpperCase()
            : 'Unkeinmo',
          brandColor: '#2E847A',
          logoUrl: null
        });
      }
    });

    return () => unsubProfile();
  }, [currentUser]);

  // 2. Real-time Subscribers
  useEffect(() => {
    if (!currentUser) return;

    const unsubProps = syncProperties(
      currentUser.uid,
      (newProps) => setProperties(newProps),
      (err) => console.error(err)
    );

    const unsubClients = syncClients(
      currentUser.uid,
      (newClients) => setClients(newClients),
      (err) => console.error(err)
    );

    const unsubVisits = syncVisits(
      currentUser.uid,
      (newVisits) => setVisits(newVisits),
      (err) => console.error(err)
    );

    const unsubAlerts = syncAlerts(
      currentUser.uid,
      (newAlerts) => setAlerts(newAlerts),
      (err) => console.error(err)
    );

    const unsubUsers = syncUsers(
      (newUsers) => setRegisteredAgents(newUsers)
    );

    return () => {
      unsubProps();
      unsubClients();
      unsubVisits();
      unsubAlerts();
      unsubUsers();
    };
  }, [currentUser]);

  // Handle mutations
  const handleResolveAlert = async (id: string) => {
    try {
      await updateAlertInFirebase(id, { resolved: true });
      
      // Update financial state / simulation triggers
      const targetAlert = alerts.find(a => a.id === id);
      if (targetAlert?.title.includes('Anomalía')) {
        setFinance(prev => ({
          ...prev,
          pendingUnreconciledARS: 0,
          moneyMood: 'Calma'
        }));
      }
    } catch (error) {
      console.error("No se pudo resolver la alerta en Firestore:", error);
    }
  };

  const handleSimulateMood = (mood: FinancialState['moneyMood']) => {
    setFinance(prev => ({ ...prev, moneyMood: mood }));
  };

  const handleAddProperty = async (prop: Property) => {
    if (!currentUser) return;
    try {
      await addPropertyToFirebase(prop, currentUser.uid);
    } catch (error) {
      console.error("Error al añadir el inmueble a Firestore:", error);
    }
  };

  const handleUpdateProperty = async (propId: string, updates: Partial<Property>) => {
    if (!currentUser) return;
    try {
      await updatePropertyInFirebase(propId, updates, currentUser.uid);
    } catch (error) {
      console.error("Error al actualizar el inmueble en Firestore:", error);
    }
  };

  const handleDeleteProperty = async (propId: string) => {
    if (!currentUser) return;
    try {
      await deletePropertyFromFirebase(propId);
    } catch (error) {
      console.error("Error al eliminar el inmueble de Firestore:", error);
    }
  };

  const handleAddClient = async (client: Client) => {
    if (!currentUser) return;
    try {
      await addClientToFirebase(client, currentUser.uid);
    } catch (error) {
      console.error("Error al añadir el cliente a Firestore:", error);
    }
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!currentUser) return;
    try {
      await updateClientInFirebase(clientId, updates);
    } catch (error) {
      console.error("Error al actualizar el cliente en Firestore:", error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!currentUser) return;
    try {
      await deleteClientFromFirebase(clientId);
    } catch (error) {
      console.error("Error al eliminar el cliente de Firestore:", error);
    }
  };

  // Helper for direct client navigation
  const handleNavigateToClientName = (clientName: string) => {
    setClientSearchQuery(clientName);
    setCurrentView('clients');
  };

  // Helper for direct properties navigation with status filter & search query
  const handleNavigateToProperties = (status: 'Disponible' | 'Ocupado' | 'Reservado' | 'Vencido' | 'Vendido' | 'Todos', search: string = '') => {
    setPropertyStatusFilter(status);
    setPropertySearchQuery(search);
    setCurrentView('properties');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error("Error cerrando sesión:", e);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#2E847A] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-[#86868B]">Iniciando seguridad de Unkeinmo...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  const brandColor = userProfile?.brandColor || '#2E847A';
  const brandRgb = hexToRgb(brandColor);

  const customStyles = `
    .text-\\[\\#2E847A\\] { color: ${brandColor} !important; }
    .bg-\\[\\#2E847A\\] { background-color: ${brandColor} !important; }
    .border-\\[\\#2E847A\\] { border-color: ${brandColor} !important; }
    .ring-\\[\\#2E847A\\] { --tw-ring-color: ${brandColor} !important; }
    .focus\\:ring-\\[\\#2E847A\\]:focus { --tw-ring-color: ${brandColor} !important; }
    .hover\\:text-\\[\\#2E847A\\]:hover { color: ${brandColor} !important; }
    .hover\\:border-\\[\\#2E847A\\]\\/30:hover { border-color: ${brandColor}4D !important; }
    .ring-\\[\\#2E847A\\]\\/15 { --tw-ring-color: rgba(${brandRgb}, 0.15) !important; }
    .focus\\:border-\\[\\#2E847A\\]\\/30:focus { border-color: ${brandColor}4D !important; }
    .bg-\\[\\#2E847A\\]\\/10 { background-color: rgba(${brandRgb}, 0.1) !important; }
    .bg-\\[\\#2E847A\\]\\/5 { background-color: rgba(${brandRgb}, 0.05) !important; }
    .border-\\[\\#2E847A\\]\\/15 { border-color: rgba(${brandRgb}, 0.15) !important; }
    .text-\\[\\#2E847A\\]\\/80 { color: rgba(${brandRgb}, 0.8) !important; }
  `;

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#F5F5F7] font-sans">
      {currentUser && <style>{customStyles}</style>}
      
      {/* Apple-style background ambient blur blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 mix-blend-multiply blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 mix-blend-multiply blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-purple-400/10 mix-blend-multiply blur-[100px] pointer-events-none" />

      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
        registeredAgents={registeredAgents}
        userProfile={userProfile}
        onOpenSettings={() => setIsBrandingModalOpen(true)}
      />

      <BrandingSettingsModal 
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        userProfile={userProfile}
        uid={currentUser.uid}
      />
      
      <main className="relative z-10 flex-1 overflow-y-auto w-full">
        <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
          {currentView === 'dashboard' && (
            <DashboardView 
              finance={finance} 
              alerts={alerts} 
              onResolveAlert={handleResolveAlert}
              onSimulateMood={handleSimulateMood}
              onNavigateToProperties={handleNavigateToProperties}
              onNavigateToClients={handleNavigateToClientName}
              properties={properties}
              clients={clients}
            />
          )}
          {currentView === 'properties' && (
            <PropertiesView 
              properties={properties} 
              onAddProperty={handleAddProperty}
              onUpdateProperty={handleUpdateProperty}
              onDeleteProperty={handleDeleteProperty}
              clients={clients}
              onNavigateToClient={handleNavigateToClientName}
              initialStatusFilter={propertyStatusFilter}
              onStatusFilterChange={setPropertyStatusFilter}
              initialSearchQuery={propertySearchQuery}
              onSearchQueryChange={setPropertySearchQuery}
            />
          )}
          {currentView === 'clients' && (
            <ClientsView 
              clients={clients} 
              initialSearchQuery={clientSearchQuery}
              onClearSearch={() => setClientSearchQuery('')}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView 
              visits={visits} 
              properties={properties} 
              clients={clients} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
