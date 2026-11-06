const SCROLL_THRESHOLD = 300;

export function initScrollUp(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-scroll-up]');
  if (!button) return;

  const favorites = document.querySelector<HTMLElement>(
    '[data-page="/favorites"]'
  );
  const favoritesScrollAreas = favorites?.querySelectorAll<HTMLElement>(
    '.favorites-page__content, .favorites-page__sidebar'
  );

  function getScrollTargets(): (Window | HTMLElement)[] {
    if (favorites && !favorites.hidden && favoritesScrollAreas) {
      const areas = [...favoritesScrollAreas].filter(area =>
        /auto|scroll/.test(getComputedStyle(area).overflowY)
      );
      if (areas.length > 0) return areas;
    }
    return [window];
  }

  const updateVisibility = (): void => {
    button.hidden = getScrollTargets().every(target => {
      const scrollTop =
        target instanceof Window ? target.scrollY : target.scrollTop;
      return scrollTop <= SCROLL_THRESHOLD;
    });
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

    for (const target of getScrollTargets()) {
      target.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }
  });

  document.addEventListener('scroll', updateVisibility, {
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', updateVisibility);
  window.addEventListener('hashchange', updateVisibility);
  updateVisibility();
}
