import React, {Component} from 'react';
import './App.css';
import "@fontsource/montserrat";
import JMuxer from 'jmuxer';
import Modal from "react-modal";
import Settings from "./Settings";
import WebCam from "./webCam";


const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        minWidth: '50%',
        transform: 'translate(-50%, -50%)',
    },
};



const {ipcRenderer} = window;

class App extends Component {

    constructor(props) {
        super(props)
        this.state = {
            height: 0,
            width: 0,
            mouseDown: false,
            lastX: 0,
            lastY: 0,
            status: false,
            playing: false,
            frameCount: 0,
            fps: 0,
            start: null,
            videoDuration: 0,
            modalOpen: false,
            settings: {},
            running: false,
            webCam: false,
            lastFrame: new Date(),
            tStart: new Date(),
            vPlaying: false
        }
        this.chunks = [];
        this.sourceBuffer= null;
        this.mse = new (MediaSource)()
        console.log("mse", this.mse)

    }

    componentDidMount() {
        console.log("mounting")
        Modal.setAppElement(document.getElementById('main'));
        let fps = 60
        console.log(fps)
        fps = ipcRenderer.sendSync('fpsReq')
        console.log(fps)
        var video = document.getElementById('player');
        video.src = URL.createObjectURL(this.mse);
        this.mse.addEventListener('sourceopen', () => this.onMediaSourceOpen());

        var socketURL = 'ws://localhost:3001';

        var ws = new WebSocket(socketURL);
        ws.binaryType = 'arraybuffer';
        ws.addEventListener('message',(event) => {
            this.chunks.push(new Uint8Array(event.data));
            this.addMoreBuffer();
        });

        ws.addEventListener('error', function(e) {
            console.log('Socket Error');
        });

        const height = this.divElement.clientHeight
        const width = this.divElement.clientWidth
        // const canvas = document.querySelector("canvas");
        // const ctx = canvas.getContext("2d");
        // const video = document.querySelector("video");
        //
        // video.addEventListener('play', () => {
        //     function step() {
        //         ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        //         requestAnimationFrame(step)
        //     }
        //     requestAnimationFrame(step);
        // })
        this.setState({height, width}, () => {
            console.log(this.state.height, this.state.width)
        })

        ipcRenderer.send('getSettings')

        ipcRenderer.on('plugged', () => {
            this.setState({status: true, running: true})
        })
        ipcRenderer.on('unplugged', () => {
            this.setState({status: false})
        })
        ipcRenderer.on('allSettings', (event, data) => {
            console.log("updating all settings", data)
            this.setState({settings: data})
        })

        ipcRenderer.on('quitReq', () => {
            if(this.state.status) {
                this.setState({modalOpen: true})
            }
        })        // setInterval(() => {
        //     let player = document.getElementById('player')
        //     console.log(player.duration)
        //     console.log(player.currentTime)
        // }, 500)
        setInterval(() => this.remove(), 1000)

    }

    onMediaSourceOpen() {
        console.log(this.sourceBuffer)
        console.log(this.mse)
        this.sourceBuffer = this.mse.addSourceBuffer('video/mp4; codecs="avc1.4d401f"');
        this.sourceBuffer.addEventListener('updateend', () => this.addMoreBuffer());
        var video = document.getElementById('player');
        video.play();
    }

    remove() {
        let end = this.sourceBuffer.buffered
        if(end.length > 0) {
            end = end.end(0)
            if(end > 61 && (Math.floor(end) % 30 === 0)) {
                console.log('removing')
                let start = end -60
                let newEnd = end - 30
                //this.sourceBuffer.remove(start, newEnd)
            }
        }

    }

    addMoreBuffer() {
        if (this.sourceBuffer.updating || !this.chunks.length) {
            return;
        }
        this.sourceBuffer.appendBuffer(this.chunks.shift());
    }

    bufferCheck() {
        let player = document.getElementById('player')

        //console.log(new Date() - this.state.lastFrame)
        if(player.buffered.length > 0){
            let amount = player.buffered.end(0) - player.currentTime
            console.log(amount)
            if(amount < 0.1 && this.state.vPlaying) {
                console.log("pausing")
                this.setState({vPlaying: false})
                player.pause()
            } else if(amount > 0.1 && !(this.state.vPlaying)) {
                console.log("playing")
                this.setState({vPlaying: true})
                player.play()
            }
        }
    }

    pause() {
        let player = document.getElementById('player')
        player.pause()
    }

    changeValue(k, v) {
        ipcRenderer.send('settingsUpdate', {type: k, value: v})
    }

