<template>
  <div>
    <section class="level centered">
      <div class="field has-addons">
        <div class="control">
          <input class="input" type="text" v-model="video.url" placeholder="youtube url">
        </div>
        <div class="control">
          <a class="button is-info" @click="setMasterVideo">
            add
          </a>
        </div>
      </div>
      <p>
        <span>share: <a :href="shareUrl" target="_blank">{{ shareUrl }}</a></span>
        <span v-if="video.id" :class="{'tag is-danger': master, 'tag is-grey': !master}">
          {{ master ? 'master' : 'guest' }}
        </span>
      </p>
      <p>
        online users: 
        <span :class="{'has-text-success': onlineUsers > 0 }">{{ onlineUsers }}</span>
      </p>
    </section>
    <youtube 
      v-if="video.id"
      ref="youtube" 
      class="video"
      :video-id="video.id"
      :player-vars="video.opts"
      fit-parent
      @playing="playing"
      @paused="paused"
      @ready="ready"
    />
  </div>
</template>

<script>
import io from 'socket.io-client'

const timesync = require('timesync/dist/timesync.js')

const serverTime = timesync.create({
  server: '/timesync'
})

serverTime.on('change', offset => {
  console.log('[server time offset]', offset)
})

export default {
  data () {
    return {
      room: this.$route.params.room,
      onlineUsers: 1,
      master: false,
      socket: null,
      shareUrl: '',
      video: {
        url: '',
        id: '',
        opts: {
          autoplay: 0
        }
      }
    }
  },

  computed: {
    player () {
      return this.$refs.youtube.player
    }
  },

  mounted () {
    this.socket = io()
    this.socket.emit('join', this.room)

    this.socket.on('user joined', data => {
      console.log('user joined', data)
      this.onlineUsers = data.roomCount - 1
      if (this.master) {
        this.emitViewVideo()
      }
    })

    this.socket.on('user leaving', data => {
      console.log('user leaving', data)
      this.onlineUsers = data.roomCount - 1
    })

    this.socket.on('player', this.updatePlayer)

    const { protocol, host } = window.location
    this.shareUrl = `${protocol}//${host}/${this.room}`
  },

  methods: {
    setMasterVideo () {
      this.master = true
      this.video.id = this.$youtube.getIdFromUrl(this.video.url)
      this.emitViewVideo()
    },

    emitViewVideo () {
      this.socket.emit('player', {
        room: this.room,
        action: 'view',
        video: this.video
      })
    },

    ready () {
      // seek and pause on video ready
      this.player.seekTo(0, true)
      this.player.pauseVideo()
    },

    playing (e) {
      if (this.master) {
        this.socket.emit('player', {
          room: this.room,
          action: 'play',
          currentTime: e.getCurrentTime(),
          timestamp: serverTime.now()
        })
      }
    },

    paused () {
      if (this.master) {
        this.socket.emit('player', {
          room: this.room,
          action: 'pause'
        })
      }
    },

    async updatePlayer (data) {
      console.log(data)
      switch (data.action) {
        case 'view':
          this.master = false
          this.video.id = data.video.id
          this.video.url = data.video.url
          this.ready()
          break
        case 'play':
          await this.player.playVideo()
          const networkDelayTime = this.getNetworkDelayTime(data.timestamp)
          const targetTime = data.currentTime + networkDelayTime
          this.player.seekTo(targetTime)
          break
        case 'pause':
          this.player.pauseVideo()
          break
      }
    },

    getNetworkDelayTime (timestamp) {
      const delay = (serverTime.now() - timestamp) / 1000
      console.log('network delay', delay)
      return delay
    }
  }
}
</script>