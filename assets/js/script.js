function initScanner() {
  const previewId = "preview";

  const flipBtn = document.getElementById("flip-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-input");

  const resultText = document.getElementById("result-text");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");

  let html5QrCode = null;
  let usingBack = true;
  let cameraId = null;

  // AUTO START
  async function startCamera() {
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
        qrbox: 260,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      },
      decoded => {
        resultText.textContent = decoded;
        copyBtn.disabled = false;
        openBtn.disabled = !decoded.startsWith("http");
      }
    );
  }

  startCamera();

  // SWITCH CAMERA
  flipBtn.onclick = async () => {
    if (!html5QrCode) return;

    usingBack = !usingBack;

    const cams = await Html5Qrcode.getCameras();
    let cam = cams.find(c =>
      c.label.toLowerCase().includes(usingBack ? "back" : "front")
    ) || cams[0];

    cameraId = cam.id;

    await html5QrCode.stop();
    await html5QrCode.start(
      cameraId,
      { fps: 15, qrbox: 260 },
      decoded => resultText.textContent = decoded
    );
  };

  // UPLOAD SCAN
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
    const text = resultText.textContent;
    if (text.startsWith("http")) window.open(text, "_blank");
  };
}

document.addEventListener("DOMContentLoaded", initScanner);