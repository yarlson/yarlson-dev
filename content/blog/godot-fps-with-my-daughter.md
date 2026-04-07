---
title: "I Built an FPS in Godot. My Daughter Is Building the World."
summary: "A backend engineer with zero game dev experience picked up Godot 4 and built a horror FPS from scratch — procedural audio, volumetric fog, enemy AI state machines, the whole thing. Then a 13-year-old played it for two minutes, grabbed a tablet, and decided she's designing every monster, boss, and piece of lore. The game just got a creative director."
postLayout: simple
date: "2026-04-07"
tags:
  - godot
  - gamedev
---

I write Go for a living. CLI tools, deployment pipelines, compilers. My typical Tuesday involves connection pools and error propagation. The most visual thing I build is terminal output with ANSI colors.

So naturally, I decided to build a first-person shooter.

No game dev experience. No Unity history. No C++ PTSD from Unreal. Just a fresh Godot 4.6 project, a vague idea about dark corridors, and the kind of confidence that only comes from not knowing what you're getting into.

## The Game

It's a horror FPS. You wake up in a labyrinth. It's dark — genuinely dark, not "slightly dimmed ambient light" dark. You have a flashlight that you toggle with F, a gun with 30 rounds, and the growing realization that something is moving in the fog ahead.

The maze is built with GridMap walls and CSG geometry. No imported 3D models, no asset store purchases, no textures. Every surface is a flat color — deep browns, cold grays, the occasional sickly green accent on an exit sign. The lighting does all the work. SpotLight3D ceiling lamps cast warm pools through volumetric fog. SSAO darkens every corner. The color grading is desaturated to 0.6. It looks like a PS1 game that learned about post-processing. And it works.

There are three enemy types. Standard (red, 30HP, moderate speed), Runner (green, 15HP, fast, fragile), and Brute (purple, 60HP, slow, hits like a truck). They share a single script with exported parameters — no inheritance, no polymorphism, just `@export` variables and a state machine. IDLE, CHASE, ATTACK, DEAD. The AI does line-of-sight checks via physics raycast and has a 3-second memory before it forgets you. Break line of sight around a corner and you've bought yourself three seconds of breathing room. Use them.

The combat has more juice than it has any right to. Hitscan shooting with camera recoil kick. Hitmarker flash on successful hits. Enemy stagger and white flash on damage. Attack telegraph — the enemy turns orange for 300ms before lunging, giving you exactly enough time to react if you're paying attention. Damage direction indicators on the HUD edges. A muzzle flash from an OmniLight3D that lives for 50 milliseconds. It feels like a game. A real one.

And here's the part that still surprises me: every sound effect is procedurally generated. Sine waves and noise envelopes, synthesized in GDScript at runtime. The gunshot is a 4000Hz burst for 60ms. The enemy hit is a frequency sweep from 1200Hz down to 400Hz. The key pickup is a dual-tone chime — 523Hz rising to 659Hz. Everything else is math.

The background music is AI-generated via Suno. Level 1 gets a jump-scare horror soundtrack — the kind that breathes under the fog and makes you second-guess every corner. Level 2 gets industrial metal. Distorted, aggressive, 90s-FPS energy — the kind of soundtrack that tells you the game stopped being polite. The tonal shift between levels is deliberate: dread first, then violence. Two MP3s, zero music production skills, and the atmosphere does half the game design's job.

## What a Backend Engineer Brings to Game Dev

Here's what transfers directly from backend engineering: the instinct to build systems, not scripts.

The architecture is a two-tier scene tree. A persistent game shell (`game.tscn`) owns the Player, the HUD, and the run-global state — kills, elapsed time, current level index. Individual level scenes load into a `LevelContainer` node and get swapped on progression. Each level implements a contract: provide a `SpawnPoint`, an `Enemies` container, a `KeyPickup`, a `Door`, and an `ExitTrigger`. Emit `level_completed` when the player reaches the exit. The game shell handles fade transitions, health recovery between levels, and the victory screen.

Signal-driven communication. "Call down, signal up." The player emits `health_changed`, `ammo_changed`, `hit_enemy`, `took_damage`. The HUD listens. The game shell wires them together. No global state. No autoloads. No singletons pretending to be architecture.

