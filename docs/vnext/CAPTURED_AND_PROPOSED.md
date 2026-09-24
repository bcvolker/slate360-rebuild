# Captured and proposed assets

Recorded in Slice 6A. This is a boundary for later work. It is not a feature, and it is not a build plan.

## Captured

Captured assets are the measured record of the site.

- Reality captures and Gaussian splats
- Measured or reference geometry that documents what was there
- 360 and other field evidence already published to the project

Captured assets are the as-built source of truth. A later edit must not overwrite them.

## Proposed

A project may later hold a separate, versioned scene for design exploration.

- An editable scene, in whatever format the editing backend eventually proves (GLB, USD, a Blender scene, or a later equivalent)
- Optional derivatives made from photogrammetry, a splat, or a mesh
- Named proposal versions the client can save

Proposed assets are not the captured record. They can be replaced, undone, or discarded without changing the capture they started from.

## Future design mode

When an editing backend exists, a client may be able to:

- Change wall and ceiling colors
- Change flooring and other materials
- Add paint, carpet, fabric, or texture references
- Add or move furniture from a library
- Save named proposal versions
- Undo and redo
- Export a proposal format the product has actually implemented

Every modified scene is labeled **Proposed / design exploration**. It is never presented as an as-built condition.

A future assistant belongs to this proposed workflow only. It must not edit the captured splat, the official as-built record, or the measurement source of truth. A prompt or reference upload would become a structured edit against a versioned proposed scene, which a worker would preview for the user to accept or save. That pipeline is not built.

## Not in the client yet

Design mode, a design studio, an assistant, and Blender are not navigation items and not product surfaces. They stay hidden until a real editable scene, authorized access, an editing backend, versioning, rendering, and failure handling all exist.
