import { writable } from 'svelte/store';

function createThemeStore() {
    // Check if we're in the browser and get stored theme or system preference
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

    const { subscribe, set } = writable(initialTheme);

    return {
        subscribe,
        toggleTheme: () => {
            if (typeof localStorage !== 'undefined') {
                const currentTheme = localStorage.getItem('theme') || initialTheme;
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                localStorage.setItem('theme', newTheme);
                document.documentElement.classList.toggle('dark', newTheme === 'dark');
                document.documentElement.classList.toggle('light', newTheme === 'light');
                set(newTheme);
            }
        },
        setTheme: (theme: 'dark' | 'light') => {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('theme', theme);
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.classList.toggle('light', theme === 'light');
                set(theme);
            }
        }
    };
}

export const theme = createThemeStore();