Duck-typed damage: `if target.has_method(&"take_damage"): target.take_damage(damage)`. No interfaces. No base classes. If it has the method, it takes the damage. GDScript doesn't have Go-style interfaces, but it has something arguably better for a game this size — the ability to just not care about the type.

The level progression system uses fade-to-black tweens with `call_deferred` scene swaps. The player gets healed 25HP between levels. The head pitch resets so you don't start the next maze staring at the ceiling. A centered "Level 2" announcement fades in and out over 1.5 seconds. Small details, but they're the difference between "prototype" and "this feels intentional."

Two levels so far. Level 1 is a warm-toned 36x36 maze with 7 enemies. Level 2 is colder, denser, darker — a 24x24 grid with 8 enemies, higher SSAO intensity, denser fog, and bluer lighting. The atmosphere shift between levels is noticeable. It tells you the game is escalating without saying a word.

## What Game Dev Teaches a Backend Engineer

Godot humbled me in ways that distributed systems never did.

In backend engineering, state is something you minimize. Stateless services. Immutable data. Pure functions. In game dev, state is the entire point. Every frame, every entity has position, velocity, health, animation state, AI state, and a dozen flags that interact with each other in ways you didn't plan for. The enemy is chasing you, but it's also staggering from a hit, but it's also playing a telegraph animation, but it's also checking line of sight. All of that, 60 times per second, for every enemy on the map.

Physics interactions are humbling. I spent an afternoon debugging why enemies would occasionally launch into the ceiling after dying. The death animation scaled them down to 0.1x over 300ms, and the collision shape was still active during the tween, and the physics engine interpreted a rapidly shrinking collider as a Very Exciting Event. The fix was one line — disable the collision shape before the death tween. But finding that line required understanding something I'd never had to think about in backend code: the physical simulation doesn't care about your state machine.

The material sharing trap. In Godot, scene instances share material resources by default. Change one enemy's color to white for a hit flash and every enemy on the map turns white. You need to `duplicate()` the material in `_ready()`. This isn't documented prominently. You discover it when your entire screen turns white and you think you've broken the renderer.

And the feedback loop — the speed of it changes how you think. In backend engineering, you write code, run tests, maybe deploy to staging, wait for metrics. In Godot, you press F5 and you're _in the game_ in under a second. You can feel whether the camera recoil is too aggressive. You can hear whether the gunshot sound is satisfying. You can tell immediately if the fog density is oppressive or just annoying. The iteration cycle is measured in seconds, not minutes. It's genuinely addictive.

## Then My Daughter Saw It

I showed the demo to my 13-year-old daughter. The dark corridors. The flashlight cutting through fog. The enemies that chase you around corners and telegraph their attacks with an orange flash.

She played it for two minutes. Two. Then she was hooked — running through corridors, toggling the flashlight, flinching at the industrial metal kicking in on Level 2. When she finally stopped, she didn't say "that was fun." She said: "The enemies need to look like actual monsters. And there needs to be a story."

Ten minutes later she had a tablet out and was sketching the first monster. Not because I asked. Because the green capsule labeled "Runner" personally offended her.

She's going to design every monster and boss in the game. She's going to draw what they look like, how they move, why they exist in the labyrinth. She's going to draft the entire lore — why the labyrinth exists, what happened to the people who built it, what the player is doing there. A horror game without lore is just a shooting gallery with good lighting. She figured that out faster than I did.

The game just got a creative director. She's 13, she has zero game dev experience, and she already has stronger opinions about monster design than I have about database indexes. This wasn't the plan. It's better than the plan.

## Where It Stands

The prototype is playable. Two levels, three enemy types, a progression system, procedural audio, atmospheric lighting, and a combat loop that feels genuinely satisfying. The architecture is clean enough to add levels quickly. The code is 1,200 lines of GDScript across 10 scripts. No plugins, no external dependencies, no asset store. Pure Godot.

What's next: real art to replace the CSG primitives, because my daughter has a tablet and opinions. More enemy types with distinct behaviors. Boss encounters at the end of level arcs. A lore system that reveals the story through the environment. More levels, darker levels, levels that make you regret having a flashlight.

I started this project because I wanted to learn Godot. I'm continuing it because my daughter picked up a stylus ten minutes after seeing the demo and decided the world needs to be hers. The code is mine. The world will be hers. And the game will be better for it.
