---
title: "Why I Migrated from VitePress to Hugo for This Blog"
summary: "After running my blog on VitePress for over a year, I decided to migrate to Hugo with a custom theme. Here's why I made the switch and what I learned in the process."
postLayout: simple
date: "2025-08-16"
---

---

I shipped JavaScript to render paragraphs. For a year. Let that sink in.

VitePress ran this blog for fourteen months, and it ran it well. This is not a hit piece. VitePress is genuinely excellent software, and if you're building docs with interactive examples, stop reading and go use it. But at some point I looked at my site — a pile of articles, no state, no interactivity, nothing that needs a framework — and asked a question I should have asked sooner: why is there a JavaScript runtime between my words and the browser?

So I moved to Hugo. Built a custom theme. The whole thing took a weekend. Here's what happened.

## What VitePress gets right

Let's talk about the good parts, because they're real.

Vite's hot reload is the gold standard for dev loops. It's fast enough that you forget it exists, which is the entire point. Writing technical posts felt frictionless — syntax highlighting, containers, Markdown niceties all there out of the box. And when you need a little interactivity, dropping a Vue component directly into Markdown is a genuinely nice escape hatch.

The tooling is polished. The ecosystem is deep. None of that changed.

## Where it started to grind

The problems weren't dramatic. They were the kind that accumulate quietly until one day you realize you're annoyed every time you open the project.

### JavaScript overhead for static text

This site has no user accounts. No dashboards. No client-side state that needs to survive a page transition. It's text. But every page still shipped Vue runtime, routing code, and theme JavaScript. Not a catastrophic amount — this is the modern web, after all — but genuinely wasteful for content that hasn't changed since the last deploy.

What was that JavaScript doing for me, day to day? Nothing. It was doing nothing.

### Theme customization felt like application development

VitePress themes are flexible. But "just change the layout a bit" meant navigating Vue component hierarchies, tracing props through theme internals, mentally simulating a component tree to predict what HTML you'd get.

Look, some people love that. I wanted to open a template and see the markup I'm producing. Directly. Without a framework mediating the conversation between me and my own HTML.

### Builds got noticeable

As the post count grew, builds went from instant to... noticeable. Not painful. Noticeable. And "noticeable" is already too slow for a site that changes once a week.

VitePress is doing real work — bundling, compilation, module resolution. All of it designed for applications. I was running a full frontend build pipeline to produce pages that end up as static files anyway. That's a roundabout way to make HTML.

### The hydration tax

VitePress outputs static files, sure. But the experience still leans on client-side hydration. The initial render had that subtle "web app loading" feel — a flicker of framework bootstrapping before the content settles. For a blog post, that's wrong. A blog post should be instant. You click, you read.

And while modern crawlers handle JavaScript fine most of the time, I prefer not to gamble on rendering paths for indexing when the alternative is just... serving HTML.

## Why Hugo

Hugo lined up with what I actually wanted. Not what I thought I wanted when I started the blog. What I want now, after maintaining it.

### Zero JavaScript by default

Hugo outputs plain HTML and CSS. Period. If JavaScript shows up, it's because you put it there on purpose.

That alone changes everything. Pages load immediately. There is no hydration step. The mental model is dead simple: browser gets HTML, browser renders HTML. No framework boot sequence. No client-side routing. Just a document.

Simplicity is a superpower.

### Templates you can read

Go templates are not glamorous. They're clunky, honestly. But they are direct. When I write:

```html
<h1>{{ .Title }}</h1>
<time>{{ .Date.Format "Jan 2, 2006" }}</time>
```

I know exactly what the output will be. No props to trace. No lifecycle to reason about. No virtual DOM diffing. The template is the truth. That predictability was the whole appeal.

### Builds measured in milliseconds

Hugo's reputation for speed is earned. My site builds in under 200ms. Not "fast enough." Under 200 milliseconds.

That changes your workflow in a way you don't expect. You stop thinking about builds entirely. There's nothing to optimize because there's nothing to wait for.

### Content-first by default

RSS, sitemaps, taxonomies, content organization — Hugo treats these as first-class features, not plugins you bolt on. You can build a normal blog without assembling anything. It just works, out of the box, the way a blog tool should.

## The migration

I expected this to be painful. It wasn't.

### Content

Frontmatter was close enough that most files moved over with minimal edits. A few formatting tweaks. Nothing dramatic.

### Theme

Instead of adopting an existing theme, I built one from scratch. The site should be exactly what I want and nothing more. The theme — Plain Tech — is intentionally boring in the best sense:

- semantic HTML5
- system fonts (no web font loading)
- CSS custom properties for theming
- progressive enhancement
- no framework dependencies

### Features that were easier than expected

Hugo's template system made several things straightforward that would have felt heavier in a JS-first setup:

- Dynamic OpenGraph images using Hugo image processing, so each post gets a title card automatically.
- Code block render hooks for copy-to-clipboard, while keeping the underlying markup clean.
- Image render hooks to normalize relative paths, which helps when moving content around.

## Performance

This was the part I cared about most. It delivered.

- Lighthouse: 100/100 across most metrics
- First Contentful Paint: under 500ms
- Largest Contentful Paint: under 800ms
- Bundle size: about 10KB CSS + about 2KB JavaScript (versus 150KB+ with VitePress)
- Build time: about 200ms (versus about 3 to 5 seconds with VitePress)

Read those bundle numbers again. From 150KB to 12KB. For the same content. The old setup was shipping an order of magnitude more code to display the same paragraphs.

## What I miss

Vite's HMR. Genuinely. Hugo's live reload is fast, but it's not the same seamless, surgical update that Vite does. That's still the best dev experience in the ecosystem.

Some of VitePress's Markdown niceties are also hard to give up. Hugo's Markdown is solid but more basic, so I recreated a few conveniences with shortcodes and render hooks. More deliberate, less magic. That's a trade-off I'm fine with, but it is a trade-off.

## The thesis

Here's the thing. I had built a blog on top of a web-app stack, and I didn't actually want a web app. The moment I said that out loud, the decision was already made.

VitePress is the right tool for docs sites, component-driven content, anything where interactivity is the point. For a straightforward technical blog? Hugo's approach is calmer. Fewer dependencies. Fewer runtime costs. Templates you can read without a framework mental model.

Choose VitePress if you need:

- Vue components embedded in content
- interactive examples and UI-heavy documentation
- a team already deep in Vue and JS tooling

Choose Hugo if you want:

- minimal JavaScript by default
- fast builds and a simple deploy pipeline
- traditional templating where the output is obvious
- a content-focused site that stays out of your way

Both are good tools. This move was never about "better." It was about what I want this blog to be: readable pages that load instantly, built from a codebase that feels like a website — not an application.

And honestly? It's nice to just write again.
