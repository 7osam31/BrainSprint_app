import { useState, useCallback } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { useNavigate } from "react-router";
import { Brain, Trophy, Home, RotateCcw, Calculator, Lightbulb, Globe } from "lucide-react";
import { Puzzle, PuzzleType, GameSession } from "@/shared/types";
import { useLanguage } from "@/react-app/contexts/LanguageContext";
import PuzzleComponent from "@/react-app/components/PuzzleComponent";
import Timer from "@/react-app/components/Timer";
import ScoreDisplay from "@/react-app/components/ScoreDisplay";

type GamePhase = 'language-selection' | 'category-selection' | 'playing';

export default function Game() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const [gamePhase, setGamePhase] = useState<GamePhase>('language-selection');
  const [selectedCategory, setSelectedCategory] = useState<PuzzleType | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [puzzleStartTime, setPuzzleStartTime] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect' | null; message: string; points?: number }>({ type: null, message: '' });

  const handleLanguageSelect = (lang: 'en' | 'ar') => {
    setLanguage(lang);
    setGamePhase('category-selection');
  };

  const handleCategorySelect = (category: PuzzleType) => {
    setSelectedCategory(category);
    setGamePhase('playing');
    startNewGame(category);
  };

  const startNewGame = async (category?: PuzzleType) => {
    const categoryToUse = category || selectedCategory;
    if (!categoryToUse) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/game/start", { method: "POST" });
      if (response.ok) {
        const session = await response.json();
        setGameSession(session);
        setScore(0);
        setStreak(0);
        loadNextPuzzle(categoryToUse);
      }
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextPuzzle = async (category?: PuzzleType) => {
    const categoryToUse = category || selectedCategory;
    if (!categoryToUse) return;
    
    try {
      const response = await fetch(`/api/game/puzzle/${categoryToUse}?score=${score}&language=${language}`);
      if (response.ok) {
        const puzzle = await response.json();
        setCurrentPuzzle(puzzle);
        setPuzzleStartTime(Date.now());
        setFeedback({ type: null, message: '' });
      }
    } catch (error) {
      console.error("Failed to load puzzle:", error);
    }
  };

  const submitAnswer = async (answer: string) => {
    if (!currentPuzzle || !gameSession) return;

    const timeTaken = Math.round((Date.now() - puzzleStartTime) / 1000);
    
    try {
      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSessionId: gameSession.id,
          puzzle: currentPuzzle,
          userAnswer: answer,
          timeTakenSeconds: timeTaken,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.isCorrect) {
          setScore(score + result.pointsEarned);
          setStreak(streak + 1);
          setFeedback({
            type: 'correct',
            message: t('correct'),
            points: result.pointsEarned
          });
        } else {
          setStreak(0);
          setFeedback({
            type: 'incorrect',
            message: `${t('incorrect')}: ${result.correctAnswer}`
          });
        }

        // Load next puzzle after a short delay
        setTimeout(() => {
          loadNextPuzzle();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    }
  };

  const handleTimeUp = useCallback(() => {
    if (currentPuzzle) {
      submitAnswer(''); // Submit empty answer when time runs out
    }
  }, [currentPuzzle]);

  const resetToLanguageSelection = () => {
    setGamePhase('language-selection');
    setSelectedCategory(null);
    setGameSession(null);
    setCurrentPuzzle(null);
    setScore(0);
    setStreak(0);
  };

  // Language Selection Screen
  if (gamePhase === 'language-selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Brain className="w-12 h-12 text-white" />
              <h1 className="text-4xl font-bold text-white">BrainSprint</h1>
            </div>
            <Globe className="w-16 h-16 text-blue-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Choose Your Language</h2>
            <h2 className="text-3xl font-bold text-white font-arabic">اختر لغتك</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleLanguageSelect('en')}
              className="group bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white/30 hover:border-white/50 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-6xl mb-4">🇬🇧</div>
              <h3 className="text-3xl font-bold text-white mb-2">English</h3>
              <p className="text-blue-200">Play in English</p>
            </button>

            <button
              onClick={() => handleLanguageSelect('ar')}
              className="group bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white/30 hover:border-white/50 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-6xl mb-4">🇸🇦</div>
              <h3 className="text-3xl font-bold text-white mb-2 font-arabic">العربية</h3>
              <p className="text-blue-200 font-arabic">العب باللغة العربية</p>
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="mt-8 mx-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Category Selection Screen
  if (gamePhase === 'category-selection') {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4 ${isRTL ? 'font-arabic' : ''}`}>
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className={`flex items-center justify-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Brain className="w-12 h-12 text-white" />
              <h1 className="text-4xl font-bold text-white">{t('appName')}</h1>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{t('chooseCategory')}</h2>
            <p className="text-blue-200 text-lg">{t('selectCategory')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => handleCategorySelect('math')}
              className="group bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm hover:from-blue-500/30 hover:to-blue-600/30 border-2 border-blue-400/30 hover:border-blue-400/50 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <Calculator className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">{t('math')}</h3>
              <p className="text-blue-200">{t('mathDesc')}</p>
            </button>

            <button
              onClick={() => handleCategorySelect('science')}
              className="group bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm hover:from-purple-500/30 hover:to-purple-600/30 border-2 border-purple-400/30 hover:border-purple-400/50 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">{t('science')}</h3>
              <p className="text-blue-200">{t('scienceDesc')}</p>
            </button>

            <button
              onClick={() => handleCategorySelect('puzzle')}
              className="group bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm hover:from-green-500/30 hover:to-green-600/30 border-2 border-green-400/30 hover:border-green-400/50 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105"
            >
              <Lightbulb className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">{t('puzzles')}</h3>
              <p className="text-blue-200">{t('puzzlesDesc')}</p>
            </button>
          </div>

          <button
            onClick={resetToLanguageSelection}
            className={`mx-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Globe className="w-5 h-5" />
            <span>{t('chooseLanguage')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Playing Screen
  if (isLoading || !gameSession) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center ${isRTL ? 'font-arabic' : ''}`}>
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Brain className="w-12 h-12 text-white mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t('startingSession')}</h2>
        </div>
      </div>
    );
  }

  const getCategoryIcon = () => {
    switch (selectedCategory) {
      case 'math':
        return <Calculator className="w-8 h-8 text-blue-400" />;
      case 'science':
        return <Brain className="w-8 h-8 text-purple-400" />;
      case 'puzzle':
        return <Lightbulb className="w-8 h-8 text-green-400" />;
    }
  };

  const getCategoryName = () => {
    switch (selectedCategory) {
      case 'math':
        return t('math');
      case 'science':
        return t('science');
      case 'puzzle':
        return t('puzzles');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 ${isRTL ? 'font-arabic' : ''}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={resetToLanguageSelection}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200"
              title={t('home')}
            >
              <Home className="w-6 h-6" />
            </button>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {getCategoryIcon()}
              <h1 className="text-2xl font-bold text-white">{getCategoryName()}</h1>
            </div>
          </div>
          
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {!user && (
              <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 text-yellow-200 px-4 py-2 rounded-full text-sm">
                {t('guestModeWarning')}
              </div>
            )}
            <button
              onClick={() => startNewGame()}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200"
              title={t('startNewGame')}
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
          <ScoreDisplay score={score} />
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">{streak}</div>
            <div className="text-blue-200 text-sm">{t('streak')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
            <div className="text-blue-200 text-sm">{t('best')}: {score}</div>
          </div>
        </div>

        {/* Timer */}
        {currentPuzzle && (
          <div className="mb-8">
            <Timer 
              duration={30} 
              onTimeUp={handleTimeUp}
              isActive={!feedback.type}
              key={puzzleStartTime} // Reset timer when new puzzle loads
            />
          </div>
        )}

        {/* Puzzle */}
        <div className="max-w-2xl mx-auto">
          {currentPuzzle ? (
            <PuzzleComponent 
              puzzle={currentPuzzle} 
              onSubmit={submitAnswer}
              disabled={!!feedback.type}
            />
          ) : (
            <div className="text-center text-white">
              {t('loadingPuzzle')}
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback.type && (
          <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-full backdrop-blur-sm transition-all duration-300 ${
            feedback.type === 'correct' 
              ? 'bg-green-500/20 text-green-200 border border-green-400/30' 
              : 'bg-red-500/20 text-red-200 border border-red-400/30'
          }`}>
            <div className="text-center">
              <div className="font-bold">{feedback.message}</div>
              {feedback.points && (
                <div className="text-sm mt-1">+{feedback.points} {t('points')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
