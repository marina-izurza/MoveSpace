# Email templates

Supabase's auth emails are fully editable, so these carry the app's own branding instead of
the default plain-text ones.

## Installing

They are **not** applied by deploying this repo — Supabase stores them server-side. Paste
each file into the dashboard:

**Authentication → Emails → Templates**

| File | Template |
|---|---|
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset password |

Keep `{{ .ConfirmationURL }}` intact: Supabase substitutes it. Other variables available are
`{{ .Email }}`, `{{ .Token }}`, `{{ .TokenHash }}` and `{{ .SiteURL }}`.

## Why the markup looks dated

Tables and inline styles, not flexbox and a `<style>` block. Gmail strips `<style>` from the
head, Outlook renders through Word, and neither handles modern layout. The logo is a PNG
served from the deployed app rather than the SVG favicon, because Gmail does not render SVG
in emails.

## Before relying on this in production

The built-in SMTP is meant for development: it is rate limited to a handful of messages per
hour and sends from a shared Supabase address, which hurts deliverability. For real signups,
configure custom SMTP under **Project Settings → Authentication → SMTP Settings** with a
provider such as Resend, Postmark or SendGrid, and send from your own domain.

## Language

The copy is Spanish. Supabase serves one template per project — it cannot pick a language per
recipient — so if the app's audience becomes mostly non-Spanish, the pragmatic options are to
switch these to English or to send both languages in the same body.
