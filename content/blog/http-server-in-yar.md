---
title: "A Tiny HTTP Server in Yar"
summary: "Yar can now serve HTTP. Not a framework, not a router, not a production web stack. Just a small stdlib package that wraps TCP, parses one request, calls a handler, writes a response, and closes the connection."
postLayout: simple
date: "2026-06-06"
tags:
  - yar
  - compilers
  - web
---

Yar can now serve HTTP.

Not "web framework" HTTP. Not "let's reinvent Rails badly" HTTP. Just enough HTTP to run a small native service:

```yar
package main

import "http"
import "net"

fn handle(req http.Request) !http.Response {
    if req.path == "/health" {
        return http.text(200, "ok\n")
    }
    return http.text(200, "hello from Yar\n")
}

fn main() !i32 {
    print("listening on http://127.0.0.1:8080\n")
    http.serve(net.Addr{host: "127.0.0.1", port: 8080}, fn(req http.Request) !http.Response {
        return handle(req)
    })?
    return 0
}
```

That builds to a native executable. No VM, no interpreter, no cgo bridge. Yar emits LLVM IR, links it with the runtime C file, and clang produces the binary.

Small milestone, but a useful one. A language starts feeling different once it can run a process that listens on a port and answers requests. "Hello world" is fine. A native HTTP service is harder to fake.

## The API Is Intentionally Small

The new stdlib package is called `http`. It has two structs and two public functions:

```yar
pub struct Request {
    method str
    path str
    headers map[str]str
    body str
}

pub struct Response {
    status i32
    headers map[str]str
    body str
}

pub fn text(status i32, body str) Response
pub fn serve(addr net.Addr, handler fn(Request) !Response) !void
```

`serve` listens on a TCP address, accepts connections, reads one HTTP/1.1 request per connection, calls the handler, writes one response, and closes the connection.

That's it.

No router. No middleware. No auth. No TLS. No keep-alive. No query parser. No sessions. No JWT helpers. No "tiny framework" that quietly becomes a support burden.

This was a deliberate choice. The goal was not to make Yar a web framework. The goal was to make Yar capable of demonstrating a small native network service without every example hand-writing HTTP response strings over raw TCP.

Useful primitive. Not a lifestyle brand.

## Why HTTP, Not Another Language Feature?

At this point Yar already has enough language surface:

- explicit errors with `!T`, `?`, and `or |err| { ... }`
- structs, enums, interfaces, methods, closures
- generics
- slices, maps, pointers
- structured concurrency with `taskgroup`
- channels
- filesystem/process/env/network stdlib packages
- a test runner
- a dependency manager
- a conservative garbage collector

Adding yet another type-system corner would be fun, but not very useful.

The better question was: what makes the language feel real?

For a systems-ish language, a tiny native service is a good test. It exercises networking, strings, maps, errors, concurrency, the runtime, and the compiler pipeline. It also creates a demo people understand immediately:

```bash
yar build examples/http_server/main.yar -o server
./server
curl http://127.0.0.1:8080/health
```

If that works, the language has crossed a small but meaningful line.

## The Interesting Part Wasn't Parsing HTTP

Parsing the request line and headers was boring. Good boring.

The package reads up to 65536 bytes, finds `\r\n\r\n`, splits headers, lowercases header names, honors `Content-Length`, and gives the handler a plain `Request`.

Malformed request? `400 Bad Request`.

Handler returns an error? `500 Internal Server Error`, close the connection, keep serving.

That last part matters. Handler errors are per-request failures. Listener errors are server failures. Mixing those would make the API feel sloppy.

The shape is:

```yar
fn handle(req http.Request) !http.Response {
    content_type := req.headers["content-type"]?
    return http.text(200, content_type + ":" + req.body)
}
```

A missing header is just a Yar map lookup error. The handler can handle it or let it become a 500. Not perfect HTTP behavior, but honest v1 behavior. The package is small enough that the rules fit in your head.

## Discovery 1: Stdlib Code Is Real Code

The `http` package is written in Yar itself:

```yar
package http

import "conv"
import "net"
import "sort"
import "strings"
```

That means it goes through the same parser, checker, monomorphizer, and code generator as user code. This is good. It keeps the stdlib honest.

It also means any broken function in the package breaks the import, even if the user only calls one helper.

