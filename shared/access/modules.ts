export interface AccessModule {
  code: string;
  name: string;
}

export const MODULES: AccessModule[] = [
  { code: "finance", name: "Tài chính" },
  { code: "asset", name: "Tài sản" },
  { code: "loan", name: "Khoản vay" },
  { code: "gold", name: "Tích lũy vàng" },
  { code: "fleet", name: "Vận hành xe" },
  { code: "report", name: "Báo cáo" },
  { code: "settings", name: "Cài đặt" },
  { code: "user", name: "Người dùng" },
  { code: "role", name: "Vai trò" },
];

export const MODULE_CODES = MODULES.map((m) => m.code);
