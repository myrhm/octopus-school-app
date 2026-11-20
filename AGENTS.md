# Repository guidelines

## Git and GitHub language

All authored Git and GitHub text must be in English. This includes commit messages, branch and tag names, pull request titles and descriptions, issue titles and descriptions, review comments, release titles and notes, and merge messages.

This rule does not require application copy, project documentation, or conversations with the user to be in English. Preserve verbatim source material and code identifiers when quoting them in GitHub discussions.

## Verification

Run `pnpm check` for code and configuration changes. Run `pnpm test:e2e` after building when changes affect browser behavior. Documentation-only changes require relevant formatting and link checks.

Do not commit secrets, local environment files, dependency directories, build output, or test artifacts. Keep dependency versions and the pnpm lockfile consistent.
