import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { RequireAuth } from "@/features/auth/require-auth";
import { LoginPage } from "@/features/auth/login-page";
import { AppsHubPage } from "@/features/apps/apps-hub-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { BorrowersPage } from "@/features/borrowers/borrowers-page";
import { BorrowerDetailPage } from "@/features/borrowers/borrower-detail-page";
import { LoansLayout } from "@/features/loans/loans-layout";
import { LoansPage } from "@/features/loans/loans-page";
import { LoanDetailPage } from "@/features/loans/loan-detail-page";
import { PaymentsPage } from "@/features/payments/payments-page";
import { SchedulesPage } from "@/features/payments/schedules-page";
import { TransactionsPage } from "@/features/transactions/transactions-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { FinanceLayout } from "@/features/finance/finance-layout";
import { FinanceOverviewPage } from "@/features/finance/finance-overview-page";
import { FinanceIncomePage } from "@/features/finance/finance-income-page";
import { FinanceExpensesPage } from "@/features/finance/finance-expenses-page";
import { FinanceTransactionsPage } from "@/features/finance/finance-transactions-page";
import { AssetsLayout } from "@/features/assets/assets-layout";
import { AssetsOverviewPage } from "@/features/assets/assets-overview-page";
import { AssetsHoldingsPage } from "@/features/assets/assets-holdings-page";
import { AssetsAllocationPage } from "@/features/assets/assets-allocation-page";
import { AssetsGoldPage } from "@/features/assets/assets-gold-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AuthenticatedShell />,
        children: [
          { path: "apps", element: <AppsHubPage /> },
          {
            element: <AppLayout />,
            children: [
              {
                element: <LoansLayout />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: "borrowers", element: <BorrowersPage /> },
                  { path: "borrowers/:id", element: <BorrowerDetailPage /> },
                  { path: "loans", element: <LoansPage /> },
                  { path: "loans/:id", element: <LoanDetailPage /> },
                  { path: "payments", element: <PaymentsPage /> },
                  { path: "schedules", element: <SchedulesPage /> },
                  { path: "transactions", element: <TransactionsPage /> },
                  { path: "settings", element: <SettingsPage /> },
                ],
              },
              {
                path: "finance",
                element: <FinanceLayout />,
                children: [
                  { index: true, element: <FinanceOverviewPage /> },
                  { path: "income", element: <FinanceIncomePage /> },
                  { path: "expenses", element: <FinanceExpensesPage /> },
                  { path: "transactions", element: <FinanceTransactionsPage /> },
                ],
              },
              {
                path: "assets",
                element: <AssetsLayout />,
                children: [
                  { index: true, element: <AssetsOverviewPage /> },
                  { path: "holdings", element: <AssetsHoldingsPage /> },
                  { path: "allocation", element: <AssetsAllocationPage /> },
                  { path: "gold", element: <AssetsGoldPage /> },
                ],
              },
              { path: "reports", element: <ReportsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/apps" replace />,
  },
]);
