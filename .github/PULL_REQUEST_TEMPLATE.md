## Summary

Describe what this pull request changes, and why.

## Related issue

Link the issue that this addresses, if there is one (for example,
"Closes #12").

## Changes

-

## Testing

Explain how you checked the change.
Once the build exists, all of these should pass locally:

- [ ] `bash scripts/check-links.sh`
- [ ] `pnpm biome ci .`
- [ ] `pnpm tsc --noEmit`
- [ ] `pnpm vitest run`
- [ ] `pnpm build`

## Checklist

- [ ] Each commit holds one change. A feature is many commits, not one.
- [ ] The code and its tests are in the same commit.
- [ ] The documentation is in its own commit.
- [ ] Every subject line is in the present tense, and carries no version
      number.
- [ ] All text uses Simplified Technical English. No em-dashes, and no emoji.
- [ ] A new test builds its own state from `tests/fixtures/`, and does not read
      the site configuration.
- [ ] No code path sends a user file, a file name, or file metadata off the
      device.
- [ ] Any new dependency carries a permissive licence, and the pull request
      says why it is needed.
