---
name: Testing file upload limitation
description: Why runTest (Playwright testing subagent) can't fully exercise flows that require uploading a real local file.
---

The `runTest` Playwright-based testing subagent runs in an environment with no access to the local filesystem, so it cannot call `setInputFiles` with a real file path. Any user flow that has a mandatory file upload gate (e.g. a required prescription image before form submission) will block the subagent from proceeding past that step.

**Why:** Discovered while testing the Ayush Medico medicine-request form, which requires a prescription upload before submission — the subagent could verify the "prescription required" validation error but could not upload a file to get past it and test the success/downstream flow.

**How to apply:** When a flow has a mandatory file input, split the test plan: (1) use runTest to verify the validation/blocking behavior and any steps reachable without the upload, and (2) verify the downstream behavior (post-submission UI, admin views, etc.) through other means — e.g. seeding equivalent data directly (DB/API) and checking it renders correctly, or code review — rather than expecting one runTest pass to cover the whole journey.
