import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  duration: number; // in seconds
  onTimeUp: () => void;
  isActive: boolean;
}

export default function Timer({ duration, onTimeUp, isActive }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, isActive]);

  const percentage = (timeLeft / duration) * 100;
  const isLowTime = timeLeft <= 10;

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Clock className={`w-6 h-6 ${isLowTime ? 'text-red-400' : 'text-blue-400'}`} />
          <span className={`text-2xl font-bold ${isLowTime ? 'text-red-300' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
        
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isLowTime 
                ? 'bg-gradient-to-r from-red-500 to-red-600' 
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
