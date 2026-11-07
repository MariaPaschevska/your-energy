// Home page orchestration (owner: yuliialiubenka, integration).
// Routing and view switching only. Each task's UI lives in its component:
//   05 category-filters, category-list, category-card  (IraIvanova)
//   06 exercise-search, exercise-list, exercise-card    (yuliialiubenka)
//   07 pagination + services/pagination.ts              (vitos2802)
import { createCatalogRequests } from '../../services/pagination';
import {
  buildCategoryHash,
  buildFilterHash,
  toUrlSlug,
} from '../../services/routes';
import {
  DEFAULT_FILTER,
  FILTER_TYPES,
  initCategoryFilters,
  setActiveCategoryFilter,
  type FilterType,
} from '../../components/category-filters/category-filters';
import {
  clearCategoryList,
  hasCategories,
  renderCategoryList,
  setCategoryListVisible,
} from '../../components/category-list/category-list';
import {
  clearExerciseList,
  renderExerciseList,
  setExerciseListTitle,
  setExerciseListVisible,
} from '../../components/exercise-list/exercise-list';
import {
  initExerciseSearch,
  setExerciseSearchKeyword,
  setExerciseSearchVisible,
} from '../../components/exercise-search/exercise-search';
import { renderPagination } from '../../components/pagination/pagination';

interface Route {
  filter: FilterType;
  category: string | null;
  keyword: string;
}

