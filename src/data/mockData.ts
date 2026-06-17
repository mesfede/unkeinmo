import { Property, Client, Visit, FinancialState, AgentAlert } from "../types";
import { addDays, subDays } from "date-fns";

const today = new Date();

export const MOCK_CLIENTS: Client[] = [
  {
    id: "client-propietario-1",
    name: "Elena Rodríguez",
    email: "elena.r@nemo.dev",
    phone: "+54 9 11 1234-5678",
    role: "Propietario",
    propertiesOwned: ["prop-1", "prop-3"],
    activeContracts: 2,
    valoration: "Excelente",
  },
  {
    id: "client-propietario-2",
    name: "Grupo Inversor Altea",
    email: "admin@grupoaltea.com.ar",
    phone: "+54 9 11 9123-4567",
    role: "Propietario",
    propertiesOwned: ["prop-2", "prop-4", "prop-5"],
    activeContracts: 1,
    valoration: "Excelente",
  },
  {
    id: "client-inquilino-1",
    name: "Martín Garcia",
    email: "mgarcia@mail.com",
    phone: "+54 9 11 5151-5151",
    role: "Inquilino",
    activeContracts: 1,
    valoration: "Excelente",
  },
  {
    id: "client-inquilino-3",
    name: "Javier Sánchez",
    email: "javi.sanchez.1990@gmail.com",
    phone: "+54 9 11 6119-8765",
    role: "Inquilino",
    activeContracts: 0,
    valoration: "Normal",
  },
  {
    id: "client-inquilino-2",
    name: "Ana López",
    email: "ana.lopez@mail.com",
    phone: "+54 9 11 4321-8765",
    role: "Inquilino",
    activeContracts: 1,
    valoration: "Mora",
  }
];

export const MOCK_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    address: "Av. Corrientes 450, CABA",
    category: "Departamento",
    operation: "Alquiler",
    status: "Ocupado",
    price: 450000,
    currency: "ARS",
    ownerId: "client-propietario-1",
    tenantId: "client-inquilino-1",
    features: { surface: 65, rooms: 3, bathrooms: 1, yearBuilt: 2010 },
    contract: { startDate: "2024-03-01", endDate: "2026-03-01", increasePeriods: "Cuatrimestral (ICL)" },
    auditReady: true,
  },
  {
    id: "prop-2",
    address: "Mz. 4 L. 12, Barrio El Palmar, Nordelta",
    category: "Lote",
    operation: "Venta",
    status: "Disponible",
    price: 185000,
    currency: "USD",
    ownerId: "client-propietario-2",
    features: { surface: 600 },
    auditReady: true,
  },
  {
    id: "prop-3",
    address: "Diagonal 80 N°235, La Plata",
    category: "Local",
    operation: "Alquiler",
    status: "Vencido",
    price: 650000,
    currency: "ARS",
    ownerId: "client-propietario-1",
    tenantId: "client-inquilino-2",
    features: { surface: 140, bathrooms: 2, yearBuilt: 2005 },
    contract: { startDate: "2022-01-01", endDate: "2024-01-01", increasePeriods: "Semestral (IPC)" },
    auditReady: false,
  },
  {
    id: "prop-4",
    address: "Casa Quinta Los Hornos",
    category: "Casa",
    operation: "Venta",
    status: "Disponible",
    price: 120000,
    currency: "USD",
    ownerId: "client-propietario-2",
    features: { surface: 250, rooms: 5, bathrooms: 3 },
    auditReady: true,
  },
  {
    id: "prop-5",
    address: "Rivadavia 1100 1°B",
    category: "Departamento",
    operation: "Alquiler",
    status: "Disponible",
    price: 360000,
    currency: "ARS",
    ownerId: "client-propietario-2",
    features: { surface: 48, rooms: 2, bathrooms: 1 },
    auditReady: false,
  }
];

export const MOCK_VISITS: Visit[] = [
  {
    id: "visit-1",
    propertyId: "prop-4",
    clientId: "client-inquilino-3",
    date: addDays(today, 2),
    status: "Pendiente",
  },
  {
    id: "visit-2",
    propertyId: "prop-1",
    clientId: "client-inquilino-1",
    date: subDays(today, 1),
    status: "Completada",
  },
];

export const MOCK_ALERTS: AgentAlert[] = [
  {
    id: "alert-1",
    title: "Contrato vencido – Local Diagonal 80",
    description: "Ana López · 150 días de mora",
    level: "Urgente",
    timestamp: new Date(),
    resolved: false,
    actionRequired: "Refacturar"
  },
  {
    id: "alert-2",
    title: "Cobro pendiente – Dep. Rivadavia",
    description: "Ana López · $320.000 adeudado",
    level: "Urgente",
    timestamp: subDays(new Date(), 1),
    resolved: false,
    actionRequired: "Exigir Pago"
  },
  {
    id: "alert-3",
    title: "Vence pronto – Dep. Rivadavia",
    description: "Ana López · Vence en unos días",
    level: "Alerta",
    timestamp: subDays(new Date(), 2),
    resolved: false
  },
  {
    id: "alert-4",
    title: "Aumento sin aplicar – Dep. Corrientes",
    description: "Martín Garcia · período cuatrimestral",
    level: "Alerta",
    timestamp: subDays(new Date(), 3),
    resolved: false,
    actionRequired: "Aplicar ICL"
  },
  {
    id: "alert-5",
    title: "Vence pronto – Dep. Corrientes",
    description: "Martín Garcia · Contrato activo",
    level: "Aviso",
    timestamp: subDays(new Date(), 4),
    resolved: false
  }
];

export const MOCK_FINANCE: FinancialState = {
  cashFlowARS: 2150000,
  expectedRevenueARS: 2800000,
  pendingUnreconciledARS: 650000,
  pipelineVentaUSD: 305000,
  moneyMood: "Calma",
};
