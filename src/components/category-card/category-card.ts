// Task 05 — Category card (owner: IraIvanova).
import type { Filter } from '../../services/types';
import { buildCategoryHash } from '../../services/routes';
import { createCategoryImageLoader } from './category-images';

const categoryImages = createCategoryImageLoader();

export function clearCategoryImageLoads(): void {
  categoryImages.clear();
}

export function createCategoryCard(
  template: HTMLTemplateElement,
  filter: Filter
): HTMLElement {
  const card = template.content.firstElementChild?.cloneNode(
    true
  ) as HTMLAnchorElement | null;
  if (!card) throw new Error('Category card template is missing.');

  const name = card.querySelector<HTMLElement>('.category-card__name');
  const filterName = card.querySelector<HTMLElement>('.category-card__filter');
  const image = card.querySelector<HTMLImageElement>('.category-card__image');
  if (!name || !filterName || !image) {
    throw new Error('Category card template is incomplete.');
  }

  card.dataset.categoryName = filter.name;
  card.dataset.categoryType = filter.filter;
  card.href = buildCategoryHash(filter.filter, filter.name);
  categoryImages.observe(image, filter.imgURL);
  image.alt = '';
  name.textContent = filter.name;
  filterName.textContent = filter.filter;
  return card;
}
