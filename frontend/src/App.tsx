import React, { useEffect, useState } from 'react';
import { parseRoute, getStoredUser, AppRoute } from './api';
import { Header, Footer, LoginModal, TourGuide } from './components/Shell';
import { User } from './types';
import Overview from './pages/Overview';
import PlaceReport from './pages/PlaceReport';
import Recommendations from './pages/Recommendations';

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(() => !localStorage.getItem('setu_tour_completed'));

  useEffect(() => {
    const handleHash = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOpenLogin = (prompt?: string) => {
    setLoginPromptMessage(prompt || 'Planner Login');
    setIsLoginOpen(true);
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col justify-between">
      <div>
        <Header
          user={user}
          onUserChange={setUser}
          onOpenLogin={() => handleOpenLogin()}
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {route.page === 'overview' && <Overview />}
          {route.page === 'place' && (
            <PlaceReport
              geoId={route.geoId}
              user={user}
              onOpenLogin={(msg) => handleOpenLogin(msg || 'Sign in to download reports')}
            />
          )}
          {route.page === 'recommendations' && (
            <Recommendations
              geoId={route.geoId}
              user={user}
              onOpenLogin={() => handleOpenLogin('Sign in to send this')}
            />
          )}
        </main>
      </div>

      <Footer onReplayTour={() => setIsTourOpen(true)} />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setLoginPromptMessage(null);
        }}
        onSuccess={(u) => setUser(u)}
        promptMessage={loginPromptMessage}
      />

      <TourGuide
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </div>
  );
}
