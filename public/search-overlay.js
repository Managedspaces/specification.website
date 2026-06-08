// ⌘K / Ctrl-K global search overlay.
// Lazy-loads /pagefind/pagefind-ui.{css,js} on first open, then mounts the
// Pagefind UI inside a native <dialog>. No inline scripts so our strict CSP
// stays intact. Falls back to navigating to /search/ if Pagefind can't load
// (typically: the dev server, where the index doesn't exist).
(function () {
  var dialog = document.getElementById('search-overlay');
  if (!dialog) return;
  var mount = document.getElementById('search-overlay-mount');
  var closeButton = dialog.querySelector('[data-search-close]');
  var triggers = document.querySelectorAll('[data-search-trigger]');
  var loaded = false;
  var initialised = false;

  function loadAssets() {
    return new Promise(function (resolve, reject) {
      if (window.PagefindUI) return resolve();
      if (!document.querySelector('link[data-pagefind-css]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/pagefind/pagefind-ui.css';
        link.setAttribute('data-pagefind-css', '');
        document.head.appendChild(link);
      }
      var script = document.createElement('script');
      script.src = '/pagefind/pagefind-ui.js';
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('pagefind-ui.js failed to load')); };
      document.head.appendChild(script);
    });
  }

  function init() {
    if (initialised || !mount || typeof window.PagefindUI !== 'function') return;
    new window.PagefindUI({
      element: '#search-overlay-mount',
      showSubResults: true,
      showImages: false,
      resetStyles: false,
      pageSize: 6,
      excerptLength: 20,
      processTerm: function (term) { return term.toLowerCase(); },
    });
    // Pagefind renders a plain type=text input with its own clear button. Decorate
    // it for mobile keyboards — a Search-labelled enter key, the search keyboard
    // layout, and no autocapitalise/autocorrect on a query. We deliberately leave
    // it as type=text: type=search would add a *second*, native clear button on top
    // of Pagefind's. See /spec/accessibility/mobile-form-inputs/.
    var input = mount.querySelector('input');
    if (input) {
      input.setAttribute('inputmode', 'search');
      input.setAttribute('enterkeyhint', 'search');
      input.setAttribute('autocapitalize', 'none');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
    }
    initialised = true;
  }

  function focusInput() {
    requestAnimationFrame(function () {
      var input = dialog.querySelector('input');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  function open(prefill) {
    if (loaded === false) {
      loaded = true;
      loadAssets().then(function () { init(); focusInput(); })
        .catch(function () { window.location.href = '/search/'; });
    }
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      // Older browsers — graceful navigation fallback.
      window.location.href = '/search/';
      return;
    }
    if (initialised) focusInput();
    if (prefill) {
      var input = dialog.querySelector('input');
      if (input) {
        input.value = prefill;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  // Trigger: any element with data-search-trigger opens the overlay.
  triggers.forEach(function (t) {
    t.addEventListener('click', function (ev) {
      ev.preventDefault();
      open();
    });
  });

  // ⌘K / Ctrl-K from anywhere.
  document.addEventListener('keydown', function (ev) {
    var isCmdK = ev.key === 'k' && (ev.metaKey || ev.ctrlKey);
    if (isCmdK) {
      ev.preventDefault();
      if (dialog.open) close(); else open();
      return;
    }
    // "/" focus shortcut, like GitHub — only when not already in an input.
    if (ev.key === '/' && !dialog.open) {
      var target = ev.target;
      var inField = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (!inField) {
        ev.preventDefault();
        open();
      }
    }
  });

  if (closeButton) {
    closeButton.addEventListener('click', function () { close(); });
  }

  // Click outside the inner panel closes.
  dialog.addEventListener('click', function (ev) {
    if (ev.target === dialog) close();
  });

  // Clicking a result navigates and should close the overlay.
  dialog.addEventListener('click', function (ev) {
    var a = ev.target.closest('a');
    if (a && a.href) close();
  }, true);
})();
