import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useLocalSync } from './hooks/useLibrary';
import { ScrollToTop } from './components/ScrollToTop';
import { Header } from './components/Header';
import { LoadingState } from './components/library/PageState';
import { Index } from './pages/Index';
import Games from './pages/Games';
import GameDetail from './pages/GameDetail';
import MyCollection from './pages/MyCollection';
import { MyLoans } from './pages/MyLoans';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { NotFound } from './pages/NotFound';
import { Admin } from './pages/Admin';
import { Sessions } from './pages/Sessions';
import { Members } from './pages/Members';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 } },
});

/** L'application est privée : toutes les pages (sauf connexion et inscription) exigent un membre connecté. */
function ProtectedLayout() {
  const { user, loading, mode } = useAuth();
  const location = useLocation();
  useLocalSync();

  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;

  return (
    <div className="min-h-screen bg-background">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-4">Aller au contenu</a>
      <Header />
      {mode === 'local' && (
        <div className="border-b border-warning-doux bg-warning-doux/15 px-4 py-2 text-center text-xs text-brun-cafe-doux sm:text-sm">
          Mode local de démonstration : les données sont enregistrées uniquement dans ce navigateur et ne sont pas partagées avec les autres membres.
        </div>
      )}
      <main id="contenu"><Outlet /></main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
            <Route path="/nouveau-mot-de-passe" element={<ResetPassword />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/games" element={<Games />} />
              <Route path="/game/:id" element={<GameDetail />} />
              <Route path="/my-collection" element={<MyCollection />} />
              <Route path="/my-loans" element={<MyLoans />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/members" element={<Members />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              {/* Anciens liens : le bouton « ajouter un jeu » mène désormais à la collection. */}
              <Route path="/ajouter-jeu" element={<Navigate to="/my-collection" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
