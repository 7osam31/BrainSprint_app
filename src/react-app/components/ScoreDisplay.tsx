import { Trophy } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
}

export default function ScoreDisplay({ score }: ScoreDisplayProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <div className="text-2xl font-bold text-white">{score}</div>
      </div>
      <div className="text-blue-200 text-sm">Score</div>
    </div>
  );
}
