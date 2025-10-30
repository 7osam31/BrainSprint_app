import { useState, useEffect } from "react";
import { useAuth } from "@getmocha/users-service/react";
import { useNavigate } from "react-router";
import { Brain, Home, Trophy, Clock, Target, TrendingUp, Calculator, Type } from "lucide-react";
import { UserStats, GameSession } from "@/shared/types";

export default function Stats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [statsResponse, historyResponse] = await Promise.all([
        fetch("/api/game/stats"),
        fetch("/api/game/history")
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Brain className="w-12 h-12 text-white mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white">Loading your statistics...</h2>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccuracy = () => {
    if (!stats || stats.totalPuzzlesAttempted === 0) return 0;
    return Math.round((stats.totalPuzzlesSolved / stats.totalPuzzlesAttempted) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full transition-all duration-200"
          >
            <Home className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">Your Statistics</h1>
          </div>
          
          <div className="w-12"></div> {/* Spacer for alignment */}
        </div>

        {stats && (
          <>
            {/* Overall Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stats.totalScore}</div>
                <div className="text-blue-200">Total Score</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Target className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{getAccuracy()}%</div>
                <div className="text-blue-200">Accuracy</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Clock className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {Math.round(stats.averageTimePerPuzzle || 0)}s
                </div>
                <div className="text-blue-200">Avg Time</div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stats.bestSessionScore}</div>
                <div className="text-blue-200">Best Session</div>
              </div>
            </div>

            {/* Puzzle Type Breakdown */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Puzzle Breakdown</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Calculator className="w-10 h-10 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{stats.mathPuzzlesSolved}</div>
                  <div className="text-blue-200">Math Puzzles</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Brain className="w-10 h-10 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{stats.sciencePuzzlesSolved}</div>
                  <div className="text-blue-200">Science Puzzles</div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Type className="w-10 h-10 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{stats.puzzlePuzzlesSolved}</div>
                  <div className="text-blue-200">Puzzles</div>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Sessions</h2>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.slice(0, 5).map((session) => (
                    <div key={session.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold">Score: {session.totalScore}</div>
                        <div className="text-blue-200 text-sm">
                          {session.puzzlesSolved}/{session.puzzlesAttempted} puzzles solved
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-200 text-sm">{formatDate(session.createdAt)}</div>
                        <div className="text-white text-sm">
                          {Math.round(session.sessionDurationSeconds / 60)}m {session.sessionDurationSeconds % 60}s
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-blue-200 py-8">
                  No games played yet. Start your first session!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