function initHomePage(): void {
  const root = document.querySelector<HTMLElement>('[data-page="/"]');
  if (!root) throw new Error('Home page is missing.');

  const query = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Home page is missing ${selector}.`);
    }
    return element;
  };

  const catalogTitle = query<HTMLElement>('[data-exercises-title]');
  const back = query<HTMLAnchorElement>('[data-breadcrumb-home]');
  const breadcrumbs = query<HTMLElement>('[data-breadcrumbs]');
  const breadcrumbCurrent = query<HTMLElement>('[data-breadcrumb-current]');
  const error = query<HTMLElement>('[data-home-error]');
  const errorText = query<HTMLElement>('[data-home-error-text]');
  const retry = query<HTMLButtonElement>('[data-home-retry]');
  const filtersPagination = query<HTMLElement>(
    '[data-home-filters-pagination]'
  );
  const exercisesPagination = query<HTMLElement>(
    '[data-home-exercises-pagination]'
  );
  const catalogSection = query<HTMLElement>('.home-page__exercises-section');
  let retrySource: 'filters' | 'exercises' = 'filters';

  // After a page change, bring the top of the catalog back into view:
  // the pagination sits below the list, so new results load off-screen.
  const scrollToCatalog = (): void => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    catalogSection.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const catalog = createCatalogRequests(
    response => {
      error.hidden = true;
      renderCategoryList(response.results);
      renderPagination(
        filtersPagination,
        response.page,
        response.totalPages,
        page => {
          catalog.changeFiltersPage(page);
          scrollToCatalog();
        }
      );
    },
    response => {
      error.hidden = true;
      renderExerciseList(response.results);
      renderPagination(
        exercisesPagination,
        response.page,
        response.totalPages,
        page => {
          catalog.changeExercisesPage(page);
          scrollToCatalog();
        }
      );
    },
    (...[, source]) => {
      if (source === 'filters') {
        clearCategoryList();
        filtersPagination.hidden = true;
        showError('Unable to load categories. Please try again.', source);
      } else {
        clearExerciseList();
        exercisesPagination.hidden = true;
        showError('Unable to load exercises. Please try again.', source);
      }
    }
  );

  function showError(message: string, source: 'filters' | 'exercises'): void {
    errorText.textContent = message;
    retry.hidden = false;
    retrySource = source;
    error.hidden = false;
  }

  retry.addEventListener('click', () => {
    error.hidden = true;
    if (retrySource === 'filters') {
      void catalog.loadFilters();
    } else {
      void catalog.loadExercises();
    }
  });

  function showCategoriesView(route: Route): void {
    catalog.cancelExercises();
    const filterChanged =
      route.filter !== catalog.state.filter ||
      catalog.state.filters.totalPages === 0 ||
      catalog.state.filtersError;

    setActiveCategoryFilter(route.filter);
    catalogTitle.hidden = false;
    breadcrumbs.hidden = true;
    setExerciseSearchVisible(false);
    setExerciseListVisible(false);
    exercisesPagination.hidden = true;
    setCategoryListVisible(true);
    error.hidden = true;

    if (filterChanged) {
      clearCategoryList();
      filtersPagination.hidden = true;
      catalog.changeFilter(route.filter);
    } else {
      // Coming back from a category: keep the already rendered page.
      catalog.state.category = '';
      filtersPagination.hidden = catalog.state.filters.totalPages <= 1;
      if (!hasCategories()) renderCategoryList([]);
    }
  }

  function showExercisesView(route: Route & { category: string }): void {
    catalog.cancelFilters();
    setActiveCategoryFilter(route.filter);
    back.href = buildFilterHash(route.filter);
    setExerciseListTitle(route.category);
    breadcrumbCurrent.textContent = capitalizeFirstLetter(route.category);
    catalogTitle.hidden = true;
    breadcrumbs.hidden = false;
    setExerciseSearchVisible(true);
    setCategoryListVisible(false);
    filtersPagination.hidden = true;
    setExerciseListVisible(true);
    clearExerciseList();
    exercisesPagination.hidden = true;
    error.hidden = true;
    setExerciseSearchKeyword(route.keyword);

    if (catalog.state.filter !== route.filter) {
      // Keep the category list in sync for the breadcrumb "back" step.
      catalog.state.filter = route.filter;
      catalog.state.filters.page = 1;
      catalog.state.filters.totalPages = 0;
      clearCategoryList();
    }
    catalog.state.category = route.category;
    catalog.state.keyword = route.keyword;
    catalog.changeExercisesPage(1);
    scrollToCatalog();
  }

  function render(): void {
    const hash = window.location.hash;
    if (hash === '' || hash === '#' || hash === '#/') {
      // Home always starts with the default filter.
      window.history.replaceState(null, '', buildFilterHash(DEFAULT_FILTER));
      render();
      return;
    }

    const route = parseRoute(hash);
    if (!route) {
      // Another page (favorites): ignore late catalog responses.
      catalog.cancelExercises();
      catalog.cancelFilters();
      if (hash.startsWith('#/category')) {
        window.history.replaceState(null, '', buildFilterHash(DEFAULT_FILTER));
        render();
      }
      return;
    }

    if (route.category) {
      showExercisesView({ ...route, category: route.category });
    } else {
      showCategoriesView(route);
    }
  }

  initCategoryFilters(filter => {
    window.location.hash = buildFilterHash(filter);
  });

  initExerciseSearch(keyword => {
    const route = parseRoute(window.location.hash);
    if (!route?.category) return;
    const next = buildCategoryHash(route.filter, route.category, keyword);
    if (next === window.location.hash) {
      // Same query submitted again: reload the first page.
      catalog.changeKeyword(keyword);
    } else {
      window.location.hash = next;
    }
  });

  window.addEventListener('hashchange', render);

  render();
}

function parseRoute(hash: string): Route | null {
  const match = hash.match(/^#\/category\/([^/?]+)(?:\/([^?]+))?(?:\?(.*))?$/);
  if (!match) return null;
  const filter = FILTER_TYPES.find(type => toUrlSlug(type) === match[1]);
  if (!filter) return null;

  let category: string | null = null;
  if (match[2]) {
    try {
      category = decodeURIComponent(match[2]).trim() || null;
    } catch {
      return null;
    }
  }

  return {
    filter,
    category,
    keyword: new URLSearchParams(match[3] ?? '').get('keyword') ?? '',
  };
}

function capitalizeFirstLetter(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

initHomePage();
