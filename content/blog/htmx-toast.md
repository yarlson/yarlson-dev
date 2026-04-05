---
title: 'Toasts with HTMX — the clean way to say "it worked"'
summary: "Build lightweight, reactive toast notifications without React, frameworks, or JavaScript bloat. A step-by-step guide to clean, declarative UI using HTMX, CSS, and a few honest lines of code."
postLayout: simple
date: "2025-10-20"
tags:
  - web
---

A "Saved!" notification. Green box, top-right corner, fades after four seconds. That's it. That's the entire feature.

And yet, in 2025, the default answer is: install React, wire up a context provider, pull in a toast library, configure a portal, hydrate 200 kB of JavaScript, and pray your bundle analyzer doesn't make you cry. For a green box.

Let's talk about what happens when you refuse to do that.

---

## Step 1 — Zero JS, pure HTMX + CSS

HTMX can swap fragments of HTML into your page, even _outside_ the normal target. Out-of-band swaps. This one feature is genuinely all you need.

```html
<div id="toasts" class="toasts" aria-live="polite" aria-atomic="true"></div>

<form hx-post="/save" hx-target="#result" hx-swap="innerHTML">
  <input name="title" placeholder="Title" />
  <button type="submit">Save</button>
</form>

<div id="result"></div>

<script src="https://unpkg.com/htmx.org@2.0.3"></script>
```

When the server handles `/save`, it responds with both the normal content **and** an out-of-band toast fragment:

```html
<p>Saved!</p>

<div id="toasts" hx-swap-oob="true">
  <div
    class="toast toast--ok"
    hx-get="/_empty"
    hx-trigger="load delay:4s"
    hx-target="this"
    hx-swap="outerHTML"
  >
    <strong>Saved</strong> — Changes stored.
  </div>
</div>
```

HTMX sees `hx-swap-oob="true"` and drops the toast into your fixed container. Four seconds later it hits `/_empty`, gets an empty body, and the toast vanishes. No client-side timers. No event listeners. No JavaScript whatsoever.

CSS handles the entrance:

```css
.toasts {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toast {
  opacity: 0;
  transform: translateY(8px);
  animation: toast-in 0.2s ease-out forwards;
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
```

That's 90% of the feature. Done. If auto-dismiss is all you need, stop reading. You've already shipped something better than most dashboards built with full component libraries. Seriously.

---

## Step 2 — A close button, still no JS

But here's the thing — users like control. They want to swat that toast away before the timer runs out. Fair enough. You can still do it without a single line of JavaScript.

```html
<div id="toasts" hx-swap-oob="true">
  <div
    class="toast toast--ok"
    hx-get="/_empty"
    hx-trigger="load delay:4s"
    hx-target="this"
    hx-swap="outerHTML"
  >
    <div><strong>Saved</strong> — Changes stored.</div>
    <button
      class="toast__close"
      hx-get="/_empty"
      hx-target="closest .toast"
      hx-swap="outerHTML"
    >
      &times;
    </button>
  </div>
</div>
```

Click the button. HTMX replaces the element with nothing. The toast is gone. No scripts, no state management, no teardown logic. It's absurd how well this works.

---

## Step 3 — Hyperscript (client-side, still declarative)

Look, the `/_empty` endpoint works. But hitting your server with an HTTP request just to remove a DOM node? That starts to feel like an aesthetic crime after a while. If it bothers you — and it should, a little — Hyperscript lets you move the logic client-side without writing actual JavaScript.

```html
<script src="https://unpkg.com/hyperscript.org@0.9.12"></script>

<div
  class="toast toast--ok"
  _="on load wait 4s then add .fading then wait 300ms then remove me"
>
  <div><strong>Saved</strong> — Changes stored.</div>
  <button class="toast__close" _="on click remove closest .toast">
    &times;
  </button>
</div>
```

Read that `_` attribute out loud:

> on load, wait 4 seconds, then add .fading, then wait 300 ms, then remove me

It reads like English. And for once, that's not an insult. No webpack. No `import React`. No special runtime beyond a small script tag. Just markup that describes its own behavior. Declarative UI is a superpower.

---

## Step 4 — The three-line JS version

Eventually you stare at that 6 kB Hyperscript import and ask yourself: am I really pulling in a dependency for two timers? You are not. Three lines of vanilla JS finish the job.

```html
<script>
  document.addEventListener("click", (e) => {
    if (e.target.matches(".toast__close")) {
      const t = e.target.closest(".toast");
      t.classList.add("fading");
      setTimeout(() => t.remove(), 250);
    }
  });

  document.addEventListener("htmx:oobAfterSwap", (e) => {
    const t = e.target.querySelector(".toast");
    if (!t) return;
    setTimeout(() => {
      t.classList.add("fading");
      setTimeout(() => t.remove(), 300);
    }, 4000);
  });
</script>
```

HTMX handles the rendering. JavaScript handles the lifespan. No `/_empty` endpoint, no Hyperscript, no runtime cost worth measuring. This is the pragmatic layer — the one where you stop optimizing for purity and start optimizing for sanity.

---

## Step 5 — The backend (Go, naturally)

Why wouldn't it be Go? Here's the whole server:

```go
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
  fmt.Fprint(w, pageHTML)
})
http.HandleFunc("/save", func(w http.ResponseWriter, r *http.Request) {
  fmt.Fprintf(w, `<p>Saved!</p>
  <div id="toasts" hx-swap-oob="true">
    <div class="toast toast--ok">
      <strong>Saved</strong> — Changes stored.
      <button class="toast__close">&times;</button>
    </div>
  </div>`)
})
```

Run `go run main.go`, open `localhost:8080`, and watch an HTML-native UI do the job that modern stacks need megabytes to attempt.

---

So what did we actually build here? A toast system that starts at zero JavaScript and tops out at three lines. Four progressively honest approaches, each one trading a tiny bit of purity for a tiny bit of pragmatism. The server sends HTML. The browser renders HTML. Nobody had to negotiate with a bundler.

HTMX doesn't reject JavaScript. It rejects ceremony. It lets you think in HTML again, build from the server outward, and reach for JS only when the alternative is genuinely worse. A minimal toolchain doesn't mean a minimal experience. It means you ship faster, sleep better, and never have to debug a toast provider's context boundary at 2 AM.

A bit of HTML, a sprinkle of CSS, and — fine — three lines of JavaScript. Because `/_empty` is ugly and life is short.
