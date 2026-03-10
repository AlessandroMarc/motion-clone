import confetti from 'canvas-confetti';

/** Fire a celebratory confetti burst — call optimistically before async work. */
export function fireConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}
