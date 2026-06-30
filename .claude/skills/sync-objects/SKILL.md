---
name: sync-objects
description: Regenerate the generated domain types in packages/client/src/objects from a new gather-game-logic commit and bump the VERSION const in lockstep. Use when updating webhook object/event/capability types or pointing at a newer gather-game-logic revision.
---

# Sync generated object types

`packages/client/src/objects/{capabilities,events,presets,responses}.ts` are generated from `gather-game-logic`. `src/objects/index.ts` records the source commit in a `VERSION` const:

```ts
/** The `gather-game-logic` commit these type definitions were generated from. */
export const VERSION = "83b42349949bf0e0d9c2497d8bbbb016840b2995" as const;
```

## Rule

`VERSION` and the type files must always come from the **same commit**. A mismatch is the bug this skill exists to prevent.

## Steps

1. Get the target `gather-game-logic` commit SHA (ask if not given; default to its current `main` head).
2. Regenerate the four type files from that commit. (Use whatever generator the source repo provides — there is no generator checked into this monorepo; if the user hasn't specified one, ask how the types were last produced rather than hand-editing.)
3. Update `VERSION` in `src/objects/index.ts` to the exact same SHA.
4. If the type surface changed, re-check the public export wiring — see [add-public-export](../add-public-export/SKILL.md).
5. Run [verify](../verify/SKILL.md); fix any spec drift the new types cause.

Don't hand-edit the generated files to "fix" a type — fix it upstream and regenerate, or the next sync silently reverts it.
