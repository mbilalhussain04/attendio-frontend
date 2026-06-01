import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/auth-context.jsx";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader } from "./components/loader/dotLoader.jsx";
import { moduleEnabled } from "./config/workspaceProfiles.js";
import { useBillingStatusQuery } from "./hooks/useBillingService.ts";

import AuthLayout from "./pages/layoutes/auth-layout.jsx";
import HomePage from "./pages/root/homePage.jsx";
import SignIn from "./pages/authModule/sign-in.jsx";
import SignUp from "./pages/authModule/sign-up.jsx";
import ForgotPassword from "./pages/authModule/forgot-password.jsx";
import ResetPassword from "./pages/authModule/reset-password.jsx";
import VerifyEmail from "./pages/authModule/verify-email.jsx";
import CatchAll from "./pages/authModule/catch-all.jsx";

import MainLayout from "./pages/layoutes/MainLayout.jsx";
import Dashboard from "./pages/dashboardModule/dashboard.jsx";
import WorkspacePage from "./pages/dashboardModule/WorkspacePage.jsx";
import WorkspaceOnboarding from "./pages/onboarding/WorkspaceOnboarding.jsx";
const EmployeesPage = lazy(() => import("./pages/dashboardModule/EmployeesPage.jsx"));
const ProfilePage = lazy(() => import("./pages/dashboardModule/ProfilePage.jsx"));
const AttendancePage = lazy(() => import("./pages/dashboardModule/AttendancePage.jsx"));
const TimesheetsPage = lazy(() => import("./pages/dashboardModule/TimesheetsPage.jsx"));
const KioskPage = lazy(() => import("./pages/dashboardModule/KioskPage.jsx"));
const CompliancePage = lazy(() => import("./pages/dashboardModule/CompliancePage.jsx"));
const LeavesPage = lazy(() => import("./pages/dashboardModule/LeavesPage.jsx"));
const SchedulingPage = lazy(() => import("./pages/dashboardModule/SchedulingPage.jsx"));
const AuthApiConsole = lazy(() => import("./pages/dashboardModule/AuthApiConsole.jsx"));

function PageLoader() {
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center rounded-[1.4rem] border border-blue-100 bg-white/85 shadow-lg shadow-blue-500/5">
      <div className="grid gap-3 text-center">
        <Loader />
        <p className="text-sm font-black text-blue-600">Loading workspace...</p>
      </div>
    </div>
  );
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const hasAnyPermission = (user, permissions = []) => {
  if (!permissions.length) return true;
  const owned = new Set(user?.permissions || []);
  return permissions.some((permission) => owned.has(permission));
};

function ModuleRoute({ moduleKey, anyPermission = [], children }) {
  const { user } = useAuth();
  if (moduleKey && !moduleEnabled(user?.company, moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!hasAnyPermission(user, anyPermission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function ProtectedRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) return <Navigate to="/sign-in" replace state={{ from: location }} />;
  if (user?.email_verified === false && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace state={{ authFlow: "email-verification" }} />;
  }
  if (!user?.is_kiosk && user?.company && user.company.onboarding_completed === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  if (location.pathname === "/onboarding" && user?.company?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }
  if (user?.is_kiosk && location.pathname !== "/attendance") {
    return <Navigate to="/attendance" replace />;
  }
  return children;
}

function BillingAccessGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canManageBilling = ["settings.tenant", "billing.manage", "reports.company"].some((permission) => (user?.permissions || []).includes(permission));
  const billing = useBillingStatusQuery(Boolean(user) && canManageBilling);
  const subscription = billing.data?.data?.subscription;
  const blocked = subscription?.billing_enabled && subscription?.access?.workspace_locked && location.pathname !== "/settings";

  return (
    <>
      {children}
      {blocked && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.25rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Payment needed</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Workspace billing needs attention</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Your trial or subscription is not active. Update payment to keep admin access running. Employee accounts do not see billing controls.</p>
            <button type="button" onClick={() => navigate("/settings?tab=billing")} className="mt-5 h-11 w-full rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/20">Open billing</button>
          </div>
        </div>
      )}
    </>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthLayout />}>
        <Route index element={<HomePage />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route path="sign-up" element={<SignUp />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="*" element={<CatchAll />} />

      </Route>

      <Route
        element={
          <ProtectedRoute>
            <BillingAccessGuard>
              <MainLayout />
            </BillingAccessGuard>
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="onboarding" element={<WorkspaceOnboarding />} />
        <Route path="attendance" element={<ModuleRoute moduleKey="attendance" anyPermission={["attendance.check_in", "attendance.check_out", "attendance.view_self", "attendance.view_team", "attendance.view_company"]}><LazyPage><AttendancePage /></LazyPage></ModuleRoute>} />
        <Route path="correction-requests" element={<ModuleRoute moduleKey="attendance" anyPermission={["attendance.manual_entry", "attendance.approve"]}><LazyPage><AttendancePage initialTab="correction-request" correctionOnly /></LazyPage></ModuleRoute>} />
        <Route path="employees" element={<ModuleRoute moduleKey="employees" anyPermission={["users.invite", "reports.company"]}><LazyPage><EmployeesPage /></LazyPage></ModuleRoute>} />
        <Route path="leaves" element={<ModuleRoute moduleKey="leaves" anyPermission={["leave.request", "leave.view_self", "leave.view_company", "leave.review"]}><LazyPage><LeavesPage /></LazyPage></ModuleRoute>} />
        <Route path="organization" element={<ModuleRoute anyPermission={["org.view_self", "org.view_team", "org.view_company", "settings.tenant", "reports.company"]}><WorkspacePage /></ModuleRoute>} />
        <Route path="scheduling" element={<ModuleRoute moduleKey="scheduling" anyPermission={["schedule.view_self", "schedule.view_team", "schedule.view_company", "schedule.manage", "settings.tenant", "reports.company"]}><LazyPage><SchedulingPage /></LazyPage></ModuleRoute>} />
        <Route path="timesheets" element={<ModuleRoute moduleKey="timesheets" anyPermission={["attendance.view_self", "attendance.view_team", "attendance.view_company", "attendance.approve", "reports.company"]}><LazyPage><TimesheetsPage /></LazyPage></ModuleRoute>} />
        <Route path="kiosk" element={<ModuleRoute anyPermission={["settings.kiosk", "users.reset_pin", "attendance.kiosk_manage", "settings.tenant"]}><LazyPage><KioskPage /></LazyPage></ModuleRoute>} />
        <Route path="compliance" element={<ModuleRoute moduleKey="rules" anyPermission={["attendance.configure", "attendance.shift_manage", "attendance.holiday_manage", "attendance.geofence_manage", "leave.configure"]}><LazyPage><CompliancePage /></LazyPage></ModuleRoute>} />
        <Route path="settings" element={<ModuleRoute anyPermission={["settings.tenant", "roles.manage", "audit.read", "api_keys.manage", "reports.company"]}><WorkspacePage /></ModuleRoute>} />
        <Route path="security" element={<ModuleRoute anyPermission={["settings.tenant", "roles.manage", "audit.read", "api_keys.manage"]}><LazyPage><AuthApiConsole /></LazyPage></ModuleRoute>} />
        <Route path="profilePage" element={<LazyPage><ProfilePage /></LazyPage>} />
      </Route>


    </Routes>
  );
}
