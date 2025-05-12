<template>
  <el-select v-model="value" :placeholder="placeholder" @change="handleChange" @visible-change="handleVisibleChange">
    <el-option v-for="(item, index) in list" :label="item.name" :value="item.uuid" :key="item.uuid">
      <div class="option-item">
        <el-tooltip popper-class="box-item" placement="left" style="background-color: #3e4854;">
          <template #content>
            <div class="content">
              <img :src="item.avatar" title="头像" alt="头像" />
              <div class="text">
                <div class="name">{{ item.name }}</div>
                <div class="description">{{ item.description }}</div>
              </div>
            </div>
          </template>
          <span>{{ item.name }}</span>
        </el-tooltip>
      </div>
    </el-option>
    <el-option value="">
      <div v-if="!showInput" style="display: flex; justify-content: center; align-items: center;"
        @click="handleAddUuid">
        <img src="@/assets/icon/add.png" style="width: 20px; height: 20px;" />
        <span>添加更多角色</span>
      </div>
      <div v-else style="display: flex; align-items: center; gap: 8px;height: 100%;">
        <el-input v-model="newUuid" placeholder="请输入角色ID" size="small" @click.stop.native />
        <el-button type="primary" size="small" @click="confirmAddRole">确认</el-button>
      </div>
    </el-option>
  </el-select>
</template>

<script setup>
import { computed, ref, watch } from "vue"
const emit = defineEmits(['update:modelValue', 'add'])
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  placeholder: {
    type: String,
    default: '请选择角色'
  },
  list: {
    type: Array,
    default: () => []
  }
})
const newUuid = ref('')
const showInput = ref(false)

const value = computed({
  get() {
    return props.modelValue?.uuid
  },
  set(val) {
    if (!val) return
    console.log(' 更新', val)
    let item = props.list.find(item => item.uuid === val)
    emit('update:modelValue', item); // 触发自定义事件
  }
})
const handleAddUuid = () => {
  event.stopPropagation()
  event.preventDefault()
  // 手动添加uuid
  showInput.value = true
}
const handleVisibleChange = () => {
  showInput.value = false

}
const handleChange = (val) => {
  value.value = val
}
const confirmAddRole = () => {
  // 确认添加uuid
  emit('add', newUuid.value)
  newUuid.value = ''
}

</script>

<style scoped>
.box-item.el-popper.is-dark {
  background-color: #3e4854;
  color: #eee;
  border: 1px solid #3e4854;


}

.box-item.el-popper.is-dark .content {
  width: 300px;
  display: flex;


}

.box-item.el-popper.is-dark .content img {
  width: 74px;
  height: 98px;
  border-radius: 8px;
  margin: 10px;
  margin-left: 0px;
}

.box-item.el-popper.is-dark .content .text {
  flex: 1;
}

.box-item.el-popper.is-dark .content .name {
  width: 100%;
  font-size: 16px;
  padding: 10px 0px 6px;
  border-bottom: 1px solid #eeeeee66;
  margin-bottom: 6px;
}

.box-item.el-popper.is-dark>.el-popper__arrow:before {
  border: 1px solid #3e4854;
  background-color: #3e4854;
}
</style>
