# Motion-graphics elements (optional)

Smooth, animated video elements — kinetic title cards and per-word captions with spring motion, scale, and glow — the kind of motion graphics FFmpeg's `drawtext`/`zoompan` can't produce. Rendered with [Remotion](https://remotion.dev) (React → video).

This is an **optional module**, excluded from ClipForge's main build (see `tsconfig.json` `exclude`). It adds no dependencies to the base install — enable it only if you want animated elements.

## Enable & render

```bash
# one-time: install the optional Remotion deps (~300MB, headless render shell)
npm i remotion @remotion/cli react react-dom

# render an animated intro title card (9:16, 2.5s) → intro.mp4
npm run render:element -- --kind title --text "在家手冲 三步搞定" --subtitle "COFFEE" --out intro.mp4

# render a kinetic per-word caption
npm run render:element -- --kind caption --text "买它 真的 好用" --aspect 9:16 --duration 3 --out cap.mp4
```

Flags: `--kind title|caption`, `--text`, `--subtitle` (title only), `--aspect 9:16|16:9|1:1`, `--duration <秒>`, `--out <file.mp4>`.

Output is **h264 mp4 in ClipForge's exact format** (e.g. 1080×1920), so it composites cleanly into the FFmpeg pipeline (overlay / concat) or can be dropped into a project's local material pool.

## Templates

- `TitleCard.tsx` — animated title + optional subtitle, spring scale/slide-in, gradient + glow.
- `KineticCaption.tsx` — per-word spring-in caption.

Add your own composition in `Root.tsx` and a matching `--kind`.

## Status

The renderer + templates are shipped. **Auto-prepending an animated intro/outro inside the compose step** is the next step — it touches the compositor and will land as a follow-up; for now render elements here and use them as intro/outro clips or local materials.
