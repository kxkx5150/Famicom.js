'use strict';
class DMA {
  constructor(nes) {
    this.nes = nes;
    this.inDma = false;
    this.dmaBase = 0;
    this.dmaTimer = 0;
    this.dmaValue = 0;
  }
  onDma(data) {
    var offset = data << 8;
    var tmpDist = this.nes.ppu.SPRITE_RAM;
    var tmpSrc = this.nes.mem.ram;
    for (var i = 0; i < 0x100; i++, offset++) tmpDist[i] = tmpSrc[offset];
    this.nes.cpu.CPUClock += 514;
  }
  reset() {
    this.inDma = false;
    this.dmaBase = 0;
    this.dmaTimer = 0;
    this.dmaValue = 0;
  }
}
