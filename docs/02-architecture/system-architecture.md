# System Architecture

## Ecosystem topology (Villa blueprint §4, generalized)
```
PUBLIC WEB  |  CUSTOMER/FAMILY PORTAL  |  STAFF/ADMIN PORTALS  |  PWA/MOBILE
                          |
                       API GATEWAY
                          |
            DOMAIN / APPLICATION SERVICES
          +----------------+----------------+
          |                |                |
   BUSINESS MODULES    AI SERVICES    INTEGRATION LAYER
          +----------------+----------------+
                          |
              BUSINESS / WORKFLOW ENGINE
                          |
     CRM · FUNERAL CASES · CEMETERY/GIS · SALES · FINANCE
                          |
              POSTGRESQL + POSTGIS
                          |
        OBJECT STORAGE · REPORTING/BI · ANALYTICS
```

## Bounded contexts (blueprint §54)
AUTH · USERS · ROLES & PERMISSIONS · CUSTOMERS · FAMILIES · CRM · LEADS · PRODUCTS · SERVICES ·
PACKAGES · PRENEED · FUNERAL CASES · DECEASED · EMBALMING/PREPARATION · CHAPELS/FACILITIES ·
SCHEDULING · VEHICLES/TRANSPORT · CEMETERY · GIS · LOTS · LOT RESERVATIONS · LOT OWNERSHIP ·
LOT TRANSFERS · INTERMENTS · EXHUMATIONS · DIGITAL MEMORIALS · INVENTORY · SALES/ORDERS · CART ·
PRICING · CONTRACTS · PAYMENTS · COLLECTIONS · ACCOUNTING · DOCUMENTS · NOTIFICATIONS · TICKETING ·
MAINTENANCE/WORK ORDERS · CMS · REPORTING/BI · AUDIT · AI

## API domains (blueprint §67)
Auth/authz · customer/family · catalog · pricing · cart/order · quote · appointment/scheduling ·
availability · payment + webhooks · pre-need contract · funeral case · chapel/resource ·
vehicle/dispatch · cemetery/GIS · lot reservation/ownership · interment/exhumation · memorial ·
document · notification · CRM · inventory · accounting/export · reporting · AI orchestration/retrieval ·
CMS · audit.

## Integration abstraction
Payment gateways, accounting systems, SMS/email/messaging, mapping, calendar, government systems,
identity providers, external CRM/ERP/BI — added without restructuring core.

## Security & privacy baseline
AuthN/AuthZ least-privilege, RBAC granular per module+action, MFA, encryption in transit/at rest,
secure file storage + malware scanning, input validation, SQLi/XSS/CSRF protections, rate limiting,
audit logs, session management, backup/DR, retention policies, consent records. Philippine Data
Privacy Act / NPC compliance validated by legal before production; design must not assume PH-only scope.

## Audit trail requirements
User, action, timestamp, IP/device/session, entity+ID, old/new value, reason, approval history.
Critical financial, contract, ownership, lot, interment, status changes are traceable; never silently
delete critical historical records.

## Multi-branch & scale
Branch entity with branch-specific staff/facilities/inventory/pricing/sales; consolidated management
reporting; future agent/franchise/partner model. Design for multi-branch even if deploying one branch.
