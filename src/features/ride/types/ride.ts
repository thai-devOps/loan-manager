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

export type VehicleStatus =
  | "AVAILABLE"
  | "ON_TRIP"
  | "MAINTENANCE"
  | "INACTIVE";

export type DriverStatus = "AVAILABLE" | "ON_TRIP" | "OFF";

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
  licensePlate?: string;
  seats: number;
  transmission: string;
  fuel: string;
  year?: number;
  images: string[];
  features: string[];
  suitableFor: SuitableFor[];
  active: boolean;
  status?: VehicleStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  licenseType?: string;
  licenseExpiry?: string;
  active: boolean;
  status: DriverStatus;
  createdAt?: string;
  updatedAt?: string;
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
  driverId?: string | null;
  customerId?: string;
  customer: TripCustomer;
  note?: string;
  quotedPrice: number | null;
  deposit?: number;
  paidAmount?: number;
  status: BookingStatus;
  driver?: TripDriver | null;
  tripId?: string | null;
  createdAt: string;
  updatedAt?: string;
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

export type RideDashboardData = {
  range: string;
  from: string;
  to: string;
  stats: {
    bookingCount: number;
    tripCount: number;
    revenue: number;
    expense: number;
  };
  pending: TripBooking[];
  upcoming: TripBooking[];
  vehicleStats: {
    total: number;
    active: number;
    onTrip: number;
    maintenance: number;
  };
};
