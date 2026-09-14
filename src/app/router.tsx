import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { BorrowersPage } from "@/features/borrowers/borrowers-page";
import { BorrowerDetailPage } from "@/features/borrowers/borrower-detail-page";
import { LoansPage } from "@/features/loans/loans-page";
import { LoanDetailPage } from "@/features/loans/loan-detail-page";
import { PaymentsPage } from "@/features/payments/payments-page";
import { SchedulesPage } from "@/features/payments/schedules-page";
import { TransactionsPage } from "@/features/transactions/transactions-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { SettingsPage } from "@/features/settings/settings-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "borrowers", element: <BorrowersPage /> },
      { path: "borrowers/:id", element: <BorrowerDetailPage /> },
      { path: "loans", element: <LoansPage /> },
      { path: "loans/:id", element: <LoanDetailPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "schedules", element: <SchedulesPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
