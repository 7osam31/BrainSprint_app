import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // App Name
    appName: 'BrainSprint',
    appDescription: 'Challenge your mind with timed puzzles. Boost your problem-solving speed and track your progress.',
    
    // Navigation
    home: 'Home',
    stats: 'Statistics',
    
    // Authentication
    signIn: 'Sign In',
    signInToTrack: 'Sign In to Track Progress',
    playAsGuest: 'Play as Guest',
    guestModeNote: 'Play instantly without an account, or sign in to save your scores',
    guestModeWarning: 'Guest Mode - Scores not saved',
    welcomeBack: 'Welcome back',
    brainTrainer: 'Brain Trainer',
    
    // Game
    startNewGame: 'Start New Game',
    viewStatistics: 'View Statistics',
    readyToChallenge: 'Ready to challenge your mind and beat your personal records?',
    startingSession: 'Starting your brain training session...',
    loadingPuzzle: 'Loading puzzle...',
    
    // Puzzle Types
    mathPuzzle: 'Math',
    sciencePuzzle: 'Science',
    puzzlePuzzle: 'Puzzles',
    hint: 'Hint',
    
    // Language and Category Selection
    chooseLanguage: 'Choose Your Language',
    chooseCategory: 'Choose a Category',
    selectCategory: 'Select a category to start playing',
    math: 'Math',
    science: 'Science',
    puzzles: 'Puzzles',
    mathDesc: 'Test your arithmetic and calculation skills',
    scienceDesc: 'Challenge your knowledge of science facts',
    puzzlesDesc: 'Solve riddles and pattern recognition',
    
    // Game Actions
    enterAnswer: 'Enter your answer...',
    submit: 'Submit',
    correct: 'Correct!',
    incorrect: 'Incorrect. The answer was',
    points: 'points',
    
    // Stats
    totalScore: 'Total Score',
    puzzlesSolved: 'Puzzles Solved',
    bestSession: 'Best Session',
    avgTime: 'Avg Time',
    streak: 'Streak',
    best: 'Best',
    
    // Features
    timedChallenges: 'Timed Challenges',
    timedChallengesDesc: 'Solve puzzles within countdown timers to earn points and improve your speed.',
    scoreTracking: 'Score Tracking',
    scoreTrackingDesc: 'Keep track of correct answers, high scores, and personal records.',
    skillBuilding: 'Skill Building',
    skillBuildingDesc: 'Practice math, logic, and word puzzles to sharpen different cognitive skills.',
  },
  ar: {
    // App Name
    appName: 'عدو الدماغ',
    appDescription: 'تحدى عقلك بالألغاز المؤقتة. عزز سرعة حل المشاكل وتتبع تقدمك.',
    
    // Navigation
    home: 'الرئيسية',
    stats: 'الإحصائيات',
    
    // Authentication
    signIn: 'تسجيل الدخول',
    signInToTrack: 'سجل دخولك لتتبع التقدم',
    playAsGuest: 'العب كضيف',
    guestModeNote: 'العب فوراً بدون حساب، أو سجل دخولك لحفظ نقاطك',
    guestModeWarning: 'وضع الضيف - النقاط غير محفوظة',
    welcomeBack: 'مرحباً بعودتك',
    brainTrainer: 'مدرب الدماغ',
    
    // Game
    startNewGame: 'ابدأ لعبة جديدة',
    viewStatistics: 'عرض الإحصائيات',
    readyToChallenge: 'مستعد لتحدي عقلك وكسر أرقامك القياسية؟',
    startingSession: 'بدء جلسة تدريب الدماغ...',
    loadingPuzzle: 'تحميل اللغز...',
    
    // Puzzle Types
    mathPuzzle: 'رياضيات',
    sciencePuzzle: 'علوم',
    puzzlePuzzle: 'ألغاز',
    hint: 'تلميح',
    
    // Language and Category Selection
    chooseLanguage: 'اختر لغتك',
    chooseCategory: 'اختر فئة',
    selectCategory: 'اختر فئة لبدء اللعب',
    math: 'رياضيات',
    science: 'علوم',
    puzzles: 'ألغاز',
    mathDesc: 'اختبر مهاراتك في الحساب والعمليات الحسابية',
    scienceDesc: 'تحدى معرفتك بحقائق العلوم',
    puzzlesDesc: 'حل الألغاز والتعرف على الأنماط',
    
    // Game Actions
    enterAnswer: 'أدخل إجابتك...',
    submit: 'إرسال',
    correct: 'صحيح!',
    incorrect: 'خطأ. الإجابة الصحيحة كانت',
    points: 'نقاط',
    
    // Stats
    totalScore: 'النقاط الإجمالية',
    puzzlesSolved: 'الألغاز المحلولة',
    bestSession: 'أفضل جلسة',
    avgTime: 'متوسط الوقت',
    streak: 'السلسلة',
    best: 'الأفضل',
    
    // Features
    timedChallenges: 'تحديات مؤقتة',
    timedChallengesDesc: 'حل الألغاز خلال عدادات زمنية لكسب النقاط وتحسين سرعتك.',
    scoreTracking: 'تتبع النقاط',
    scoreTrackingDesc: 'تتبع الإجابات الصحيحة والنقاط العالية والأرقام القياسية الشخصية.',
    skillBuilding: 'بناء المهارات',
    skillBuildingDesc: 'مارس ألغاز الرياضيات والمنطق والكلمات لشحذ مهارات معرفية مختلفة.',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
