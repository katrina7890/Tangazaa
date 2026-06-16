module.exports = {
  style: {
    postcss: {
      mode: 'file',
    },
  },
  jest: {
    configure: (jestConfig) => {
      jestConfig.transformIgnorePatterns = [
        'node_modules/(?!(react-leaflet|@react-leaflet)/)',
      ];
      return jestConfig;
    },
  },
};
