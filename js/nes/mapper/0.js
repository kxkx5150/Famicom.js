'use strict';
class Mapper0 extends Base{
  constructor(nes) {
    super(nes)
    this.nes = nes;
  }
  Init() {
    this.nes.SetPrgRomPage(0, 0);
    this.nes.SetPrgRomPage(1, this.nes.PrgRomPageCount - 1);
    this.nes.ppu.SetChrRomPage(0);
  }
}
