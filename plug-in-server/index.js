require('dotenv').config();

const { buildServer } = require('./src/buildServer');
const { loadConfig } = require('./src/config');
const { verifyTable } = require('./src/startup/verifyTable');

const start = async () => {
  const app = buildServer();
  const { port, host } = loadConfig();

  try {
    await app.ready();
    await verifyTable(app);
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = {
  buildServer,
  start
};
