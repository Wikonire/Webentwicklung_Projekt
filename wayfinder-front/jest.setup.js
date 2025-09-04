Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: jest.fn(() => 'mocked-uuid') },
  writable: true,
});
