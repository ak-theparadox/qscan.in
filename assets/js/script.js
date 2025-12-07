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
  if (!video) return;

  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const torchBtn = document.getElementById('torch-btn');
  const cameraSelect = document.getElementById('camera-select');
  const resultText = document.getElementById('result-text');
  const copyBtn = document.getElementById('copy-btn');
  const openBtn = document.getElementById('open-btn');

  let stream = null;
  let codeReader = null;
  let scanning = false;
  let torchOn = false;

  const ZX = window.ZXing;

  // FORCE BARCODE FORMATS
  const hints = new Map();
  const formats = [
    ZX.BarcodeFormat.QR_CODE,
    ZX.BarcodeFormat.DATA_MATRIX,
    ZX.BarcodeFormat.AZTEC,
    ZX.BarcodeFormat.PDF_417,
    ZX.BarcodeFormat.EAN_13,
    ZX.BarcodeFormat.EAN_8,
    ZX.BarcodeFormat.UPC_A,
    ZX.BarcodeFormat.CODE_128,
    ZX.BarcodeFormat.CODE_39,
    ZX.BarcodeFormat.ITF
  ];
  hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, formats);

  async function listCameras() {
    const devices = await ZX.BrowserMultiFormatReader.listVideoInputDevices();
    cameraSelect.innerHTML = "";
    devices.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || "Camera";
      cameraSelect.appendChild(opt);
    });
  }

  async function startScanner() {
    try {
      resultText.textContent = "Requesting camera...";
      startBtn.disabled = true;

      await listCameras();

      const selectedCam = cameraSelect.value;
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCam ? { exact: selectedCam } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "environment"
        }
      });

      video.srcObject = stream;
      await video.play();

      codeReader = new ZX.BrowserMultiFormatReader(hints);

      scanning = true;
      stopBtn.disabled = false;
      resultText.textContent = "Scanning...";

      detectLoop();
      updateTorchSupport();

    } catch (e) {
      console.error(e);
      resultText.textContent = "Camera error: " + e.message;
      startBtn.disabled = false;
    }
  }

  async function detectLoop() {
    if (!scanning) return;

    try {
      const result = await codeReader.decodeOnceFromVideoElement(video);
      if (result) {
        const text = result.getText();
        resultText.textContent = text;

        copyBtn.disabled = false;
        openBtn.disabled = !/^https?:\/\//i.test(text);

        // Continue scanning after short delay
        setTimeout(() => detectLoop(), 400);
        return;
      }
    } catch (err) {
      // Normal scanning misses — ignore
      setTimeout(() => detectLoop(), 120);
      return;
    }
  }

  function stopScanner() {
    scanning = false;

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }

    resultText.textContent = "Stopped.";
    startBtn.disabled = false;
    stopBtn.disabled = true;
    torchBtn.disabled = true;
  }

  async function toggleTorch() {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities();
    if (!caps.torch) {
      alert("Torch not supported on this device.");
      return;
    }

    torchOn = !torchOn;
    await track.applyConstraints({ advanced: [{ torch: torchOn }] });
    torchBtn.textContent = torchOn ? "Torch ON" : "Torch";
  }

  function updateTorchSupport() {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities();
    if (caps.torch) {
      torchBtn.disabled = false;
    }
  }

  // Events
  startBtn.onclick = startScanner;
  stopBtn.onclick = stopScanner;
  torchBtn.onclick = toggleTorch;

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(resultText.textContent);
  };

  openBtn.onclick = () => {
    const text = resultText.textContent;
    if (/^https?:\/\//i.test(text)) window.open(text, "_blank");
  };
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
