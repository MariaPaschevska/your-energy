# Your Energy

Your Energy is a team fitness web app built with Vite and TypeScript. Browse
exercises, view exercise details, and save favorites in your browser. The app
uses native browser APIs.

[Live website](https://diagnosel.github.io/your-energy/) |
[Trello board](https://trello.com/b/ZdE2DJGh/your-energy-team-project)

The static-first layout follows
[vanilla-app-template](https://github.com/yuliialiubenka/vanilla-app-template):
HTML is composed with build-time `<load>` includes, CSS is collected in one
stylesheet, and TypeScript only adds behavior to existing elements.

[Figma design](https://www.figma.com/design/xWKOAKNSpTwXbTEsDl2e5M/YourEnergy--Copy-?node-id=2-186)

## Features

- Exercise categories, filters, keyword search, and server pagination.
- Exercise details with a GIF when available, rating, description, and a
  favorites button. Failed requests show an error and a retry button.
- Favorites stored in localStorage and available after a page reload.
- A daily quote loaded from the API and cached locally.
- A mobile navigation menu and an email subscription form.
- A back to top button on Home and Favorites, including the desktop Favorites
  scroll area. It appears after scrolling more than 300px.
- A global loader for API requests. It waits 200ms before appearing, stays
  visible until all requests finish, and respects reduced motion.

The optional form for submitting an exercise rating is not implemented.

## Setup

Use Node.js 22.13 or later. If you use nvm, run `nvm use` first.

```sh
npm ci
npm run dev
```

## Commands

| Command             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `npm run build`     | Create the production build                     |
| `npm run preview`   | Preview the production build                    |
| `npm run format`    | Format files with Prettier                      |
| `npm run lint`      | Check JavaScript and TypeScript                 |
| `npm run typecheck` | Check TypeScript types                          |
| `npm run lint:fix`  | Apply automatic lint fixes                      |
| `npm test`          | Check assets, static HTML, and folder structure |
| `npm run check`     | Check formatting, lint, types, tests, and build |

## Shared code

```text
src/
  index.html              HTML entry point with build-time includes
  main.ts                 Fonts and behavior initialization
  components/             One folder per UI block (see Task ownership)
    app-shell/            Header and page navigation
    button/               Shared button markup and styles
    icon/                 Shared icon markup and styles
    search-field/         Search input and clear-button behavior
  pages/
    favorites-page/       Favorites page markup, styles, and behavior
    home-page/            Home layout and routing between components
  images/                 Named image/icon exports and source files
  services/
    api.ts                fetchJson, ApiError, API_BASE_URL
    *-api.ts              Endpoints grouped by task
    types.ts              API data shapes
    routes.ts             Home hash routes
  styles/
    index.css             CSS entry point, imports, and global styles
    tokens.css            Colors, typography, spacing, responsive sizes
    design-system.css     Shared themes, surfaces, and utilities
```

Keep each page and component's TypeScript, HTML, and CSS together in its own
folder. Vite's root is `src`; production files go to `dist`. Include HTML
partials using paths relative to `src` (without a leading `./`), including
inside other partials:

```html
<load src="pages/home-page/home-page.html" />
<load
  src="components/button/button.html"
  type="submit"
  variant="solid"
  label="Search"
/>
```

The include plugin expands these tags before the browser receives the HTML.
Static arguments in partials use `{=$label}` syntax. For `icon`, provide
`src-url` and `label` (use an empty label for decorative icons). For
`search-field`, provide a unique `id`, `label`, and `placeholder`.

Add component/page CSS imports to `src/styles/index.css`. TypeScript should
attach event listeners to existing markup, not import HTML as strings or build
the app with DOM factories. Components and pages without custom behavior keep an
empty TypeScript module (`export {}`), ready for future interactions.
`initSearchFields` binds clear buttons to static search fields; it emits a
native `input` event and restores focus when clearing.

Both pages exist in the delivered HTML. A small hash-change handler toggles
their `hidden` attributes and the navigation's `aria-current`; it never rebuilds
the shell or page content. The Home page is visible without JavaScript. Existing
`#/` and `#/favorites` links (including direct links, refreshes, and browser
back/forward) remain supported. Unknown hashes show Home.

Keep global rules, design tokens, and reusable utilities shared; component and
page styles belong beside their HTML and TypeScript files. Use BEM-style CSS
names and use the design breakpoints: mobile from 320px (375px frame), tablet
from 768px, desktop from 1440px. Photos are full-resolution sources; resize them
for delivery when implementing screens. SVGs keep their original colors and
dimensions.

Set `type="button"` for non-submit buttons and `type="submit"` for form
submission. Give icon-only buttons accessible names. Handle and display errors
from `fetchJson`.

## Commits

Hooks install with `npm ci`; run `npm run prepare` if they need reinstalling.
Pre-commit checks staged formatting and lint without rewriting files.

Use Conventional Commits with a title of at most 100 characters:

```text
feat(header): add mobile menu
fix: correct favorites storage
docs: explain local setup
```

Run `npm run check` before opening a PR. GitHub Actions runs the same checks.

## Deployment

GitHub Pages is enabled with GitHub Actions as the source. Pushes to `main`
deploy through the Pages workflow.

The app uses hash routes and the `/your-energy/` base path. Import assets from
`src/images` in HTML or use the named exports in TypeScript when needed. Public
files remain in the top-level `public` folder: use `%BASE_URL%` in HTML and
`import.meta.env.BASE_URL` in TypeScript for their URLs.

## Task ownership

Each task has its own files. Work only inside your task's files so pull requests
don't conflict, and ask the file owner to review changes in their files.

| Task                               | Owner           | Files                                                                                    |
| ---------------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| 01 Daily quote                     | krmelnyk        | `components/daily-quote/`, `services/quote-api.ts`                                       |
| 03 Header, navigation, mobile menu | gornostay25     | `components/app-shell/`, `components/social-links/`                                      |
| 04 Hero, static content, images    | slipkoliudmyla  | `components/hero/`, `components/daily-norm/`, `images/photos/`                           |
| 05 Category filters and cards      | IraIvanova      | `components/category-filters/`, `components/category-list/`, `components/category-card/` |
| 06 Exercise list, cards, search    | yuliialiubenka  | `components/exercise-list/`, `components/exercise-card/`, `components/exercise-search/`  |
| 07 Server pagination, state        | vitos2802       | `components/pagination/`, `services/pagination.ts`                                       |
| 08 Exercise details modal          | MariaPaschevska | `components/exercise-modal/` (optional rating: `patchExerciseRating` ready in API)       |
| 09 Favorites page, localStorage    | yuliialiubenka  | `pages/favorites-page/`, `services/favorites.ts`                                         |
| 10 Footer and email subscription   | MLazoryk        | `components/footer/`, `services/subscription-api.ts`                                     |
| 11 Back to top button and loader   | diagnosel       | `components/scroll-up/`, `components/loader/`                                            |

All paths are relative to `src/`. The components are included in the page, their
styles are imported in `styles/index.css`, and their behavior is initialized
through `main.ts`. Keep changes inside each component's own HTML, CSS, and
TypeScript files where possible.

### Shared files

These files connect the tasks. Change them only together with the integration
owner (yuliialiubenka), in a separate small pull request:

- `main.ts`, `styles/index.css`, `index.html`,
  `components/app-shell/app-shell.html`
- `pages/home-page/`: layout and hash routing that calls the task components
- `services/api.ts`: `fetchJson`, `ApiError`, `API_BASE_URL`, request counter
- `services/types.ts`, `services/routes.ts`, `services/exercises-api.ts`
- `images/index.ts`: add new images as new lines next to related ones

### Component contracts

Home calls each task component through exported functions, for example
`renderCategoryList(categories)`, `renderExerciseList(exercises)`,
`renderPagination(container, page, totalPages, onChange)` and
`initExerciseSearch(onSubmit)`. You can change everything inside your component,
but keep the names and signatures of these exports and the `data-*` attributes
they rely on. If a contract has to change, agree on it with the integration
owner first.

Call the API through the `services/*-api.ts` functions. They build absolute URLs
and call `fetchJson`, which reports errors as `ApiError` and drives the loader.

## Team workflow

Clone this repository, install dependencies, and create a branch for your task.
Open a pull request into `main` when your work is ready. Run `npm run check`
before you open the pull request. Ask a teammate to review it before merging.

Use lowercase English names for files and folders. Separate words with hyphens,
as in `home-page.ts`. Use camelCase for variables and functions, PascalCase for
classes, and UPPER_SNAKE_CASE for fixed shared constants. Tests check file and
folder names. ESLint rejects `console` calls and `debugger` statements.

## Before final submission

The app includes responsive styles for mobile, tablet, and desktop,
`modern-normalize`, DM Sans, a favicon, and static assets in `src/images`.

Before final submission:

- Review the completed features against the requirements and Figma design.
- Optimize images for screen size and retina displays, and check loading.
- Validate the completed HTML and CSS.
- Reach at least 90 in every PageSpeed category.
- Get the mentor's code review and check the live GitHub Pages site.
- Remove completed work branches before submission.

## Sources

The project base was prepared by Andrii Makarov in
[fp-group-1-energy](https://github.com/makandriival/fp-group-1-energy). This
setup uses
[source commit 9c8d7a1](https://github.com/makandriival/fp-group-1-energy/commit/9c8d7a1a518985d6dedf911ef822a4713b71a730).
The HTML layout follows
[vanilla-app-template](https://github.com/yuliialiubenka/vanilla-app-template).
