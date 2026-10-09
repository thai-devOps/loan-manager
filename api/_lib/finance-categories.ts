import { randomUUID } from "node:crypto";
import type { FinanceCategoryDoc } from "./types.js";
import {
  financeCategoriesCol,
  financeTransactionsCol,
} from "./mongo.js";
import {
  decideCategoryDelete,
  isAllowedCategoryIcon,
  isHexColor,
  normalizeCategoryName,
  slugifyCategoryKey,
  type FinanceCategoryType,
} from "../../shared/finance/category-catalog.js";

export class FinanceCategoryError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "FinanceCategoryError";
    this.status = status;
  }
}

export type CategoryInput = {
  name?: string;
  description?: string;
  type?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
};

function parseType(raw: string | undefined): FinanceCategoryType {
  if (raw === "income" || raw === "expense") return raw;
  throw new FinanceCategoryError(400, "Loại danh mục không hợp lệ");
}

export function parseCategoryInput(
  body: CategoryInput,
  partial = false,
): Partial<
  Pick<
    FinanceCategoryDoc,
    "name" | "nameNormalized" | "description" | "type" | "icon" | "color" | "isActive" | "sortOrder"
  >
> {
  const out: Partial<
    Pick<
      FinanceCategoryDoc,
      "name" | "nameNormalized" | "description" | "type" | "icon" | "color" | "isActive" | "sortOrder"
    >
  > = {};

  if (!partial || body.name !== undefined) {
    const name = (body.name ?? "").trim().replace(/\s+/g, " ");
    if (!name || name.length > 80) {
      throw new FinanceCategoryError(400, "Tên danh mục không hợp lệ");
    }
    out.name = name;
    out.nameNormalized = normalizeCategoryName(name);
  }
  if (!partial || body.type !== undefined) {
    out.type = parseType(body.type);
  }
  if (!partial || body.icon !== undefined) {
    const icon = (body.icon ?? "").trim();
    if (!isAllowedCategoryIcon(icon)) {
      throw new FinanceCategoryError(400, "Biểu tượng không hợp lệ");
    }
    out.icon = icon;
  }
  if (!partial || body.color !== undefined) {
    const color = (body.color ?? "").trim();
    if (!isHexColor(color)) {
      throw new FinanceCategoryError(400, "Màu không hợp lệ");
    }
    out.color = color.toLowerCase();
  }
  if (body.description !== undefined || !partial) {
    const description = (body.description ?? "").trim();
    if (description.length > 200) {
      throw new FinanceCategoryError(400, "Mô tả tối đa 200 ký tự");
    }
    out.description = description || undefined;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new FinanceCategoryError(400, "Trạng thái không hợp lệ");
    }
    out.isActive = body.isActive;
  } else if (!partial) {
    out.isActive = true;
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (!Number.isFinite(n)) {
      throw new FinanceCategoryError(400, "Thứ tự không hợp lệ");
    }
    out.sortOrder = Math.round(n);
  } else if (!partial) {
    out.sortOrder = 0;
  }
  return out;
}

async function assertUniqueName(
  type: FinanceCategoryType,
  nameNormalized: string,
  exceptId?: string,
) {
  const col = await financeCategoriesCol();
  const existing = await col.findOne({ type, nameNormalized });
  if (existing && existing.id !== exceptId) {
    throw new FinanceCategoryError(409, "Đã có danh mục cùng tên");
  }
}

async function nextKey(type: FinanceCategoryType, name: string, exceptId?: string) {
  const col = await financeCategoriesCol();
  const base = slugifyCategoryKey(name);
  let key = base;
  let n = 2;
  while (true) {
    const hit = await col.findOne({ type, key });
    if (!hit || hit.id === exceptId) return key;
    key = `${base}_${n}`;
    n += 1;
  }
}

export async function listFinanceCategories(params: {
  type?: string;
  includeInactive?: boolean;
}): Promise<FinanceCategoryDoc[]> {
  const col = await financeCategoriesCol();
  const filter: Record<string, unknown> = {};
  if (params.type === "income" || params.type === "expense") {
    filter.type = params.type;
  }
  if (!params.includeInactive) filter.isActive = true;
  return col.find(filter).sort({ sortOrder: 1, name: 1 }).toArray();
}

export async function createFinanceCategory(
  body: CategoryInput,
): Promise<FinanceCategoryDoc> {
  const parsed = parseCategoryInput(body);
  const type = parsed.type!;
  const name = parsed.name!;
  await assertUniqueName(type, parsed.nameNormalized!);
  const now = new Date().toISOString();
  const id = randomUUID();
  const row: FinanceCategoryDoc = {
    _id: id,
    id,
    key: await nextKey(type, name),
    name,
    nameNormalized: parsed.nameNormalized!,
    description: parsed.description,
    type,
    icon: parsed.icon!,
    color: parsed.color!,
    isActive: parsed.isActive ?? true,
    sortOrder: parsed.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  const col = await financeCategoriesCol();
  try {
    await col.insertOne(row);
  } catch (e) {
    if (isDuplicate(e)) {
      throw new FinanceCategoryError(409, "Đã có danh mục cùng tên");
    }
    throw e;
  }
  return row;
}

export async function updateFinanceCategory(
  id: string,
  body: CategoryInput,
): Promise<FinanceCategoryDoc> {
  if (!id) throw new FinanceCategoryError(400, "Thiếu id");
  const col = await financeCategoriesCol();
  const current = await col.findOne({ id });
  if (!current) throw new FinanceCategoryError(404, "Không tìm thấy danh mục");
  const parsed = parseCategoryInput(body, true);
  const type = (parsed.type ?? current.type) as FinanceCategoryType;
  const nameNormalized = parsed.nameNormalized ?? current.nameNormalized;
  await assertUniqueName(type, nameNormalized, id);
  const $set: Record<string, unknown> = {
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
  try {
    const result = await col.findOneAndUpdate(
      { id },
      { $set },
      { returnDocument: "after" },
    );
    if (!result) throw new FinanceCategoryError(404, "Không tìm thấy danh mục");
    return result;
  } catch (e) {
    if (e instanceof FinanceCategoryError) throw e;
    if (isDuplicate(e)) {
      throw new FinanceCategoryError(409, "Đã có danh mục cùng tên");
    }
    throw e;
  }
}

export async function removeFinanceCategory(
  id: string,
): Promise<{ ok: true; deactivated: boolean }> {
  if (!id) throw new FinanceCategoryError(400, "Thiếu id");
  const col = await financeCategoriesCol();
  const current = await col.findOne({ id });
  if (!current) throw new FinanceCategoryError(404, "Không tìm thấy danh mục");
  const usage = await financeTransactionsCol().then((tx) =>
    tx.countDocuments({ category: current.key }),
  );
  if (decideCategoryDelete(usage) === "deactivate") {
    await col.updateOne(
      { id },
      { $set: { isActive: false, updatedAt: new Date().toISOString() } },
    );
    return { ok: true, deactivated: true };
  }
  await col.deleteOne({ id });
  return { ok: true, deactivated: false };
}

export async function assertActiveCategory(
  type: FinanceCategoryType,
  key: string,
  allowKey?: string,
): Promise<void> {
  if (allowKey && key === allowKey) return;
  const col = await financeCategoriesCol();
  const row = await col.findOne({ type, key, isActive: true });
  if (!row) {
    throw new Error("Danh mục không hợp lệ");
  }
}

function isDuplicate(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: number }).code === 11000
  );
}
