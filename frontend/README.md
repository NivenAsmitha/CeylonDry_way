# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Google Maps development setup

Copy the Maps variable names from `.env.example` into the untracked
`frontend/.env` file and restart Vite after changing them:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_MAP_ID=
```

`VITE_GOOGLE_MAPS_API_KEY` is a browser key and is visible to site visitors; it
must not be treated as a secret. Protect every deployed key in Google Cloud
with Website/HTTP-referrer restrictions and an API restriction allowing only
the Maps JavaScript API. The optional map ID enables Advanced Markers. This
implementation does not use Places autocomplete or Geocoding, so do not enable
the Places or Geocoding APIs for it.

Use separate staging and production keys/referrer allowlists. Configure quotas
and billing budget alerts before production traffic. Never commit real key
values; `.env` files are Git-ignored. When the key is missing, rejected, or the
browser is offline, the approved place list, manual owner coordinate fields,
exact coordinates, and external Directions link remain usable.
