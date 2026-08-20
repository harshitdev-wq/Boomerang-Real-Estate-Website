# Contributing to Boomerang

Thanks for taking an interest in the project.

## Development flow

1. Fork the repository.
2. Create a focused branch for your change.
3. Install dependencies with `npm install`.
4. Run the project with `npm run dev`.
5. Verify the production build with `npm run build`.
6. Test the changed flow on desktop and mobile widths.
7. Open a pull request with a concise explanation of the change.

## Before opening a PR

Please check:

- No horizontal overflow was introduced.
- Buttons and navigation still work.
- Images keep their aspect ratio.
- Text does not overflow cards or containers.
- Mobile layouts remain usable.
- No unnecessary dependencies were added.
- The production build completes successfully.

## Commit style

Prefer small, descriptive commits such as:

```text
feat: add property comparison state
fix: prevent mobile card overflow
docs: improve setup instructions
refactor: simplify listing card component
```

## Scope

Boomerang is currently a portfolio/demo project. Keep contributions aligned with the product concept and avoid introducing real-world personal, financial, or property data.
