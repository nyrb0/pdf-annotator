import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles/LoginPage.module.scss';
import { routes } from '../routes.global.const';
import { useAuthStore } from '../../store/auth.store';

const LoginPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const { login } = useAuthStore();

    useEffect(() => {
        const auth = async () => {
            if (token) {
                await login(token);

                navigate(routes.HOME);
            } else {
                navigate(routes.UNAUTHENTICATED);
            }
        };

        auth();
    }, [token]);

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.loader}></div>
                <h2>Авторизация...</h2>
                <p>Пожалуйста, подождите</p>
            </div>
        </div>
    );
};

export default LoginPage;
