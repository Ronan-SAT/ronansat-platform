# Test Manager Review Queues

## Status

- In progress: add admin review queues for graph/table assets, Math dollar-delimited LaTeX cleanup, and Rhetorical Synthesis notes formatting.

## Scope

- Extend the existing `/test-manager/manage-tests` catalog rather than introducing a separate admin tool.
- Keep the current question editor as the correction surface, adding visual verification and deterministic suggested fixes.
- Support rapid review actions that either mutate safely (`Approve & Next`, `Save & Next`) or advance without mutation (`Looks Correct & Next`).

## Decisions

- Graph/table misalignment cannot be reliably auto-detected, so the queue must render question context next to the actual image/SVG/table preview.
- Auto-fixes are allowed only for deterministic transforms: Markdown table to CSV, `$...$`/`$$...$$` math delimiters, and safe Rhetorical Synthesis note formatting.
- Keyword-based missing-figure detection must distinguish high-confidence figure terms from medium-confidence manual-check terms and avoid flagging missing figures when the question or shared passage context already has one.
- Rhetorical Synthesis cleanup now treats `-`, `•`, `*`, `.`, and whitespace as removable leading bullet noise per note line, filters empty lines, and rebuilds clean `<br>- ` lists. The review classifier must not flag already-clean `<br>- ` passages merely because they contain notes.
- The editor should be usable from any catalog sort/list context, not only named review queues. `Save & Next` appears when list query params are present, and answer persistence preserves the existing correct option by option position if legacy answer text no longer exactly matches choices.
- Question option saves must preserve existing `question_options.id` values because `attempt_answers.selected_option_id` has an `on delete restrict` FK. Updating choice text in place is safe; removing historical choices with attempts should be rejected with a clear editor error.
- Question editor pages now load initial editor data server-side and pass it to the client editor. This avoids transient client API 401s after `Approve & Next` navigation from replacing the next question with an `Unavailable / Unauthorized` panel.
