import { useAuth } from "@getmocha/users-service/react";
import { useNavigate } from "react-router";
import { Brain, Zap, Trophy, TrendingUp, Play, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/react-app/contexts/LanguageContext";
import LanguageSwitcher from "@/react-app/components/LanguageSwitcher";

export default function Home() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/game/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleStartGame = () => {
    navigate("/game");
  };

  const handleViewStats = () => {
    navigate("/stats");
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin">
          <Brain className="w-12 h-12 text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 ${isRTL ? 'font-arabic' : ''}`}>
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Brain className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
              {t('appName')}
            </h1>
            <p className="text-2xl text-blue-200 mb-8 max-w-2xl mx-auto">
              {t('appDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/game")}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <Play className={`w-6 h-6 ${isRTL ? 'scale-x-[-1]' : ''}`} />
                {t('playAsGuest')}
              </button>
              <button
                onClick={redirectToLogin}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {t('signInToTrack')}
              </button>
            </div>
            <p className="text-blue-300 text-sm mt-4">
              {t('guestModeNote')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="bg-blue-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t('timedChallenges')}</h3>
              <p className="text-blue-200">
                {t('timedChallengesDesc')}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="bg-purple-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-purple-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t('scoreTracking')}</h3>
              <p className="text-blue-200">
                {t('scoreTrackingDesc')}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="bg-green-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-green-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t('skillBuilding')}</h3>
              <p className="text-blue-200">
                {t('skillBuildingDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 ${isRTL ? 'font-arabic' : ''}`}>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
            {t('welcomeBack')}, {user.google_user_data.given_name || t('brainTrainer')}!
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            {t('readyToChallenge')}
          </p>
        </div>

        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{stats.totalScore}</div>
              <div className="text-blue-200 text-sm">{t('totalScore')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{stats.totalPuzzlesSolved}</div>
              <div className="text-blue-200 text-sm">{t('puzzlesSolved')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{stats.bestSessionScore}</div>
              <div className="text-blue-200 text-sm">{t('bestSession')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {stats.averageTimePerPuzzle ? Math.round(stats.averageTimePerPuzzle) : 0}s
              </div>
              <div className="text-blue-200 text-sm">{t('avgTime')}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto">
          <button
            onClick={handleStartGame}
            className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            <Play className={`w-6 h-6 ${isRTL ? 'scale-x-[-1]' : ''}`} />
            {t('startNewGame')}
          </button>
          
          <button
            onClick={handleViewStats}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            <BarChart3 className="w-6 h-6" />
            {t('viewStatistics')}
          </button>
        </div>
      </div>
    </div>
  );
}
