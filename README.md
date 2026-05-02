# defense-sim

A Vite + TypeScript demo for simulating keystroke biometrics, authentication drift, and impostor detection.

## What it does

This app models a password-based authentication flow using timing-based typing signals such as dwell time and flight time. It compares genuine and impostor behavior, tracks false positives and false negatives, and visualizes drift over time.

## Tech Stack

- Vite
- TypeScript
- Tailwind CSS
- Vanilla DOM rendering

## Getting Started

### Install dependencies

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Project Structure

- `src/main.ts` - application logic and simulation flow
- `src/style.css` - app styling
- `public/model/keystroke_model.json` - trained model artifact used by the simulation
- `index.html` - Vite entry page

## Notes

The app is currently a front-end simulation only. It does not require a backend service.
