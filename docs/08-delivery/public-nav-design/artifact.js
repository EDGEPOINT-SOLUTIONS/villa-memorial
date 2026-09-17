/* artifact.js — review-surface plumbing for the Lavish artifact only:
   - renders the interactive inline stage from the same nav-core builder the
     live demo uses (so the artifact stage and the demo cannot drift);
   - wires the decision forms to Lavish's queuePrompt (with a local fallback
     when the file is opened outside Lavish).
   Not part of the proposed product design. */
(function () {
  "use strict";

  // ---- inline stage ---------------------------------------------------------
  var stage = document.querySelector("[data-rv-stage]");
  var state = { variant: "a", page: "/", sky: false, compressed: false, menu: false };

  function isOn(key) {
    if (key === "variant") return state.variant === "b";
    if (key === "page") return state.page === "/services";
    return !!state[key];
  }

  function render() {
    stage.innerHTML = VN.header({ variant: state.variant, page: state.page, cartCount: 3, skyUtility: state.sky });
    var header = stage.querySelector("[data-vn-header]");
    if (state.compressed) header.classList.add("vn-header--compressed");
    var trigger = stage.querySelector("[data-vn-menu-trigger]");
    if (state.menu && trigger) {
      var menu = stage.querySelector("[data-vn-menu]");
      if (menu) menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    }
    if (trigger) {
      trigger.addEventListener("click", function () {
        state.menu = !state.menu;
        render();
      });
    }
    Array.from(document.querySelectorAll("[data-rv-toggle]")).forEach(function (btn) {
      var key = btn.getAttribute("data-rv-toggle");
      btn.setAttribute("aria-pressed", isOn(key) ? "true" : "false");
    });
  }

  Array.from(document.querySelectorAll("[data-rv-toggle]")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-rv-toggle");
      if (key === "variant") state.variant = state.variant === "a" ? "b" : "a";
      else if (key === "page") state.page = state.page === "/services" ? "/" : "/services";
      else state[key] = !state[key];
      render();
    });
  });

  if (stage) render();

  // ---- decision forms -------------------------------------------------------
  function queueAnswer(form) {
    var id = form.getAttribute("data-rv-decision");
    var question = form.getAttribute("data-rv-question");
    var sel = form.querySelector("input[type=radio]:checked");
    if (!sel) return;
    var answer = sel.getAttribute("data-label") || sel.value;
    var noteEl = form.querySelector("[data-rv-note]");
    var note = noteEl ? noteEl.value.trim() : "";
    var text = id + " — " + question + ": " + answer + (note ? " | note: " + note : "");
    var queued = form.querySelector("[data-queued]");
    if (window.lavish && typeof window.lavish.queuePrompt === "function") {
      window.lavish.queuePrompt(
        text +
          ". Record this decision in the navigation review record, apply it to the design, and report the updated artifact in place.",
        {
          tag: "choice",
          text: text,
          element: form,
          queueKey: id,
          data: { id: id, question: question, answer: answer, note: note },
        }
      );
      if (queued) {
        queued.hidden = false;
        queued.textContent = "Sent — queued for the agent.";
      }
    } else if (queued) {
      queued.hidden = false;
      queued.textContent = "Selected (open inside Lavish to send it to the agent).";
    }
  }

  Array.from(document.querySelectorAll("[data-rv-decision]")).forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      queueAnswer(form);
    });
  });
})();
