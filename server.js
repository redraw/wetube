// Setup basic express server
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 3000

server.listen(port, function () {
  console.log('Server listening at port %d', port)
})

// Routing
app.use(express.static('dist'))

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
    io.broadcast.to(data.room).emit('player', data)
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
