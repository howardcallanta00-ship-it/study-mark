# Study Mark

Study Mark is a browser-based Ethics and Legal Aspects quiz application. It contains exactly three independent quizzes and 210 source-verified questions, with local progress, answer feedback, keyboard controls, full retakes, and repeated mistake practice.

## Local checks

```sh
pnpm install --frozen-lockfile
pnpm validate:data
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

## Render Static Site

Create one **manual Static Site** with these values:

- Repository: this repository
- Branch: `main`
- Root directory: `study-mark-web`
- Build command: `pnpm run build`
- Publish directory: `dist`
- Environment variables: none
- Auto-deploy: enabled for commits to `main`
- Instance/service type: free Static Site

The app uses `HashRouter`, so every quiz route works on static hosting without rewrite rules. No `render.yaml` is included; do not create a second Blueprint-managed service.

Progress is stored in the current browser's local storage and does not transfer between browsers or devices.
