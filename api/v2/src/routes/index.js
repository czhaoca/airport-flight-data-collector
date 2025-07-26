const healthRoutes = require('./health');
const authRoutes = require('./auth');
const flightsRoutes = require('./flights');
const airportsRoutes = require('./airports');
const statisticsRoutes = require('./statistics');

module.exports = {
  healthRoutes,
  authRoutes,
  flightsRoutes,
  airportsRoutes,
  statisticsRoutes
};