# Filipino Digital Funeral & Memorial Culture Module

Principle: the platform should digitize culturally relevant Filipino funeral and mourning practices —
a market differentiator that stays localizable for other countries. Each capability is configurable by
tenant, location, culture, service type. No practice is assumed universal.

## 1. Digital Abuloy / E-Donation
Contribution page · QR-based contribution · online payment · bank/e-wallet instructions · donor name /
anonymous · amount · timestamp · optional message · relationship to deceased/family · status ·
confirmation · acknowledgment · summary/export · family-authorized access · configurable privacy ·
fraud/duplicate controls.
Workflow: E-Wake/Memorial Page → Abuloy → Payment → Confirmation → Family Record.
**Money-model flexibility**: platform must NOT assume the funeral home controls funds — support direct-to-family,
via authorized organization, funeral-home-managed, external provider, or informational-only.

## 2. Digital Eulogy
Authorized contributors submit written eulogies, tributes, memories, photos, videos, audio, letters,
poems, prayers, stories. Moderation/approval before publication; private vs public tributes;
scheduled publication; contributor ID; guestbook; downloadable compilation.
AI can draft from supplied material (labeled AI-assisted, human-reviewed); never invents biographical facts.

## 3. Digital Videoke / Wake Entertainment
Where culturally appropriate: karaoke integration · song queue · participant registration · queue mgmt ·
display integration · schedule · house rules · configurable hours · activity logs · analytics.
Demonstrates configuration architecture: tenant-enabled feature others may disable entirely.

## 4. Digital Condolences
Messages, photos, memories, prayers, virtual messages, relationship identification — part of the
Digital Memorial / E-Lamay, not a separate product.

## 5. Digital Dalaw / Virtual Visit
Virtual attendance · scheduled online visitation · private family sessions · livestream ·
invitation-only access · visitor registration · guestbook · condolences.

## 6. Digital Prayers / Religious & Spiritual Tributes
Configurable support for prayers, novenas, rosary schedules, intentions, ceremonies, memorial services,
tribute programs, clergy/officiant info. **No religious practice hard-coded in core** — ceremony/ritual/
program = configurable activity.

## 7–8. Digital Memorial Program + QR Experience
Digital wake program: name, photo, biography, family, schedules, locations, ceremonial program,
eulogy, tributes, photos/videos, livestream, condolences, abuloy info.
QR at the venue → memorial/e-lamay/eulogy/guestbook/abuloy/program/livestream/gallery.
Later: Lot QR → digital record (bridges GIS and memorial modules).

## 9. Digital Flowers / Virtual Tributes
Digital flowers, virtual candles/prayers, tribute cards, memorial badges, symbolic offerings —
configurable, never mandatory.

## 10. Community / Barangay / Organization Support
Group participation: "ABC Association sends condolences", "Class of 1985 contributes ₱10,000 abuloy".
Group registration/contribution/tribute/message/attendance via authorized group representative.
Context: barangay orgs, churches, schools, workplaces, associations, cooperatives, extended family networks.

## 11. Digital Wake Program / Event Management
Wake as configurable event: Viewing · Prayer · Eulogy · Family Tribute · Community Tribute · Videoke ·
Religious Ceremony · Livestream · Abuloy · Burial/Funeral Schedule. No forced "standard Filipino wake".

## Module structure
```
DIGITAL MEMORIAL, E-WAKE & CULTURAL SERVICES
├── DIGITAL MEMORIAL: e-wake/e-lamay, page, eulogy, guestbook, condolences, virtual tributes,
│   prayers, livestream, virtual attendance, program, photo/video memories
├── COMMUNITY PARTICIPATION: digital abuloy, group contributions/tributes/messages
├── WAKE ACTIVITIES: digital videoke, event/program mgmt, configurable cultural practices
└── DIGITAL ACCESS: QR memorial, family portal, guest access, privacy controls
```
