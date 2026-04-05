---
title: "Naming in Go: A Deep Dive into Function and Variable Conventions"
summary: "A guide to Go naming conventions for functions and variables. Covers best practices for clarity, consistency, and idiomatic Go code to improve readability and maintainability."
postLayout: simple
date: "2024-02-12"
tags:
  - go
---

Go made visibility a naming convention. One capital letter decides whether the rest of the world gets to touch your code. That single design choice tells you everything about the language's relationship with names: they carry weight here. They do real work. And most Go codebases still get them wrong.

## Casing Is Access Control

Let's talk about the thing that makes Go genuinely unusual. PascalCase means exported. camelCase means unexported. This isn't a style guide suggestion you can ignore. It's the language.

```go
type User struct {  // Exported (public) type
    Name string     // Exported field
    age  int        // Unexported field
}

func NewUser(name string) *User {  // Exported function
    return &User{Name: name}
}

func (u *User) increaseAge() {  // Unexported method
    u.age++
}
```

A single letter controls visibility. No `public` keyword. No `private` annotation. Just the first letter. That is a superpower. You glance at any symbol in any file and you immediately know its scope. But here's the thing -- it only works if you respect the rest of the naming conventions too.

## The Conventions That Actually Matter

### Structs Are Nouns

Structs represent things. Name them like things. PascalCase nouns.

```go
type Project struct {
    // fields
}

type WorkerPool struct {
    // fields
}
```

No `ProjectStruct`. No `WorkerPoolData`. The type system already tells you it's a struct. Don't repeat what the compiler already knows.

### Methods Are Verbs

Methods do things to your types. Start with a verb. Keep it tight.

```go
func (p *Project) Create() error {
    // implementation
}

func (wp *WorkerPool) Process(job Job) {
    // implementation
}
```

Look at how little you need. The receiver tells you the subject. The method name tells you the action. Done. Why would you add more words?

### Functions Follow the Same Pattern

Standalone functions work the same way -- PascalCase, action-oriented, clear about what they return.

```go
func ParseConfig(filename string) (Config, error) {
    // implementation
}

func ValidateInput(input string) bool {
    // implementation
}

// For constructor-like functions, we often use "New" prefix
func NewHandler() *Handler {
    // implementation
}
```

`ParseConfig` takes a filename, gives you a Config. `NewHandler` gives you a Handler. The names are the documentation.

### Booleans Drop the "Is"

This one catches people coming from Java or C#. Go convention skips the `Is` prefix on boolean-returning methods. The result reads like actual English.

```go
func (j *Job) Completed() bool {
    // implementation
}

// Usage
if job.Completed() {
    // do something
}
```

Compare `if job.Completed()` with `if job.IsCompleted()`. The first reads like a question you'd ask a human. The second reads like enterprise middleware.

### Variables Stay Short

Go wants short variable names. Not cryptic. Short. There's a difference.

```go
proj := &Project{}
repo := NewRepository()
ch := make(chan int)
```

A loop index gets `i`. A channel gets `ch`. A project gets `proj`. The scope tells you how short you can go -- the smaller the scope, the shorter the name. A variable that lives for three lines doesn't need to be `currentProjectInstance`.

### Constants Get More Room

Constants are the one place where a few extra characters genuinely help. They're referenced far from where they're defined. Give them context.

```go
const (
    StatusPending   = "pending"
    MaxRetries      = 3
    taskTypeMerge   = "merge"
)
```

PascalCase for exported. camelCase for unexported. Same rule as everything else.

### Interfaces End in "-er"

This is one of Go's best conventions. Interfaces describe behavior, so they get named like actors. A thing that reads is a `Reader`. A thing that writes is a `Writer`.

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Stringer interface {
    String() string
}
```

Single-method interfaces get the method name plus "-er". It's simple, predictable, and it works. When you see a `Reader` parameter, you know exactly what contract you need to satisfy.

## Self-Documenting Code Is Not a Myth

Good names eliminate comments. That's not aspirational -- it's mechanical. Pick names that say what happens, and the code explains itself.

```go
func (s *Service) ProcessItems(items []Item) error {
    for _, item := range items {
        if err := s.validateAndUpdateItem(item); err != nil {
            return err
        }
    }
    return nil
}

func (s *Service) validateAndUpdateItem(item Item) error {
    if !item.Valid() {
        return ErrInvalidItem
    }
    return s.repo.Update(item)
}
```

No comments anywhere. You still know exactly what this does. The function names carry all the meaning. That's the whole point.

## The Mistakes That Keep Showing Up

**Redundancy.** In a `project` package, `project.CreateProject()` is stuttering. Just `project.Create()`. The package name is already right there in the call site. Why say it twice?

**Acronym casing.** Go has specific rules here and people cargo-cult them wrong constantly. Acronyms stay uniformly cased -- all caps or all lower. Never mixed.

```go
// Correct usage
var userID string
var httpSrv *http.Server

func ServeHTTP(w http.ResponseWriter, r *http.Request) {}
func newHTTPClient() *http.Client {}

type XMLEncoder struct{}
type xmlEncoder struct{}

// Incorrect usage
var userId string
var HttpSrv *http.Server

func ServeHttp(w http.ResponseWriter, r *http.Request) {}
func newHttpClient() *http.Client {}

type XmlEncoder struct{}
type XMLencoder struct{}
```

`userId` looks reasonable if you've been writing JavaScript all week. But in Go, it's `userID`. `ServeHttp` looks fine at first glance. It's `ServeHTTP`. The rule is consistent and the linter will catch it, so just learn it once.

**Single-letter overreach.** `i` in a for loop is fine. `u` for a user that gets passed around for thirty lines is not.

```go
// Avoid
u, err := GetUser(id)

// Better
user, err := GetUser(id)
```

**Inconsistent verb families.** If you have `CreateUser`, `UpdateUser`, and `DeleteUser`, don't suddenly introduce `RemoveCustomer`. Pick your verbs. Stick with them across the entire codebase.

## Why This All Matters

Naming is the cheapest, highest-leverage thing you can do for code quality. Good names shrink code reviews, flatten the onboarding curve, and kill the need for half your comments. They make refactoring safer because the intent is right there in the identifier. They make bugs more visible because a function doing something its name doesn't describe sticks out.

Go's naming conventions aren't arbitrary. They're a compression algorithm for intent. Casing encodes visibility. Brevity encodes scope. Verb choice encodes behavior. Every convention is load-bearing.

Next time you're about to name something, take the extra five seconds. Your teammates will read that name a thousand times. Make it count.
