---
title: "Docker Networking Without the Guesswork"
summary: "Docker networking gets a lot easier once you separate internal ports from host port mappings. Containers talk by service name and internal port. The outside world uses the mapped port."
postLayout: simple
date: "2024-11-21"
tags:
  - docker
---

Most developers learn Docker networking when it breaks. They run `docker-compose up`, everything works, and they move on. Then one container can't talk to another, and suddenly everyone is guessing ports like it's a combination lock.

The root cause is usually boring: internal container traffic and host port mappings got mixed together.

---

## What Is a Docker Network?

A Docker network is a virtual layer that wires containers together. Each container gets its own IP, its own hostname, and a direct line to every other container on the same network. Docker handles all of this quietly, which is genuinely useful — until something breaks and you're staring at `Connection refused` with no idea which port you're supposed to hit.

Three details matter:

1. **Container Communication**: Containers on the same network talk to each other by IP, by name, or by alias. Docker's built-in DNS resolves the names. No `/etc/hosts` hacking required.
2. **Port Exposure**: Nothing is exposed to the outside world by default. You have to explicitly punch a hole. This is a good default. Treat it as a feature, not an obstacle.
3. **DNS Integration**: Name resolution inside a Docker network just works. One container calls another by name, Docker resolves it, traffic flows.

---

## How Containers Actually Talk to Each Other

Most tutorials gloss over the part that matters: containers on the same network communicate using **internal ports**. The port the application listens on inside the container. That's it.

### Inside the Network: Internal Ports

Port mappings like `-p 8080:3000`? Irrelevant inside the network. Those mappings exist solely for traffic coming from outside — your browser, your host machine, the wider internet. Containers don't use them.

If a container called `app` runs a service on port `3000`, any other container on the same network reaches it at `app:3000`. Not `app:8080`. Not `localhost:8080`. Just `app:3000`.

Why does this trip people up? Because `-p 8080:3000` looks like it's defining _the_ port. It's not. It's defining a forwarding rule for external traffic. Internal traffic never touches it.

---

### DNS and Service Names

Docker runs an internal DNS server for each network. Every container gets a hostname equal to its name. You don't configure this. You don't install anything. It's just there.

#### Container Names

Name a container `db`, and every other container on the network can resolve `db` as a hostname. Connect to `db:5432` and you're talking to Postgres. Clean, tight, zero ceremony.

#### Aliases

Sometimes the container name isn't what you want downstream services to use. Aliases give you flexibility:

```bash
docker run --network my-network --name db --network-alias primary-db mydatabase
```

Now the container answers to both `db` and `primary-db`. Same container, two DNS entries. Useful when you're migrating names or running blue-green setups without rewiring everything.

#### Multi-Container Setup with Compose

Docker Compose creates DNS entries from service names automatically. Look at this:

```yaml
services:
  app:
    image: myapp
  db:
    image: mydatabase
```

The `app` container connects to the database at `db:5432`. No network aliases to configure, no IP addresses to hardcode. Compose just wires it up. This is the part that works so well people forget there's a network underneath.

---

## Port Forwarding: Punching Holes to the Outside

Everything above happens _inside_ the Docker network. At some point, you need the outside world to reach a container — your browser needs to hit the web app, a monitoring tool needs to scrape metrics, whatever.

That's what `-p` does.

### How It Works

```bash
docker run -p 8080:3000 mywebapp
```

- `3000`: The port the app listens on inside the container.
- `8080`: The port on the host that forwards traffic into the container.

Hit `http://localhost:8080`, and Docker routes the request to port `3000` inside the container. The container has no idea the outside world thinks the port is `8080`. It just sees traffic on `3000`.

#### The Split That Matters

- **Inside the network**: containers use internal ports (`3000`).
- **Outside the network**: the host and internet use the mapped port (`8080`).

Confuse these two, and you'll spend an afternoon debugging something that isn't broken. Ask me how I know.

### Port Forwarding in Docker Compose

```yaml
services:
  web:
    build: .
    ports:
      - "8080:3000"
```

This maps port `3000` inside `web` to port `8080` on the host. But — and this is the part people miss — other containers on the same network still use `web:3000`. The port mapping is purely an external concern. Internal traffic doesn't care about it. Won't use it. Can't use it.

---

## Internal vs. External Access

Two worlds. Keep them separate in your head.

### Internal Access

Containers on the same network use the container name (or alias) plus the internal port. A web server in `webapp` listening on `3000`? Other containers reach it at `webapp:3000`. No port mapping involved. No host networking. Just a name and a port.

### External Access

To let the host or the internet reach a container:

1. Map the container's port to a host port (`-p 8080:3000`).
2. Access the service through the host port (`http://localhost:8080`).

That's the entire model. Internal: name plus internal port. External: host plus mapped port. If you remember nothing else, remember this split.

---

## Putting It All Together

Enough theory. Let's wire up a web app that talks to a database.

### The Setup

- Web app listens on port `5000`.
- Database listens on port `5432`.

### The Steps

1. **Create the network**:

   ```bash
   docker network create my-app-network
   ```

2. **Start the database**:

   ```bash
   docker run --network my-app-network --name db --network-alias primary-db mydatabase
   ```

   Reachable as `db:5432` by name. Also reachable as `primary-db:5432` by alias.

3. **Start the web app**:

   ```bash
   docker run --network my-app-network --name webapp mywebapp
   ```

4. **Internal communication**: The web app connects to the database at `db:5432` or `primary-db:5432`. No port mapping. No host involvement. Just two containers on the same network, talking directly.

5. **Expose the web app externally**:

   ```bash
   docker run -p 8080:5000 --network my-app-network --name webapp mywebapp
   ```

   Now the outside world reaches the web app at `http://localhost:8080`. The database stays hidden — no port mapping, no exposure, no attack surface. Exactly how it should be.

---

## The Model

Docker networking is simpler once you stop mixing up internal ports and external port mappings.

Internal ports are for containers talking to containers. Port mappings are for the outside world talking to containers. DNS handles name resolution so you never hardcode an IP. Compose automates the wiring so you rarely think about networks at all.

That's the whole model. Most Docker networking bugs get less mysterious once you keep that split in your head.
