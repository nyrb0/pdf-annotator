import { create } from 'zustand';
import toast from 'react-hot-toast';
import { getTokenFromStorage, removeTokenFromStorage, saveTokenToStorage } from '../shared/api/auth-token';
import { axiosService, axiosServiceAuth } from '../shared/api/http';
import { IUser } from '../entities/model/user.types';

interface AuthState {
    accessToken: string | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

interface AuthActions {
    login: (token: string) => Promise<IUser>;
    user: IUser | null;
    logout: () => void;
    setToken: (token: string) => void;
    clearError: () => void;
    hydrate: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
    // стейт
    accessToken: getTokenFromStorage(),
    isLoading: true,
    user: null,
    error: null,
    isAuthenticated: false,

    // Actions
    hydrate: async () => {
        const token = getTokenFromStorage();
        if (token) {
            try {
                const res = await axiosServiceAuth.get<IUser>('/user');
                set({
                    accessToken: token,
                    user: res.data || null,
                    isAuthenticated: true,      
                    isLoading: false,
                });     
            } catch (error) {
                console.log(error);
                set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false });
            }
        } else {
            set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false });
        }
    },

    setToken: (token: string) => {
        saveTokenToStorage(token);
        set({
            accessToken: token,
            isAuthenticated: true,
            error: null,
        });
    },

    login: async token => {
        set({ isLoading: true, error: null });
        try {
            const endpoint = '/sso/auth';

            const res = await axiosService.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const access_token = res.data.access_token;
            if (!token) throw new Error('No token');
            saveTokenToStorage(access_token);
            toast.success('Успешный вход!');

            set({
                accessToken: access_token,
                user: res.data.user,
                isAuthenticated: true,
                isLoading: false,
            });

            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.message || 'Ошибка регистрации';
            toast.error(message);
            set({
                isLoading: false,
                error: message,
                isAuthenticated: false,
            });
            throw error;
        }
    },

    logout: () => {
        removeTokenFromStorage();
        set({
            accessToken: null,
            isAuthenticated: false,
            error: null,
            user: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },
}));

export const getAuthToken = () => useAuthStore.getState().accessToken;
