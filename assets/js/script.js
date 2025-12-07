function initScanner() {
  const previewId = "preview";

  const startBtn = document.getElementById("start-btn");
  const flipBtn = document.getElementById("flip-btn");

  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-input");

  const resultText = document.getElementById("result-text");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");

  let html5QrCode = null;
  let usingBack = true;
  let cameraId = null;

  startBtn.onclick = async () => {
    startBtn.disabled = true;
    startBtn.textContent = "Scanning...";

    const cameras = await Html5Qrcode.getCameras();

    if (cameras.length === 0) {
      resultText.textContent = "No cameras found";
      return;
    }

    let backCam = cameras.find(c => c.label.toLowerCase().includes("back"));
    cameraId = backCam ? backCam.id : cameras[0].id;

    html5QrCode = new Html5Qrcode(previewId);

    await html5QrCode.start(
      cameraId,
      {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      },
      (decoded) => {
        resultText.textContent = decoded;
        copyBtn.disabled = false;
        openBtn.disabled = !decoded.startsWith("http");
      }
    );
  };

  flipBtn.onclick = async () => {
    if (!html5QrCode) return;

    usingBack = !usingBack;
    const cams = await Html5Qrcode.getCameras();

    let chosen = cams.find(c =>
      c.label.toLowerCase().includes(usingBack ? "back" : "front")
    ) || cams[0];

    cameraId = chosen.id;

    await html5QrCode.stop();
    await html5QrCode.start(
      cameraId,
      { fps: 15, qrbox: 260 },
      decoded => resultText.textContent = decoded
    );
  };

  uploadBtn.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await Html5Qrcode.scanImage(reader.result, false);
        resultText.textContent = res;

        copyBtn.disabled = false;
        openBtn.disabled = !res.startsWith("http");

      } catch {
        resultText.textContent = "Invalid QR / Barcode";
      }
    };
    reader.readAsDataURL(file);
  };

  copyBtn.onclick = () =>
    navigator.clipboard.writeText(resultText.textContent);

  openBtn.onclick = () => {
    const t = resultText.textContent;
    if (t.startsWith("http")) window.open(t, "_blank");
  };
}

document.addEventListener("DOMContentLoaded", initScanner);