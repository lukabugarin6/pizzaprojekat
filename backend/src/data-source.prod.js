require('dotenv/config');
const { DataSource } = require('typeorm');

module.exports = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],

  synchronize: false,
});
