import { z } from "zod";

export const rideTripFormSchema = z
  .object({
    customerName: z.string().trim().min(1, "Vui lòng nhập tên khách"),
    customerPhone: z.string().trim().min(8, "SĐT không hợp lệ"),
    pickupAddress: z.string().trim().min(1, "Vui lòng nhập điểm đón"),
    destinationAddress: z.string().trim().min(1, "Vui lòng nhập điểm trả"),
    routeLabel: z.string().trim().optional(),
    pickupDate: z.string().trim().min(1, "Chọn ngày đi"),
    pickupTime: z.string().trim().min(1, "Chọn giờ đón"),
    returnDate: z.string().trim().optional().nullable(),
    returnTime: z.string().trim().optional().nullable(),
    vehicleId: z.string().optional().nullable(),
    driverId: z.string().optional().nullable(),
    tripType: z.enum(["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"]),
    passengers: z.number().int().min(1, "Ít nhất 1 khách"),
    note: z.string().trim().optional(),
    tripPrice: z.number().min(0),
    expenseTotal: z.number().min(0),
    revenueAmount: z.number().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.tripType === "ROUND_TRIP" && !data.returnDate?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Khứ hồi cần ngày về",
      });
    }
  });

export type RideTripFormValues = z.infer<typeof rideTripFormSchema>;
