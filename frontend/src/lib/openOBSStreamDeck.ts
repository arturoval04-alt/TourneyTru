'use client';

const OBS_DECK_WINDOW_NAME = 'obs-stream-deck';
const OBS_DECK_FEATURES = 'width=380,height=820,resizable=yes,scrollbars=yes';

export function openOBSStreamDeck(gameId?: string | null) {
    if (typeof window === 'undefined') return;

    const deckUrl = gameId ? `/obs-deck?gameId=${encodeURIComponent(gameId)}` : '/obs-deck';
    const deckWindow = window.open(deckUrl, OBS_DECK_WINDOW_NAME, OBS_DECK_FEATURES);
    if (!deckWindow) return;

    try {
        deckWindow.focus();
    } catch {
        // ignore focus failures
    }
}
