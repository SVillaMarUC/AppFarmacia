module.exports = function (api) {
  api.cache(true);
  return {
    presets: [require.resolve('expo/node_modules/babel-preset-expo')],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
    ],
  };
};