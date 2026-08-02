# Twin 360 retained sensor evidence

The native ARKit capture writes an optional `lidar_depth.s360depth` stream alongside
the video, fused PLY, and `lidar_poses.json`. It is evidence for later depth supervision;
it is not silently used as a replacement for the current reconstruction path.

## Binary format

All integers are little-endian.

```text
file       = "S360DEPTH1"
record     = timestamp:f64
             width:u16
             height:u16
             depth_bytes:u32
             confidence_bytes:u32
             rgb_jpeg_bytes:u32
             depth_mm:u16[width * height]
             confidence:u8[width * height]
             rgb_jpeg:u8[rgb_jpeg_bytes]
```

Depth and confidence are sampled from the same ARFrame as the RGB JPEG. Records are
currently emitted at the native keyframe interval (about 0.5 seconds), with depth at
the device's native scene-depth resolution. The uploader registers the object as
`lidar_depth`; the worker validates and reports its counts in `quality_metrics.depthEvidence`.

The current worker does not train against this stream yet. Promotion requires a pinned
depth-supervision A/B on a real iPhone capture and a visual gate.
