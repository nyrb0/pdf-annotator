import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { routes } from './routes.global.const';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to={routes.UNAUTHENTICATED} replace />;
    }

    return <>{children}</>;
};
