import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";
import { ScrollToTop } from "@/components/scroll-to-top";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ModuleRoute,
  PermissionRoute,
} from "@/features/auth/permission-route";
import { RidePublicLayout } from "@/features/ride/components/ride-public-layout";
import { RideHomePage } from "@/features/ride/pages/ride-home-page";
import { LEGACY_SERVICE_REDIRECTS } from "@/features/ride/seo/registry";
import { PERMISSIONS } from "@/config/permissions";

// Route module exports `router` + lazy page bindings (not only components).
/* eslint-disable react-refresh/only-export-components */

const RequireAuth = lazy(() =>
  import("@/features/auth/require-auth").then((m) => ({
    default: m.RequireAuth,
  })),
);
const LoginPage = lazy(() =>
  import("@/features/auth/login-page").then((m) => ({ default: m.LoginPage })),
);
const AuthenticatedShell = lazy(() =>
  import("@/components/layout/authenticated-shell").then((m) => ({
    default: m.AuthenticatedShell,
  })),
);
const AppLayout = lazy(() =>
  import("@/components/layout/app-layout").then((m) => ({
    default: m.AppLayout,
  })),
);
const AppsHubPage = lazy(() =>
  import("@/features/apps/apps-hub-page").then((m) => ({
    default: m.AppsHubPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  })),
);
const BorrowersPage = lazy(() =>
  import("@/features/borrowers/borrowers-page").then((m) => ({
    default: m.BorrowersPage,
  })),
);
const BorrowerDetailPage = lazy(() =>
  import("@/features/borrowers/borrower-detail-page").then((m) => ({
    default: m.BorrowerDetailPage,
  })),
);
const LoansLayout = lazy(() =>
  import("@/features/loans/loans-layout").then((m) => ({
    default: m.LoansLayout,
  })),
);
const LoansPage = lazy(() =>
  import("@/features/loans/loans-page").then((m) => ({ default: m.LoansPage })),
);
const LoanDetailPage = lazy(() =>
  import("@/features/loans/loan-detail-page").then((m) => ({
    default: m.LoanDetailPage,
  })),
);
const PaymentsPage = lazy(() =>
  import("@/features/payments/payments-page").then((m) => ({
    default: m.PaymentsPage,
  })),
);
const SchedulesPage = lazy(() =>
  import("@/features/payments/schedules-page").then((m) => ({
    default: m.SchedulesPage,
  })),
);
const TransactionsPage = lazy(() =>
  import("@/features/transactions/transactions-page").then((m) => ({
    default: m.TransactionsPage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/features/reports/reports-page").then((m) => ({
    default: m.ReportsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/settings-page").then((m) => ({
    default: m.SettingsPage,
  })),
);
const SyncMonitorPage = lazy(() =>
  import("@/features/sync/sync-monitor-page").then((m) => ({
    default: m.SyncMonitorPage,
  })),
);
const ProfileLayout = lazy(() =>
  import("@/features/profile/profile-layout").then((m) => ({
    default: m.ProfileLayout,
  })),
);
const ProfilePage = lazy(() =>
  import("@/features/profile/profile-page").then((m) => ({
    default: m.ProfilePage,
  })),
);
const FinanceLayout = lazy(() =>
  import("@/features/finance/finance-layout").then((m) => ({
    default: m.FinanceLayout,
  })),
);
const FinanceOverviewPage = lazy(() =>
  import("@/features/finance/finance-overview-page").then((m) => ({
    default: m.FinanceOverviewPage,
  })),
);
const FinanceIncomePage = lazy(() =>
  import("@/features/finance/finance-income-page").then((m) => ({
    default: m.FinanceIncomePage,
  })),
);
const FinanceExpensesPage = lazy(() =>
  import("@/features/finance/finance-expenses-page").then((m) => ({
    default: m.FinanceExpensesPage,
  })),
);
const FinanceTransactionsPage = lazy(() =>
  import("@/features/finance/finance-transactions-page").then((m) => ({
    default: m.FinanceTransactionsPage,
  })),
);
const AssetsLayout = lazy(() =>
  import("@/features/assets/assets-layout").then((m) => ({
    default: m.AssetsLayout,
  })),
);
const AssetsOverviewPage = lazy(() =>
  import("@/features/assets/assets-overview-page").then((m) => ({
    default: m.AssetsOverviewPage,
  })),
);
const AssetsHoldingsPage = lazy(() =>
  import("@/features/assets/assets-holdings-page").then((m) => ({
    default: m.AssetsHoldingsPage,
  })),
);
const AssetsAllocationPage = lazy(() =>
  import("@/features/assets/assets-allocation-page").then((m) => ({
    default: m.AssetsAllocationPage,
  })),
);
const AssetsGoldPage = lazy(() =>
  import("@/features/assets/assets-gold-page").then((m) => ({
    default: m.AssetsGoldPage,
  })),
);
const AssetsGoldPlanPage = lazy(() =>
  import("@/features/assets/assets-gold-plan-page").then((m) => ({
    default: m.AssetsGoldPlanPage,
  })),
);
const AccessControlLayout = lazy(() =>
  import("@/features/access-control/components/access-control-layout").then(
    (m) => ({ default: m.AccessControlLayout }),
  ),
);
const UsersPage = lazy(() =>
  import("@/features/access-control/pages/users-page").then((m) => ({
    default: m.UsersPage,
  })),
);
const UserDetailPage = lazy(() =>
  import("@/features/access-control/pages/user-detail-page").then((m) => ({
    default: m.UserDetailPage,
  })),
);
const RolesPage = lazy(() =>
  import("@/features/access-control/pages/roles-page").then((m) => ({
    default: m.RolesPage,
  })),
);
const RoleDetailPage = lazy(() =>
  import("@/features/access-control/pages/role-detail-page").then((m) => ({
    default: m.RoleDetailPage,
  })),
);
const AccessMatrixPage = lazy(() =>
  import("@/features/access-control/pages/access-matrix-page").then((m) => ({
    default: m.AccessMatrixPage,
  })),
);
const AuditLogsPage = lazy(() =>
  import("@/features/access-control/pages/audit-logs-page").then((m) => ({
    default: m.AuditLogsPage,
  })),
);
const RideAdminLayout = lazy(() =>
  import("@/features/ride-admin/components/ride-admin-layout").then((m) => ({
    default: m.RideAdminLayout,
  })),
);
const RideAdminDashboardPage = lazy(() =>
  import("@/features/ride-admin/pages/dashboard-page").then((m) => ({
    default: m.RideAdminDashboardPage,
  })),
);
const RideAdminBookingsPage = lazy(() =>
  import("@/features/ride-admin/pages/bookings-page").then((m) => ({
    default: m.RideAdminBookingsPage,
  })),
);
const RideAdminBookingDetailPage = lazy(() =>
  import("@/features/ride-admin/pages/booking-detail-page").then((m) => ({
    default: m.RideAdminBookingDetailPage,
  })),
);
const RideAdminVehiclesPage = lazy(() =>
  import("@/features/ride-admin/pages/vehicles-page").then((m) => ({
    default: m.RideAdminVehiclesPage,
  })),
);
const RideAdminVehicleCreatePage = lazy(() =>
  import("@/features/ride-admin/pages/vehicle-create-page").then((m) => ({
    default: m.RideAdminVehicleCreatePage,
  })),
);
const RideAdminVehicleDetailPage = lazy(() =>
  import("@/features/ride-admin/pages/vehicle-detail-page").then((m) => ({
    default: m.RideAdminVehicleDetailPage,
  })),
);
const RideAdminDriversPage = lazy(() =>
  import("@/features/ride-admin/pages/drivers-page").then((m) => ({
    default: m.RideAdminDriversPage,
  })),
);
const RideAdminDriverDetailPage = lazy(() =>
  import("@/features/ride-admin/pages/driver-detail-page").then((m) => ({
    default: m.RideAdminDriverDetailPage,
  })),
);
const RideAdminTripsPage = lazy(() =>
  import("@/features/ride-admin/pages/trips-page").then((m) => ({
    default: m.RideAdminTripsPage,
  })),
);
const RideAdminTripDetailPage = lazy(() =>
  import("@/features/ride-admin/pages/trip-detail-page").then((m) => ({
    default: m.RideAdminTripDetailPage,
  })),
);
const RideAdminCustomersPage = lazy(() =>
  import("@/features/ride-admin/pages/customers-page").then((m) => ({
    default: m.RideAdminCustomersPage,
  })),
);
const RideAdminCustomerDetailPage = lazy(() =>
  import("@/features/ride-admin/pages/customer-detail-page").then((m) => ({
    default: m.RideAdminCustomerDetailPage,
  })),
);
const RideAdminComingSoonPage = lazy(() =>
  import("@/features/ride-admin/pages/coming-soon-page").then((m) => ({
    default: m.RideAdminComingSoonPage,
  })),
);
const RideServicesIndexPage = lazy(() =>
  import("@/features/ride/pages/ride-services-index-page").then((m) => ({
    default: m.RideServicesIndexPage,
  })),
);
const RideStaticServicePage = lazy(() =>
  import("@/features/ride/pages/ride-static-service-page").then((m) => ({
    default: m.RideStaticServicePage,
  })),
);
const RideLocationSeoPage = lazy(() =>
  import("@/features/ride/pages/ride-seo-route-pages").then((m) => ({
    default: m.RideLocationSeoPage,
  })),
);
const RideRouteSeoPage = lazy(() =>
  import("@/features/ride/pages/ride-seo-route-pages").then((m) => ({
    default: m.RideRouteSeoPage,
  })),
);
const RideNotFoundPage = lazy(() =>
  import("@/features/ride/pages/ride-seo-route-pages").then((m) => ({
    default: m.RideNotFoundPage,
  })),
);
const RideCarsPage = lazy(() =>
  import("@/features/ride/pages/ride-cars-page").then((m) => ({
    default: m.RideCarsPage,
  })),
);
const RideCarDetailPage = lazy(() =>
  import("@/features/ride/pages/ride-car-detail-page").then((m) => ({
    default: m.RideCarDetailPage,
  })),
);
const RideBookingPage = lazy(() =>
  import("@/features/ride/pages/ride-booking-page").then((m) => ({
    default: m.RideBookingPage,
  })),
);
const RideBookingSuccessPage = lazy(() =>
  import("@/features/ride/pages/ride-booking-success-page").then((m) => ({
    default: m.RideBookingSuccessPage,
  })),
);
const RideMyBookingPage = lazy(() =>
  import("@/features/ride/pages/ride-my-booking-page").then((m) => ({
    default: m.RideMyBookingPage,
  })),
);
const RidePricingPage = lazy(() =>
  import("@/features/ride/pages/ride-pricing-page").then((m) => ({
    default: m.RidePricingPage,
  })),
);
const RideContactPage = lazy(() =>
  import("@/features/ride/pages/ride-contact-page").then((m) => ({
    default: m.RideContactPage,
  })),
);

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function RideLazy({ children }: Readonly<{ children: ReactNode }>) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function AppLazy({ children }: Readonly<{ children: ReactNode }>) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function LegacyServiceSlugRedirect() {
  const { slug = "" } = useParams();
  const from = `/ride/services/${slug}`;
  const target = LEGACY_SERVICE_REDIRECTS[from] ?? "/ride/dich-vu";
  return <Navigate to={target} replace />;
}

