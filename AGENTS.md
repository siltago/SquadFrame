# SquadSystem repository guidance

- Keep the Next.js product under `sgi/`; desktop applications belong under `apps/`.
- SquadEngineer is a Windows desktop product. Do not add a Next.js route for it.
- Keep domain contracts in `SquadEngineer.Core` and local adapters in `SquadEngineer.Infrastructure`.
- Do not add credentials, edit existing Supabase migrations, or connect SquadEngineer to cloud services without an explicit task.
- Preserve the AutoCAD plugin's local revision format and storage compatibility.
- Do not commit generated `bin/`, `obj/`, `.vs/`, or packaged AutoCAD artifacts.

