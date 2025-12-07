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
  const video = document.getElementById("preview");
  if (!video) return;

  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const torchBtn = document.getElementById("torch-btn");
  const cameraSelect = document.getElementById("camera-select");
  const resultText = document.getElementById("result-text");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");

  let scanner = null;
  let torchOn = false;

  startBtn.onclick = async () => {
    try {
      startBtn.disabled = true;
      resultText.textContent = "Starting camera...";

      scanner = new ScannerJS.Scanner({
        video: video,
        scanQRCode: true,
        scanBarCode: true,
        mirror: false,
        continuous: true,
        onDetected: (result) => {
          resultText.textContent = result.rawValue;
          copyBtn.disabled = false;
          openBtn.disabled = !/^https?:\/\//i.test(result.rawValue);
        }
      });

      const devices = await ScannerJS.listCameras();
      cameraSelect.innerHTML = "";
      devices.forEach((cam, index) => {
        const opt = document.createElement("option");
        opt.value = cam.id;
        opt.textContent = cam.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(opt);
      });

      await scanner.start();

      stopBtn.disabled = false;
      torchBtn.disabled = false;
      resultText.textContent = "Scanning...";

    } catch (err) {
      console.error(err);
      resultText.textContent = "Camera error: " + err.message;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      torchBtn.disabled = true;
    }
  };

  stopBtn.onclick = () => {
    if (scanner) scanner.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    torchBtn.disabled = true;
    resultText.textContent = "Stopped.";
  };

  torchBtn.onclick = async () => {
    if (!scanner) return;

    try {
      torchOn = !torchOn;
      await scanner.toggleTorch(torchOn);
      torchBtn.textContent = torchOn ? "Torch ON" : "Torch";
    } catch (err) {
      alert("Torch not supported on this device.");
      torchOn = false;
    }
  };

  cameraSelect.onchange = async () => {
    if (!scanner) return;
    await scanner.switchCamera(cameraSelect.value);
  };

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(resultText.textContent);
  };

  openBtn.onclick = () => {
    const t = resultText.textContent;
    if (/^https?:\/\//i.test(t)) window.open(t, "_blank");
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
