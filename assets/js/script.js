// assets/js/script.js

// --- PWA: register service worker ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.endsWith('/generator.html')) {
    initGenerator();
  } else {
    initScanner();
  }
});

// --- SCANNER LOGIC ---
function initScanner() {
  const video = document.getElementById('preview');
  if (!video) return; // not on scanner page

  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const torchBtn = document.getElementById('torch-btn');
  const cameraSelect = document.getElementById('camera-select');
  const resultText = document.getElementById('result-text');
  const copyBtn = document.getElementById('copy-btn');
  const openBtn = document.getElementById('open-btn');

  let codeReader;
  let currentStream = null;
  let torchOn = false;

  const ZX = window.ZXing;
  if (!ZX) {
    resultText.textContent = 'Scanner library failed to load.';
    return;
  }

  codeReader = new ZX.BrowserMultiFormatReader();

  async function listCameras() {
    try {
      const devices = await ZX.BrowserMultiFormatReader.listVideoInputDevices();
      cameraSelect.innerHTML = '';
      devices.forEach((d, i) => {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Camera ${i + 1}`;
        cameraSelect.appendChild(opt);
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function start() {
    try {
      startBtn.disabled = true;
      resultText.textContent = 'Requesting camera permission...';

      await listCameras();
      let deviceId = cameraSelect.value || undefined;

      // Start scanning
      const selectedDeviceId = deviceId || undefined;
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        'preview',
        (result, err, controls) => {
          if (result) {
            const text = result.getText();
            resultText.textContent = text;

            copyBtn.disabled = false;
            openBtn.disabled = !/^https?:\/\//i.test(text);
          }
          if (err && !(err instanceof ZX.NotFoundException)) {
            console.error(err);
          }

          // capture stream reference for torch
          if (!currentStream && video.srcObject) {
            currentStream = video.srcObject;
            updateTorchButton();
          }
        }
      );

      stopBtn.disabled = false;
      torchBtn.disabled = false;
      resultText.textContent = 'Scanning...';

    } catch (e) {
      console.error(e);
      resultText.textContent = 'Error starting camera: ' + (e.message || e);
      startBtn.disabled = false;
      stopBtn.disabled = true;
      torchBtn.disabled = true;
    }
  }

  function stop() {
    try {
      codeReader.reset();
    } catch (e) {
      console.error(e);
    }
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    torchOn = false;
    resultText.textContent = 'Stopped.';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    torchBtn.disabled = true;
  }

  async function toggleTorch() {
    if (!currentStream) return;
    const track = currentStream.getVideoTracks()[0];
    if (!track) return;

    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (!('torch' in caps)) {
      alert('Torch not supported on this device/browser.');
      return;
    }

    torchOn = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: torchOn }] });
      torchBtn.textContent = torchOn ? 'Torch ON' : 'Torch';
    } catch (e) {
      console.error(e);
      alert('Unable to toggle torch.');
      torchOn = false;
      torchBtn.textContent = 'Torch';
    }
  }

  function updateTorchButton() {
    // enable torch button only if track supports it
    if (!currentStream) return;
    const track = currentStream.getVideoTracks()[0];
    if (!track || !track.getCapabilities) return;
    const caps = track.getCapabilities();
    if ('torch' in caps) {
      torchBtn.disabled = false;
    }
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  torchBtn.addEventListener('click', toggleTorch);

  cameraSelect.addEventListener('change', () => {
    if (!startBtn.disabled) return;
    // restart with new camera
    stop();
    start();
  });

  copyBtn.addEventListener('click', async () => {
    const text = resultText.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    } catch (e) {
      console.error(e);
    }
  });

  openBtn.addEventListener('click', () => {
    const text = resultText.textContent || '';
    if (/^https?:\/\//i.test(text)) {
      window.open(text, '_blank');
    }
  });
}

// --- GENERATOR LOGIC ---
function initGenerator() {
  const textarea = document.getElementById('qr-text');
  if (!textarea) return;

  const genBtn = document.getElementById('generate-btn');
  const dlBtn = document.getElementById('download-btn');
  const out = document.getElementById('qr-output');

  genBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) return;

    out.innerHTML = '';
    const canvas = document.createElement('canvas');

    try {
      await QRCode.toCanvas(canvas, text, {
        margin: 2,
        scale: 6,
        color: {
          dark: '#020617',
          light: '#e5e7eb'
        }
      });
      out.appendChild(canvas);
      dlBtn.disabled = false;
    } catch (e) {
      console.error(e);
      out.textContent = 'Failed to generate QR.';
    }
  });

  dlBtn.addEventListener('click', () => {
    const canvas = out.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qscan-qr.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
    }
