(function () {
  "use strict";

  if (
    window.location.protocol !== "https:" ||
    !/^(www\.)?superwatchdog\.me$/i.test(window.location.hostname) ||
    /bot|spider|crawler|slurp|bingpreview|facebookexternalhit|twitterbot|telegrambot|whatsapp|headless/i.test(
      window.navigator.userAgent || ""
    )
  ) {
    return;
  }

  var payload = {
    schemaVersion: 1,
    page: window.location.pathname || "/",
    culture: window.navigator.language || "unknown",
    referrer: document.referrer || ""
  };

  window
    .fetch("/api/v1/website/events", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    })
    .catch(function () {
      // Website statistics must never affect page use.
    });
})();
