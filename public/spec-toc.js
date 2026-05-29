// Build the "On this page" table of contents from the article headings.
// External file (not inline) so the strict CSP holds on the deployed site.
(function () {
  function init() {
    var toc = document.getElementById('toc');
    if (!toc) return;
    var headings = document.querySelectorAll('.prose-spec h2[id], .prose-spec h3[id]');
    if (!headings.length) return;
    var frag = document.createDocumentFragment();
    headings.forEach(function (h) {
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent || '';
      a.className = h.tagName === 'H3'
        ? 'block pl-3 text-ink-600 hover:text-accent-700 no-underline'
        : 'block text-ink-700 hover:text-accent-700 no-underline';
      frag.appendChild(a);
    });
    toc.appendChild(frag);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
