---
title: "Why I Migrated from VitePress to Hugo for This Blog"
summary: "After running my blog on VitePress for over a year, I decided to migrate to Hugo with a custom theme. Here's why I made the switch and what I learned in the process."
postLayout: simple
date: "2025-08-16"
---

After running my blog on VitePress for over a year, I decided to migrate to Hugo with a custom theme. The decision wasn't driven by any major issues with VitePress, it's an excellent tool. Instead, it was about finding the right fit for my specific needs and workflow preferences.

## What I Liked About VitePress

VitePress served me well during my initial blogging phase. As a Vue.js-based static site generator, it offered several compelling features:

**Developer Experience**: The hot module replacement was incredibly fast. Making changes to content or styling felt instantaneous during development.

**Markdown Extensions**: VitePress comes with powerful markdown extensions out of the box. Code blocks with syntax highlighting, custom containers, and Vue component integration made writing technical content enjoyable.

**Modern Architecture**: Built on Vite, it leveraged modern JavaScript tooling and provided a clean, component-based approach to theming.

**Vue Integration**: Being able to use Vue components directly in markdown was occasionally useful for interactive examples.

## The Pain Points That Led to Migration

Despite VitePress's strengths, several issues accumulated over time that made me reconsider:

### 1. JavaScript Overhead for a Simple Blog

My blog is fundamentally a collection of technical articles. I don't need interactive features, complex state management, or client-side routing. Yet VitePress ships with a significant JavaScript bundle—even for the most basic blog setup.

Every page load includes Vue runtime, router, and theme code. For readers on slower connections or mobile devices, this felt excessive for what is essentially static content.

### 2. Theme Customization Complexity

While VitePress themes are powerful, customizing them required deep Vue.js knowledge. Simple changes like adjusting typography or layout often meant diving into component hierarchies and understanding the theme's internal structure.

I wanted something more straightforward—traditional HTML templates where I could see exactly what was being generated.

### 3. Build Performance

As my content grew, build times became noticeable. VitePress needed to process JavaScript modules, run Vue's compilation, and handle the bundling process. For a blog that updates infrequently, this felt like overkill.

### 4. SEO and Performance Concerns

While VitePress generates static files, the client-side hydration meant that initial page renders could feel sluggish. Search engines and social media crawlers sometimes struggled with JavaScript-heavy sites, even static ones.

## Why Hugo Made Sense

Hugo addressed every pain point I had with VitePress:

### Zero JavaScript by Default

Hugo generates pure HTML, CSS, and minimal JavaScript (only when explicitly added). My new blog loads instantly because there's no framework overhead, no hydration step, and no JavaScript bundle.

### Template Simplicity

Hugo's Go templates are straightforward. When I see:

```html
<h1>{{ .Title }}</h1>
<time>{{ .Date.Format "Jan 2, 2006" }}</time>
```

I know exactly what HTML will be generated. No component abstractions, no build-time transformations—just clear, predictable templating.

### Build Speed

Hugo is famous for its build speed, and it delivers. My entire site builds in under 200ms. This makes the development workflow incredibly smooth and deployment nearly instantaneous.

### Content-First Philosophy

Hugo was designed specifically for content sites. Features like automatic RSS generation, sitemap creation, and taxonomy handling work out of the box without configuration.

## The Migration Process

The actual migration was surprisingly straightforward:

### Content Migration

Hugo uses the same frontmatter format as VitePress, so most content files required minimal changes.

### Theme Development

Instead of adapting an existing theme, I built a custom one from scratch. This gave me complete control over the HTML structure, CSS architecture, and feature set.

The Plain Tech theme I created focuses on:
- Semantic HTML5 structure
- System fonts (no web font loading)
- CSS custom properties for theming
- Progressive enhancement
- Zero framework dependencies

### Advanced Features

Hugo's template system made it easy to implement sophisticated features:

**Dynamic OpenGraph Images**: Using Hugo's image processing, every page generates a custom OpenGraph image with the post title overlaid on a base template.

**Code Block Enhancement**: Custom render hooks add copy-to-clipboard functionality to code blocks while maintaining semantic markup.

**Image Path Normalization**: A custom image render hook automatically resolves relative image paths, making content more portable.

## Performance Results

The migration delivered significant performance improvements:

- **Lighthouse Score**: 100/100 across most metrics
- **First Contentful Paint**: Under 500ms
- **Largest Contentful Paint**: Under 800ms
- **Bundle Size**: ~10KB CSS + ~2KB JavaScript (vs ~150KB+ with VitePress)
- **Build Time**: 200ms (vs ~3-5 seconds with VitePress)

## What I Miss About VitePress

To be fair, there are some VitePress features I occasionally miss:

**Hot Module Replacement**: Hugo's live reload is fast, but not quite as seamless as Vite's HMR.

**Markdown Extensions**: Hugo's markdown processing is more basic. I had to implement custom shortcodes for some features that VitePress handled automatically.

**Modern Tooling**: The JavaScript ecosystem offers some conveniences (ESLint, Prettier integration, npm scripts) that Hugo's Go-based ecosystem doesn't match exactly.

## The Right Tool for the Job

This migration reinforced an important principle: choose tools based on your actual requirements, not potential future needs.

VitePress is excellent for documentation sites that need interactive examples, component demonstrations, or complex navigation. But for a straightforward technical blog, Hugo's simplicity and performance are hard to beat.

The key insight is that "modern" doesn't always mean "better" for every use case. Sometimes the most modern approach is to strip away unnecessary complexity and focus on fundamentals—fast loading, accessible HTML, and excellent content.

## Recommendations

**Choose VitePress if:**
- You need Vue component integration in content
- Your site requires complex interactivity
- You're building documentation with interactive examples
- Your team is already Vue.js-focused

**Choose Hugo if:**
- Performance is a top priority
- You want minimal JavaScript overhead
- Build speed matters for your workflow
- You prefer traditional templating approaches
- You're building a content-focused site

Both tools are excellent in their domains. The migration wasn't about VitePress being inadequate—it was about finding the best fit for my specific needs and preferences.
