# VibeCanvas

A web app that lets you draw vibration patterns and play them on bluetooth toys using Intiface Central.

## What it does

You draw a pattern on the canvas where X axis is time and Y axis is intensity. Then it plays that pattern on your connected toy in a loop.

## Setup

1. Install dependencies:
```
npm install
```

2. Run the dev server:
```
npm run dev
```

3. Download [Intiface Central](https://intiface.com/central/) and start the server

4. Open the app and connect!

## Tech stack

- React + TypeScript
- Vite
- Konva (for the canvas)
- Buttplug.io (for device control)

## How it works

The app connects to Intiface Central via websocket on port 12345. When you draw on the canvas it records points with time and intensity values. When you hit play it interpolates between those points and sends the intensity to your toy ~33 times per second.

## TODO

- [ ] Save/load patterns
- [ ] Multiple device support
- [ ] Audio reactive mode
- [ ] Better mobile support
