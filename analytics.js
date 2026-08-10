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

  var knownSources = /^(baidu|360|sogou|bing|google|github|csdn|zhihu|jianshu|juejin|oschina|tencent-cloud|aliyun|sohu|smzdm|51cto|eefocus|sina)$/;
  var campaignPattern = /^[a-z0-9][a-z0-9._-]{0,63}$/;
  var storagePrefix = "swd-attribution-v1:";
  var parameters = new URLSearchParams(window.location.search);

  function cleanSource(value) {
    var text = (value || "").trim().toLowerCase();
    return knownSources.test(text) ? text : "";
  }

  function cleanCampaign(value) {
    var text = (value || "").trim().toLowerCase();
    return campaignPattern.test(text) ? text : "";
  }

  function readStored(name, cleaner) {
    try {
      return cleaner(window.sessionStorage.getItem(storagePrefix + name) || "");
    } catch (_) {
      return "";
    }
  }

  function storeValue(name, value) {
    if (!value) {
      return;
    }
    try {
      window.sessionStorage.setItem(storagePrefix + name, value);
    } catch (_) {
      // Attribution must never affect page use.
    }
  }

  var source = cleanSource(parameters.get("utm_source")) || readStored("source", cleanSource);
  var campaign = cleanCampaign(parameters.get("utm_campaign")) || readStored("campaign", cleanCampaign);
  storeValue("source", source);
  storeValue("campaign", campaign);

  function downloadSource(existingSource) {
    var existing = (existingSource || "").trim().toLowerCase();
    if (source) {
      return source;
    }
    return existing || (/\/en(?:\.html)?$/i.test(window.location.pathname) ? "website-en" : "website-zh");
  }

  function enrichDownloadLinks() {
    var links = document.querySelectorAll('a[href*="/downloads/SuperWatchDogSetup.exe"]');
    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (_) {
        return;
      }
      if (!/^(www\.)?superwatchdog\.me$/i.test(url.hostname)) {
        return;
      }
      var effectiveSource = downloadSource(url.searchParams.get("source"));
      if (effectiveSource) {
        url.searchParams.set("source", effectiveSource);
        url.searchParams.set("utm_source", effectiveSource);
      }
      if (campaign) {
        url.searchParams.set("utm_campaign", campaign);
      }
      url.searchParams.set("utm_landing", window.location.pathname || "/");
      link.setAttribute("href", url.toString());
    });
  }
  enrichDownloadLinks();

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
