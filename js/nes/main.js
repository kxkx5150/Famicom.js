var DEBUG = false;
class NES {
  constructor(canvas) {
    this.fps = 60;
    this.sampleRate = 48000;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.actx = new window.AudioContext();
    this.AUDIO_BUFFERING = 512;
    this.SAMPLE_COUNT = 4 * 1024;
    this.SAMPLE_MASK = this.SAMPLE_COUNT - 1;
    this.audio_wcursor = 0;
    this.audio_rcursor = 0;
    this.audioSample = {
      l: new Float32Array(this.SAMPLE_COUNT),
      r: new Float32Array(this.SAMPLE_COUNT),
    };
    this.timerId = null;
    this.PrgRomPageCount = 0;
    this.ChrRomPageCount = 0;
    this.HMirror = false;
    this.VMirror = false;
    this.SramEnable = false;
    this.TrainerEnable = false;
    this.FourScreen = false;
    this.MapperNumber = -1;

    this.SRAM = new Array(0x2000);
    this.ROM = new Array(4);
    this.PRGROM_STATE = new Array(4);
    this.CHRROM_STATE = new Array(8);
    this.PRGROM_PAGES = null;
    this.CHRROM_PAGES = null;

    this.io = new IO(this);
    this.irq = new IRQ(this);
    this.dma = new DMA(this);
    this.mem = new RAM(this);
    this.apu = new APU(this);
    this.ppu = new PPU(this, this.ctx);

    //// CPU type Select////
    this.cpuType = 2;
    ///////////////////////

    this.cpu1 = new CPU(this, this.mem);
    this.cpu2 = new CPU2(this, this.mem);
    if(this.cpuType === 2) this.cpu = this.cpu2;
    else this.cpu = this.cpu1;
    this.setAudioProcessor();
    this.INPUT = {
      A: 0,
      B: 1,
      SELECT: 2,
      START: 3,
      UP: 4,
      DOWN: 5,
      LEFT: 6,
      RIGHT: 7,
    };
    /* MMC5 */
    this.MMC5_FrameSequenceCounter = 0;
    this.MMC5_FrameSequence = 0;
    this.MMC5_REG = new Array(0x20);
    this.MMC5_Ch = new Array(2);
    this.MMC5_Level = 0;
    this.Init_MMC5();
    /* N163 */
    this.N163_ch_data = new Array(8);
    this.N163_RAM = new Array(128);
    this.N163_Address = 0x00;
    this.N163_ch = 0;
    this.N163_Level = 0;
    this.N163_Clock = 0;
  }
  initNES(arybuf) {
    this.Reset(true);
    const Rom = this.SetRom(arybuf);
    this.StorageClear();
    this.StorageInit(Rom);
    if (this.actx) this.actx.resume();
    this.mapperSelect();
    this.mapper.Init();
    this.ppu.PpuInit();
    this.cpu2.initCpu();
    this.cpu.initCpu();
    this.mem.initMem();
    return true;
  }
  cycle(arybuf) {
    if (!arybuf) return;
    cancelAnimationFrame(this.timerId);
    const flg = this.initNES(arybuf);
    if (flg) this.update();
  }
  update(count) {
    if (count) {
      this.runCPU(count);
    } else {
      this.runCPU();
      this.timerId = requestAnimationFrame(() => {
        this.update();
      });
    }
  }
  runCPU(count){
    if(this.cpuType === 2){
      this.runCPU2(count)
    }else{
      this.runCPU1(count)
    }
  }
  runCPU2(count){
    this.DrawFlag = false;
    while (!this.DrawFlag) {
      if (this.io.ctrlLatched) this.io.hdCtrlLatch();
      const opcode = this.cpu.runCpu();
      if(this.cpu.CPUClock < 1)return;
      this.mapper.CPUSync(this.cpu.CPUClock);
      this.ppu.PpuRun();
      if (this.actx) this.apu.clockFrameCounter(this.cpu.CPUClock);
      this.cpu.CPUClock = 0;
      this.cpu.exec(opcode);
      if(count && !--count){
        console.log("break : "+count);
        break;
      }
    }
  }
  runCPU1(count) {
    this.DrawFlag = false;
    while (!this.DrawFlag) {
      if (this.io.ctrlLatched) this.io.hdCtrlLatch();
      if (!this.cpu.runCpu()) break;
      if(this.cpu.CPUClock < 1)return;
      this.mapper.CPUSync(this.cpu.CPUClock);
      if (this.actx) this.apu.clockFrameCounter(this.cpu.CPUClock);
      this.ppu.PpuRun();
      this.cpu.CPUClock = 0;
    }
  }
  Reset(hard) {
    cancelAnimationFrame(this.timerId);
    if (this.actx) this.actx.suspend();
    this.audio_wcursor = 0;
    this.audio_rcursor = 0;
    this.audioSample.l.fill(0);
    this.audioSample.r.fill(0);
    this.cpu1.reset(hard);
    this.cpu2.reset(hard);
    this.dma.reset(hard);
    this.io.reset(hard);
    this.irq.reset(hard);
    this.mem.reset(hard);
    this.ppu.reset(hard);
    this.ppu.clearCanvas();
    this.apu.reset();
    this.StorageClear();
  }
  onAudioSample(l, r) {
    if (!this.actx) return;
    this.audioSample.l[this.audio_wcursor] = l;
    this.audioSample.r[this.audio_wcursor] = r;
    this.audio_wcursor = (this.audio_wcursor + 1) & this.SAMPLE_MASK;
  }
  setAudioProcessor() {
    if (!this.actx) return;
    this.atx_scr = this.actx.createScriptProcessor(this.AUDIO_BUFFERING, 0, 2);
    this.atx_scr.addEventListener("audioprocess", this.audioCallback.bind(this));
    this.atx_scr.connect(this.actx.destination);
    this.sampleRate = this.actx.sampleRate;
  }
  checkAudioRemain() {
    return (this.audio_wcursor - this.audio_rcursor) & this.SAMPLE_MASK;
  }
  audioCallback(e) {
    var dst = e.outputBuffer;
    let len = dst.length;
    var dst_l = dst.getChannelData(0);
    var dst_r = dst.getChannelData(1);
    if (this.checkAudioRemain() < this.AUDIO_BUFFERING) {
      return;
    }
    for (var i = 0; i < len; i++) {
      var src_idx = (this.audio_rcursor + i) & this.SAMPLE_MASK;
      dst_l[i] = this.audioSample.l[src_idx];
      dst_r[i] = this.audioSample.r[src_idx];
    }
    this.audio_rcursor = (this.audio_rcursor + len) & this.SAMPLE_MASK;
  }

