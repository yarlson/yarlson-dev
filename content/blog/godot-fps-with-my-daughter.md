---
title: "I Built an FPS in Godot. My Daughter Is Building the World."
summary: "A backend engineer with no game dev background picked up Godot 4 and built a horror FPS. Then a 13-year-old played it, grabbed a tablet, and decided the game needed real monsters and lore."
postLayout: simple
date: "2026-04-07"
tags:
  - godot
  - gamedev
---

I write Go for a living. CLI tools, deployment pipelines, compilers. My usual Tuesday involves connection pools and error propagation. The most visual thing I build is terminal output with ANSI colors.

So, naturally, I decided to build a first-person shooter.

No game dev experience. No Unity history. No Unreal scars. Just a fresh Godot 4.6 project, a vague idea about dark corridors, and the confidence that comes from not knowing what you are getting into.

## The game

It is a horror FPS. You wake up in a labyrinth. It is actually dark, not "slightly dimmed ambient light" dark. You have a flashlight on F, a gun with 30 rounds, and the growing suspicion that something is moving in the fog ahead.

The maze is built with GridMap walls and CSG geometry. No imported 3D models, no asset store purchases, no textures. Every surface is a flat color: deep browns, cold grays, the occasional sickly green exit sign. The lighting does the work. SpotLight3D ceiling lamps cast warm pools through volumetric fog. SSAO darkens the corners. Color grading is desaturated to 0.6.

It looks like a PS1 game that learned about post-processing.

And it works.

There are three enemy types: Standard, Runner, and Brute. Red, green, purple. 30HP, 15HP, 60HP. Moderate, fast, slow. They share one script with exported parameters. No inheritance stack, no clever polymorphism. Just `@export` variables and a state machine: IDLE, CHASE, ATTACK, DEAD.

The AI does line-of-sight checks with physics raycasts and has a three-second memory before it forgets you. Break line of sight around a corner and you bought yourself three seconds. Use them.

The combat has more juice than it has any right to. Hitscan shooting. Camera recoil. Hitmarker flash. Enemy stagger and white flash on damage. Attack telegraph where the enemy turns orange for 300ms before lunging. Damage indicators on the HUD edges. A muzzle flash from an OmniLight3D that lives for 50 milliseconds.

It feels like a game. A real one.

And every sound effect is procedurally generated. Sine waves and noise envelopes, synthesized in GDScript at runtime. The gunshot is a 4000Hz burst for 60ms. Enemy hit is a sweep from 1200Hz down to 400Hz. Key pickup is a dual-tone chime, 523Hz rising to 659Hz.

Everything else is math.

The background music is AI-generated via Suno. Level 1 gets jump-scare horror. Level 2 gets industrial metal. The tonal shift is deliberate: dread first, then violence. Two MP3s, zero music production skills, and the atmosphere carries half the design.

## What backend engineering brings to game dev

The useful backend instinct is not "make everything abstract."

It is: build systems, not piles of scripts.

The architecture is a two-tier scene tree. A persistent game shell (`game.tscn`) owns the Player, HUD, and run-global state: kills, elapsed time, current level index. Individual level scenes load into a `LevelContainer` node and get swapped on progression.

Each level implements a small contract: provide a `SpawnPoint`, an `Enemies` container, a `KeyPickup`, a `Door`, and an `ExitTrigger`. Emit `level_completed` when the player reaches the exit. The game shell handles fade transitions, health recovery, and the victory screen.

Signal-driven communication. Call down, signal up. The player emits `health_changed`, `ammo_changed`, `hit_enemy`, `took_damage`. The HUD listens. The game shell wires it together.

No global state. No autoloads. No singleton soup.

Damage is duck-typed: `if target.has_method(&"take_damage"): target.take_damage(damage)`. No interfaces. No base classes. If it has the method, it takes damage. GDScript does not have Go-style interfaces, but for a game this size it has something better: you can stop caring about the concrete type.

The level progression uses fade-to-black tweens with `call_deferred` scene swaps. The player gets healed 25HP between levels. Head pitch resets so you do not start the next maze staring at the ceiling. A centered "Level 2" announcement fades in and out over 1.5 seconds.

Small details, but they are the difference between "prototype" and "this feels intentional."

There are two levels so far. Level 1 is a warm 36x36 maze with 7 enemies. Level 2 is colder, denser, darker: 24x24 grid, 8 enemies, stronger SSAO, denser fog, bluer lighting. The atmosphere shift tells you the game is escalating without a tutorial box explaining it.

## What game dev teaches a backend engineer

Godot exposed gaps that distributed systems never did.

In backend engineering, state is something you minimize. Stateless services. Immutable data. Pure functions when you can get away with it.

In game dev, state is the point.

Every frame, every entity has position, velocity, health, animation state, AI state, and flags that interact in ways you did not plan. The enemy is chasing you, staggering from a hit, telegraphing an attack, and checking line of sight. All of that, 60 times per second, for every enemy.

Physics interactions are also humbling. I spent an afternoon debugging why enemies sometimes launched into the ceiling after dying. The death animation scaled them down to 0.1x over 300ms, while the collision shape stayed active. The physics engine interpreted a rapidly shrinking collider as a Very Exciting Event.

The fix was one line: disable the collision shape before the death tween.

Finding that line required understanding something backend code never forced me to care about: the physical simulation does not care about your state machine.

Then there is the material sharing trap. In Godot, scene instances share material resources by default. Change one enemy's color to white for a hit flash and every enemy on the map turns white. You need to `duplicate()` the material in `_ready()`. You learn this when your entire screen turns white and you briefly question your life choices.

The feedback loop changes how you think. In backend work, you code, run tests, maybe deploy to staging, wait for metrics. In Godot, you press F5 and you are in the game in under a second. You feel whether camera recoil is too aggressive. You hear whether the gunshot works. You know immediately whether the fog is oppressive or just annoying.

The iteration cycle is seconds, not minutes. It is dangerously addictive.

## Then my daughter saw it

I showed the demo to my 13-year-old daughter. Dark corridors. Flashlight through fog. Enemies chasing around corners and flashing orange before they attack.

She played it for two minutes.

Then she was hooked. Running through corridors, toggling the flashlight, flinching when the industrial metal kicked in on Level 2.

When she stopped, she did not say "that was fun." She said: "The enemies need to look like actual monsters. And there needs to be a story."

Ten minutes later she had a tablet out and was sketching the first monster. Not because I asked. Because the green capsule labeled "Runner" personally offended her.

She is going to design every monster and boss in the game. How they look, how they move, why they exist in the labyrinth. She is going to draft the lore: why the labyrinth exists, what happened to the people who built it, what the player is doing there.

A horror game without lore is just a shooting gallery with good lighting. She understood that faster than I did.

The game got a creative director. She is 13, has zero game dev experience, and already has stronger opinions about monster design than I have about database indexes.

This was not the plan.

It is better than the plan.

## Where it stands

The prototype is playable. Two levels, three enemy types, progression, procedural audio, atmospheric lighting, and a combat loop that feels good. The architecture is clean enough to add levels quickly. The code is 1,200 lines of GDScript across 10 scripts. No plugins, no external dependencies, no asset store. Pure Godot.

Next: real art to replace the CSG primitives, because my daughter has a tablet and opinions. More enemy types with distinct behaviors. Boss encounters at the end of level arcs. Lore revealed through the environment. More levels, darker levels, levels that make you regret owning a flashlight.

I started this project because I wanted to learn Godot.

I am continuing it because my daughter picked up a stylus ten minutes after seeing the demo and decided the world needed to be hers.

The code is mine.

The world will be hers.

The game will be better for it.
