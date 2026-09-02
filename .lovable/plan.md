# Capacitor-ready architecture and mobile UX modernization

## Goal
Prepare Pinkee for Android and iOS packaging while preserving the current web experience, backend, authentication, wallet, rewards, support, movies, analytics, streaming, profiles, feed, search, admin tools, and existing business rules.

## Delivery phases

### Phase 1 — Native foundation and shared app contracts
- Add Capacitor core, CLI, Android, and iOS packages and initialize the project with the approved Pinkee app identity.
- Add a single runtime configuration module for app name, public base URL, API/function names, deep-link paths, and platform detection; remove scattered hardcoded origins and navigation assignments.
- Add a platform capability layer with safe web fallbacks for sharing, clipboard, file picking, media/fullscreen, network status, storage, and opening external links.
- Keep React Router for web, but centralize route definitions and navigation helpers so native deep links map to the same screens without route-specific browser assumptions.
- Add an app lifecycle bridge for foreground/background, resume, and network changes without changing current business logic.

### Phase 2 — Authentication, redirects, and deep links
- Preserve the current email/password auth flow and automatic refresh while making redirect targets derive from the runtime/deep-link configuration rather than `window.location` assumptions.
- Add a stable public callback route and deep-link route resolver for shared videos, watch parties, profiles, password reset, notifications, and support links.
- Preserve the Welcome Back experience and forgot-password flow on web and native.
- Ensure protected routes wait for session hydration before redirecting, and preserve intended destinations across sign-in.
- Add Android App Links/iOS Universal Links metadata/configuration placeholders and document the final published-domain association step.

### Phase 3 — Mobile navigation and responsive UX
- Refactor the existing top nav, sidebar, and bottom nav into a shared navigation shell with native-mappable tab, stack, and drawer concepts.
- Add safe-area handling, orientation-aware layouts, touch-sized controls, keyboard-aware forms, scroll locking, and mobile-friendly dialog/sheet behavior.
- Audit fixed overlays including support, upload dock, mini-player, notifications, watch parties, comments, and auth walls so they do not cover system bars or bottom navigation.
- Preserve desktop layouts while improving phone and tablet behavior across the existing routes.

### Phase 4 — Media, upload, and notifications capability adapters
- Route video/image/music uploads through a reusable picker and upload service that supports browser input today and Capacitor Camera/Filesystem/File Picker integration later, without changing storage paths or database records.
- Preserve thumbnail extraction, bulk queue, metadata suggestions, upload progress, cancellation, and retry behavior; add lifecycle-safe recovery for interrupted mobile connectivity.
- Keep the existing HLS and streaming architecture, adding mobile-safe media settings and external-player fallbacks where platform restrictions require them.
- Separate web push from native push integration: keep the existing browser notification behavior, and add a clean device-token registration contract for future FCM/APNs delivery without exposing private credentials.

### Phase 5 — Performance, resilience, and validation
- Add route-level lazy loading/code splitting for the large page surface, image loading/compression improvements, request cancellation, and low-bandwidth-friendly query behavior where it does not alter results.
- Add consistent client error/loading/empty states and offline/network recovery signals.
- Validate web at phone, tablet, and desktop sizes; build and lint the web app; verify deep-link refreshes, auth redirects, uploads, media playback, support persistence, notifications, and share/copy fallbacks.
- Finish Capacitor configuration with the approved hot-reload URL for development and provide the exact Android/iOS sync and run steps after native-capability edits.

## Technical constraints
- No replacement backend, database, authentication provider, payment provider, storage system, or streaming provider.
- Do not edit generated integration files, environment files, auth/storage schemas, or project-level backend config unless required by the Capacitor setup.
- Keep browser push service worker behavior separate from any future native notification implementation.
- Keep all private keys server-side; use existing Lovable Cloud functions and secrets.
- Use semantic design tokens and existing UI components; no parallel mobile-only product redesign.

## Main implementation areas
- `package.json`, Capacitor config, `src/lib/` runtime/capability/navigation modules, `src/App.tsx`, auth context/pages, app shell/navigation components, upload/media hooks/components, notification adapters, and selected route pages.
- Add only the minimum native platform metadata/configuration and association placeholders needed for a future Android/iOS build.
