---
name: Screenshot tool timing vs splash screens
description: The app_preview screenshot tool can appear to catch an app "stuck" on a timed loading/splash screen even when the timer logic is correct.
---

When an app shows a splash/loading screen for a fixed duration (e.g. a `setTimeout`-driven `LoadingScreen`) before revealing content, repeated `screenshot(type="app_preview")` calls — even seconds apart, even with `sleep` in between — can still show the splash screen every time. This does not reliably indicate the app is hung.

**Why:** The screenshot tool's navigation/capture timing doesn't behave like a persistent user session waiting in real time the way you'd expect; sleeping in bash before calling it doesn't guarantee the in-page timer has elapsed by the time the frame is captured. Relying on stacked screenshots alone can lead to chasing a phantom bug.

**How to apply:** If a screenshot shows a stuck loading screen, don't assume it's broken — verify with `runTest()` (the Playwright-based e2e testing skill), which does real waits and interacts with the live page over actual elapsed time. Only treat it as a genuine bug if the e2e test also fails to see the content resolve.
