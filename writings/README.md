# writings/ — blog drafts live here (pre-scaffold)

Write posts as Markdown files with frontmatter (schema: `SPEC.md` §6.2).
At build **stage 5** these files move into `src/content/writings/` and become
the blog. After launch, Akram writes and edits posts from `/admin`.

- LaTeX everywhere: inline `$…$`, display `$$…$$`
- Code blocks: fenced, with language (```cpp)
- Naming: `YYYY-MM-DD-slug.md`
- `the-theorem-behind-this-site.md` is the seed post — it explains the math
  that powers the home page. Akram can edit or replace it.
