# Design Studio — Unreal Engine 5.8 Setup Guide (for Brian)

This is the one part of Design Studio that has to be built **inside the Unreal
Editor on your high-end PC**, once. After this, you never touch the editor for
normal use — you operate everything from the Slate360 browser tab.

**What you're building:** a small Unreal "app" (the *player*) that runs in the
cloud and knows how to receive JSON commands from Slate360 and act on them —
swap materials, spawn/remove furniture, import generated 3D objects, adjust
lighting, build scenes step-by-step. It is a *universal player*, not a fixed set
of content: anything the AI generates or you upload streams into it live.

**You will use an AI assistant (me, in a browser, + Unreal's built-in MCP) to do
most of the wiring.** Your job is mostly: install things, follow steps, click,
test, and package.

---

## 0. Prerequisites (one-time)

1. **Unreal Engine 5.8** installed via the Epic Games Launcher (you have this).
2. A capable Windows PC with a decent GPU (you have this).
3. An **Epic Games account** (free).
4. Later (not yet): an **Eagle3D** free-trial account and an **AWS** account.

> You do NOT need a freelancer. With the Epic samples + AI assistance + this
> guide, you can do it yourself.

---

## 1. Get the starting pieces (downloading + clicking)

From the **Epic Games Launcher → Unreal Engine → Samples / Learn** tab, add to
your library and create projects from:

- **Pixel Streaming Sample** — already wired for browser streaming + the
  `emitUIInteraction(JSON)` command channel. This is our base project.
- **Product Configurator** (or Automotive Configurator) sample — copy its
  Variant Manager material/mesh-swap pattern later.

Then install the **glTFRuntime** plugin (free):
- Easiest: get it from **Fab** (search "glTFRuntime") and "Add to project", or
- Clone https://github.com/rdeioris/glTFRuntime into the project's `Plugins/`
  folder.

> glTFRuntime is what lets the app import AI-generated `.glb` objects at runtime.
> **Packaging note (important):** in Project Settings, add the glTFRuntime
> plugin's `Content` directory to **"Additional Asset Directories to Cook"** —
> otherwise materials break in the packaged build.

---

## 2. Turn on the plugins

In your project: **Edit → Plugins**, enable and restart:

- **Pixel Streaming 2** (UE 5.8) — not the legacy version
- **Remote Control API**
- **glTFRuntime**
- (Optional, AI authoring help) **Unreal MCP** — Unreal 5.8's built-in MCP
  server that lets an AI assistant drive the editor.

---

## 3. Connect the AI assistant (so you don't wire Blueprints by hand)

Unreal 5.8 ships an experimental **MCP server** (`http://127.0.0.1:8000/mcp`).
Connect an MCP-capable assistant (Claude Desktop or Cursor) to it. With that, I
can tell the editor to spawn actors, set tags, create materials, etc., while you
watch and approve. Keep me open in a browser tab beside Unreal; you describe what
you want, I drive the editor.

> MCP is for **building** the project (authoring), NOT for the live streamed
> runtime. The runtime uses the command channel in step 5.

---

## 4. Build the room and tag the surfaces

1. Start from the Pixel Streaming Sample's level, or import a free furnished
   room from Fab.
2. Make sure there are walls, a floor, a ceiling, and a light.
3. **Tag the surfaces** so commands can find them. Select the floor actor →
   Details → **Actor → Tags** → add `Surface.Floor`. Tag walls `Surface.Wall`,
   etc. (The AI assistant can do this for you.)
4. Add a few starter furniture meshes and tag spawn points `Furniture.Slot`.

---

## 5. Add the orchestrator (the command handler)

This is the one custom piece. Create a Blueprint actor **`BP_DesignOrchestrator`**
in the level with a single entry point that parses incoming JSON and dispatches.

**Command channel:** the Pixel Streaming **input event**. In the level, an actor
with a **Pixel Streaming Input** component binds **`OnPixelStreamingInputEvent`**,
receives the JSON string Slate360 sends via `emitUIInteraction(...)`, and calls
the orchestrator. (No separate Remote Control port needed — commands ride the
same WebRTC connection as the video. More secure, works through any host.)

The orchestrator must handle these commands (this is the **exact schema Slate360
sends** — see `lib/design-studio/action-schema.ts`):

| Command (`op`)     | What the orchestrator does                                   |
|--------------------|--------------------------------------------------------------|
| `clear_scene`      | Destroy agent-spawned actors (keep the room + orchestrator)  |
| `swap_material`    | Find actors by tag → set material instance                   |
| `recolor`          | Set a color parameter on the tagged material                 |
| `remove_object`    | Hide/destroy actor(s) by tag                                 |
| `spawn_furniture`  | Spawn a known library asset at a position                    |
| `import_glb`       | Download GLB from URL (glTFRuntime) → spawn                  |
| `move_object`      | Translate a tagged actor                                     |
| `adjust_lighting`  | Set sun/light intensity, color temp, preset                  |
| `set_environment`  | Swap sky/ground                                              |
| `set_camera`       | Move/aim the camera to a preset or coordinates               |
| `annotate`         | Place a label                                                |

Plus a **build-plan executor**: given an array of `build_steps` (each an action +
`pause_ms`), run them one at a time with a timer (`FTimerManager`) so the viewer
**watches construction happen live** instead of everything appearing at once.

> I will give you the Blueprint/C++ for each handler. With Unreal MCP, much of
> this can be generated in your editor on command.

**Send status back** to Slate360 with **`Send Pixel Streaming Response`** (e.g.
`{ "status": "ok", "step": 3 }`) so the UI can show progress.

---

## 6. Test locally

1. Hit **Play** with Pixel Streaming enabled (or run the packaged build with the
   flags below) and open the sample's player page.
2. Send a test command from the browser:
   `emitUIInteraction({ "op": "swap_material", "target": "Surface.Floor", "material": "M_Oak" })`
3. Confirm the floor changes. Then test `import_glb` with a public GLB URL.

---

## 7. Package the app

1. **Platforms → Windows → Package Project** (Shipping or Development).
2. Confirm the glTFRuntime cook setting from step 1.
3. Launch flags for the packaged streamed instance:
   ```
   YourProject.exe -RenderOffscreen -PixelStreamingIP=0.0.0.0 -PixelStreamingPort=8888
   ```
   (Remote Control, if you also use it, adds `-RCWebControlEnable -RCWebInterfaceEnable`.)
4. The result is a folder/zip — **the app**.

---

## 8. Upload and stream

**First, validate free on Eagle3D (no subscription, ~60 lifetime minutes):**
1. Create an Eagle3D trial account (no card).
2. Control Panel → **Add Application** → upload your packaged `.zip` (≤5 GB).
3. Create a stream link, open it, confirm it streams + responds to commands.

**Then, for ongoing use (pay-as-you-go, no subscription): AWS EC2 GPU.**
- Launch a **g4dn.xlarge** (or g5.xlarge for better visuals) with a public IP and
  a security group opening the WebRTC UDP ports + signaling.
- Run Epic's free **Signalling Web Server** + **coturn** on the same instance
  (both free/open-source). Claude provides the launch scripts.
- The instance bills only while running (~$0.50–1/hr); stop it when done. The
  disk persists (~$1–3/mo) for fast restarts.

> Do NOT use RunPod — its pods don't support the UDP that WebRTC needs.

---

## 9. Connect to Slate360

Give Claude the **stream URL / signaling URL** from your host. Claude wires the
Design Studio **PixelStreamViewer** to it and records the session in
`design_stream_sessions` so the **live cost meter + auto-shutdown** work. From
then on: log into Slate360 → Design Studio → it streams your Unreal app, and your
prompts drive it live.

---

## What Claude provides vs. what you do

| Claude provides (code/instructions)            | You do (in the editor, once)        |
|------------------------------------------------|-------------------------------------|
| All orchestrator Blueprint/C++ logic           | Install UE samples + glTFRuntime    |
| The exact command schema (already in the app)  | Enable plugins                      |
| AWS launch scripts (UE + signaling + coturn)   | Build/tag the room, add a few assets|
| PixelStreamViewer + cost meter wiring          | Package the app                     |
| Step-by-step for every click                   | Upload to Eagle3D, then AWS         |

You only do this once. After that it's 100% browser.
