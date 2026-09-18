import { randomUUID } from "node:crypto";
import { normalizeLocationKey } from "../../shared/ride/pricing-engine.js";
import {
  ridePriceCellsCol,
  ridePriceRoutesCol,
  ridePriceTripTypesCol,
  ridePriceVehicleTypesCol,
  stripDoc,
} from "./mongo.js";

export type PriceTripTypeCode =
  | "ONE_WAY"
  | "SAME_DAY_RETURN"
  | "TWO_DAYS_ONE_NIGHT";

export type RidePriceRoute = {
  _id?: string;
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
  _id?: string;
  id: string;
  name: string;
  seats: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RidePriceTripType = {
  _id?: string;
  id: string;
  code: PriceTripTypeCode;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RidePriceCell = {
  _id?: string;
  id: string;
  routeId: string;
  vehicleTypeId: string;
  tripTypeId: string;
  amount: number;
  active: boolean;
  updatedAt: string;
  createdAt: string;
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
  /** amount per tripType id; null = Liên hệ */
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

const DEFAULT_TRIP_TYPES: Array<{
  code: PriceTripTypeCode;
  name: string;
  sortOrder: number;
}> = [
  { code: "ONE_WAY", name: "Đi 1 chiều", sortOrder: 10 },
  { code: "SAME_DAY_RETURN", name: "Đi về trong ngày", sortOrder: 20 },
  { code: "TWO_DAYS_ONE_NIGHT", name: "Đi 2 ngày 1 đêm", sortOrder: 30 },
];

const DEFAULT_VEHICLES: Array<{ name: string; seats: number; sortOrder: number }> =
  [
    { name: "Xe 4 chỗ", seats: 4, sortOrder: 10 },
    { name: "Xe 7 chỗ", seats: 7, sortOrder: 20 },
    { name: "Xe 16 chỗ", seats: 16, sortOrder: 30 },
  ];

function nowIso(): string {
  return new Date().toISOString();
}

export async function ensurePriceMatrixSeeds(): Promise<void> {
  const trips = await ridePriceTripTypesCol();
  const tripCount = await trips.countDocuments();
  if (tripCount === 0) {
    const t = nowIso();
    await trips.insertMany(
      DEFAULT_TRIP_TYPES.map((d) => {
        const id = randomUUID();
        return {
          _id: id,
          id,
          code: d.code,
          name: d.name,
          active: true,
          sortOrder: d.sortOrder,
          createdAt: t,
          updatedAt: t,
        } satisfies RidePriceTripType;
      }),
    );
  }

  const vehicles = await ridePriceVehicleTypesCol();
  const vehicleCount = await vehicles.countDocuments();
  if (vehicleCount === 0) {
    const t = nowIso();
    await vehicles.insertMany(
      DEFAULT_VEHICLES.map((d) => {
        const id = randomUUID();
        return {
          _id: id,
          id,
          name: d.name,
          seats: d.seats,
          active: true,
          sortOrder: d.sortOrder,
          createdAt: t,
          updatedAt: t,
        } satisfies RidePriceVehicleType;
      }),
    );
  }
}

/* ---------- Routes ---------- */

export async function listPriceRoutes(includeInactive = true): Promise<
  RidePriceRoute[]
> {
  await ensurePriceMatrixSeeds();
  const col = await ridePriceRoutesCol();
  const filter = includeInactive ? {} : { active: true };
  const rows = await col.find(filter).sort({ sortOrder: 1, name: 1 }).toArray();
  return rows.map((r) => stripDoc(r) as RidePriceRoute);
}

export async function getPriceRoute(
  id: string,
): Promise<RidePriceRoute | null> {
  const col = await ridePriceRoutesCol();
  const row = await col.findOne({ id });
  return row ? (stripDoc(row) as RidePriceRoute) : null;
}

export async function createPriceRoute(input: {
  name?: string;
  origin: string;
  destination: string;
  active?: boolean;
  sortOrder?: number;
}): Promise<RidePriceRoute> {
  const origin = input.origin.trim();
  const destination = input.destination.trim();
  if (!origin || !destination) {
    throw new Error("Vui lòng nhập điểm đi và điểm đến");
  }
  const name =
    (input.name ?? "").trim() ||
    `${origin.toUpperCase()} - ${destination.toUpperCase()}`;
  const col = await ridePriceRoutesCol();
  const t = nowIso();
  const id = randomUUID();
  const doc: RidePriceRoute = {
    _id: id,
    id,
    name,
    origin,
    destination,
    originKey: normalizeLocationKey(origin),
    destinationKey: normalizeLocationKey(destination),
    active: input.active !== false,
    sortOrder: input.sortOrder ?? 100,
    createdAt: t,
    updatedAt: t,
  };
  await col.insertOne(doc);
  return stripDoc(doc) as RidePriceRoute;
}

export async function updatePriceRoute(
  id: string,
  input: Partial<{
    name: string;
    origin: string;
    destination: string;
    active: boolean;
    sortOrder: number;
  }>,
): Promise<RidePriceRoute> {
  const col = await ridePriceRoutesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy tuyến");
  const origin = (input.origin ?? current.origin).trim();
  const destination = (input.destination ?? current.destination).trim();
  const name = (input.name ?? current.name).trim();
  if (!origin || !destination || !name) {
    throw new Error("Thiếu tên hoặc điểm đi/đến");
  }
  const t = nowIso();
  const result = await col.findOneAndUpdate(
    { id },
    {
      $set: {
        name,
        origin,
        destination,
        originKey: normalizeLocationKey(origin),
        destinationKey: normalizeLocationKey(destination),
        active: input.active ?? current.active,
        sortOrder: input.sortOrder ?? current.sortOrder,
        updatedAt: t,
      },
    },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePriceRoute;
}

export async function deletePriceRoute(id: string): Promise<void> {
  const routes = await ridePriceRoutesCol();
  const result = await routes.deleteOne({ id });
  if (result.deletedCount === 0) throw new Error("Không tìm thấy tuyến");
  const cells = await ridePriceCellsCol();
  await cells.deleteMany({ routeId: id });
}

/* ---------- Vehicle types ---------- */

export async function listPriceVehicleTypes(
  includeInactive = true,
): Promise<RidePriceVehicleType[]> {
  await ensurePriceMatrixSeeds();
  const col = await ridePriceVehicleTypesCol();
  const filter = includeInactive ? {} : { active: true };
  const rows = await col
    .find(filter)
    .sort({ sortOrder: 1, seats: 1 })
    .toArray();
  return rows.map((r) => stripDoc(r) as RidePriceVehicleType);
}

export async function createPriceVehicleType(input: {
  name: string;
  seats: number;
  active?: boolean;
  sortOrder?: number;
}): Promise<RidePriceVehicleType> {
  const name = input.name.trim();
  const seats = Math.floor(Number(input.seats));
  if (!name) throw new Error("Vui lòng nhập tên loại xe");
  if (!Number.isFinite(seats) || seats < 1) {
    throw new Error("Số chỗ không hợp lệ");
  }
  const col = await ridePriceVehicleTypesCol();
  const t = nowIso();
  const id = randomUUID();
  const doc: RidePriceVehicleType = {
    _id: id,
    id,
    name,
    seats,
    active: input.active !== false,
    sortOrder: input.sortOrder ?? 100,
    createdAt: t,
    updatedAt: t,
  };
  await col.insertOne(doc);
  return stripDoc(doc) as RidePriceVehicleType;
}

export async function updatePriceVehicleType(
  id: string,
  input: Partial<{
    name: string;
    seats: number;
    active: boolean;
    sortOrder: number;
  }>,
): Promise<RidePriceVehicleType> {
  const col = await ridePriceVehicleTypesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy loại xe");
  const name = (input.name ?? current.name).trim();
  const seats = Math.floor(Number(input.seats ?? current.seats));
  if (!name || !Number.isFinite(seats) || seats < 1) {
    throw new Error("Thông tin loại xe không hợp lệ");
  }
  const result = await col.findOneAndUpdate(
    { id },
    {
      $set: {
        name,
        seats,
        active: input.active ?? current.active,
        sortOrder: input.sortOrder ?? current.sortOrder,
        updatedAt: nowIso(),
      },
    },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePriceVehicleType;
}

/* ---------- Trip types ---------- */

export async function listPriceTripTypes(
  includeInactive = true,
): Promise<RidePriceTripType[]> {
  await ensurePriceMatrixSeeds();
  const col = await ridePriceTripTypesCol();
  const filter = includeInactive ? {} : { active: true };
  const rows = await col
    .find(filter)
    .sort({ sortOrder: 1, name: 1 })
    .toArray();
  return rows.map((r) => stripDoc(r) as RidePriceTripType);
}

export async function updatePriceTripType(
  id: string,
  input: Partial<{ name: string; active: boolean; sortOrder: number }>,
): Promise<RidePriceTripType> {
  const col = await ridePriceTripTypesCol();
  const current = await col.findOne({ id });
  if (!current) throw new Error("Không tìm thấy hình thức");
  const name = (input.name ?? current.name).trim();
  if (!name) throw new Error("Tên hình thức không hợp lệ");
  const result = await col.findOneAndUpdate(
    { id },
    {
      $set: {
        name,
        active: input.active ?? current.active,
        sortOrder: input.sortOrder ?? current.sortOrder,
        updatedAt: nowIso(),
      },
    },
    { returnDocument: "after" },
  );
  return stripDoc(result!) as RidePriceTripType;
}

/* ---------- Cells ---------- */

export async function listPriceCells(routeId?: string): Promise<RidePriceCell[]> {
  const col = await ridePriceCellsCol();
  const filter = routeId ? { routeId } : {};
  const rows = await col.find(filter).toArray();
  return rows.map((r) => stripDoc(r) as RidePriceCell);
}

export async function upsertPriceCell(input: {
  routeId: string;
  vehicleTypeId: string;
  tripTypeId: string;
  amount: number | null;
}): Promise<RidePriceCell | null> {
  const { routeId, vehicleTypeId, tripTypeId } = input;
  if (!routeId || !vehicleTypeId || !tripTypeId) {
    throw new Error("Thiếu khóa giá");
  }
  const col = await ridePriceCellsCol();
  const t = nowIso();

  if (input.amount == null || !Number.isFinite(input.amount) || input.amount < 0) {
    await col.deleteOne({ routeId, vehicleTypeId, tripTypeId });
    return null;
  }

  const amount = Math.round(Number(input.amount));
  const existing = await col.findOne({ routeId, vehicleTypeId, tripTypeId });
  if (existing) {
    const result = await col.findOneAndUpdate(
      { id: existing.id },
      { $set: { amount, active: true, updatedAt: t } },
      { returnDocument: "after" },
    );
    return stripDoc(result!) as RidePriceCell;
  }

  const id = randomUUID();
  const doc: RidePriceCell = {
    _id: id,
    id,
    routeId,
    vehicleTypeId,
    tripTypeId,
    amount,
    active: true,
    createdAt: t,
    updatedAt: t,
  };
  await col.insertOne(doc);
  return stripDoc(doc) as RidePriceCell;
}

export async function upsertPriceCellsBulk(
  cells: Array<{
    routeId: string;
    vehicleTypeId: string;
    tripTypeId: string;
    amount: number | null;
  }>,
): Promise<{ updated: number }> {
  let updated = 0;
  for (const cell of cells) {
    await upsertPriceCell(cell);
    updated += 1;
  }
  return { updated };
}

/* ---------- Public matrix + lookup ---------- */

export async function getPublicPricingMatrix(): Promise<{
  routes: PublicMatrixRoute[];
}> {
  await ensurePriceMatrixSeeds();
  const [routes, vehicles, tripTypes, cells] = await Promise.all([
    listPriceRoutes(false),
    listPriceVehicleTypes(false),
    listPriceTripTypes(false),
    listPriceCells(),
  ]);

  const cellMap = new Map<string, number>();
  for (const c of cells) {
    if (!c.active) continue;
    cellMap.set(`${c.routeId}:${c.vehicleTypeId}:${c.tripTypeId}`, c.amount);
  }

  const tripCols: PublicMatrixTripCol[] = tripTypes.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
  }));

  const matrixRoutes: PublicMatrixRoute[] = routes.map((route) => ({
    id: route.id,
    name: route.name,
    origin: route.origin,
    destination: route.destination,
    tripTypes: tripCols,
    vehicles: vehicles.map((v) => {
      const prices: Record<string, number | null> = {};
      for (const tt of tripCols) {
        prices[tt.id] =
          cellMap.get(`${route.id}:${v.id}:${tt.id}`) ?? null;
      }
      return {
        id: v.id,
        name: v.name,
        seats: v.seats,
        prices,
      };
    }),
  }));

  return { routes: matrixRoutes };
}

export function mapBookingTripTypeToMatrixCode(
  tripType: string,
): PriceTripTypeCode | null {
  if (tripType === "ONE_WAY") return "ONE_WAY";
  if (tripType === "ROUND_TRIP") return "SAME_DAY_RETURN";
  return null;
}

export async function lookupMatrixPrice(params: {
  origin: string;
  destination: string;
  seats: number;
  tripType: string;
}): Promise<{
  amount: number;
  routeId: string;
  vehicleTypeId: string;
  tripTypeId: string;
  routeName: string;
  vehicleName: string;
  tripTypeName: string;
} | null> {
  await ensurePriceMatrixSeeds();
  const code = mapBookingTripTypeToMatrixCode(params.tripType);
  if (!code) return null;

  const originKey = normalizeLocationKey(params.origin);
  const destinationKey = normalizeLocationKey(params.destination);
  const seats = Math.max(1, Math.floor(Number(params.seats) || 1));

  const [routes, vehicles, tripTypes] = await Promise.all([
    listPriceRoutes(false),
    listPriceVehicleTypes(false),
    listPriceTripTypes(false),
  ]);

  const route =
    routes.find(
      (r) =>
        r.originKey === originKey && r.destinationKey === destinationKey,
    ) ??
    routes.find((r) => {
      const nameKey = normalizeLocationKey(r.name);
      return nameKey.includes(originKey) && nameKey.includes(destinationKey);
    });
  if (!route) return null;

  const tripType = tripTypes.find((t) => t.code === code);
  if (!tripType) return null;

  const suitable = vehicles
    .filter((v) => v.seats >= seats)
    .sort((a, b) => a.seats - b.seats || a.sortOrder - b.sortOrder);
  const vehicle = suitable[0] ?? null;
  if (!vehicle) return null;

  const cells = await ridePriceCellsCol();
  const cell = await cells.findOne({
    routeId: route.id,
    vehicleTypeId: vehicle.id,
    tripTypeId: tripType.id,
    active: true,
  });
  if (!cell || !Number.isFinite(cell.amount) || cell.amount <= 0) return null;

  return {
    amount: cell.amount,
    routeId: route.id,
    vehicleTypeId: vehicle.id,
    tripTypeId: tripType.id,
    routeName: route.name,
    vehicleName: vehicle.name,
    tripTypeName: tripType.name,
  };
}
