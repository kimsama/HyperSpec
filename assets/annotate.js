// HyperSpec Annotation Module
(function () {
  "use strict";

  // ── 0. Iframe Detection ─────────────────────────────────────────────
  var isEmbedded = false;
  try { isEmbedded = window.self !== window.top; } catch (e) { isEmbedded = true; }
  if (!isEmbedded && window.location.search.indexOf("embedded") !== -1) {
    isEmbedded = true;
  }
  if (isEmbedded) {
    document.documentElement.classList.add("hs-embedded");
  }

  // ── 1. Storage ──────────────────────────────────────────────────────
  var annotations = [];
  var currentSelection = null;
  var currentAnnotationType = null;

  function getDocumentId() {
    var metaEl = document.getElementById("hyperspec-meta");
    if (metaEl) {
      try {
        var meta = JSON.parse(metaEl.textContent);
        if (meta.title) return meta.title;
      } catch (e) { /* ignore */ }
    }
    return window.location.pathname;
  }

  function getMetaField(field, fallback) {
    var metaEl = document.getElementById("hyperspec-meta");
    if (metaEl) {
      try {
        var meta = JSON.parse(metaEl.textContent);
        if (meta[field] !== undefined) return meta[field];
      } catch (e) { /* ignore */ }
    }
    return fallback;
  }

  function getStorageKey() {
    return "hyperspec-annotations-" + getDocumentId();
  }

  function loadAnnotations() {
    try {
      var raw = localStorage.getItem(getStorageKey());
      annotations = raw ? JSON.parse(raw) : [];
    } catch (e) {
      annotations = [];
    }
    return annotations;
  }

  function saveAnnotations() {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(annotations));
    } catch (e) { /* quota exceeded, etc. */ }
  }

  function clearAnnotations() {
    annotations = [];
    try { localStorage.removeItem(getStorageKey()); } catch (e) { /* ignore */ }
    removeAllHighlights();
    renderPanelList();
    updateBadge();
  }

  // ── Utility ─────────────────────────────────────────────────────────
  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID v4
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function isInsideHyperSpecUI(node) {
    var el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (el) {
      if (
        el.id === "hs-toolbar" ||
        el.id === "hs-popover" ||
        el.id === "hs-panel" ||
        el.id === "hs-export-btn" ||
        el.id === "hs-panel-toggle" ||
        el.classList.contains("hs-toast")
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function getXPath(node) {
    if (!node) return "";
    if (node.nodeType === Node.DOCUMENT_NODE) return "/";
    var parts = [];
    var current = node;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      var index = 1;
      var sibling = current.previousSibling;
      while (sibling) {
        if (
          sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.nodeName === current.nodeName
        ) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      parts.unshift(current.nodeName.toLowerCase() + "[" + index + "]");
      current = current.parentNode;
    }
    return "/" + parts.join("/");
  }

  // ── 2. Selection Detection ──────────────────────────────────────────
  function handleMouseUp(e) {
    // Ignore clicks inside HyperSpec UI
    if (isInsideHyperSpecUI(e.target)) return;

    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return;
    }

    var range = sel.getRangeAt(0);

    // Ignore selection inside HyperSpec UI
    if (
      isInsideHyperSpecUI(range.startContainer) ||
      isInsideHyperSpecUI(range.endContainer)
    ) {
      return;
    }

    currentSelection = {
      text: sel.toString().trim(),
      range: range.cloneRange(),
    };

    showToolbar(range);
  }

  // ── 3. Floating Toolbar ─────────────────────────────────────────────
  var toolbar = null;

  function createToolbar() {
    toolbar = document.createElement("div");
    toolbar.id = "hs-toolbar";
    toolbar.innerHTML =
      '<button class="hs-toolbar-btn" data-action="comment" title="Comment">💬</button>' +
      '<button class="hs-toolbar-btn" data-action="modify" title="Modify">✏️</button>' +
      '<button class="hs-toolbar-btn" data-action="delete" title="Delete">🗑️</button>' +
      '<button class="hs-toolbar-btn" data-action="insert" title="Insert After">➕</button>';
    toolbar.style.display = "none";
    document.body.appendChild(toolbar);

    toolbar.addEventListener("mousedown", function (e) {
      e.preventDefault(); // Keep selection alive
    });

    toolbar.addEventListener("click", function (e) {
      var btn = e.target.closest(".hs-toolbar-btn");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      currentAnnotationType = action;
      hideToolbar();
      showPopover(action);
    });
  }

  function showToolbar(range) {
    if (!toolbar) return;
    var rect = range.getBoundingClientRect();
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    var left = rect.left + scrollX + rect.width / 2 - 90;
    var top = rect.top + scrollY - 48;

    // Avoid overflow right
    if (left + 180 > document.documentElement.scrollWidth) {
      left = document.documentElement.scrollWidth - 190;
    }
    if (left < 4) left = 4;
    // Avoid overflow top — show below if too close to top
    if (top < scrollY + 4) {
      top = rect.bottom + scrollY + 8;
    }

    toolbar.style.left = left + "px";
    toolbar.style.top = top + "px";
    toolbar.style.display = "flex";
    toolbar.classList.add("hs-toolbar-visible");
  }

  function hideToolbar() {
    if (!toolbar) return;
    toolbar.classList.remove("hs-toolbar-visible");
    toolbar.style.display = "none";
  }

  // ── 4. Popover ──────────────────────────────────────────────────────
  var popover = null;

  function createPopover() {
    popover = document.createElement("div");
    popover.id = "hs-popover";
    popover.innerHTML =
      '<div class="hs-popover-header">' +
      '  <span class="hs-popover-title"></span>' +
      '  <button class="hs-popover-close" title="Close">×</button>' +
      "</div>" +
      '<div class="hs-popover-body">' +
      '  <label class="hs-popover-label">Comment</label>' +
      '  <textarea class="hs-popover-comment" rows="3" placeholder="Enter your feedback..."></textarea>' +
      '  <label class="hs-popover-label hs-popover-suggestion-label">Suggested replacement</label>' +
      '  <textarea class="hs-popover-suggestion" rows="3" placeholder="Enter replacement text..."></textarea>' +
      '  <div class="hs-popover-actions">' +
      '    <button class="hs-popover-btn hs-popover-cancel">Cancel</button>' +
      '    <button class="hs-popover-btn hs-popover-save">Save</button>' +
      "  </div>" +
      "</div>";
    popover.style.display = "none";
    document.body.appendChild(popover);

    popover.addEventListener("mousedown", function (e) {
      e.stopPropagation();
    });

    popover.querySelector(".hs-popover-close").addEventListener("click", hidePopover);
    popover.querySelector(".hs-popover-cancel").addEventListener("click", hidePopover);
    popover.querySelector(".hs-popover-save").addEventListener("click", handleSave);
  }

  var ACTION_LABELS = {
    comment: "💬 Comment",
    modify: "✏️ Modify",
    delete: "🗑️ Delete",
    insert: "➕ Insert After",
  };

  function showPopover(action) {
    if (!popover || !currentSelection) return;

    popover.querySelector(".hs-popover-title").textContent =
      ACTION_LABELS[action] || action;

    // Reset fields
    popover.querySelector(".hs-popover-comment").value = "";
    popover.querySelector(".hs-popover-suggestion").value = "";

    // Show/hide suggestion textarea
    var suggestionLabel = popover.querySelector(".hs-popover-suggestion-label");
    var suggestionField = popover.querySelector(".hs-popover-suggestion");
    if (action === "modify") {
      suggestionLabel.style.display = "";
      suggestionField.style.display = "";
    } else {
      suggestionLabel.style.display = "none";
      suggestionField.style.display = "none";
    }

    // Position below selection
    var rect = currentSelection.range.getBoundingClientRect();
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    var left = rect.left + scrollX;
    var top = rect.bottom + scrollY + 10;

    // Avoid viewport overflow
    var popoverWidth = 340;
    if (left + popoverWidth > document.documentElement.scrollWidth) {
      left = document.documentElement.scrollWidth - popoverWidth - 10;
    }
    if (left < 10) left = 10;

    popover.style.left = left + "px";
    popover.style.top = top + "px";
    popover.style.display = "block";

    // Focus comment textarea
    setTimeout(function () {
      popover.querySelector(".hs-popover-comment").focus();
    }, 50);
  }

  function hidePopover() {
    if (!popover) return;
    popover.style.display = "none";
    currentAnnotationType = null;
  }

  // ── 5. Save Annotation ─────────────────────────────────────────────
  function handleSave() {
    if (!currentSelection || !currentAnnotationType) return;

    var commentEl = popover.querySelector(".hs-popover-comment");
    var suggestionEl = popover.querySelector(".hs-popover-suggestion");

    var annotation = {
      id: generateId(),
      type: currentAnnotationType,
      selectedText: currentSelection.text,
      comment: commentEl.value.trim(),
      suggestedChange:
        currentAnnotationType === "modify" ? suggestionEl.value.trim() : undefined,
      section: findNearestSection(currentSelection.range.startContainer),
      xpath: getXPath(
        currentSelection.range.startContainer.nodeType === Node.ELEMENT_NODE
          ? currentSelection.range.startContainer
          : currentSelection.range.startContainer.parentElement
      ),
      rangeStart: currentSelection.range.startOffset,
      rangeEnd: currentSelection.range.endOffset,
      createdAt: new Date().toISOString(),
    };

    annotations.push(annotation);
    saveAnnotations();

    // Highlight
    try {
      highlightAnnotation(annotation, currentSelection.range);
    } catch (e) {
      // Cross-element range — still saved, just not highlighted inline
    }

    renderPanelList();
    updateBadge();
    hidePopover();

    // Clear browser selection
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    currentSelection = null;
    currentAnnotationType = null;
  }

  // ── 6. Section Detection ────────────────────────────────────────────
  function findNearestSection(node) {
    var el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

    while (el && el !== document.body) {
      // Check if current element is a heading
      if (/^H[1-6]$/.test(el.tagName)) {
        return el.textContent.trim();
      }

      // Check previous siblings for headings
      var prev = el.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName)) {
          return prev.textContent.trim();
        }
        prev = prev.previousElementSibling;
      }

      el = el.parentElement;
    }

    return "(top-level)";
  }

  // ── 7. Highlighting ────────────────────────────────────────────────
  function highlightAnnotation(annotation, range) {
    if (!range) return;
    var mark = document.createElement("mark");
    mark.className = "hs-highlight hs-highlight-" + annotation.type;
    mark.setAttribute("data-annotation-id", annotation.id);

    try {
      range.surroundContents(mark);
    } catch (e) {
      // surroundContents fails on cross-element ranges.
      // Fallback: extract and wrap.
      var fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }
  }

  function removeAllHighlights() {
    var marks = document.querySelectorAll("mark.hs-highlight");
    for (var i = 0; i < marks.length; i++) {
      var mark = marks[i];
      var parent = mark.parentNode;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  }

  function removeHighlightById(id) {
    var mark = document.querySelector('mark.hs-highlight[data-annotation-id="' + id + '"]');
    if (!mark) return;
    var parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }

  // ── 8. Side Panel ──────────────────────────────────────────────────
  var panel = null;

  function createPanel() {
    panel = document.createElement("div");
    panel.id = "hs-panel";
    panel.innerHTML =
      '<div class="hs-panel-header">' +
      '  <span class="hs-panel-title">Annotations</span>' +
      '  <button class="hs-panel-close" title="Close panel">×</button>' +
      "</div>" +
      '<div class="hs-panel-list"></div>' +
      '<div class="hs-panel-footer">' +
      '  <button class="hs-panel-clear">Clear All</button>' +
      "</div>";
    document.body.appendChild(panel);

    panel.querySelector(".hs-panel-close").addEventListener("click", function () {
      panel.classList.remove("hs-panel-open");
    });

    panel.querySelector(".hs-panel-clear").addEventListener("click", function () {
      if (annotations.length === 0) return;
      if (confirm("Clear all annotations for this document?")) {
        clearAnnotations();
      }
    });
  }

  var TYPE_ICONS = {
    comment: "💬",
    modify: "✏️",
    delete: "🗑️",
    insert: "➕",
  };

  function renderPanelList() {
    if (!panel) return;
    var list = panel.querySelector(".hs-panel-list");
    list.innerHTML = "";

    if (annotations.length === 0) {
      list.innerHTML = '<div class="hs-panel-empty">No annotations yet. Select text to begin.</div>';
      return;
    }

    for (var i = 0; i < annotations.length; i++) {
      var a = annotations[i];
      var card = document.createElement("div");
      card.className = "hs-panel-card hs-panel-card-" + a.type;
      card.setAttribute("data-annotation-id", a.id);

      var excerpt =
        a.selectedText.length > 60
          ? a.selectedText.substring(0, 60) + "…"
          : a.selectedText;

      card.innerHTML =
        '<div class="hs-panel-card-header">' +
        '  <span class="hs-panel-card-icon">' + (TYPE_ICONS[a.type] || "") + "</span>" +
        '  <span class="hs-panel-card-type">' + a.type + "</span>" +
        '  <button class="hs-panel-card-delete" title="Delete annotation">×</button>' +
        "</div>" +
        '<div class="hs-panel-card-excerpt">"' + escapeHtml(excerpt) + '"</div>' +
        (a.comment ? '<div class="hs-panel-card-comment">' + escapeHtml(a.comment) + "</div>" : "") +
        (a.suggestedChange ? '<div class="hs-panel-card-suggestion">Suggestion: ' + escapeHtml(a.suggestedChange) + "</div>" : "") +
        '<div class="hs-panel-card-section">§ ' + escapeHtml(a.section || "") + "</div>";

      list.appendChild(card);
    }

    // Event delegation for card clicks
    list.onclick = function (e) {
      var deleteBtn = e.target.closest(".hs-panel-card-delete");
      if (deleteBtn) {
        var cardEl = deleteBtn.closest(".hs-panel-card");
        var id = cardEl.getAttribute("data-annotation-id");
        deleteAnnotation(id);
        return;
      }

      var cardEl = e.target.closest(".hs-panel-card");
      if (cardEl) {
        var id = cardEl.getAttribute("data-annotation-id");
        scrollToHighlight(id);
      }
    };
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function deleteAnnotation(id) {
    annotations = annotations.filter(function (a) { return a.id !== id; });
    saveAnnotations();
    removeHighlightById(id);
    renderPanelList();
    updateBadge();
  }

  function scrollToHighlight(id) {
    var mark = document.querySelector('mark.hs-highlight[data-annotation-id="' + id + '"]');
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      mark.classList.add("hs-highlight-flash");
      setTimeout(function () {
        mark.classList.remove("hs-highlight-flash");
      }, 1500);
    }
  }

  function togglePanel() {
    if (!panel) return;
    panel.classList.toggle("hs-panel-open");
  }

  // ── 9. Export Feedback ──────────────────────────────────────────────
  var exportBtn = null;

  function createExportButton() {
    exportBtn = document.createElement("button");
    exportBtn.id = "hs-export-btn";
    exportBtn.innerHTML = '📋 <span class="hs-badge">0</span>';
    exportBtn.title = "Export feedback to clipboard";
    document.body.appendChild(exportBtn);

    exportBtn.addEventListener("click", exportFeedback);
  }

  function updateBadge() {
    if (!exportBtn) return;
    var badge = exportBtn.querySelector(".hs-badge");
    if (badge) {
      badge.textContent = annotations.length;
      badge.style.display = annotations.length > 0 ? "" : "none";
    }
  }

  function exportFeedback() {
    if (annotations.length === 0) {
      showToast("No annotations to export.");
      return;
    }

    // Build summary
    var counts = {};
    for (var i = 0; i < annotations.length; i++) {
      var t = annotations[i].type;
      counts[t] = (counts[t] || 0) + 1;
    }
    var parts = [];
    for (var key in counts) {
      if (counts.hasOwnProperty(key)) {
        parts.push(counts[key] + " " + key);
      }
    }
    var summary = annotations.length + " annotations: " + parts.join(", ");

    var exportData = {
      document: getMetaField("title", window.location.pathname),
      documentTitle: getMetaField("title", document.title),
      timestamp: new Date().toISOString(),
      version: getMetaField("version", 1),
      summary: summary,
      annotations: annotations.map(function (a) {
        var clean = {
          id: a.id,
          type: a.type,
          selectedText: a.selectedText,
          comment: a.comment,
          section: a.section,
        };
        if (a.suggestedChange) {
          clean.suggestedChange = a.suggestedChange;
        }
        return clean;
      }),
    };

    var json = JSON.stringify(exportData, null, 2);

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(
        function () {
          showToast("Feedback copied! Paste into your agent.");
        },
        function () {
          fallbackCopy(json);
        }
      );
    } else {
      fallbackCopy(json);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("Feedback copied! Paste into your agent.");
    } catch (e) {
      showToast("Could not copy. Check console for output.");
      console.log("[HyperSpec] Export data:\n", text);
    }
    document.body.removeChild(textarea);
  }

  // ── 10. Panel Toggle Button ─────────────────────────────────────────
  var panelToggle = null;

  function createPanelToggle() {
    panelToggle = document.createElement("button");
    panelToggle.id = "hs-panel-toggle";
    panelToggle.innerHTML = "☰";
    panelToggle.title = "Toggle annotations panel";
    document.body.appendChild(panelToggle);

    panelToggle.addEventListener("click", togglePanel);
  }

  // ── 11. Toast ───────────────────────────────────────────────────────
  function showToast(message) {
    var existing = document.querySelector(".hs-toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className = "hs-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow then animate in
    toast.offsetHeight; // force reflow
    toast.classList.add("hs-toast-visible");

    setTimeout(function () {
      toast.classList.remove("hs-toast-visible");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  // ── 12. Init ────────────────────────────────────────────────────────
  function init() {
    loadAnnotations();

    // Create UI elements
    createToolbar();
    createPopover();
    createPanel();
    createExportButton();
    createPanelToggle();

    // Restore highlights from saved annotations (best-effort)
    // Highlights cannot be reliably restored from xpath/offset after page reload
    // because DOM may differ. We keep annotations in the panel regardless.
    renderPanelList();
    updateBadge();

    // Selection detection
    document.addEventListener("mouseup", handleMouseUp);

    // Click outside to dismiss toolbar / popover
    document.addEventListener("mousedown", function (e) {
      if (toolbar && toolbar.style.display !== "none" && !toolbar.contains(e.target)) {
        hideToolbar();
      }
      if (
        popover &&
        popover.style.display !== "none" &&
        !popover.contains(e.target)
      ) {
        hidePopover();
      }
    });

    // Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        hideToolbar();
        hidePopover();
      }
    });

    console.log("[HyperSpec] Annotation module loaded");
  }

  // Bootstrap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
