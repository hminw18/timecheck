const webpack = require('webpack');

module.exports = function override(config) {
  // Handle .mjs files properly
  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: 'javascript/auto',
    resolve: {
      fullySpecified: false,
    },
  });
  
  config.resolve.fallback = {
    ...config.resolve.fallback,
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    stream: require.resolve('stream-browserify'),
    util: require.resolve('util'),
    assert: require.resolve('assert'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('os-browserify/browser'),
    url: require.resolve('url'),
    crypto: require.resolve('crypto-browserify'),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ];

  return config;
};