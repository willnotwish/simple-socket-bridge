const net = require('net')

console.log("-- Welcome to Nick's simple socket server.")

const server = net.createServer( (socket) => {
  console.log('>> Client connected', socket.address())

  socket.on( 'end', () => console.log('>> Client disconnected.') )
  socket.on( 'data', (data) => console.log('>> Client data received.', data) )
  socket.on( 'error', (err) => console.log('>> An error occurred.', err) )

  socket.write('This is an echo server. Each line of input will be echoed back. Type something and press return...\r\n')
  socket.pipe(socket) // this does the echoing
})

server.on('listening', () => {
  console.log('-- Now listening for connections on', server.address())
  console.log("-- CTRL-C to exit.")
})

server.on('close', () => {
  console.log('-- Closing down now.')
})

shutdown = () => {
  console.log('-- shutdownServer. About to close server socket')
  server.getConnections( (err, count) => {
    if (err) {
      console.log( "-- shutdownServer. Could not determine number of connections:", err)
    } else {
      console.log( "-- shutdownServer. Number of active connections:", count)
    }
  })
  server.close()
}

startup = () => {
  if (process.env.UNIX_SOCKET) {
    console.log('-- startup. About to listen on Unix socket')
    server.listen(process.env.UNIX_SOCKET)
  } else if (process.env.TCP_PORT) {
    console.log('-- startup. About to listen on TCP socket')
    server.listen(process.env.TCP_PORT, process.env.TCP_ADDR || '0.0.0.0')
  } else {
    console.log('-- startup. About to listen on TCP socket')
    server.listen(1337, '0.0.0.0')
  }
}

process.on('SIGINT', () => {
  console.log('-- SIGINT processing. About to initiate shut down')
  shutdown()
})

process.on('SIGTERM', () => {
  console.log('-- SIGTERM processing. About to initiate shut down')
  shutdown()
})

startup()