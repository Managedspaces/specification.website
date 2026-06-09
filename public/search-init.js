// Initialise Pagefind UI without inline scripts so our strict CSP holds.
// The bundle at /pagefind/pagefind-ui.js exposes PagefindUI on window.
(function () {
  // Pagefind renders a plain type=text input with its own clear button. Decorate
  // it for mobile keyboards — a Search-labelled enter key, the search keyboard
  // layout, and no autocapitalise/autocorrect on a query. We deliberately leave
  // it as type=text: type=search would add a *second*, native clear button on top
  // of Pagefind's. See /spec/accessibility/mobile-form-inputs/.
  function tuneSearchInput(scope) {
    var input = scope.querySelector("input");
    if (!input) return;
    input.setAttribute("inputmode", "search");
    input.setAttribute("enterkeyhint", "search");
    input.setAttribute("autocapitalize", "none");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
  }
  // Report searches to Plausible: the term, the result count Pagefind shows,
  // and whether it matched anything. Debounced so we log settled queries, not
  // every keystroke. The count is read from Pagefind's own message, matching
  // "<n> result(s)" specifically so a numeric query (e.g. "http2") is never
  // mistaken for a count. Production only — window.plausible is undefined on
  // the dev server. CSP-safe: lives in this external file.
  function trackSearch(scope, surface) {
    var input = scope.querySelector("input");
    if (!input) return;
    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (typeof window.plausible !== "function") return;
        var term = input.value.trim().toLowerCase();
        if (term.length < 2) return;
        var msg = scope.querySelector(".pagefind-ui__message");
        if (!msg) return;
        var text = msg.textContent || "";
        var count = null;
        var m = text.match(/([\d,]+)\s+results?\b/i);
        if (m) count = parseInt(m[1].replace(/,/g, ""), 10);
        else if (/no results/i.test(text)) count = 0;
        if (count === null) return; // transient state, e.g. "Searching…"
        window.plausible("Search", {
          props: {
            term: term,
            results: count,
            found: count > 0,
            surface: surface,
          },
        });
      }, 800);
    });
  }
  function init() {
    var mount = document.getElementById("search");
    if (!mount) return;
    if (typeof window.PagefindUI !== "function") {
      var p = document.createElement("p");
      p.className = "text-sm text-ink-600";
      p.appendChild(document.createTextNode("Search index is built during "));
      var code = document.createElement("code");
      code.textContent = "npm run build";
      p.appendChild(code);
      p.appendChild(
        document.createTextNode(
          ". It is unavailable on the dev server — try the deployed site.",
        ),
      );
      mount.replaceChildren(p);
      return;
    }
    new window.PagefindUI({
      element: "#search",
      showSubResults: true,
      showImages: false,
      resetStyles: false,
      pageSize: 8,
      excerptLength: 24,
      processTerm: function (term) {
        return term.toLowerCase();
      },
    });

    tuneSearchInput(mount);
    trackSearch(mount, "page");

    // Pre-fill from ?q=
    var url = new URL(window.location.href);
    var q = url.searchParams.get("q");
    if (q) {
      var input = mount.querySelector("input");
      if (input) {
        input.value = q;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
