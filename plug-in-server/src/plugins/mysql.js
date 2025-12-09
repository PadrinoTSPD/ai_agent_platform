const fp = require('fastify-plugin');
const mysql = require('mysql2/promise');

const parseNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const assignDecorator = (fastify, name, value) => {
  if (!fastify.hasDecorator(name)) {
    fastify.decorate(name, value);
  } else {
    fastify[name] = value;
  }
};

const buildConnectionConfig = (overrides = {}) => {
  const merged = {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: process.env.MYSQL_WAIT_FOR_CONNECTIONS,
    connectionLimit: process.env.MYSQL_CONNECTION_LIMIT,
    queueLimit: process.env.MYSQL_QUEUE_LIMIT,
    timezone: process.env.MYSQL_TIMEZONE,
    charset: process.env.MYSQL_CHARSET,
    namedPlaceholders: process.env.MYSQL_NAMED_PLACEHOLDERS,
    decimalNumbers: process.env.MYSQL_DECIMAL_NUMBERS,
    ...overrides
  };

  const configured = {
    host: merged.host,
    port: parseNumber(merged.port, 3306),
    user: merged.user,
    password: merged.password,
    database: merged.database,
    waitForConnections: parseBoolean(merged.waitForConnections, true),
    connectionLimit: parseNumber(merged.connectionLimit, 10),
    queueLimit: parseNumber(merged.queueLimit, 0),
    timezone: merged.timezone,
    charset: merged.charset,
    namedPlaceholders: parseBoolean(merged.namedPlaceholders, false),
    decimalNumbers: parseBoolean(merged.decimalNumbers, false)
  };

  return Object.fromEntries(
    Object.entries(configured).filter(([key, value]) => {
      if (key === 'password') {
        return value !== undefined;
      }

      return value !== undefined && value !== null;
    })
  );
};

module.exports = fp(async (fastify, opts = {}) => {
  const {
    pool: providedPool,
    connection: connectionOverrides,
    skipInitialQuery = false
  } = opts;

  assignDecorator(fastify, 'mysql', null);

  let pool = providedPool;

  if (!pool) {
    const connectionConfig = buildConnectionConfig(connectionOverrides);

    if (!connectionConfig.host || !connectionConfig.user) {
      fastify.log.warn('MySQL plugin skipped: host and user must be configured');
      return;
    }

    try {
      pool = mysql.createPool(connectionConfig);

      if (!skipInitialQuery) {
        await pool.query('SELECT 1');
      }

      fastify.log.info({ host: connectionConfig.host, database: connectionConfig.database }, 'MySQL pool initialized');
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to initialize MySQL pool');
      throw error;
    }
  }

  const query = async (sql, params = []) => {
    if (!pool) {
      throw new Error('MySQL pool is not initialized');
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  };

  const mysqlApi = {
    pool,
    query,
    getConnection: () => pool.getConnection()
  };

  assignDecorator(fastify, 'mysql', mysqlApi);

  fastify.addHook('onClose', async (_, done) => {
    try {
      await pool.end();
      done();
    } catch (error) {
      done(error);
    }
  });
});