That sounds obvious until you trip over it. I initially had a working `http.text` helper and a not-quite-right `serve` implementation in the same package. A tiny fixture that only called `http.text` still failed because the compiler emits the whole package, not only the functions used by the program.

Annoying? Yes.

Correct? Also yes.

Dead-code elimination can come later. For now, importing a package means the package has to compile. Seems fair.

## Discovery 2: Top-Level Functions Are Not Function Values

The `serve` API takes a handler:

```yar
fn(Request) !Response
```

So naturally you want this:

```yar
http.serve(addr, handle)?
```

But Yar does not currently treat top-level functions as first-class values. You can call them, but you cannot pass the function name as a value.

So the current call shape is:

```yar
http.serve(addr, fn(req http.Request) !http.Response {
    return handle(req)
})?
```

This is slightly annoying, but it exposed a real language question instead of hiding it behind a special case.

Should top-level functions become function values? Probably. But that is a language feature, not an HTTP feature. The HTTP package should not smuggle new language semantics through the back door just because a demo looks nicer.

So v1 uses a function literal wrapper. Ugly enough to notice. Not ugly enough to block the feature.

## Discovery 3: Infinite Servers Need Different Tests

Most Yar fixtures are simple:

1. build a program
2. run it
3. compare stdout

That does not work for `http.serve`, because a server does not exit. If the test waits for normal completion, the test is wrong.

So the integration test builds a temporary Yar server, starts it as a subprocess, connects to it over TCP, sends a real HTTP request, validates the response, and then kills the subprocess.

That test catches the actual behavior:

- `http.serve` binds to a port
- accepts a connection
- parses method/path/headers/body
- calls a Yar handler
- writes `HTTP/1.1 200 OK`
- sets deterministic headers
- closes the connection

This is much better than testing string helpers in isolation and pretending the server works.

Long-running programs need long-running-program tests. Shocking, I know.

## Discovery 4: Small Runtime Choices Leak Into Product Shape

Yar's `net` package is blocking. `accept` blocks. `read` blocks. `write` blocks.

That is fine because Yar has `taskgroup` now. The HTTP server can accept connections and spawn a task for each one:

```yar
taskgroup []void {
    for true {
        conn := net.accept(listener) or |err| {
            break
        }
        spawn handle(conn, handler)
    }
}
```

This is exactly why structured concurrency was worth adding before HTTP. Without it, the first request that blocks would freeze the whole server. With it, each connection gets its own task and the server keeps accepting.

There is still no scheduler magic here. Current concurrency is POSIX-thread backed. Functional, not fancy. But for a small native service demo, it is enough.

The important part is that the API does not pretend to be async. It is just blocking I/O inside scoped tasks. Boring and understandable.

## Discovery 5: V1 HTTP Should Be Honest

HTTP is a trap.

The second you add a request parser, someone wants routing. Then query params. Then middleware. Then auth. Then cookies. Then TLS. Then suddenly your "small stdlib package" is a web framework with no users and a thousand edge cases.

No thanks.

The v1 contract is intentionally blunt:

- one request per connection
- close after response
- lowercase headers
- content length up to 65536 bytes
- handler error becomes 500
- malformed request becomes 400

This is enough for a demo, a health endpoint, and small experiments. It is not enough for production web infrastructure, and that is fine. Pretending otherwise would be worse.

The hardest part of small features is keeping them small after the obvious adjacent features show up. "No auth" is not a missing feature here. It is scope control.

## What This Unlocks

The sample app is tiny:

```yar
fn handle(req http.Request) !http.Response {
    if req.path == "/health" {
        return http.text(200, "ok\n")
    }
    return http.text(200, "hello from Yar\n")
}
```

But it changes the feel of the language.

Yar can now run a native HTTP service using only its own stdlib. The implementation exercises compiler, runtime, networking, concurrency, maps, strings, and error handling in one small program.

That is a better milestone than another syntax feature.

The next work is probably not "make HTTP bigger." It is more likely:

- make top-level functions passable as function values
- improve server lifecycle testing and cancellation
- add better diagnostics around function-value types
- maybe add query parsing later, if examples actually need it

The boring path, basically.

Build the smallest thing that proves the runtime can do real work. Then let actual programs tell you where the sharp edges are.

Sometimes the right feature is not the clever one. Sometimes it is just a tiny HTTP server that compiles to a native binary and answers `curl`.
