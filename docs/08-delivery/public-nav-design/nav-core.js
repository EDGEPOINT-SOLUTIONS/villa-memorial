/* ============================================================================
   nav-core.js — PROPOSED public navigation (design scout, scratch).

   Builds the two-layer header, the phone bottom action bar and the "Plan ahead"
   sheet, and wires their states (scroll compression, grouped menu, a11y dialog
   behaviour). Framework-free and dependency-free on purpose: the same file is
   used by the interactive demo page and by the capture harness that injects
   the proposal into the real app for before/after screenshots.

   Real contact/brand values come from lib/fixtures/landing/content.json:
   "Villa Memorial Park" · "0917 000 1234" (tel:+639170001234) ·
   "Isabela City, Basilan". Nothing here invents a figure or a destination.
   =========================================================================== */
(function (global) {
  "use strict";

  var C = {
    brand: "Villa Memorial Park",
    mark: "media/logo-sanctuario.png",
    phoneLabel: "24/7 assistance line",
    phoneDisplay: "0917 000 1234",
    phoneHref: "tel:+639170001234",
    location: "Isabela City, Basilan",
    hours: "every hour, every day",
  };

  var ICON = {
    phone:
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>',
    cart:
      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/><circle cx="18" cy="20" r="2"/><circle cx="8" cy="20" r="2"/></svg>',
    chevron:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    pin:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    clock:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    menu:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>',
    x:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    arrow:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  };

  /* Option A: short unmistakable words + a grouped "Plan ahead" menu.
     Option B: the client's full names verbatim in the bar. */
  var SHORT_LINKS = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Plans", href: "/plans" },
    { label: "Lots", href: "/lots" },
    { label: "Park", href: "/map" },
    { label: "Contact", href: "/contact" },
  ];

  var FULL_LINKS = [
    { label: "Home", href: "/" },
    { label: "Funeraria Memorial Services", href: "/services" },
    { label: "Villa Memorial Plan", href: "/plans" },
    { label: "Lots", href: "/lots" },
    { label: "Villa Memorial Park", href: "/map" },
    { label: "Contact", href: "/contact" },
  ];

  var PLAN_GROUP = [
    {
      title: "Villa Memorial Plan",
      note: "Instalment plans, tiers and terms",
      href: "/plans",
    },
    {
      title: "Senior benefits",
      note: "Senior-citizen rates and requirements",
      href: "/plans/senior-benefits",
    },
    {
      title: "Funeraria Memorial Services",
      note: "At-need care, chapels and 2026 prices",
      href: "/services",
    },
    {
      title: "Villa Memorial Park",
      note: "Sections, lots and the park map",
      href: "/map",
    },
  ];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isCurrent(page, href) {
    if (href === "/") return page === "/";
    return page === href || page.indexOf(href + "/") === 0;
  }

  function linkHTML(page, link) {
    var cur = isCurrent(page, link.href);
    return (
      '<a href="' + esc(link.href) + '"' + (cur ? ' aria-current="page"' : "") + ">" + esc(link.label) + "</a>"
    );
  }

  function planGroupHTML() {
    return (
      '<div class="vn-nav__group">' +
      '<button type="button" class="vn-nav__trigger" data-vn-menu-trigger aria-expanded="false" aria-haspopup="true">' +
      "Plan ahead " + ICON.chevron +
      "</button>" +
      '<div class="vn-menu" data-vn-menu hidden role="menu" aria-label="Plan ahead">' +
      '<p class="vn-menu__heading">Plan ahead</p>' +
      PLAN_GROUP.map(function (item) {
        return (
          '<a class="vn-menu__item" role="menuitem" href="' + esc(item.href) + '">' +
          "<strong>" + esc(item.title) + "</strong>" +
          "<span>" + esc(item.note) + "</span>" +
          "</a>"
        );
      }).join("") +
      "</div></div>"
    );
  }

  /**
   * header({variant, page, cartCount, skyUtility})
   * variant: "a" = short labels + grouped menu (default)
   *          "b" = full client names verbatim
   */
  function header(opts) {
    opts = opts || {};
    var variant = opts.variant || "a";
    var page = opts.page || "/";
    var cartCount = opts.cartCount == null ? 3 : opts.cartCount;
    var sky = opts.skyUtility ? " vn-header--sky-utility" : "";
    var links = variant === "b" ? FULL_LINKS : SHORT_LINKS;

    return (
      '<a class="vn-skip" href="#main">Skip to content</a>' +
      '<header class="vn-header' + sky + '" data-vn-header>' +
      '  <div class="vn-utility">' +
      '    <div class="vn-utility__bar">' +
      '      <p class="vn-utility__meta">' +
      '        <span class="vn-utility__where">' + ICON.pin + " " + esc(C.location) + "</span>" +
      '        <span class="vn-utility__sep" aria-hidden="true">·</span>' +
      '        <span class="vn-utility__hours">' + ICON.clock + " " + esc(C.hours) + "</span>" +
      "      </p>" +
      '      <a class="vn-call" href="' + esc(C.phoneHref) + '">' +
      ICON.phone +
      '        <span class="vn-call__text">' +
      '          <span class="vn-call__label">' + esc(C.phoneLabel) + "</span>" +
      '          <span class="vn-call__number">' + esc(C.phoneDisplay) + "</span>" +
      "        </span>" +
      "      </a>" +
      "    </div>" +
      "  </div>" +
      '  <div class="vn-main">' +
      '    <div class="vn-main__bar">' +
      '      <a class="vn-brand" href="/">' +
      '        <img class="brand-mark" src="' + esc(C.mark) + '" alt="" width="34" height="34" />' +
      '        <span class="vn-brand__wordmark">' + esc(C.brand) + "</span>" +
      "      </a>" +
      '      <nav class="vn-nav" aria-label="Sections">' +
      links.map(function (l) { return linkHTML(page, l); }).join("") +
      (variant === "b" ? "" : planGroupHTML()) +
      "      </nav>" +
      '      <div class="vn-actions">' +
      '        <a class="vn-signin" href="/login">Sign in</a>' +
      '        <a class="vn-cart" href="/cart" aria-label="Cart, ' + cartCount + ' items">' +
      ICON.cart +
      (cartCount > 0
        ? '<span class="vn-cart__count" aria-hidden="true">' + cartCount + "</span>"
        : "") +
      "        </a>" +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "</header>"
    );
  }

  function bottomBar() {
    return (
      '<div class="vn-bottombar" data-vn-bottombar>' +
      '  <a class="vn-bottombar__btn vn-bottombar__btn--call" href="' + esc(C.phoneHref) + '">' +
      ICON.phone + "Call 24/7" +
      "</a>" +
      '  <button type="button" class="vn-bottombar__btn vn-bottombar__btn--plan" data-vn-sheet-open>' +
      "Plan ahead" +
      "</button>" +
      "</div>"
    );
  }

  function sheet() {
    return (
      '<div class="vn-sheet" data-vn-sheet hidden>' +
      '  <div class="vn-sheet__backdrop" data-vn-sheet-close></div>' +
      '  <div class="vn-sheet__panel" role="dialog" aria-modal="true" aria-label="Plan ahead">' +
      '    <div class="vn-sheet__head">' +
      '      <h2 class="vn-sheet__title">Plan ahead</h2>' +
      '      <button type="button" class="vn-sheet__close" data-vn-sheet-close aria-label="Close plan ahead">' + ICON.x + "</button>" +
      "    </div>" +
      PLAN_GROUP.map(function (item) {
        return (
          '<a class="vn-sheet__item" href="' + esc(item.href) + '">' +
          "<span><strong>" + esc(item.title) + "</strong><span>" + esc(item.note) + "</span></span>" +
          ICON.arrow +
          "</a>"
        );
      }).join("") +
      "  </div>" +
      "</div>"
    );
  }

  function init(root, opts) {
    root = root || document;
    opts = opts || {};

    // Scroll life — compress after 24px, never auto-hide.
    var header = root.querySelector("[data-vn-header]");
    if (header) {
      var apply = function () {
        var y = global.scrollY || document.documentElement.scrollTop || 0;
        header.classList.toggle("vn-header--compressed", y > 24);
      };
      apply();
      if (opts.scrollTarget !== false) {
        global.addEventListener("scroll", apply, { passive: true });
      }
    }

    // Grouped "Plan ahead" menu (disclosure; Escape + outside click close).
    var trigger = root.querySelector("[data-vn-menu-trigger]");
    var menu = root.querySelector("[data-vn-menu]");
    if (trigger && menu) {
      var setMenu = function (open) {
        menu.hidden = !open;
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
      };
      setMenu(false);
      trigger.addEventListener("click", function () {
        setMenu(menu.hidden);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !menu.hidden) {
          setMenu(false);
          trigger.focus();
        }
      });
      document.addEventListener("click", function (e) {
        if (!menu.hidden && !menu.contains(e.target) && e.target !== trigger) setMenu(false);
      });
    }

    // Phone "Plan ahead" sheet (dialog semantics).
    var sheet = root.querySelector("[data-vn-sheet]");
    if (sheet) {
      var opener = root.querySelector("[data-vn-sheet-open]");
      var closeBtn = sheet.querySelector(".vn-sheet__close");
      var lastFocus = null;
      var setSheet = function (open) {
        sheet.hidden = !open;
        if (open) {
          lastFocus = document.activeElement;
          if (closeBtn) closeBtn.focus();
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
          if (lastFocus && lastFocus.focus) lastFocus.focus();
        }
      };
      if (opener) opener.addEventListener("click", function () { setSheet(true); });
      sheet.querySelectorAll("[data-vn-sheet-close]").forEach(function (el) {
        el.addEventListener("click", function () { setSheet(false); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !sheet.hidden) setSheet(false);
      });
    }

    // Existing full menu (quick-menu FAB) — same behaviour as the product's
    // MobileQuickMenu: Escape closes, body scroll locks while open.
    var fab = root.querySelector("[data-vn-quick-fab]");
    var quick = root.querySelector("[data-vn-quick]");
    if (fab && quick) {
      var setQuick = function (open) {
        var wasOpen = !quick.hidden;
        quick.hidden = !open;
        fab.setAttribute("aria-expanded", open ? "true" : "false");
        fab.setAttribute("aria-label", open ? "Close quick menu" : "Open quick menu");
        document.body.style.overflow = open ? "hidden" : "";
        if (open) {
          var c = quick.querySelector(".quick-menu__close");
          if (c) c.focus();
        } else if (wasOpen) {
          fab.focus();
        }
      };
      setQuick(false);
      fab.addEventListener("click", function () { setQuick(quick.hidden); });
    }
    document.querySelectorAll("[data-vn-quick-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        var f = document.querySelector("[data-vn-quick-fab]");
        var q = document.querySelector("[data-vn-quick]");
        if (q) q.hidden = true;
        if (f) {
          f.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
          f.focus();
        }
      });
    });

    // Phone bottom bar needs the page to leave room for it.
    document.body.classList.add("vn-has-bottombar");
  }

  global.VN = { C: C, ICON: ICON, header: header, bottomBar: bottomBar, sheet: sheet, init: init };
})(typeof window !== "undefined" ? window : globalThis);
