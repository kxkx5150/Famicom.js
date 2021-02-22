'use strict';
class DMA {
  constructor(nes) {
    this.nes = nes;
    this.inDma = false;
    this.dmaBase = 0;
    this.dmaTimer = 0;
    this.dmaValue = 0;
  }
  getInDma() {
    return this.inDma;
  }
  setInDma(flg) {
    this.inDma = flg;
  }
  getDmaTimer() {
    return this.dmaTimer;
  }
  incrementDmaTimer() {
    this.dmaTimer++;
    if (this.dmaTimer === 513) {
      this.reset();
      return;
    }
  }
  onDma(data) {
    var offset = data << 8;
    var tmpDist = this.nes.ppu.SPRITE_RAM;
    var tmpSrc = this.nes.mem.ram;
    for (var i = 0; i < 0x100; i++, offset++) tmpDist[i] = tmpSrc[offset];
    this.nes.cpu.CPUClock += 514;
  }
  runDma() {
    if (this.dmaTimer > 0) {
      if ((this.dmaTimer & 1) === 0) {
        this.nes.mem.Set(0x2004, this.dmaValue);
      } else {
        this.dmaValue = this.nes.mem.Get(this.dmaBase + ((this.dmaTimer / 2) & 0xff));
      }
    }
    this.incrementDmaTimer();
  }
  setDmaBase(addr) {
    this.dmaBase = addr;
    this.inDma = true;
  }
  reset() {
    this.inDma = false;
    this.dmaBase = 0;
    this.dmaTimer = 0;
    this.dmaValue = 0;
  }
}
