import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelLoan as apiCancelLoan,
  createBorrower as apiCreateBorrower,
  createLoan as apiCreateLoan,
  importBackup,
  recordPayment,
  resetDatabase,
  seedDemo,
  updateBorrower as apiUpdateBorrower,
} from "@/api/endpoints";
import { queryKeys } from "@/api/query-keys";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { LoanFormValues } from "@/schemas/loan.schema";

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
  return useMutation({
    mutationFn: () => resetDatabase(),
    onSuccess: () => invalidate(),
  });
}

export function useImportBackupMutation() {
  const invalidate = useInvalidateAllData();
  return useMutation({
    mutationFn: (payload: unknown) => importBackup(payload),
    onSuccess: () => invalidate(),
  });
}
