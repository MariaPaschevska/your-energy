import { getExerciseById } from '../../services/exercises-api';
import {
  addFavoriteId,
  isFavoriteId,
  removeFavoriteId,
} from '../../services/favorites';
import type { Exercise } from '../../services/types';

const LOADING_MESSAGE = 'Loading exercise…';
const ERROR_MESSAGE = 'Unable to load the exercise. Please try again.';

function getElements() {
  const modal = document.querySelector<HTMLDialogElement>(
    '[data-exercise-modal]'
  );
  if (!modal) throw new Error('Exercise modal is missing.');

  const query = <T extends Element>(selector: string): T => {
    const element = modal.querySelector<T>(selector);
    if (!element) throw new Error(`Exercise modal is missing ${selector}.`);
    return element;
  };

  return {
    modal,
    closeButton: query<HTMLButtonElement>('[data-modal-close]'),
    status: query<HTMLElement>('[data-modal-status]'),
    statusText: query<HTMLElement>('[data-modal-status-text]'),
    retry: query<HTMLButtonElement>('[data-modal-retry]'),
    content: query<HTMLElement>('[data-modal-content]'),
    media: query<HTMLElement>('[data-modal-media]'),
    gif: query<HTMLImageElement>('[data-modal-gif]'),
    title: query<HTMLElement>('[data-modal-title]'),
    rating: query<HTMLElement>('[data-modal-rating]'),
    stars: query<HTMLElement>('[data-modal-stars]'),
    target: query<HTMLElement>('[data-modal-target]'),
    bodyPart: query<HTMLElement>('[data-modal-body-part]'),
    equipment: query<HTMLElement>('[data-modal-equipment]'),
    popularity: query<HTMLElement>('[data-modal-popularity]'),
    calories: query<HTMLElement>('[data-modal-calories]'),
    description: query<HTMLElement>('[data-modal-description]'),
    favorite: query<HTMLButtonElement>('[data-modal-favorite]'),
    favoriteLabel: query<HTMLElement>('[data-modal-favorite-label]'),
    favoriteError: query<HTMLElement>('[data-modal-favorite-error]'),
  };
}

export function initExerciseModal(): void {
  const elements = getElements();
  const { modal } = elements;

  let exerciseId: string | null = null;
  let latestRequestId = 0;

  function showStatus(message: string, canRetry: boolean): void {
    elements.content.hidden = true;
    elements.status.hidden = false;
    elements.statusText.textContent = message;
    elements.retry.hidden = !canRetry;
  }

  function renderFavorite(id: string): void {
    elements.favoriteLabel.textContent = isFavoriteId(id)
      ? 'Remove from favorites'
      : 'Add to favorites';
    elements.favoriteError.hidden = true;
  }

  function renderGif(exercise: Exercise): void {
    elements.media.hidden = !exercise.gifUrl;
    if (exercise.gifUrl) {
      elements.gif.src = exercise.gifUrl;
      elements.gif.alt = `${exercise.name} demonstration`;
    } else {
      clearGif();
    }
  }

  function clearGif(): void {
    elements.gif.classList.remove('is-loaded');
    elements.gif.removeAttribute('src');
    elements.gif.alt = '';
  }

  function renderExercise(exercise: Exercise): void {
    const rating = exercise.rating ?? 0;

    renderGif(exercise);
    elements.title.textContent = exercise.name;
    elements.rating.textContent = rating.toFixed(1);
    elements.stars.style.setProperty('--exercise-rating', String(rating));
    elements.target.textContent = exercise.target;
    elements.bodyPart.textContent = exercise.bodyPart;
    elements.equipment.textContent = exercise.equipment;
    elements.popularity.textContent = String(exercise.popularity ?? 0);
    elements.calories.textContent = `${exercise.burnedCalories}/3 min`;
    elements.description.textContent = exercise.description ?? '';
    elements.description.hidden = !exercise.description;
    renderFavorite(exercise._id);

    elements.status.hidden = true;
    elements.content.hidden = false;
  }

  async function loadExercise(): Promise<void> {
    if (!exerciseId) return;

    const requestId = ++latestRequestId;
    showStatus(LOADING_MESSAGE, false);

    try {
      const exercise = await getExerciseById(exerciseId);
      if (requestId === latestRequestId) renderExercise(exercise);
    } catch {
      if (requestId === latestRequestId) showStatus(ERROR_MESSAGE, true);
    }
  }

  function closeModal(): void {
    modal.close();
  }

  function onBackdropClick(event: MouseEvent): void {
    const isBackdrop = event.target === modal;
    const isSecondClickOfDoubleClick = event.detail > 1;
    if (isBackdrop && !isSecondClickOfDoubleClick) closeModal();
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
      elements.favoriteError.hidden = false;
      return;
    }

    renderFavorite(exerciseId);
    window.dispatchEvent(new Event('favorites-updated'));
  }

  function onRetryClick(): void {
    void loadExercise();
  }

  function onGifLoad(): void {
    elements.gif.classList.add('is-loaded');
  }

  function onGifError(): void {
    elements.media.hidden = true;
  }

  function addListeners(): void {
    elements.closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', onBackdropClick);
    modal.addEventListener('close', onModalClose);
    elements.retry.addEventListener('click', onRetryClick);
    elements.favorite.addEventListener('click', onFavoriteClick);
    elements.gif.addEventListener('load', onGifLoad);
    elements.gif.addEventListener('error', onGifError);
    window.addEventListener('hashchange', closeModal);
  }

  function removeListeners(): void {
    elements.closeButton.removeEventListener('click', closeModal);
    modal.removeEventListener('click', onBackdropClick);
    modal.removeEventListener('close', onModalClose);
    elements.retry.removeEventListener('click', onRetryClick);
    elements.favorite.removeEventListener('click', onFavoriteClick);
    elements.gif.removeEventListener('load', onGifLoad);
    elements.gif.removeEventListener('error', onGifError);
    window.removeEventListener('hashchange', closeModal);
  }

  function onModalClose(): void {
    removeListeners();
    latestRequestId++;
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
