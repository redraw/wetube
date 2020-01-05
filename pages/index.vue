<template>
  <div></div>
</template>

<script>
export default {
  mounted () {
    const channel = Math.random().toString(36).slice(2)
    console.log(channel)
    this.$router.push({ path: channel })
  }
}
</script>