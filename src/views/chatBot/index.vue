<!-- 语音实时交互 -->
<template>
  <div class="chat-bot" ref="voiceInteractionBoxRef">
    <div class="audio-header">
      <div class="audio-header-left">
        <el-button type="text" @click="handleDownloadDemo">下载DEMO开源代码</el-button>
      </div>
      <div class="audio-header-right">
        <span>API KEY：</span>
        <el-input v-model="apiKey" type="password" placeholder="请输入api key" style="width: 350px;margin-right: 10px;"
          show-password />
        <el-button v-if="socket && socket.wsState === 2" type="primary" @click="handledisconnectApiKey">断开连接</el-button>
        <el-button v-else type="primary" :loading="socketLoading" @click="handleSaveApiKey">连接</el-button>
        <!-- 历史记录按钮 -->
        <IconButton tip="删除历史记录" name="delete" @click="handleDeleteHistory()">
        </IconButton>
        <IconButton tip="历史记录" :active="isHistoryVisible" name="history" @click="handleChangeHeaderIcon('history')">
        </IconButton>
        <!-- 历史记录弹窗 -->
        <ChatHistory v-model="isHistoryVisible" :token="paramsData.session_token" />
        <!-- 角色设置按钮 -->
        <IconButton tip="角色设置" :active="isRoleSettingVisible" name="role-setting"
          @click="handleChangeHeaderIcon('role-setting')">
        </IconButton>
        <!-- 角色设置弹窗 -->
        <el-drawer v-model="isRoleSettingVisible" direction="rtl" title="角色设置" :append-to-body="false"
          :lock-scroll="false">
          <el-form :model="roleData" label-width="auto" style="max-width: 600px;">
            <el-form-item label="角色选择">
              <CustomSelect v-model="roleData.character" :list="characterList" @add="handleAddCharacter" />
            </el-form-item>
            <el-form-item label="用户人设">
              <CustomSelect v-model="roleData.user" :list="userList" @add="handleAddUser" />
            </el-form-item>
          </el-form>
        </el-drawer>
        <!-- 功能设置按钮 -->
        <IconButton tip="功能设置" :active="isFunctionSettingVisible" name="function-setting"
          @click="handleChangeHeaderIcon('function-setting')">
        </IconButton>
        <!-- 功能设置弹窗 -->
        <el-drawer v-model="isFunctionSettingVisible" direction="rtl" title="功能设置" :append-to-body="false"
          :lock-scroll="false">
          <el-form :model="paramsData" label-width="120px" style="max-width: 600px" label-position="left">
            <el-form-item label="情绪识别">
              <el-switch v-model="paramsData.emotion_output"
                style="--el-switch-on-color: #45d430; --el-switch-off-color:  #7d7d7d" />
            </el-form-item>
            <el-form-item label="llm模型">
              <el-select class="select" v-model="paramsData.llm_model" placeholder="请选择llm模型">
                <el-option v-for="(item, index) in llmModleList" :label="item.name" :value="item.value" :key="index" />
              </el-select>
            </el-form-item>
            <el-form-item label="语种">
              <el-select class="select" v-model="paramsData.language" placeholder="请选择语种">
                <el-option v-for="(item, index) in languageList" :label="item.name" :value="item.value" :key="index" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-drawer>
      </div>
    </div>
    <!--主内容区 -->
    <div class="main-content-box">
      <div class="main-content-box">
        <div class="main-content-center">
          <!-- 智能体图像 -->
          <AvatarRole :type="getCharacterAvater.type" :active="curVoiceRole === 'agent'" :url="getCharacterAvater.url">
          </AvatarRole>
          <!-- 用户人设图像 -->
          <AvatarRole :type="getUserAvater.type" :active="curVoiceRole === 'user'" :url="getUserAvater.url">
          </AvatarRole>
          <!-- 语音输入 -->
          <div class="audio-input-box">
            <div ref="waveRef" class="voice-wave"></div>
            <div class="click-talk-btn">
              <div v-if="!isTalk" @click="handleStartTalk">点击开始说话</div>
              <div v-else @click="handleStopTalk">点击停止</div>
            </div>
          </div>
        </div>
        <div class="text-content-box">
          <!--  用户输入 -->
          <div class="text-card text-input-box" :class="curVoiceRole === 'user' ? 'active-input' : 'inactive-input'">
            <el-input class="input" v-model="input" :rows="3" type="textarea" clearable
              @keyup.enter.exact="handleSendText" @keydown="messageKeydown" />
            <div class="send-btn" v-if="curVoiceRole === 'user'">
              <el-text size="small" type="info">[Shift+Enter] = 换行，[Enter] = 发送信息</el-text>&nbsp;
              <el-button :loading="sendLoading" type="primary" @click="handleSendText">&nbsp;发送</el-button>
            </div>
          </div>
          <!-- 智能体回答 -->
          <div class="text-card text-output-box" :class="curVoiceRole === 'agent' ? 'active-input' : 'inactive-input'">
            <el-input class="input" v-model="output" :rows="3" type="textarea" readonly clearable />
            <div class="send-btn">
              <el-button v-show="AgentState === 'active' || isAudioPlaying" color="#ff4040" type="primary"
                @click="handleInterruption">
                <div style="background-color: #fff;width:10px;height: 10px;border-radius: 2px;"></div>&nbsp;打断
              </el-button>
            </div>
          </div>
        </div>
        <!-- 智能体音频 -->
        <audio ref="audioPlayer"></audio>
      </div>
    </div>

  </div>
