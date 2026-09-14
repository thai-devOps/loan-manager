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
};
