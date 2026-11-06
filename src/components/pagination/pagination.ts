// Task 07 — Server pagination (owner: vitos2802).
// Renders page buttons into a <nav class="pagination"> container.
// Request state lives in services/pagination.ts (same owner).
import { icons } from '../../images';

export function renderPagination(
  container: HTMLElement,
  page: number,
  totalPages: number,
  onChange: (page: number) => void
): void {
  const pageTemplate = document.querySelector<HTMLTemplateElement>(
    '[data-pagination-page-template]'
  );
  const arrowTemplate = document.querySelector<HTMLTemplateElement>(
    '[data-pagination-arrow-template]'
  );
  const ellipsisTemplate = document.querySelector<HTMLTemplateElement>(
    '[data-pagination-ellipsis-template]'
  );
  if (!pageTemplate || !arrowTemplate || !ellipsisTemplate) {
    throw new Error('Pagination templates are missing.');
  }
  container.textContent = '';
  container.hidden = totalPages <= 1;
  if (totalPages <= 1) return;

  const appendPage = (value: number): void => {
    const button = pageTemplate.content.firstElementChild?.cloneNode(
      true
    ) as HTMLButtonElement | null;
    if (!button) throw new Error('Pagination page template is empty.');
    button.type = 'button';
    button.textContent = String(value);
    button.classList.toggle('is-active', value === page);
    button.setAttribute('aria-label', `Page ${value}`);
    if (value === page) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.addEventListener('click', () => onChange(value));
    }
    container.append(button);
  };

  // Sprites from the design (68x32, two 32px icons each):
  //   pagination-next.svg      active (dark):  [ > ][ >> ]
  //   pagination-previous.svg  disabled (grey): [ << ][ < ]
  // Active arrows use the dark sprite, disabled ones the grey sprite;
  // the opposite direction is mirrored with CSS.
  const appendArrow = (
    label: string,
    kind: 'single' | 'double',
    direction: 'back' | 'forward',
    disabled: boolean,
    nextPage: number
  ): void => {
    const button = arrowTemplate.content.firstElementChild?.cloneNode(
      true
    ) as HTMLButtonElement | null;
    if (!button) throw new Error('Pagination arrow template is empty.');
    button.type = 'button';
    button.dataset.paginationArrow = label;
    button.disabled = disabled;
    button.setAttribute('aria-label', label);
    const icon = button.querySelector<HTMLElement>('.pagination__arrow-icon');
    const image = icon?.querySelector<HTMLImageElement>('img');
    if (!icon || !image) throw new Error('Pagination arrow image is missing.');

    const onLeft = disabled ? kind === 'double' : kind === 'single';
    const mirrored = disabled ? direction === 'forward' : direction === 'back';
    icon.classList.add(onLeft ? 'is-left' : 'is-right');
    icon.classList.toggle('is-mirrored', mirrored);
    image.src = disabled ? icons.paginationPrevious : icons.paginationNext;
    image.alt = '';
    button.addEventListener('click', () => onChange(nextPage));
    container.append(button);
  };

  appendArrow('First page', 'double', 'back', page === 1, 1);
  appendArrow('Previous page', 'single', 'back', page === 1, page - 1);
  const visiblePages =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (...[, index]) => index + 1)
      : page <= 3
        ? [1, 2, 3, totalPages]
        : page >= totalPages - 2
          ? [1, totalPages - 2, totalPages - 1, totalPages]
          : [1, page, totalPages];

  visiblePages.forEach((value, index) => {
    if (index > 0 && value - visiblePages[index - 1] > 1) {
      const ellipsis = ellipsisTemplate.content.firstElementChild?.cloneNode(
        true
      ) as HTMLElement | null;
      if (!ellipsis) throw new Error('Pagination ellipsis template is empty.');
      container.append(ellipsis);
    }
    appendPage(value);
  });
  appendArrow('Next page', 'single', 'forward', page === totalPages, page + 1);
  appendArrow(
    'Last page',
    'double',
    'forward',
    page === totalPages,
    totalPages
  );
}
