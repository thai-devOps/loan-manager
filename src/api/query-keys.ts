export const queryKeys = {
  borrowers: {
    all: ["borrowers"] as const,
    detail: (id: string) => ["borrowers", id] as const,
  },
  loans: {
    all: (status?: string) =>
      status && status !== "ALL"
        ? (["loans", { status }] as const)
        : (["loans"] as const),
    detail: (id: string) => ["loans", id] as const,
  },
  transactions: {
    all: ["transactions"] as const,
  },
  schedules: {
    all: (status?: string) =>
      status && status !== "ALL"
        ? (["schedules", { status }] as const)
        : (["schedules"] as const),
  },
  stats: {
    all: ["stats"] as const,
  },
  finance: {
    all: ["finance"] as const,
    month: (month: string) => ["finance", { month }] as const,
    range: (from: string, to: string) => ["finance", { from, to }] as const,
  },
  assets: {
    all: ["assets"] as const,
    summary: ["assets", "summary"] as const,
    allocation: ["assets", "allocation"] as const,
    list: ["assets", "list"] as const,
    goldPurchases: ["assets", "gold-purchases"] as const,
    goldPlan: ["assets", "gold-plan"] as const,
    settings: ["assets", "settings"] as const,
    snapshots: (months: number) => ["assets", "snapshots", months] as const,
  },
};
