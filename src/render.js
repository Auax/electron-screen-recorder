const { desktopCapturer } = require('electron');
const { Menu, dialog } = require('@electron/remote');
const { writeFile } = require('fs');
const { start } = require('repl');

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
            // Only record when the state is inactive
            mediaRecorder.start();
            toggleStartBtn("bg-red-400", "bg-gray-900");
        }
    } catch (e) { console.warn(e); } // Catch Exception
}

stopBtn.onclick = e => {
    try {
        if (mediaRecorder.state === "recording") {
            // Only stop recording when the state is Recording
            mediaRecorder.stop();
            toggleStartBtn("bg-red-400", "bg-gray-900");
        }
    } catch (e) { console.warn(e); } // Catch Exception
};

const toggleStartBtn = (classOne, classTwo) => {
    // Only if it's recording
    if (mediaRecorder.state == "recording") {
        startBtn.classList.remove(classTwo);
        startBtn.classList.add(classOne);
        startBtn.innerText = ("Recording...");

    } else { // Not recording
        startBtn.classList.remove(classOne);
        startBtn.classList.add(classTwo);
        startBtn.innerText = ("Start");
    }
}

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
    videoSelectBtn.innerText = source.name;

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