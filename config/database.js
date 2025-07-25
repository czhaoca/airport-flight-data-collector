const path = require('path');

const config = {
  provider: process.env.DB_PROVIDER || 'local',
  
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 1000,
  
  local: {
    dataDir: process.env.LOCAL_DATA_DIR || path.join(process.cwd(), 'data'),
    prettyPrint: process.env.LOCAL_PRETTY_PRINT !== 'false'
  },
  
  oci: {
    user: process.env.OCI_USER,
    password: process.env.OCI_PASSWORD,
    connectionString: process.env.OCI_CONNECTION_STRING,
    walletLocation: process.env.OCI_WALLET_LOCATION,
    walletPassword: process.env.OCI_WALLET_PASSWORD,
    poolMin: parseInt(process.env.OCI_POOL_MIN) || 1,
    poolMax: parseInt(process.env.OCI_POOL_MAX) || 4,
    poolIncrement: parseInt(process.env.OCI_POOL_INCREMENT) || 1,
    poolTimeout: parseInt(process.env.OCI_POOL_TIMEOUT) || 60
  },
  
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID,
    databaseId: process.env.CF_DATABASE_ID,
    apiToken: process.env.CF_API_TOKEN,
    workerUrl: process.env.CF_WORKER_URL,
    environment: process.env.CF_ENVIRONMENT || 'production'
  }
};

function validateConfig() {
  const provider = config.provider;
  
  if (!['local', 'oci', 'cloudflare'].includes(provider)) {
    throw new Error(`Invalid database provider: ${provider}. Must be one of: local, oci, cloudflare`);
  }
  
  if (provider === 'oci') {
    const required = ['user', 'password', 'connectionString'];
    const missing = required.filter(key => !config.oci[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required OCI configuration: ${missing.join(', ')}`);
    }
  }
  
  if (provider === 'cloudflare') {
    const required = ['accountId', 'databaseId', 'apiToken'];
    const missing = required.filter(key => !config.cloudflare[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required Cloudflare configuration: ${missing.join(', ')}`);
    }
  }
  
  return true;
}

function getConfig() {
  if (config.provider !== 'local') {
    validateConfig();
  }
  return config;
}

module.exports = {
  getConfig,
  validateConfig,
  ...config
};