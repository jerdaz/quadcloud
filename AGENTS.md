# Guidelines for Codex Agents

This repository contains an Electron application that opens four browser views for xCloud or other streaming services, each with isolated controller input and focus patches.

## Development

- The codebase uses **CommonJS** modules and runs with Node.js.
- Unit tests are written with **Jest**. Run them with `npm test`.
- When changing or adding functionality:
  - Add or update unit tests covering the new behavior.
  - Update the documentation in `readme.MD` as needed.
  - Execute `npm test` and ensure all tests pass before committing.
- Keep dependencies and scripts in `package.json` up to date when adding tools or libraries.

Following these practices helps maintain code quality and makes the project easier for future contributors to understand.
