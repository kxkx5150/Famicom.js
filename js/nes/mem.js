class Mem {
  ram = new Uint8Array(0x800);
  ppu = null;
  apu = null;
  nes = null;
  mapper = null;
  dma = null;
  io = null;

  constructor(nes, ppu, io) {
    this.nes = nes;
    this.ppu = ppu;
    this.io = io;
  }
  setApu(apu){
    this.apu = apu;
  }
  read(adr) {
    switch (adr & 0xe000) {
      case 0x0000:
        return this.ram[adr & 0x7ff];
      case 0x2000:
        switch (adr & 0x0007) {
          case 0x0000:
          case 0x0001:
          case 0x0002:
          case 0x0003:
          case 0x0004:
          case 0x0005:
          case 0x0006:
          case 0x0007:
            return this.ppu.read(adr & 0x7);
        }
        return 0;
      case 0x4000:
        if (adr >= 0x4020) {
          // return this.Mapper.ReadLow(adr);
          return;
        }

        switch (adr) {
          case 0x4000:
          case 0x4001:
          case 0x4002:
          case 0x4003:
          case 0x4004:
          case 0x4005:
          case 0x4006:
          case 0x4007:
          case 0x4008:
          case 0x4009:
          case 0x400a:
          case 0x400b:
          case 0x400c:
          case 0x400d:
          case 0x400e:
          case 0x400f:
          case 0x4010:
          case 0x4011:
          case 0x4012:
          case 0x4013:
          case 0x4014:
            return;
          case 0x4015:
            return this.apu.read(adr);
          case 0x4016: {
            let ret = this.io.getLatchedCtrlState(1) & 1;
            this.io.setLatchedCtrlState(1);
            return ret | 0x40;
          }
          case 0x4017: {
            let ret = this.io.getLatchedCtrlState(2) & 1;
            this.io.setLatchedCtrlState(2);
            return ret | 0x40;
          }
          case 0x4018:
          case 0x4019:
          case 0x401a:
          case 0x401b:
          case 0x401c:
          case 0x401d:
          case 0x401e:
          case 0x401f:
        }
        return 0x40;
      case 0x6000:
        return this.mapper.read(adr);
      case 0x8000:
        return this.mapper.read(adr);
      // return this.ROM[0][adr & 0x1fff];
      case 0xa000:
        return this.mapper.read(adr);
      // return this.ROM[1][adr & 0x1fff];
      case 0xc000:
        return this.mapper.read(adr);
      // return this.ROM[2][adr & 0x1fff];
      case 0xe000:
        return this.mapper.read(adr);
      // return this.ROM[3][adr & 0x1fff];
    }
  }
  write(adr, val) {
    switch (adr & 0xe000) {
      case 0x0000:
        this.ram[adr & 0x7ff] = val;
        return;
      case 0x2000:
        switch (adr & 0x07) {
          case 0x00:
          case 0x01:
            this.ppu.write(adr & 0x7, val);
            return;
          case 0x02:
            return;
          case 0x03:
          case 0x04:
          case 0x05:
          case 0x06:
          case 0x07:
            this.ppu.write(adr & 0x7, val);
            return;
        }
        return;
      case 0x4000:
        if (adr < 0x4020) {
          // this.IO2[adr & 0x00ff] = val;
          switch (adr) {
            case 0x4000:
            case 0x4001:
            case 0x4002:
            case 0x4003:
            case 0x4004:
            case 0x4005:
            case 0x4006:
            case 0x4007:
            case 0x4008:
            case 0x4009:
            case 0x4010:
            case 0x400a:
            case 0x400b:
            case 0x400c:
            case 0x400d:
            case 0x400e:
            case 0x400f:
            case 0x4010:
            case 0x4011:
              this.apu.write(adr, val);
              return;
            case 0x4012:
            case 0x4013:
            case 0x4014:
              this.dma.setDmaBase(val << 8);
              return;
            case 0x4015:
              this.apu.write(adr, val);
              return;
            case 0x4016:
              if ((val & 0x01) > 0) {
                this.io.ctrlLatched = true;
              } else {
                this.io.ctrlLatched = false;
              }
              return;
            case 0x4017:
              return;
            case 0x4018:
            case 0x4019:
            case 0x401a:
            case 0x401b:
            case 0x401c:
            case 0x401d:
            case 0x401e:
            case 0x401f:
          }
          return;
        }
        // this.Mapper.WriteLow(adr, val);
        return;
      case 0x6000:
      case 0x8000:
      case 0xa000:
      case 0xc000:
      case 0xe000:
        this.mapper.write(adr, val);
        return;
    }
  }
  setMapper(mapper) {
    this.mapper = mapper;
  }
  setDma(dma) {
    this.dma = dma;
  }
  reset() {
    this.ram.fill(0);
  }
}
