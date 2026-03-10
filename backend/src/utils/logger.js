const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const isDevelopment = process.env.NODE_ENV !== 'production';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function getLogLevel() {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && LOG_LEVELS.hasOwnProperty(envLevel)) {
    return LOG_LEVELS[envLevel];
  }
  return isDevelopment ? LOG_LEVELS.info : LOG_LEVELS.warn;
}

const currentLogLevel = getLogLevel();

function formatMessage(level, message, color) {
  const timestamp = new Date().toISOString();
  const levelTag = `[${level}]`.padEnd(8);
  return `${color}${levelTag}${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${message}`;
}

function info(message) {
  if (currentLogLevel >= LOG_LEVELS.info) {
    console.log(formatMessage('INFO', message, colors.cyan));
  }
}

function success(message) {
  console.log(formatMessage('SUCCESS', message, colors.green));
}

function warn(message) {
  if (currentLogLevel >= LOG_LEVELS.warn) {
    console.warn(formatMessage('WARN', message, colors.yellow));
  }
}

function error(message, err = null) {
  if (currentLogLevel >= LOG_LEVELS.error) {
    const errorMessage = err
      ? `${message}: ${err.message || err}`
      : message;

    console.error(formatMessage('ERROR', errorMessage, colors.red));

    if (err && isDevelopment && err.stack) {
      console.error(colors.dim + err.stack + colors.reset);
    }
  }
}

function debug(message) {
  if (currentLogLevel >= LOG_LEVELS.debug) {
    console.log(formatMessage('DEBUG', message, colors.magenta));
  }
}

function startup(message) {
  console.log(
    colors.green + colors.bright + '✓' + colors.reset + ' ' + message
  );
}

module.exports = {
  info,
  success,
  warn,
  error,
  debug,
  startup
};