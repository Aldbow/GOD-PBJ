<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Updating Supabase data

Before touching anything about importing/refreshing procurement data — or investigating "why does paket X still show BELUM REALISASI" — read [docs/RUNBOOK-UPDATE-DATA.md](docs/RUNBOOK-UPDATE-DATA.md). The mechanism already exists (`scripts/update_from_data_update.mjs`, sources in `data/data_update/`); do not write a new import script. Always run `--dry-run` first.

Note `.env.local` is gitignored, so a fresh clone has no Supabase credentials — copy `.env.example` and fill it in before running anything.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, load the antislop skill for the task:
- Core filter, always on: `antislop`
- UI / visual: `antislop-ui`
- Copy & text: `antislop-copywriting`
- People: `antislop-human`
- Mobile / responsive: `antislop-layoutmobile`
- Code comments: `antislop-code`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
