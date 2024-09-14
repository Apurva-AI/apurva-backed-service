import Sequelize from 'sequelize';
import path from 'path';
import _ from 'lodash';
import config from './config';

const telemtrydb = {};

// connect to postgres testDb
const sequelizeOptions = {
  dialect: 'postgres',
  port: config.postgres.port,
  host: config.postgres.host,
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  ...(config.postgres.ssl && {
    ssl: config.postgres.ssl,
  }),
  ...(config.postgres.ssl && config.postgres.ssl_ca_cert && {
    dialectOptions: {
      ssl: {
        ca: config.postgres.ssl_ca_cert,
      },
    },
  }),
};
const sequelize = new Sequelize(
  config.postgres.telemetry_db,
  config.postgres.user,
  config.postgres.passwd,
  sequelizeOptions,
);

const modelSchema = require(path.normalize(`${__dirname}/../server/models/wisdom-questions.model.js`)).default;
const model = sequelize.define(modelSchema.name, modelSchema.attribute);
telemtrydb[model.name] = model;

export default _.extend({
  sequelize,
  Sequelize,
}, telemtrydb);



