// Deprecated: Local JSON Store has been disabled.
// The application requires a live MySQL database.

function localQuery() {
  return {
    success: false,
    error: 'Embedded local JSON database is disabled. A connected MySQL database is required.'
  };
}

function loadStore() {
  return {};
}

function saveStore() {}

function getDbFilePath() {
  return '';
}

module.exports = {
  localQuery,
  loadStore,
  saveStore,
  getDbFilePath
};

