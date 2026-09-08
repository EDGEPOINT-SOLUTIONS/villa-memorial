# Reporting, Dashboards & Business Intelligence

## Reporting catalog (Villa blueprint §51)
Sales (daily/monthly/annual; by product/service/package/agent/branch) · lot sales · plan sales ·
funeral cases · interments · cremations · retrievals · chapel & vehicle utilization · staff workload ·
lot occupancy/availability · transfers · exhumations · revenue · collections · AR aging · expenses ·
inventory · customer acquisition · lead conversion · average transaction value · CSAT/NPS.

## Dashboards (blueprint §52)
**Daily Operations**: funeral cases · active viewings · interments today · cremations today · new
inquiries · sales · collections · lot reservations · available lots · overdue accounts · operational alerts.
**Executive**: funeral/lot/pre-need/product/service revenue split · new leads · conversion · plans and
lots sold · average transaction · AR · collection rate · cases · chapel & vehicle utilization · staff workload.

## Architecture direction (master prompt §20)
Separate layers over time: transactional database → reporting/analytics layer → AI/ML layer.
Reports: operational, financial, service, customer, facility utilization, inventory, sales, case,
branch + management dashboards. Configurable per tenant/role (`roles-permissions.md`).

## Predictive analytics roadmap (advanced-features doc §11)
Service demand · lot demand · inventory · branch/agent performance · commission analytics · facility
utilization · customer acquisition/conversion · revenue forecasting · receivables forecasting ·
bottleneck detection → **AI-powered Funeral Business Intelligence Dashboard** for management.
