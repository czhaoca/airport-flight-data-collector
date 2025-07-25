module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  verbose: true
};