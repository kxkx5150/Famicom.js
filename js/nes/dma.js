class Dma {
  mem = null;

  inDma = false;
  dmaBase = 0;
  dmaTimer = 0;
  dmaValue = 0;

  constructor(mem) {
    this.mem = mem;
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
      this.dmaTimer = 0;
      this.inDma = false;
      return;
    }
  }
  runDma() {
    if (this.dmaTimer > 0) {
      if ((this.dmaTimer & 1) === 0) {
        this.mem.write(0x2004, this.dmaValue);
      } else {
        this.dmaValue = this.mem.read(this.dmaBase + ((this.dmaTimer / 2) & 0xff));
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
