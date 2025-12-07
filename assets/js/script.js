document.addEventListener("DOMContentLoaded", async () => {

  const previewId = "preview";
  const flipBtn = document.getElementById("flip-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-input");

  const resultText = document.getElementById("result-text");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");

  let qr = null;
  let cameras = [];
  let currentCamIndex = 0;

  // Wait for html5-qrcode to load properly
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function startScanner() {
    try {
      await wait(300);  // ensure DOM fully ready

      cameras = await Html5Qrcode.getCameras();

      if (!cameras.length) {
        resultText.textContent = "No camera found";
        return;
      }

      // Choose back camera first
      currentCamIndex =
        cameras.findIndex(c => c.label.toLowerCase().includes("back")) || 0;

      qr = new Html5Qrcode(previewId);

      await qr.start(
        cameras[currentCamIndex].id,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        decoded => {
          resultText.textContent = decoded;
          copyBtn.disabled = false;
          openBtn.disabled = !decoded.startsWith("http");
        }
      );

    } catch (e) {
      resultText.textContent = "Scanner error: " + e;
      console.error(e);
    }
  }

  // AUTO-START CAMERA
  startScanner();

  // SWITCH CAMERA
  flipBtn.addEventListener("click", async () => {
    if (!qr || !cameras.length) return;

    currentCamIndex = (currentCamIndex + 1) % cameras.length;

    try {
      await qr.stop();
      await qr.start(
        cameras[currentCamIndex].id,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        decoded => resultText.textContent = decoded
      );
    } catch (err) {
      console.error("Switch cam error:", err);
    }
  });

  // UPLOAD IMAGE TO SCAN
  uploadBtn.onclick = () => fileInput.click();

  fileInput.onchange = (e) => {
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
});