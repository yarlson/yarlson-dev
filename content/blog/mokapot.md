---
title: "Mokapot: Building a Local AWS Mock That Actually Works"
summary: "Why I built mokapot — a single Go binary that speaks SQS and SNS well enough for real AWS SDKs to connect without configuration changes. Persistence, filter policies, and the tricky parts of faking a cloud service locally."
postLayout: simple
date: "2026-03-01"
tags:
  - go
---

LocalStack weighs forty megabytes, pulls in Docker and Python, and takes thirty seconds to spin up so you can send a message to a fake queue. Thirty seconds. For a queue.

I kept watching teams go through the same ritual: wire up LocalStack in Docker Compose, wait for it to boot, pray the container doesn't OOM during the test run, and then wonder why CI takes eleven minutes. All anyone actually needed was SQS and SNS. Two services. Not the entire AWS catalog.

So I built [mokapot](https://github.com/yarlson/mokapot): a single Go binary that implements the SQS and SNS wire protocols well enough that standard AWS SDKs — Go, Node.js, PHP, Python — connect to `localhost:4566` without credentials or configuration changes. No Docker. No Python runtime. No existential dread.

## What "Well Enough" Actually Means

Let's talk about scope. The goal was never feature parity with AWS. Feature parity is a trap. The goal was protocol compliance with the operations that matter for development and testing:

- **SQS**: create/delete/list queues, send/receive/delete messages, long polling, visibility timeouts, delay queues, dead-letter queues with redrive, batch operations, message attributes, purge with cooldown
- **SNS**: create/delete/list topics, subscribe/unsubscribe, publish with fanout to SQS, raw message delivery, subscription attributes, filter policies

But here's the thing most mock authors miss: mokapot speaks both the AWS Query/XML and JSON 1.0 protocols. Why does this matter? Because the Go SDK v2 uses JSON while older SDKs use Query strings. Implement only one and half your team's tests break silently. Not with loud failures. With subtle serialization mismatches that waste an afternoon.

## The Persistence Problem

A mock that loses state on restart is a mock you use once. The first version was in-memory only. Worked fine for unit tests. Genuinely useless as a development dependency — you'd set up your queues, kill the process for lunch, come back to nothing.

Adding persistence sounds simple. Serialize state to disk periodically. Done. Right?

Not quite. Mokapot has two independent engines — SQS and SNS — that reference each other. When SNS publishes a message, it fans out to SQS subscriptions. Snapshot them at different moments and you capture a state where a message exists in the queue but not in the topic's in-flight tracking. Or vice versa. Split-brain persistence. The kind of bug that only shows up on Fridays.

The solution uses bbolt with both engines snapshotting under a shared lock:

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

The `Lock()`/`Unlock()`/`SnapshotLocked()` methods exist specifically for atomic cross-engine snapshots. Each engine already had internal locking for concurrent request handling. The public lock methods expose a higher-level coordination point that the persistence layer uses. Two locks. One transaction. Consistent state.

The BoltStore abstraction itself is deliberately dumb — two named buckets, each holding a single JSON blob. It knows nothing about SQS or SNS. This means the same pattern works for any pair of interdependent state machines that need atomic persistence. Boring infrastructure is a superpower.

## Filter Policies: Where the Complexity Hides

AWS SNS filter policies let subscribers receive only messages matching certain criteria. Sounds like a weekend feature. Then you read the spec.

Exact string match. Numeric comparisons — equals, greater than, greater-than-or-equal, less than, less-than-or-equal. `exists` and `not-exists`. `anything-but` for both strings and numbers. `prefix` matching. AND logic across attributes. OR logic across conditions within an attribute.

I considered skipping filter policies entirely. Then I wrote one test that depended on them and realized something uncomfortable: any real SNS integration uses them. They're not a nice-to-have. They're load-bearing.

The implementation lives as a standalone parser and evaluator in `internal/sns/filter.go`:

```go
type filterPolicy map[string][]condition

type condition struct {
    Kind    conditionKind
    Value   string
    Numeric float64
}
```

Policies are parsed eagerly when `SetSubscriptionAttributes` is called — invalid policies fail fast rather than silently misbehaving at publish time. Each `Publish` call evaluates the parsed policy against message attributes. The file is 308 lines of Go with 384 lines of tests. More test than implementation. That ratio feels exactly right for something that needs to match AWS behavior down to the edge cases.

Keeping this as an isolated file paid off immediately. When I found numeric comparison bugs, I could fix and test them without touching the SNS engine at all. Isolation is a superpower.

## Proving Compliance the Hard Way

Unit tests for HTTP handlers are necessary but insufficient. How do you actually know a real AWS SDK, using its actual serialization and protocol negotiation, produces correct results against your mock?

You test with the real SDKs. In multiple languages. There's no shortcut.

I wrote integration suites in three languages:

- **Go** — official AWS SDK v2
- **Node.js** — `@aws-sdk/client-sqs` and `@aws-sdk/client-sns` with Jest
- **PHP** — `aws/aws-sdk-php` with PHPUnit

Each suite covers the full lifecycle: create queues and topics, send and receive messages, batch operations, visibility timeouts, dead-letter queues, long polling, SNS publish with fanout, filter policies, raw delivery. Over 650 lines per language.

Look, this is where most mock implementations quietly fall apart. They test their own HTTP handler against hand-crafted requests. That tells you the handler works. It tells you nothing about whether real SDKs produce those exact requests. The SDK serialization layer — field ordering, URL encoding differences, header casing — is where the actual compatibility bugs hide.

Running these suites against a real AWS account produces the same results as running them against mokapot. That's the bar. Not "it handles the happy path." Not "it doesn't crash." Same results.

## What I'd Do Differently

The main limitation is the single-bucket persistence model. Each engine serializes its entire state as one JSON blob. For development use with a few dozen queues, this is fine. For anything approaching production scale — not mokapot's goal, but people will try — incremental persistence would be better.

I'd also consider adding DynamoDB support. It's the third most common "I need this locally" AWS service, and the wire protocol is well-documented. But that's a different binary for a different day.

## When to Reach for This

Use mokapot when you only need SQS and SNS, when you want a single binary with zero dependencies, when startup time matters (under 50ms), when you don't want Docker running just so your tests can enqueue a message.

Use LocalStack when you need the broader AWS surface area — S3, DynamoDB, Lambda — or when exact API parity including error codes matters, or when your team is already invested in the LocalStack ecosystem.

For my own projects, mokapot replaced a LocalStack Docker Compose setup that took thirty seconds to start and occasionally crashed. The single binary starts instantly and hasn't lost state once since persistence landed.

A 6MB Go binary that boots in 50 milliseconds, speaks two wire protocols, survives restarts, and passes the same integration suites as actual AWS. Sometimes the best infrastructure is the kind you forget is running.

Mokapot is on GitHub: [https://github.com/yarlson/mokapot](https://github.com/yarlson/mokapot). Install with Homebrew (`brew install yarlson/tap/mokapot`) or grab the binary from the releases page.
