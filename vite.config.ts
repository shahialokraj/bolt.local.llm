import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig, type ViteDevServer } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';

const futureFlags = {
  v3_lazyRouteDiscovery: true,
  v3_singleFetch: true,
  v3_fetcherPersist: true,
  v3_relativeSplatPath: true,
  v3_throwAbortReason: true,
};

export default defineConfig((config) => {
  return {
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@remix-run')) {
                return 'remix';
              }
              return 'vendor';
            }
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    plugins: [
      nodePolyfills({
        include: ['path', 'buffer'],
      }),
      config.mode !== 'test' && remixCloudflareDevProxy(),
      remixVitePlugin({
        future: futureFlags,
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    ],
    envPrefix:["VITE_","OPENAI_LIKE_API_","OLLAMA_API_BASE_URL","LMSTUDIO_API_BASE_URL"],
    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: config.mode === 'production' 
          ? '[hash:base64:8]' 
          : '[name]__[local]',
      },
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          charset: false,
          sourceMap: true,
          includePaths: ['./app/styles'],
        },
      },
      postcss: {
        plugins: [
          // Add any necessary PostCSS plugins here
        ],
      },
      devSourcemap: true,
    },
    optimizeDeps: {
      exclude: ['virtual:uno.css'],
    },
  };
});

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);

        if (raw) {
          const version = parseInt(raw[2], 10);

          if (version === 129) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            );

            return;
          }
        }

        next();
      });
    },
  };
}
