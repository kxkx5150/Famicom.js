'use strict';
class Base {
  constructor(nes) {
    this.nes = nes;
    this.MAPPER_REG = null;
  }
  Init() {}
  ReadLow(address) {
    return 0x40;
  }
  WriteLow(address, data) {}
  ReadPPUData() {
    return this.nes.ppu.ReadPPUData_SUB();
  }
  WritePPUData(value) {
    this.nes.ppu.WritePPUData_SUB(value);
  }
  BuildBGLine() {
    this.nes.ppu.BuildBGLine_SUB();
  }
  BuildSpriteLine() {
    this.nes.ppu.BuildSpriteLine_SUB();
  }

  ReadSRAM(address) {
    return this.nes.SRAM[address & 0x1fff];
  }

  WriteSRAM(address, data) {
    this.nes.SRAM[address & 0x1fff] = data;
  }
  Write(address, data) {}
  HSync(y) {}
  CPUSync(clock) {}
  SetIRQ() {
    this.nes.irq.irqWanted = true;
  }
  ClearIRQ() {
    this.nes.irq.irqWanted = false;
  }
  OutEXSound(soundin) {
    return soundin;
  }
  EXSoundSync(clock) {}
  GetState() {
    if (this.MAPPER_REG === null) return;
    this.nes.StateData.Mapper = {};
    this.nes.StateData.Mapper.MAPPER_REG = this.MAPPER_REG.slice(0);
  }
  SetState() {
    if (this.MAPPER_REG === null) return;
    for (var i = 0; i < this.nes.StateData.Mapper.MAPPER_REG.length; i++)
      this.MAPPER_REG[i] = this.nes.StateData.Mapper.MAPPER_REG[i];
  }
}
