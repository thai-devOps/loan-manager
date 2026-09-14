import { z } from "zod";

export const loanSchema = z.object({
  borrowerId: z.string().min(1, "Vui lòng chọn người vay"),
  principalAmount: z
    .number({ error: "Số tiền gốc không hợp lệ" })
    .positive("Số tiền gốc phải lớn hơn 0"),
  monthlyInterestAmount: z
    .number({ error: "Tiền lời không hợp lệ" })
    .positive("Tiền lời hàng tháng phải lớn hơn 0"),
  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
  note: z.string().trim().optional(),
});

export type LoanFormValues = z.infer<typeof loanSchema>;
