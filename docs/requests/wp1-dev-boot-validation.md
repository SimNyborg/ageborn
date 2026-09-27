# WP1 → WP11: validate content at dev boot

**From:** WP1 (content). **To:** WP11 (`src/app/boot.ts` or `main.tsx`). **Status:** open. **Priority:** low.

## Request

DESIGN B4: "`schema.ts` (Valibot) runs in tests and in dev boot." In dev builds only, after boot:

```ts
if (import.meta.env.DEV) {
  void Promise.all([import('@/content'), import('@/content/raw'), import('@/content/schema')]).then(
    ([{ content }, { raw }, { validateContent, validateRaw }]) => {
      for (const i of [...validateRaw(raw), ...validateContent(content)]) {
        console.error(`[content] ${i.path}: ${i.message}`);
      }
    },
  );
}
```

The dynamic import keeps Valibot and the schema out of the production bundle (`src/content/index.ts`
does not import `schema.ts`). The dev page `?dev=1#content` shows the same result on screen.
