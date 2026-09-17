import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { ScrollToTop } from "@/components/scroll-to-top";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/features/auth/require-auth";
import { LoginPage } from "@/features/auth/login-page";
import {
  ModuleRoute,
  PermissionRoute,
} from "@/features/auth/permission-route";
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
import { LEGACY_SERVICE_REDIRECTS } from "@/features/ride/seo/registry";
import { RideAdminLayout } from "@/features/ride-admin/components/ride-admin-layout";
import { RideAdminDashboardPage } from "@/features/ride-admin/pages/dashboard-page";
import { RideAdminBookingsPage } from "@/features/ride-admin/pages/bookings-page";
import { RideAdminBookingDetailPage } from "@/features/ride-admin/pages/booking-detail-page";
import { RideAdminVehiclesPage } from "@/features/ride-admin/pages/vehicles-page";
import { RideAdminVehicleDetailPage } from "@/features/ride-admin/pages/vehicle-detail-page";
import { RideAdminDriversPage } from "@/features/ride-admin/pages/drivers-page";
import { RideAdminDriverDetailPage } from "@/features/ride-admin/pages/driver-detail-page";
import { RideAdminTripsPage } from "@/features/ride-admin/pages/trips-page";
import { RideAdminTripDetailPage } from "@/features/ride-admin/pages/trip-detail-page";
import { RideAdminCustomersPage } from "@/features/ride-admin/pages/customers-page";
import { RideAdminCustomerDetailPage } from "@/features/ride-admin/pages/customer-detail-page";
import { RideAdminComingSoonPage } from "@/features/ride-admin/pages/coming-soon-page";
import { AccessControlLayout } from "@/features/access-control/components/access-control-layout";
import { UsersPage } from "@/features/access-control/pages/users-page";
import { UserDetailPage } from "@/features/access-control/pages/user-detail-page";
import { RolesPage } from "@/features/access-control/pages/roles-page";
import { RoleDetailPage } from "@/features/access-control/pages/role-detail-page";
import { AccessMatrixPage } from "@/features/access-control/pages/access-matrix-page";
import { AuditLogsPage } from "@/features/access-control/pages/audit-logs-page";
import { PERMISSIONS } from "@/config/permissions";

const RideHomePage = lazy(() =>
  import("@/features/ride/pages/ride-home-page").then((m) => ({
    default: m.RideHomePage,
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

function RideLazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
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
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/ride",
    element: <RidePublicLayout />,
    children: [
      {
        index: true,
        element: (
          <RideLazy>
            <RideHomePage />
          </RideLazy>
        ),
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
    path: "/",
    element: <RequireAuth />,
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
    element: <Navigate to="/apps" replace />,
  },
    ],
  },
]);
