class RAM {
  constructor(nes) {
    this.nes = nes;
    this.ram2 = new Array(0x800);
    this.ram1 = new Uint8Array(0x800);
    this.ram = this.ram1;
    this.timerID = null;
    this.reset();
  }
  init(){
    if(this.nes.cpuType === 2){
      console.log("CPU type2 Array Memory");
      this.ram = this.ram2;
    }else{
      console.log("CPU type1 Uint8Array Memory");
      this.ram = this.ram1;
    }
    this.reset();
  }
  Get(address) {
    switch (address & 0xe000) {
      case 0x0000:
        return this.ram[address & 0x7ff];
      case 0x2000:
        switch (address & 0x0007) {
          case 0x0000:
          case 0x0001:
          case 0x0002:
            // console.log("ReadPPUStatus: "+this.nes.cpu.PC[0].toString(16).toUpperCase());
            return this.nes.ppu.ReadPPUStatus();
          case 0x0003:
          case 0x0004:
          case 0x0005:
          case 0x0006:
          case 0x0007:
            // console.log("ReadPPUData: "+this.nes.cpu.PC[0].toString(16).toUpperCase());
            return this.nes.ppu.ReadPPUData();
        }
        return 0;
      case 0x4000:
        if (address >= 0x4020) {
          return this.nes.mapper.ReadLow(address);
        }
        switch (address) {
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
          case 0x4015:
            return this.nes.apu.readReg(address);
          case 0x4016:
            var ret = this.nes.io.getLatchedCtrlState(1) & 1;
            this.nes.io.setLatchedCtrlState(1);
            return ret | 0x40;
          case 0x4017:
            var ret = this.nes.io.getLatchedCtrlState(2) & 1;
            this.nes.io.setLatchedCtrlState(2);
            return ret | 0x40;
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
        return this.nes.mapper.ReadSRAM(address);
      case 0x8000:
        return this.nes.ROM[0][address & 0x1fff];
      case 0xa000:
        return this.nes.ROM[1][address & 0x1fff];
      case 0xc000:
        return this.nes.ROM[2][address & 0x1fff];
      case 0xe000:
        return this.nes.ROM[3][address & 0x1fff];
    }
  }
  Get16(address) {
    return this.Get(address) | (this.Get(address + 1) << 8);
  }
  Set(address, data) {
    switch (address & 0xe000) {
      case 0x0000:
        this.ram[address & 0x7ff] = data;
        return;
      case 0x2000:
        switch (address & 0x07) {
          case 0x00:
            // console.log("--- PPUCTRL");

            this.nes.ppu.WritePPUControlRegister0(data);
            return;
          case 0x01:
            // console.log("--- PPUMASK");

            this.nes.ppu.WritePPUControlRegister1(data);
            return;
          case 0x02:
            return;
          case 0x03:
            // console.log("--- OAMADDR");

            this.nes.ppu.WriteSpriteAddressRegister(data);
            return;
          case 0x04:
            // console.log("--- OAMDATA");

            this.nes.ppu.WriteSpriteData(data);
            return;
          case 0x05:
            // console.log("--- PPUSCROLL");

            this.nes.ppu.WriteScrollRegister(data);
            return;
          case 0x06:
            // console.log("--- PPUADDR");

            this.nes.ppu.WritePPUAddressRegister(data);
            return;
          case 0x07:
            // console.log("--- PPUDATA");

            this.nes.ppu.WritePPUData(data);
            return;
        }
        return;
      case 0x4000:
        if (address < 0x4020) {
          switch (address) {
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
            case 0x4012:
            case 0x4013:
              this.nes.apu.writeReg(address, data);
              return;      
            case 0x4014:
              this.nes.dma.onDma(data);
              return;
            case 0x4015:
              this.nes.apu.writeReg(address, data);
              return;
            case 0x4016:
              if ((data & 0x01) > 0) {
                this.nes.io.ctrlLatched = true;
              } else {
                this.nes.io.ctrlLatched = false;
              }
              return;
            case 0x4017:
              this.nes.apu.writeReg(address, data);
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
        this.nes.mapper.WriteLow(address, data);
        return;
      case 0x6000:
        clearTimeout(this.timerID);
        this.timerID = setTimeout(()=>{
          this.storeSram();
        },2000)
        this.nes.mapper.WriteSRAM(address, data);
        return;
      case 0x8000:
      case 0xa000:
      case 0xc000:
      case 0xe000:
        this.nes.mapper.Write(address, data);
        return;
    }
  }
  storeSram(){
    console.log("save sram");
    this.nes.createDbItem(this.nes.fname,this.nes.SRAM)
  }
  reset(hard){
    for (var i = 0; i < this.ram.length; i++) {
      this.ram[i] = 0x0f;
    }
  }
}
