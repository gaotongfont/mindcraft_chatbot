<template>
    <el-tooltip :content="tip" placement="bottom" effect="light">
        <img class="icon" :src="getImg(name)" :class="active ? 'active-icon' : 'inactive-icon'"
            :style="{ '--size': size, '--active-color': activeColor, '--inactive-color': inActiveColor, '--active-bg-color': activeBgColor }"
            @click.stop="handleClick" />
    </el-tooltip>
</template>
<script setup>
const emits = defineEmits(["click"])
const props = defineProps({
    name: {
        //  icon名称
        type: String,
        required: true,
        default: 'delete'
    },
    size: {
        //  icon大小
        type: String,
        required: false,
        default: '23px'
    },
    activeColor: {
        //  选中icon颜色
        type: String,
        required: false,
        default: '#409eff'
    },
    inActiveColor: {
        //  不选中icon颜色
        type: String,
        required: false,
        default: '#fff'
    },
    activeBgColor: {
        //  选中icon背景颜色
        type: String,
        required: false,
        default: '#fff'
    },
    active: {
        type: Boolean,
        required: false,
        default: false
    },
    tip: {
        type: String,
        default: '提示'
    }
});
const getImg = (img) => {
    if (props.active) {
        return new URL(`../../../assets/icon/${img}_active.png`, import.meta.url).href
    } else {
        return new URL(`../../../assets/icon/${img}.png`, import.meta.url).href
    }
}
const handleClick = () => {
    emits('click')
};
</script>

<style scoped>
.icon {
    width: var(--size);
    height: var(--size);
    margin: 6px;
    padding: 6px;
    cursor: pointer;
}

.active-icon {
    color: var(--active-color);
    background-color: var(--active-bg-color);
    border-radius: 8px;
}

.inactive-icon {
    color: var(--inactive-color);
    background-color: var(--inactive-bg-color);
}
</style>