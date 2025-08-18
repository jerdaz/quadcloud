# Quad Play

Electron app that splits the display into four isolated browser sessions for xCloud or Remote Play. Each view scales to half of the screen's width and height—for example, on a 4K screen each view is 1080p, and on a 1080p screen each view is 540p. Every view uses its own persistent profile and only listens to a single controller.

## Windows setup

1. **Install Git** – download and run the installer from [git-scm.com](https://git-scm.com/download/win) and accept the defaults.
2. **Install Node.js** – download the LTS version from [nodejs.org](https://nodejs.org) and run the installer.
3. Open **Git Bash** (installed with Git) or **Command Prompt**.
4. Clone the repository and enter the folder:

   ```bash
   git clone https://github.com/your-username/quadcloud.git
   cd quadcloud
   ```

5. Install dependencies and start the app:

   ```bash
   npm install
   npm start
   ```

## Linux setup (Debian/Ubuntu)

1. Install Git and Node.js:

   ```bash
   sudo apt update
   sudo apt install -y git nodejs npm
   ```

2. Clone the repository and enter the folder:

   ```bash
   git clone https://github.com/your-username/quadcloud.git
   cd quadcloud
   ```

3. Install dependencies and start the app:

   ```bash
   npm install
   npm start
   ```
=======
## Usage

```bash
npm install
npm start
```


The app automatically splits the active display into four equal quadrants based on the screen resolution. Each quadrant loads `https://xbox.com/play` by default. Adjust the `URLs` array in [`main.js`](main.js) to point to other streaming services if needed.

## Notes

- Works on Windows and Linux.
- Gamepad filtering relies on the Gamepad API. Streaming services that read controllers directly from the OS may require additional tools for full isolation.

## Hotkeys

- **Ctrl+Q**: quit the application.
- **Ctrl+1**: focus the top-left quadrant.
- **Ctrl+2**: focus the top-right quadrant.
- **Ctrl+3**: focus the bottom-left quadrant.
- **Ctrl+4**: focus the bottom-right quadrant.

