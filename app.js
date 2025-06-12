
    const videoElement = document.getElementById('input_video');
    const canvasElement = document.getElementById('output_canvas');
    const ctx = canvasElement.getContext('2d');
    const toggleBtn = document.getElementById('toggleBtn');
    const captureBtn = document.getElementById('captureBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const bgButtons = document.querySelectorAll('[data-src]');
    const photoContainer = document.getElementById('photoContainer');

    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    const backgroundImage = new Image();
    backgroundImage.src = './assets/paisaje1.jpg';

    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
    });

    selfieSegmentation.setOptions({ modelSelection: 1 });
    selfieSegmentation.onResults(onResults);

    let stream = null;
    let running = false;

    async function startCamera() {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = stream;

      videoElement.onloadeddata = () => {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        running = true;
        frameLoop();
      };
    }

    async function frameLoop() {
      if (!running) return;
      await selfieSegmentation.send({ image: videoElement });
      requestAnimationFrame(frameLoop);
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      running = false;
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      videoElement.srcObject = null;
    }

    toggleBtn.addEventListener('click', () => {
      if (running) {
        stopCamera();
        toggleBtn.textContent = 'Prender cámara';
      } else {
        startCamera();
        toggleBtn.textContent = 'Apagar cámara';
      }
    });

    bgButtons.forEach(button => {
      button.addEventListener('click', () => {
        backgroundImage.src = button.getAttribute('data-src');
      });
    });

    captureBtn.addEventListener('click', () => {
      const dataURL = canvasElement.toDataURL('image/png');
      photoContainer.innerHTML = `<img src="${dataURL}" alt="Foto capturada" />`;
      downloadBtn.disabled = false;
    });

    downloadBtn.addEventListener('click', () => {
      const img = photoContainer.querySelector('img');
      if (!img) return;

      const link = document.createElement('a');
      link.href = img.src;
      link.download = 'foto_capturada.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    function onResults(results) {
      const width = results.image.width;
      const height = results.image.height;

      canvasElement.width = width;
      canvasElement.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;

      maskCtx.clearRect(0, 0, width, height);
      maskCtx.drawImage(results.segmentationMask, 0, 0, width, height);
      const maskData = maskCtx.getImageData(0, 0, width, height).data;

      if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, width, height);
      } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
      }

      const frameData = ctx.getImageData(0, 0, width, height);
      const composed = frameData.data;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.drawImage(results.image, 0, 0, width, height);
      const originalData = tempCtx.getImageData(0, 0, width, height).data;

      for (let i = 0; i < composed.length; i += 4) {
        const maskAlpha = maskData[i] / 255;
        if (maskAlpha > 0.5) {
          composed[i] = originalData[i];
          composed[i + 1] = originalData[i + 1];
          composed[i + 2] = originalData[i + 2];
          composed[i + 3] = originalData[i + 3];
        }
      }

      ctx.putImageData(frameData, 0, 0);
    }

    startCamera();