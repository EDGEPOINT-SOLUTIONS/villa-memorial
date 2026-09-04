import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";

// --- COO Stitch design pages (pixel ports of
// ui-ux-demo/stitch_villa_memorial_digital_platform/*/code.html) -------------
import { CooHomePage } from "./pages/CooHomePage";
import { CooAtNeedPage } from "./pages/CooAtNeedPage";
import { CooDeathHomePage } from "./pages/CooDeathHomePage";
import { CooDeathHospitalPage } from "./pages/CooDeathHospitalPage";
import { CooPlansPage } from "./pages/CooPlansPage";
import { CooPlansSeniorPage } from "./pages/CooPlansSeniorPage";
import { CooLotsPage } from "./pages/CooLotsPage";
import { CooPackagesPage } from "./pages/CooPackagesPage";
import { CooTransportPage } from "./pages/CooTransportPage";
import { CooMapPage } from "./pages/CooMapPage";
import { CooAgentDashboardPage } from "./pages/CooAgentDashboardPage";
import { CooClientDashboardPage } from "./pages/CooClientDashboardPage";
import { CooPublicShell } from "./components/CooPublicShell";
import { PublicProductsPage } from "./pages/PublicProductsPage";
import { PublicProductDetailPage } from "./pages/PublicProductDetailPage";
import { PublicPlanDetailPage } from "./pages/PublicPlanDetailPage";
import { PublicPlanComparisonPage } from "./pages/PublicPlanComparisonPage";
import { PublicPackageDetailPage } from "./pages/PublicPackageDetailPage";
import { PublicLotDetailPage } from "./pages/PublicLotDetailPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderPage } from "./pages/OrderPage";
import { PublicContactPage } from "./pages/PublicContactPage";
import { PublicQuoteRequestPage } from "./pages/PublicQuoteRequestPage";
import { PublicAppointmentPage } from "./pages/PublicAppointmentPage";
import { PublicRegisterPage } from "./pages/PublicRegisterPage";
import { PublicFaqPage } from "./pages/PublicFaqPage";

// Staff portal (kept on the themed demo design system)
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { InquiriesPage } from "./pages/InquiriesPage";
import { PlansPage } from "./pages/PlansPage";
import { PlanDetailPage } from "./pages/PlanDetailPage";
import { CatalogPage } from "./pages/CatalogPage";
import { OrdersPage } from "./pages/OrdersPage";
import { CasesPage } from "./pages/CasesPage";
import { CaseNewPage } from "./pages/CaseNewPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { SchedulePage } from "./pages/SchedulePage";
import { PropertyPage } from "./pages/PropertyPage";
import { LotDetailPage } from "./pages/LotDetailPage";
import { BillingPage } from "./pages/BillingPage";
import { AccountingPage } from "./pages/AccountingPage";
import { HrPage } from "./pages/HrPage";
import { HrDetailPage } from "./pages/HrDetailPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminWorkflowsPage } from "./pages/AdminWorkflowsPage";
import { AdminAuditPage } from "./pages/AdminAuditPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";

// Agent + family portal logins (COO pages include their own portal frames)
import { AgentLoginPage } from "./pages/AgentLoginPage";
import { ClientLoginPage } from "./pages/ClientLoginPage";

// Agent portal pages (shared PortalFrame)
import { AgentClientsPage } from "./pages/AgentClientsPage";
import { AgentProspectsPage } from "./pages/AgentProspectsPage";
import { AgentApplicationsPage } from "./pages/AgentApplicationsPage";
import { AgentSalesPage } from "./pages/AgentSalesPage";
import { AgentMarketingPage } from "./pages/AgentMarketingPage";

// Client (family) portal pages (shared PortalFrame)
import { ClientProfilePage } from "./pages/ClientProfilePage";
import { ClientPlansPage } from "./pages/ClientPlansPage";
import { ClientPaymentsPage } from "./pages/ClientPaymentsPage";
import { ClientPropertyPage } from "./pages/ClientPropertyPage";
import { ClientRequestsPage } from "./pages/ClientRequestsPage";
import { ClientNotificationsPage } from "./pages/ClientNotificationsPage";
import { ClientMemorialsPage } from "./pages/ClientMemorialsPage";
import { ClientCasesPage } from "./pages/ClientCasesPage";
import { ClientDocumentsPage } from "./pages/ClientDocumentsPage";
import { ClientAppointmentsPage } from "./pages/ClientAppointmentsPage";
import { ClientSupportPage } from "./pages/ClientSupportPage";
import { ClientPrivacyPage } from "./pages/ClientPrivacyPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = titleFor(pathname);
  }, [pathname]);
  return null;
}

