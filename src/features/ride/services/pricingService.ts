import { ApiError } from "@/api/client";
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

    try {
      return await publicFetch<PriceQuote & { snapshot?: BookingQuoteSnapshot }>(
        "/api/ride/quote",
        {
          method: "POST",
          body: {
            tripType: params.tripType,
            vehicleId: params.vehicleId,
            pickup,
            destination,
            tollFee: params.tollFee ?? 0,
            parkingFee: params.parkingFee ?? 0,
            waitingFee: params.waitingFee ?? 0,
            serviceType: params.serviceType,
            date: params.date,
          },
        },
      );
    } catch (e) {
      if (e instanceof ApiError) {
        const code = (e as ApiError & { code?: string }).code;
        const mapped =
          code === "NO_ROUTE"
            ? "Không thể xác định tuyến đường. Vui lòng kiểm tra lại địa chỉ."
            : code === "TIMEOUT" || code === "UPSTREAM" || e.status === 502
              ? "Không thể tính khoảng cách lúc này."
              : e.message;
        return {
          display: "Liên hệ báo giá",
          amount: null,
          autoQuote: false,
          errorCode:
            code === "NO_ROUTE" ||
            code === "TIMEOUT" ||
            code === "UPSTREAM" ||
            code === "MISSING_KEY" ||
            code === "NO_PRICING_RULE_FOUND"
              ? code
              : "UPSTREAM",
          errorMessage: mapped,
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
