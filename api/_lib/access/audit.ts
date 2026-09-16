import { randomUUID } from "node:crypto";
import type { AuditLog } from "./types.js";
import { auditLogsCol } from "../mongo.js";

export async function writeAuditLog(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const log: AuditLog = {
    id: randomUUID(),
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  const col = await auditLogsCol();
  await col.insertOne(log);
}
