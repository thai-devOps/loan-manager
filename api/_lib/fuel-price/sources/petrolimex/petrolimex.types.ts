import type { FuelPriceProduct } from "../../types.js";

export type FuelSourceErrorCode =
  | "FUEL_SOURCE_TIMEOUT"
  | "FUEL_SOURCE_HTTP_ERROR"
  | "FUEL_SOURCE_BLOCKED"
  | "FUEL_SOURCE_PARSE_ERROR"
  | "FUEL_SOURCE_INVALID_DATA"
  | "FUEL_SOURCE_DATABASE_ERROR"
  | "FUEL_SOURCE_UNKNOWN_ERROR"
  | "FUEL_SOURCE_BUSY";

export class FuelSourceError extends Error {
  readonly code: FuelSourceErrorCode;
  readonly httpStatus?: number;

  constructor(
    code: FuelSourceErrorCode,
    message: string,
    httpStatus?: number,
  ) {
    super(message);
    this.name = "FuelSourceError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type EffectiveTimeSource = "SOURCE" | "CRAWL_TIME";

export type PetrolimexParseResult = {
  products: FuelPriceProduct[];
  effectiveAt: string;
  effectiveDateRaw: string;
  effectiveTimeSource: EffectiveTimeSource;
  sourceUrl: string;
  warnings: string[];
};
