// Setup basic express server
const express = require('express')
const path = require('path')
const app = express()
const timesync = require('timesync/server')
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 3000

server.listen(port, function () {
  console.log('Server listening at port %d', port)
})

// Routing
app.use(express.static('dist'))
app.get('*', function (request, response) {
  response.sendFile(path.resolve('dist', 'index.html'))
})

// Time sync with server
app.use('/timesync', timesync.requestHandler)

let numUsers = {}

io.on('connection', socket => {
  socket.on('join', async room => {
    await socket.join(room)
    numUsers[room] = (numUsers[room] || 0) + 1
    io.to(room).emit('user joined', {
      id: socket.id,
      roomCount: numUsers[room]
    })
  })

  socket.on('player', data => {
    socket.broadcast.to(data.room).emit('player', data)
  })

  socket.on('disconnecting', reason => {
    Object.keys(socket.rooms).forEach(room => {
      numUsers[room] = numUsers[room] - 1
      io.to(room).emit('user leaving', {
        id: socket.id,
        roomCount: numUsers[room]
      })
    })
  })
})
