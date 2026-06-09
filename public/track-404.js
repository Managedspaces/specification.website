// Report 404 hits to Plausible as a named "404" event carrying the path that
// was requested, so broken inbound links surface in their own report instead
// of hiding among ordinary pageviews. Loaded only in production, only from
// 404.astro. CSP-safe: external file served from 'self', no inline script.
(function () {
  // Queue stub, in case this runs before Plausible's script.js has loaded.
  // The real script flushes window.plausible.q on load.
  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  window.plausible("404", {
    props: { path: location.pathname + location.search },
  });
})();
