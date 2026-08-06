# writings/ — blog drafts live here (pre-publication)

Posts are drafted here as Markdown files with frontmatter (schema: `SPEC.md`
§6.2), then move into `src/content/writings/` to become the blog. After
launch, Akram writes and edits posts from `/admin`.

- LaTeX everywhere: inline `$…$`, display `$$…$$` on its own lines
  (single-line `$$…$$` renders *inline* — remark-math quirk)
- Code blocks: fenced, with language (```cpp)
- Tags: the controlled list in SPEC §7 (enforced by the collection schema)
- `the-theorem-behind-this-site.md` shipped as post #1 (moved at stage 5) —
  it explains the math that powers the home page. Akram can edit or replace it.
