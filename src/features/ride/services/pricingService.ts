import { ApiError } from "@/api/client";
import { getSession } from "@/lib/auth";
import { MOCK_PRICING } from "@/features/ride/data/mock-pricing";
import type {
  BookingQuoteSnapshot,
  Place,
  PriceQuote,
  PublicPricingMatrixResponse,
  PublicPricingRoute,
  PublicPricingRoutesResponse,
  TripType,
} from "@/features/ride/types/ride";

async function publicFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const session = getSession();
  if (session?.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      body:
        options.body === undefined
          ? undefined
          : typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    );
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  } & T;
  if (!res.ok) {
    const err = new ApiError(data.error ?? "Request failed", res.status);
    (err as ApiError & { code?: string }).code = data.code;
    throw err;
  }
  return data as T;
}

export type QuoteRequest = {
  tripType: TripType;
  vehicleId: string;
  pickup: Place;
  destination: Place;
  tollFee?: number;
  parkingFee?: number;
  waitingFee?: number;
  serviceType?: string;
  date?: string;
  time?: string;
  routeCondition?: "city" | "highway" | "mixed";
};

function normalizePlace(place: Place): Place {
  const lat =
    place.latitude === null || place.latitude === undefined
      ? null
      : Number(place.latitude);
  const lng =
    place.longitude === null || place.longitude === undefined
      ? null
      : Number(place.longitude);
  const usable =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);
  return {
    address: place.address,
    latitude: usable ? lat : null,
    longitude: usable ? lng : null,
  };
}

const FUEL_QUOTE_ERROR_MESSAGES: Record<string, string> = {
  VEHICLE_NOT_FOUND: "Không tìm thấy xe.",
  VEHICLE_FUEL_CONFIG_MISSING:
    "Xe chưa cấu hình nhiên liệu. Vui lòng liên hệ để được báo giá.",
  FUEL_PRICE_NOT_FOUND:
    "Chưa có giá nhiên liệu cho ngày chuyến. Vui lòng liên hệ để được báo giá.",
  FUEL_CONSUMPTION_INVALID: "Mức tiêu hao nhiên liệu không hợp lệ.",
  DISTANCE_INVALID: "Quãng đường không hợp lệ.",
  QUOTATION_CALCULATION_FAILED: "Không tính được báo giá lúc này.",
};

function mapQuoteError(
  code: string | undefined,
  fallback: string,
  status: number,
): { display: string; errorCode: PriceQuote["errorCode"]; errorMessage: string } {
  if (code && FUEL_QUOTE_ERROR_MESSAGES[code]) {
    return {
      display: "Liên hệ báo giá",
      errorCode: code as PriceQuote["errorCode"],
      errorMessage: FUEL_QUOTE_ERROR_MESSAGES[code],
    };
  }
  if (code === "NO_ROUTE") {
    return {
      display: "Liên hệ báo giá",
      errorCode: "NO_ROUTE",
      errorMessage:
        "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ.",
    };
  }
  if (code === "TIMEOUT" || code === "UPSTREAM" || status === 502) {
    return {
      display: "Liên hệ báo giá",
      errorCode: code === "TIMEOUT" ? "TIMEOUT" : "UPSTREAM",
      errorMessage: "Không thể tính khoảng cách lúc này.",
    };
  }
  if (code === "MISSING_KEY") {
    return {
      display: "Liên hệ báo giá",
      errorCode: "MISSING_KEY",
      errorMessage: fallback || "Không thể tính khoảng cách lúc này.",
    };
  }
  if (code === "NO_PRICING_RULE_FOUND") {
    return {
      display: "Liên hệ báo giá",
      errorCode: "NO_PRICING_RULE_FOUND",
      errorMessage: fallback || "Chưa có bảng giá phù hợp.",
    };
  }
  return {
    display: "Liên hệ báo giá",
    errorCode: "UPSTREAM",
    errorMessage: fallback || "Không thể tính khoảng cách lúc này.",
  };
}

export const pricingService = {
  async getQuote(params: QuoteRequest): Promise<PriceQuote> {
    if (!params.vehicleId) {
      return { display: "Chọn xe để xem giá", amount: null, autoQuote: false };
    }
    if (params.tripType === "CUSTOM") {
      return {
        display: "Liên hệ báo giá",
        amount: null,
        autoQuote: false,
        errorCode: "CUSTOM",
        errorMessage:
          "Chuyến tùy chỉnh — vui lòng gửi yêu cầu báo giá thủ công.",
      };
    }
    const pickup = normalizePlace(params.pickup);
    const destination = normalizePlace(params.destination);
    if (!pickup.address?.trim() || !destination.address?.trim()) {
      return {
        display: "Nhập điểm đón/đến để tính giá",
        amount: null,
        autoQuote: false,
      };
    }

    const body = {
      tripType: params.tripType,
      vehicleId: params.vehicleId,
      pickup,
      destination,
      tollFee: params.tollFee ?? 0,
      parkingFee: params.parkingFee ?? 0,
      waitingFee: params.waitingFee ?? 0,
      serviceType: params.serviceType,
      date: params.date,
      time: params.time,
      routeCondition: params.routeCondition,
    };

    try {
      // Attaches Bearer when logged in so admin receives internal breakdown.
      return await publicFetch<
        PriceQuote & { snapshot?: BookingQuoteSnapshot }
      >("/api/ride/quote", { method: "POST", body });
    } catch (e) {
      if (e instanceof ApiError) {
        const code = (e as ApiError & { code?: string }).code;
        const mapped = mapQuoteError(code, e.message, e.status);
        return {
          display: mapped.display,
          amount: null,
          autoQuote: false,
          errorCode: mapped.errorCode,
          errorMessage: mapped.errorMessage,
        };
      }
      return {
        display: "Liên hệ báo giá",
        amount: null,
        autoQuote: false,
        errorCode: "UPSTREAM",
        errorMessage: "Không thể tính khoảng cách lúc này.",
      };
    }
  },

  async getReferencePricing() {
    return MOCK_PRICING;
  },

  async listPublicRoutes(date?: string): Promise<PublicPricingRoute[]> {
    const qs =
      date && date.trim()
        ? `?date=${encodeURIComponent(date.trim())}`
        : "";
    const data = await publicFetch<PublicPricingRoutesResponse>(
      `/api/ride/pricing/routes${qs}`,
    );
    return data.items ?? [];
  },

  async getPublicMatrix(): Promise<PublicPricingMatrixResponse> {
    return publicFetch<PublicPricingMatrixResponse>(
      "/api/ride/pricing/matrix",
    );
  },
};
