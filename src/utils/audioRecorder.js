export default class AudioRecorder {
    constructor(options) {
        this.container = options.container || document.body
        this.width = window.getComputedStyle(this.container).width.replace('px', '')
        this.height = window.getComputedStyle(this.container).height.replace('px', '')
        this.globalAngle = 0;
        this.canvas = null
        this.ctx = null

        this.audioContext = null
        this.analyser = null
        this.recorder = null
        this.isRecording = false
        this.mediaStream = null

        this.defaultSetting = {
            centerX: 0.5,
            centerY: 0.5,
            lineWidth: 6,
            lineSpacing: 2,
            lineColor: '#409EFF',
            lineColorO: 1,
            shadowColor: '#fff',
            shadowColorO: 1,
            shadowBlur: 2,
            isRound: true,
            fftSize: 256,
        }

        this.options = Object.assign({}, this.defaultSetting, options)

        this.initCanvas()
        this.initRecorder()
    }
    initCanvas() {
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.width
        this.canvas.height = this.height
        this.cw = this.canvas.width
        this.ch = this.canvas.height
        this.ctx = this.canvas.getContext('2d')
        this.container.appendChild(this.canvas)
    }
    async initRecorder() {
        if (!navigator.mediaDevices || !(window.AudioContext || window.webkitAudioContext)) {
            console.error('不支持录音功能');
            return;
        }
        if (this.audioContext) {
            // 关闭先前的录音实例，因为前次的实例会缓存少量前次的录音数据
            this.destroy();
        }
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });
        this.analyser = this.audioContext.createAnalyser();  // 录音分析节点
        this.analyser.fftSize = this.options.fftSize;                   // 表示存储频域的大小
        let createScript = this.audioContext.createScriptProcessor || this.audioContext.createJavaScriptNode;
        this.recorder = createScript.apply(this.audioContext, [4096, 1, 1]);
        // 设置音频处理回调
        this.recorder.onaudioprocess = (e) => {
            this.options.onaudioprocess?.(e);
        };
    }
    start() {
        if (this.isRecording) {
            return;
        }
        this.initRecorder()
        this.isRecording = true
        return navigator.mediaDevices.getUserMedia({
            audio: true
        }).then(stream => {
            this.audioInput = this.audioContext.createMediaStreamSource(stream);
            this.mediaStream = stream
        }).then(() => {
            // 5. 正确连接节点链
            this.audioInput.connect(this.analyser);
            this.analyser.connect(this.recorder);
            this.recorder.connect(this.audioContext.destination);
        })
    }

    stop() {
        if (!this.recorder) {
            console.log('找不到录音器')
            return
        }
        this.isRecording = false
        this.recorder.disconnect();
        this.audioInput && this.audioInput.disconnect();
    }
    destroy() {
        if (this.mediaStream && this.mediaStream.getTracks) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext && this.audioContext.close && this.audioContext.state !== 'closed') {
            return this.audioContext.close();
        } else {
            return new Promise((resolve) => {
                resolve();
            });
        }
    }
    /**
     *  获取实时buffer数据
     * **/
    getBuffer() {
        const { analyser } = this
        let bufferLen = analyser.frequencyBinCount
        let buffer = new Uint8Array(bufferLen)
        // // 获取时间域数据（波形图）
        // analyser.getByteTimeDomainData(buffer);
        // 获取频域数据（频谱图）
        analyser.getByteFrequencyData(buffer)
        return buffer
    }
    /**
     * 颜色转换为rgb数组
     * */
    colorToRGB(color) {
        if (color.length !== 7 && !color.startsWith('#')) return [0, 0, 0]
        let rgb = []
        color = color.replace('#', '')
        for (let i = 0; i < 3; i++) {
            rgb.push(parseInt(color.substring(i * 2, i * 2 + 2), 16))
        }
        return rgb
    }
    /***
     * 绘制平行频谱图
     * @param {*} buffer 音频数据
     * */
    draw(buffer) {
        const { ctx, cw, ch } = this
        const { lineColor, lineColorO, shadowColor, shadowColorO, shadowBlur, lineWidth, lineSpacing, isRound } = this.options

        let cx = this.cw * this.options.centerX
        let cy = this.ch * this.options.centerY
        let sp = (lineWidth + lineSpacing) / 2
        ctx.clearRect(0, 0, cw, ch)
        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.shadowBlur = shadowBlur
        ctx.strokeStyle = `rgba(${this.colorToRGB(lineColor).join(',')}, ${lineColorO})`
        ctx.shadowColor = `rgba(${this.colorToRGB(shadowColor).join(',')}, ${shadowColorO})`
        if (isRound) {
            ctx.lineCap = "round"
        } else {
            ctx.lineCap = "butt"
        }
        for (let i = 0; i < buffer.length; i++) {
            let h = buffer[i] + 1
            let xl = cx - i * (lineWidth + lineSpacing) - sp
            let xr = cx + i * (lineWidth + lineSpacing) + sp
            let y1 = cy - h / 2
            let y2 = cy + h / 2
            ctx.moveTo(xl, y1)
            ctx.lineTo(xl, y2)
            ctx.moveTo(xr, y1)
            ctx.lineTo(xr, y2)
        }
        ctx.stroke()
        ctx.closePath()
    }
    //  实时录音绘制波形
    refreshUI() {
        if (!this.isRecording) return
        // 获取音频数据
        let buffer = this.getBuffer()
        //  降低音波高度
        buffer = buffer.map(e => e / 4)
        this.draw(buffer)
        requestAnimationFrame(this.refreshUI.bind(this))
    }
}