document.addEventListener("DOMContentLoaded", async () => {

  const previewId = "preview";
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

    // Make link clickable
    if (isURL(text)) {
      resultText.innerHTML = `<a href="${text}" target="_blank">${text}</a>`;
    } else {
      resultText.textContent = text;
    }

    popup.classList.remove("hidden");
  }

  closePopupBtn.onclick = () => popup.classList.add("hidden");

  copyBtn.onclick = () => {
    const txt = resultText.textContent;
    navigator.clipboard.writeText(txt);
  };

  // CAMERA START
  async function startCamera() {
    cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) return;

    camIndex =
      cameras.findIndex(c => c.label.toLowerCase().includes("back")) || 0;

    qr = new Html5Qrcode(previewId);

    await qr.start(
      cameras[camIndex].id,
      { fps: 15, qrbox: 260 },
      decoded => showPopup(decoded)
    );
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

  // UPLOAD IMAGE
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
});