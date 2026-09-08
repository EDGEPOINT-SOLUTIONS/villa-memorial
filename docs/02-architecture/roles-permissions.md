# Roles & Permissions

## User roles (Villa blueprint §62)
Super Administrator · Management/Executive · Branch Manager · Funeral Director · Funeral Coordinator ·
Sales Agent · Lot Sales Officer · Cemetery Officer · Cemetery/Maintenance Staff · Embalmer · Driver ·
Cashier · Accounting · Inventory/Procurement · Customer Service · Marketing · Content/CMS Manager ·
AI/Analytics authorized user · Customer/Family user · Public visitor.

## Permission principle (blueprint §63)
Permissions granular by **module × action**: view, create, edit, approve, cancel, refund, export,
assign, transfer, publish, manage documents, manage pricing, manage ownership, manage interment,
run AI queries, access sensitive data.
**Sensitive data is not exposed merely because a user can access the general customer record.**

## Role dashboards (master prompt §19)
| Role | Dashboard focus |
|---|---|
| Executive | revenue, active cases, completed services, branch performance, utilization, receivables |
| Branch Manager | today's activities, pending cases, facilities, staff, payments, tasks |
| Director/Coordinator | active cases, upcoming services, missing info, tasks, family comms |
| Finance | receivables, payments, invoices, overdue accounts |
| Inventory | stock, low inventory, reservations, transfers |
| Memorial Park | lot inventory, reservations, occupancy, interments |

Dashboards must be configurable, not permanently hard-coded.

## AI access control
AI operates under the requesting user's permissions; never an RBAC bypass (see `05-ai/ai-governance.md`).

## Required artifacts
Role-permission matrix for every role × critical action; verified by permission tests in QA plan.
