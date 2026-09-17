import { useEffect } from "react"; // Rebuild trigger
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Grades from "./pages/Grades";
import Materials from "./pages/Materials";
import Profile from "./pages/Profile";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminLabs from "./pages/admin/AdminLabs";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminGrades from "./pages/admin/AdminGrades";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

// Component to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Student Routes - Protected */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/grades" element={<ProtectedRoute><Grades /></ProtectedRoute>} />
            <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
            <Route path="/materials/labs" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
            <Route path="/materials/assignments" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
            <Route path="/materials/quizzes" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />

            {/* Admin Routes - Protected with Admin Requirement */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute requireAdmin><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/labs" element={<ProtectedRoute requireAdmin><AdminLabs /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute requireAdmin><AdminAssignments /></ProtectedRoute>} />
            <Route path="/admin/quizzes" element={<ProtectedRoute requireAdmin><AdminQuizzes /></ProtectedRoute>} />
            <Route path="/admin/grades" element={<ProtectedRoute requireAdmin><AdminGrades /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
