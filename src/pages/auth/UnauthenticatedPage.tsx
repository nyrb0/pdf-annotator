import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import styles from './styles/UnauthenticatedPage.module.scss';
import { routes } from '../routes.global.const';

const UnauthenticatedPage = () => {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) return <Navigate to={routes.HOME} replace />;
    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.icon}>
                    <img src='/logo.png' alt='Логотип АИС Эксперт' />
                </div>

                <h1>Вы не авторизованы</h1>
                <p>Пожалуйста, войдите в систему, чтобы продолжить</p>

                <button className={styles.button}>
                    <a href='http://localhost:5173/expert'>Войти</a>
                </button>
            </div>
        </div>
    );
};

export default UnauthenticatedPage;
