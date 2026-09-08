# Configuration Engine

## Purpose
Onboarding a new funeral business should be:
**CONFIGURE → IMPORT DATA → TRAIN USERS → GO LIVE** — not REDEVELOP → CUSTOM CODE → TEST → DEPLOY.

## Configuration surface (what admins can control per tenant)
Terminology · modules on/off · fields · forms · workflows · services · packages · prices ·
facilities · branches · permissions · document templates · notifications · dashboards · reports ·
business rules · integrations · branding.

## Service catalog configurables
Name, category, description, price, cost, package, add-ons, required dependencies, facility/staff/
equipment requirements, scheduling requirements, duration, availability, branch availability, tax,
discount rules, commission, payment rules, required documentation, workflow, status, cancellation rules.

## Pricing/rules engine (Villa blueprint §29)
Base price · location premium · size · lot type · duration · distance · vehicle type · additional
services · discounts · taxes/fees · promos · reservation fee · down payment · installment terms ·
overtime · transfer fee · interment/exhumation fees · branch-specific pricing · effective dates ·
approval workflow for price changes · version history. **Never hard-code business rules.**

## Guardrail
Configuration must not become a "configuration monster": keep the 80–90% common core opinionated;
configure the genuinely variable 10–20%; push true outliers to the extension layer.

## Commission rules example (configurable, not hard-coded)
- Service A → 5% commission
- Service B → ₱X fixed incentive
- Package C → 3% + additional incentive
- Monthly sales > threshold → additional incentive
