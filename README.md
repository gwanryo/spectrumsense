# SpectrumSense

**Discover where you draw the line between colors.**

SpectrumSense is an interactive web app that maps your personal color perception boundaries. Through a series of binary-search-driven questions, it pinpoints exactly where you see Red become Orange, Orange become Yellow, and so on across the visible spectrum — then shows how your perception compares to the standard.

> **[Try it live](https://gwanryo.github.io/spectrumsense/)**

## How It Works

1. **Choose** — You're shown a color and asked which of two adjacent color names it belongs to
2. **Narrow** — Your answers drive a binary search that zeroes in on each boundary (6 boundaries, 6 steps each = 36 questions)
3. **See** — Results show your personal spectrum map, deviation from typical boundaries, and a shareable result card

You can also **Refine** your results with a follow-up test that narrows the search range around your previous answers (18 questions).

## Tech Stack

| | |
|---|---|
| **Language** | TypeScript (strict) |
| **Build** | Vite |
| **Test** | Vitest |
| **Deploy** | GitHub Pages (Actions) |
| **Frameworks** | None — DOM + Canvas API |

## Development

```bash
npm install
npm run dev        # dev server
npm test           # run tests
npm run build      # production build
```

## License

MIT
