// lib/applyDisplacementMap.ts

/**
 * 이미지를 로드하는 헬퍼 함수
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 쌍선형 보간법(Bilinear Interpolation)으로 특정 좌표의 색상을 계산
 */
function getBilinearPixel(data: Uint8ClampedArray, w: number, h: number, x: number, y: number) {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = Math.min(x1 + 1, w - 1);
  const y2 = Math.min(y1 + 1, h - 1);

  const fx = x - x1;
  const fy = y - y1;

  const i11 = (y1 * w + x1) * 4;
  const i21 = (y1 * w + x2) * 4;
  const i12 = (y2 * w + x1) * 4;
  const i22 = (y2 * w + x2) * 4;

  const result = new Uint8ClampedArray(4);
  for (let i = 0; i < 4; i++) {
    const top = data[i11 + i]! * (1 - fx) + data[i21 + i]! * fx;
    const bottom = data[i12 + i]! * (1 - fx) + data[i22 + i]! * fx;
    result[i] = top * (1 - fy) + bottom * fy;
  }
  return result;
}

/**
 * Displacement Map을 적용하여 부드럽게 왜곡된 이미지를 생성
 */
export async function applyDisplacementMap(
  designDataUrl: string,
  displacementMapSrc: string,
  strength: number = 15,
  blurAmount: number = 2, // 맵 전처리용 블러 수치
  isWhiteTshirt: boolean = true
): Promise<string> {
  // 1. 두 이미지 로드
  const [designImg, dispImg] = await Promise.all([
    loadImage(designDataUrl),
    loadImage(displacementMapSrc),
  ]);

  const w = designImg.naturalWidth;
  const h = designImg.naturalHeight;

  // 2. 변위맵 픽셀 데이터 추출 (블러 전처리 포함)
  const dispCanvas = document.createElement('canvas');
  dispCanvas.width = w;
  dispCanvas.height = h;
  const dispCtx = dispCanvas.getContext('2d')!;
  
  // 원단 텍스처 노이즈를 제거하기 위해 가우시안 블러 적용
  if (blurAmount > 0) {
    dispCtx.filter = `blur(${blurAmount}px)`;
  }
  dispCtx.drawImage(dispImg, 0, 0, w, h);
  const dispData = dispCtx.getImageData(0, 0, w, h).data;

  // 3. 디자인 이미지 픽셀 데이터 추출
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(designImg, 0, 0, w, h);
  const srcData = srcCtx.getImageData(0, 0, w, h);

  // 4. 출력용 캔버스 데이터 생성
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outData = outCtx.createImageData(w, h);

  if (isWhiteTshirt) {
    outCtx.globalCompositeOperation = 'multiply';
  } else {
    outCtx.globalCompositeOperation = 'source-over'; // 기본값
  }
  
  // 5. 변위 적용 루프
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      // 흑백 이미지를 사용하므로 R채널(i)이나 G채널(i+1) 중 하나를 기준으로 함
      // (dispData[i] - 128) 수치가 클수록 왜곡이 심해짐
      const val = dispData[i]!; 
      const displacement = ((val - 128) / 128) * strength;

      // X축과 Y축에 변위 적용 (단순 흑백맵일 경우 대각선 이동을 피하려면 dx, dy 조절 필요)
      const dx = displacement;
      const dy = displacement;

      // 이동된 소수점 좌표
      const srcX = Math.min(Math.max(x + dx, 0), w - 1);
      const srcY = Math.min(Math.max(y + dy, 0), h - 1);

      // 보간법을 사용하여 주변 픽셀을 섞어서 가져옴 (안티앨리어싱 효과)
      const pixel = getBilinearPixel(srcData.data, w, h, srcX, srcY);

      outData.data[i]     = pixel[0];
      outData.data[i + 1] = pixel[1];
      outData.data[i + 2] = pixel[2];
      outData.data[i + 3] = pixel[3];
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas.toDataURL('image/png');
}