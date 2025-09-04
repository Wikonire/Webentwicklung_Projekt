import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  testMatch: ['**/src/**/?(*.)+(spec).ts'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json'],
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json'
      }
    ]
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.m?js$)'
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment'
  ],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.(module|routing).ts',
    '!src/main.ts',
    '!src/polyfills.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  reporters: ['default']
};
export default config;
