import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  deleteField
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, auth } from './firebase';
import { Property, Client, Visit, AgentAlert, FinancialState, SupportMessage } from '../types';
import { MOCK_PROPERTIES, MOCK_CLIENTS, MOCK_VISITS, MOCK_ALERTS } from '../data/mockData';

// --- Seeding Firestore if collection is empty ---
export async function seedDatabaseIfEmpty(agentId: string) {
  try {
    // For MEF Trial Account (unkeinmomef@unkeinmo.com), we explicitly want a completely clean, empty database.
    // If they logged in previously and seeded, we actively wipe those seeded mock documents, and skip seeding entirely.
    if (auth.currentUser?.email?.toLowerCase() === 'unkeinmomef@unkeinmo.com') {
      console.log('Skipping automatic database seeding for MEF Negocios Inmobiliarios to start with a clean empty slate.');
      const collectionsToClean = ['properties', 'clients', 'visits', 'alerts'];
      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where('agentId', '==', agentId));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          const id = d.id;
          const isMock = id.endsWith('_prop-1') || id.endsWith('_prop-2') || id.endsWith('_prop-3') || id.endsWith('_prop-4') || id.endsWith('_prop-5') ||
                         id.includes('_client-') || id.includes('_visit-') || id.includes('_alert-');
          if (isMock) {
            await deleteDoc(d.ref);
            console.log(`Deleted existing mock document ${id} from ${colName} for clean slate.`);
          }
        }
      }
      return;
    }

    // We seed the properties for any authorized logged-in user so they have the sample data ready to go!
    const unique = (id: string) => `${agentId}_${id}`;

    // 1. Seed Properties
    const queryProperties = await getDocs(query(collection(db, 'properties'), where('agentId', '==', agentId)));
    if (queryProperties.empty) {
      console.log('Seeding properties into Firestore...');
      for (const prop of MOCK_PROPERTIES) {
        const seededProp: any = {
          ...prop,
          id: unique(prop.id),
          ownerId: unique(prop.ownerId),
          agentId: agentId,
        };
        if (prop.tenantId) {
          seededProp.tenantId = unique(prop.tenantId);
        } else {
          delete seededProp.tenantId;
        }
        await setDoc(doc(db, 'properties', unique(prop.id)), seededProp);
      }
    }

    // 2. Seed Clients
    const queryClients = await getDocs(query(collection(db, 'clients'), where('agentId', '==', agentId)));
    if (queryClients.empty) {
      console.log('Seeding clients into Firestore...');
      for (const client of MOCK_CLIENTS) {
        const seededClient: any = {
          ...client,
          id: unique(client.id),
          agentId: agentId,
        };
        if (client.propertiesOwned) {
          seededClient.propertiesOwned = client.propertiesOwned.map(unique);
        } else {
          delete seededClient.propertiesOwned;
        }
        await setDoc(doc(db, 'clients', unique(client.id)), seededClient);
      }
    }

    // 3. Seed Visits
    const queryVisits = await getDocs(query(collection(db, 'visits'), where('agentId', '==', agentId)));
    if (queryVisits.empty) {
      console.log('Seeding visits into Firestore...');
      for (const visit of MOCK_VISITS) {
        await setDoc(doc(db, 'visits', unique(visit.id)), {
          ...visit,
          id: unique(visit.id),
          propertyId: unique(visit.propertyId),
          clientId: unique(visit.clientId),
          date: (visit.date instanceof Date ? visit.date.toISOString() : visit.date), // convert Date to ISO String for Firestore safety
          agentId: agentId,
        });
      }
    }

    // 4. Seed Alerts
    const queryAlerts = await getDocs(query(collection(db, 'alerts'), where('agentId', '==', agentId)));
    if (queryAlerts.empty) {
      console.log('Seeding alerts into Firestore...');
      for (const alert of MOCK_ALERTS) {
        await setDoc(doc(db, 'alerts', unique(alert.id)), {
          ...alert,
          id: unique(alert.id),
          timestamp: alert.timestamp.toISOString(), // convert Date to ISO String for Firestore safety
          agentId: agentId,
        });
      }
    }

    // 5. Migrate any legacy client roles (like Prospecto) to Inquilino so they can be assigned in Properties
    const allClientsSnapshot = await getDocs(query(collection(db, 'clients'), where('agentId', '==', agentId)));
    for (const docSnapshot of allClientsSnapshot.docs) {
      const data = docSnapshot.data();
      if (data.role === 'Prospecto' || (data.role && data.role !== 'Propietario' && data.role !== 'Inquilino')) {
        await updateDoc(docSnapshot.ref, { role: 'Inquilino' });
      }
    }

    // 6. Create or sync current user profile
    // This is handled immediately after login in App.tsx
  } catch (err) {
    console.error('Error during automatic database seeding: ', err);
  }
}

