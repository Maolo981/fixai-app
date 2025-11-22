import confetti from "canvas-confetti";

export const useConfetti = () => {
  const fireConfetti = (options?: confetti.Options) => {
    const defaults: confetti.Options = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#667eea", "#764ba2", "#f093fb", "#4facfe"],
    };

    confetti({
      ...defaults,
      ...options,
    });
  };

  const fireMultipleConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: Math.random() - 0.2,
        },
        colors: ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#43e97b"],
      });
    }, 250);
  };

  const fireSideConfetti = () => {
    const end = Date.now() + 1000;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#667eea", "#764ba2", "#f093fb"],
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#667eea", "#764ba2", "#f093fb"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  return {
    fireConfetti,
    fireMultipleConfetti,
    fireSideConfetti,
  };
};
