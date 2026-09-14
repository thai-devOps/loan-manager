import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelLoan as apiCancelLoan,
  createBorrower as apiCreateBorrower,
  createFinanceTransaction,
  createGoldPurchase,
  createLoan as apiCreateLoan,
  createManualAsset,
  deleteFinanceTransaction,
  deleteGoldPurchase,
  deleteManualAsset,
  importBackup,
  recordPayment,
  resetDatabase,
  seedDemo,
  updateAssetSettings,
  updateBorrower as apiUpdateBorrower,
  updateFinanceTransaction,
  updateGoldPurchase,
  updateManualAsset,
  upsertGoldPlan,
} from "@/api/endpoints";
import { queryKeys } from "@/api/query-keys";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { LoanFormValues } from "@/schemas/loan.schema";
import type { FinanceTransaction } from "@/types/finance";
import type {
  AssetSettings,
  GoldPlan,
  GoldPurchase,
  ManualAsset,
} from "@/types/assets";

function useInvalidateAllData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.borrowers.all }),
      queryClient.invalidateQueries({ queryKey: ["loans"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      queryClient.invalidateQueries({ queryKey: ["schedules"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
    ]);
}

export function useCreateBorrowerMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (values: BorrowerFormValues) => apiCreateBorrower(values),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBorrowerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: BorrowerFormValues;
    }) => apiUpdateBorrower(id, values),
    onSuccess: (_data, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.borrowers.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.borrowers.detail(variables.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all }),
      ]),
  });
}

export function useCreateLoanMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (values: LoanFormValues) => apiCreateLoan(values),
    onSuccess: () => invalidate(),
  });
}

export function useCancelLoanMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (loanId: string) => apiCancelLoan(loanId),
    onSuccess: (_data, loanId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.loans.detail(loanId),
      });
      return invalidate();
    },
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (params: {
      loanId: string;
      paymentType: "INTEREST_PAYMENT" | "PRINCIPAL_PAYMENT" | "BOTH";
      amount?: number;
      interestAmount?: number;
      principalAmount?: number;
      transactionDate: string;
      note?: string;
    }) => {
      const { loanId, ...body } = params;
      return recordPayment(loanId, body);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.loans.detail(variables.loanId),
      });
      return invalidate();
    },
  });
}

export function useSeedDemoMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (force?: boolean) => seedDemo(force ?? false),
    onSuccess: () => invalidate(),
  });
}

export function useResetDatabaseMutation() {
  const invalidate = useInvalidateAllData();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetDatabase(),
    onSuccess: () =>
      Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.all }),
      ]),
  });
}

export function useImportBackupMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (payload: unknown) => importBackup(payload),
    onSuccess: () => invalidate(),
  });
}

function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
}

export function useCreateFinanceTransactionMutation() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (
      body: Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">,
    ) => createFinanceTransaction(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateFinanceTransactionMutation() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">;
    }) => updateFinanceTransaction(id, values),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteFinanceTransactionMutation() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => deleteFinanceTransaction(id),
    onSuccess: () => invalidate(),
  });
}

function useInvalidateAssets() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
}

export function useCreateManualAssetMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (body: Omit<ManualAsset, "id" | "createdAt" | "updatedAt">) =>
      createManualAsset(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateManualAssetMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Omit<ManualAsset, "id" | "createdAt" | "updatedAt">;
    }) => updateManualAsset(id, values),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteManualAssetMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: string) => deleteManualAsset(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateGoldPurchaseMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (body: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">) =>
      createGoldPurchase(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateGoldPurchaseMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">;
    }) => updateGoldPurchase(id, values),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteGoldPurchaseMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: string) => deleteGoldPurchase(id),
    onSuccess: () => invalidate(),
  });
}

export function useUpsertGoldPlanMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (body: Omit<GoldPlan, "id" | "createdAt" | "updatedAt">) =>
      upsertGoldPlan(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAssetSettingsMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (body: {
      goldReferencePricePerChi?: Partial<
        AssetSettings["goldReferencePricePerChi"]
      >;
      allocationTargets?: AssetSettings["allocationTargets"] | null;
    }) => updateAssetSettings(body),
    onSuccess: () => invalidate(),
  });
}