  SetRom(arraybuffer) {
    if (!arraybuffer) return false;
    var u8array = new Uint8Array(arraybuffer);
    var rom = [];
    for (var i = 0; i < u8array.length; i++) {
      rom.push(u8array[i]);
    }
    if (!(rom[0] === 0x4e && rom[1] === 0x45 && rom[2] === 0x53 && rom[3] === 0x1a)) {
      return false;
    }
    const Rom = rom.concat(0);
    return this.ParseHeader(Rom);
  }
  ParseHeader(Rom) {
    if (!Rom) return;
    this.PrgRomPageCount = Rom[4];
    this.ChrRomPageCount = Rom[5];
    this.HMirror = (Rom[6] & 0x01) === 0;
    this.VMirror = (Rom[6] & 0x01) !== 0;
    this.SramEnable = (Rom[6] & 0x02) !== 0;
    this.TrainerEnable = (Rom[6] & 0x04) !== 0;
    this.FourScreen = (Rom[6] & 0x08) !== 0;
    this.MapperNumber = (Rom[6] >> 4) | (Rom[7] & 0xf0);
    console.log("--- MapperNumber " + this.MapperNumber);
    return Rom;
  }
  StorageClear() {
    var i, j;
    for (i = 0; i < this.SRAM.length; i++) {
      this.SRAM[i] = 0;
    }
    for (i = 0; i < this.PRGROM_STATE.length; i++) {
      this.PRGROM_STATE[i] = 0;
    }
    for (i = 0; i < this.CHRROM_STATE.length; i++) {
      this.CHRROM_STATE[i] = 0;
    }

    for (i = 0; i < 4; i++) {
      this.SetPrgRomPage8K(i, -(i + 1));
    }
  }
  StorageInit(Rom) {
    this.PRGROM_PAGES = null;
    this.CHRROM_PAGES = null;
    var nes_header_length = 0x0010;
    var prgrom_pagesize = 0x4000;
    var chrrom_pagesize = 0x2000;
    var i;
    if (this.PrgRomPageCount > 0) {
      this.PRGROM_PAGES = new Array(this.PrgRomPageCount * 2);
      for (i = 0; i < this.PrgRomPageCount * 2; i++) {
        var prgrom_offset = nes_header_length + (prgrom_pagesize / 2) * i;
        this.PRGROM_PAGES[i] = Rom.slice(prgrom_offset, prgrom_offset + prgrom_pagesize / 2);
      }
    }
    if (this.ChrRomPageCount > 0) {
      this.CHRROM_PAGES = new Array(this.ChrRomPageCount * 8);
      for (i = 0; i < this.ChrRomPageCount * 8; i++) {
        var chrrom_offset = nes_header_length + prgrom_pagesize * this.PrgRomPageCount + (chrrom_pagesize / 8) * i;
        this.CHRROM_PAGES[i] = Rom.slice(chrrom_offset, chrrom_offset + chrrom_pagesize / 2);
      }
    }
  }
  SetPrgRomPage8K(page, romPage) {
    let ZEROS_ROM_PAGE = new Array(0x2000);
    for (var i = 0; i < ZEROS_ROM_PAGE.length; i++) {
      ZEROS_ROM_PAGE[i] = 0;
    }
    if (romPage < 0) {
      this.PRGROM_STATE[page] = romPage;
      this.ROM[page] = this.ZEROS_ROM_PAGE;
    } else {
      this.PRGROM_STATE[page] = romPage % (this.PrgRomPageCount * 2);
      this.ROM[page] = this.PRGROM_PAGES[this.PRGROM_STATE[page]];
    }
  }
  SetPrgRomPages8K(romPage0, romPage1, romPage2, romPage3) {
    this.SetPrgRomPage8K(0, romPage0);
    this.SetPrgRomPage8K(1, romPage1);
    this.SetPrgRomPage8K(2, romPage2);
    this.SetPrgRomPage8K(3, romPage3);
  }
  SetPrgRomPage(no, num) {
    this.SetPrgRomPage8K(no * 2, num * 2);
    this.SetPrgRomPage8K(no * 2 + 1, num * 2 + 1);
  }
  keyDown(player, button) {
    if (player === 1) {
      this.io.crntCtrlState1 |= 1 << button;
    } else if (player === 2) {
      this.io.crntCtrlState2 |= 1 << button;
    }
  }
  keyUp(player, button) {
    if (player === 1) {
      this.io.crntCtrlState1 &= ~(1 << button) & 0xff;
    } else if (player === 2) {
      this.io.crntCtrlState2 &= ~(1 << button) & 0xff;
    }
  }
  mapperSelect() {
    switch (this.MapperNumber) {
      case 0:
        this.mapper = new Mapper0(this);
        break;
      case 1:
        this.mapper = new Mapper1(this);
        break;
      case 2:
        this.mapper = new Mapper2(this);
        break;
      case 3:
        this.mapper = new Mapper3(this);
        break;
      case 4:
        this.mapper = new Mapper4(this);
        break;
      case 5:
        this.mapper = new Mapper5(this);
        break;
      // case 7:
      // 	this.mapper = new Mapper7(this);
      // 	break;
      // case 9:
      // 	this.mapper = new Mapper9(this);
      // 	break;
      case 10:
        this.mapper = new Mapper10(this);
        break;
      // case 16:
      // 	this.mapper = new Mapper16(this);
      // 	break;
      // case 18:
      // 	this.mapper = new Mapper18(this);
      // 	break;
      // case 19:
      // 	this.mapper = new Mapper19(this);
      // 	break;
      // case 20:
      // 	// DiskSystem
      // 	//this.mapper = new Mapper20(this);
      // case 21:
      // 	this.mapper = new Mapper25(this);
      // 	break;
      // case 22:
      // 	this.mapper = new Mapper22(this);
      // 	break;
      // case 23:
      // 	this.mapper = new Mapper23(this);
      // 	break;
      // case 24:
      // 	this.mapper = new Mapper24(this);
      // 	break;
      // case 25:
      // 	this.mapper = new Mapper25(this);
      // 	break;
      // case 26:
      // 	this.mapper = new Mapper26(this);
      // 	break;
      // case 32:
      // 	this.mapper = new Mapper32(this);
      // 	break;
      // case 33:
      // 	this.mapper = new Mapper33(this);
      // 	break;
      // case 34:
      // 	this.mapper = new Mapper34(this);
      // 	break;
      // case 48:
      // 	this.mapper = new Mapper48(this);
      // 	break;
      // case 65:
      // 	this.mapper = new Mapper65(this);
      // 	break;
      // case 66:
      // 	this.mapper = new Mapper66(this);
      // 	break;
      // case 67:
      // 	this.mapper = new Mapper67(this);
      // 	break;
      // case 68:
      // 	this.mapper = new Mapper68(this);
      // 	break;
      // case 69:
      // 	this.mapper = new Mapper69(this);
      // 	break;
      // case 70:
      // 	this.mapper = new Mapper70(this);
      // 	break;
      // case 72:
      // 	this.mapper = new Mapper72(this);
      // 	break;
      // case 73:
      // 	this.mapper = new Mapper73(this);
      // 	break;
      // case 75:
      // 	this.mapper = new Mapper75(this);
      // 	break;
      case 76:
        this.mapper = new Mapper76(this);
        break;
      // case 77:
      // 	this.mapper = new Mapper77(this);
      // 	break;
      // case 78:
      // 	this.mapper = new Mapper78(this);
      // 	break;
      // case 80:
      // 	this.mapper = new Mapper80(this);
      // 	break;
      // case 82:
      // 	this.mapper = new Mapper82(this);
      // 	break;
      // case 85:
      // 	this.mapper = new Mapper85(this);
      // 	break;
      // case 86:
      // 	this.mapper = new Mapper86(this);
      // 	break;
      // case 87:
      // 	this.mapper = new Mapper87(this);
      // 	break;
      // case 88:
      // 	this.mapper = new Mapper88(this);
      // 	break;
      // case 89:
      // 	this.mapper = new Mapper89(this);
      // 	break;
      // case 92:
      // 	this.mapper = new Mapper92(this);
      // 	break;
      // case 93:
      // 	this.mapper = new Mapper93(this);
      // 	break;
      // case 94:
      // 	this.mapper = new Mapper94(this);
      // 	break;
      // case 95:
      // 	this.mapper = new Mapper95(this);
      // 	break;
      // case 97:
      // 	this.mapper = new Mapper97(this);
      // 	break;
      // case 101:
      // 	this.mapper = new Mapper101(this);
      // 	break;
      // case 118:
      // 	this.mapper = new Mapper118(this);
      // 	break;
      // case 119:
      // 	this.mapper = new Mapper119(this);
      // 	break;
      // case 140:
      // 	this.mapper = new Mapper140(this);
      // 	break;
      // case 152:
      // 	this.mapper = new Mapper152(this);
      // 	break;
      // case 180:
      // 	this.mapper = new Mapper180(this);
      // 	break;
      // case 184:
      // 	this.mapper = new Mapper184(this);
      // 	break;
      // case 185:
      // 	this.mapper = new Mapper185(this);
      // 	break;
      // case 207:
      // 	this.mapper = new Mapper207(this);
      // 	break;
      // case 210:
      // 	this.mapper = new Mapper19(this);
      // 	break;
      default:
        this.mapper = new Mapper0(this);
        return false;
    }
    return true;
  }

