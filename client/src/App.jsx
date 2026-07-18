import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api, getCurrentUserId, setCurrentUserId } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Editor from './pages/Editor.jsx';

const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

export default function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(getCurrentUserId());
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  const login = useCallback((id) => {
    setCurrentUserId(id);
    setUserId(id);
  }, []);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setUserId(null);
  }, []);

  const currentUser = users.find((u) => u.id === userId) || null;

  if (loadingUsers) {
    return <div className="full-screen-status">Loading Marginalia…</div>;
  }

  const session = { users, currentUser, userId, login, logout };

  return (
    <SessionContext.Provider value={session}>
      <Routes>
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/docs" replace /> : <Login />}
        />
        <Route
          path="/docs"
          element={currentUser ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/docs/:id"
          element={currentUser ? <Editor /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={currentUser ? '/docs' : '/login'} replace />} />
      </Routes>
    </SessionContext.Provider>
  );
}
