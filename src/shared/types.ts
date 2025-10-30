import z from "zod";

export const PuzzleTypeSchema = z.enum(['math', 'science', 'puzzle']);
export type PuzzleType = z.infer<typeof PuzzleTypeSchema>;

export const MathPuzzleSchema = z.object({
  type: z.literal('math'),
  question: z.string(),
  answer: z.string(),
});

export const SciencePuzzleSchema = z.object({
  type: z.literal('science'),
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
});

export const PuzzlePuzzleSchema = z.object({
  type: z.literal('puzzle'),
  question: z.string(),
  answer: z.string(),
  hint: z.string().optional(),
});

export const PuzzleSchema = z.discriminatedUnion('type', [
  MathPuzzleSchema,
  SciencePuzzleSchema,
  PuzzlePuzzleSchema,
]);

export type Puzzle = z.infer<typeof PuzzleSchema>;

export const PuzzleResultSchema = z.object({
  id: z.number(),
  gameSessionId: z.number(),
  userId: z.string(),
  puzzleType: PuzzleTypeSchema,
  puzzleData: z.string(),
  userAnswer: z.string().nullable(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  timeTakenSeconds: z.number(),
  pointsEarned: z.number(),
  createdAt: z.string(),
});

export type PuzzleResult = z.infer<typeof PuzzleResultSchema>;

export const GameSessionSchema = z.object({
  id: z.number(),
  userId: z.string(),
  totalScore: z.number(),
  puzzlesSolved: z.number(),
  puzzlesAttempted: z.number(),
  sessionDurationSeconds: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type GameSession = z.infer<typeof GameSessionSchema>;

export const UserStatsSchema = z.object({
  id: z.number(),
  userId: z.string(),
  totalScore: z.number(),
  totalPuzzlesSolved: z.number(),
  totalPuzzlesAttempted: z.number(),
  bestSessionScore: z.number(),
  averageTimePerPuzzle: z.number(),
  mathPuzzlesSolved: z.number(),
  sciencePuzzlesSolved: z.number(),
  puzzlePuzzlesSolved: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserStats = z.infer<typeof UserStatsSchema>;

export const SubmitAnswerRequestSchema = z.object({
  gameSessionId: z.number(),
  puzzle: PuzzleSchema,
  userAnswer: z.string(),
  timeTakenSeconds: z.number(),
});

export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;
