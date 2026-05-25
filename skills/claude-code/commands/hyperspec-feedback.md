---
description: Process annotation feedback from an HTML document and apply changes
allowed-tools: Read, Write, Edit, Bash(hyperspec:*), Glob, Grep
---

# Process HyperSpec Annotation Feedback

The user has pasted structured JSON feedback exported from a HyperSpec HTML document.

## Parse the feedback JSON

Expected format:
```json
{
  "document": "filename.html",
  "documentTitle": "...",
  "version": 1,
  "annotations": [
    { "type": "comment|modify|delete|insert", "selectedText": "...", "comment": "...", "suggestedChange": "...", "section": "..." }
  ]
}
```

## Apply each annotation

1. Find the source HTML file in `docs/html/htmls/`
2. Read the file
3. For each annotation:
   - `comment`: improve the referenced content based on the feedback
   - `modify`: replace `selectedText` with `suggestedChange`, informed by `comment`
   - `delete`: remove the content identified by `selectedText` + `section`
   - `insert`: add new content after `selectedText`, using `comment` as spec
4. Increment `version` in the hyperspec-meta block
5. Update the `updated` date
6. Save the file
7. Run `hyperspec index`
8. Summarize all changes made
