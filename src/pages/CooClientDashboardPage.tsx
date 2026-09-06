// ============================================================================
// CooClientDashboardPage — pixel port of the COO's "client portal dashboard"
// mockup (stitch_villa_memorial_digital_platform/client_portal_dashboard/
// code.html) into the ui-ux-demo React app, rendered inside the shared
// PortalFrame so the family portal feels like one app. All copy/₱ figures are
// verbatim from the mockup; chrome (sidebar/top bar/drawer) comes from
// PortalFrame + CLIENT_NAV.
// ============================================================================

import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import { useToast } from "../components/toast";
import { PortalFrame } from "../components/PortalFrame";
import { CLIENT_NAV } from "../lib/portalNav";

// Material Symbols defaults per the mockup (wght 300, FILL 0).
const ICON_VARS: CSSProperties = {
  fontVariationSettings: '"FILL" 0, "wght" 300, "GRAD" 0, "opsz" 24',
};

function Icon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined${className ? ` ${className}` : ""}`}
      style={{ ...ICON_VARS, fontSize: size }}
    >
      {name}
    </span>
  );
}

const PAYMENTS = [
  { date: "Sep 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Completed" },
  { date: "Aug 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Completed" },
  { date: "Jul 15, 2024", description: "Monthly Installment", amount: "₱2,500", status: "Completed" },
];

export function CooClientDashboardPage() {
  const { toast } = useToast();

  function notice(message: string) {
    toast(message);
  }

  return (
    <PortalFrame
      items={CLIENT_NAV}
      brandLabel="Client Portal"
      topNote="Villa Memorial · Family account"
      logoutTo="/client/login"
    >
      {/* Header */}
      <header className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-body-md font-body-md text-on-surface-variant mb-2">October 24, 2024</p>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Welcome back, Maria</h2>
        </div>
        <div className="hidden md:flex gap-4">
          <button
            type="button"
            onClick={() => notice("Villa Memorial support is available 24/7.")}
            className="flex items-center gap-2 px-6 py-3 border border-primary-container text-primary rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors min-h-[48px] cursor-pointer"
          >
            <Icon name="help" size={20} />
            Support
          </button>
        </div>
      </header>

      {/* Bento Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Summary Cards Row (Spans 12 columns) */}
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Active Plans */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient hover:shadow-md transition-shadow group border border-transparent hover:border-primary-container/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary-fixed rounded-lg text-on-primary-fixed">
                <Icon name="description" />
              </div>
              <span className="text-body-sm text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-full">
                Status: Active
              </span>
            </div>
            <h3 className="text-body-lg font-body-lg text-on-surface-variant mb-1">Active Plans</h3>
            <p className="text-headline-md font-headline-md text-primary">1</p>
          </div>

          {/* Next Payment */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient hover:shadow-md transition-shadow group border border-transparent hover:border-primary-container/30 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-secondary-fixed rounded-lg text-on-secondary-fixed">
                <Icon name="event_upcoming" />
              </div>
            </div>
            <h3 className="text-body-lg font-body-lg text-on-surface-variant mb-1 relative z-10">Next Payment Due</h3>
            <div className="flex items-end gap-3 relative z-10">
              <p className="text-headline-md font-headline-md text-secondary">₱2,500</p>
              <p className="text-body-md font-body-md text-on-surface-variant pb-1">Oct 15</p>
            </div>
          </div>

          {/* Recent Request */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient hover:shadow-md transition-shadow group border border-transparent hover:border-primary-container/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-surface-container-high rounded-lg text-on-surface">
                <Icon name="pending_actions" />
              </div>
              <span className="text-body-sm text-secondary bg-secondary-container/30 px-3 py-1 rounded-full">
                Pending
              </span>
            </div>
            <h3 className="text-body-lg font-body-lg text-on-surface-variant mb-1">Recent Request</h3>
            <p className="text-body-md font-body-md text-on-surface truncate">Floral Arrangement Upgr...</p>
          </div>
        </div>

        {/* Plan Overview & Progress (Spans 8 cols) */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-ambient border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-headline-sm font-headline-sm text-on-surface">Premium Lots · L-01</h3>
              <Link
                to="/client/plans"
                className="text-label-md font-label-md text-primary hover:text-primary-container transition-colors hover:no-underline!"
              >
                View Details
              </Link>
            </div>
            <div className="mb-8">
              <div className="flex justify-between text-body-md font-body-md text-on-surface-variant mb-2">
                <span>Contract Payment Progress</span>
                <span>65%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: "65%" }} />
              </div>
              <p className="text-body-sm text-on-surface-variant mt-3 text-right">₱74,100 paid of ₱114,000</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => notice("Payment request received — Villa Memorial will confirm next steps.")}
              className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary py-4 rounded-lg text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors min-h-[48px] cursor-pointer"
            >
              <Icon name="payment" size={20} />
              Make a Payment
            </button>
            <Link
              to="/site/map"
              className="flex items-center justify-center gap-2 w-full border border-primary-container text-primary py-4 rounded-lg text-label-md font-label-md hover:bg-surface-container-low transition-colors min-h-[48px] hover:no-underline!"
            >
              <Icon name="map" size={20} />
              View on Map
            </Link>
          </div>
        </div>

        {/* Property Map Shortcut (Spans 4 cols) */}
        <div className="md:col-span-4 bg-surface-container-lowest rounded-xl p-2 shadow-ambient border border-outline-variant/30 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent z-10" />
          <div
            data-alt="A clean, minimalist digital map interface showing a meticulously planned memorial garden layout with soft green and beige tones, bright lighting, hopeful and peaceful atmosphere, modern UI map style."
            className="bg-cover bg-center w-full h-full min-h-[250px] rounded-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBguwp2nUJzIcAEydvhK6IffxKqWMQLmWU4p2wPUG8lBBtEISH1IunW5F0skAsSTKWZoNvc3yccn3LrXZ9YpKuAmR6QBf89Ss5UeS5nA0oyu2BF1Uh_q-J1ebxQ0VDZM-99mEoYh4J4C050c32vHc6yYhUya-ncPYOc8coFmTUt7s8Hu3cUrEiTuSILHVewEwSWh1rYKknUiObQlG0xmSl70CwX0bo6EkU_a6Figsq7YwsCE2OjBMri')",
            }}
          />
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="bg-surface-container-lowest/90 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Icon name="location_on" />
              </div>
              <div>
                <p className="text-label-md font-label-md text-on-surface">Premium Lots · Lawn A</p>
                <p className="text-body-sm text-on-surface-variant">Sanctuario Memorial Park · L-01</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payment History (Spans 8 cols) */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-ambient border border-outline-variant/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Recent Payments</h3>
            <Link
              to="/client/payments"
              className="text-label-md font-label-md text-primary hover:text-primary-container transition-colors hover:no-underline!"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-high text-body-md font-body-md text-on-surface-variant">
                  <th className="py-4 px-2 font-normal">Date</th>
                  <th className="py-4 px-2 font-normal">Description</th>
                  <th className="py-4 px-2 font-normal">Amount</th>
                  <th className="py-4 px-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="text-body-md font-body-md text-on-surface">
                {PAYMENTS.map((row, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-surface-container-lowest transition-colors group${
                      i < PAYMENTS.length - 1 ? " border-b border-surface-container-low" : ""
                    }`}
                  >
                    <td className="py-4 px-2 text-on-surface-variant">{row.date}</td>
                    <td className="py-4 px-2">{row.description}</td>
                    <td className="py-4 px-2 font-medium">{row.amount}</td>
                    <td className="py-4 px-2">
                      <span className="inline-flex items-center gap-1 text-primary bg-primary-fixed/30 px-2 py-1 rounded text-sm">
                        <Icon name="check_circle" size={16} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Requests (Spans 4 cols) */}
        <div className="md:col-span-4 bg-surface-container-lowest rounded-xl p-8 shadow-ambient border border-outline-variant/30 flex flex-col">
          <h3 className="text-headline-sm font-headline-sm text-on-surface mb-6">Quick Requests</h3>
          <div className="space-y-4 flex-1">
            <Link
              to="/client/requests"
              className="flex w-full items-center text-left p-4 border border-surface-container-high rounded-lg hover:border-primary-container hover:bg-surface-container-low transition-all group hover:no-underline!"
            >
              <div className="p-2 bg-surface-container rounded-md mr-4 group-hover:bg-primary-fixed group-hover:text-on-primary-fixed transition-colors">
                <Icon name="local_florist" />
              </div>
              <div>
                <p className="text-body-md font-body-md font-medium text-on-surface">Order Flowers</p>
                <p className="text-body-sm text-on-surface-variant">Schedule a delivery to property</p>
              </div>
              <Icon name="chevron_right" className="ml-auto text-on-surface-variant group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/client/requests"
              className="flex w-full items-center text-left p-4 border border-surface-container-high rounded-lg hover:border-primary-container hover:bg-surface-container-low transition-all group hover:no-underline!"
            >
              <div className="p-2 bg-surface-container rounded-md mr-4 group-hover:bg-primary-fixed group-hover:text-on-primary-fixed transition-colors">
                <Icon name="cleaning_services" />
              </div>
              <div>
                <p className="text-body-md font-body-md font-medium text-on-surface">Maintenance Request</p>
                <p className="text-body-sm text-on-surface-variant">Report an issue or request cleaning</p>
              </div>
              <Icon name="chevron_right" className="ml-auto text-on-surface-variant group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/client/requests"
              className="flex w-full items-center text-left p-4 border border-surface-container-high rounded-lg hover:border-primary-container hover:bg-surface-container-low transition-all group hover:no-underline!"
            >
              <div className="p-2 bg-surface-container rounded-md mr-4 group-hover:bg-primary-fixed group-hover:text-on-primary-fixed transition-colors">
                <Icon name="article" />
              </div>
              <div>
                <p className="text-body-md font-body-md font-medium text-on-surface">Document Request</p>
                <p className="text-body-sm text-on-surface-variant">Request copies of certificates</p>
              </div>
              <Icon name="chevron_right" className="ml-auto text-on-surface-variant group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </PortalFrame>
  );
}
