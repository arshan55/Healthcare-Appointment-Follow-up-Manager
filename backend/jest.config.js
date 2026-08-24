module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  collectCoverageFrom: [
    "src/utils/**/*.ts",
    "src/services/llmService.ts",
    "src/services/appointmentService.ts",
    "src/services/doctorService.ts",
  ],
};
