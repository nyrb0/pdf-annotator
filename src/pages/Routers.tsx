import { Route, Routes } from 'react-router-dom';
import { routes } from './routes.global.const';
import LoginPage from './auth/LoginPage';
import UnauthenticatedPage from './auth/UnauthenticatedPage';
import { ProtectedRoute } from './ProtectedRoute';
import PDFAnnotator from '../pdf/PDFAnnotator';

const Routers = () => {
    return (
        <Routes>
            <Route
                path={routes.HOME}
                element={
                    <ProtectedRoute>
                        <PDFAnnotator />
                    </ProtectedRoute>
                }
            />
            <Route path={routes.LOGIN} element={<LoginPage />} />
            <Route path={routes.UNAUTHENTICATED} element={<UnauthenticatedPage />} />
        </Routes>
    );
};

export default Routers;
