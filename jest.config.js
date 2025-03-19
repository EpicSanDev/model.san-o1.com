module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/_*.{js,jsx,ts,tsx}',
    '!app/**/*.stories.{js,jsx,ts,tsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Mapping pour les alias de chemins si vous en utilisez
    '^@/(.*)$': '<rootDir>/$1',
    // Pour gérer les imports CSS dans les tests
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Pour gérer les imports d'images
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Mapper les modules ESM problématiques
    '@qdrant/js-client-rest': '<rootDir>/__mocks__/qdrantMock.js'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    // Transformer aussi les modules ESM dans node_modules
    '/node_modules/(?!(@qdrant|openai)/)' 
  ],
  testTimeout: 30000, // Augmenter le timeout global des tests
}; 