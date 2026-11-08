/**
 * Rewrites legacy client fetches to http://localhost:3002 → same-origin /api (Next proxy).
 * Loads before app bundles so old Docker chunks still work on :3005.
 */
(function () {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  var LEGACY_HOSTS = ['http://localhost:3002', 'http://127.0.0.1:3002'];
  var nativeFetch = window.fetch.bind(window);

  function rewriteUrl(url) {
    if (typeof url !== 'string') return url;
    for (var i = 0; i < LEGACY_HOSTS.length; i += 1) {
      var base = LEGACY_HOSTS[i];
      if (url.indexOf(base) === 0) {
        return url.slice(base.length) || '/';
      }
    }
    return url;
  }

  window.fetch = function (input, init) {
    if (typeof input === 'string') {
      return nativeFetch(rewriteUrl(input), init);
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
      var nextUrl = rewriteUrl(input.url);
      if (nextUrl !== input.url) {
        return nativeFetch(new Request(nextUrl, input), init);
      }
    }
    return nativeFetch(input, init);
  };
})();
