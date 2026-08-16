<div align="center">
  <a href="README.md"><b>Bitsmith</b></a>
</div>

# Contributing to Bitsmith

Thanks for your interest in Bitsmith, a set of small file tools that run in the
browser.
Contributions of all kinds are welcome: bug reports, documentation fixes, new
tools, and arguments against a decision that is already made.

**Read this first: there is no application code yet.**
The repository holds the plan and nothing else.
That changes what is useful to contribute today.

## Ways to contribute now

The most valuable contribution at this stage is an argument.
Open an issue that names a section of [docs/plan.md](docs/plan.md) and says why
it is wrong.
A decision is cheap to change now and expensive to change after twenty pages
depend on it.

These questions are still open, and section 19 of the plan lists them all:

- Which background removal model, and does its licence permit this use.
- The address shape for the conversion pages, such as `/png-to-jpg` against
  `/convert/png-to-jpg`.
- Whether the analytics choice needs a consent banner.

## Ways to contribute later

Once step 0 of the build order lands, these open up:

- Add a tool. One entry in the registry, one engine, one component, one text
  file.
- Write the page text for a tool that has none.
- Improve a conversion engine, or add a format.
- Report a file that a tool handles badly, and attach the file.

Before you start significant work, open an issue to agree on the approach.
This costs you one message and can save you a rewritten pull request.

## Development setup

There is nothing to set up yet.
When step 0 lands, this section will hold the real commands.
The stack is decided and section 5 of the plan records it: Astro, React,
TypeScript, Tailwind, pnpm, Biome, Vitest, and Playwright.

## Where a change will live

This is the planned map, from section 7 of the plan.

| Change | Files |
| ------ | ----- |
| A new tool | `src/tools/registry.ts`, `src/tools/<name>/meta.ts`, `engine.ts`, `engine.test.ts`, `Tool.tsx`, and `src/content/tools/<name>.mdx` |
| A conversion format | the engine for that tool, plus a fixture in `tests/fixtures/` |
| The drop area, progress, or download | `src/components/shell/` |
| Worker handling | `src/lib/pipeline/`, `src/lib/workers/` |
| The sitemap or structured data | `src/lib/seo/`, which reads the registry |
| Page text | `src/content/tools/` |
| A decision | `docs/plan.md`, and a record in `docs/decisions/` |

## The rules that catch people

[`AGENTS.md`](AGENTS.md) is the full set. These four cause the most rework.

- **One change per commit, and a feature is many commits.** A commit that says
  "integrate the full feature" is wrong even when the code is right. Split it
  into the steps that a reviewer can read and revert one at a time.
- **Code and its tests go in one commit. Documentation goes in its own.**
- **All text uses Simplified Technical English.** Short sentences, active voice,
  present tense. No em-dashes and no emoji, in source, comments, documentation,
  commit messages, or pull requests.
- **A test builds its own state.** Read a fixture from `tests/fixtures/`. Never
  read a value out of the site configuration, because the author edits that file
  and the test then fails for a reason that has nothing to do with the code.

## Two traps that the design creates

**A test can pass for the wrong reason.**
Write a test that converts a PNG file to a JPEG file, and confirm first that
the fixture really is a PNG file.
A test that starts at JPEG and ends at JPEG proves nothing, and nobody can see
this by reading it.

**Assert a property, not a byte.**
Check that the output decodes, and that the width is the number you asked for.
Do not compare the output against a stored byte sequence.
An encoder changes its output between versions, so a byte comparison fails for
the wrong reason and teaches the next person to delete the test.

## Licences are part of the review

This project shows no advertisements today and takes donations.
It plans to show advertisements later.
Therefore a dependency or a model with a non-commercial licence is a trap that
closes months after you add it.

- Prefer MIT and Apache 2.0.
- Reject AGPL for anything that ships.
- Read the licence text of a machine learning model yourself. A summary is not
  good enough, and the summaries for this class of model are often wrong.

## Before you open a pull request

Once the build exists, run the same checks that CI runs:

    pnpm biome ci .
    pnpm tsc --noEmit
    pnpm vitest run
    pnpm build

Add tests for anything you change.
Put them in the same commit as the code.

## Coding style

- Match the surrounding code. Small, focused functions and clear names beat
  cleverness.
- Keep the engine pure. `engine.ts` takes bytes and returns bytes. It touches no
  browser API and no React, which is the only reason a test can run it in Node.
- Add dependencies sparingly, and say in the pull request why the standard
  library or an existing dependency does not do the job.
- Never send a user file anywhere. The promise that a file stays on the device
  is the product. A change that breaks it will be refused even if it works.

## Commit messages and pull requests

- Write the subject in the present tense. It says what the change does.
- Put no version number in a subject line, and change no version in a commit.
- Describe what changed and why in the pull request, and say how you tested it.

## Reporting security issues

Do not open a public issue for a security problem.
See [SECURITY.md](SECURITY.md) for how to report it privately.

## Code of conduct

By taking part in this project you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
