import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  importBackup,
  resetDatabase,
  seedDemo,
} from "@/api/endpoints";
import { queryKeys } from "@/api/query-keys";
import { assetRepository } from "@/db/repositories/assetRepository";
import { borrowerRepository } from "@/db/repositories/borrowerRepository";
import { financeRepository } from "@/db/repositories/financeRepository";
import { loanRepository } from "@/db/repositories/loanRepository";
import { requestSync } from "@/sync/syncManager";
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
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all }),
    ]);
}

export function useCreateBorrowerMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (values: BorrowerFormValues) =>
      borrowerRepository.create(values),
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
    }) => borrowerRepository.update(id, values),
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
    mutationFn: (values: LoanFormValues) => loanRepository.create(values),
    onSuccess: () => invalidate(),
  });
}

export function useCancelLoanMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (loanId: string) => loanRepository.cancel(loanId),
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
    }) => loanRepository.recordPayment(params),
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
    onSuccess: async () => {
      requestSync();
      await invalidate();
    },
  });
}

export function useResetDatabaseMutation() {
  const invalidate = useInvalidateAllData();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resetDatabase(),
    onSuccess: async () => {
      requestSync();
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: queryKeys.finance.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.all }),
      ]);
    },
  });
}

export function useImportBackupMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (payload: unknown) => importBackup(payload),
    onSuccess: async () => {
      requestSync();
      await invalidate();
    },
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
    ) => financeRepository.create(body),
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
    }) => financeRepository.update(id, values),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteFinanceTransactionMutation() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => financeRepository.remove(id),
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
      assetRepository.createManual(body),
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
    }) => assetRepository.updateManual(id, values),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteManualAssetMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: string) => assetRepository.removeManual(id),
    onSuccess: () => invalidate(),
  });
}

export function useCreateGoldPurchaseMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (body: Omit<GoldPurchase, "id" | "createdAt" | "updatedAt">) =>
      assetRepository.createGoldPurchase(body),
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
    }) => assetRepository.updateGoldPurchase(id, values),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteGoldPurchaseMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: string) => assetRepository.removeGoldPurchase(id),
    onSuccess: () => invalidate(),
  });
}

export function useUpsertGoldPlanMutation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (
      body: Omit<GoldPlan, "id" | "createdAt" | "updatedAt"> & {
        budgetEffectiveFrom?: string;
      },
    ) => assetRepository.upsertGoldPlan(body),
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
    }) => assetRepository.updateSettings(body),
    onSuccess: () => invalidate(),
  });
}