    render() {

        const openModal = () => {
            this.setState({modalOpen: true})
        }

        const closeModal = () => {
            this.setState({modalOpen: false})
        }

        const openWebCam = () => {
            this.setState({webCam: true})
        }

        const closeWebcam = () => {
            this.setState({webCam: false})
        }

        const reload = () => {
            ipcRenderer.send('reqReload')
        }

        const handleMDown = (e) => {
            //console.log("touched", e, e.target.getBoundingClientRect())
            let currentTargetRect = e.target.getBoundingClientRect();
            let x = e.clientX - currentTargetRect.left
            let y = e.clientY - currentTargetRect.top
            x = x / this.state.width
            y = y / this.state.height
            this.setState({lastX: x, lastY: y})
            this.setState({mouseDown: true})
            ipcRenderer.send('click', {type: 14, x: x, y: y})
        }
        const handleMUp = (e) => {
            //console.log("touched end", e)
            let currentTargetRect = e.target.getBoundingClientRect();
            let x = e.clientX - currentTargetRect.left
            let y = e.clientY - currentTargetRect.top
            x = x / this.state.width
            y = y / this.state.height
            this.setState({mouseDown: false})
            ipcRenderer.send('click', {type: 16, x: x, y: y})
        }


        const handleMMove = (e) => {
            //console.log("touched drag", e)
            let currentTargetRect = e.target.getBoundingClientRect();
            let x = e.clientX - currentTargetRect.left
            let y = e.clientY - currentTargetRect.top
            x = x / this.state.width
            y = y / this.state.height
            ipcRenderer.send('click', {type: 15, x: x, y: y})
        }

        const handleDown = (e) => {

            //console.log("touched", e, e.target.getBoundingClientRect())
            let currentTargetRect = e.target.getBoundingClientRect();
            let x = e.touches[0].clientX - currentTargetRect.left
            let y = e.touches[0].clientY - currentTargetRect.top
            x = x / this.state.width
            y = y / this.state.height
            this.setState({lastX: x, lastY: y})
            this.setState({mouseDown: true})
            ipcRenderer.send('click', {type: 14, x: x, y: y})
            e.preventDefault()
        }
        const handleUp = (e) => {

            //console.log("touched end", e)
            let currentTargetRect = e.target.getBoundingClientRect();
            let x = this.state.lastX
            let y = this.state.lastY
            this.setState({mouseDown: false})
            ipcRenderer.send('click', {type: 16, x: x, y: y})
            e.preventDefault()
        }

        const openCarplay = (e) => {
            this.setState({status: true})
        }
        const handleMove = (e) => {

            //console.log("touched drag", e)
            let currentTargetRect = e.target.getBoundingClientRect();
            let x = e.touches[0].clientX - currentTargetRect.left
            let y = e.touches[0].clientY - currentTargetRect.top
            x = x / this.state.width
            y = y / this.state.height
            ipcRenderer.send('click', {type: 15, x: x, y: y})
            //e.preventDefault()
        }

        const onWaiting = () => {
            console.log('paused')
        }

        const timer = () => {
            let player = document.getElementById('player')
            console.log(player.duration)
            console.log(player.currentTime)
        }

        const onError = () => {
            console.log('error')
        }

        const onStopped = () => {
            console.log('stopped')
        }

        const waiting = () => {
            let player = document.getElementById('player')
            if(player.currentTime > 0) {
                player.currentTime = player.currentTime - 0.10
            }
        }




        return (
            <div style={{height: '100%'}}  id={'main'}>

                <button onClick={openWebCam}>Show webCam </button>
                <div ref={(divElement) => {
                    this.divElement = divElement
                }}
                     className="App"
                     onTouchStart={handleDown}
                     onTouchEnd={handleUp}
                     onTouchMove={(e) => {
                         if (this.state.mouseDown) {
                             handleMove(e)
                         }
                     }}
                     onMouseDown={handleMDown}
                     onMouseUp={handleMUp}
                     onMouseMove={(e) => {
                         if (this.state.mouseDown) {
                             handleMMove(e)
                         }
                     }}
                     style={{height: '100%', width: '100%', padding: 0, margin: 0, display: 'flex'}}>
                    <video  style={{display: this.state.running ? "block" : "none"}} autoPlay onPause={() => console.log("paused")} onError={() => console.log("error")} onEnded={() => console.log("ended")} onPlay={() => console.log("playing")} onSuspend={() => console.log("suspended")}
                            onAbort={() => console.log("aborted")} onStalled={() => console.log("stalled")} onWaiting={() => console.log("waiting")} onEmptied={() => console.log("emptied")}
                            id="player" />
                    {this.state.status ? <div></div>
                        :
                        <div style={{marginTop: 'auto', marginBottom: 'auto', textAlign: 'center', flexGrow: '1'}}>
                            <div style={{marginTop: 'auto', marginBottom: 'auto', textAlign: 'center', flexGrow: '1'}}>CONNECT IPHONE TO BEGIN CARPLAY</div>
                            <button onClick={openModal}>Open Modal</button>
                            {this.state.running ? <button onClick={openCarplay}>Open Carplay</button> : <div></div>}
                        </div>
                    }
                </div>
                <Modal
                    isOpen={this.state.modalOpen}
                    // onAfterOpen={afterOpenModal}
                    onRequestClose={closeModal}
                    style={customStyles}
                    contentLabel="Example Modal"
                    ariaHideApp={true}
                >
                    <Settings settings={this.state.settings} changeValue={this.changeValue} reqReload={reload}/>
                </Modal>
                <Modal
                    isOpen={this.state.webCam}
                    // onAfterOpen={afterOpenModal}
                    onRequestClose={closeWebcam}
                    style={customStyles}
                    contentLabel="Example Modal"
                    ariaHideApp={true}
                >
                    <WebCam />
                </Modal>
            </div>
        );
    }
}

export default App;
