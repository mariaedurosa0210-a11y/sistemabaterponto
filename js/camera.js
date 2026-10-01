/**
 * Camera Module
 * Manipulação nativa da WebCam / Câmera via navigator.mediaDevices.getUserMedia.
 * Captura de snapshots em formato Blob/JPEG e tratamento de erros anti-fraude.
 */

let mediaStream = null;

/**
 * Inicializa a câmera e conecta ao elemento <video>.
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<{active: boolean, error?: string}>}
 */
export async function initCamera(videoElement) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { active: false, error: 'API MediaDevices não suportada neste navegador.' };
  }

  try {
    // Interrompe stream anterior se existir
    stopCamera();

    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user' // Câmera frontal / Totem
      },
      audio: false
    });

    if (videoElement) {
      videoElement.srcObject = mediaStream;
      await videoElement.play();
    }

    return { active: true };
  } catch (err) {
    console.warn('Câmera indisponível ou permissão negada:', err);
    let errorMessage = 'Câmera indisponível ou permissão negada.';
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage = 'Acesso à câmera foi bloqueado pelo usuário.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMessage = 'Nenhuma câmera foi encontrada no dispositivo.';
    }
    return { active: false, error: errorMessage };
  }
}

/**
 * Encerra as faixas de vídeo da câmera.
 */
export function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

/**
 * Captura um frame do vídeo e converte em Blob (JPEG).
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<Blob|null>}
 */
export function captureSnapshot(videoElement) {
  return new Promise((resolve) => {
    if (!videoElement || !mediaStream || videoElement.readyState < 2) {
      resolve(null);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;

      const ctx = canvas.getContext('2d');

      // Espelhar horizontalmente para bater com a visão da webcam
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85);
    } catch (e) {
      console.error('Erro ao capturar snapshot da câmera:', e);
      resolve(null);
    }
  });
}
