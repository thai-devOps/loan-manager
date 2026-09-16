import type { VercelRequest, VercelResponse } from "@vercel/node";

export type ApiHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void>;

export type ApiRoute = {
  method?: string;
  pattern: RegExp;
  load: () => Promise<{ default: ApiHandler }>;
  params?: (match: RegExpMatchArray) => Record<string, string>;
};

/**
 * Single route table for Vite dev + Vercel Hobby gateway (1 serverless function).
 * Paths are matched against `/api/...` (no query string).
 */
export const API_ROUTES: ApiRoute[] = [
  {
    method: "POST",
    pattern: /^\/api\/auth\/login\/?$/,
    load: () => import("../_routes/auth/login.js"),
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/me\/?$/,
    load: () => import("../_routes/auth/me.js"),
  },
  {
    pattern: /^\/api\/users\/?$/,
    load: () => import("../_routes/users/index.js"),
  },
  {
    pattern: /^\/api\/users\/([^/]+)\/roles\/?$/,
    load: () => import("../_routes/users/[id]/roles.js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/users\/([^/]+)\/reset-password\/?$/,
    load: () => import("../_routes/users/[id]/reset-password.js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/users\/([^/]+)\/?$/,
    load: () => import("../_routes/users/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/roles\/?$/,
    load: () => import("../_routes/roles/index.js"),
  },
  {
    pattern: /^\/api\/roles\/([^/]+)\/permissions\/?$/,
    load: () => import("../_routes/roles/[id]/permissions.js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/roles\/([^/]+)\/?$/,
    load: () => import("../_routes/roles/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/permissions\/?$/,
    load: () => import("../_routes/permissions/index.js"),
  },
  {
    pattern: /^\/api\/audit-logs\/?$/,
    load: () => import("../_routes/audit-logs/index.js"),
  },
  {
    pattern: /^\/api\/borrowers\/?$/,
    load: () => import("../_routes/borrowers/index.js"),
  },
  {
    pattern: /^\/api\/borrowers\/([^/]+)\/?$/,
    load: () => import("../_routes/borrowers/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/loans\/?$/,
    load: () => import("../_routes/loans/index.js"),
  },
  {
    pattern: /^\/api\/loans\/([^/]+)\/payments\/?$/,
    load: () => import("../_routes/loans/[id]/payments.js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/loans\/([^/]+)\/?$/,
    load: () => import("../_routes/loans/[id]/index.js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/schedules\/?$/,
    load: () => import("../_routes/schedules/index.js"),
  },
  {
    pattern: /^\/api\/transactions\/?$/,
    load: () => import("../_routes/transactions/index.js"),
  },
  {
    pattern: /^\/api\/finance\/?$/,
    load: () => import("../_routes/finance/index.js"),
  },
  {
    pattern: /^\/api\/assets\/?$/,
    load: () => import("../_routes/assets/index.js"),
  },
  {
    pattern: /^\/api\/stats\/?$/,
    load: () => import("../_routes/stats/index.js"),
  },
  {
    pattern: /^\/api\/admin\/([^/]+)\/?$/,
    load: () => import("../_routes/admin/[action].js"),
    params: (m) => ({ action: m[1]! }),
  },
  {
    pattern: /^\/api\/ride\/dashboard\/?$/,
    load: () => import("../_routes/ride/dashboard.js"),
  },
  {
    pattern: /^\/api\/ride\/bookings\/lookup\/?$/,
    load: () => import("../_routes/ride/bookings/lookup.js"),
  },
  {
    pattern: /^\/api\/ride\/bookings\/?$/,
    load: () => import("../_routes/ride/bookings/index.js"),
  },
  {
    pattern: /^\/api\/ride\/bookings\/([^/]+)\/?$/,
    load: () => import("../_routes/ride/bookings/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/ride\/trips\/?$/,
    load: () => import("../_routes/ride/trips/index.js"),
  },
  {
    pattern: /^\/api\/ride\/trips\/([^/]+)\/?$/,
    load: () => import("../_routes/ride/trips/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/ride\/customers\/?$/,
    load: () => import("../_routes/ride/customers/index.js"),
  },
  {
    pattern: /^\/api\/ride\/customers\/([^/]+)\/?$/,
    load: () => import("../_routes/ride/customers/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/ride\/vehicles\/?$/,
    load: () => import("../_routes/ride/vehicles/index.js"),
  },
  {
    pattern: /^\/api\/ride\/vehicles\/([^/]+)\/?$/,
    load: () => import("../_routes/ride/vehicles/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
  {
    pattern: /^\/api\/ride\/drivers\/?$/,
    load: () => import("../_routes/ride/drivers/index.js"),
  },
  {
    pattern: /^\/api\/ride\/drivers\/([^/]+)\/?$/,
    load: () => import("../_routes/ride/drivers/[id].js"),
    params: (m) => ({ id: m[1]! }),
  },
];

export function resolveApiPath(req: VercelRequest): string {
  const q = req.query ?? {};
  const fromQuery = q.__path;
  if (typeof fromQuery === "string" && fromQuery.length > 0) {
    return `/api/${fromQuery.replace(/^\/+/, "")}`;
  }
  if (Array.isArray(fromQuery) && fromQuery[0]) {
    return `/api/${String(fromQuery[0]).replace(/^\/+/, "")}`;
  }

  const rawUrl = typeof req.url === "string" ? req.url : "/api";
  const pathOnly = rawUrl.split("?")[0] ?? "/api";
  if (pathOnly === "/api" || pathOnly === "/api/") {
    return "/api";
  }
  return pathOnly.startsWith("/api") ? pathOnly : `/api${pathOnly}`;
}

export async function dispatchApi(
  req: VercelRequest,
  res: VercelResponse,
): Promise<boolean> {
  const pathOnly = resolveApiPath(req);

  for (const route of API_ROUTES) {
    if (route.method && req.method !== route.method) continue;
    const match = pathOnly.match(route.pattern);
    if (!match) continue;

    const extra = route.params ? route.params(match) : {};
    const rawQuery = { ...(req.query ?? {}) } as Record<
      string,
      string | string[] | undefined
    >;
    delete rawQuery.__path;
    const nextQuery: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(rawQuery)) {
      if (value !== undefined) nextQuery[key] = value;
    }
    Object.assign(nextQuery, extra);
    req.query = nextQuery;

    const mod = await route.load();
    await mod.default(req, res);
    return true;
  }

  return false;
}
