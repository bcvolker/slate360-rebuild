# Saved view / evidence link

A saved view is the record of one captured look at a project. It is the internal address Slice 11 can later share. It is not a camera bookmark and it is not a public token.

The address is:

`/vnext/projects/{projectId}/explore?view={savedViewId}`

The row, not the other query fields, decides what opens:

- project
- representation
- exact source id
- visit id and occurred-at, when a single project visit contains that source
- item id, when the item belongs to the project
- plan sheet id, when the representation is Plan and the sheet is that source
- view state only when the viewer can reproduce it
- optional 16:9, 9:16, or 1:1 framing

If the source is gone, or the capability is no longer included, the page says the saved view is not available. It does not open a newer source and it does not name a hidden service. The row stays. Turning a capability back on, while the same source is still renderable, makes the view available again.

Reality camera paths stay on `digital_twin_models.camera_path`. One path belongs to that model version. It is not copied onto a replacement model.

Browser recording and server video export are not in this slice. A later export can play this same path in a headless renderer and encode it. The client does not advertise that.
