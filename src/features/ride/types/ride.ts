export type ServiceType =
  | "TRAVEL"
  | "MEDICAL"
  | "PILGRIMAGE"
  | "AIRPORT"
  | "BUSINESS"
  | "CUSTOM";

export type TripType = "ONE_WAY" | "ROUND_TRIP" | "DAILY" | "CUSTOM";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ARRIVING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type SuitableFor =
  | "travel"
  | "medical"
  | "pilgrimage"
  | "airport"
  | "business"
  | "family"
  | "custom";

export type Place = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type Vehicle = {
  id: string;
  name: string;
  brand: string;
  model: string;
  seats: number;
  transmission: string;
  fuel: string;
  images: string[];
  features: string[];
  suitableFor: SuitableFor[];
  active: boolean;
};

export type TripCustomer = {
  name: string;
  phone: string;
};

export type TripDriver = {
  name: string;
  phone: string;
  vehiclePlate: string;
};

export type TripBooking = {
  id: string;
  bookingCode: string;
  serviceType: ServiceType;
  pickup: Place;
  destination: Place;
  pickupDate: string;
  pickupTime: string;
  tripType: TripType;
  passengers: number;
  vehicleId: string;
  customer: TripCustomer;
  note?: string;
  quotedPrice: number | null;
  status: BookingStatus;
  driver?: TripDriver | null;
  createdAt: string;
};

export type PriceQuote = {
  display: string;
  amount: number | null;
};

export type CreateTripInput = {
  serviceType: ServiceType;
  pickup: Place;
  destination: Place;
  pickupDate: string;
  pickupTime: string;
  tripType: TripType;
  passengers: number;
  vehicleId: string;
  customer: TripCustomer;
  note?: string;
};
