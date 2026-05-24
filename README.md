# EcoLoop

Expo Router project for the EcoLoop waste classification app.

## Project structure

```text
app/                  Expo Router routes only
assets/               Static images and app icons
src/
  assets/             Asset export helpers
  components/         Shared UI, layout, and navigation primitives
  features/           Feature modules and screen implementations
  hooks/              Reusable hooks
  theme/              Colors and font tokens
```

## Workflow

1. Keep route files in `app/` very small.
2. Build actual screens in `src/features/<feature>/screens`.
3. Put reusable UI in `src/components`.
4. Put shared styling tokens in `src/theme`.

## Commands

```bash
npm install
npm run start
npm run lint
```
