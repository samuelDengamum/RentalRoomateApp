import React from 'react';
import { Navigate } from 'react-router-dom';

interface NonAdminRouteProps {
  children: React.ReactElement;
}

const NonAdminRoute: React.FC<NonAdminRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default NonAdminRoute;