</template>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import IconButton from './components/IconButton.vue'
import AvatarRole from './components/AvatarRole.vue'
import CustomSelect from './components/CustomSelect.vue'
import ChatHistory from './components/chatHistory.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSessionList, AddSessionList, deleteHistory, getHistoryList, getCharacterList, getUserList } from '@/api/index.js'
import WebSocketClient from '@/utils/socket.js'
import AudioRecorder from '@/utils/audioRecorder.js'
// /**********************************设置事件***************************************************/
const apiKey = ref(sessionStorage.getItem('apiKey') || '')


const characterIds = ref(JSON.parse(sessionStorage.getItem('characterIds')) || ['mc20250326a54kf', 'mc20250408a77ds', 'mc20250326a55zt', 'mc20250326a48zr', 'mc20250326a47qi', 'mc20250326a46oj'])
const userIds = ref(JSON.parse(sessionStorage.getItem('userIds')) || ['mc20250327a58srl', 'mc20250416a13jou', 'mc20250327a58ckf', 'mc20250327a58ies', 'mc20250327a58jlg', 'mc20250327a58qqm'])
const characterList = ref([])
const userList = ref([])
const isHistoryVisible = ref(false)
const isFunctionSettingVisible = ref(false)
const isRoleSettingVisible = ref(false)
const paramsData = ref({
  session_token: '',
  emotion_output: true,
  llm_model: 'abab6.5s-chat',
  language: 'auto'
})
const llmModleList = ref([
  { name: '智谱 GLM-4-Air 模型', value: 'GLM-4-Air' },
  { name: '豆包 Doubao-1.5-lite-32k 模型', value: 'Doubao-1.5-lite-32k' },
  { name: 'MiniMax abab6.5s-chat 模型', value: 'abab6.5s-chat' }
])
const languageList = ref([
  { name: '自动检测', value: 'auto' },
  { name: '中文', value: 'zh' },
  { name: '英文', value: 'en' },
  { name: '日语', value: 'ja' },
  { name: '韩语', value: 'ko' },
  { name: '粤语', value: 'yue' }
])
const roleData = ref({
  character: JSON.parse(sessionStorage.getItem('character')) || {},
  user: JSON.parse(sessionStorage.getItem('user')) || {}
})
const curVoiceRole = ref('user')

const waveRef = ref(null)
const isTalk = ref(false)
const audioPlayer = ref(null) // 音频播放器
const isAudioPlaying = ref(false) // 是否正在播放音频
const audioSourceList = ref([]) // 接收的音频流
const emotion = ref('neutral')
const AgentState = ref('')// // stop智能体已停止 |asr 智能体语音识别|invalid 智能体无识别|active智能体正在回答|error 智能体未初始化
const input = ref('')
const output = ref('')
const sendLoading = ref(false)

