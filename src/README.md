# Source Layout

This project keeps Expo Router route files in `app/` and moves app code into `src/`.

## Current structure

```text
src/
  assets/        Static asset exports
  components/    Shared UI and layout primitives
  features/      Screen modules grouped by feature
  hooks/         Reusable hooks
  theme/         Colors and fonts
```

## Rule of thumb

- Put route definitions in `app/`
- Put screen implementations in `src/features/.../screens`
- Put reusable UI in `src/components`
- Put styling tokens in `src/theme`
