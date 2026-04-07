# Theme JavaScript

## `copycode.js`

Single IIFE, deferred-loaded. Progressive enhancement for code block copy-to-clipboard.

### Behavior

- Exits immediately if Clipboard API is unavailable
- Finds all `.code-block` elements and attaches click handlers to `.copy-btn`
- On click: copies `pre > code` innerText, shows "Copied" state for 1.6s
- On failure: appends "(press Cmd/Ctrl+C)" hint
- MutationObserver watches for dynamically added code blocks (future-proofing)

### No other JS

The site has no other JavaScript. Dark mode, layout, and all styling are CSS-only.
