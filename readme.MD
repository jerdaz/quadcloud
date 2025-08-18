# Quad Play

Electron app that splits a 4K screen into four isolated 1080p browser sessions for xCloud or Remote Play. Each view uses its own persistent profile and only listens to a single controller.

## Usage

```bash
npm install
npm start
```

Each quadrant loads `https://xbox.com/play` by default. Adjust the `URLs` array in [`main.js`](main.js) to point to other streaming services if needed.

## Notes

- Works on Windows and Linux.
- Gamepad filtering relies on the Gamepad API. Streaming services that read controllers directly from the OS may require additional tools for full isolation.

