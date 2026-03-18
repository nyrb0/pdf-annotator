import type { Theme } from '../types/types';

export const LIGHT: Theme = {
    bgPage: '#F8F7F6',
    bgSurface: '#FFFFFF',
    bgSubtle: '#F2F1F0',
    bgInput: '#FAFAF9',
    text: '#1A1A1A',
    textMuted: '#656565',
    textFaint: '#989898',
    border: '#E0DEDD',
    borderStrong: '#CCCCCC',
    shadow: '0 2px 12px rgba(0,0,0,0.08)',
    shadowModal: '0 8px 32px rgba(0,0,0,0.15)',
    gradientMain: 'linear-gradient(180deg, #0c2c1c 0%, #1a5031 50%, #2d7d46 100%)',
    gradientSecondary: 'linear-gradient(135deg, #23c634, #6366f1)',
    colorSecondary: '#1b6845',
};

export const DARK: Theme = {
    bgPage: '#0D0D0D',
    bgSurface: '#1A1A1A',
    bgSubtle: '#262626',
    bgInput: '#1F1F1F',
    text: '#F0F0F0',
    textMuted: '#A5A5A5',
    textFaint: '#717171',
    border: '#383838',
    borderStrong: '#4A4A4A',
    shadow: '0 2px 12px rgba(0,0,0,0.40)',
    shadowModal: '0 8px 32px rgba(0,0,0,0.55)',
    gradientMain: 'linear-gradient(180deg, #0c2c1c 0%, #1a5031 50%, #2d7d46 100%)',
    gradientSecondary: 'linear-gradient(135deg, #23c634, #6366f1)',
    colorSecondary: '#1b6845',
};
