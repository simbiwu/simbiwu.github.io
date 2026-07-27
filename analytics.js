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

  var parameters = new URLSearchParams(window.location.search);
  var source = (parameters.get("utm_source") || "").trim().toLowerCase();
  var campaign = (parameters.get("utm_campaign") || "").trim().toLowerCase();
  var knownSources = /^(baidu|360|sogou|bing|google|github|csdn|zhihu|jianshu|juejin|oschina|tencent-cloud|aliyun|sohu|smzdm|51cto)$/;
  if (!knownSources.test(source)) {
    source = "";
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(campaign)) {
    campaign = "";
  }

  var basePayload = {
    schemaVersion: 2,
    page: window.location.pathname || "/",
    culture: window.navigator.language || "unknown",
    referrer: document.referrer || "",
    source: source,
    campaign: campaign
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
        source: eventType === "page_view" ? basePayload.source : "",
        campaign: eventType === "page_view" ? basePayload.campaign : "",
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
