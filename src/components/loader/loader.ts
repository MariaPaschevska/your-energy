import { onPendingRequestsChange } from '../../services/api';

const SHOW_DELAY_MS = 200;

export function initLoader(): void {
  const loader = document.querySelector<HTMLElement>('[data-loader]');
  const status = document.querySelector<HTMLElement>('[data-loader-status]');
  if (!loader || !status) return;

  let showTimer: ReturnType<typeof window.setTimeout> | undefined;

  onPendingRequestsChange(pending => {
    if (pending === 0) {
      window.clearTimeout(showTimer);
      showTimer = undefined;
      loader.hidden = true;
      status.textContent = '';
      return;
    }

    if (!loader.hidden || showTimer !== undefined) return;

    showTimer = window.setTimeout(() => {
      showTimer = undefined;
      loader.hidden = false;
      status.textContent = 'Loading…';
    }, SHOW_DELAY_MS);
  });
}
