import { Navigate, useLocation } from 'react-router-dom';

export default function LoginRedirect() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}