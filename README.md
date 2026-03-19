# Canvas API Permissions Planner

Find the Canvas LMS role permissions required for any set of API endpoints. A free tool for Canvas integration developers.

**Live site:** [canvas-permissions.alltheducks.com](https://canvas-permissions.alltheducks.com/)

## Features

- Look up permissions for ~300 Canvas REST API endpoints
- Aggregates required and optional permissions across multiple endpoints
- Handles OR groups (any-one-of permission sets)
- Shareable URLs that encode your endpoint selection
- 31 locales with Canvas permission labels fetched from the official Canvas translations
- Print-friendly layout
- Dark mode
- Fully client-side — no server, no cookies, no data collection

## Local Development

**Prerequisites:** Node.js 20+ and [pnpm](https://pnpm.io/)

```sh
pnpm install
pnpm dev          # Start dev server
pnpm test         # Run tests
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm storybook    # Component library
```

## Updating Permission Data

When Canvas releases new API endpoints or changes permission requirements, the `public/data/endpoints.json` file needs to be regenerated. See [`docs/regenerate-data-prompt.md`](docs/regenerate-data-prompt.md) for the full process.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm test` and `pnpm build` to verify
5. Open a pull request

## License

[MIT](LICENSE) — Copyright (c) 2026 All the Ducks
