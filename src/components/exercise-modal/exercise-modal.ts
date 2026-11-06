// Task 08 — Exercise details modal.
// The only permanent listener is the delegated click on "Start" buttons.
// Everything else is added on open and removed by the dialog's close event,
// which fires for all close paths (button, backdrop, Escape, navigation).
import { getExerciseById } from '../../services/exercises-api';
import {
  addFavoriteId,
  isFavoriteId,
  removeFavoriteId,
} from '../../services/favorites';
import type { Exercise } from '../../services/types';

const LOADING_MESSAGE = 'Loading exercise…';
const ERROR_MESSAGE = 'Unable to load the exercise. Please try again.';

function getModal(): HTMLDialogElement {
  const modal = document.querySelector<HTMLDialogElement>(
    '[data-exercise-modal]'
  );
  if (!modal) throw new Error('Exercise modal is missing.');
  return modal;
}

export function initExerciseModal(): void {
  const modal = getModal();

  const query = <T extends Element>(selector: string): T => {
    const element = modal.querySelector<T>(selector);
    if (!element) throw new Error(`Exercise modal is missing ${selector}.`);
    return element;
  };

  const closeButton = query<HTMLButtonElement>('[data-modal-close]');
  const status = query<HTMLElement>('[data-modal-status]');
  const statusText = query<HTMLElement>('[data-modal-status-text]');
  const retry = query<HTMLButtonElement>('[data-modal-retry]');
  const content = query<HTMLElement>('[data-modal-content]');
  const media = query<HTMLElement>('[data-modal-media]');
  const gif = query<HTMLImageElement>('[data-modal-gif]');
  const title = query<HTMLElement>('[data-modal-title]');
  const rating = query<HTMLElement>('[data-modal-rating]');
  const stars = query<HTMLElement>('[data-modal-stars]');
  const target = query<HTMLElement>('[data-modal-target]');
  const bodyPart = query<HTMLElement>('[data-modal-body-part]');
  const equipment = query<HTMLElement>('[data-modal-equipment]');
  const popularity = query<HTMLElement>('[data-modal-popularity]');
  const calories = query<HTMLElement>('[data-modal-calories]');
  const description = query<HTMLElement>('[data-modal-description]');
  const favorite = query<HTMLButtonElement>('[data-modal-favorite]');
  const favoriteLabel = query<HTMLElement>('[data-modal-favorite-label]');
  const favoriteError = query<HTMLElement>('[data-modal-favorite-error]');

  let exerciseId: string | null = null;
  // Bumped on every load and on close, so a late response is ignored.
  let requestId = 0;

  function showStatus(message: string, canRetry: boolean): void {
    content.hidden = true;
    status.hidden = false;
    statusText.textContent = message;
    retry.hidden = !canRetry;
  }

  function renderFavorite(id: string): void {
    favoriteLabel.textContent = isFavoriteId(id)
      ? 'Remove from favorites'
      : 'Add to favorites';
    favoriteError.hidden = true;
  }

  function renderGif(exercise: Exercise): void {
    media.hidden = !exercise.gifUrl;
    if (exercise.gifUrl) {
      gif.src = exercise.gifUrl;
      gif.alt = `${exercise.name} demonstration`;
    } else {
      clearGif();
    }
  }

  function clearGif(): void {
    gif.removeAttribute('src');
    gif.alt = '';
  }

  function renderExercise(exercise: Exercise): void {
    const value = exercise.rating ?? 0;

    renderGif(exercise);
    title.textContent = exercise.name;
    // The API returns values such as 4.17.
    rating.textContent = value.toFixed(1);
    stars.style.setProperty('--exercise-rating', String(value));
    target.textContent = exercise.target;
    bodyPart.textContent = exercise.bodyPart;
    equipment.textContent = exercise.equipment;
    popularity.textContent = String(exercise.popularity ?? 0);
    calories.textContent = `${exercise.burnedCalories}/3 min`;
    description.textContent = exercise.description ?? '';
    description.hidden = !exercise.description;
    renderFavorite(exercise._id);

    status.hidden = true;
    content.hidden = false;
  }

  async function loadExercise(): Promise<void> {
    if (!exerciseId) return;

    const currentRequest = ++requestId;
    showStatus(LOADING_MESSAGE, false);

    try {
      const exercise = await getExerciseById(exerciseId);
      if (currentRequest === requestId) renderExercise(exercise);
    } catch {
      if (currentRequest === requestId) showStatus(ERROR_MESSAGE, true);
    }
  }

  function closeModal(): void {
    modal.close();
  }

  function onBackdropClick(event: MouseEvent): void {
    // The panel covers the dialog box, so only the backdrop targets the dialog.
    // detail > 1: the rest of a double click on "Start" must not close it.
    if (event.target === modal && event.detail < 2) closeModal();
  }

  function onFavoriteClick(): void {
    if (!exerciseId) return;

    try {
      if (isFavoriteId(exerciseId)) {
        removeFavoriteId(exerciseId);
      } else {
        addFavoriteId(exerciseId);
      }
    } catch {
      // localStorage is full or unavailable.
      favoriteError.hidden = false;
      return;
    }

    renderFavorite(exerciseId);
    window.dispatchEvent(new Event('favorites-updated'));
  }

  function onRetryClick(): void {
    void loadExercise();
  }

  function onGifError(): void {
    media.hidden = true;
  }

  function addListeners(): void {
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', onBackdropClick);
    modal.addEventListener('close', onModalClose);
    retry.addEventListener('click', onRetryClick);
    favorite.addEventListener('click', onFavoriteClick);
    gif.addEventListener('error', onGifError);
    // Browser back/forward works while the page behind the modal is inert.
    window.addEventListener('hashchange', closeModal);
  }

  function removeListeners(): void {
    closeButton.removeEventListener('click', closeModal);
    modal.removeEventListener('click', onBackdropClick);
    modal.removeEventListener('close', onModalClose);
    retry.removeEventListener('click', onRetryClick);
    favorite.removeEventListener('click', onFavoriteClick);
    gif.removeEventListener('error', onGifError);
    window.removeEventListener('hashchange', closeModal);
  }

  function onModalClose(): void {
    removeListeners();
    requestId++;
    exerciseId = null;
    clearGif();
  }

  function openExercise(id: string): void {
    exerciseId = id;
    addListeners();
    modal.showModal();
    void loadExercise();
  }

  document.addEventListener('click', event => {
    const start = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-exercise-start]'
    );
    if (start?.dataset.exerciseId) openExercise(start.dataset.exerciseId);
  });
}
