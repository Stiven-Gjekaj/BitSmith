<div align="center">
  <a href="README.md"><b>Bitsmith</b></a>
</div>

# Security Policy

## Supported versions

Bitsmith is in the planning stage and has no release.
When it has one, fixes go to the latest version on the default branch.
Older versions are not maintained.

## Reporting a vulnerability

Report security problems privately, and not through a public issue.

- Preferred: open a private security advisory with the "Report a vulnerability"
  button on the Security tab of this repository.
- Alternative: email the maintainer at stivenagostingjekaj@gmail.com.

Include the steps to reproduce, the affected commit, and the impact as you
understand it.
You can expect a first answer within a few days.
Your report gets an acknowledgement when the fix ships, unless you prefer to
stay anonymous.

## The threat model

Bitsmith has an unusual shape, so read this before you report.

**There is no server, and no file is uploaded.**
Every tool runs in the visitor's browser.
The site is static files on a cache network.
Therefore a whole class of report does not apply here: there is no upload
endpoint, no file store, no database, and no account to take over.

**The supply chain is the real risk.**
The promise of this project is that a file never leaves the device.
One malicious dependency breaks that promise completely and quietly, because
the code that reads your file already runs in the page.
A package that adds a network call is the highest severity problem this project
can have, higher than a bug in any converter.
Report anything that looks like this immediately.

**These are in scope:**

- Any code path that sends file bytes, file names, or file metadata off the
  device.
- A dependency that contacts a network host it does not need.
- Cross-site scripting, or any way to run script from the content of a file that
  a visitor opens.
- A weakness in the Content Security Policy that allows the two problems above.
- A crash or memory problem in a decoder that a crafted file can trigger.

**These are out of scope:**

- A missing security header that has no exploit path. Say what the exploit is.
- A report that the site has no login, no rate limit, and no server side
  validation. It has no server, and that is the design.
- A file that converts badly. That is a bug, so open a normal issue.
- Findings from an automated scanner with no working demonstration.
