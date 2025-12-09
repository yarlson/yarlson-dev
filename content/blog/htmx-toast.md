---
title: "Toasts with HTMX — the clean way to say “it worked”"
summary: "Build lightweight, reactive toast notifications without React, frameworks, or JavaScript bloat. A step-by-step guide to clean, declarative UI using HTMX, CSS, and a few honest lines of code."
postLayout: simple
date: "2025-10-20"
tags:
  - web
---

Frontend engineers love pain. Otherwise, I can’t explain React.
For years, the simplest “Saved!” notification required a JS framework, a component library, a toast provider, and a 200-kB hydration blob.

HTMX fixes that. It brings HTML back into the conversation — simple, declarative, and boring in the best possible way.
Let’s build toast notifications with it, starting with **zero JavaScript** and climbing slowly (and reluctantly) toward three lines of JS.

---

## Step 1 — Zero JS, pure HTMX + CSS

HTMX can swap fragments of HTML into your page, even _outside_ the normal target.
That’s the key to a clean, no-JS toast system.

```html
<div id="toasts" class="toasts" aria-live="polite" aria-atomic="true"></div>

<form hx-post="/save" hx-target="#result" hx-swap="innerHTML">
  <input name="title" placeholder="Title" />
  <button type="submit">Save</button>
</form>

<div id="result"></div>

<script src="https://unpkg.com/htmx.org@2.0.3"></script>
```

When the server handles `/save`, it responds with both the normal content **and** an “out-of-band” toast fragment:

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

HTMX sees `hx-swap-oob="true"` and inserts this toast into the fixed container.
Four seconds later it calls `/ _empty`, gets an empty body, and removes the toast.
No client-side timers, no event listeners, no JS.

CSS does the slide and fade:

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

That’s the first 90 % done.
If you’re fine with auto-dismiss only — stop here. You’ve already out-engineered most dashboards on the internet.

---

## Step 2 — A close button, still no JS

Users like control. Let them close it manually.
You can still do it server-side with the same `/ _empty` trick:

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

No scripts. HTMX replaces the element with nothing.
It’s ridiculous and elegant at the same time.

---

## Step 3 — Hyperscript (client-side, still declarative)

If the `/ _empty` endpoint feels like an aesthetic crime, you can move logic to the client without writing JS.

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

That line reads like English, and for once that’s not an insult:

> on load → wait 4 s → fade → wait 300 ms → remove me

Hyperscript is nice when you want declarative behavior without reaching for a framework.
No webpack, no `import React`, no special runtime.
Just markup.

---

## Step 4 — The three-line JS version

Eventually you realise: a 6 kB Hyperscript import for two timers is overkill.
Three lines of vanilla JS are enough:

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

That’s it.
HTMX handles rendering; JS handles lifespan.
No `/ _empty`, no Hyperscript, no runtime cost.
It’s the pragmatic middle ground — the _“I’m still sane”_ layer.

---

## Step 5 — The backend (Go, naturally)

If you want to see it live:

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

Run `go run main.go`, open `localhost:8080`, and enjoy an HTML-native UI doing the job modern stacks need megabytes to attempt.

---

## Why this matters

HTMX doesn’t reject JavaScript — it rejects unnecessary ceremony.
It lets you build interactive systems that _start_ from the server, not from a webpack build.
You can think in HTML again.

Toasts are a small example, but they prove the point:
a minimal toolchain doesn’t mean a minimal experience.
It just means you ship faster and sleep better.

---

HTMX isn’t nostalgia.
It’s what happens when the pendulum finally swings back from frontend maximalism.
A bit of HTML, a sprinkle of CSS, and, fine, three lines of JavaScript — because life is short and `/_empty` is ugly.
