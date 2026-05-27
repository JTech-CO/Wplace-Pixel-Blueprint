import { describe, it, expect, vi } from 'vitest';
import { renderBlueprint } from './render.js';

function makeFakeCanvas() {
  const ctx = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    imageSmoothingEnabled: true,
  };
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    _ctx: ctx,
  };
}

const blueprint = {
  width: 3,
  height: 2,
  palette: ['#FF0000', '#00FF00'],
  grid: [
    [0, 1, -1],
    [-1, 0, 0],
  ],
};

describe('renderBlueprint', () => {
  it('투명(-1) 셀을 제외한 도트만큼 fillRect 를 호출한다', () => {
    const cv = makeFakeCanvas();
    renderBlueprint(cv, blueprint, { cell: 10, gridLines: false, background: 'transparent' });
    // 도트 4개: (0,0)=0, (1,0)=1, (1,1)=0, (2,1)=0
    expect(cv._ctx.fillRect).toHaveBeenCalledTimes(4);
  });

  it('canvas.width / height 를 cell × grid 크기로 설정한다', () => {
    const cv = makeFakeCanvas();
    renderBlueprint(cv, blueprint, { cell: 10 });
    expect(cv.width).toBe(30);
    expect(cv.height).toBe(20);
  });

  it('gridLines=true 면 stroke 가 호출된다', () => {
    const cv = makeFakeCanvas();
    renderBlueprint(cv, blueprint, { cell: 10, gridLines: true });
    expect(cv._ctx.stroke).toHaveBeenCalled();
  });

  it('gridLines=false 면 stroke 가 호출되지 않는다', () => {
    const cv = makeFakeCanvas();
    renderBlueprint(cv, blueprint, { cell: 10, gridLines: false });
    expect(cv._ctx.stroke).not.toHaveBeenCalled();
  });

  it('background 색을 지정하면 fillRect(0,0,W,H) 가 추가로 호출된다', () => {
    const cv = makeFakeCanvas();
    renderBlueprint(cv, blueprint, { cell: 10, gridLines: false, background: '#000000' });
    // 배경 1 + 도트 4 = 5
    expect(cv._ctx.fillRect).toHaveBeenCalledTimes(5);
  });

  it('imageSmoothingEnabled 가 false 로 설정된다', () => {
    const cv = makeFakeCanvas();
    renderBlueprint(cv, blueprint, { cell: 4 });
    expect(cv._ctx.imageSmoothingEnabled).toBe(false);
  });

  it('잘못된 입력에 대해 throw 한다', () => {
    expect(() => renderBlueprint(null, blueprint)).toThrow(TypeError);
    expect(() => renderBlueprint({}, blueprint)).toThrow(TypeError);
    expect(() => renderBlueprint(makeFakeCanvas(), null)).toThrow(TypeError);
    expect(() => renderBlueprint(makeFakeCanvas(), {})).toThrow(TypeError);
  });
});
