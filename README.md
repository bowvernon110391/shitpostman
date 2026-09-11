# 🫧 Shitpostman

A Frutiger Aero–flavoured desktop API client. Manage collections of requests, authenticate
with the usual suspects, and read responses in a glossy glass panel.

Built with Electron + React + TypeScript (electron-vite), Zustand, axios, and electron-store.

## Running it

```bash
npm install
npm run dev        # dev server + Electron window
```

Other scripts:

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run typecheck` | Type-checks the Node and web projects separately           |
| `npm run build`     | Production bundles into `out/`                             |
| `npm run package`   | Builds the Windows installer into `dist/`                  |

## Features

**Collections** — tree of collections → folders → requests, with drag & drop reordering,
inline rename, duplicate, delete, and a filter box. Ships with an "HTTPBin Playground"
collection covering GET/POST, all three auth styles, and PNG/HTML/XML response types.

**Auth** — None, Bearer token, Basic (username/password), and API key (custom header name or
query parameter). Credentials support `{{variables}}`.

**Environments** — named variable sets with a title-bar selector. Any `{{name}}` in the URL,
params, headers, body, or auth fields is substituted at send time. Built-ins available
everywhere: `$timestamp`, `$isoTimestamp`, `$uuid`, `$randomInt`, `$randomFloat`.
Unresolved variables are flagged in the URL bar before you send.

**Request builder** — method + URL, query params, headers, body (none / JSON / form-data / raw
/ GraphQL) with a Beautify button, auth, and a code tab that generates cURL, JavaScript
(fetch), Python (requests), and Node (axios) snippets from the live request.

**Response viewer** — status/time/size chips, collapsible syntax-highlighted JSON tree with
per-node copy, raw view, image preview with HTML iframe rendering, header and cookie tables,
and save-to-file.

**History** — every send is recorded; click an entry to restore the full request config.

## Postman interop

Import and export Postman v2.1 collections (single or all at once) and environments, via the
`Import` button, the collections footer, or the settings modal. Round-trips cleanly.

## Data

State lives in a JSON file managed by `electron-store` under the app's `userData` directory.
Settings → *Show data file* reveals it; *Reset app data* reseeds the sample content.

> Requests are executed in the Electron main process through axios, so there is no CORS
> restriction. TLS verification, redirect following, and the timeout are all configurable.

## Packaging note

`electron-builder.yml` sets `win.signAndEditExecutable: false`. electron-builder's
`winCodeSign` helper ships macOS symlinks that 7-Zip cannot create on Windows without
Developer Mode or admin rights, which aborts packaging. Nothing is lost while no certificate
and no custom icon are configured — set it back to `true` once you add either.
