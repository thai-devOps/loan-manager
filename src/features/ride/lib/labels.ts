import type {
  BookingStatus,
  RideCustomerStatus,
  ServiceType,
  SuitableFor,
  TripStatus,
  TripType,
} from "@/features/ride/types/ride";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  TRAVEL: "Du lịch",
  MEDICAL: "Khám bệnh",
  PILGRIMAGE: "Hành hương",
  AIRPORT: "Sân bay",
  BUSINESS: "Công tác",
  CUSTOM: "Theo yêu cầu",
};

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  ONE_WAY: "Một chiều",
  ROUND_TRIP: "Khứ hồi",
  DAILY: "Theo ngày",
  CUSTOM: "Theo yêu cầu",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  DRIVER_ASSIGNED: "Đã phân tài xế",
  DRIVER_ARRIVING: "Tài xế đang đến",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  DRAFT: "Nháp",
  CONFIRMED: "Đã xác nhận",
  ASSIGNED: "Đã phân xe/tài xế",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const CUSTOMER_STATUS_LABELS: Record<RideCustomerStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngưng",
};

export const SUITABLE_FOR_LABELS: Record<SuitableFor, string> = {
  travel: "Du lịch",
  medical: "Khám bệnh",
  pilgrimage: "Hành hương",
  airport: "Sân bay",
  business: "Công tác",
  family: "Gia đình",
  custom: "Theo yêu cầu",
};

export const BOOKING_STATUS_FLOW: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "IN_PROGRESS",
  "COMPLETED",
];

export const TRIP_STATUS_FLOW: TripStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
];

export function nextTripStatuses(from: TripStatus): TripStatus[] {
  const map: Record<TripStatus, TripStatus[]> = {
    DRAFT: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return map[from] ?? [];
}

export function canShowDriver(status: BookingStatus): boolean {
  return (
    status === "DRIVER_ASSIGNED" ||
    status === "DRIVER_ARRIVING" ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED"
  );
}

export function formatPassengers(n: number): string {
  return `${n} người`;
}
