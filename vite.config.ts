import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wgsl-loader',
      transform(code, id) {
        if (id.endsWith('.wgsl')) {
          // 你可能需要根据wgsl-loader的实际API进行适当的转换
          return `export default ${JSON.stringify(code)}`;
        }
      },
    },
  ],
  resolve: {
    alias: {
      '/@/': path.resolve(__dirname, 'src'),
    },
  },
})
