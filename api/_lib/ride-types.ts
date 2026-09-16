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

export type TripCustomer = {
  name: string;
  phone: string;
};

export type TripDriverSnapshot = {
  name: string;
  phone: string;
  vehiclePlate: string;
};

export type RideVehicle = {
  _id?: string;
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
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
};

export type RideDriver = {
  _id?: string;
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  licenseType?: string;
  licenseExpiry?: string;
  active: boolean;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
};

export type RideCustomer = {
  _id?: string;
  id: string;
  name: string;
  phone: string;
  note?: string;
  tripCount: number;
  totalSpend: number;
  lastBookingAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RideBooking = {
  _id?: string;
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
  deposit: number;
  paidAmount: number;
  status: BookingStatus;
  driver?: TripDriverSnapshot | null;
  tripId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RideTrip = {
  _id?: string;
  id: string;
  bookingId: string;
  bookingCode: string;
  vehicleId: string;
  driverId: string;
  pickupDate: string;
  pickupTime: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};
