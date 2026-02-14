import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, ROLES } from './contexts/RoleContext';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import PrivateRoute from './components/auth/PrivateRoute';
import RequireRole from './components/auth/RequireRole';

// Pages
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Feedback from './pages/Feedback';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Chats from './pages/Chats';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';

import UserList from './pages/UserList';

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>

              {/* Common Routes (Everyone) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chats" element={<Chats />} />

              {/* Founder & Team Routes */}
              <Route path="/tasks" element={
                <RequireRole allowedRoles={[ROLES.FOUNDER, ROLES.CO_FOUNDER, ROLES.TEAM]}>
                  <Tasks />
                </RequireRole>
              } />

              {/* Founder Only Routes */}
              <Route path="/profile" element={
                <RequireRole allowedRoles={[ROLES.FOUNDER, ROLES.CO_FOUNDER, ROLES.TEAM, ROLES.MENTOR]}>
                  <Profile />
                </RequireRole>
              } />

              <Route path="/analytics" element={
                <RequireRole allowedRoles={[ROLES.FOUNDER, ROLES.CO_FOUNDER, ROLES.MENTOR]}>
                  <Analytics />
                </RequireRole>
              } />

              <Route path="/analytics/users" element={
                <RequireRole allowedRoles={[ROLES.FOUNDER, ROLES.CO_FOUNDER]}>
                  <UserList />
                </RequireRole>
              } />

              <Route path="/feedback" element={
                <RequireRole allowedRoles={[ROLES.FOUNDER, ROLES.CO_FOUNDER, ROLES.TEAM, ROLES.MENTOR]}>
                  <Feedback />
                </RequireRole>
              } />

              {/* Mentor Routes */}
              <Route path="/overview" element={
                <RequireRole allowedRoles={[ROLES.MENTOR]}>
                  <Dashboard />
                </RequireRole>
              } />

            </Route>
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
