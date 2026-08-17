<div align="center">
  <a href="README.md"><b>Bitsmith</b></a>
</div>

# Contributing to Bitsmith

Thanks for your interest in Bitsmith, a set of small file tools that run in the
browser.
Contributions of all kinds are welcome: bug reports, documentation fixes, new
tools, and arguments against a decision that is already made.

Version 1 is built and live, and [docs/milestones.md](docs/milestones.md)
holds what is not.

## Ways to contribute

- Add a tool. One entry in the registry, one engine, one component, one text
  file.
- Improve a conversion engine, or add a format.
- Report a file that a tool handles badly, and attach a small one that shows
  the problem.
- Take on something from the milestones, or argue that it is wrong.

Before you start significant work, open an issue to agree on the approach.
This costs you one message and can save you a rewritten pull request.

## Development setup

You need Node 22 and pnpm.

    git clone https://github.com/Stiven-Gjekaj/BitSmith
    cd bitsmith
    pnpm install
    pnpm dev

`pnpm verify` runs everything that CI runs.

## Where a change lives

| Change | Files |
| ------ | ----- |
| A new tool | `src/tools/registry.ts`, then `src/tools/<name>/engine.ts`, `engine.test.ts`, and `Tool.tsx` |
| A conversion format | the engine for that tool, plus a fixture in `tests/fixtures/` |
| The drop area, progress, or download | `src/components/shell/` |
| Worker handling | `src/lib/pipeline/`, `src/lib/workers/` |
| Image decoding and encoding | `src/lib/image/codecs.ts` |
| The page shell, the backdrop, or the palette | `src/layouts/`, `src/components/ui/`, `src/styles/global.css` |
| The background model | `scripts/make-model.py`, and `public/models/` |
| Something not built yet | `docs/milestones.md` |

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

Run the same checks that CI runs. There are three, and `pnpm verify` is only
the first of them:

    pnpm verify

That runs the lint, the type check, the Node tests and the build.

    pnpm test:e2e

That runs the browser tests. **It needs `pnpm build` to have run first**, which
`pnpm verify` does for you, so run them in that order. The browser tests drive
the built site in `dist/` rather than a development server, because the built
site is what a visitor gets. Run them without a build and the test server has
nothing to serve, Playwright waits two minutes for it, and then everything
fails at once for a reason that has nothing to do with your change.

The first run also needs a browser:

    pnpm exec playwright install chromium

The link check is a separate script:

    bash scripts/check-links.sh

Add tests for anything you change.
Put them in the same commit as the code.

Windows is not tested by anybody at the moment. CI runs on Ubuntu and the
work so far has been done on macOS, so if something fails there in a way that
looks nothing like your change, please say so in an issue rather than assuming
it is you.

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
