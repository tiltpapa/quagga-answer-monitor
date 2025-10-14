import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://quagga.studio/*'],
    side_panel: {
      default_path: 'sidepanel.html'
    }
  },
  vite: () => ({
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
  }),
});