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
  const previewElementId = "preview";

  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const torchBtn = document.getElementById("torch-btn");
  const cameraSelect = document.getElementById("camera-select");

  const resultText = document.getElementById("result-text");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");

  let html5QrCode = null;
  let currentCameraId = null;
  let torchEnabled = false;

  // --- Start scanning ---
  startBtn.onclick = async () => {
    try {
      startBtn.disabled = true;
      resultText.textContent = "Requesting camera...";

      // List cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        resultText.textContent = "No cameras found.";
        startBtn.disabled = false;
        return;
      }

      cameraSelect.innerHTML = "";
      devices.forEach(device => {
        const option = document.createElement("option");
        option.value = device.id;
        option.textContent = device.label || "Camera";
        cameraSelect.appendChild(option);
      });

      currentCameraId = cameraSelect.value;

      html5QrCode = new Html5Qrcode(previewElementId);

      // Scan config
      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      };

      await html5QrCode.start(
        currentCameraId,
        config,
        (decodedText) => {
          resultText.textContent = decodedText;

          copyBtn.disabled = false;
          openBtn.disabled = !/^https?:\/\//i.test(decodedText);
        },
        (errorMessage) => {
          // ignore scan misses
        }
      );

      resultText.textContent = "Scanning...";
      stopBtn.disabled = false;

      // Try enabling torch
      enableTorchIfSupported(html5QrCode);

    } catch (err) {
      console.error(err);
      resultText.textContent = "Camera error: " + err;
      startBtn.disabled = false;
    }
  };

  // --- Stop scanning ---
  stopBtn.onclick = async () => {
    if (!html5QrCode) return;

    try {
      await html5QrCode.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      torchBtn.disabled = true;
      resultText.textContent = "Stopped.";
    } catch (err) {
      console.error(err);
    }
  };

  // --- Switch camera ---
  cameraSelect.onchange = async () => {
    if (!html5QrCode) return;

    currentCameraId = cameraSelect.value;
    await html5QrCode.stop();
    await html5QrCode.start(
      currentCameraId,
      { fps: 15, qrbox: 250, experimentalFeatures: { useBarCodeDetectorIfSupported: true } },
      (decodedText) => {
        resultText.textContent = decodedText;

        copyBtn.disabled = false;
        openBtn.disabled = !/^https?:\/\//i.test(decodedText);
      }
    );

    enableTorchIfSupported(html5QrCode);
  };

  // --- Torch toggle ---
  async function enableTorchIfSupported(qrInstance) {
    try {
      const track = qrInstance.getState()?.stream?.getVideoTracks()[0];
      const capabilities = track?.getCapabilities();

      if (capabilities && capabilities.torch) {
        torchBtn.disabled = false;

        torchBtn.onclick = async () => {
          try {
            torchEnabled = !torchEnabled;

            await track.applyConstraints({
              advanced: [{ torch: torchEnabled }]
            });

            torchBtn.textContent = torchEnabled ? "Torch ON" : "Torch";

          } catch (err) {
            console.error("Torch error:", err);
            alert("Torch not supported on this device.");
            torchEnabled = false;
          }
        };
      } else {
        torchBtn.disabled = true;
      }

    } catch (err) {
      torchBtn.disabled = true;
    }
  }

  // --- Copy result ---
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(resultText.textContent);
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Open link ---
  openBtn.onclick = () => {
    const text = resultText.textContent;
    if (/^https?:\/\//i.test(text)) {
      window.open(text, "_blank");
    }
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
