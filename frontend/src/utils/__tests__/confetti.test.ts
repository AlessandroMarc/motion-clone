import confetti from 'canvas-confetti';
import { fireConfetti } from '../confetti';

jest.mock('canvas-confetti', () => jest.fn());

describe('fireConfetti', () => {
  it('calls canvas-confetti with the expected params', () => {
    fireConfetti();

    expect(confetti).toHaveBeenCalledTimes(1);
    expect(confetti).toHaveBeenCalledWith({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  });
});
