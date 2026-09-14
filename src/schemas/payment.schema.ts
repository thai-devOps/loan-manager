import { z } from "zod";

export const paymentTypeSchema = z.enum([
  "INTEREST_PAYMENT",
  "PRINCIPAL_PAYMENT",
  "BOTH",
]);

export const paymentSchema = z
  .object({
    loanId: z.string().min(1, "Vui lòng chọn khoản vay"),
    paymentType: paymentTypeSchema,
    interestAmount: z.number().min(0).optional(),
    principalAmount: z.number().min(0).optional(),
    amount: z.number().optional(),
    transactionDate: z.string().min(1, "Vui lòng chọn ngày thu"),
    note: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === "INTEREST_PAYMENT") {
      const amount = data.amount ?? data.interestAmount ?? 0;
      if (amount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Số tiền lời phải lớn hơn 0",
        });
      }
    } else if (data.paymentType === "PRINCIPAL_PAYMENT") {
      const amount = data.amount ?? data.principalAmount ?? 0;
      if (amount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Số tiền gốc phải lớn hơn 0",
        });
      }
    } else {
      const interest = data.interestAmount ?? 0;
      const principal = data.principalAmount ?? 0;
      if (interest <= 0 && principal <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["interestAmount"],
          message: "Cần nhập ít nhất một trong hai: gốc hoặc lời",
        });
      }
      if (interest < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["interestAmount"],
          message: "Số tiền lời không được âm",
        });
      }
      if (principal < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["principalAmount"],
          message: "Số tiền gốc không được âm",
        });
      }
    }
  });

export type PaymentFormValues = z.infer<typeof paymentSchema>;
