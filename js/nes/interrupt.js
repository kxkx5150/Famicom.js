class Irq {
  cpu = null;

  mapperIrqWanted = false;
  frameIrqWanted = false;
  dmcIrqWanted = false;

  nmiWanted = false;
  irqWanted = false;

  constructor(cpu) {
    this.cpu = cpu;
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
    if (this.nmiWanted || (this.irqWanted && !this.cpu.interrupt)) {
      if (this.nmiWanted) {
        return "nmi";
      } else {
        return "irq";
      }
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