function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
  {
    index: true,
    element: <Navigate to="/ride" replace />,
  },
  {
    path: "/login",
    element: (
      <AppLazy>
        <LoginPage />
      </AppLazy>
    ),
  },
  {
    path: "/ride",
    element: <RidePublicLayout />,
    children: [
      {
        index: true,
        element: <RideHomePage />,
      },
      {
        path: "dich-vu",
        element: (
          <RideLazy>
            <RideServicesIndexPage />
          </RideLazy>
        ),
      },
      {
        path: "xe-co-tai-xe",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="xe-co-tai-xe" />
          </RideLazy>
        ),
      },
      {
        path: "du-lich",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="du-lich" />
          </RideLazy>
        ),
      },
      {
        path: "kham-benh",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="kham-benh" />
          </RideLazy>
        ),
      },
      {
        path: "hanh-huong",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="hanh-huong" />
          </RideLazy>
        ),
      },
      {
        path: "dua-don-san-bay",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="dua-don-san-bay" />
          </RideLazy>
        ),
      },
      {
        path: "cong-tac",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="cong-tac" />
          </RideLazy>
        ),
      },
      {
        path: "lien-tinh",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="lien-tinh" />
          </RideLazy>
        ),
      },
      {
        path: "theo-yeu-cau",
        element: (
          <RideLazy>
            <RideStaticServicePage slug="theo-yeu-cau" />
          </RideLazy>
        ),
      },
      {
        path: "locations/:slug",
        element: (
          <RideLazy>
            <RideLocationSeoPage />
          </RideLazy>
        ),
      },
      {
        path: "routes/:slug",
        element: (
          <RideLazy>
            <RideRouteSeoPage />
          </RideLazy>
        ),
      },
      {
        path: "cars",
        element: (
          <RideLazy>
            <RideCarsPage />
          </RideLazy>
        ),
      },
      {
        path: "cars/:id",
        element: (
          <RideLazy>
            <RideCarDetailPage />
          </RideLazy>
        ),
      },
      {
        path: "booking",
        element: (
          <RideLazy>
            <RideBookingPage />
          </RideLazy>
        ),
      },
      {
        path: "booking/success",
        element: (
          <RideLazy>
            <RideBookingSuccessPage />
          </RideLazy>
        ),
      },
      {
        path: "my-booking",
        element: (
          <RideLazy>
            <RideMyBookingPage />
          </RideLazy>
        ),
      },
      {
        path: "pricing",
        element: (
          <RideLazy>
            <RidePricingPage />
          </RideLazy>
        ),
      },
      {
        path: "contact",
        element: (
          <RideLazy>
            <RideContactPage />
          </RideLazy>
        ),
      },
      { path: "services", element: <Navigate to="/ride/dich-vu" replace /> },
      { path: "services/:slug", element: <LegacyServiceSlugRedirect /> },
      {
        path: "*",
        element: (
          <RideLazy>
            <RideNotFoundPage />
          </RideLazy>
        ),
      },
    ],
  },
  {
    element: (
      <AppLazy>
        <RequireAuth />
      </AppLazy>
    ),
    children: [
      {
        path: "admin",
        children: [
          {
            element: <AuthenticatedShell />,
            children: [
              {
                element: (
                  <PermissionRoute
                    anyOf={[
                      PERMISSIONS.USER_VIEW,
                      PERMISSIONS.ROLE_VIEW,
                      PERMISSIONS.SETTINGS_VIEW,
                    ]}
                  />
                ),
                children: [
                  {
                    element: <AccessControlLayout />,
                    children: [
                      {
                        path: "users",
                        element: (
                          <PermissionRoute permission={PERMISSIONS.USER_VIEW} />
                        ),
                        children: [
                          { index: true, element: <UsersPage /> },
                          { path: ":id", element: <UserDetailPage /> },
                        ],
                      },
                      {
                        path: "roles",
                        element: (
                          <PermissionRoute permission={PERMISSIONS.ROLE_VIEW} />
                        ),
                        children: [
                          { index: true, element: <RolesPage /> },
                          { path: ":id", element: <RoleDetailPage /> },
                        ],
                      },
                      {
                        path: "access-control",
                        element: (
                          <PermissionRoute permission={PERMISSIONS.ROLE_VIEW}>
                            <AccessMatrixPage />
                          </PermissionRoute>
                        ),
                      },
                      {
                        path: "audit-logs",
                        element: (
                          <PermissionRoute
                            permission={PERMISSIONS.SETTINGS_VIEW}
                          >
                            <AuditLogsPage />
                          </PermissionRoute>
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            element: <ModuleRoute module="fleet" />,
            children: [
              {
                element: <RideAdminLayout />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/admin/dashboard" replace />,
                  },
                  {
                    path: "dashboard",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_DASHBOARD_VIEW}
                      >
                        <RideAdminDashboardPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "bookings",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_BOOKING_VIEW}
                      >
                        <RideAdminBookingsPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "bookings/:id",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_BOOKING_VIEW}
                      >
                        <RideAdminBookingDetailPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "vehicles",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_VEHICLE_VIEW}
                      >
                        <RideAdminVehiclesPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "vehicles/new",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_VEHICLE_CREATE}
                      >
                        <RideAdminVehicleCreatePage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "vehicles/:id",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_VEHICLE_VIEW}
                      >
                        <RideAdminVehicleDetailPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "drivers",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_DRIVER_VIEW}
                      >
                        <RideAdminDriversPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "drivers/:id",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_DRIVER_VIEW}
                      >
                        <RideAdminDriverDetailPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "trips",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_TRIP_VIEW}
                      >
                        <RideAdminTripsPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "trips/:id",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_TRIP_VIEW}
                      >
                        <RideAdminTripDetailPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "customers",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_CUSTOMER_VIEW}
                      >
                        <RideAdminCustomersPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "customers/:id",
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.FLEET_CUSTOMER_VIEW}
                      >
                        <RideAdminCustomerDetailPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: "pricing",
                    element: (
                      <RideAdminComingSoonPage title="Bảng giá" />
                    ),
                  },
                  {
                    path: "expenses",
                    element: <RideAdminComingSoonPage title="Chi phí" />,
                  },
                  {
                    path: "revenue",
                    element: (
                      <RideAdminComingSoonPage title="Doanh thu" />
                    ),
                  },
                  {
                    path: "reports",
                    element: (
                      <RideAdminComingSoonPage title="Báo cáo" />
                    ),
                  },
                  {
                    path: "settings",
                    element: (
                      <RideAdminComingSoonPage title="Cài đặt vận hành" />
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <AuthenticatedShell />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "apps", element: <AppsHubPage /> },
              {
                element: <ModuleRoute module="loan" />,
                children: [
                  {
                    element: <LoansLayout />,
                    children: [
                      { index: true, element: <DashboardPage /> },
                      { path: "borrowers", element: <BorrowersPage /> },
                      {
                        path: "borrowers/:id",
                        element: <BorrowerDetailPage />,
                      },
                      { path: "loans", element: <LoansPage /> },
                      { path: "loans/:id", element: <LoanDetailPage /> },
                      { path: "payments", element: <PaymentsPage /> },
                      { path: "schedules", element: <SchedulesPage /> },
                      {
                        path: "transactions",
                        element: <TransactionsPage />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "profile",
                element: <ProfileLayout />,
                children: [
                  { index: true, element: <ProfilePage /> },
                  {
                    path: "settings",
                    element: (
                      <PermissionRoute permission={PERMISSIONS.SETTINGS_VIEW}>
                        <SettingsPage />
                      </PermissionRoute>
                    ),
                  },
                  { path: "sync", element: <SyncMonitorPage /> },
                ],
              },
              {
                path: "finance",
                element: <ModuleRoute module="finance" />,
                children: [
                  {
                    element: <FinanceLayout />,
                    children: [
                      { index: true, element: <FinanceOverviewPage /> },
                      { path: "income", element: <FinanceIncomePage /> },
                      {
                        path: "expenses",
                        element: <FinanceExpensesPage />,
                      },
                      {
                        path: "transactions",
                        element: <FinanceTransactionsPage />,
                      },
                    ],
                  },
                ],
              },
              {
                path: "assets",
                element: <ModuleRoute module="asset" />,
                children: [
                  {
                    element: <AssetsLayout />,
                    children: [
                      { index: true, element: <AssetsOverviewPage /> },
                      {
                        path: "holdings",
                        element: <AssetsHoldingsPage />,
                      },
                      {
                        path: "allocation",
                        element: <AssetsAllocationPage />,
                      },
                      {
                        path: "gold",
                        element: (
                          <ModuleRoute module="gold">
                            <AssetsGoldPage />
                          </ModuleRoute>
                        ),
                      },
                      {
                        path: "gold-plan",
                        element: (
                          <ModuleRoute module="gold">
                            <AssetsGoldPlanPage />
                          </ModuleRoute>
                        ),
                      },
                    ],
                  },
                ],
              },
              {
                path: "reports",
                element: <ModuleRoute module="report" />,
                children: [
                  {
                    index: true,
                    element: (
                      <PermissionRoute
                        permission={PERMISSIONS.REPORT_LOAN_VIEW}
                      >
                        <ReportsPage />
                      </PermissionRoute>
                    ),
                  },
                ],
              },
              {
                path: "settings/sync",
                element: <Navigate to="/profile/sync" replace />,
              },
              {
                path: "settings",
                element: <Navigate to="/profile/settings" replace />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/ride" replace />,
  },
    ],
  },
]);
