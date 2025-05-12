import { ElMessage } from "element-plus";
const noop = () => { };

class WebSocketClient {
    constructor(options) {
        this.token = "";
        this.options = options;
        this.ws = null;
        // 接口列表
        // 连接状态 0:未连接 1:连接中 2:已连接
        this.wsState = 0;
        // 重连次数
        this.reconnectCount = 0;
        // 重连频率
        this.reconnectTime = 1000;
        // 重连定时器
        this.reconnectTimer = null;
    }
    // 连接
    connect(token) {
        this.token = token;
        if (!this.token) {
            console.warn('未获取到登录信息');
            return;
        }
        try {
            if (this.wsState != 0) {
                throw '当前连接状态异常'
            }
            let wsURL = localStorage.getItem("wsURL") || 'wss://api.mindcraft.com.cn/socket-v1/';
            // 创建WebSocket连接
            this.ws = new WebSocket(wsURL + `?token=${this.token}`)
            // 设置WebSocket连接状态为1
            this.wsState = 1;
            // 绑定WebSocket连接成功事件
            this.ws.onopen = this.openSucc.bind(this);
            // 绑定WebSocket接收消息事件
            this.ws.onmessage = this.receiveMessage.bind(this);
            // 绑定WebSocket连接关闭事件
            this.ws.onclose = this.reconnect.bind(this);
            // 绑定WebSocket连接关闭事件
            this.ws.onerror = () => {
                // 绑定WebSocket连接错误事件
                console.log('websocket 连接发生了错误, 网络情况：' + navigator.onLine);
            }
        } catch (error) {
            console.log('为什么重连1')
            // 如果发生错误，则重新连接
            this.reconnect()

        }
    }
    // 重连
    reconnect() {
        this.wsState = 0;
        console.warn('ws连接关闭，正在尝试重连');
        if (this.reconnectCount < 30) {
            this.reconnectTimer = setTimeout(() => {
                console.warn(`ws重连中，第${this.reconnectCount}次尝试`);
                this.connect(this.token);
            }, this.reconnectTime);
            this.reconnectCount++;
            if (this.reconnectTime < 5000) {
                this.reconnectTime += 500;
            }
        } else {
            ElMessage.error('当前网络不佳')
        }
    }
    // 开启成功 
    openSucc() {
        this.wsState = 1;
        this.resetConnect()
    }
    // 重置状态
    resetConnect() {
        this.reconnectCount = 0;
        this.reconnectTime = 1000;
        clearTimeout(this.reconnectTimer);
    }
    //  发送消息
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            if (this.isBinary(message)) {
                this.ws.send(message);
            } else if (typeof message === 'string') {
                this.ws.send(message);
            } else {
                this.ws.send(JSON.stringify(message));
            }
        }
    }
    // 判断是否是二进制数据
    isBinary(data) {
        return (
            data instanceof ArrayBuffer ||
            (typeof Blob !== 'undefined' && data instanceof Blob) ||
            (ArrayBuffer.isView(data) && !(data instanceof DataView)) ||
            (typeof Buffer !== 'undefined' && data instanceof Buffer) 
        );
    }
    // 接收消息
    receiveMessage(res) {
        this.options.onMessage?.(JSON.parse(res.data));
    }
    // 断连
    disconnect() {
        try {
            console.log('断开连接')
            if (this.ws) {
                this.ws.onopen = noop;
                this.ws.onmessage = noop;
                this.ws.onclose = noop;
                this.ws.onerror = noop;
                this.ws.close();
            }
            this.wsState = 0
        } catch (error) {
            console.error('断开连接失败', error)
        }
    }
}
export default WebSocketClient;