# GraphitePad

## Running the app

From the project root:

```bash
cd /home/rahim/Desktop/DEV/GraphitePad
bun install
bun run dev
```

That starts Next.js on http://localhost:3311 and opens the Electrobun desktop window.

### Other options

Browser-only development:

```bash
bun run dev:web
# then open http://localhost:3311
```

Build the web app and launch the desktop app with static files:

```bash
bun run desktop
```

Build a release desktop bundle:

```bash
bun run build:desktop
```

If `hutch` is missing:

```bash
hutch electrobun prepare
```
