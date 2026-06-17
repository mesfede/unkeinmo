export type PropertyCategory = "Casa" | "Lote" | "Departamento" | "Duplex" | "Oficina" | "Local" | "Terreno" | "Otro";
export type PropertyOperation = "Alquiler" | "Venta";
export type PropertyStatus = "Disponible" | "Ocupado" | "Reservado" | "Vencido" | "Vendido";
export type Currency = "ARS" | "USD";

export interface Property {
  id: string;
  address: string;
  category: PropertyCategory;
  operation: PropertyOperation;
  status: PropertyStatus;
  price: number;
  currency: Currency;
  ownerId: string;
  tenantId?: string;
  features: {
    surface: number;
    rooms?: number;
    bathrooms?: number;
    yearBuilt?: number;
  };
  contract?: {
    startDate: string;
    endDate: string;
    increasePeriods: string;
  };
  auditReady: boolean;
  mapUrl?: string;
}

export type ClientRole = "Propietario" | "Inquilino";
export type ClientValoration = "Excelente" | "Normal" | "Mora" | "Riesgo";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: ClientRole;
  propertiesOwned?: string[];
  activeContracts: number;
  valoration: ClientValoration;
}

export interface Visit {
  id: string;
  propertyId: string;
  clientId: string;
  date: Date;
  status: "Pendiente" | "Completada" | "Cancelada";
}

export interface FinancialState {
  cashFlowARS: number;
  expectedRevenueARS: number;
  pendingUnreconciledARS: number;
  pipelineVentaUSD: number;
  moneyMood: "Calma" | "Neutral" | "Estrés";
}

export interface AgentAlert {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  level: "Urgente" | "Alerta" | "Aviso" | "Pendiente";
  actionRequired?: string;
}
