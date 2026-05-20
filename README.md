# WebADB AutoGLM Demo

Pure frontend Android phone-agent demo:

```text
Chromium WebUSB -> Tango/WebADB -> Android ADB
Browser fetch -> OpenAI-compatible /v1/chat/completions
```

## Run

```bash
npm install
npm run dev
```

Open the Vite localhost URL in Chrome or Edge.

## Requirements

- Chromium browser with WebUSB.
- Android device with USB debugging enabled.
- USB cable.
- OpenAI-compatible endpoint that accepts browser CORS requests.
- Vision-capable model that supports `image_url` content in `/v1/chat/completions`.

## Model Contract

The model must return exactly one JSON object:

```json
{ "action": "tap", "x": 540, "y": 1280, "reason": "Click the search field" }
```

Supported actions:

- `launch`
- `tap`
- `swipe`
- `input_text`
- `key`
- `back`
- `home`
- `long_press`
- `double_tap`
- `wait`
- `take_over`
- `note`
- `done`

The parser also accepts Open-AutoGLM style action names and payloads, including `Launch`, `Tap` with `element: [x, y]` relative coordinates, `Type`, `Swipe`, `Back`, `Home`, `Long Press`, `Double Tap`, `Wait`, and `Take_over`.

## Device Controls

- App launch uses known app-name mappings or direct package names.
- Long press uses an Android `input swipe x y x y duration` command.
- Double tap sends two tap commands with a short delay.
- Text input can use Android `input text` or ADB Keyboard broadcast mode.
- ADB Keyboard mode requires `com.android.adbkeyboard/.AdbIME` to already be installed on the device.

## Safety Notes

Auto execute is off by default. API keys are entered in the browser and are suitable only for local demo use. Avoid accounts, payments, passwords, destructive flows, and private data.

## Verify

```bash
npm test
npm run lint
npm run build
```
