import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import { LanguageProvider } from "@/react-app/contexts/LanguageContext";
import HomePage from "@/react-app/pages/Home";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import GamePage from "@/react-app/pages/Game";
import StatsPage from "@/react-app/pages/Stats";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