function titleFor(pathname: string): string {
  if (pathname === "/" || pathname === "/home") return "Villa Memorial — Honoring Every Life";
  if (pathname.startsWith("/site")) return "Villa Memorial";
  if (pathname.startsWith("/agent/")) return "Agent Portal — Villa Memorial";
  if (pathname === "/agent/login") return "Agent Portal Sign In — Villa Memorial";
  if (pathname.startsWith("/client/")) return "Family Portal — Villa Memorial";
  if (pathname === "/client/login") return "Family Portal Sign In — Villa Memorial";
  if (pathname === "/login") return "Staff Sign In — Villa Memorial";
  if (pathname === "/dashboard") return "Staff Dashboard — Villa Memorial";
  return "Villa Memorial — In-Memoriam Demo";
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* COO public marketing site — ONE global shell (consistent nav/footer) */}
        <Route element={<CooPublicShell />}>
          <Route path="/" element={<CooHomePage />} />
          <Route path="/home" element={<CooHomePage />} />
          <Route path="/site/services" element={<CooAtNeedPage />} />
          <Route path="/site/services/death-at-home" element={<CooDeathHomePage />} />
          <Route path="/site/services/death-at-hospital" element={<CooDeathHospitalPage />} />
          <Route path="/site/plans" element={<CooPlansPage />} />
          <Route path="/site/plans/senior-benefits" element={<CooPlansSeniorPage />} />
          <Route path="/site/plans/compare" element={<PublicPlanComparisonPage />} />
          <Route path="/site/plans/:slug" element={<PublicPlanDetailPage />} />
          <Route path="/site/lots" element={<CooLotsPage />} />
          <Route path="/site/lots/:slug" element={<PublicLotDetailPage />} />
          <Route path="/site/packages" element={<CooPackagesPage />} />
          <Route path="/site/packages/:slug" element={<PublicPackageDetailPage />} />
          <Route path="/site/transport" element={<CooTransportPage />} />
          <Route path="/site/map" element={<CooMapPage />} />
          <Route path="/site/products" element={<PublicProductsPage />} />
          <Route path="/site/products/:id" element={<PublicProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:reference" element={<OrderPage />} />
          <Route path="/site/contact" element={<PublicContactPage />} />
          <Route path="/site/quote" element={<PublicQuoteRequestPage />} />
          <Route path="/site/appointments" element={<PublicAppointmentPage />} />
          <Route path="/site/register" element={<PublicRegisterPage />} />
          <Route path="/site/faq" element={<PublicFaqPage />} />
        </Route>

        {/* Logins */}
        <Route path="/login" element={<LoginPage />} />

        {/* Agent portal — full page set (shared PortalFrame) */}
        <Route path="/agent/login" element={<AgentLoginPage />} />
        <Route path="/agent/dashboard" element={<CooAgentDashboardPage />} />
        <Route path="/agent/clients" element={<AgentClientsPage />} />
        <Route path="/agent/prospects" element={<AgentProspectsPage />} />
        <Route path="/agent/applications" element={<AgentApplicationsPage />} />
        <Route path="/agent/sales" element={<AgentSalesPage />} />
        <Route path="/agent/marketing" element={<AgentMarketingPage />} />

        {/* Client (family) portal — full page set (shared PortalFrame) */}
        <Route path="/client/login" element={<ClientLoginPage />} />
        <Route path="/client/dashboard" element={<CooClientDashboardPage />} />
        <Route path="/client/profile" element={<ClientProfilePage />} />
        <Route path="/client/plans" element={<ClientPlansPage />} />
        <Route path="/client/payments" element={<ClientPaymentsPage />} />
        <Route path="/client/property" element={<ClientPropertyPage />} />
        <Route path="/client/requests" element={<ClientRequestsPage />} />
        <Route path="/client/notifications" element={<ClientNotificationsPage />} />
        <Route path="/client/memorials" element={<ClientMemorialsPage />} />
        <Route path="/client/cases" element={<ClientCasesPage />} />
        <Route path="/client/documents" element={<ClientDocumentsPage />} />
        <Route path="/client/appointments" element={<ClientAppointmentsPage />} />
        <Route path="/client/support" element={<ClientSupportPage />} />
        <Route path="/client/privacy" element={<ClientPrivacyPage />} />

        {/* Staff portal (pathless layout, themed demo design system) */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/new" element={<CaseNewPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/property" element={<PropertyPage />} />
          <Route path="/property/:id" element={<LotDetailPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/hr" element={<HrPage />} />
          <Route path="/hr/:id" element={<HrDetailPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/workflows" element={<AdminWorkflowsPage />} />
          <Route path="/admin/audit" element={<AdminAuditPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
