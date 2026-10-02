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

/** Independent trip lifecycle (fleet ops). */
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

export type VehicleFuelType =
  | "E10_RON95_III"
  | "E5_RON92_II"
  | "DO_005S_II"
  | "DO_0001S_V";

export type ConsumptionSource =
  | "manufacturer"
  | "manual"
  | "estimated"
  | "actual";

export type FuelConsumptionRates = {
  city: number;
  highway: number;
  mixed: number;
};

export type PricingStrategy = "PER_KM" | "DAILY" | "COST_PLUS";

export type VehiclePricingConfig = {
  fuelType?: VehicleFuelType | string;
  fuelConsumption?: FuelConsumptionRates;
  defaultConsumption?: number;
  consumptionSource?: ConsumptionSource;
  consumptionUpdatedAt?: string;
  fuelConsumptionPer100Km: number;
  fuelPricePerLiter: number;
  driverRate: number;
  baseFare: number;
  startupFee?: number;
  pricePerKm: number;
  dailyRate: number;
  includedKm: number;
  dailyIncludedKm?: number;
  extraKmRate: number;
  waitingHourlyRate?: number;
  depreciationPerKm?: number;
  operatingCostPerKm?: number;
  minimumTripPrice?: number;
  targetMargin?: number;
  priceRoundingUnit?: number;
  pricingStrategy?: PricingStrategy;
};

