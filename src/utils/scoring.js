// Calculate score based on difficulty and time remaining
export function calculateScore(difficulty, timeRemaining, totalTime, isCorrect) {
  if (!isCorrect) {
    return 0;
  }

  if (timeRemaining <= 0) return 0;

  let max = 1000;
  if (difficulty === 'medium') max = 1250;
  if (difficulty === 'hard') max = 1500;

  const remainingPercentage = timeRemaining / totalTime;
  
  const score = Math.max(
    Math.round(max * remainingPercentage),
    Math.round(max * 0.1) 
  );

  return score;
}
