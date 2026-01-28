# vid-to-gif-bg-remover

CLI tool that takes a video, removes the background using AI, and outputs transparent animated GIFs — sized for Twitch emotes and general use.

<img src="https://github.com/MonoToneMoe/vid-to-gif-bg-remover/blob/main/demo/demo.gif?raw=true" height="500" />

## What it does

1. Extracts frames from a video clip
2. Runs each frame through [Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting) (RVM) to produce an alpha matte
3. Smooths the mattes across time to reduce flickering
4. Composites the original colors with the alpha channel
5. Encodes transparent GIFs at multiple sizes

### Output

| File | Size | Purpose |
|------|------|---------|
| `emote_28x28.gif` | 28x28 | Twitch emote (small) |
| `emote_56x56.gif` | 56x56 | Twitch emote (medium) |
| `emote_112x112.gif` | 112x112 | Twitch emote (large) |
| `emote_512x512.gif` | 512x512 | High-res export |
| `emote_raw.gif` | Original resolution | Uncompressed, no resize |

resized outputs (28/56/112) are automatically kept under 1 MB by reducing FPS, colors, and compression quality as needed.

## Prerequisites

- **Node.js** 22+
- **FFmpeg** (includes ffprobe) — [install instructions](https://ffmpeg.org/download.html)
  ```
  # Windows
  winget install FFmpeg

  # macOS
  brew install ffmpeg

  # Linux
  sudo apt install ffmpeg
  ```

## Setup

```bash
git clone https://github.com/MonoToneMoe/vid-to-gif-bg-remover.git
cd vid-to-gif-bg-remover
npm install
```

Download the RVM ONNX model (~14 MB):

```bash
mkdir models
curl -L -o models/rvm_mobilenetv3_fp32.onnx \
  https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx
```

## Usage

```bash
# Development (no build needed)
npx tsx src/bin/cli.ts video.mp4

# With options
npx tsx src/bin/cli.ts clip.mov --fps 15 --start 2 --end 5 --quality high

# After building
npm run build
node dist/bin/cli.js video.mp4
```

### Options

```
-o, --output <dir>              Output directory (default: ./emotes/ next to input)
--fps <number>                  Frames per second (overrides quality preset)
--start <seconds>               Start time in seconds
--end <seconds>                 End time in seconds
-q, --quality <preset>          high | balanced | small (default: balanced)
--alpha-threshold <number>      Alpha cutoff for GIF transparency, 0-255 (default: 128)
--model-path <path>             Path to RVM ONNX model file
--keep-temp                     Keep temp files for debugging
```

### Quality presets

| Preset | FPS | Colors | Lossy |
|--------|-----|--------|-------|
| `high` | 15 | 256 | 30 |
| `balanced` | 12 | 256 | 60 |
| `small` | 10 | 192 | 80 |

### Example

```bash
npx tsx src/bin/cli.ts gameplay.mp4 --start 10 --end 12.5 --quality high -o ./my-emotes
```

```
✔ Pipeline complete!

Processed 38 frames

Output files:
  28x28                    ./my-emotes/emote_28x28.gif (14.2KB)
  56x56                    ./my-emotes/emote_56x56.gif (42.7KB)
  112x112                  ./my-emotes/emote_112x112.gif (105.3KB)
  512x512                  ./my-emotes/emote_512x512.gif (870.1KB)
  raw (original resolution) ./my-emotes/emote_raw.gif (1.8MB)
```

## Library usage

```typescript
import { runPipeline } from "vid-to-gif-bg-remover";

const result = await runPipeline({
  inputPath: "/path/to/video.mp4",
  quality: "balanced",
  start: 2,
  end: 5,
}, (progress) => {
  console.log(`${progress.stage}: ${progress.message}`);
});

for (const output of result.outputs) {
  console.log(`${output.label}: ${output.outputPath} (${output.fileSizeBytes} bytes)`);
}
```

## How it works

The pipeline uses [Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting) (MobileNetV3 variant) running on ONNX Runtime for CPU inference. RVM uses a recurrent architecture (ConvGRU) that carries temporal state between frames, producing smoother mattes than per-frame models.

GIF encoding is a 3-pass process per size: FFmpeg generates an optimal palette (`palettegen`), applies it with dithering (`paletteuse`), then gifsicle applies lossy compression. GIF only supports binary transparency — the soft alpha matte is thresholded (default 128) to produce on/off transparency per pixel.

## Supported formats

`.mp4` `.mov` `.avi` `.mkv` `.webm` `.flv` `.wmv` `.m4v`

## Known limitations

- **CPU only** — ONNX Runtime runs on CPU. Processing is sequential (required by RVM's recurrent architecture). A 2-second clip at 12 FPS takes roughly 10-30 seconds depending on resolution and hardware.
- **GIF transparency** — GIF does not support semi-transparency. Edges will have some aliasing. The `--alpha-threshold` flag can help tune this.
- **Best with people** — RVM is trained primarily on human subjects. Results on pets, objects, or complex scenes may be less accurate.

## License

MIT
