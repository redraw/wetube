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
        <span v-if="video.id" :class="['tag is-danger' ? master : 'tag']">{{ master ? 'master' : 'guest' }}</span>
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
          autoplay: 1
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
      // this.player.pauseVideo()
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
      var self = this
      // pause video after 200ms ready (set to autoplay to buffer beggining)
      setTimeout(() => { self.player.pauseVideo() }, 200)
    },

    playing (e) {
      if (this.master) {
        this.socket.emit('player', {
          room: this.room,
          action: 'play',
          currentTime: e.getCurrentTime(),
          timestamp: new Date().getTime()
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

    updatePlayer (data) {
      console.log(data)
      switch (data.action) {
        case 'view':
          this.master = false
          this.video.id = data.video.id
          this.video.url = data.video.url
          this.player.pauseVideo()
          break
        case 'play':
          const networkDelayTime = this.getNetworkDelayTime(data.currentTime)
          const targetTime = data.currentTime + networkDelayTime
          this.player.seekTo(targetTime, true)
          this.player.playVideo()
          break
        case 'pause':
          this.player.pauseVideo()
          break
      }
    },

    getNetworkDelayTime (timestamp) {
      const t = new Date().getTime() - timestamp
      console.log('network delay', t)
      return t
    }
  }
}
</script>