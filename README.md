# Motel Schedule Maker

A mobile-friendly, installable scheduling prototype for motel managers and employees. Version 1 uses local mock data and stores no information on a server.

## Run locally

```bash
npm install
npm run dev
```

The development server binds to all network interfaces on port `5173`. In Codex, open the Web Preview for port `5173` rather than opening the server's loopback address on your computer. Use either demo button on the login screen to explore the manager and employee experiences.

## Checks

```bash
npm run build
npm run lint
```

## Technology

- React, TypeScript, and Vite
- A web app manifest and service worker for installability
- In-memory sample employees, shifts, requests, and open-shift volunteers
