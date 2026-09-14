import { z } from "zod";

export const financeTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Chọn danh mục"),
  amount: z.number().int().positive("Số tiền phải lớn hơn 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  description: z.string().trim().min(1, "Vui lòng nhập nội dung"),
  note: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type FinanceTransactionFormValues = z.infer<
  typeof financeTransactionSchema
>;
