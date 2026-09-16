import { MOCK_VEHICLES } from "@/features/ride/data/mock-vehicles";
import type {
  ServiceType,
  SuitableFor,
  Vehicle,
} from "@/features/ride/types/ride";

const SERVICE_TO_SUITABLE: Record<ServiceType, SuitableFor> = {
  TRAVEL: "travel",
  MEDICAL: "medical",
  PILGRIMAGE: "pilgrimage",
  AIRPORT: "airport",
  BUSINESS: "business",
  CUSTOM: "custom",
};

export const vehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    return MOCK_VEHICLES.filter((v) => v.active);
  },

  async getVehicleById(id: string): Promise<Vehicle | null> {
    return MOCK_VEHICLES.find((v) => v.id === id && v.active) ?? null;
  },

  async getSuitableVehicles(params: {
    passengers: number;
    serviceType?: ServiceType;
  }): Promise<Vehicle[]> {
    const tag = params.serviceType
      ? SERVICE_TO_SUITABLE[params.serviceType]
      : undefined;

    return MOCK_VEHICLES.filter((v) => {
      if (!v.active) return false;
      if (v.seats < params.passengers) return false;
      // CUSTOM / no serviceType: any vehicle that fits seats
      if (!tag || tag === "custom") return true;
      if (v.suitableFor.includes(tag)) return true;
      if (tag === "travel" && v.suitableFor.includes("family")) return true;
      return false;
    }).sort((a, b) => a.seats - b.seats);
  },
};