  Read_N163_RAM = function () {
    var ret = this.N163_RAM[this.N163_Address & 0x7f];
    if ((this.N163_Address & 0x80) === 0x80) this.N163_Address = ((this.N163_Address & 0x7f) + 1) | 0x80;
    return ret;
  };
  /* N163 */
  Init_N163 = function () {
    var i;
    for (i = 0; i < this.N163_RAM.length; i++) this.N163_RAM[i] = 0x00;
    for (i = 0; i < this.N163_ch_data.length; i++)
      this.N163_ch_data[i] = { Freq: 0, Phase: 0, Length: 0, Address: 0, Vol: 0 };
    this.N163_Address = 0x00;
    this.N163_ch = 0;
    this.N163_Clock = 0;
  };
  Write_N163_RAM = function (data) {
    var address = this.N163_Address & 0x7f;
    this.N163_RAM[address] = data;

    if (address >= 0x40) {
      var ch = (address >>> 3) & 0x07;
      switch (address & 0x07) {
        case 0x00:
          this.N163_ch_data[ch].Freq = (this.N163_ch_data[ch].Freq & 0x3ff00) | data;
          break;
        case 0x01:
          this.N163_ch_data[ch].Phase = (this.N163_ch_data[ch].Freq & 0xffff00) | data;
          break;
        case 0x02:
          this.N163_ch_data[ch].Freq = (this.N163_ch_data[ch].Freq & 0x300ff) | (data << 8);
          break;
        case 0x03:
          this.N163_ch_data[ch].Phase = (this.N163_ch_data[ch].Freq & 0xff00ff) | (data << 8);
          break;
        case 0x04:
          this.N163_ch_data[ch].Freq = (this.N163_ch_data[ch].Freq & 0x0ffff) | ((data & 0x03) << 16);
          this.N163_ch_data[ch].Length = (256 - (data & 0xfc)) << 16;
          break;
        case 0x05:
          this.N163_ch_data[ch].Phase = (this.N163_ch_data[ch].Freq & 0x00ffff) | (data << 16);
          break;
        case 0x06:
          this.N163_ch_data[ch].Address = data;
          break;
        case 0x07:
          this.N163_ch_data[ch].Vol = data & 0x0f;
          if (address === 0x7f) this.N163_ch = (data >>> 4) & 0x07;
          break;
      }
    }
    if ((this.N163_Address & 0x80) === 0x80) this.N163_Address = ((this.N163_Address & 0x7f) + 1) | 0x80;
  };

