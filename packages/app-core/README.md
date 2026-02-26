# App Core

Platform-agnostic read services and runtime validation used by mobile, web and desktop clients.

## Modules

- `adapters/`: platform abstractions (`HttpAdapter`, `TelemetryAdapter`)
- `runtime/`: shared runtime validation fallback logic
- `services/`: read services for `matches`, `teams`, `players`, `competitions`, `follows`

No `react-native*` imports are allowed in this package.
