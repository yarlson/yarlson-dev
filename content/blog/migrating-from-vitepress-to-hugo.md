---
title: "Why I Migrated from VitePress to Hugo for This Blog"
summary: "After running my blog on VitePress for over a year, I decided to migrate to Hugo with a custom theme. Here's why I made the switch and what I learned in the process."
postLayout: simple
date: "2025-08-16"
---

---

After a little over a year on VitePress, I moved this blog to Hugo and built a small custom theme along the way.

This is not a breakup post. VitePress is genuinely excellent, and I still recommend it in the right context. The change was mostly about fit. I wanted the blog to behave like a simple content site again: fast HTML, minimal moving parts, and theming that feels closer to editing templates than maintaining an app.

## What I liked about VitePress

VitePress made it very easy to get started and stay productive.

The development loop is hard to beat. Vite's hot reload is instant enough that you stop thinking about it, which is exactly the point.

Writing technical posts was also pleasant because the Markdown experience is rich out of the box: syntax highlighting, containers, and a bunch of conveniences that reduce friction when you're posting regularly.

And since it sits on modern JS tooling, theming can be as component-y as you want it to be. On the occasions where I needed a little interactivity in a post, dropping a Vue component directly into Markdown was a nice escape hatch.

## The pain points that pushed me to migrate

Over time, a few small annoyances started to add up. None of them are "VitePress is bad" problems. They are "why am I paying this cost for a plain blog" problems.

### 1. JavaScript overhead for a simple blog

This site is basically a pile of articles. No user accounts. No dashboards. No in-browser state that needs to survive navigation.

But the runtime cost still shows up. Even for a basic setup, you ship Vue runtime, routing, and theme code on every page. It's not outrageous in the grand scheme of the modern web, but it felt wasteful for static content, especially on mobile or slower connections.

I kept coming back to the same question: what am I getting from that JavaScript, day to day?

### 2. Theme customization felt heavier than it needed to be

VitePress themes are flexible, but the path to "just change the layout a bit" often runs through Vue component hierarchies and theme internals.

Some people love that. I didn't, at least not for a blog. I wanted to open a template and see the HTML I'm producing without having to mentally simulate a component tree.

### 3. Build performance started to matter

As the number of posts grew, builds became noticeable. Not painfully slow, but slow enough that I started thinking about it.

VitePress is doing real work: bundling, compilation, module processing. For a site that changes occasionally, that started to feel like using a full frontend build pipeline to generate pages that end up static anyway.

### 4. SEO and perceived performance concerns

VitePress outputs static files, but the experience still leans on client-side hydration. The site was fine, but the initial render could feel a bit "web-app-ish" for something that should be instant.

Also, while modern crawlers have improved a lot, I prefer not to gamble on JavaScript-heavy rendering paths for indexing and previews if I don't need them.

## Why Hugo made sense

Hugo lined up with what I actually wanted.

### Zero JavaScript by default

Hugo outputs plain HTML and CSS. If you add JavaScript, it's because you chose to.

That alone changes the feel of the site. Pages load immediately, and there is no hydration step. The mental model is simple: the browser gets HTML, and it renders it.

### Templates that are easy to reason about

Go templates are not glamorous, but they are direct. When I write:

```html
<h1>{{ .Title }}</h1>
<time>{{ .Date.Format "Jan 2, 2006" }}</time>
```

I can predict the output without having to trace component props or lifecycle. That predictability was a big part of the appeal.

### Build speed that is almost silly

Hugo's reputation for speed is earned. My site builds in under 200ms.

That changes workflow in a subtle way. You stop optimizing your habits around build times, because there is nothing to optimize.

### A content-first default set

RSS, sitemaps, taxonomies, content organization: Hugo treats these as first-class features, not add-ons. You can build a "normal blog" without assembling a bunch of plugins or custom wiring.

## The migration process

I expected the migration to be annoying. It mostly wasn't.

### Content migration

Frontmatter was close enough that most files moved over with minimal edits. A few formatting tweaks here and there, but nothing dramatic.

### Theme development

Instead of adapting an existing theme, I built a small one from scratch so the site could be exactly what I wanted and nothing more.

The theme (Plain Tech) is intentionally boring in the best sense:

- semantic HTML5
- system fonts (no web font loading)
- CSS custom properties for theming
- progressive enhancement
- no framework dependencies

### A few "nice to have" features that were easier than expected

Hugo's template system made it straightforward to add features that would have felt more involved in a JS-first setup:

- Dynamic OpenGraph images using Hugo image processing, so each post gets a title card automatically.
- Code block render hooks for copy-to-clipboard, while keeping the underlying markup clean.
- Image render hooks to normalize relative paths, which helps when moving content around.

## Performance results

This was the part I cared about most, and it delivered:

- Lighthouse: 100/100 across most metrics
- First Contentful Paint: under 500ms
- Largest Contentful Paint: under 800ms
- Bundle size: about 10KB CSS + about 2KB JavaScript (versus 150KB+ with VitePress)
- Build time: about 200ms (versus about 3 to 5 seconds with VitePress)

## What I miss about VitePress

There are things VitePress still does better.

Vite's HMR is the gold standard. Hugo's live reload is quick, but it is not as seamless.

I also miss some of the Markdown niceties. Hugo's Markdown is solid, but more basic out of the box, so I had to recreate a few conveniences with shortcodes and render hooks.

And, broadly, the JavaScript ecosystem has a lot of developer tooling polish baked in. You can replicate most of it with Hugo, but you have to be more deliberate.

## The right tool for the job

The main lesson for me was simple: I had built a small blog on top of a web-app stack, and I didn't actually want a web app.

VitePress is still a great choice for docs, component-driven content, and anything where interactivity is part of the point. For a straightforward technical blog, Hugo's approach feels calmer: fewer dependencies, fewer runtime costs, and templates that are easy to read.

## Recommendations

Choose VitePress if you need:

- Vue components embedded in content
- interactive examples and UI-heavy documentation
- a team already deep in Vue and JS tooling

Choose Hugo if you want:

- minimal JavaScript by default
- fast builds and a simple deploy pipeline
- traditional templating where the output is obvious
- a content-focused site that stays out of your way

Both are good tools. This move was less about "better" and more about what I want this blog to be: readable pages that load instantly, and a codebase that feels like a website, not an application.
