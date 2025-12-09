const verifyTable = async (app) => {
  const mysql = app.mysql;

  if (!mysql || typeof mysql.query !== 'function') {
    throw new Error('MySQL plugin is not configured; ensure MYSQL_* environment variables are set');
  }

  const database = mysql.pool?.config?.connectionConfig?.database || process.env.MYSQL_DATABASE;

  if (!database) {
    throw new Error('MySQL database name is not configured; set MYSQL_DATABASE');
  }

  const requiredTables = ['agent', 'conversation', 'message'];

  for (const table of requiredTables) {
    const rows = await mysql.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1',
      [database, table]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`Required table "${table}" was not found in database "${database}"`);
    }
  }

  app.log.info({ database, tables: requiredTables }, 'Verified required tables exist in MySQL');
};

module.exports = {
  verifyTable
};
