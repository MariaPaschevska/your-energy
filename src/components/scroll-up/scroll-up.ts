const SCROLL_THRESHOLD = 300;

export function initScrollUp(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-scroll-up]');
  if (!button) return;

  const favorites = document.querySelector<HTMLElement>(
    '[data-page="/favorites"]'
  );
  const favoritesContent = favorites?.querySelector<HTMLElement>(
    '.favorites-page__content'
  );

  function getScrollTarget(): Window | HTMLElement {
    if (
      favorites &&
      !favorites.hidden &&
      favoritesContent &&
      /auto|scroll/.test(getComputedStyle(favoritesContent).overflowY)
    ) {
      return favoritesContent;
    }
    return window;
  }

  const updateVisibility = (): void => {
    const target = getScrollTarget();
    const scrollTop =
      target instanceof Window ? target.scrollY : target.scrollTop;
    button.hidden = scrollTop <= SCROLL_THRESHOLD;
  };

  button.addEventListener('click', () => {
    const heading = document.querySelector<HTMLElement>(
      '[data-page]:not([hidden]) h1'
    );
    if (heading) {
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
        heading.addEventListener(
          'blur',
          () => heading.removeAttribute('tabindex'),
          {
            once: true,
          }
        );
      }
      heading.focus({ preventScroll: true });
    }

    getScrollTarget().scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  });

  document.addEventListener('scroll', updateVisibility, {
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', updateVisibility);
  window.addEventListener('hashchange', updateVisibility);
  updateVisibility();
}
