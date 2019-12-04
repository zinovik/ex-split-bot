const path = require('path');

module.exports = {
  resolve: {
    alias: {
      'pg-native': path.join(__dirname, '/empty-module.js'),
      'typeorm-aurora-data-api-driver': path.join(__dirname, '/empty-module.js'),
      ioredis: path.join(__dirname, '/empty-module.js'),
      mongodb: path.join(__dirname, '/empty-module.js'),
      mssql: path.join(__dirname, '/empty-module.js'),
      mysql: path.join(__dirname, '/empty-module.js'),
      mysql2: path.join(__dirname, '/empty-module.js'),
      oracledb: path.join(__dirname, '/empty-module.js'),
      'pg-query-stream': path.join(__dirname, '/empty-module.js'),
      'react-native-sqlite-storage': path.join(__dirname, '/empty-module.js'),
      sqlite3: path.join(__dirname, '/empty-module.js'),
      redis: path.join(__dirname, '/empty-module.js'),
      'sql.js': path.join(__dirname, '/empty-module.js'),
    },
  },
};
