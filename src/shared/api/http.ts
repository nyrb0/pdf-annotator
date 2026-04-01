import axios from 'axios';
import toast from 'react-hot-toast';
import { getTokenFromStorage } from './auth-token';
import { useAuthStore } from '../../store/auth.store';

const urls = {
    server: 'https://api.expert.edu.kg',
    local: 'http://192.168.60.124:9876',
};
export const baseURL = urls.local;

const setting = {
    baseURL: `${baseURL}/api`,
    headers: { 'Content-Type': 'application/json' },
};
export const axiosService = axios.create(setting);
export const axiosServiceAuth = axios.create(setting);

axiosServiceAuth.interceptors.request.use(config => {
    const token = getTokenFromStorage();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosServiceAuth.interceptors.response.use(
    response => response,
    error => {
        if (error.response.status === 401) {
            useAuthStore.getState().logout();
            toast.error('Вы вышли из аккаунта! (Попробуйте перезайти)');
        }

        return Promise.reject(error);
    },
);
