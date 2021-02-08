class IO {
  nes = null;
  crntCtrlState1 = 0;
  crntCtrlState2 = 0;
  latchedCtrlState1 = 0;
  latchedCtrlState2 = 0;
  ctrlLatched = false;

  constructor(nes) {
    this.nes = nes;
  }
  set ctrlLatched(flg) {
    this.ctrlLatched = flg;
  }
  get ctrlLatched() {
    return this.ctrlLatched;
  }

  set crntCtrlState1(flg) {
    this.crntCtrlState1 = flg;
  }
  get crntCtrlState1() {
    return this.crntCtrlState1;
  }
  set crntCtrlState2(flg) {
    this.crntCtrlState2 = flg;
  }
  get crntCtrlState2() {
    return this.crntCtrlState2;
  }

  hdCtrlLatch() {
    this.latchedCtrlState1 = this.crntCtrlState1;
    this.latchedCtrlState2 = this.crntCtrlState2;
  }

  setLatchedCtrlState(no) {
    if (no === 1) {
      let val = this.latchedCtrlState1;
      val >>= 1;
      val |= 0x80;
      this.latchedCtrlState1 = val;
    } else {
      let val = this.latchedCtrlState2;
      val >>= 1;
      val |= 0x80;
      this.latchedCtrlState2 = val;
    }
  }
  getLatchedCtrlState(no) {
    if (no === 1) {
      return this.latchedCtrlState1;
    } else {
      return this.latchedCtrlState2;
    }
  }
  reset() {
    this.crntCtrlState1 = 0;
    this.crntCtrlState2 = 0;

    this.latchedCtrlState1 = 0;
    this.latchedCtrlState2 = 0;
    this.ctrlLatched = false;
  }
}
