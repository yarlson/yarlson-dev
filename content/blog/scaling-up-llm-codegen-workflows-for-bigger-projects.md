---
title: "Scaling LLM Codegen Past the One-Shot Demo"
summary: "One prompt works for small hacks. Larger projects need product context, technical constraints, module boundaries, sprint-sized slices, and tight test loops."
postLayout: simple
date: "2025-04-08"
tags:
  - llm
---

_Response to [Harper Reed's blog post](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)_

---

Harper Reed wrote a useful post about using LLMs to generate code. One prompt, one shot, working code. For a weekend hack or a single-file utility, that works.

Projects grow. What started as a clean little prototype sprouts authentication, then a second data store, then an API contract someone else depends on. Suddenly you're stuffing an entire system's worth of context into a single prompt and wondering why the LLM is hallucinating import paths.

The fix isn't magic. It's the same thing that fixes most scaling problems in software: decomposition, clear specs, and small verifiable steps. This is the version I use when the project has moving parts.

---

![Juggalo coding robot angel](./images/juggalo-coding-robot-angel.jpg)

## 1. Gather Product Information

Most people skip straight to code. That's backwards. You need to interrogate the idea first—audience, features, positioning, the stuff that determines whether you're building the right thing at all.

The trick is forcing the LLM into one-question-at-a-time mode. Let it build context incrementally instead of vomiting a wall of assumptions.

```markdown
Ask me one question at a time about the product idea. Focus only on the product: audience, core features, positioning, user scenarios, and constraints. Each question should build on my previous answer. Keep going one question per turn until the product shape is clear enough to write down.
```

One question per turn sounds slow. It's not. It's the fastest way to avoid building something nobody wants.

---

## 2. Detailed Product Specification

Raw conversation is useless as a reference document. You need to crystallize it into something a developer—or another LLM session—can actually work from.

```markdown
Turn our product discussion into a product specification. Organize it into clear sections for audience, core workflows, features, constraints, non-goals, and open questions. Keep it focused on what the product should do, not how it will be built.
```

This spec becomes the single source of truth. Every subsequent prompt points back to it. No spec, no alignment. No alignment, no working software.

---

## 3. Gather Technical Implementation Information

Now flip the lens. Same one-at-a-time interrogation, but focused entirely on how this thing gets built. Architecture, stack choices, integration points, security constraints, the sharp edges you'll cut yourself on later if you ignore them now.

```markdown
Ask me one question at a time about the technical implementation. Focus on architecture, stack choices, data model, integrations, deployment, security, performance, and hard constraints. Build on my previous answers. Keep going until the technical shape is specific enough to plan.
```

Why separate this from the product pass? Because mixing "what should it do" with "how should it work" is how you end up with a spec that's neither useful to a PM nor a developer. Keep the concerns apart.

---

## 4. Detailed Technical Specification

Same transformation as before, but for the technical side. Architecture diagrams, data flows, integration methods, constraints—everything a developer needs to start writing code without guessing.

```markdown
Turn our technical discussion into a technical specification. Include architecture, technology choices, data flows, APIs or integrations, operational constraints, testing strategy, and open risks. Keep it concrete enough that a developer can start implementation without guessing.
```

A technical spec that lives outside the LLM's context window is useful. You can feed pieces of it into future sessions. You can hand it to a human. You can diff it when requirements shift. It becomes an artifact instead of another evaporating chat.

---

## 5. Modularization of the Product Specification

Here's where this diverges hard from the single-prompt approach. You take that monolithic spec and carve it into self-contained modules. Each one has a clear boundary, a defined scope, and explicit dependencies.

Why does this matter? Because LLMs work better with focused context. Feed them one module's worth of requirements instead of an entire system's, and the output quality jumps dramatically.

```markdown
We have a product specification. Divide it into discrete modules or components. Each module should have a clear boundary, limited dependencies, and enough context to be implemented on its own. For every module, include:

- Module Name/Identifier: A clear, concise title for the module.
- Module Scope: A brief description of what functionality or aspect the module covers.
- Key Features and Requirements: List the primary features, user interactions, and any relevant technical requirements specific to the module.
- Dependencies: Identify any cross-module dependencies (if applicable) or integration points.

The goal is to make each module small enough to fit into an LLM session without dragging the whole product along. After this, we should be able to plan and estimate work module by module.
```

Isolation matters for humans, services, and LLM context windows.

---

## 6. Creating Sprints with Modularization and Vertical Slicing

Modules give you the what. Sprints give you the when and how much. Each sprint should deliver a vertical slice—something that works end to end, from interface down to storage. Not a "we built the database layer" sprint. A "users can actually do the thing" sprint.

```markdown
We have a product specification divided into modules. Break the project into manageable, estimatable sprints using those modules.

For each sprint, ensure that:

- Module Focus: Identify which module(s) or specific parts of a module will be addressed in the sprint. Each sprint should ideally capture a complete vertical slice of functionality (from the user interface down through the back-end components) within a module or across closely related modules.
- Vertical Slice Approach: Each sprint should include both product and technical tasks that produce an end-to-end deliverable. This helps in reducing the LLM context by focusing on isolated, self-contained functionality.
- Sprint Objectives: Clearly define the goals for the sprint, including key features, technical tasks, and integration points.
- Task Breakdown: Provide a list of specific tasks or user stories to achieve the sprint objectives. Ensure dependencies are identified and that each task is actionable.
- Time Estimation: Estimate the time or effort required for each task to balance the sprint workload.
- Milestones and Deliverables: Define measurable deliverables or checkpoints that signify the successful completion of the sprint.
```

Vertical slices keep you honest. You can't hide behind "infrastructure sprint" when every delivery has to touch the full stack.

---

## 7. Summarize Previous Conversation History

Long LLM conversations drift. Context windows fill up. The model starts forgetting decisions you made three thousand tokens ago. Regular summaries are your checkpoint system.

```markdown
Please generate a concise summary of our conversation so far, focusing on the key points, decisions, and information exchanged. Once the summary is complete, continue with the conversation as if nothing interrupted our flow—using the summary to inform subsequent questions and responses. The goal is to ensure continuity while keeping the context clear and current.
```

Think of it as garbage collection for the conversation. Keep the decisions, drop the noise, move on.

---

## 8. TDD Iteration for Sprint Implementation

This is where code actually gets written. And the method is TDD—not because it's trendy, but because LLMs are genuinely better at writing code when you give them a tight red-green-refactor loop. One test. Just enough code. Verify. Clean up. Next.

```markdown
You're a senior software engineer guiding the development of sprint <sprint name here>, which focuses on implementing a specific module or a vertical slice of the overall product. Our product has been modularized according to earlier specifications, and this sprint is dedicated to delivering a self-contained, end-to-end functionality.

Your task is to drive the implementation one iteration at a time using pure Test-Driven Development (TDD) principles. In each iteration, strictly follow these steps:

1. Write a single, minimal failing test: This test defines a specific aspect of the contract and the expected behavior of the library or module.
2. Write just enough code to make the test pass: Implement only the necessary code without any extra logic or clever hacks.
3. Run the test: Confirm that the test passes.
4. Refactor: Clean up both code and test as needed without changing their observable behavior.
5. Repeat: Each iteration should add one new behavior or constraint to the system.

The tests should evolve over time to become expressive, self-documenting, and serve as a formal specification for the module. Ultimately, the final test suite should allow someone to reimplement the module from scratch using only the tests as guidance.

Important: In each response, provide only one iteration — include the new test, the minimal implementation, the test results, and any refactoring you perform. Then, wait for the next instruction before proceeding.
```

The one-iteration-per-response constraint is doing heavy lifting here. It prevents the LLM from racing ahead, generating five hundred lines of untested code, and leaving you to sort out the wreckage.

---

So what's actually happening across these eight steps? You're doing what good engineering has always demanded: understanding the problem before solving it, breaking big things into small things, and verifying each piece before moving to the next. The LLM doesn't change the fundamentals. It just makes the cost of each step low enough that there's no excuse to skip them.

Harper's workflow is the right starting point. Structure is what carries you past the prototype. Decompose, specify, isolate, verify. Then keep the loop small enough that you can still inspect what came out.
