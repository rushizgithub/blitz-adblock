export default {
  ...console,
  log: console.log.bind(console, '[fw/blitz]'),
  info: console.info.bind(console, '[fw/blitz]'),
  warn: console.warn.bind(console, '[fw/blitz]'),
  error: console.error.bind(console, '[fw/blitz]'),
}
