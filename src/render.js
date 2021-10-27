const { desktopCapturer } = require('electron');
const remote = require('@electron/remote')
const { Menu, dialog } = remote;
const { writeFile } = require('fs');
const { start } = require('repl');

////////////////////////
// TITLEBAR
////////////////////////

const win = remote.getCurrentWindow();

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
    }
};

window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        win.minimize();
    });

    document.getElementById('close-button').addEventListener("click", event => {
        win.close();
    });
}


////////////////////////
// VIDEO
////////////////////////

// Config
const videoType = "video/webm; codecs=vp9";
const videoFormat = "webm";

// Global
let mediaRecorder;
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector("video");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const videoSelectBtn = document.getElementById("videoSelectBtn");
videoSelectBtn.onclick = getVideoSources;

// Link buttons
startBtn.onclick = e => {
    try {
        if (mediaRecorder.state === "inactive") {
            startBtn.innerText = "Recording...";
            // Only record when the state is inactive
            mediaRecorder.start();
        }
    } catch (e) { console.warn(e); } // Catch Exception
}

stopBtn.onclick = e => {
    try {
        if (mediaRecorder.state === "recording") {
            startBtn.innerText = "Start";
            // Only stop recording when the state is Recording
            mediaRecorder.stop();
        }
    } catch (e) { console.warn(e); } // Catch Exception
};

// Get the available video sources
async function getVideoSources() {
    const inputSources = await desktopCapturer.getSources({
        types: ["window", "screen"]
    });

    // Create menu and assign function to each option
    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            }
        })
    );

    videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source) {
    videoSelectBtn.innerText = String(source.name).length > 30 ? source.name.slice(0, 30) + "..." : source.name;

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    };

    // Create stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Preview the source in a video element
    videoElement.srcObject = stream;
    videoElement.play();

    // Create the Media Recorder
    const options = { mimeType: videoType };
    mediaRecorder = new MediaRecorder(stream, options);

    // Register Event Handlers
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

// Capture all recorded chunks
function handleDataAvailable(e) {
    recordedChunks.push(e.data);
}

async function handleStop(e) {
    const blob = new Blob(recordedChunks, { type: videoType });
    const buffer = Buffer.from(await blob.arrayBuffer());

    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save video',
        defaultPath: `clip-${Date.now()}.${videoFormat}`
    });

    if (filePath) {
        writeFile(filePath, buffer, () => console.log('Video saved successfully!'));
    }
}

