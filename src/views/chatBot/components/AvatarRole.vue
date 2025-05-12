<template>
    <div class="avater machine-avater">
        <video :class="active ? 'active-avater' : 'inactive-avater'" v-if="type === 'video'" :src="url" autoplay loop
            :controls="false" muted controlsList="nodownload" disablePictureInPicture></video>
        <img :class="active ? 'active-avater' : 'inactive-avater'" v-else-if="url !== ''" :src="url" />
        <div class="empty" :class="active ? 'active-avater' : 'inactive-avater'"  v-else></div>
    </div>
</template>

<script setup>
const props = defineProps({
    type: {
        type: String,
        default: 'image'
    },
    url: {
        type: String,
        default: ''
    },
    active: {
        type: Boolean,
        default: false
    }
})

</script>

<style scoped>
.avater {
    width: 256px;
    height: 342px;
    position: relative;
}

.avater img {
    width: 100%;
    height: 100%;
    border-radius: 25px;
}

.avater video {
    width: 100%;
    height: 100%;
    border-radius: 25px;
}

.active-avater {
    background: initial;
    opacity: 1;
    transform: scale(1.2);
    position: relative;
    z-index: 3;
    transition: transform .5s ease-in-out;
}

.inactive-avater {
    background: #4D4D4D;
    opacity: 0.87;
    position: relative;
    z-index: 1;
    filter: grayscale(10%) brightness(50%);
    transition: transform .5s ease-in-out, filter .5s ease-in-out;
}

.empty {
    width: 100%;
    height: 100%;
    background: #4D4D4D;
    opacity: 0.5;
    border-radius: 25px;
}
</style>