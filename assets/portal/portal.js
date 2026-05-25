/* HyperSpec Index Portal */
(function () {
  "use strict";

  function getVisibleLinks() {
    return Array.from(document.querySelectorAll(".nav-link[data-page]")).filter(function (link) {
      return !link.hidden;
    });
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    var toggle = document.querySelector(".mobile-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function toggleSidebar() {
    var isOpen = document.body.classList.toggle("sidebar-open");
    var toggle = document.querySelector(".mobile-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function setActiveLink(activeLink) {
    getVisibleLinks().forEach(function (link) {
      link.classList.toggle("active", link === activeLink);
    });
  }

  function initLinks() {
    var links = getVisibleLinks();
    var frame = document.getElementById("content-frame");

    if (links.length === 0 || !frame) {
      document.body.classList.remove("has-documents");
      return;
    }

    document.body.classList.add("has-documents");

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        setActiveLink(link);
        closeSidebar();
      });
    });

    var initial = links.find(function (link) {
      return link.classList.contains("active");
    }) || links[0];

    setActiveLink(initial);
    if (!frame.getAttribute("src")) {
      frame.setAttribute("src", initial.getAttribute("href") || "about:blank");
    }
  }

  function initChrome() {
    var toggle = document.querySelector(".mobile-toggle");
    var overlay = document.getElementById("portal-overlay");

    if (toggle) {
      toggle.addEventListener("click", toggleSidebar);
    }
    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }
  }

  function init() {
    initChrome();
    initLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