// --- Active Sync Listeners ---

export function syncProperties(agentId: string, onUpdate: (props: Property[]) => void, onError: (err: any) => void) {
  const path = 'properties';
  const q = query(collection(db, path), where('agentId', '==', agentId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Property[] = [];
      snapshot.forEach((snapshotDoc) => {
        items.push(snapshotDoc.data() as Property);
      });
      onUpdate(items);
    },
    (err) => {
      onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export function syncClients(agentId: string, onUpdate: (clients: Client[]) => void, onError: (err: any) => void) {
  const path = 'clients';
  const q = query(collection(db, path), where('agentId', '==', agentId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Client[] = [];
      snapshot.forEach((snapshotDoc) => {
        items.push(snapshotDoc.data() as Client);
      });
      onUpdate(items);
    },
    (err) => {
      onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export function syncVisits(agentId: string, onUpdate: (visits: Visit[]) => void, onError: (err: any) => void) {
  const path = 'visits';
  const q = query(collection(db, path), where('agentId', '==', agentId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Visit[] = [];
      snapshot.forEach((snapshotDoc) => {
        const rawData = snapshotDoc.data();
        items.push({
          ...rawData,
          date: new Date(rawData.date) // parse back timestamp
        } as Visit);
      });
      onUpdate(items);
    },
    (err) => {
      onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export function syncAlerts(agentId: string, onUpdate: (alerts: AgentAlert[]) => void, onError: (err: any) => void) {
  const path = 'alerts';
  const q = query(collection(db, path), where('agentId', '==', agentId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AgentAlert[] = [];
      snapshot.forEach((snapshotDoc) => {
        const rawData = snapshotDoc.data();
        items.push({
          ...rawData,
          timestamp: new Date(rawData.timestamp) // parse back timestamp
        } as AgentAlert);
      });
      onUpdate(items);
    },
    (err) => {
      onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export function syncUsers(onUpdate: (users: any[]) => void) {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((snapshotDoc) => {
        items.push(snapshotDoc.data());
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Error syncing online agents:', err);
    }
  );
}

// --- Write / Mutation Actions with strict validation wrappers and undefined-safety ---

// Helper to sanitize data for Firestore setDoc (removes undefined, sets to null or ignores)
function sanitizeForSet(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForSet).filter(item => item !== null && item !== undefined);
  }
  
  // Keep complex Firestore instances (like FieldValue) as is
  const proto = Object.getPrototypeOf(data);
  const isPlainObject = proto === null || proto === Object.prototype;
  if (!isPlainObject) {
    return data;
  }

  const clean: any = {};
  for (const key of Object.keys(data)) {
    const value = data[key];
    const sanitized = sanitizeForSet(value);
    if (sanitized !== undefined && sanitized !== null) {
      clean[key] = sanitized;
    }
  }
  return clean;
}

// Helper to sanitize data for Firestore updateDoc (maps top-level undefined to deleteField(), cleans nested objects)
function sanitizeForUpdate(data: any, isTopLevel = true): any {
  if (data === undefined) {
    return isTopLevel ? deleteField() : undefined;
  }
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForUpdate(item, false)).filter(item => item !== undefined);
  }

  // Keep complex Firestore instances (like FieldValue) as is
  const proto = Object.getPrototypeOf(data);
  const isPlainObject = proto === null || proto === Object.prototype;
  if (!isPlainObject) {
    return data;
  }

  const clean: any = {};
  for (const key of Object.keys(data)) {
    const value = data[key];
    const sanitizedValue = sanitizeForUpdate(value, false);
    if (sanitizedValue !== undefined) {
      clean[key] = sanitizedValue;
    } else if (isTopLevel) {
      // If it's top-level and undefined, map to deleteField() to physically delete in updateDoc
      clean[key] = deleteField();
    }
  }
  return clean;
}

export async function addPropertyToFirebase(prop: Property, agentId: string) {
  const path = `properties/${prop.id}`;
  try {
    const data = {
      ...prop,
      agentId,
    };
    await setDoc(doc(db, 'properties', prop.id), sanitizeForSet(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePropertyInFirebase(propId: string, updates: Partial<Property>, agentId: string) {
  const path = `properties/${propId}`;
  try {
    const docRef = doc(db, 'properties', propId);
    const sanitizedUpdates = sanitizeForUpdate({
      ...updates,
      agentId, // preserve agent link
    });
    await updateDoc(docRef, sanitizedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addClientToFirebase(client: Client, agentId: string) {
  const path = `clients/${client.id}`;
  try {
    const data = {
      ...client,
      agentId,
    };
    await setDoc(doc(db, 'clients', client.id), sanitizeForSet(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateClientInFirebase(clientId: string, updates: Partial<Client>) {
  const path = `clients/${clientId}`;
  try {
    const docRef = doc(db, 'clients', clientId);
    await updateDoc(docRef, sanitizeForUpdate(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addVisitToFirebase(visit: Visit, agentId: string) {
  const path = `visits/${visit.id}`;
  try {
    const data = {
      ...visit,
      date: (visit.date instanceof Date ? visit.date.toISOString() : visit.date),
      agentId,
    };
    await setDoc(doc(db, 'visits', visit.id), sanitizeForSet(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateVisitInFirebase(visitId: string, updates: Partial<Visit>) {
  const path = `visits/${visitId}`;
  try {
    const dataUpdates: any = { ...updates };
    if (updates.date) {
      dataUpdates.date = (updates.date instanceof Date ? updates.date.toISOString() : updates.date);
    }
    const docRef = doc(db, 'visits', visitId);
    await updateDoc(docRef, sanitizeForUpdate(dataUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addAlertToFirebase(alert: AgentAlert, agentId: string) {
  const path = `alerts/${alert.id}`;
  try {
    const data = {
      ...alert,
      timestamp: alert.timestamp.toISOString(),
      agentId,
    };
    await setDoc(doc(db, 'alerts', alert.id), sanitizeForSet(data));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAlertInFirebase(alertId: string, updates: Partial<AgentAlert>) {
  const path = `alerts/${alertId}`;
  try {
    const dataUpdates: any = { ...updates };
    if (updates.timestamp) {
      dataUpdates.timestamp = updates.timestamp.toISOString();
    }
    const docRef = doc(db, 'alerts', alertId);
    await updateDoc(docRef, sanitizeForUpdate(dataUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePropertyFromFirebase(propId: string) {
  const path = `properties/${propId}`;
  try {
    await deleteDoc(doc(db, 'properties', propId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteClientFromFirebase(clientId: string) {
  const path = `clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteVisitFromFirebase(visitId: string) {
  const path = `visits/${visitId}`;
  try {
    await deleteDoc(doc(db, 'visits', visitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateOrCreateUserProfile(uid: string, name: string, email: string, additionalData: any = {}) {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      name,
      email,
      agencyName: additionalData.agencyName || email.split('@')[0].toUpperCase(),
      brandColor: additionalData.brandColor || '#2E847A',
      logoUrl: additionalData.logoUrl || null,
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfileInFirebase(uid: string, updates: any) {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addSupportMessageToFirebase(msg: Omit<SupportMessage, 'id'>) {
  const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const path = `support_messages/${id}`;
  try {
    await setDoc(doc(db, 'support_messages', id), {
      id,
      ...msg
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function syncSupportMessages(onUpdate: (msgs: SupportMessage[]) => void, onError: (err: any) => void, chatId?: string) {
  const colRef = collection(db, 'support_messages');
  const q = chatId 
    ? query(colRef, where('chatId', '==', chatId)) 
    : query(colRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: SupportMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: data.id,
          chatId: data.chatId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          text: data.text,
          timestamp: data.timestamp,
          isFromAdmin: !!data.isFromAdmin,
        });
      });
      // Sort in-memory to prevent requiring composite Firestore indexes
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      onUpdate(msgs);
    },
    (err) => {
      console.error('Error syncing support messages:', err);
      onError(err);
    }
  );
}
