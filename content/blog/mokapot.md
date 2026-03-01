---
title: "Mokapot: Building a Local AWS Mock That Actually Works"
summary: "Why I built mokapot — a single Go binary that speaks SQS and SNS well enough for real AWS SDKs to connect without configuration changes. Persistence, filter policies, and the tricky parts of faking a cloud service locally."
postLayout: simple
date: "2026-03-01"
tags:
  - go
---

Every team I've worked with that uses AWS has the same problem: running integration tests against real SQS and SNS is slow, costs money, and requires credentials that don't belong on a developer's laptop. The usual answer is LocalStack, which works but pulls in Docker, Python, and a runtime that takes 30 seconds to start. For my projects I just needed queues and topics — not the entire AWS ecosystem.

So I built [mokapot](https://github.com/yarlson/mokapot): a single Go binary that implements the SQS and SNS wire protocols well enough that standard AWS SDKs (Go, Node.js, PHP, Python) connect to `localhost:4566` without credentials or configuration changes.

## What "Well Enough" Means

The goal was never feature parity with AWS. It was protocol compliance with the operations that matter for development and testing:

- **SQS**: create/delete/list queues, send/receive/delete messages, long polling, visibility timeouts, delay queues, dead-letter queues with redrive, batch operations, message attributes, purge with cooldown
- **SNS**: create/delete/list topics, subscribe/unsubscribe, publish with fanout to SQS, raw message delivery, subscription attributes, filter policies

Mokapot speaks both the AWS Query/XML and JSON 1.0 protocols. This matters because different SDK versions use different serialization formats — the Go SDK v2 uses JSON, while older SDKs use Query strings. If you only implement one, half your team's tests break.

## The Persistence Problem

A mock that loses its state on restart is a mock you restart once and then stop using. The first version of mokapot was in-memory only. It worked for unit tests but was useless as a development dependency — you'd set up your queues, kill the process for lunch, and come back to nothing.

Adding persistence sounds simple: serialize state to disk periodically. The catch is that mokapot has two independent engines (SQS and SNS) that reference each other. When SNS publishes a message, it fans out to SQS subscriptions. If you snapshot SQS and SNS at different moments, you can capture a state where a message has been delivered to the queue but not yet removed from the topic's in-flight tracking — or vice versa.

The solution uses bbolt (an embedded key-value store) with both engines snapshotting under a shared lock:

```go
func (app *App) saveState() error {
    // Acquire both write locks simultaneously
    app.sqsEngine.Lock()
    app.snsEngine.Lock()
    defer app.sqsEngine.Unlock()
    defer app.snsEngine.Unlock()

    sqsData := app.sqsEngine.SnapshotLocked()
    snsData := app.snsEngine.SnapshotLocked()

    return app.store.Save(sqsData, snsData)
}
```

The `Lock()`/`Unlock()`/`SnapshotLocked()` methods were added specifically to support atomic cross-engine snapshots. Each engine already had internal locking for concurrent request handling. The public lock methods expose a higher-level coordination point that the persistence layer uses to prevent split-brain state.

The BoltStore abstraction itself is deliberately simple — two named buckets, each holding a single JSON blob. It doesn't know anything about SQS or SNS. This means the same pattern would work for any pair of interdependent state machines that need atomic persistence.

## Filter Policies: The Surprisingly Complex Part

AWS SNS filter policies let subscribers receive only messages matching certain criteria. It sounds like a simple feature until you read the spec: exact string match, numeric comparisons (`=`, `>`, `>=`, `<`, `<=`), `exists`/`not-exists`, `anything-but` (for both strings and numbers), `prefix` matching, AND across attributes, OR across conditions within an attribute.

I considered skipping filter policies entirely. Then I wrote a test that depended on them and realized they're not optional — any real SNS integration uses them.

The implementation is a standalone parser and evaluator in `internal/sns/filter.go`:

```go
type filterPolicy map[string][]condition

type condition struct {
    Kind    conditionKind
    Value   string
    Numeric float64
}
```

Policies are parsed eagerly when `SetSubscriptionAttributes` is called, so invalid policies fail fast rather than silently misbehaving at publish time. Each `Publish` call evaluates the parsed policy against message attributes. The file is 308 lines of Go with 384 lines of tests — more test than implementation, which feels right for something that needs to match AWS behavior exactly.

The decision to keep this as an isolated file paid off immediately. When I found edge cases in the numeric comparison logic, I could fix and test them without touching the SNS engine at all.

## Proving Compliance: Multi-Language Test Suites

Unit tests for the HTTP handlers are necessary but insufficient. The real question is: does a real AWS SDK, using its actual serialization and protocol negotiation, produce correct results against mokapot?

I wrote integration test suites in three languages:

- **Go** — using the official AWS SDK v2
- **Node.js** — using `@aws-sdk/client-sqs` and `@aws-sdk/client-sns` with Jest
- **PHP** — using `aws/aws-sdk-php` with PHPUnit

Each suite covers the full lifecycle: create queues/topics, send and receive messages, batch operations, visibility timeouts, dead-letter queues, long polling, SNS publish with fanout, filter policies, and raw delivery. That's over 650 lines per language.

This is where most mock implementations fall down. They test their own HTTP handler against hand-crafted requests, which tells you the handler works but not that real SDKs produce those exact requests. The SDK serialization layer is where the actual compatibility bugs hide — field ordering, URL encoding differences, header casing.

Running the test suites against a real AWS account (with appropriate credentials) produces the same results as running them against mokapot. That's the bar I set for "actually works."

## What I'd Do Differently

The main limitation right now is the single-bucket persistence model. Each engine serializes its entire state as one JSON blob. For development use with a few dozen queues, this is fine. For anything approaching production scale (not mokapot's goal, but people will try), incremental persistence would be better.

I'd also consider adding DynamoDB support. It's the third most common "I need this locally" AWS service, and the wire protocol is well-documented. But that's a different project.

## When to Use This Instead of LocalStack

Use mokapot when:

- You only need SQS and SNS
- You want a single binary with zero dependencies
- Startup time matters (mokapot starts in under 50ms)
- You don't want Docker running for local development

Use LocalStack when:

- You need multiple AWS services (S3, DynamoDB, Lambda, etc.)
- You need exact API parity including error codes
- Your team is already invested in the LocalStack ecosystem

For my own projects, mokapot replaced a LocalStack Docker Compose setup that took 30 seconds to start and occasionally crashed. The single binary starts instantly and hasn't lost state once since I added persistence.

You can find mokapot on GitHub: [https://github.com/yarlson/mokapot](https://github.com/yarlson/mokapot). Install with Homebrew (`brew install yarlson/tap/mokapot`) or grab the binary from the releases page.
