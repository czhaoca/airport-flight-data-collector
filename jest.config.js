module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'lib/**/*.js',
    '!src/**/*.test.js',
    '!lib/**/*.test.js',
    '!src/legacy/**/*.js'
  ],
  testMatch: [
    'tests/**/*.test.js',
    'tests/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/data/',
    '/docs/',
    '/logs/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  verbose: true
};