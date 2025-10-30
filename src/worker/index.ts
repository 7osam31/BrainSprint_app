import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie } from "hono/cookie";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { 
  PuzzleType, 
  Puzzle, 
  SubmitAnswerRequestSchema, 
  GameSession, 
  UserStats
} from "@/shared/types";

interface AppEnv extends Env {
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
}

interface User {
  id: string;
  google_user_data: {
    email: string;
    given_name: string;
    family_name: string;
    picture: string;
  };
}

const app = new Hono<{ Bindings: AppEnv }>();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
}));

// Auth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Game endpoints
app.post('/api/game/start', async (c) => {
  // Try to get user, but allow guest access
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  let user: User | null = null;
  
  if (sessionToken) {
    try {
      const response = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/sessions/${sessionToken}`, {
        headers: { 'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}` }
      });
      if (response.ok) {
        user = await response.json();
      }
    } catch (error) {
      // Guest mode - no user
    }
  }
  
  if (user) {
    // Create new game session for logged-in user
    const result = await c.env.DB.prepare(`
      INSERT INTO game_sessions (user_id, total_score, puzzles_solved, puzzles_attempted, session_duration_seconds)
      VALUES (?, 0, 0, 0, 0)
    `).bind(user.id).run();

    const gameSession: GameSession = {
      id: result.meta.last_row_id as number,
      userId: user.id,
      totalScore: 0,
      puzzlesSolved: 0,
      puzzlesAttempted: 0,
      sessionDurationSeconds: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return c.json(gameSession);
  } else {
    // Guest mode - return mock session
    return c.json({
      id: 0,
      userId: 'guest',
      totalScore: 0,
      puzzlesSolved: 0,
      puzzlesAttempted: 0,
      sessionDurationSeconds: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
});

app.get('/api/game/puzzle/:type', async (c) => {
  const puzzleType = c.req.param('type') as PuzzleType;
  const score = parseInt(c.req.query('score') || '0', 10);
  const language = c.req.query('language') || 'en';
  
  const puzzle = generatePuzzle(puzzleType, score, language);
  return c.json(puzzle);
});

app.post('/api/game/submit', async (c) => {
  // Try to get user, but allow guest access
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
  let user: User | null = null;
  
  if (sessionToken) {
    try {
      const response = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/sessions/${sessionToken}`, {
        headers: { 'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}` }
      });
      if (response.ok) {
        user = await response.json();
      }
    } catch (error) {
      // Guest mode - no user
    }
  }
  
  const body = await c.req.json();
  
  const validatedData = SubmitAnswerRequestSchema.parse(body);
  const { gameSessionId, puzzle, userAnswer, timeTakenSeconds } = validatedData;

  // Check if answer is correct
  const correctAnswer = getCorrectAnswer(puzzle);
  
  // Normalize both answers to handle Arabic/English numerals
  const normalizedUserAnswer = normalizeNumbers(userAnswer.toLowerCase().trim());
  const normalizedCorrectAnswer = normalizeNumbers(correctAnswer.toLowerCase().trim());
  
  const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
  
  // Get current session score to determine difficulty
  let currentScore = 0;
  if (user && gameSessionId !== 0) {
    const session = await c.env.DB.prepare(`
      SELECT total_score FROM game_sessions WHERE id = ?
    `).bind(gameSessionId).first() as { total_score: number } | null;
    currentScore = session?.total_score || 0;
  }
  
  // Calculate points based on difficulty and speed
  let pointsEarned = 0;
  if (isCorrect) {
    const basePoints = getDifficultyMultiplier(currentScore);
    const speedBonus = Math.max(0, Math.round((30 - timeTakenSeconds) / 2));
    pointsEarned = basePoints + speedBonus;
  }

  // Only save to database if user is logged in
  if (user && gameSessionId !== 0) {
    // Save puzzle result
    await c.env.DB.prepare(`
      INSERT INTO puzzle_results 
      (game_session_id, user_id, puzzle_type, puzzle_data, user_answer, correct_answer, is_correct, time_taken_seconds, points_earned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      gameSessionId,
      user.id,
      puzzle.type,
      JSON.stringify(puzzle),
      userAnswer,
      correctAnswer,
      isCorrect ? 1 : 0,
      timeTakenSeconds,
      pointsEarned
    ).run();

    // Update game session
    await c.env.DB.prepare(`
      UPDATE game_sessions 
      SET total_score = total_score + ?, 
          puzzles_solved = puzzles_solved + ?,
          puzzles_attempted = puzzles_attempted + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(pointsEarned, isCorrect ? 1 : 0, gameSessionId).run();

    // Update or create user stats
    const mathIncrement = puzzle.type === 'math' && isCorrect ? 1 : 0;
    const scienceIncrement = puzzle.type === 'science' && isCorrect ? 1 : 0;
    const puzzleIncrement = puzzle.type === 'puzzle' && isCorrect ? 1 : 0;
    
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO user_stats 
      (user_id, total_score, total_puzzles_solved, total_puzzles_attempted, best_session_score, average_time_per_puzzle, math_puzzles_solved, science_puzzles_solved, puzzle_puzzles_solved, created_at, updated_at)
      VALUES (
        ?,
        COALESCE((SELECT total_score FROM user_stats WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT total_puzzles_solved FROM user_stats WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT total_puzzles_attempted FROM user_stats WHERE user_id = ?), 0) + 1,
        MAX(COALESCE((SELECT best_session_score FROM user_stats WHERE user_id = ?), 0), (SELECT total_score FROM game_sessions WHERE id = ?)),
        ((COALESCE((SELECT average_time_per_puzzle FROM user_stats WHERE user_id = ?), 0) * COALESCE((SELECT total_puzzles_attempted FROM user_stats WHERE user_id = ?), 0)) + ?) / (COALESCE((SELECT total_puzzles_attempted FROM user_stats WHERE user_id = ?), 0) + 1),
        COALESCE((SELECT math_puzzles_solved FROM user_stats WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT science_puzzles_solved FROM user_stats WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT puzzle_puzzles_solved FROM user_stats WHERE user_id = ?), 0) + ?,
        COALESCE((SELECT created_at FROM user_stats WHERE user_id = ?), CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP
      )
    `).bind(
      user.id, user.id, pointsEarned, user.id, isCorrect ? 1 : 0, user.id, user.id, gameSessionId, user.id, user.id, timeTakenSeconds, user.id,
      user.id, mathIncrement,
      user.id, scienceIncrement,
      user.id, puzzleIncrement,
      user.id
    ).run();
  }

  return c.json({
    isCorrect,
    correctAnswer,
    pointsEarned,
    resultId: user ? 0 : null,
  });
});

app.get('/api/game/stats', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const stats = await c.env.DB.prepare(`
    SELECT * FROM user_stats WHERE user_id = ?
  `).bind(user.id).first();

  if (!stats) {
    // Return default stats if none exist
    const defaultStats: UserStats = {
      id: 0,
      userId: user.id,
      totalScore: 0,
      totalPuzzlesSolved: 0,
      totalPuzzlesAttempted: 0,
      bestSessionScore: 0,
      averageTimePerPuzzle: 0,
      mathPuzzlesSolved: 0,
      sciencePuzzlesSolved: 0,
      puzzlePuzzlesSolved: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return c.json(defaultStats);
  }

  return c.json(stats);
});

app.get('/api/game/history', authMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const sessions = await c.env.DB.prepare(`
    SELECT * FROM game_sessions 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 10
  `).bind(user.id).all();

  return c.json(sessions.results);
});

// Puzzle generation functions
function getDifficultyLevel(score: number): 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' {
  if (score < 50) return 'beginner';
  if (score < 100) return 'easy';
  if (score < 200) return 'medium';
  if (score < 300) return 'hard';
  return 'expert';
}

function getDifficultyMultiplier(score: number): number {
  const difficulty = getDifficultyLevel(score);
  switch (difficulty) {
    case 'beginner': return 5;
    case 'easy': return 10;
    case 'medium': return 15;
    case 'hard': return 25;
    case 'expert': return 40;
    default: return 10;
  }
}

function generatePuzzle(type: PuzzleType, score: number, language: string): Puzzle {
  const difficulty = getDifficultyLevel(score);
  
  switch (type) {
    case 'math':
      return generateMathPuzzle(difficulty, language);
    case 'science':
      return generateSciencePuzzle(difficulty, language);
    case 'puzzle':
      return generatePuzzlePuzzle(difficulty, language);
    default:
      throw new Error(`Unknown puzzle type: ${type}`);
  }
}

function generateMathPuzzle(difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert', language: string): Puzzle {
  if (language === 'ar') {
    // Arabic Math Questions
    const beginnerQuestions = [
      { question: 'ما هو ١ + ١؟', answer: '٢' },
      { question: 'ما هو ٣ + ٢؟', answer: '٥' },
      { question: 'ما هو ٥ - ١؟', answer: '٤' },
      { question: 'ما هو ٢ × ٢؟', answer: '٤' },
      { question: 'ما هو ٦ ÷ ٢؟', answer: '٣' },
      { question: 'ما هو ٤ + ١؟', answer: '٥' },
    ];

    const easyQuestions = [
      { question: 'ما هو ٥ + ٣؟', answer: '٨' },
      { question: 'ما هو ١٠ - ٤؟', answer: '٦' },
      { question: 'ما هو ٦ × ٢؟', answer: '١٢' },
      { question: 'ما هو ١٥ ÷ ٣؟', answer: '٥' },
      { question: 'ما هو ٧ + ٨؟', answer: '١٥' },
      { question: 'ما هو ٢٠ - ٩؟', answer: '١١' },
      { question: 'ما هو ٤ × ٥؟', answer: '٢٠' },
      { question: 'ما هو ٢٨ ÷ ٤؟', answer: '٧' },
    ];

    const mediumQuestions = [
      { question: 'ما هو ٤٧ + ٣٥؟', answer: '٨٢' },
      { question: 'ما هو ٩٣ - ٢٨؟', answer: '٦٥' },
      { question: 'ما هو ١٢ × ٩؟', answer: '١٠٨' },
      { question: 'ما هو ١٤٤ ÷ ١٢؟', answer: '١٢' },
      { question: 'ما هو ٦٨ + ٤٧؟', answer: '١١٥' },
      { question: 'ما هو ١٢٥ - ٣٩؟', answer: '٨٦' },
      { question: 'ما هو ١٥ × ٧؟', answer: '١٠٥' },
      { question: 'ما هو ١٨٠ ÷ ١٥؟', answer: '١٢' },
    ];
    
    const hardQuestions = [
      { question: 'ما هو ١٤٧ + ٢٥٨؟', answer: '٤٠٥' },
      { question: 'ما هو ٣٥٢ - ١٦٧؟', answer: '١٨٥' },
      { question: 'ما هو ١٧ × ١٣؟', answer: '٢٢١' },
      { question: 'ما هو ٣٦٠ ÷ ١٥؟', answer: '٢٤' },
      { question: 'ما هو ٢٨٩ + ٣٦٥؟', answer: '٦٥٤' },
      { question: 'ما هو ٤٨٠ - ٢٣٥؟', answer: '٢٤٥' },
      { question: 'ما هو ١٩ × ١٦؟', answer: '٣٠٤' },
      { question: 'ما هو ٤٢٠ ÷ ٢٠؟', answer: '٢١' },
    ];

    const expertQuestions = [
      { question: 'ما هو ٧٨٩ + ٤٥٦ + ٢٣٤؟', answer: '١٤٧٩' },
      { question: 'ما هو ١٥٦٧ - ٨٩٤؟', answer: '٦٧٣' },
      { question: 'ما هو ٤٧ × ٢٩؟', answer: '١٣٦٣' },
      { question: 'ما هو ٩٨٤ ÷ ٢٤؟', answer: '٤١' },
      { question: 'ما هو ٢³ × ٥؟', answer: '٤٠' },
      { question: 'ما هو جذر ١٤٤؟', answer: '١٢' },
      { question: 'ما هو ٣٤ × ٢٧؟', answer: '٩١٨' },
      { question: 'ما هو ١٢٦٠ ÷ ٣٦؟', answer: '٣٥' },
    ];
    
    let questions;
    switch (difficulty) {
      case 'beginner': questions = beginnerQuestions; break;
      case 'easy': questions = easyQuestions; break;
      case 'medium': questions = mediumQuestions; break;
      case 'hard': questions = hardQuestions; break;
      case 'expert': questions = expertQuestions; break;
    }
    
    const selected = questions[Math.floor(Math.random() * questions.length)];
    
    return {
      type: 'math',
      question: selected.question,
      answer: selected.answer,
    };
  } else {
    // English Math Questions
    const beginnerQuestions = [
      { question: 'What is 1 + 1?', answer: '2' },
      { question: 'What is 3 + 2?', answer: '5' },
      { question: 'What is 5 - 1?', answer: '4' },
      { question: 'What is 2 × 2?', answer: '4' },
      { question: 'What is 6 ÷ 2?', answer: '3' },
      { question: 'What is 4 + 1?', answer: '5' },
    ];

    const easyQuestions = [
      { question: 'What is 5 + 3?', answer: '8' },
      { question: 'What is 10 - 4?', answer: '6' },
      { question: 'What is 6 × 2?', answer: '12' },
      { question: 'What is 15 ÷ 3?', answer: '5' },
      { question: 'What is 7 + 8?', answer: '15' },
      { question: 'What is 20 - 9?', answer: '11' },
      { question: 'What is 4 × 5?', answer: '20' },
      { question: 'What is 28 ÷ 4?', answer: '7' },
    ];

    const mediumQuestions = [
      { question: 'What is 47 + 35?', answer: '82' },
      { question: 'What is 93 - 28?', answer: '65' },
      { question: 'What is 12 × 9?', answer: '108' },
      { question: 'What is 144 ÷ 12?', answer: '12' },
      { question: 'What is 68 + 47?', answer: '115' },
      { question: 'What is 125 - 39?', answer: '86' },
      { question: 'What is 15 × 7?', answer: '105' },
      { question: 'What is 180 ÷ 15?', answer: '12' },
    ];
    
    const hardQuestions = [
      { question: 'What is 147 + 258?', answer: '405' },
      { question: 'What is 352 - 167?', answer: '185' },
      { question: 'What is 17 × 13?', answer: '221' },
      { question: 'What is 360 ÷ 15?', answer: '24' },
      { question: 'What is 289 + 365?', answer: '654' },
      { question: 'What is 480 - 235?', answer: '245' },
      { question: 'What is 19 × 16?', answer: '304' },
      { question: 'What is 420 ÷ 20?', answer: '21' },
    ];

    const expertQuestions = [
      { question: 'What is 789 + 456 + 234?', answer: '1479' },
      { question: 'What is 1567 - 894?', answer: '673' },
      { question: 'What is 47 × 29?', answer: '1363' },
      { question: 'What is 984 ÷ 24?', answer: '41' },
      { question: 'What is 2³ × 5?', answer: '40' },
      { question: 'What is √144?', answer: '12' },
      { question: 'What is 34 × 27?', answer: '918' },
      { question: 'What is 1260 ÷ 36?', answer: '35' },
    ];
    
    let questions;
    switch (difficulty) {
      case 'beginner': questions = beginnerQuestions; break;
      case 'easy': questions = easyQuestions; break;
      case 'medium': questions = mediumQuestions; break;
      case 'hard': questions = hardQuestions; break;
      case 'expert': questions = expertQuestions; break;
    }
    
    const selected = questions[Math.floor(Math.random() * questions.length)];
    
    return {
      type: 'math',
      question: selected.question,
      answer: selected.answer,
    };
  }
}

function generateSciencePuzzle(difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert', language: string): Puzzle {
  if (language === 'ar') {
    // Arabic Science Questions
    const beginnerQuestions = [
      {
        question: 'ما لون الشمس؟',
        options: ['أصفر', 'أحمر', 'أزرق', 'أخضر'],
        answer: 'أصفر',
      },
      {
        question: 'كم عدد أرجل القطة؟',
        options: ['٢', '٤', '٦', '٨'],
        answer: '٤',
      },
      {
        question: 'ما هو شكل الأرض؟',
        options: ['دائري', 'مربع', 'مثلث', 'مستطيل'],
        answer: 'دائري',
      },
    ];

    const easyQuestions = [
      {
        question: 'ما هو الكوكب الأقرب إلى الشمس؟',
        options: ['عطارد', 'الزهرة', 'الأرض', 'المريخ'],
        answer: 'عطارد',
      },
      {
        question: 'كم عدد الكواكب في المجموعة الشمسية؟',
        options: ['٧', '٨', '٩', '١٠'],
        answer: '٨',
      },
      {
        question: 'ما هو الغاز الذي نتنفسه؟',
        options: ['الأكسجين', 'النيتروجين', 'ثاني أكسيد الكربون', 'الهيدروجين'],
        answer: 'الأكسجين',
      },
      {
        question: 'ما هو أكبر عضو في جسم الإنسان؟',
        options: ['الجلد', 'الكبد', 'القلب', 'الدماغ'],
        answer: 'الجلد',
      },
      {
        question: 'ماذا تسمى عملية تحول الماء إلى بخار؟',
        options: ['التبخر', 'التكثف', 'التجمد', 'الانصهار'],
        answer: 'التبخر',
      },
    ];

    const mediumQuestions = [
      {
        question: 'ما هو أصغر عظم في جسم الإنسان؟',
        options: ['الركاب في الأذن', 'عظم الرسغ', 'عظم الضلع', 'عظم الإصبع'],
        answer: 'الركاب في الأذن',
      },
      {
        question: 'في أي طبقة من الغلاف الجوي توجد طبقة الأوزون؟',
        options: ['الستراتوسفير', 'التروبوسفير', 'الميزوسفير', 'الثيرموسفير'],
        answer: 'الستراتوسفير',
      },
      {
        question: 'ما هو الحمض الموجود في المعدة؟',
        options: ['حمض الهيدروكلوريك', 'حمض الكبريتيك', 'حمض النيتريك', 'حمض الفوسفوريك'],
        answer: 'حمض الهيدروكلوريك',
      },
    ];
    
    const hardQuestions = [
      {
        question: 'ما هو العنصر الأكثر وفرة في الكون؟',
        options: ['الهيدروجين', 'الهيليوم', 'الأكسجين', 'الكربون'],
        answer: 'الهيدروجين',
      },
      {
        question: 'كم عدد الكروموسومات في الخلية البشرية؟',
        options: ['٢٣', '٤٦', '٤٨', '٥٢'],
        answer: '٤٦',
      },
      {
        question: 'ما هي سرعة الضوء في الفراغ تقريباً؟',
        options: ['٣٠٠،٠٠٠ كم/ثانية', '١٥٠،٠٠٠ كم/ثانية', '٤٥٠،٠٠٠ كم/ثانية', '٦٠٠،٠٠٠ كم/ثانية'],
        answer: '٣٠٠،٠٠٠ كم/ثانية',
      },
      {
        question: 'ما هو الرمز الكيميائي للذهب؟',
        options: ['Au', 'Ag', 'Go', 'Gd'],
        answer: 'Au',
      },
      {
        question: 'ما هي الطبقة الخارجية من الغلاف الجوي للأرض؟',
        options: ['الإكسوسفير', 'الستراتوسفير', 'التروبوسفير', 'الميزوسفير'],
        answer: 'الإكسوسفير',
      },
    ];

    const expertQuestions = [
      {
        question: 'ما هو عدد أفوجادرو تقريباً؟',
        options: ['٦.٠٢ × ١٠²³', '٣.١٤ × ١٠²³', '٩.١١ × ١٠²³', '١.٦٦ × ١٠²³'],
        answer: '٦.٠٢ × ١٠²³',
      },
      {
        question: 'ما هو الجسيم المسؤول عن نقل القوة الكهرومغناطيسية؟',
        options: ['الفوتون', 'البروتون', 'النيوترون', 'الإلكترون'],
        answer: 'الفوتون',
      },
      {
        question: 'في أي عضية تحدث عملية البناء الضوئي؟',
        options: ['البلاستيدات الخضراء', 'الميتوكوندريا', 'النواة', 'الشبكة الإندوبلازمية'],
        answer: 'البلاستيدات الخضراء',
      },
    ];
    
    let questions;
    switch (difficulty) {
      case 'beginner': questions = beginnerQuestions; break;
      case 'easy': questions = easyQuestions; break;
      case 'medium': questions = mediumQuestions; break;
      case 'hard': questions = hardQuestions; break;
      case 'expert': questions = expertQuestions; break;
    }
    
    const selected = questions[Math.floor(Math.random() * questions.length)];
    
    return {
      type: 'science',
      question: selected.question,
      options: selected.options,
      answer: selected.answer,
    };
  } else {
    // English Science Questions
    const beginnerQuestions = [
      {
        question: 'What color is the sun?',
        options: ['Yellow', 'Red', 'Blue', 'Green'],
        answer: 'Yellow',
      },
      {
        question: 'How many legs does a cat have?',
        options: ['2', '4', '6', '8'],
        answer: '4',
      },
      {
        question: 'What shape is the Earth?',
        options: ['Round', 'Square', 'Triangle', 'Rectangle'],
        answer: 'Round',
      },
    ];

    const easyQuestions = [
      {
        question: 'What is the closest planet to the Sun?',
        options: ['Mercury', 'Venus', 'Earth', 'Mars'],
        answer: 'Mercury',
      },
      {
        question: 'How many planets are in our solar system?',
        options: ['7', '8', '9', '10'],
        answer: '8',
      },
      {
        question: 'What gas do we breathe in?',
        options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
        answer: 'Oxygen',
      },
      {
        question: 'What is the largest organ in the human body?',
        options: ['Skin', 'Liver', 'Heart', 'Brain'],
        answer: 'Skin',
      },
      {
        question: 'What is the process of water turning into vapor called?',
        options: ['Evaporation', 'Condensation', 'Freezing', 'Melting'],
        answer: 'Evaporation',
      },
    ];

    const mediumQuestions = [
      {
        question: 'What is the smallest bone in the human body?',
        options: ['Stapes in ear', 'Wrist bone', 'Rib bone', 'Finger bone'],
        answer: 'Stapes in ear',
      },
      {
        question: 'In which layer of the atmosphere is the ozone layer?',
        options: ['Stratosphere', 'Troposphere', 'Mesosphere', 'Thermosphere'],
        answer: 'Stratosphere',
      },
      {
        question: 'What acid is found in the stomach?',
        options: ['Hydrochloric acid', 'Sulfuric acid', 'Nitric acid', 'Phosphoric acid'],
        answer: 'Hydrochloric acid',
      },
    ];
    
    const hardQuestions = [
      {
        question: 'What is the most abundant element in the universe?',
        options: ['Hydrogen', 'Helium', 'Oxygen', 'Carbon'],
        answer: 'Hydrogen',
      },
      {
        question: 'How many chromosomes are in a human cell?',
        options: ['23', '46', '48', '52'],
        answer: '46',
      },
      {
        question: 'What is the approximate speed of light in a vacuum?',
        options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'],
        answer: '300,000 km/s',
      },
      {
        question: 'What is the chemical symbol for gold?',
        options: ['Au', 'Ag', 'Go', 'Gd'],
        answer: 'Au',
      },
      {
        question: 'What is the outermost layer of Earth\'s atmosphere?',
        options: ['Exosphere', 'Stratosphere', 'Troposphere', 'Mesosphere'],
        answer: 'Exosphere',
      },
    ];

    const expertQuestions = [
      {
        question: 'What is Avogadro\'s number approximately?',
        options: ['6.02 × 10²³', '3.14 × 10²³', '9.11 × 10²³', '1.66 × 10²³'],
        answer: '6.02 × 10²³',
      },
      {
        question: 'Which particle carries the electromagnetic force?',
        options: ['Photon', 'Proton', 'Neutron', 'Electron'],
        answer: 'Photon',
      },
      {
        question: 'In which organelle does photosynthesis occur?',
        options: ['Chloroplast', 'Mitochondria', 'Nucleus', 'Endoplasmic reticulum'],
        answer: 'Chloroplast',
      },
    ];
    
    let questions;
    switch (difficulty) {
      case 'beginner': questions = beginnerQuestions; break;
      case 'easy': questions = easyQuestions; break;
      case 'medium': questions = mediumQuestions; break;
      case 'hard': questions = hardQuestions; break;
      case 'expert': questions = expertQuestions; break;
    }
    
    const selected = questions[Math.floor(Math.random() * questions.length)];
    
    return {
      type: 'science',
      question: selected.question,
      options: selected.options,
      answer: selected.answer,
    };
  }
}

function generatePuzzlePuzzle(difficulty: 'beginner' | 'easy' | 'medium' | 'hard' | 'expert', language: string): Puzzle {
  if (language === 'ar') {
    // Arabic Puzzles
    const beginnerPuzzles = [
      {
        question: 'أعيد ترتيب الحروف: ر م ق',
        answer: 'قمر',
        hint: 'في السماء ليلاً',
      },
      {
        question: 'ما يأتي بعد: ١، ٢، ٣، ؟',
        answer: '٤',
        hint: 'الرقم التالي',
      },
      {
        question: 'أكمل: أحمر، أزرق، ؟',
        answer: 'أخضر',
        hint: 'لون آخر',
      },
    ];

    const easyPuzzles = [
      {
        question: 'أعيد ترتيب الحروف: س م ش',
        answer: 'شمس',
        hint: 'نجم في السماء',
      },
      {
        question: 'ما يأتي بعد: ٢، ٤، ٦، ٨، ؟',
        answer: '١٠',
        hint: 'أرقام زوجية',
      },
      {
        question: 'حزر اللغز: أبيض من الثلج وأسود من الليل، يكتب ولا يقرأ',
        answer: 'القلم',
        hint: 'أداة للكتابة',
      },
      {
        question: 'أعيد ترتيب الحروف: ل م ق',
        answer: 'قلم',
        hint: 'للكتابة',
      },
      {
        question: 'ما يأتي بعد: ١، ٣، ٥، ٧، ؟',
        answer: '٩',
        hint: 'أرقام فردية',
      },
    ];

    const mediumPuzzles = [
      {
        question: 'أعيد ترتيب الحروف: ك ت ا ب',
        answer: 'كتاب',
        hint: 'للقراءة',
      },
      {
        question: 'ما يأتي بعد: ١، ٤، ٩، ١٦، ؟',
        answer: '٢٥',
        hint: 'مربعات الأرقام',
      },
      {
        question: 'حزر اللغز: أكون في البحر ولكنني لست ماءً، أكون في السماء ولكنني لست هواءً',
        answer: 'السحاب',
        hint: 'يحمل المطر',
      },
    ];
    
    const hardPuzzles = [
      {
        question: 'أعيد ترتيب الحروف: م ل ع ل م',
        answer: 'معلم',
        hint: 'مهنة التدريس',
      },
      {
        question: 'ما يأتي بعد: ١، ١، ٢، ٣، ٥، ٨، ؟',
        answer: '١٣',
        hint: 'متتالية فيبوناتشي',
      },
      {
        question: 'حزر اللغز: له رأس ولا عين له، ولها عين ولا رأس لها',
        answer: 'الدبوس والإبرة',
        hint: 'أدوات خياطة',
      },
      {
        question: 'أعيد ترتيب الحروف: ت و ق ل',
        answer: 'وقت',
        hint: 'الزمن',
      },
      {
        question: 'ما يأتي بعد: ٢، ٦، ١٢، ٢٠، ٣٠، ؟',
        answer: '٤٢',
        hint: 'الفرق يزداد',
      },
    ];

    const expertPuzzles = [
      {
        question: 'أعيد ترتيب الحروف: ح ا س ب و ت م ر ا ك',
        answer: 'حاسوب متراكم',
        hint: 'جهاز إلكتروني متقدم',
      },
      {
        question: 'ما يأتي بعد: ١، ٨، ٢٧، ٦٤، ؟',
        answer: '١٢٥',
        hint: 'مكعبات الأرقام',
      },
      {
        question: 'حزر اللغز: أنا أول من خلق ولكنني آخر من يموت، أحضر في كل مكان ولكنني لا أُرى',
        answer: 'الصمت',
        hint: 'غياب الصوت',
      },
    ];
    
    let puzzles;
    switch (difficulty) {
      case 'beginner': puzzles = beginnerPuzzles; break;
      case 'easy': puzzles = easyPuzzles; break;
      case 'medium': puzzles = mediumPuzzles; break;
      case 'hard': puzzles = hardPuzzles; break;
      case 'expert': puzzles = expertPuzzles; break;
    }
    
    const selected = puzzles[Math.floor(Math.random() * puzzles.length)];
    
    return {
      type: 'puzzle',
      question: selected.question,
      answer: selected.answer,
      hint: selected.hint,
    };
  } else {
    // English Puzzles
    const beginnerPuzzles = [
      {
        question: 'Unscramble: TAC',
        answer: 'CAT',
        hint: 'Pet animal',
      },
      {
        question: 'What comes next: 1, 2, 3, ?',
        answer: '4',
        hint: 'Next number',
      },
      {
        question: 'Complete: Red, Blue, ?',
        answer: 'GREEN',
        hint: 'Another color',
      },
    ];

    const easyPuzzles = [
      {
        question: 'Unscramble: TUNES',
        answer: 'UNSET',
        hint: 'To undo a setting',
      },
      {
        question: 'What comes next: 2, 4, 6, 8, ?',
        answer: '10',
        hint: 'Even numbers',
      },
      {
        question: 'Riddle: What has hands but cannot clap?',
        answer: 'CLOCK',
        hint: 'Tells time',
      },
      {
        question: 'Unscramble: EARTH',
        answer: 'HEART',
        hint: 'Organ that pumps blood',
      },
      {
        question: 'What comes next: 1, 3, 5, 7, ?',
        answer: '9',
        hint: 'Odd numbers',
      },
    ];

    const mediumPuzzles = [
      {
        question: 'Unscramble: TEACHER',
        answer: 'CHEATER',
        hint: 'Someone who breaks rules',
      },
      {
        question: 'What comes next: 1, 4, 9, 16, ?',
        answer: '25',
        hint: 'Perfect squares',
      },
      {
        question: 'Riddle: What gets wetter as it dries?',
        answer: 'TOWEL',
        hint: 'Used after shower',
      },
    ];
    
    const hardPuzzles = [
      {
        question: 'Unscramble: LISTEN',
        answer: 'SILENT',
        hint: 'Without sound',
      },
      {
        question: 'What comes next: 1, 1, 2, 3, 5, 8, ?',
        answer: '13',
        hint: 'Fibonacci sequence',
      },
      {
        question: 'Riddle: What has cities but no houses, forests but no trees?',
        answer: 'MAP',
        hint: 'Shows geography',
      },
      {
        question: 'Unscramble: DORMITORY',
        answer: 'DIRTY ROOM',
        hint: 'Not clean space',
      },
      {
        question: 'What comes next: 2, 6, 12, 20, 30, ?',
        answer: '42',
        hint: 'Difference increases',
      },
    ];

    const expertPuzzles = [
      {
        question: 'Unscramble: THE MORSE CODE',
        answer: 'HERE COME DOTS',
        hint: 'Communication system',
      },
      {
        question: 'What comes next: 1, 8, 27, 64, ?',
        answer: '125',
        hint: 'Perfect cubes',
      },
      {
        question: 'Riddle: I am the first to be made and the last to be broken. What am I?',
        answer: 'PROMISE',
        hint: 'A commitment',
      },
    ];
    
    let puzzles;
    switch (difficulty) {
      case 'beginner': puzzles = beginnerPuzzles; break;
      case 'easy': puzzles = easyPuzzles; break;
      case 'medium': puzzles = mediumPuzzles; break;
      case 'hard': puzzles = hardPuzzles; break;
      case 'expert': puzzles = expertPuzzles; break;
    }
    
    const selected = puzzles[Math.floor(Math.random() * puzzles.length)];
    
    return {
      type: 'puzzle',
      question: selected.question,
      answer: selected.answer,
      hint: selected.hint,
    };
  }
}

function normalizeNumbers(text: string): string {
  // Convert Arabic numerals to English numerals
  const arabicToEnglish: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  let normalized = text;
  for (const [arabic, english] of Object.entries(arabicToEnglish)) {
    normalized = normalized.replace(new RegExp(arabic, 'g'), english);
  }
  
  return normalized;
}

function getCorrectAnswer(puzzle: Puzzle): string {
  return puzzle.answer;
}

export default app;
