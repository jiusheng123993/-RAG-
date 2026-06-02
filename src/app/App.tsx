import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import Diagnostics from './pages/Diagnostics.js';
import ImportPage from './pages/Import.js';
import Login from './pages/Login.js';
import Memories from './pages/Memories.js';
import Projects from './pages/Projects.js';
import { useAuthStore } from './stores/authStore.js';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId/memories" element={<Memories />} />
        <Route path="projects/:projectId/import" element={<ImportPage />} />
        <Route path="diagnostics" element={<Diagnostics />} />
      </Route>
    </Routes>
  );
}
