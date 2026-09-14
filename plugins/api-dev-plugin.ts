import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

type VercelLikeRes = ServerResponse & {
  status: (code: number) => VercelLikeRes;
  json: (body: unknown) => void;
};

function adaptRes(res: ServerResponse): VercelLikeRes {
  const out = res as VercelLikeRes;
  out.status = (code: number) => {
    res.statusCode = code;
    return out;
  };
  out.json = (body: unknown) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };
  return out;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

type Route = {
  method?: string;
  pattern: RegExp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: () => Promise<{ default: (req: any, res: any) => Promise<void> }>;
  params?: (match: RegExpMatchArray) => Record<string, string>;
};

const routes: Route[] = [
  {
    method: "POST",
    pattern: /^\/api\/auth\/login\/?$/,
    load: () => import("../api/auth/login.ts"),
  },
  {
    pattern: /^\/api\/borrowers\/?$/,
    load: () => import("../api/borrowers/index.ts"),
  },
  {
    pattern: /^\/api\/borrowers\/([^/]+)\/?$/,
    load: () => import("../api/borrowers/[id].ts"),
    params: (m) => ({ id: m[1] }),
  },
  {
    pattern: /^\/api\/loans\/?$/,
    load: () => import("../api/loans/index.ts"),
  },
  {
    pattern: /^\/api\/loans\/([^/]+)\/payments\/?$/,
    load: () => import("../api/loans/[id]/payments.ts"),
    params: (m) => ({ id: m[1] }),
  },
  {
    pattern: /^\/api\/loans\/([^/]+)\/?$/,
    load: () => import("../api/loans/[id]/index.ts"),
    params: (m) => ({ id: m[1] }),
  },
  {
    pattern: /^\/api\/schedules\/?$/,
    load: () => import("../api/schedules/index.ts"),
  },
  {
    pattern: /^\/api\/transactions\/?$/,
    load: () => import("../api/transactions/index.ts"),
  },
  {
    pattern: /^\/api\/finance\/?$/,
    load: () => import("../api/finance/index.ts"),
  },
  {
    pattern: /^\/api\/assets\/?$/,
    load: () => import("../api/assets/index.ts"),
  },
  {
    pattern: /^\/api\/stats\/?$/,
    load: () => import("../api/stats/index.ts"),
  },
  {
    pattern: /^\/api\/admin\/([^/]+)\/?$/,
    load: () => import("../api/admin/[action].ts"),
    params: (m) => ({ action: m[1] }),
  },
];

export function loanApiDevPlugin(): Plugin {
  return {
    name: "loan-api-dev",
    configureServer(server) {
      loadEnv({ path: resolve(process.cwd(), ".env") });

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api")) {
          next();
          return;
        }

        try {
          const pathOnly = url.split("?")[0] ?? url;
          const query = Object.fromEntries(
            new URL(url, "http://localhost").searchParams.entries(),
          );

          for (const route of routes) {
            if (route.method && req.method !== route.method) continue;
            const match = pathOnly.match(route.pattern);
            if (!match) continue;

            const body = ["POST", "PATCH", "PUT"].includes(req.method ?? "")
              ? await readBody(req)
              : {};

            const vercelReq = {
              method: req.method,
              headers: req.headers,
              body,
              query: {
                ...query,
                ...(route.params ? route.params(match) : {}),
              },
            };

            const mod = await route.load();
            await mod.default(vercelReq, adaptRes(res));
            return;
          }

          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "API route not found" }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "Internal server error",
            }),
          );
        }
      });
    },
  };
}