export type BookingFuelSnapshot = {
  vehicleId: string;
  fuelType: string;
  fuelPrice: number;
  fuelPriceEffectiveAt: string;
  billableDistanceKm: number;
  operationalDistanceKm: number;
  operationalDistanceFactor: number;
  routeCondition: "city" | "highway" | "mixed" | "default";
  consumptionLPer100Km: number;
  estimatedLiters: number;
  estimatedFuelCost: number;
  source: "PETROLIMEX" | "PVOIL";
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

export type QuoteBreakdownLine = {
  label: string;
  amount: number;
};

export type BookingQuoteSnapshot = {
  distanceKm: number;
  durationMinutes: number;
  billableDistanceKm?: number;
  operationalDistanceKm?: number;
  operationalDistanceFactor?: number;
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
  fuelSnapshot?: BookingFuelSnapshot | null;
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

/** Public pricing page — ACTIVE ROUTE/AIRPORT rules only. */
export type PublicPricingRoute = {
  id: string;
  name: string;
  type: "ROUTE" | "AIRPORT";
  origin: string;
  destination: string;
  vehicleCategory: VehicleCategory;
  serviceType: PricingServiceMatch;
  pricingConfig: {
    basePrice: number;
    pricePerKm: number;
    minimumPrice?: number;
    roundTrip?: boolean;
  };
  priority: number;
};

export type PublicPricingRoutesResponse = {
  items: PublicPricingRoute[];
};

/** Fixed-price matrix (customer pricing tables). */
export type PriceTripTypeCode =
  | "ONE_WAY"
  | "SAME_DAY_RETURN"
  | "TWO_DAYS_ONE_NIGHT";

export type RidePriceRoute = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  originKey: string;
  destinationKey: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RidePriceVehicleType = {
  id: string;
  name: string;
  seats: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RidePriceTripType = {
  id: string;
  code: PriceTripTypeCode;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RidePriceCell = {
  id: string;
  routeId: string;
  vehicleTypeId: string;
  tripTypeId: string;
  amount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicMatrixTripCol = {
  id: string;
  code: PriceTripTypeCode;
  name: string;
};

export type PublicMatrixVehicleRow = {
  id: string;
  name: string;
  seats: number;
  prices: Record<string, number | null>;
};

export type PublicMatrixRoute = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  tripTypes: PublicMatrixTripCol[];
  vehicles: PublicMatrixVehicleRow[];
};

export type PublicPricingMatrixResponse = {
  routes: PublicMatrixRoute[];
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

export type PricingCalculateResult = {
  matchedRuleId: string;
  matchedRuleName?: string;
  version: number;
  billableKm: number;
  breakdown: {
    basePrice: number;
    distancePrice: number;
    surcharges: number;
    total: number;
  };
  snapshot?: BookingPricingSnapshot;
  origin?: string;
  destination?: string;
  roundTrip?: boolean;
  date?: string;
  vehicleCategory?: VehicleCategory;
};

export type PricingRulesListResponse = {
  items: RidePricingRule[];
  summary: {
    total: number;
    active: number;
    draft: number;
    expired: number;
  };
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
  /** Parallel to `images` — Cloudinary public_id when uploaded via ImageUploader. */
  imagePublicIds?: string[];
  features: string[];
  suitableFor: SuitableFor[];
  pricing?: VehiclePricingConfig;
  active: boolean;
  status?: VehicleStatus;
  currentOdometer?: number | null;
  nextMaintenanceOdometer?: number | null;
  lastMaintenanceAt?: string | null;
  lastMaintenanceOdometer?: number | null;
  registrationExpiry?: string | null;
  insurances?: VehicleInsurance[];
  maintenanceLogs?: VehicleMaintenanceLog[];
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

export type RideCustomerStatus = "ACTIVE" | "INACTIVE";

export type RideCustomer = {
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
  quoteSnapshot?: BookingQuoteSnapshot | null;
  pricingSnapshot?: BookingPricingSnapshot | null;
  deposit?: number;
  paidAmount?: number;
  status: BookingStatus;
  driver?: TripDriver | null;
  tripId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type TripStatusEvent = {
  status: TripStatus;
  at: string;
  byUserId?: string | null;
  note?: string;
};

export type RideTrip = {
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
  actualCosts?: TripActualCosts | null;
  startOdometer?: number | null;
  endOdometer?: number | null;
  status: TripStatus;
  statusHistory: TripStatusEvent[];
  createdAt: string;
  updatedAt: string;
};

export type TripActualCostItem = {
  id: string;
  category: string;
  name: string;
  amount: number;
  note?: string;
};

export type TripActualCosts = {
  fuelLiters?: number | null;
  fuelPricePerLiter?: number | null;
  fuelAmount?: number | null;
  driverFee?: number | null;
  odoStart?: number | null;
  odoEnd?: number | null;
  actualDistanceKm?: number | null;
  items: TripActualCostItem[];
};

export type ScheduleItem = {
  kind: "trip" | "booking";
  id: string;
  code: string;
  status: string;
  serviceType?: string | null;
  customerName: string;
  pickupAddress: string;
  destinationAddress: string;
  startAt: string;
  endAt: string;
  startMs: number;
  endMs: number;
  vehicleId: string | null;
  driverId: string | null;
  tripId?: string | null;
  bookingId?: string | null;
  needsVehicle: boolean;
  needsDriver: boolean;
};

export type RideScheduleData = {
  from: string;
  to: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  items: ScheduleItem[];
  summary: {
    total: number;
    assigned: number;
    unassigned: number;
  };
};

export type FleetReminder = {
  id: string;
  severity: "info" | "warning" | "critical";
  vehicleId: string;
  vehicleName: string;
  message: string;
  kind: "maintenance" | "registration" | "insurance";
};

export type RideCustomerDetail = RideCustomer & {
  stats: {
    tripCount: number;
    completedTrips: number;
    totalRevenue: number;
    bookingCount: number;
  };
  recentTrips: RideTrip[];
  recentBookings: TripBooking[];
};

export type PriceQuote = {
  display: string;
  amount: number | null;
  autoQuote?: boolean;
  distanceKm?: number;
  billableDistanceKm?: number;
  operationalDistanceKm?: number;
  durationMinutes?: number;
  fuelLiters?: number;
  fuelCost?: number;
  driverCost?: number;
  tollFee?: number;
  parkingFee?: number;
  waitingFee?: number;
  additionalFee?: number;
  operatingCost?: number;
  subtotal?: number;
  totalPrice?: number | null;
  fuel?: {
    type?: string;
    price?: number;
    priceEffectiveAt?: string;
    consumption?: number;
    liters?: number;
    cost?: number;
  };
  breakdown?: QuoteBreakdownLine[];
  provider?: string;
  snapshot?: BookingQuoteSnapshot | null;
  pricingSnapshot?: BookingPricingSnapshot | null;
  pricing?: {
    totalCost?: number;
    customerPrice?: number | null;
    expectedProfit?: number | null;
    fare?: number;
  };
  matchedRuleId?: string;
  pricingVersion?: number;
  errorCode?:
    | "NO_ROUTE"
    | "TIMEOUT"
    | "UPSTREAM"
    | "MISSING_KEY"
    | "CUSTOM"
    | "NO_PRICING_RULE_FOUND"
    | "VEHICLE_NOT_FOUND"
    | "VEHICLE_FUEL_CONFIG_MISSING"
    | "FUEL_PRICE_NOT_FOUND"
    | "FUEL_CONSUMPTION_INVALID"
    | "DISTANCE_INVALID"
    | "QUOTATION_CALCULATION_FAILED";
  errorMessage?: string;
};

export type GeoSearchResult = {
  label: string;
  latitude: number;
  longitude: number;
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
  quoteSnapshot?: BookingQuoteSnapshot | null;
  pricingSnapshot?: BookingPricingSnapshot | null;
  quotedPrice?: number | null;
  /** Anti-spam: stable browser client id */
  clientId?: string;
  /** Honeypot — must stay empty */
  website?: string;
  /** Optional ACTIVE pricing rule from /ride/pricing */
  pricingRuleId?: string;
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
    profit?: number;
  };
  dispatchToday?: {
    total: number;
    assigned: number;
    unassigned: number;
  };
  reminders?: FleetReminder[];
  pending: TripBooking[];
  upcoming: TripBooking[];
  vehicleStats: {
    total: number;
    active: number;
    onTrip: number;
    maintenance: number;
  };
};
