export function createCategoryImageLoader() {
  const pendingImages = new Map<HTMLImageElement, string>();
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(
          entries => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const image = entry.target as HTMLImageElement;
              const source = pendingImages.get(image);
              if (!source) continue;
              image.src = source;
              pendingImages.delete(image);
              observer?.unobserve(image);
            }
          },
          { rootMargin: '160px 0px' }
        );

  return {
    observe(image: HTMLImageElement, source: string): void {
      if (!observer) {
        image.src = source;
        return;
      }
      pendingImages.set(image, source);
      observer.observe(image);
    },
    clear(): void {
      observer?.disconnect();
      pendingImages.clear();
    },
  };
}
