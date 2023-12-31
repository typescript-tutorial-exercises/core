import path from 'path';
import type { Configuration } from '@rspack/cli';
import { ArcoDesignPlugin } from '@arco-plugins/unplugin-react';

export default function createRspackConfig(): Configuration {
  const mode = process.env.NODE_ENV as Configuration['mode'];
  return {
    mode,
    stats: mode === 'production',
    context: __dirname,
    entry: {
      main: './src/main.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash:8].bundle.js',
      chunkFilename: '[name].[contenthash:8].bundle.js',
      cssChunkFilename: '[name].[contenthash:8].bundle.js',
    },
    builtins: {
      html: [
        {
          minify: true,
          template: './html/index.html',
          favicon: './assets/favicon.png',
        },
      ],
      copy: {
        patterns: [
          {
            from: './assets/monaco-editor',
            to: './assets/monaco-editor',
            force: true,
          },
        ],
      },
    },
    devtool: mode === 'production' ? false : 'source-map',
    resolve: {
      alias: {
        '@config': path.resolve(__dirname, './config'),
        '@problems': path.resolve(__dirname, './problems'),
        '@src': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      new ArcoDesignPlugin({
        theme: '@arco-design/theme-line',
      }),
    ],
    module: {
      rules: [
        {
          resourceQuery: /url$/,
          type: 'asset/resource',
        },
        {
          resourceQuery: /raw$/,
          type: 'asset/source',
        },
        {
          test: /\.less$/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                modules: {
                  mode: 'local',
                  auto: true,
                  exportGlobals: true,
                  localIdentName: '[path][name]__[local]--[hash:base64:5]',
                  localIdentContext: path.resolve(__dirname, 'src'),
                  exportLocalsConvention: 'camelCase',
                  exportOnlyLocals: false,
                },
              },
            },
            {
              loader: 'less-loader',
              options: {
                lessOptions: {
                  javascriptEnabled: true,
                },
              },
            },
          ],
        },
        {
          test: /\.svg$/,
          issuer: /\.[jt]sx?$/,
          use: ['@svgr/webpack'],
        },
      ],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 100 * 1024,
        maxSize: 200 * 1024,
        cacheGroups: {
          common: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|@arco-design[\\/]web-react)[\\/]/,
            priority: 100,
            name: 'common',
            reuseExistingChunk: true,
          },
          vendors: {
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            name: 'vendors',
            reuseExistingChunk: true,
          },
          async: {
            chunks: 'async',
            priority: 1,
            name: 'async',
            reuseExistingChunk: true,
          },
        },
      },
    },
  };
}
