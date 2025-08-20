# Quad Play

Electron app that splits the display into four isolated browser sessions for xCloud or Remote Play. Each view scales to half of the screen's width and height—for example, on a 4K screen each view is 1080p, and on a 1080p screen each view is 540p. Every view uses its own persistent profile and only listens to a single controller.

## Windows setup

1. **Install Node.js** – download the LTS version from [nodejs.org](https://nodejs.org) and run the installer.
2. **Download the source** – grab the ZIP of this repository from GitHub and extract it.
3. (Optional) Download the Better XCloud script:

   ```powershell
   powershell -Command "Invoke-WebRequest -Uri https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js -OutFile better-xcloud.user.js"
   ```

4. **Start the app** – run `quadcloud.bat`. The script installs dependencies on the first launch and updates Electron once per day before starting the application.

## Linux setup (Debian/Ubuntu)

1. Install Node.js and required tools:

   ```bash
   sudo apt update
   sudo apt install -y nodejs npm curl tar
   ```

2. Download and extract the source:

   ```bash
   curl -L -o quadcloud.tar.gz https://github.com/jerdaz/quadcloud/archive/refs/heads/main.tar.gz
   tar -xzf quadcloud.tar.gz
   cd quadcloud-main
   ```

3. (Optional) Download the Better XCloud script:

   ```bash
   curl -L -o better-xcloud.user.js https://github.com/redphx/better-xcloud/releases/latest/download/better-xcloud.user.js
   ```

4. Start the app (Electron updates run once per day and dependencies install on first run):

   ```bash
   chmod +x start.sh
   ./start.sh
   ```
## Usage

```bash
npm install # first run only
npm start
```


The app automatically splits the active display into four equal quadrants based on the screen resolution. Each quadrant loads `https://xbox.com/play` by default. Adjust the `URLs` array in [`main.js`](main.js) to point to other streaming services if needed.

To avoid xCloud's "click to continue" overlay when a quadrant loses OS focus, the app spoofs focus in the main world of all `xbox.com` frames.

Each quadrant exposes a configuration panel (Ctrl+1–4) where you can rename or switch profiles, create additional profiles beyond the default four, choose a controller, and enable or disable the quadrant. Disabling removes the quadrant's browser view but the setting persists across sessions. You can still open the panel later to re‑enable the quadrant. Selecting a different controller reloads the quadrant so the previous stream is terminated. Profile selections persist across sessions.
Press Ctrl+S in a focused quadrant to choose its audio output device directly within the stream; when a headset is plugged into an Xbox controller, the matching "Xbox Controller" device is preselected automatically.
Press Ctrl+A at any time to automatically apply the preferred audio device for all quadrants in the background. The shortcut also triggers automatically whenever a new stream starts, keeping audio assignments intact after restarts. Newly created video elements within a stream automatically inherit the preferred device.

## Notes

- Works on Windows and Linux.
- Gamepad filtering relies on the Gamepad API. Streaming services that read controllers directly from the OS may require additional tools for full isolation.

## Hotkeys

- **Ctrl+Q**: quit the application.
- **Ctrl+1**: open the configuration panel for the top-left quadrant.
- **Ctrl+2**: open the configuration panel for the top-right quadrant.
- **Ctrl+3**: open the configuration panel for the bottom-left quadrant.
- **Ctrl+4**: open the configuration panel for the bottom-right quadrant.
- **Ctrl+Alt+1**: focus the top-left quadrant.
- **Ctrl+Alt+2**: focus the top-right quadrant.
- **Ctrl+Alt+3**: focus the bottom-left quadrant.
- **Ctrl+Alt+4**: focus the bottom-right quadrant.
- **Ctrl+Alt+I**: open developer tools for the focused view.
- **Ctrl+S**: open the speaker selection dialog for the focused quadrant.
- **Ctrl+A**: automatically apply the preferred audio device for all quadrants (also runs on new streams and new video elements).

## Testing

```bash
npm test
```

