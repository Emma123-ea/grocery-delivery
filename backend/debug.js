process.on('exit', (code) => {
  console.log('EXIT, code', code, new Date().toLocaleTimeString())
})
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => {
    console.log('GOT SIGNAL', signal, new Date().toLocaleTimeString())
    process.exit(1)
  })
}
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION', err)
})
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION', err)
})

console.log('started', new Date().toLocaleTimeString())
setInterval(() => console.log('alive', new Date().toLocaleTimeString()), 5000)

require('./server')