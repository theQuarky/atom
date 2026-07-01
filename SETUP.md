# Setup Instructions

To run the electron configuration engine in your browser, follow these steps:

## 1. Install Dependencies

```bash
npm install
```

## 2. Start Development Server

```bash
npm run dev
```

This will start a Vite dev server (usually at `http://localhost:5173`) and automatically open the browser.

## 3. Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Features

- **Interactive Calculator**: Enter an atomic number (1–118) to see the electron configuration
- **Real-time Results**: Displays configuration with orbital notation and detailed table
- **Test Suite**: Click "Run All Tests" to see configurations for common elements
- **Aufbau Exceptions**: Correctly handles transition metal exceptions (Cr, Cu, Pd, Au, etc.)
- **Modern TypeScript**: Fully typed with proper error handling

## Files Created

- **package.json** — Dependencies and scripts
- **vite.config.js** — Build configuration
- **tsconfig.json** — TypeScript configuration
- **app.ts** — Browser app logic and UI handlers
- **docs/index.html** — Interactive HTML interface (updated)

## How It Works

The engine uses the **Aufbau Principle** to determine electron configurations:
1. Generates all possible subshells sorted by (n+l), then n
2. Fills electrons according to this order
3. Applies known exceptions for transition metals
4. Validates the total equals the atomic number
