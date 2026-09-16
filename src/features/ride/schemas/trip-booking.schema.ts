import { z } from "zod";

export const serviceTypeSchema = z.enum([
  "TRAVEL",
  "MEDICAL",
  "PILGRIMAGE",
  "AIRPORT",
  "BUSINESS",
  "CUSTOM",
]);

export const tripTypeSchema = z.enum([
  "ONE_WAY",
  "ROUND_TRIP",
  "DAILY",
  "CUSTOM",
]);

export const tripBookingFormSchema = z.object({
  serviceType: serviceTypeSchema,
  pickupAddress: z.string().trim().min(1, "Vui lòng nhập điểm đón"),
  destinationAddress: z.string().trim().min(1, "Vui lòng nhập điểm đến"),
  pickupDate: z.string().min(1, "Vui lòng chọn ngày đi"),
  pickupTime: z.string().min(1, "Vui lòng chọn giờ đón"),
  tripType: tripTypeSchema,
  passengers: z
    .number({ error: "Số khách không hợp lệ" })
    .int()
    .min(1, "Ít nhất 1 khách")
    .max(50, "Số khách quá lớn"),
  vehicleId: z.string().min(1, "Vui lòng chọn xe"),
  customerName: z.string().trim().min(1, "Vui lòng nhập họ và tên"),
  customerPhone: z
    .string()
    .trim()
    .min(9, "Số điện thoại không hợp lệ")
    .regex(/^[0-9+\s()-]+$/, "Số điện thoại không hợp lệ"),
  note: z.string().trim().optional(),
});

export type TripBookingFormValues = z.infer<typeof tripBookingFormSchema>;

export const tripLookupSchema = z.object({
  bookingCode: z.string().trim().min(1, "Vui lòng nhập mã chuyến"),
  phone: z
    .string()
    .trim()
    .min(9, "Số điện thoại không hợp lệ")
    .regex(/^[0-9+\s()-]+$/, "Số điện thoại không hợp lệ"),
});

export type TripLookupFormValues = z.infer<typeof tripLookupSchema>;

export const quickBookingSchema = z.object({
  pickup: z.string().trim().min(1, "Vui lòng nhập điểm đón"),
  destination: z.string().trim().min(1, "Vui lòng nhập điểm đến"),
  pickupDate: z.string().min(1, "Vui lòng chọn ngày đi"),
  pickupTime: z.string().min(1, "Vui lòng chọn giờ đón"),
  passengers: z
    .number({ error: "Số khách không hợp lệ" })
    .int()
    .min(1)
    .max(50),
  tripType: tripTypeSchema,
});

export type QuickBookingFormValues = z.infer<typeof quickBookingSchema>;
