---
title: "Scaling Up LLM Codegen Workflows for Bigger Projects"
summary: "A refined, step-by-step process for managing larger projects with LLM codegen workflows—response to Harper Reed's blog post."
postLayout: simple
date: "2025-04-08"
tags:
  - llm
---

_Response to [Harper Reed's blog post](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)_

---

## Introduction

Harper's method works well for small projects. But as your project grows, you need more structure to handle the complexity. In this post, I'll share a refined process that builds on his ideas. My approach includes clear prompts for both product and technical planning, breaking the project into modules, and organizing work into sprints with TDD iterations. The goal is to keep everything clear and precise throughout development.

---

![Juggalo coding robot angel](./images/juggalo-coding-robot-angel.jpg)

## 1. Gather Product Information

Start by asking focused questions to understand every aspect of your product. This helps you capture details about target audience, features, market positioning, and user benefits—one question at a time.

```markdown
Ask me one question at a time to explore and uncover every aspect of the product idea. Focus solely on product characteristics such as target audience, features, value propositions, market positioning, and user benefits. Each question should build on my previous answers so that we gradually develop a complete picture of the product concept. Let's take this one step at a time—only one question per turn—until we have a comprehensive understanding of the product.
```

_Explanation:_
This prompt sets up a focused discussion to make sure you don't miss any important details.

---

## 2. Detailed Product Specification

After gathering the product details, turn the conversation into a structured document. This spec will outline the product features, target markets, user scenarios, and key business requirements.

```markdown
Based on our conversation about the product, please transform my answers into a detailed product specification. Organize the information into clear sections that cover product features, target market, user scenarios, and any relevant business requirements. Ensure that the output reads as a coherent and complete specification that can be handed off to stakeholders or a development team, focusing exclusively on the product aspects.
```

_Explanation:_
This specification becomes the blueprint for your project and creates a solid foundation for the development work ahead.

---

## 3. Gather Technical Implementation Information

Next, focus on the technical details by asking specific questions about architecture, tech stacks, integrations, scalability, security, and more. This helps you collect all the necessary technical context.

```markdown
Ask me one question at a time to gather detailed information regarding the technical implementation of the product. Focus on aspects such as architecture, technology stacks, integration points, performance considerations, scalability, security, and any constraints or requirements from a technical perspective. Each question should build on my previous answers to progressively uncover a full picture of how the product will be built. Let’s work iteratively—one question at a time—until we have all the technical details needed.
```

_Explanation:_
This prompt keeps the technical questions separate, ensuring you cover all relevant aspects without overwhelming the process.

---

## 4. Detailed Technical Specification

Put all the technical details into a comprehensive document. This should clearly describe the system architecture, technology choices, data flows, integration methods, and any technical limitations.

```markdown
Based on our technical discussion, transform my answers into a detailed technical specification document. The output should include clear sections covering system architecture, technology choices, data flows, integration methods, and any necessary technical constraints or requirements. Ensure that the information is organized logically and can serve as a comprehensive guide for developers responsible for implementing the product. The focus should be solely on the technical details.
```

_Explanation:_
Having a detailed technical spec serves as a clear roadmap for the development team, reducing confusion and getting everyone on the same page.

---

## 5. Modularization of the Product Specification

Split the overall product spec into distinct modules. This breakdown lets you focus on each component independently and manage dependencies efficiently.

```markdown
We have a comprehensive product specification that covers all aspects of the idea. Please divide this complete specification into discrete modules or components. Each module should represent a self-contained section of the product with minimal dependencies on other modules. For every module, include the following:

- Module Name/Identifier: A clear, concise title for the module.
- Module Scope: A brief description of what functionality or aspect the module covers.
- Key Features and Requirements: List the primary features, user interactions, and any relevant technical requirements specific to the module.
- Dependencies: Identify any cross-module dependencies (if applicable) or integration points.

The goal is to ensure that when working on any particular module, only the relevant details are in the context—making development more efficient and focused. Once modularization is complete, we can later use these modules to plan and estimate development tasks independently.
```

_Explanation:_
Breaking the project into modules helps isolate each part of the system, making it easier to assign tasks and manage complexity.

---

## 6. Creating Sprints with Modularization and Vertical Slicing

Break the project down into manageable sprints based on your modules. Each sprint should deliver a complete vertical slice that includes both product and technical elements.

```markdown
We have a comprehensive product specification that has been divided into discrete modules or components. Each module is a self-contained part of the product with minimal cross-dependencies. Now, please break down the overall project into manageable and estimatable sprints by leveraging these modules.

For each sprint, ensure that:

- Module Focus: Identify which module(s) or specific parts of a module will be addressed in the sprint. Each sprint should ideally capture a complete vertical slice of functionality (from the user interface down through the back-end components) within a module or across closely related modules.
- Vertical Slice Approach: Each sprint should include both product and technical tasks that produce an end-to-end deliverable. This helps in reducing the LLM context by focusing on isolated, self-contained functionality.
- Sprint Objectives: Clearly define the goals for the sprint, including key features, technical tasks, and integration points.
- Task Breakdown: Provide a list of specific tasks or user stories to achieve the sprint objectives. Ensure dependencies are identified and that each task is actionable.
- Time Estimation: Estimate the time or effort required for each task to balance the sprint workload.
- Milestones and Deliverables: Define measurable deliverables or checkpoints that signify the successful completion of the sprint.
```

_Explanation:_
Breaking the project into sprints using a vertical slice method ensures that each sprint delivers working functionality—key for maintaining momentum on larger projects.

---

## 7. Summarize Previous Conversation History

During long discussions, create regular summaries to capture key decisions and keep the conversation clear.

```markdown
Please generate a concise summary of our conversation so far, focusing on the key points, decisions, and information exchanged. Once the summary is complete, continue with the conversation as if nothing interrupted our flow—using the summary to inform subsequent questions and responses. The goal is to ensure continuity while keeping the context clear and current.
```

_Explanation:_
Regular summaries act as checkpoints, helping you and your team stay aligned on the project's progress and direction.

---

## 8. TDD Iteration for Sprint Implementation

Use a Test-Driven Development (TDD) approach to implement each sprint. This method ensures that features are built in small, testable increments.

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

_Explanation:_
Using TDD gives you a systematic way to build your project reliably. It ensures each feature is fully tested before moving on, reducing the risk of bugs as the project grows.

---

## Final Thoughts

In short, Harper Reed's workflow is great for small projects, but bigger projects need more planning. This process gives you a clear path for gathering ideas, nailing down technical details, breaking work into manageable chunks, and using TDD to keep everything on track. It's simple enough to follow whether you're working alone or with a team. Give it a try on your next big project and see how it helps.

Happy coding!