let socket = ref(null)
let socketLoading = ref(false)
/********************************** 生命周期 **********************************/
onMounted(() => {
  initAudioPlayer()
  initRecorder()
  if (apiKey.value) {
    initWebSocket()
  }
})
onUnmounted(() => {
  socket.value?.disconnect()
})
/*************************************WebSocket******************************************************/
const initWebSocket = () => {
  socket.value = new WebSocketClient({
    onMessage: (e) => {
      switch (e.socket_status) {
        case 1004:
          //  智能体语音识别
          AgentState.value = 'asr';
          const text = e.socket_data.text
          input.value = text ? text : ''
          break;
        case 1006:
          // 智能体关闭，回答结束
          AgentState.value = 'stop';
          break;
        case 1007:
          // 智能体返回数据
          AgentState.value = 'active';
          const output_type = e.socket_data.agent_output.output_type
          switch (output_type) {
            case 'emotion':
              //  情绪识别
              emotion.value = e.socket_data.agent_output.emotion_output
              break;
            case 'llm':
              // 文字
              output.value += e.socket_data.agent_output.llm_response || ""
              break;
            case 'tts':
              //  语音
              audioSourceList.value.push(e.socket_data.agent_output.tts_audio)
              startAudioPlayer()
              break;
          }
          break;
        case 1008:
          //连接成功
          ElMessage({
            message: 'websocket连接成功',
            type: 'success',
          })
          socketLoading.value = false
          socket.value.wsState = 2
          //  连接成功请求角色数据
          getSession()
          initCharacter()
          break;
        case 2003:
          // apikey错误
          ElMessage({
            message: 'apikey 错误',
            type: 'error',
          })
          socketLoading.value = false
          apiKey.value = ''
          sessionStorage.removeItem('apiKey')
          socket.value.disconnect()
          break;
        case 3001:
          // 无识别内容
          ElMessage.error(e.socket_data?.error)
          break;
        case 3002:
          // 余额不足
          ElMessageBox.error('积分不足')
          break;
        case 4006:
          ElMessage.error(e.socket_data?.message)
          break;
      }
    }
  })
  socket.value.connect(apiKey.value)
}
const handleSaveApiKey = () => {
  if (!apiKey.value) {
    ElMessage({
      message: '请输入apiKey',
      type: 'warning',
    })
    return
  }
  sessionStorage.setItem('apiKey', apiKey.value)
  socketLoading.value = true
  initWebSocket()

}
const handledisconnectApiKey = () => {
  //  断开连接
  if (socket.value && socket.value.wsState === 2) {
    socket.value.disconnect()
    sessionStorage.removeItem('apiKey')
    ElMessage({
      message: '已断开连接',
      type: 'success',
    })
  }
}
/*************************************智能体发送*******************************************************/
const stopASR = async () => {
  //  停止语音上传
  socket.value.send({
    socket_type: "intervent_event",
    event_name: "stream_asr"
  });
}

const startAgent = async () => {
  //  开启智能体
  socket.value.send({
    socket_type: 'agent_event',
    event_name: 'agent_action',
    event_params: {
      asr_text: input.value,
      agent_name: "chat_bot_v3",
      upload_format: "pcm",
      upload_sample_rate: 16000,
      mode: "pro",
      emotion_output: paramsData.value.emotion_output,
      speed: 1,
      llm_model: paramsData.value.llm_model,
      profile_uuid: roleData.value.user.uuid,
      character_uuid: roleData.value.character.uuid,
      max_tokens: 100,
      session_token: paramsData.value.session_token,
      language: paramsData.value.language,
    }
  })
}
const stopAgent = async () => {
  // 停止智能体
  socket.value.send({
    socket_type: "intervent_event",
    event_name: "stream_output"
  });
}

