export type FuelPriceErrorCode =
  | "PVOIL_FETCH_FAILED"
  | "PVOIL_TIMEOUT"
  | "PVOIL_INVALID_RESPONSE"
  | "PVOIL_NO_AVAILABLE_DATES"
  | "PVOIL_PARSE_FAILED"
  | "PVOIL_VALIDATION_FAILED"
  | "PVOIL_UNKNOWN_PRODUCT"
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

export function fuelPriceErrorToClient(e: unknown): {
  code: string;
  message: string;
} {
  if (e instanceof FuelPriceError) {
    // Prefer full message (includes diagnostic detail after the VI prefix).
    return {
      code: e.code,
      message: e.message?.trim() || e.toClientMessage(),
    };
  }
  return {
    code: "PVOIL_FETCH_FAILED",
    message: VI_MESSAGES.PVOIL_FETCH_FAILED,
  };
}
