import { useState } from "react";
import { Puzzle } from "@/shared/types";
import { Calculator, Brain, Lightbulb } from "lucide-react";
import { useLanguage } from "@/react-app/contexts/LanguageContext";

interface PuzzleComponentProps {
  puzzle: Puzzle;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export default function PuzzleComponent({ puzzle, onSubmit, disabled }: PuzzleComponentProps) {
  const [answer, setAnswer] = useState("");
  const { t, isRTL } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !disabled) {
      onSubmit(answer.trim());
      setAnswer("");
    }
  };

  const handleOptionClick = (option: string) => {
    if (!disabled) {
      onSubmit(option);
    }
  };

  const getPuzzleIcon = () => {
    switch (puzzle.type) {
      case 'math':
        return <Calculator className="w-8 h-8 text-blue-400" />;
      case 'science':
        return <Brain className="w-8 h-8 text-purple-400" />;
      case 'puzzle':
        return <Lightbulb className="w-8 h-8 text-green-400" />;
    }
  };

  const getPuzzleColor = () => {
    switch (puzzle.type) {
      case 'math':
        return 'from-blue-500/20 to-blue-600/20 border-blue-400/30';
      case 'science':
        return 'from-purple-500/20 to-purple-600/20 border-purple-400/30';
      case 'puzzle':
        return 'from-green-500/20 to-green-600/20 border-green-400/30';
    }
  };

  const getPuzzleTypeText = () => {
    switch (puzzle.type) {
      case 'math':
        return t('mathPuzzle');
      case 'science':
        return t('sciencePuzzle');
      case 'puzzle':
        return t('puzzlePuzzle');
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getPuzzleColor()} backdrop-blur-sm border rounded-2xl p-8`}>
      <div className="text-center mb-6">
        <div className={`flex items-center justify-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {getPuzzleIcon()}
          <h2 className="text-2xl font-bold text-white">{getPuzzleTypeText()}</h2>
        </div>
        
        <div className="text-3xl font-bold text-white mb-4">
          {puzzle.question}
        </div>

        {puzzle.type === 'puzzle' && 'hint' in puzzle && puzzle.hint && (
          <div className={`flex items-center justify-center gap-2 text-blue-200 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm">{t('hint')}: {puzzle.hint}</span>
          </div>
        )}
      </div>

      {puzzle.type === 'science' && 'options' in puzzle ? (
        <div className="grid grid-cols-2 gap-4">
          {puzzle.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={disabled}
              className="bg-white/10 hover:bg-white/20 disabled:hover:bg-white/10 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t('enterAnswer')}
              disabled={disabled}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <button
              type="submit"
              disabled={!answer.trim() || disabled}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('submit')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
