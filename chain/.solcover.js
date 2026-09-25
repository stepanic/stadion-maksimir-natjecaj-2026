// Pokrivenost samo za produkcijske ugovore; testni pomoćnici (Semaphore kopija, mock V2) se ne broje.
module.exports = {
  skipFiles: ["test/"],
  istanbulReporter: ["text", "json-summary", "html"],
  mocha: { timeout: 300_000 },
};
