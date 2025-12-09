/* ============================================================
   GLOBAL: RUN AFTER DOM LOAD
   Detects which page is open (scanner or generator)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initScanner();
  initGenerator();
});



/* ============================================================
   SCANNER PAGE LOGIC
   ============================================================ */
function initScanner() {

  // Check if preview element exists (only scanner page)
  const previewId = "preview";
  if (!document.getElementById(previewId)) return;

  const flipBtn = document.getElementById("flip-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-input");

  const popup = document.getElementById("result-popup");
  const closePopupBtn = document.getElementById("close-popup");
  const resultText = document.getElementById("result-text");
  const copyBtn = document.getElementById("copy-btn");

  let qr = null;
  let cameras = [];
  let camIndex = 0;

  function isURL(text) {
    return /^https?:\/\/.+/.test(text);
  }

  function showPopup(text) {
    copyBtn.disabled = false;

    if (isURL(text)) {
      resultText.innerHTML = `<a href="${text}" target="_blank">${text}</a>`;
    } else {
      resultText.textContent = text;
    }

    popup.classList.remove("hidden");
  }

  closePopupBtn.onclick = () => popup.classList.add("hidden");

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(resultText.textContent);
  };

  // START CAMERA
  async function startCamera() {
    try {
      cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) return;

      // prioritize back camera
      camIndex = cameras.findIndex(c =>
        c.label.toLowerCase().includes("back")
      );
      if (camIndex < 0) camIndex = 0;

      qr = new Html5Qrcode(previewId);

      await qr.start(
        cameras[camIndex].id,
        { fps: 15, qrbox: 260 },
        decoded => showPopup(decoded)
      );

    } catch (err) {
      console.error("Camera start failed:", err);
    }
  }

  startCamera();

  // SWITCH CAMERA
  flipBtn.onclick = async () => {
    if (!qr || !cameras.length) return;

    camIndex = (camIndex + 1) % cameras.length;

    await qr.stop();
    await qr.start(
      cameras[camIndex].id,
      { fps: 15, qrbox: 260 },
      decoded => showPopup(decoded)
    );
  };

  // UPLOAD IMAGE → SCAN
  uploadBtn.onclick = () => fileInput.click();

  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const result = await Html5Qrcode.scanImage(reader.result, false);
        showPopup(result);
      } catch {
        showPopup("Invalid QR / Barcode");
      }
    };

    reader.readAsDataURL(file);
  };
}




/* ============================================================
   QR GENERATOR PAGE LOGIC
   ============================================================ */
function initGenerator() {

  const input = document.getElementById("qr-text");
  const generateBtn = document.getElementById("generate-btn");
  const downloadBtn = document.getElementById("download-btn");
  const output = document.getElementById("qr-output");

  // If generator elements don't exist → skip
  if (!input || !generateBtn || !output) return;

  generateBtn.onclick = () => {
    const text = input.value.trim();

    if (!text) {
      output.innerHTML = `<p class="muted small">Please enter some text.</p>`;
      downloadBtn.disabled = true;
      return;
    }

    output.innerHTML = ""; // clear output

    QRCode.toCanvas(text, { width: 260 }, (err, canvas) => {
      if (err) {
        output.innerHTML = `<p class="muted small">Error generating QR.</p>`;
        return;
      }

      output.appendChild(canvas);

      // Enable download
      downloadBtn.disabled = false;

      downloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "qscan-qr.png";
        link.click();
      };
    });
  };
}