# vite-plugin-semi-theming

A Vite plugin for semi theming.

Based on [vite-plugin-semi-theme](https://github.com/boenfu/vite-plugin-semi-theme), but with some differences:

- ESM only
- Support pnpm

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { semiTheming } from "vite-plugin-semi-theming";

export default defineConfig({
  plugins: [
    semiTheming({
      theme: "@semi-bot/semi-theme-yours",
      // options: {
      // ... 👆
      //},
    }),
  ],
});
```
