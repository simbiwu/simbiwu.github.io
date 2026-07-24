(function () {
  "use strict";

  var storageKey = "superwatchdog.website.language";
  var languageChoices = ["zh", "en"];

  function normalizeLanguage(language) {
    return String(language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function readSavedLanguage() {
    try {
      var savedLanguage = window.localStorage.getItem(storageKey);
      return languageChoices.includes(savedLanguage) ? savedLanguage : "";
    } catch (_error) {
      return "";
    }
  }

  function saveLanguage(language) {
    if (!languageChoices.includes(language)) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, language);
    } catch (_error) {
      // The website still works when storage is unavailable.
    }
  }

  function isSearchCrawler() {
    return /bot|spider|crawler|slurp|bingpreview|facebookexternalhit|twitterbot|telegrambot|whatsapp/i.test(
      window.navigator.userAgent || ""
    );
  }

  function bindLanguageChoices() {
    document.querySelectorAll("[data-language-choice]").forEach(function (link) {
      link.addEventListener("click", function () {
        saveLanguage(link.getAttribute("data-language-choice"));
      });
    });
  }

  if (
    document.documentElement.dataset.autoLanguage === "true" &&
    !isSearchCrawler()
  ) {
    var savedLanguage = readSavedLanguage();
    var browserLanguage =
      (window.navigator.languages && window.navigator.languages[0]) ||
      window.navigator.language ||
      "";
    var preferredLanguage =
      savedLanguage || (browserLanguage ? normalizeLanguage(browserLanguage) : "zh");

    if (preferredLanguage === "en") {
      var englishUrl = new URL("en.html", window.location.href);
      englishUrl.search = window.location.search;
      englishUrl.hash = window.location.hash;
      window.location.replace(englishUrl.href);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindLanguageChoices, {
      once: true
    });
  } else {
    bindLanguageChoices();
  }
})();
