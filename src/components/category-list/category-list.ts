// Task 05 — Category list (owner: IraIvanova).
// Contract used by pages/home-page: keep these exports and signatures.
import type { Filter } from '../../services/types';
import {
  clearCategoryImageLoads,
  createCategoryCard,
} from '../category-card/category-card';

function getElements(): {
  root: HTMLElement;
  grid: HTMLElement;
  empty: HTMLElement;
  template: HTMLTemplateElement;
} {
  const root = document.querySelector<HTMLElement>('[data-category-list]');
  const grid = root?.querySelector<HTMLElement>('[data-category-list-grid]');
  const empty = root?.querySelector<HTMLElement>('[data-category-list-empty]');
  const template = root?.querySelector<HTMLTemplateElement>(
    '[data-category-template]'
  );
  if (!root || !grid || !empty || !template) {
    throw new Error('Category list is missing its markup.');
  }
  return { root, grid, empty, template };
}

/** Replaces the cards; shows the empty message when there are none. */
export function renderCategoryList(categories: Filter[]): void {
  const { grid, empty, template } = getElements();
  clearCategoryImageLoads();
  grid.textContent = '';
  for (const category of categories) {
    grid.append(createCategoryCard(template, category));
  }
  empty.hidden = categories.length !== 0;
  grid.hidden = categories.length === 0;
}

export function clearCategoryList(): void {
  const { grid, empty } = getElements();
  clearCategoryImageLoads();
  grid.textContent = '';
  grid.hidden = false;
  empty.hidden = true;
}

export function hasCategories(): boolean {
  return getElements().grid.childElementCount > 0;
}

export function setCategoryListVisible(visible: boolean): void {
  getElements().root.hidden = !visible;
}
