import type {
  ServiceType,
  Vehicle,
} from "@/features/ride/types/ride";
import { publicVehicleService } from "@/features/ride/services/tripService";
import { MOCK_VEHICLES } from "@/features/ride/data/mock-vehicles";

/**
 * Customer-facing vehicle reads — prefer API, fall back to mock for offline/dev.
 */
export const vehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const list = await publicVehicleService.getVehicles();
      if (list.length > 0) return list;
    } catch {
      /* fall through */
    }
    return MOCK_VEHICLES.filter(
      (v) => v.active && (v.status ?? "AVAILABLE") === "AVAILABLE",
    );
  },

  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const v = await publicVehicleService.getVehicleById(id);
      if (v) return v;
    } catch {
      /* fall through */
    }
    const mock =
      MOCK_VEHICLES.find((v) => v.id === id && v.active) ?? null;
    if (!mock) return null;
    if ((mock.status ?? "AVAILABLE") !== "AVAILABLE") return null;
    return mock;
  },

  async getSuitableVehicles(params: {
    passengers: number;
    serviceType?: ServiceType;
  }): Promise<Vehicle[]> {
    try {
      const list = await publicVehicleService.getSuitableVehicles(params);
      if (list.length > 0) return list;
    } catch {
      /* fall through */
    }
    return MOCK_VEHICLES.filter((v) => {
      if (!v.active) return false;
      if ((v.status ?? "AVAILABLE") !== "AVAILABLE") return false;
      if (v.seats < params.passengers) return false;
      return true;
    }).sort((a, b) => a.seats - b.seats);
  },
};
