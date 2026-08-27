module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^lucide-react-native/icons/.*$': '<rootDir>/__mocks__/lucide.js',
  },
};
