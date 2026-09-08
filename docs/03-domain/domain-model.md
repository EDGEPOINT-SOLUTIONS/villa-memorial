# Domain Model

## Candidate entity inventory (master prompt §4 — evaluate, don't implement all)
**Org/structure**: Organization, Tenant, Business Unit, Branch, Facility, Chapel, Wake Facility,
Memorial Park, Cemetery, Lot, Burial Plot, Mausoleum, Columbarium, Crematorium.

**People**: Deceased/Decedent, Family, Customer, Contact, Authorized Representative, Next of Kin,
Service Provider, Employee, Staff, Supplier, Partner, Referral Source.

**Commerce**: Service, Service Package, Contract, Order, Invoice, Payment, Payment Plan, Discount,
Refund, Commission, Expense, Merchandise (coffin/casket, urn, flowers), Inventory Item, Reservation.

**Operations**: Schedule, Appointment, Wake, Viewing, Embalming, Burial, Cremation, Funeral Ceremony,
Funeral Case, Arrangement, Vehicle.

**Property**: Lot status lifecycle (available/reserved/sold/occupied...), ownership, interment,
transfer, maintenance.

**Platform**: Document, Document Template, Notification, Task, Workflow, Workflow Stage, Workflow
Rule, User, Role, Permission, Audit Log, Report, Dashboard, AI Interaction, AI Recommendation,
AI-generated Document, Integration.

## Villa blueprint core data entities (§55)
User, Role, Permission, Customer, Family, FamilyMember, FamilyRelationship, Lead, Opportunity,
Appointment, Service/ServiceCategory, Product/ProductCategory, Package/PackageItem, AddOn, Plan,
PlanHolder, Beneficiary, Contract, Order, OrderItem, Cart, CartItem, Quote, Payment, PaymentSchedule,
Invoice, Receipt, Statement, JournalEntry, JournalLine, Deceased, FuneralCase, EmbalmingRecord,
Viewing, Chapel, ChapelRoom, Facility, Vehicle, Driver, Dispatch, MemorialPark, Section, Block, Row,
Lot, LotReservation, LotOwner, LotTransfer, Interment, Exhumation, Memorial, MemorialMedia,
MemorialTribute, Document, DocumentTemplate, Notification, NotificationTemplate, Ticket, WorkOrder,
InventoryItem, Supplier, StockMovement, MaintenanceAsset, CommissionRule, CommissionTransaction,
CMSPage, CMSContent, AuditLog, ConsentRecord.

## Key relationship patterns (blueprint §56)
```
CUSTOMER ─┬─ FAMILY
          ├─ PRE-NEED PLAN → CONTRACT → PAYMENT SCHEDULE → PAYMENTS
          ├─ ORDER → ORDER ITEMS → PRODUCTS/SERVICES/RESOURCES
          ├─ FUNERAL CASE → DECEASED → INTERMENT → LOT
          ├─ LOT → OWNERS/CO-OWNERS/AUTHORIZED FAMILY
          ├─ MEMORIAL → DECEASED → MEDIA/TRIBUTES
          └─ DOCUMENTS / REQUESTS / COMMUNICATION HISTORY

LOT → GIS GEOMETRY → OWNERSHIP → RESERVATION → PAYMENT → INTERMENT HISTORY → MAINTENANCE → MEMORIALS
```

## Critical modeling rules
1. **Customer ≠ deceased** — model relationships between deceased, family, purchaser, next of kin,
   authorized representative, referring party separately.
2. **Memorial lots are managed property/assets**, not ordinary product cards (GIS, ownership,
   interment, transfer, maintenance relationships).
3. **Packages are bundles**, not replacements for the underlying catalog.
4. Products, services, rentals/resources, scheduled services, properties, plans, packages are
   *different commercial types* sharing a common commerce layer.

## CRM lifecycle
Lead → Inquiry → Consultation → Arrangement → Customer → Active Case → Completed Case → Follow-up →
Repeat/Referral/Pre-need relationship.
