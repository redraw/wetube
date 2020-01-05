<template>
  <div>
    <section class="level centered">
      <div class="field has-addons">
        <div class="control">
          <input class="input" type="text" v-model="video.url" placeholder="youtube url">
        </div>
        <div class="control">
          <a class="button is-info" @click="setVideo">
            add
          </a>
        </div>
      </div>
      <p>
        <span>share: <a :href="shareUrl" target="_blank">{{ shareUrl }}</a></span>
        <span v-if="video.id && master" class="tag is-danger">you are master!</span>
      </p>
      <p>users: <span :class="{'has-text-success': count > 1 }">{{ count - 1 }}</span></p>
    </section>
    <youtube 
      v-if="video.id"
      ref="youtube" 
      class="video"
      :video-id="video.id"
      fit-parent
      @playing="playing"
      @paused="paused"
    />
  </div>
</template>

<script>
import io from 'socket.io-client'

export default {
  data () {
    return {
      room: this.$route.params.room,
      count: 1,
      master: false,
      socket: null,
      shareUrl: '',
      video: {
        url: '',
        id: ''
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
      this.count = data.roomCount
      if (this.master) {
        this.emitViewVideo()
      }
    })

    this.socket.on('user leaving', data => {
      console.log('user leaving', data)
      this.count = data.roomCount
    })

    this.socket.on('player', this.updatePlayer)

    const { protocol, host } = window.location
    this.shareUrl = `${protocol}//${host}/${this.room}`
  },

  methods: {
    setVideo () {
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

    playing (e) {
      if (this.master) {
        this.socket.emit('player', {
          room: this.room,
          action: 'play',
          currentTime: e.getCurrentTime()
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
          break
        case 'play':
          this.player.seekTo(data.currentTime)
          this.player.playVideo()
          break
        case 'pause':
          this.player.pauseVideo()
          break
      }
    }
  }
}
</script>