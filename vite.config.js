import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // 部署到 GitHub Pages 时使用仓库名作为 base
  // 如果仓库名是 learn-record，则 base: '/learn-record/'
  // 如果使用自定义域名则设为 '/'
  base: '/learn-record/',
  plugins: [vue()],
})
