import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
    root: './demo',
    base: mode === 'production' ? '/neat-js/' : '/',
    build: {
        outDir: '../dist-demo',
    },
    server: {
        port: 3000,
        open: true,
    },
}));
