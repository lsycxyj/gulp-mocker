const mod = require('./server');

module.exports = {
  exec(opts) {
      mod.startServer(opts);
  },
};
