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
import { SyncMonitorPage } from "@/features/sync/sync-monitor-page";
import { ProfileLayout } from "@/features/profile/profile-layout";
import { ProfilePage } from "@/features/profile/profile-page";
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
import { AssetsGoldPlanPage } from "@/features/assets/assets-gold-plan-page";
import { RidePublicLayout } from "@/features/ride/components/ride-public-layout";
import { RideHomePage } from "@/features/ride/pages/ride-home-page";
import { RideServicesPage } from "@/features/ride/pages/ride-services-page";
import { RideServiceLandingPage } from "@/features/ride/pages/ride-service-landing-page";
import { RideCarsPage } from "@/features/ride/pages/ride-cars-page";
import { RideCarDetailPage } from "@/features/ride/pages/ride-car-detail-page";
import { RideBookingPage } from "@/features/ride/pages/ride-booking-page";
import { RideBookingSuccessPage } from "@/features/ride/pages/ride-booking-success-page";
import { RideMyBookingPage } from "@/features/ride/pages/ride-my-booking-page";
import { RidePricingPage } from "@/features/ride/pages/ride-pricing-page";
import { RideContactPage } from "@/features/ride/pages/ride-contact-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/ride",
    element: <RidePublicLayout />,
    children: [
      { index: true, element: <RideHomePage /> },
      { path: "services", element: <RideServicesPage /> },
      { path: "services/:slug", element: <RideServiceLandingPage /> },
      { path: "cars", element: <RideCarsPage /> },
      { path: "cars/:id", element: <RideCarDetailPage /> },
      { path: "booking", element: <RideBookingPage /> },
      { path: "booking/success", element: <RideBookingSuccessPage /> },
      { path: "my-booking", element: <RideMyBookingPage /> },
      { path: "pricing", element: <RidePricingPage /> },
      { path: "contact", element: <RideContactPage /> },
    ],
  },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AuthenticatedShell />,
        children: [
          // Keep AppLayout mounted across /apps ↔ modules so chrome doesn't remount
          {
            element: <AppLayout />,
            children: [
              { path: "apps", element: <AppsHubPage /> },
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
                ],
              },
              {
                path: "profile",
                element: <ProfileLayout />,
                children: [
                  { index: true, element: <ProfilePage /> },
                  { path: "settings", element: <SettingsPage /> },
                  { path: "sync", element: <SyncMonitorPage /> },
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
                  { path: "gold-plan", element: <AssetsGoldPlanPage /> },
                ],
              },
              { path: "reports", element: <ReportsPage /> },
              { path: "settings/sync", element: <Navigate to="/profile/sync" replace /> },
              { path: "settings", element: <Navigate to="/profile/settings" replace /> },
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