  Read_N163_RAM = function () {
    var ret = this.N163_RAM[this.N163_Address & 0x7f];
    if ((this.N163_Address & 0x80) === 0x80) this.N163_Address = ((this.N163_Address & 0x7f) + 1) | 0x80;
    return ret;
  };

  Count_N163 = function (clock) {
    this.N163_Clock += clock;
    var cl = (this.N163_ch + 1) * 15;
    while (this.N163_Clock >= cl) {
      this.N163_Clock -= cl;
      for (var i = 7 - this.N163_ch; i < 8; i++) {
        if (this.N163_ch_data[i].Length > 0)
          this.N163_ch_data[i].Phase =
            (this.N163_ch_data[i].Phase + this.N163_ch_data[i].Freq) % this.N163_ch_data[i].Length;
      }
    }
  };

  Out_N163 = function () {
    var all_out = 0;

    for (var i = 7 - this.N163_ch; i < 8; i++) {
      var addr = (this.N163_ch_data[i].Address + (this.N163_ch_data[i].Phase >> 16)) & 0xff;
      var data = this.N163_RAM[addr >>> 1];
      data = (addr & 0x01) === 0x00 ? data & 0x0f : data >>> 4;
      all_out += (data - 8) * this.N163_ch_data[i].Vol;
    }
    return all_out << 2;
  };

