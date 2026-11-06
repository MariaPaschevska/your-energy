import { getExercisesByIds } from '../../services/exercises-api';
import { createExerciseCard } from '../../components/exercise-card/exercise-card';
import { readFavoriteIds, removeFavoriteId } from '../../services/favorites';

function initFavoritesPage(): void {
  // Exercise card markup is shared with the home page, so every query is
  // scoped to the favorites page.
  const root = document.querySelector<HTMLElement>('[data-page="/favorites"]');
  if (!root) {
    throw new Error('Favorites page is missing.');
  }

  const list = root.querySelector<HTMLElement>('[data-favorites-list]');
  const empty = root.querySelector<HTMLElement>('[data-favorites-empty]');
  const error = root.querySelector<HTMLElement>('[data-favorites-error]');
  const template = root.querySelector<HTMLTemplateElement>(
    '[data-exercise-template]'
  );
  if (!list || !empty || !error || !template) {
    throw new Error('Favorites page is missing its list or empty state.');
  }

  let requestId = 0;
  let loading = false;

  const updateState = (): void => {
    const total = list.querySelectorAll('[data-exercise-card]').length;
    empty.hidden = total !== 0;
    list.hidden = total === 0;
  };

  const showError = (message: string): void => {
    list.textContent = '';
    list.hidden = true;
    empty.hidden = true;
    error.textContent = message;
    error.hidden = false;
  };

  const refreshFavoritesList = async (): Promise<void> => {
    const currentRequest = ++requestId;
    loading = false;
    error.hidden = true;

    let favoriteIds: string[];
    try {
      favoriteIds = readFavoriteIds();
    } catch {
      showError('Your favorites data is corrupted. Please try again.');
      return;
    }

    if (favoriteIds.length === 0) {
      list.textContent = '';
      updateState();
      return;
    }

    loading = true;
    try {
      const exercises = await getExercisesByIds(favoriteIds);
      // A newer refresh started while this one was in flight.
      if (currentRequest !== requestId) return;

      list.textContent = '';
      for (const exercise of exercises) {
        list.append(createExerciseCard(template, exercise, true));
      }
      updateState();
    } catch {
      if (currentRequest !== requestId) return;
      showError("We couldn't load your favorites. Please try again later.");
    } finally {
      if (currentRequest === requestId) loading = false;
    }
  };

  // One delegated listener instead of re-binding every button on refresh.
  list.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-favorite-remove]'
    );
    if (!button) return;

    const card = button.closest<HTMLElement>('[data-exercise-card]');
    const id = card?.dataset.exerciseId;
    if (!card || !id) return;

    try {
      removeFavoriteId(id);
    } catch {
      showError('Your favorites data is corrupted. Please try again.');
      return;
    }
    card.remove();
    updateState();
    if (loading) void refreshFavoritesList();
  });

  window.addEventListener('favorites-updated', () => {
    void refreshFavoritesList();
  });

  void refreshFavoritesList();
}

initFavoritesPage();
