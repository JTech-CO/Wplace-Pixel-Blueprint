import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadJson,
  downloadPng,
  downloadPixelPng,
  toPngDataUrl,
} from './exporters.js';

function makeFakeCanvas() {
  return {
    toDataURL: vi.fn(() => 'data:image/png;base64,XXXX'),
  };
}

describe('exporters', () => {
  beforeEach(() => {
    // <a> 클릭/생성/제거 흐름을 모킹
    vi.spyOn(document.body, 'appendChild');
    vi.spyOn(document.body, 'removeChild');
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = vi.fn(() => 'blob:fake');
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    }
    if (!global.URL.revokeObjectURL) {
      global.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
    }
  });

  it('toPngDataUrl 은 canvas.toDataURL("image/png") 결과를 반환한다', () => {
    const cv = makeFakeCanvas();
    expect(toPngDataUrl(cv)).toBe('data:image/png;base64,XXXX');
    expect(cv.toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('toPngDataUrl 은 잘못된 canvas 에 throw', () => {
    expect(() => toPngDataUrl(null)).toThrow(TypeError);
    expect(() => toPngDataUrl({})).toThrow(TypeError);
  });

  it('downloadPng 는 anchor 를 만들어 href/download 를 세팅하고 클릭한다', () => {
    const cv = makeFakeCanvas();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadPng(cv, 'house_blueprint.png');
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('downloadPng 는 확장자를 자동 보정한다', () => {
    const cv = makeFakeCanvas();
    let captured = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      captured = this.download;
    });
    downloadPng(cv, 'no_ext');
    expect(captured).toBe('no_ext.png');
    clickSpy.mockRestore();
  });

  it('downloadJson 은 Blob URL 을 만들고 anchor 클릭한다', () => {
    let captured = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      captured = { href: this.href, download: this.download };
    });
    const bp = { width: 1, height: 1, palette: ['#000'], grid: [[0]] };
    downloadJson(bp, 'thing.json');
    expect(captured.href).toBe('blob:fake');
    expect(captured.download).toBe('thing.json');
    clickSpy.mockRestore();
  });

  it('downloadJson 은 잘못된 blueprint 에 throw', () => {
    expect(() => downloadJson(null, 'x.json')).toThrow(TypeError);
  });

  it('downloadPixelPng 는 grid 크기의 새 canvas 를 만들어 저장한다', () => {
    // jsdom canvas mocking: document.createElement('canvas') 를 가로채서 fake 반환
    const fakeCtx = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      fillStyle: '',
      imageSmoothingEnabled: true,
    };
    let madeCanvas = null;
    const realCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        madeCanvas = {
          width: 0,
          height: 0,
          getContext: () => fakeCtx,
          toDataURL: vi.fn(() => 'data:image/png;base64,PIXEL'),
        };
        return madeCanvas;
      }
      return realCreate(tag);
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const bp = {
      width: 4,
      height: 2,
      palette: ['#FF0000', '#00FF00'],
      grid: [
        [0, 0, 1, 1],
        [-1, -1, 0, 0],
      ],
    };
    downloadPixelPng(bp, 'thing.png', 'transparent');

    expect(madeCanvas).toBeTruthy();
    expect(madeCanvas.width).toBe(4);
    expect(madeCanvas.height).toBe(2);
    // 투명 셀(-1) 제외 6개 픽셀에 fillRect
    expect(fakeCtx.fillRect).toHaveBeenCalledTimes(6);
    expect(fakeCtx.imageSmoothingEnabled).toBe(false);
    expect(clickSpy).toHaveBeenCalled();

    spy.mockRestore();
    clickSpy.mockRestore();
  });

  it('downloadPixelPng 는 잘못된 blueprint 에 throw', () => {
    expect(() => downloadPixelPng(null, 'x.png')).toThrow(TypeError);
    expect(() =>
      downloadPixelPng({ width: 0, height: 1, palette: [], grid: [] }, 'x.png'),
    ).toThrow(RangeError);
  });
});
