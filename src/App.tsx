import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { ScrollToTop } from './components/ScrollToTop';
import { Index } from './pages/Index';
import Games from './pages/Games';
import MyCollection from './pages/MyCollection';
import { MyLoans } from './pages/MyLoans';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotFound } from './pages/NotFound';
import { Admin } from './pages/Admin';
import { Header } from './components/Header';
import { Sessions } from './pages/Sessions';
import { Members } from './pages/Members';
import GameDetail from './pages/GameDetail';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Index />} />
              <Route path="/games" element={<><Header /><Games /></>} />
              <Route path="/game/:id" element={<GameDetail />} />
              <Route path="/sessions" element={<><Header /><Sessions /></>} />
              <Route path="/members" element={<><Header /><Members /></>} />
              <Route
                element={<ProtectedRoute />}
              >
                <Route path="my-collection" element={<MyCollection />} />
                <Route path="my-loans" element={<MyLoans />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Simple protected route component
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <><Header /><Outlet /></>;
}

export default App;