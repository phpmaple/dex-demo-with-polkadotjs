const { override, fixBabelImports, useBabelRc } = require('customize-cra');

module.exports = override(
  useBabelRc(),
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: 'css'
  })
);
