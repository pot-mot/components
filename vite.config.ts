/// <reference types="vitest/config" />
import {defineConfig} from "vite";
import vue from '@vitejs/plugin-vue'
import dts from "vite-plugin-dts";
import {resolve} from "path";
import {fileURLToPath, URL} from 'node:url';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: '@potmot/list',
            formats: ['es', 'umd'],
            fileName: 'index'
        },
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    plugins: [
        vue(),
        dts({
            tsconfigPath: './tsconfig.app.json',
            include: ['src/**/*.ts'],
        })
    ],
    test: {
        globals: false,
        environment: 'jsdom',
        coverage: {
            enabled: true,
            provider: 'v8',
            cleanOnRerun: true,
        },
    },
});
