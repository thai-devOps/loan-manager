import { z } from "zod";

export const borrowerSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên người vay"),
  phone: z.string().trim().optional(),
  identityNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type BorrowerFormValues = z.infer<typeof borrowerSchema>;
