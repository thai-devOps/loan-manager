import { z } from "zod";

export const rideCustomerFormSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  phone: z.string().trim().min(8, "SĐT không hợp lệ"),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type RideCustomerFormValues = z.infer<typeof rideCustomerFormSchema>;
