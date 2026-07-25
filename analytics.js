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

  var basePayload = {
    schemaVersion: 1,
    page: window.location.pathname || "/",
    culture: window.navigator.language || "unknown",
    referrer: document.referrer || ""
  };
  var pageViewAccepted = false;
  var engagementSent = false;
  var interacted = false;
  var visibleMilliseconds = 0;
  var visibleSince = document.visibilityState === "visible" ? window.performance.now() : null;

  function submit(eventType) {
    return window.fetch("/api/v1/website/events", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schemaVersion: basePayload.schemaVersion,
        page: basePayload.page,
        culture: basePayload.culture,
        referrer: eventType === "page_view" ? basePayload.referrer : "",
        eventType: eventType
      }),
      keepalive: true
    });
  }

  function visibleDuration() {
    if (visibleSince === null) {
      return visibleMilliseconds;
    }
    return visibleMilliseconds + (window.performance.now() - visibleSince);
  }

  function confirmEngagement() {
    if (
      engagementSent ||
      !pageViewAccepted ||
      (!interacted && visibleDuration() < 10000)
    ) {
      return;
    }
    engagementSent = true;
    submit("engaged").catch(function () {
      // Website statistics must never affect page use.
    });
  }

  function noteInteraction() {
    interacted = true;
    confirmEngagement();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      visibleSince = window.performance.now();
    } else if (visibleSince !== null) {
      visibleMilliseconds += window.performance.now() - visibleSince;
      visibleSince = null;
    }
    confirmEngagement();
  });
  window.addEventListener("pointerdown", noteInteraction, { once: true });
  window.addEventListener("keydown", noteInteraction, { once: true });
  window.addEventListener("touchstart", noteInteraction, { once: true, passive: true });
  window.addEventListener("scroll", noteInteraction, { once: true, passive: true });
  var engagementTimer = window.setInterval(function () {
    confirmEngagement();
    if (engagementSent || visibleDuration() >= 60000) {
      window.clearInterval(engagementTimer);
    }
  }, 1000);

  submit("page_view")
    .then(function (response) {
      pageViewAccepted = response.ok;
      confirmEngagement();
    })
    .catch(function () {
      // Website statistics must never affect page use.
    });
})();