  Init_MMC5() {
    this.MMC5_FrameSequenceCounter = 0;
    this.MMC5_FrameSequence = 0;
    for (var i = 0; i < this.MMC5_REG.length; i++) this.MMC5_REG[i] = 0x00;
    this.MMC5_Ch[0] = { LengthCounter: 0, Envelope: 0, EnvelopeCounter: 0, Sweep: 0, Frequency: 0 };
    this.MMC5_Ch[1] = { LengthCounter: 0, Envelope: 0, EnvelopeCounter: 0, Sweep: 0, Frequency: 0 };
  }
  Write_MMC5_ChLength0(ch) {
    var tmp = ch << 2;
    this.MMC5_Ch[ch].Frequency = ((this.MMC5_REG[tmp + 0x03] & 0x07) << 8) + this.MMC5_REG[tmp + 0x02] + 1;
  }
  Write_MMC5_ChLength1(ch) {
    var tmp = ch << 2;
    this.MMC5_Ch[ch].LengthCounter = this.WaveLengthCount[this.MMC5_REG[tmp + 0x03] >> 3];
    this.MMC5_Ch[ch].Envelope = 0;
    this.MMC5_Ch[ch].EnvelopeCounter = 0x0f;
    this.MMC5_Ch[ch].Sweep = 0;
    this.MMC5_Ch[ch].Frequency = ((this.MMC5_REG[tmp + 0x03] & 0x07) << 8) + this.MMC5_REG[tmp + 0x02] + 1;
  }
  Write_MMC5_REG(no, data) {
    this.MMC5_REG[no] = data;

    switch (no) {
      case 0x02:
        this.Write_MMC5_ChLength0(0);
        break;
      case 0x03:
        this.Write_MMC5_ChLength1(0);
        break;
      case 0x06:
        this.Write_MMC5_ChLength0(1);
        break;
      case 0x07:
        this.Write_MMC5_ChLength1(1);
        break;
      case 0x015:
        for (var i = 0; i < 2; i++) {
          if ((this.MMC5_REG[0x15] & (0x01 << i)) === 0x00) this.MMC5_Ch[i].LengthCounter = 0;
        }
        break;
    }
  }
  Read_MMC5_REG(no) {
    if (no === 0x15) {
      var tmp = 0;
      for (var i = 0; i < 2; i++) {
        if (this.MMC5_Ch[i].LengthCounter !== 0) tmp |= 0x01 << i;
      }
    }
  }
  Count_MMC5(clock) {
    this.MMC5_FrameSequenceCounter += 240 * clock;

    var i, tmp;
    if (this.MMC5_FrameSequenceCounter >= this.MainClock) {
      this.MMC5_FrameSequenceCounter -= this.MainClock;

      for (i = 0; i < 2; i++) {
        tmp = i << 2;
        if ((this.MMC5_REG[tmp] & 0x10) === 0x00) {
          if (++this.MMC5_Ch[i].Envelope === (this.MMC5_REG[tmp] & 0x0f) + 1) {
            this.MMC5_Ch[i].Envelope = 0;
            if (this.MMC5_Ch[i].EnvelopeCounter === 0) {
              if ((this.MMC5_REG[tmp] & 0x20) === 0x20) this.MMC5_Ch[i].EnvelopeCounter = 0x0f;
            } else this.MMC5_Ch[i].EnvelopeCounter--;
          }
        }
      }

      if (this.MMC5_FrameSequence === 1 || this.MMC5_FrameSequence === 3) {
        for (i = 0; i < 2; i++) {
          tmp = i << 2;

          if ((this.MMC5_REG[tmp] & 0x20) === 0x00 && this.MMC5_Ch[i].LengthCounter !== 0) {
            if (--this.MMC5_Ch[i].LengthCounter === 0) this.MMC5_REG[0x15] &= ~(0x01 << i);
          }

          if (++this.MMC5_Ch[i].Sweep === ((this.MMC5_REG[tmp + 0x01] & 0x70) >> 4) + 1) {
            this.MMC5_Ch[i].Sweep = 0;
            if (
              (this.MMC5_REG[tmp + 0x01] & 0x80) === 0x80 &&
              (this.MMC5_REG[tmp + 0x01] & 0x07) !== 0x00 &&
              this.MMC5_Ch[i].LengthCounter !== 0
            ) {
              if ((this.MMC5_REG[tmp + 0x01] & 0x08) === 0x00)
                this.MMC5_Ch[i].Frequency += this.MMC5_Ch[i].Frequency >> (this.MMC5_REG[tmp + 0x01] & 0x07);
              else this.MMC5_Ch[i].Frequency -= this.MMC5_Ch[i].Frequency >> (this.MMC5_REG[tmp + 0x01] & 0x07);

              if (this.MMC5_Ch[i].Frequency < 0x08 || this.MMC5_Ch[i].Frequency > 0x7ff) {
                this.MMC5_Ch[i].LengthCounter = 0;
                this.MMC5_REG[0x15] &= ~(0x01 << i);
              }
            }
          }
        }
      }

      this.MMC5_FrameSequence = ++this.MMC5_FrameSequence & 0x03;
    }
  }
  Out_MMC5() {
    var all_out = 0;
    var tmpWaveBaseCount = this.WaveBaseCount << 1;

    for (var i = 0; i < 2; i++) {
      var tmp = i << 2;
      if (this.MMC5_Ch[i].LengthCounter !== 0 && this.MMC5_Ch[i].Frequency > 3)
        all_out +=
          ((this.MMC5_REG[tmp] & 0x10) === 0x10 ? this.MMC5_REG[tmp] & 0x0f : this.MMC5_Ch[i].EnvelopeCounter) *
          (((tmpWaveBaseCount / this.MMC5_Ch[i].Frequency) & 0x1f) <
          this.WaveCh1_2DutyData[(this.MMC5_REG[tmp] & 0xc0) >> 6]
            ? 1
            : -1);
    }

    all_out += (this.MMC5_REG[0x11] >> 2) - 16;
    return all_out << 5;
  }
  WaveLengthCount = [
    0x0a,
    0xfe,
    0x14,
    0x02,
    0x28,
    0x04,
    0x50,
    0x06,
    0xa0,
    0x08,
    0x3c,
    0x0a,
    0x0e,
    0x0c,
    0x1a,
    0x0e,
    0x0c,
    0x10,
    0x18,
    0x12,
    0x30,
    0x14,
    0x60,
    0x16,
    0xc0,
    0x18,
    0x48,
    0x1a,
    0x10,
    0x1c,
    0x20,
    0x1e,
  ];

  WaveCh1_2DutyData = [4, 8, 16, 24];
  MainClock = 1789772.5;
}
