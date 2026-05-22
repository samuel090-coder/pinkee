
## 1. Forgot Password

- Add "Forgot password?" link on `src/pages/Auth.tsx` login form.
- Inline form calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- Set up Lovable auth email templates (branded, Pinkee pink) so the reset email comes from the project.
- New page `src/pages/ResetPassword.tsx` (public route in `App.tsx`):
  - Detects `type=recovery` in URL hash.
  - Form with new password + confirm, calls `supabase.auth.updateUser({ password })`.
  - On success → redirect to `/`.

## 2. Welcome Back screen

Behavior: combination of "remember last device user" + "email-first lookup" fallback.

- On successful login, store `{ user_id, email, display_name, avatar_url }` in `localStorage` under `pinkee:lastUser`.
- `Auth.tsx` boot logic:
  - If `lastUser` exists → render **Welcome Back** card: avatar, display name, `@username` tag, password field, big **"Login"** CTA, plus "Not you? Use another account" link that clears the cache and shows the normal form.
  - If no cached user → show normal email input. After user types email and blurs/submits, query `profiles` by joining via a tiny edge function (or just call `profiles` directly using a publicly readable `email` lookup → we'll add a SECURITY DEFINER RPC `get_public_profile_by_email(email)` returning only `display_name`, `avatar_url`, `username` so we don't leak full rows). Render the same Welcome Back card with password field.
- After login the user is taken directly to `/` (dashboard), Facebook-style.

## 3. AI Support Chat

### Database (migration)

- `support_conversations` — one row per user (`user_id` unique, `last_message_at`, `unread_admin`, `unread_user`).
- `support_messages` — `conversation_id`, `sender` (`user` | `ai` | `admin`), `content`, `image_url`, `created_at`, `is_ai_generated`.
- `support_settings` — single row: `ai_enabled` (bool). Default `true`. Only admins can update.
- RLS:
  - User can `SELECT/INSERT` their own conversation + messages.
  - Moderators/admins can read/write all.
- New storage bucket `support-attachments` (private), with policies letting a user upload to their own folder and read attachments tied to their own conversation; mods read all.
- Realtime enabled on `support_messages` and `support_conversations`.

### Edge function `support-ai`

- Auth-gated. Input: `{ conversation_id, user_message, image_url? }`.
- Reads `support_settings.ai_enabled` → if **off**, just stores the user message and returns (no AI reply; waits for admin).
- If **on**, builds context by querying for the calling user:
  - `profiles` (name, joined, channel info)
  - `wallets` + last 5 `wallet_transactions`
  - `creator_earnings` + `artist_earnings` + pending `withdrawal_requests` / `creator_withdrawals`
  - last 10 uploaded `videos`, last 10 `watch_history`, last 10 `video_likes`
  - prior `support_messages` (last 20) for thread continuity
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview` default, multimodal so images work). Vision when `image_url` provided.
- System prompt: warm, human Pinkee support agent; never reveal it's AI unless asked; can refer to user's real data; can request more info; can return an `image_url` field if it generated an image (uses `google/gemini-2.5-flash-image` via a follow-up call when the model decides to send an image — gated by a tool-call schema).
- Inserts the assistant message with `sender = 'ai'`.

### Edge function `support-polish`

- Admin-only (checks `is_moderator`).
- Input: `{ draft }`. Calls Lovable AI to rewrite into intensive, official, grammatically polished English while preserving meaning. Returns `{ polished }`.
- Admin UI calls this on send to replace draft text with polished version before insert.

### UI

- New `src/contexts/SupportContext.tsx` — manages conversation id, messages, realtime subscription, unread count. Lives at the App level so chat state survives navigation (no refresh on close).
- `src/components/support/SupportLauncher.tsx` — round floating button, bottom-right, fixed, sits ~16px above the mobile bottom nav (margin-bottom calc'd per `lg:hidden` breakpoint). Customer-service headset icon. Unread dot. Mounted in `MainLayout`.
  - Hidden on `/shorts`, `/watch/*`, `/movie/*`, `/tv/*` detail/player pages.
  - Hidden when not signed in.
- `src/components/support/SupportChat.tsx` — slide-up sheet/dialog. Message list, input with image upload (uses `support-attachments` bucket), typing dots while waiting for AI. Closing it only hides the sheet — provider keeps state, messages aren't refetched.
- Admin: new **Support** tab in `src/pages/Admin.tsx` (`src/components/admin/SupportInbox.tsx`):
  - Left: list of conversations sorted by `last_message_at`, unread badges.
  - Right: thread view, same message bubbles, image previews.
  - Toggle at top: **AI auto-reply** (writes to `support_settings.ai_enabled`).
  - Compose box: when admin hits Send, call `support-polish` first → preview polished text in a confirm step → send as `sender = 'admin'`.

### Notifications

- When admin replies and user isn't viewing the chat, insert a `user_notifications` row + push notification ("New reply from Pinkee Support").
- When user sends a message and AI is off, insert a `user_notifications` row to admins (or surface count in Admin sidebar).

## Technical notes

- Files touched/added:
  - Auth: `src/pages/Auth.tsx`, new `src/pages/ResetPassword.tsx`, `src/App.tsx` route, `src/components/auth/WelcomeBack.tsx`.
  - Email: scaffold auth email templates + branding (pink palette).
  - Support: `src/contexts/SupportContext.tsx`, `src/components/support/SupportLauncher.tsx`, `src/components/support/SupportChat.tsx`, `src/components/admin/SupportInbox.tsx`, `src/pages/Admin.tsx` (add tab), `src/components/layout/MainLayout.tsx` (mount launcher + provider).
  - Edge functions: `supabase/functions/support-ai/index.ts`, `supabase/functions/support-polish/index.ts`.
  - Migration: tables, RLS, storage bucket + policies, realtime publication, `get_public_profile_by_email` RPC, seed `support_settings` row.
- Uses existing `LOVABLE_API_KEY` (no new secrets).
- Existing `BottomNav` z-index is 60; launcher uses z-50 with bottom offset so it never overlaps the create button.
