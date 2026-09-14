import { z } from "zod";

const goldDetailsSchema = z.object({
  goldType: z.enum(["9999", "18k", "other"], {
    required_error: "Chọn loại vàng",
  }),
  quantity: z.number().positive("Khối lượng phải lớn hơn 0"),
  unit: z.enum(["cay", "chi", "phan"]),
  purchasePricePerChi: z
    .number()
    .int()
    .positive("Giá mua / chỉ phải lớn hơn 0"),
  totalCost: z.number().int().nonnegative("Thành tiền không hợp lệ"),
  seller: z.string().optional(),
});

export const manualAssetSchema = z
  .object({
    name: z.string().trim().min(1, "Vui lòng nhập tên tài sản"),
    type: z.enum(["cash", "bank", "wallet", "gold", "other"]),
    value: z.number().int().nonnegative("Giá trị không hợp lệ"),
    valuationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
    note: z.string().optional(),
    goldDetails: goldDetailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "gold") return;
    if (!data.goldDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập thông tin vàng",
        path: ["goldDetails"],
      });
      return;
    }
    if (data.value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Giá trị ước tính phải lớn hơn 0",
        path: ["value"],
      });
    }
    if (data.goldDetails.totalCost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thành tiền phải lớn hơn 0",
        path: ["goldDetails", "totalCost"],
      });
    }
  });

export type ManualAssetFormValues = z.infer<typeof manualAssetSchema>;

export const goldPurchaseSchema = z.object({
  type: z.enum(["9999", "18k", "other"]),
  quantity: z.number().positive("Khối lượng phải lớn hơn 0"),
  unit: z.enum(["cay", "chi", "phan"]),
  purchasePricePerChi: z.number().int().nonnegative("Giá mua không hợp lệ"),
  totalCost: z.number().int().nonnegative().optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  seller: z.string().optional(),
  note: z.string().optional(),
});

export type GoldPurchaseFormValues = z.infer<typeof goldPurchaseSchema>;

export const goldPlanSchema = z.object({
  targetAmount: z.number().int().positive("Mục tiêu phải lớn hơn 0"),
  monthlyBudget: z.number().int().positive("Ngân sách phải lớn hơn 0"),
  plannedPurchaseDay: z.number().int().min(1).max(28),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Tháng bắt đầu không hợp lệ"),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, "Tháng kết thúc không hợp lệ"),
  status: z.enum(["active", "paused", "completed"]),
});

export type GoldPlanFormValues = z.infer<typeof goldPlanSchema>;

export const allocationTargetsSchema = z
  .object({
    lending: z.number().min(0).max(100),
    reserve: z.number().min(0).max(100),
    gold: z.number().min(0).max(100),
  })
  .superRefine((v, ctx) => {
    if (Math.abs(v.lending + v.reserve + v.gold - 100) >= 0.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tổng mục tiêu phải bằng 100%",
        path: ["lending"],
      });
    }
  });

export type AllocationTargetsFormValues = z.infer<
  typeof allocationTargetsSchema
>;

export const goldPricesSchema = z.object({
  "9999": z.number().int().nonnegative(),
  "18k": z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
});