/*************************************对话房间******************************************************/
const getSession = () => {
  // 获取对话列表
  getSessionList().then(res => {
    //  如果对话列表不为空，则拿第一个对话的session_token做为智能体的参数，使智能体的对话能联系上下文
    if (res.results.length > 0) {
      paramsData.value.session_token = res.results[0].session_token
    } else {
      //  没有对话列表则创建一个
      addSession()
    }
  })
}
const addSession = () => {
  // 新增对话列表
  AddSessionList().then(res => {
    paramsData.value.session_token = res.data.session_token
  })
}
/*************************************录音相关******************************************************/
let recorder
//  初始化录音器
const initRecorder = async () => {
  try {
    recorder = new AudioRecorder({
      container: waveRef.value,
      onaudioprocess: (e) => {
        // 获取实时音频数据,发送给服务器
        const channelData = e.inputBuffer.getChannelData(0);
        const pcmData = convertFloat32ToInt16(channelData)
        socket.value.send(pcmData)
      }
    })
  } catch (error) {
    ElMessage({
      message: '录音器初始化失败',
      type: 'error',
    })
  }
}
//  音频数据转pcm格式
function convertFloat32ToInt16(buffer) {
  const length = buffer.length;
  const int16Array = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    // 将[-1, 1]的float32转换为16位有符号整数
    const s = Math.max(-1, Math.min(1, buffer[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}
const startRecorder = async () => {
  //  开始录音
  try {
    await recorder.start()
    //  绘制音波
    recorder.refreshUI()
    isTalk.value = true
  } catch (error) {
    console.log(error)
  }
}
const stopRecorder = async () => {
  try {
    //  停止录音
    await recorder.stop();
    //  改变按钮状态
    isTalk.value = false
  } catch (error) {
    console.log(error)
  }
}
/************************************音频播放相关*********************************************/
const initAudioPlayer = () => {
  // 设置播放器
  if (audioPlayer.value) {
    audioPlayer.value.autoplay = true;
    audioPlayer.value.loop = false;//禁止循环，否则无法触发ended事件
    //  设置监听器
    audioPlayer.value.addEventListener('ended', () => {
      isAudioPlaying.value = false;
      //  播放下一段音频
      startAudioPlayer();
    });
  }
}
function startAudioPlayer() {
  // 开发播放音频
  if (isAudioPlaying.value || audioSourceList.value.length === 0) return
  isAudioPlaying.value = true
  const source = audioSourceList.value.shift()
  if (audioPlayer.value && source) {
    let sourceDOM = document.createElement("source");
    sourceDOM.src = source
    audioPlayer.value.appendChild(sourceDOM)
    audioPlayer.value.src = source
    // 播放音频
    audioPlayer.value.play().catch((err) => {
      console.error('播放失败:', err);
      isAudioPlaying.value = false; // 播放失败时重置状态
    });
  }
}
const stopAudioPlayer = () => {
  // 结束播放音频
  if (!audioPlayer.value) return
  audioPlayer.value.src = ''
  audioPlayer.value.pause();
  audioSourceList.value = []
  isAudioPlaying.value = false;
}
watch(() => isAudioPlaying.value, (newVal, oldVal) => {
  if (AgentState.value !== 'stop') return
  if (newVal === false && oldVal === true) {
    //  当结束音频时，则转化为user
    curVoiceRole.value = 'user'
    output.value = ''
  }
})
/****************************************角色处理*********************************************/
const initCharacter = () => {
  getCharacter().then(res => {
    if (JSON.stringify(roleData.value.character) === '{}' && characterList.value.length > 0) {
      roleData.value.character = characterList.value[0]
    }
  })
  getUser().then(res => {
    if (JSON.stringify(roleData.value.user) === '{}' && userList.value.length > 0) {
      roleData.value.user = userList.value[0]
    }
  })
}
// 获取角色列表
const getCharacter = () => {
  //  去重
  let uuids = Array.from(new Set(characterIds.value))
  const params = {
    uuids: JSON.stringify(uuids),
    is_visible: true
  }
  return new Promise((resolve, reject) => {
    getCharacterList(params).then(res => {
      let list = res.result.filter(e => JSON.stringify(e) !== '{}')
      //  更新有效的uuid
      characterIds.value = list.map(e => e.character_uuid)
      sessionStorage.setItem('characterIds', JSON.stringify(characterIds.value))
      characterList.value = list.map(e => ({
        ...e,
        name: e.character_name,
        avatar: e.character_visualDesign?.animation_assets?.neutral,
        uuid: e.character_uuid,
        description: e.character_basicInfo?.description
      }))
      if (list.length !== res.result.length) {
        reject({})
      } else {
        resolve({})
      }
    })
  })
}
const handleAddCharacter = (val) => {
  characterIds.value.push(val)
  getCharacter().then(res => {
    ElMessage({
      message: '添加成功',
      type: 'success',
    })
  }).catch(err => {
    ElMessage({
      message: '无效的角色Id',
      type: 'warning',
    })
  })
}
// 获取用户列表
const getUser = () => {
  // 去重
  const uuids = Array.from(new Set(userIds.value))
  const params = {
    uuids: JSON.stringify(uuids),
    is_visible: true
  }
  return new Promise((resolve, reject) => {
    getUserList(params).then(res => {
      let list = res.result.filter(e => JSON.stringify(e) !== '{}')
      //  更新有效的uuid
      userIds.value = list.map(e => e.user_uuid)
      sessionStorage.setItem('userIds', JSON.stringify(userIds.value))
      userList.value = list.map(e => ({
        ...e,
        name: e.user_name,
        avatar: e.user_visualDesign?.animation_assets?.default,
        uuid: e.user_uuid,
        description: e.user_basicInfo?.description
      }))
      if (list.length !== res.result.length) {
        reject({})
      } else {
        resolve({})
      }
    })
  })
}
const handleAddUser = (val) => {
  userIds.value.push(val)
  getUser().then(res => {
    ElMessage({
      message: '添加成功',
      type: 'success',
    })
  }).catch(err => {
    ElMessage({
      message: '无效的角色Id',
      type: 'warning',
    })
  })
}

watch(() => roleData.value.character, (val) => {
  sessionStorage.setItem('character', JSON.stringify(val))
})
watch(() => roleData.value.user, (val) => {
  sessionStorage.setItem('user', JSON.stringify(val))
})

const getCharacterAvater = computed(() => {
  //  获取头像
  const emotionList = roleData.value.character?.character_visualDesign?.animation_assets || {}
  if (Object.keys(emotionList).length !== 0) {
    if (emotionList[`${emotion.value}_gif`]) {
      // 优先显示动图
      return { type: 'video', url: emotionList[`${emotion.value}_gif`] }
    } else if (emotionList[emotion.value]) {
      // 没有动图，则显示静态图
      return { type: 'image', url: emotionList[emotion.value] }
    } else {
      //  没有指定的表情的静态图，则使用neutral图
      return { type: 'image', url: emotionList['neutral'] }
    }
  } else {
    return { type: 'image', url: '' }
  }
})
//  获取用户头像
const getUserAvater = computed(() => {
  const assets = roleData.value.user.user_visualDesign?.animation_assets
  if (assets?.default_gif) {
    return { type: 'video', url: assets?.default_gif }
  } else {
    return { type: 'image', url: assets?.default }
  }
})
/*****************************************按钮事件*****************************************************/
const handleDeleteHistory = () => {
  if (paramsData.value.session_token) {
    ElMessageBox.confirm("此操作将永久删除历史记录, 是否继续?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }).then(() => {
      deleteHistory({ session_token: paramsData.value.session_token }).then(res => {
        ElMessage({
          message: '删除成功',
          type: 'success',
        })
      })
    })

  }
}
//  点击打开设置弹窗
const handleChangeHeaderIcon = (val) => {
  isRoleSettingVisible.value = false
  isFunctionSettingVisible.value = false
  isHistoryVisible.value = false
  switch (val) {
    case 'role-setting':
      isRoleSettingVisible.value = true
      break;
    case 'function-setting':
      isFunctionSettingVisible.value = true
      break;
    case 'history':
      isHistoryVisible.value = true
      break;
  }
}
//  点击开始说话
const handleStartTalk = () => {
  if (!socket.value || socket.value.wsState !== 2) {
    ElMessage.error('服务器未初始')
    return
  }
  curVoiceRole.value = 'user'
  input.value = ''
  output.value = ''
  stopAgent()
  stopAudioPlayer()
  startRecorder()
  startAgent()
}
//  点击结束说话
const handleStopTalk = () => {
  stopRecorder()
  stopASR()
  //  停止智能体语音识别后,可能还会返回语音识别的内容，所以需要延迟切换
  setTimeout(() => {
    curVoiceRole.value = 'agent'
    input.value = ''
  }, 1000);
}
// 键盘事件
const messageKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
  }
}
// 点击发送
const handleSendText = async () => {
  if (!socket.value || socket.value.wsState !== 2) {
    ElMessage.error('服务器未初始')
    return
  }
  if (!sendLoading.value) {
    if (input.value === '') {
      ElMessage({
        message: '说点什么吧~',
        type: 'warning'
      })
      return
    }
    sendLoading.value = true
    if (isTalk.value) {
      await stopRecorder()
      stopASR()
    }
    curVoiceRole.value = 'agent'
    startAgent()
    input.value = ''
    setTimeout(() => {
      sendLoading.value = false
    }, 2000)
  }
}
//  点击中断
const handleInterruption = () => {
  curVoiceRole.value = 'user'
  output.value = ''
  stopAgent()
  stopAudioPlayer()
}

//   下载源码
const handleDownloadDemo = () => {
  window.open('https://www.mindcraft.com.cn/#/#smartVoice')
}
</script>
<style scoped>
@import url('./index.css');
</style>