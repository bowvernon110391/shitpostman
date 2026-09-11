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

| Script              | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run typecheck` | Type-checks the Node and web projects separately          |
| `npm run build`     | Production bundles into `out/`                            |
| `npm run package`   | Builds the Windows installer into `dist/`                 |
| `npm run dist`      | Builds installers for the current OS into `dist/`         |
| `npm run release`   | Builds and uploads to a GitHub Release (needs `GH_TOKEN`) |

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

## Releasing

Installers for Windows, macOS and Linux are built by
[`.github/workflows/release.yml`](.github/workflows/release.yml). Bump the version, tag it,
and push:

```bash
npm version 1.0.1 -m "Release v%s"   # bumps package.json, commits, creates annotated tag
npm run typecheck                    # optional sanity check before you push
git push --follow-tags
```

`--follow-tags` only pushes *annotated* tags, which is why the tag is created with
`-m`. If you tag by hand with a lightweight tag, push it explicitly:
`git push origin master && git push origin v1.0.1`.

The tag must be `v` + exactly the `package.json` version. The workflow fails the build if
they disagree, so it can never publish installers with the wrong number baked in.

The push starts three jobs (Ubuntu, Windows, macOS) in parallel. Each type-checks, compiles
with electron-vite, packages, and uploads the result to a **draft** GitHub Release
(`releaseType: draft` in `electron-builder.yml`). The draft stays invisible to everyone until
you open it under **Releases** and hit **Publish release**. The installers are also attached
to the workflow run as artifacts for 7 days.

You can also start it by hand from the **Actions** tab (**Release → Run workflow**). A manual
run compiles and packages everything but skips publishing, so it is safe as a dry run.

| Platform | Output                                          |
| -------- | ----------------------------------------------- |
| Windows  | `Shitpostman-<version>-setup.exe` (NSIS)        |
| macOS    | `Shitpostman-<version>-<arch>.dmg`, x64 + arm64 |
| Linux    | `Shitpostman-<version>-<arch>.AppImage`         |

## Packaging note

`electron-builder.yml` sets `win.signAndEditExecutable: false`. electron-builder's
`winCodeSign` helper ships macOS symlinks that 7-Zip cannot create on Windows without
Developer Mode or admin rights, which aborts packaging.

The CI workflow re-enables it for its Windows job via `electron-builder.ci.yml`, a small
overlay that `extends` this file, because GitHub's Windows runners *can* create those
symlinks. That step is what embeds `build/icon.png` into the `.exe`, and what would let a
certificate sign it. To match CI locally, turn on Developer Mode and flip the option to
`true` in `electron-builder.yml`.

The overlay exists rather than passing `-c.win.signAndEditExecutable=true` on the command
line because PowerShell — the default shell on GitHub's Windows runners — splits that
dotted token in two at the `=`, after which electron-builder tries to open the second half
as a config file and fails with `ENOENT: ... '.win.signAndEditExecutable=true'`. A plain
filename like `--config electron-builder.ci.yml` has nothing to mangle. Note the overlay is
not auto-detected, so local builds keep using `electron-builder.yml` untouched.

## Signing (later)

Both platforms ship **unsigned** today, so downloaders see a warning on first launch. The
pipeline is set up so that adding signing later is a drop-in change.

### macOS

1. Enrol in the Apple Developer Program (~$99/year) and create a **Developer ID
   Application** certificate in the Developer portal.
2. Export it from Keychain Access as a `.p12` and base64 it:
   `base64 -i DeveloperID.p12 | pbcopy`.
3. Add repository secrets:
   - `MAC_CSC_LINK` — the base64 `.p12`
   - `MAC_CSC_KEY_PASSWORD` — its password
   - Notarisation, either `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`,
     or the App Store Connect API key trio (`APPLE_API_KEY`, `APPLE_API_KEY_ID`,
     `APPLE_API_ISSUER`).
4. Turn notarisation on in `electron-builder.yml`:

   ```yaml
   mac:
     notarize: true
   ```

5. Expose the secrets to the Windows and macOS jobs in
   [`.github/workflows/release.yml`](.github/workflows/release.yml) by extending the
   job-level `env:` block:

   ```yaml
   env:
     PUBLISH: ${{ startsWith(github.ref, 'refs/tags/v') && 'always' || 'never' }}
     GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     CSC_LINK: ${{ secrets.MAC_CSC_LINK }}
     CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}
     APPLE_ID: ${{ secrets.APPLE_ID }}
     APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
     APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
   ```

   On macOS, electron-builder consumes `CSC_LINK` / `CSC_KEY_PASSWORD` (with
   `MAC_CSC_LINK` / `WIN_CSC_LINK` as the platform-scoped alternatives). Setting
   `CSC_LINK` at job level means the Windows job would pick up the macOS certificate, so
   scope it with `if: matrix.platform == 'macos'` on a step, or move it into a
   platform-specific `env:` on the packaging step.

The hardened-runtime entitlements are already committed at `build/entitlements.mac.plist`
and `build/entitlements.mac.inherit.plist`, and `mac.hardenedRuntime` already defaults to
`true` in electron-builder 24, so only the certificate and the secrets are missing.

### Windows

An OV certificate as a `.pfx` works with the electron-builder version in use here — add
`WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` secrets, and stop overriding
`signAndEditExecutable` back to `false` for signed builds.

Azure Trusted Signing requires **electron-builder 26 or newer** (`win.azureSignOptions`);
on 24 you would run `signtool` as a separate step instead. Note that jumping 24 → 26+ also
brings the v27 signed-config rework, so read the migration notes first.

### What users see meanwhile

- **macOS** — "damaged and can't be opened", or an unidentified-developer block. Workaround:
  right-click the app → **Open** → **Open**, or
  `xattr -dr com.apple.quarantine /Applications/Shitpostman.app`.
- **Windows** — SmartScreen "Windows protected your PC". Workaround: **More info** →
  **Run anyway**.

Drop in real `.icns` and `.ico` files under `build/` whenever you have artwork you prefer —
for now electron-builder derives both from the placeholder `build/icon.png`.
