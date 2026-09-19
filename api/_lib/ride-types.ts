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

/** Independent trip lifecycle (fleet ops) — not the same as BookingStatus. */
export type TripStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "ASSIGNED"
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

export type VehiclePricingConfig = {
  fuelType?: string;
  fuelConsumptionPer100Km: number;
  fuelPricePerLiter: number;
  driverRate: number;
  baseFare: number;
  pricePerKm: number;
  dailyRate: number;
  includedKm: number;
  extraKmRate: number;
};

export type QuoteBreakdownLine = {
  label: string;
  amount: number;
};

export type BookingQuoteSnapshot = {
  distanceKm: number;
  durationMinutes: number;
  fuelPricePerLiter: number;
  fuelConsumptionPer100Km: number;
  fuelLiters: number;
  fuelCost: number;
  driverFee: number;
  tollFee: number;
  parkingFee: number;
  waitingFee: number;
  additionalFee: number;
  operatingCost: number;
  subtotal: number;
  totalPrice: number;
  breakdown: QuoteBreakdownLine[];
  provider?: string;
  quotedAt: string;
};

export type PricingRuleType =
  | "ROUTE"
  | "PER_KM"
  | "PER_DAY"
  | "AIRPORT"
  | "SURCHARGE";

export type PricingRuleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type VehicleCategory = "SEAT_4" | "SEAT_7" | "SEAT_16" | "ANY";

export type PricingServiceMatch = ServiceType | "ANY";

export type PricingRuleConfig = {
  basePrice?: number;
  pricePerKm?: number;
  minimumPrice?: number;
  pricePerDay?: number;
  overtimePricePerHour?: number;
  roundTrip?: boolean;
  surchargeType?: "fixed" | "percentage";
  surchargeAmount?: number;
  surchargePercentage?: number;
};

export type PricingRuleVersionSnapshot = {
  version: number;
  pricingConfig: PricingRuleConfig;
  archivedAt: string;
};

export type RidePricingRule = {
  _id?: string;
  id: string;
  name: string;
  type: PricingRuleType;
  serviceType: PricingServiceMatch;
  vehicleCategory: VehicleCategory;
  origin?: string;
  destination?: string;
  originKey?: string;
  destinationKey?: string;
  pricingConfig: PricingRuleConfig;
  priority: number;
  status: PricingRuleStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
  versionHistory: PricingRuleVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
};

export type BookingPricingSnapshot = {
  pricingRuleId: string;
  version: number;
  calculatedAt: string;
  basePrice: number;
  distanceKm: number;
  distancePrice: number;
  surcharges: number;
  total: number;
  originKey?: string;
  destinationKey?: string;
  vehicleCategory?: VehicleCategory;
  serviceType?: PricingServiceMatch;
  roundTrip?: boolean;
  /** Present when quote came from fixed price matrix */
  matrixRouteId?: string;
  matrixVehicleTypeId?: string;
  matrixTripTypeId?: string;
};

export type VehicleInsurance = {
  id: string;
  type: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  note?: string;
  attachmentUrl?: string | null;
};

export type VehicleMaintenanceLog = {
  id: string;
  date: string;
  odometer: number;
  title: string;
  cost?: number;
  garage?: string;
  note?: string;
  attachmentUrl?: string | null;
};

export type TripActualCostItem = {
  id: string;
  category: "toll" | "parking" | "wash" | "other" | string;
  name: string;
  amount: number;
  note?: string;
};

export type TripActualCosts = {
  fuelLiters?: number | null;
  fuelPricePerLiter?: number | null;
  fuelAmount?: number | null;
  driverFee?: number | null;
  items: TripActualCostItem[];
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
  /** Parallel to `images` — Cloudinary public_id when uploaded via ImageUploader. */
  imagePublicIds?: string[];
  features: string[];
  suitableFor: SuitableFor[];
  pricing?: VehiclePricingConfig;
  active: boolean;
  status: VehicleStatus;
  currentOdometer?: number | null;
  nextMaintenanceOdometer?: number | null;
  lastMaintenanceAt?: string | null;
  lastMaintenanceOdometer?: number | null;
  registrationExpiry?: string | null;
  insurances?: VehicleInsurance[];
  maintenanceLogs?: VehicleMaintenanceLog[];
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

export type RideCustomerStatus = "ACTIVE" | "INACTIVE";

export type RideCustomer = {
  _id?: string;
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string;
  status: RideCustomerStatus;
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
  quoteSnapshot?: BookingQuoteSnapshot | null;
  pricingSnapshot?: BookingPricingSnapshot | null;
  deposit: number;
  paidAmount: number;
  status: BookingStatus;
  driver?: TripDriverSnapshot | null;
  tripId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripStatusEvent = {
  status: TripStatus;
  at: string;
  byUserId?: string | null;
  note?: string;
};

export type RideTrip = {
  _id?: string;
  id: string;
  tripCode: string;
  bookingId?: string | null;
  bookingCode?: string | null;
  customerId?: string | null;
  customer: TripCustomer;
  pickup: Place;
  destination: Place;
  routeLabel?: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  /** ISO end time for scheduling/conflict (optional). */
  plannedEndAt?: string | null;
  plannedDurationMinutes?: number | null;
  vehicleId?: string | null;
  driverId?: string | null;
  tripType: TripType;
  passengers: number;
  note?: string;
  tripPrice: number;
  expenseTotal: number;
  revenueAmount: number;
  /** Actual operating costs (Phase 2). */
  actualCosts?: TripActualCosts | null;
  startOdometer?: number | null;
  endOdometer?: number | null;
  status: TripStatus;
  statusHistory: TripStatusEvent[];
  createdAt: string;
  updatedAt: string;
};
