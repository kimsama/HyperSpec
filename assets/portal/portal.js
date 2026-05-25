/* HyperSpec Index Portal */
(function () {
  "use strict";

  /** @type {object|null} */
  var manifest = null;
  /** @type {Set<string>} */
  var activeCategories = new Set();
  /** @type {Set<string>} */
  var activeTags = new Set();
  /** @type {string} */
  var activeLocale = "en";
  /** @type {string} */
  var sortBy = "updated";
  /** @type {string} */
  var searchQuery = "";

  // ---- Data loading ----

  async function loadManifest() {
    var grid = document.querySelector(".portal-grid");
    try {
      var res = await fetch("manifest.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      manifest = await res.json();
      if (!Array.isArray(manifest.documents)) manifest.documents = [];
      buildFilters();
      render();
    } catch (err) {
      if (grid) {
        grid.innerHTML = '<div class="portal-empty"><div class="portal-empty-icon">&#128196;</div><h2>No manifest found</h2><p>No <code>manifest.json</code> found. Run <code>hyperspec build</code> to generate documents.</p></div>';
      }
    }
  }

  // ---- Filtering & sorting ----

  function getFilteredDocs() {
    if (!manifest || !Array.isArray(manifest.documents)) return [];

    var docs = manifest.documents.filter(function (doc) {
      // Locale filter
      var locale = doc.locale || "en";
      if (locale !== activeLocale) return false;

      // Category filter
      if (activeCategories.size > 0 && !activeCategories.has(doc.category || "")) return false;

      // Tag filter
      if (activeTags.size > 0) {
        var tags = Array.isArray(doc.tags) ? doc.tags : [];
        var hasTag = tags.some(function (t) { return activeTags.has(t); });
        if (!hasTag) return false;
      }

      // Search filter (title + tags)
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        var title = (doc.title || "").toLowerCase();
        var tagStr = (Array.isArray(doc.tags) ? doc.tags : []).join(" ").toLowerCase();
        if (!title.includes(q) && !tagStr.includes(q)) return false;
      }

      return true;
    });

    // Sort
    docs = docs.slice().sort(function (a, b) {
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "category") {
        return (a.category || "").localeCompare(b.category || "");
      }
      // Default: updated desc
      var da = a.updatedAt || a.createdAt || "";
      var db = b.updatedAt || b.createdAt || "";
      if (da < db) return 1;
      if (da > db) return -1;
      return 0;
    });

    return docs;
  }

  // ---- Build filter UI ----

  function buildFilters() {
    if (!manifest) return;
    var docs = manifest.documents;

    // Collect unique categories and tags
    var categories = [];
    var tags = [];
    var seenCats = {};
    var seenTags = {};

    docs.forEach(function (doc) {
      if (doc.category && !seenCats[doc.category]) {
        seenCats[doc.category] = true;
        categories.push(doc.category);
      }
      if (Array.isArray(doc.tags)) {
        doc.tags.forEach(function (tag) {
          if (tag && !seenTags[tag]) {
            seenTags[tag] = true;
            tags.push(tag);
          }
        });
      }
    });

    categories.sort();
    tags.sort();

    var filtersEl = document.querySelector(".portal-filters");
    if (!filtersEl) return;
    filtersEl.innerHTML = "";

    // Category chips
    if (categories.length > 0) {
      var catLabel = document.createElement("span");
      catLabel.className = "portal-filters-label";
      catLabel.textContent = "Category:";
      filtersEl.appendChild(catLabel);

      categories.forEach(function (cat) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "portal-chip";
        chip.textContent = cat;
        chip.dataset.category = cat;
        chip.addEventListener("click", function () {
          if (activeCategories.has(cat)) {
            activeCategories.delete(cat);
            chip.classList.remove("active");
          } else {
            activeCategories.add(cat);
            chip.classList.add("active");
          }
          render();
        });
        filtersEl.appendChild(chip);
      });
    }

    // Tag chips
    if (tags.length > 0) {
      var tagLabel = document.createElement("span");
      tagLabel.className = "portal-filters-label";
      tagLabel.style.marginLeft = "8px";
      tagLabel.textContent = "Tags:";
      filtersEl.appendChild(tagLabel);

      tags.forEach(function (tag) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "portal-chip";
        chip.textContent = tag;
        chip.dataset.tag = tag;
        chip.addEventListener("click", function () {
          if (activeTags.has(tag)) {
            activeTags.delete(tag);
            chip.classList.remove("active");
          } else {
            activeTags.add(tag);
            chip.classList.add("active");
          }
          render();
        });
        filtersEl.appendChild(chip);
      });
    }

    // Sort select
    var sortSep = document.createElement("span");
    sortSep.className = "portal-filters-label";
    sortSep.style.marginLeft = "8px";
    sortSep.textContent = "Sort:";
    filtersEl.appendChild(sortSep);

    var sortEl = document.createElement("select");
    sortEl.className = "portal-sort";
    sortEl.innerHTML = '<option value="updated">Recently updated</option><option value="title">Title A–Z</option><option value="category">Category</option>';
    sortEl.addEventListener("change", function () {
      sortBy = sortEl.value;
      render();
    });
    filtersEl.appendChild(sortEl);

    // Locale switcher
    var localeEl = document.createElement("div");
    localeEl.className = "portal-locale-switch";

    var locales = collectLocales(docs);
    if (locales.length < 2) {
      // Only one locale — no need for switcher
      locales = [];
    }

    if (locales.length > 0) {
      locales.forEach(function (loc) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = loc.toUpperCase();
        if (loc === activeLocale) btn.classList.add("active");
        btn.addEventListener("click", function () {
          activeLocale = loc;
          localeEl.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          render();
        });
        localeEl.appendChild(btn);
      });
      filtersEl.appendChild(localeEl);
    }
  }

  function collectLocales(docs) {
    var seen = {};
    var locales = [];
    docs.forEach(function (doc) {
      var loc = doc.locale || "en";
      if (!seen[loc]) {
        seen[loc] = true;
        locales.push(loc);
      }
    });
    // Ensure "en" comes first
    locales.sort(function (a, b) {
      if (a === "en") return -1;
      if (b === "en") return 1;
      return a.localeCompare(b);
    });
    return locales;
  }

  // ---- Render cards ----

  function render() {
    var grid = document.querySelector(".portal-grid");
    if (!grid) return;

    var docs = getFilteredDocs();

    if (docs.length === 0) {
      grid.innerHTML = '<div class="portal-empty"><div class="portal-empty-icon">&#128269;</div><h2>No documents found</h2><p>Try adjusting your filters or search query.</p></div>';
      return;
    }

    // Find the "en" version of each doc by path mapping for outdated detection
    var enByPath = buildEnIndex();

    grid.innerHTML = "";
    docs.forEach(function (doc) {
      var card = buildCard(doc, enByPath);
      grid.appendChild(card);
    });
  }

  function buildEnIndex() {
    if (!manifest) return {};
    var map = {};
    manifest.documents.forEach(function (doc) {
      var locale = doc.locale || "en";
      if (locale === "en" && doc.path) {
        // Key by base name without locale prefix
        map[doc.path] = doc;
      }
    });
    return map;
  }

  function buildCard(doc, enByPath) {
    var a = document.createElement("a");
    a.className = "portal-card";
    a.href = doc.path || "#";

    // Title
    var titleEl = document.createElement("h2");
    titleEl.className = "portal-card-title";
    titleEl.textContent = doc.title || "(Untitled)";
    a.appendChild(titleEl);

    // Meta row
    var meta = document.createElement("div");
    meta.className = "portal-card-meta";

    var cat = doc.category || "";
    if (cat) {
      var catEl = document.createElement("span");
      var catSlug = "category-" + cat.toLowerCase().replace(/[^a-z0-9]/g, "-");
      catEl.className = "portal-category " + catSlug;
      catEl.textContent = cat;
      meta.appendChild(catEl);
    }

    var tags = Array.isArray(doc.tags) ? doc.tags : [];
    tags.forEach(function (tag) {
      var tagEl = document.createElement("span");
      tagEl.className = "portal-tag";
      tagEl.textContent = tag;
      meta.appendChild(tagEl);
    });

    a.appendChild(meta);

    // Footer
    var footer = document.createElement("div");
    footer.className = "portal-card-footer";

    var dateBlock = document.createElement("span");
    dateBlock.className = "portal-card-date";

    var dateStr = doc.updatedAt || doc.createdAt || "";
    if (dateStr) {
      try {
        var d = new Date(dateStr);
        dateBlock.textContent = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      } catch (e) {
        dateBlock.textContent = dateStr;
      }
    }

    if (doc.version) {
      var verEl = document.createElement("span");
      verEl.textContent = "v" + doc.version;
      verEl.style.marginLeft = "6px";
      dateBlock.appendChild(verEl);
    }

    footer.appendChild(dateBlock);

    // Outdated check: translation is outdated if en version was updated after this doc
    var locale = doc.locale || "en";
    if (locale !== "en" && doc.enPath) {
      var enDoc = enByPath[doc.enPath];
      if (enDoc) {
        var enDate = enDoc.updatedAt || enDoc.createdAt || "";
        var myDate = doc.updatedAt || doc.createdAt || "";
        if (enDate && myDate && enDate > myDate) {
          var outdatedEl = document.createElement("span");
          outdatedEl.className = "portal-outdated";
          outdatedEl.innerHTML = "&#9888; Outdated";
          footer.appendChild(outdatedEl);
        }
      }
    }

    a.appendChild(footer);
    return a;
  }

  // ---- Search debounce ----

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  // ---- Init ----

  function init() {
    var searchEl = document.querySelector(".portal-search");
    if (searchEl) {
      searchEl.addEventListener("input", debounce(function () {
        searchQuery = searchEl.value.trim();
        render();
      }, 200));
    }
    loadManifest();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
