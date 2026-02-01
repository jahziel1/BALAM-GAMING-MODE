/**
 * PostCSS Configuration
 *
 * Optimizes CSS for production:
 * - Autoprefixer for browser compatibility
 * - PurgeCSS to remove unused CSS
 * - cssnano for minification
 */

module.exports = {
  plugins: {
    // Transform modern CSS features
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-media-queries': true,
        'custom-properties': false, // Keep custom properties for runtime theming
      },
    },

    // Add vendor prefixes
    autoprefixer: {
      overrideBrowserslist: [
        'last 2 versions',
        'Firefox ESR',
        '> 1%',
        'not dead',
      ],
    },

    // Remove unused CSS (production only)
    ...(process.env.NODE_ENV === 'production'
      ? {
          '@fullhuman/postcss-purgecss': {
            content: ['./index.html', './src/**/*.{ts,tsx}'],
            defaultExtractor: (content) =>
              content.match(/[\w-/:]+(?<!:)/g) || [],
            safelist: {
              standard: [
                /^data-/,
                /^aria-/,
                /^focus/,
                /^hover/,
                /^active/,
              ],
            },
          },
        }
      : {}),

    // Minify CSS (production only)
    ...(process.env.NODE_ENV === 'production'
      ? {
          cssnano: {
            preset: [
              'default',
              {
                discardComments: {
                  removeAll: true,
                },
                normalizeWhitespace: true,
                cssDeclarationSorter: true,
              },
            ],
          },
        }
      : {}),
  },
};
