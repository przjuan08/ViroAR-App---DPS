/**
 * Configuración para React Native CLI
 * https://github.com/react-native-community/cli/blob/master/docs/configuration.md
 */
module.exports = {
    dependencies: {
      '@viro-community/react-viro': {
        platforms: {
          android: {
            sourceDir: './node_modules/@viro-community/react-viro/android/',
          },
          ios: {
            podspecPath: './node_modules/@viro-community/react-viro/ios/ViroReact.podspec',
          },
        },
      },
    },
    assets: ['./assets/fonts/'],
  };