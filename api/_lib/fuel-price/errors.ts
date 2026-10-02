import { FuelSourceError } from "./sources/petrolimex/petrolimex.types.js";

export type FuelPriceErrorCode =
  | "PVOIL_FETCH_FAILED"
  | "PVOIL_TIMEOUT"
  | "PVOIL_INVALID_RESPONSE"
  | "PVOIL_NO_AVAILABLE_DATES"
  | "PVOIL_PARSE_FAILED"
  | "PVOIL_VALIDATION_FAILED"
  | "PVOIL_UNKNOWN_PRODUCT"
  | "FUEL_SOURCE_TIMEOUT"
  | "FUEL_SOURCE_HTTP_ERROR"
  | "FUEL_SOURCE_BLOCKED"
  | "FUEL_SOURCE_PARSE_ERROR"
  | "FUEL_SOURCE_INVALID_DATA"
  | "FUEL_SOURCE_DATABASE_ERROR"
  | "FUEL_SOURCE_UNKNOWN_ERROR"
  | "FUEL_SOURCE_BUSY"
  | "FUEL_SYNC_DISABLED"
  | "SOURCE_UNAVAILABLE"
  | "MONGODB_ERROR"
  | "UNAUTHORIZED";

const VI_MESSAGES: Record<FuelPriceErrorCode, string> = {
  PVOIL_FETCH_FAILED: "Không thể kết nối đến PVOIL.",
  PVOIL_TIMEOUT:
    "Hết thời gian chờ khi kết nối PVOIL (máy chủ Vercel thường ở ngoài VN; origin IP chậm/bị chặn). Thử lại hoặc tăng PVOIL_ORIGIN_TIMEOUT_MS / maxDuration.",
  PVOIL_INVALID_RESPONSE: "Dữ liệu giá xăng dầu từ PVOIL không hợp lệ.",
  PVOIL_NO_AVAILABLE_DATES: "PVOIL không có ngày giá hiệu lực.",
  PVOIL_PARSE_FAILED: "Không đọc được bảng giá từ PVOIL.",
  PVOIL_VALIDATION_FAILED: "Dữ liệu giá xăng dầu từ PVOIL không hợp lệ.",
  PVOIL_UNKNOWN_PRODUCT: "PVOIL trả sản phẩm nhiên liệu không nhận diện được.",
  FUEL_SOURCE_TIMEOUT: "Hết thời gian chờ khi lấy giá xăng dầu.",
  FUEL_SOURCE_HTTP_ERROR: "Không thể kết nối đến nguồn giá xăng dầu.",
  FUEL_SOURCE_BLOCKED: "Nguồn giá xăng dầu từ chối truy cập (403/429).",
  FUEL_SOURCE_PARSE_ERROR: "Không đọc được bảng giá xăng dầu.",
  FUEL_SOURCE_INVALID_DATA: "Dữ liệu giá xăng dầu không hợp lệ.",
  FUEL_SOURCE_DATABASE_ERROR: "Lỗi lưu dữ liệu giá xăng dầu.",
  FUEL_SOURCE_UNKNOWN_ERROR: "Lỗi đồng bộ giá xăng dầu không xác định.",
  FUEL_SOURCE_BUSY: "Đang có tiến trình đồng bộ giá xăng dầu — thử lại sau.",
  FUEL_SYNC_DISABLED: "Đồng bộ giá xăng dầu đang tắt (FUEL_SYNC_ENABLED).",
  SOURCE_UNAVAILABLE: "Không thể lấy dữ liệu giá xăng Petrolimex.",
  MONGODB_ERROR: "Lỗi lưu dữ liệu giá xăng dầu.",
  UNAUTHORIZED: "Bạn không có quyền thực hiện thao tác này.",
};

export class FuelPriceError extends Error {
  readonly code: FuelPriceErrorCode;

  constructor(code: FuelPriceErrorCode, detail?: string) {
    super(detail ? `${VI_MESSAGES[code]} ${detail}` : VI_MESSAGES[code]);
    this.name = "FuelPriceError";
    this.code = code;
  }

  toClientMessage(): string {
    return VI_MESSAGES[this.code];
  }
}

export function mapFuelSourceError(e: FuelSourceError): FuelPriceError {
  const code = e.code as FuelPriceErrorCode;
  if (code in VI_MESSAGES) {
    return new FuelPriceError(code, e.message);
  }
  return new FuelPriceError("SOURCE_UNAVAILABLE", e.message);
}

export function fuelPriceErrorToClient(e: unknown): {
  code: string;
  message: string;
} {
  if (e instanceof FuelSourceError) {
    const mapped = mapFuelSourceError(e);
    return {
      code: mapped.code,
      message: mapped.message?.trim() || mapped.toClientMessage(),
    };
  }
  if (e instanceof FuelPriceError) {
    return {
      code: e.code,
      message: e.message?.trim() || e.toClientMessage(),
    };
  }
  return {
    code: "SOURCE_UNAVAILABLE",
    message: VI_MESSAGES.SOURCE_UNAVAILABLE,
  };
}
