class IRQ {
  mapperIrqWanted = false;
  frameIrqWanted = false;
  dmcIrqWanted = false;

  nmiWanted = false;
  irqWanted = false;

  constructor(nes) {
    this.nes = nes;
  }
  set nmiWanted(flg) {
    this.nmiWanted = flg;
  }
  get nmiWanted() {
    return this.nmiWanted;
  }
  set irqWanted(flg) {
    this.irqWanted = flg;
  }
  get irqWanted() {
    return this.irqWanted;
  }
  set mapperIrqWanted(flg) {
    this.mapperIrqWanted = flg;
  }
  get mapperIrqWanted() {
    return this.mapperIrqWanted;
  }
  set frameIrqWanted(flg) {
    this.frameIrqWanted = flg;
  }
  get frameIrqWanted() {
    return this.frameIrqWanted;
  }
  set dmcIrqWanted(flg) {
    this.dmcIrqWanted = flg;
  }
  get dmcIrqWanted() {
    return this.dmcIrqWanted;
  }
  checkIrqWanted() {
    if (this.mapperIrqWanted || this.frameIrqWanted || this.dmcIrqWanted) {
      this.irqWanted = true;
    } else {
      this.irqWanted = false;
    }
  }
  checkCpuIrqWanted() {
    if (this.nmiWanted){
      return "nmi";
    }else if(!this.nes.cpu.interrupt && (this.irqWanted || this.nes.cpu.toIRQ !== 0x00)) {
      return "irq";
    } else {
      return false;
    }
  }
  reset() {
    this.mapperIrqWanted = false;
    this.frameIrqWanted = false;
    this.dmcIrqWanted = false;

    this.nmiWanted = false;
    this.irqWanted = false;
  }
}
