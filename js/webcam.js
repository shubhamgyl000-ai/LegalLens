(() => {
  const openBtn = document.getElementById("openCamera");
  const video = document.getElementById("cameraVideo");
  const captureBtn = document.getElementById("captureCamera");
  const closeBtn = document.getElementById("closeCamera");
  const fileInput = document.getElementById("image");
  if (!openBtn || !video || !captureBtn || !closeBtn || !fileInput) return;

  let stream = null;

  async function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
  }

  openBtn.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Live camera is unavailable. Use HTTPS/localhost or upload a photo instead.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = stream;
      document.body.classList.add("camera-live");
    } catch (error) {
      console.error(error);
      alert("Camera permission was denied or the camera is unavailable.");
    }
  });

  captureBtn.addEventListener("click", () => {
    if (!stream) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], "legalLens-camera-scan.jpg", { type: "image/jpeg" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      stopCamera();
      document.body.classList.remove("camera-live");
    }, "image/jpeg", 0.92);
  });

  closeBtn.addEventListener("click", async () => {
    await stopCamera();
    modal.classList.add("hidden");
  });

  window.addEventListener("beforeunload", stopCamera);
})();