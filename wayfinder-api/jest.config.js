/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
    restoreMocks: true,
    resetModules: true,
    clearMocks: true,
    verbose: false,
    collectCoverageFrom: [
        '**/*.{js,jsx}',
        '!**/node_modules/**',
        '!**/vendor/**',
        '!**/coverage/**',
        '!**/dist/**',
        '!**/config.js',
        '!**/jest.config.js'
    ],
    coverageReporters: ['clover', 'json', 'lcov', ['text', {skipFull: true}]],
};
