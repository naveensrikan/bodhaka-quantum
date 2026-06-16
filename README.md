# Bodhaka Quantum Summit

A quantum-native desktop terminal for running authentic Qiskit on real IBM Quantum hardware,
from the user's own computer with their own account. Product of BuoyantWave Learning Technologies LLP.

## What it is (MVP)

A small Electron + React app with a left navigation and four pages:

- **Build** — an Apple-style toggle between two modes:
  - **Terminal** (default): write or paste any Qiskit program and run it.
  - **Canvas**: drag gate blocks onto qubit wires to generate authentic Qiskit, then run or send to the Terminal.
- **Configuration** — your name, IBM Quantum API key, instance, and CRN. Saved on this computer only, never sent anywhere but IBM.
- **Dashboard** — programs run, jobs on IBM, free time remaining, plan, and cost (live figures come from your IBM account).
- **About** — placeholder, wired up later.

The code the user sees and runs is always standard, portable Qiskit. The app removes only the
boilerplate: it runs `QiskitRuntimeService.save_account(...)` once from the Configuration screen,
so programs never need auth code and stay 100% compatible with normal Qiskit.

## Project layout

```
electron/main.cjs        Electron main process (window, run, config, usage)
electron/preload.cjs      Safe bridge exposed to the UI as window.summit
electron/runner.py        Saves the IBM account once; reads usage for the dashboard
src/App.tsx               Left nav + footer + page switch
src/pages/*               Build, Terminal, CanvasBuilder, Configuration, Dashboard, About
src/lib/codegen.ts        Circuit model -> authentic Qiskit
src/lib/ipc.ts            Typed wrapper over the preload bridge (with browser fallback)
src/theme.css             Quantum Canvas visual theme
.github/workflows/build-msix.yml   CI that bundles Python + Qiskit and builds the MSIX
electron-builder.yml      Packaging config (appx / MSIX target)
```

## Develop locally (UI)

```bash
npm install
npm run dev          # Vite + Electron, hot reload
```

For a quick UI-only run without Electron, `npm run dev:renderer` opens the renderer in a browser
(the IPC bridge falls back to stubs, so the layout renders and the Canvas codegen works).

## Build on GitHub: a .exe to test, plus the MSIX

Push this folder to a GitHub repo and run the **Build app (.exe + MSIX)** workflow
(`Actions` tab -> Run workflow, or push a tag like `v0.1.0`). On a Windows runner it bundles a
standalone Python + Qiskit, then produces two downloadable artifacts:

1. **`bodhaka-quantum-summit-exe`** -> a normal `.exe` installer. Download it, install on your
   own Windows laptop, and test the whole app (it bundles Python, so circuits actually run).
   This needs **no Partner Center setup and no icons**. Windows may show an "unknown publisher"
   SmartScreen notice for an unsigned test build; that is expected and goes away once it is
   Store-signed. **Use this to validate the app before publishing.**
2. **`bodhaka-quantum-summit-msix`** -> the Store `.appx`. This one needs your identity filled in
   (see below), so it is allowed to fail without blocking the `.exe`.

### When you are ready to publish to the Store

1. Reserve the app name **Bodhaka Quantum Summit** in Microsoft Partner Center.
2. Copy the **Identity/Name** and **Publisher** values into `electron-builder.yml`
   (`appx.identityName` and `appx.publisher`).
3. Optional but recommended: add icons `build/icon.ico` and `build/icon.png` (256x256 or larger;
   the Bodhaka B works). They are auto-detected; until then a default icon is used.
4. Re-run the workflow, download the `*.appx`, and upload it in Partner Center. **The Store signs it for free.**

## Honest notes

- The **UI, the Canvas-to-Qiskit code generation, Configuration, and Dashboard** are self-contained and reliable.
- The **Python + Qiskit bundling and the first MSIX build** is the standard pipeline above, but a first MSIX
  build on a new machine often needs one small tweak (the python-build-standalone release date in the workflow,
  the icon assets, or the Partner Center identity strings). The app falls back to a system Python if the bundle
  is missing, so it still runs while you sort the packaging out.
- The Microsoft Store is Windows-only. Mac would be a separate path later.

## Privacy

The API key is handled by the standard Qiskit mechanism (`save_account`, stored in `~/.qiskit`) and never
leaves the user's machine. This app has no backend and sends nothing to Bodhaka.
