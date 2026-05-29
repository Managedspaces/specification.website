// Initialise Pagefind UI without inline scripts so our strict CSP holds.
// The bundle at /pagefind/pagefind-ui.js exposes PagefindUI on window.
(function () {
  function init() {
    var mount = document.getElementById('search');
    if (!mount) return;
    if (typeof window.PagefindUI !== 'function') {
      var p = document.createElement('p');
      p.className = 'text-sm text-ink-600';
      p.appendChild(document.createTextNode('Search index is built during '));
      var code = document.createElement('code');
      code.textContent = 'npm run build';
      p.appendChild(code);
      p.appendChild(document.createTextNode(
        '. It is unavailable on the dev server — try the deployed site.'
      ));
      mount.replaceChildren(p);
      return;
    }
    new window.PagefindUI({
      element: '#search',
      showSubResults: true,
      showImages: false,
      resetStyles: false,
      pageSize: 8,
      excerptLength: 24,
      processTerm: function (term) { return term.toLowerCase(); },
    });

    // Pre-fill from ?q=
    var url = new URL(window.location.href);
    var q = url.searchParams.get('q');
    if (q) {
      var input = mount.querySelector('input');
      if (input) {
        input.value = q;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
