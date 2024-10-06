import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
	root: 'src/renderer',
	base: './',
	plugins: [vue()],
	build: {
		outDir: '../../dist/renderer',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'src/renderer/index.html'),
				webcam: resolve(__dirname, 'src/renderer/webcam.html'),
			},
		},
	},
});
