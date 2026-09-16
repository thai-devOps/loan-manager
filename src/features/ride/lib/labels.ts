import type {
  BookingStatus,
  ServiceType,
  SuitableFor,
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
