class Nes {
  cpu = null;
  ppu = null;
  mem = null;
  mapper = null;
  dma = null;
  io = null;
  irq = null;

  canvas = null;
  ctx = null;
  imgData = null;

  actx = null;
  samples = null;
  audioBuf = null;
  inputBuffer = 0;
  inputBufferPos = 0;
  inputReadPos = 0;

  cycles = 0;

  constructor(canvas_id) {
    this.canvas = document.getElementById(canvas_id);
    if (!this.canvas) {
      console.error("error canvas id !");
    } else {
      this.canvas.width = 256;
      this.canvas.height = 240;
      this.ctx = this.canvas.getContext("2d");
      this.imgData = this.ctx.createImageData(256, 240);

      this.actx = new AudioContext();
      this.samples = this.actx.sampleRate / 60;
      this.audioBuf = new Float64Array(this.samples);
      this.inputBuffer = new Float64Array(4096);
      this.inputBufferPos = 0;
      this.inputReadPos = 0;

      this.io = new Io(this);
      this.ppu = new Ppu(this.imgData.data.buffer);
      this.mem = new Mem(this, this.ppu,this.io);
      this.cpu = new Cpu(this.mem);
      this.dma = new Dma(this.mem);
      this.irq = new Irq(this.cpu);
      this.apu = new Apu(this,this.mem,this.irq);

      this.mem.setApu(this.apu);
      this.mem.setDma(this.dma);
      this.cpu.setIrq(this.irq);
      this.ppu.setIrq(this.irq);
      this.initWebAudio();
    }
  }
  reset() {
    if (this.actx) this.actx.suspend();
    this.cycles = 0;
    this.cpu.reset();
    this.ppu.reset();
    this.apu.reset();
    this.mem.reset();
    this.io.reset();
    this.irq.reset();
    this.dma.reset();
    if (this.mapper) {
      this.mapper.reset(true);
    }
    this.inputBufferPos = 0;
    this.inputReadPos = 0;
  }
  init(arybuf) {
    if (!this.imgData) return;
    this.loadRom(arybuf);
    this.reset();
    if (this.mapper) {
      this.startWebAudio();
      return true;
    }
    return false;
  }
  loadRom(arybuf) {
    let mapper = this.loadMapper(arybuf);
    if (mapper) {
      this.mapper = mapper;
      this.mem.setMapper(mapper);
      this.ppu.setMapper(mapper);
    }
  }
  cycle(info) {
    if (this.cycles % 3 === 0) {
      if (this.io.ctrlLatched) {
        this.io.hdCtrlLatch();
      }

      this.irq.checkIrqWanted();

      if (!this.dma.getInDma()) {
        this.cpu.run(info);
      } else {
        this.dma.runDma();
      }
      this.apu.cycle();
    }
    this.ppu.run();
    this.cycles++;
  }
  runFrame() {
    do {
      this.cycle();
    } while (!(this.ppu.line === 240 && this.ppu.cycles === 0));
  }
  runFrames() {
    this.runFrame();
    this.ctx.putImageData(this.imgData, 0, 0);
    this.getSamples();
  }
  getSamples() {
    if (!this.actx) return;
    let samples = this.apu.getOutput();
    let runAdd = 29780 / this.samples;
    let inputPos = 0;
    let running = 0;
    for (let i = 0; i < this.samples; i++) {
      running += runAdd;
      let total = 0;
      let avgCount = running & 0xffff;
      for (let j = inputPos; j < inputPos + avgCount; j++) {
        total += samples[1][j];
      }
      this.audioBuf[i] = total / avgCount;
      inputPos += avgCount;
      running -= avgCount;
    }
    this.nextBuffer(this.audioBuf);
  }
  nextBuffer(abuf) {
    if (!this.actx) return;
    for (let i = 0; i < this.samples; i++) {
      this.inputBuffer[this.inputBufferPos++ & 0xfff] = abuf[i];
    }
  }
  initWebAudio() {
    if (!this.actx) return;
    const sp = this.actx.createScriptProcessor(2048, 1, 1);
    sp.onaudioprocess = (e) => {
      this.process(e);
    };
    sp.connect(this.actx.destination);
  }
  process(e) {
    if (this.inputReadPos + 2048 > this.inputBufferPos) {
      this.inputReadPos = this.inputBufferPos - 2048;
    }
    if (this.inputReadPos + 4096 < this.inputBufferPos) {
      this.inputReadPos += 2048;
    }
    let output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < 2048; i++) {
      output[i] = this.inputBuffer[this.inputReadPos++ & 0xfff];
    }
  }
  startWebAudio() {
    this.actx.resume();
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
  loadMapper(arybuf) {
    let rom = new Uint8Array(arybuf);
    let header = this.checkRom(rom);
    let nrom = null;
    if (!header) return;
    if (mappers[header.mapper] === undefined) {
      console.log("Unsupported mapper: " + header.mapper);
      return false;
    } else {
      try {
        nrom = new mappers[header.mapper](this,rom, header);
      } catch (e) {
        console.log("Rom load error: " + e);
        return false;
      }
    }
    this.mapper = nrom;

    console.log(nrom);
    console.log(
      "Loaded " + this.mapper.name + " rom: " + this.mapper.h.banks +
      " PRG bank(s), " + this.mapper.h.chrBanks + " CHR bank(s)"
    );
    return nrom;
  }
  checkRom(rom) {
    if (rom.length < 0x10) {
      console.log("Invalid rom loaded");
      return false;
    }
    if (rom[0] !== 0x4e || rom[1] !== 0x45 || rom[2] !== 0x53 || rom[3] !== 0x1a) {
      console.log("Invalid rom loaded");
      return false;
    }
    let header = this.parseHeader(rom);
    if (rom.length < header.chrBase + 0x2000 * header.chrBanks) {
      console.log("Rom file is missing data");
      return false;
    }
    return header;
  }

  parseHeader(rom) {
    let nrom = {
      banks: rom[4],
      chrBanks: rom[5],
      mapper: (rom[6] >> 4) | (rom[7] & 0xf0),
      verticalMirroring: (rom[6] & 0x01) > 0,
      battery: (rom[6] & 0x02) > 0,
      trainer: (rom[6] & 0x04) > 0,
      fourScreen: (rom[6] & 0x08) > 0,
    };
    nrom["base"] = 16 + (nrom.trainer ? 512 : 0);
    nrom["chrBase"] = nrom.base + 0x4000 * nrom.banks;
    nrom["prgAnd"] = nrom.banks * 0x4000 - 1;
    nrom["chrAnd"] = nrom.chrBanks === 0 ? 0x1fff : nrom.chrBanks * 0x2000 - 1;
    nrom["saveVars"] = ["banks", "chrBanks", "mapper", "verticalMirroring", "battery", "trainer", "fourScreen"];
    return nrom;
  }
  INPUT = {
    A: 0,
    B: 1,
    SELECT: 2,
    START: 3,
    UP: 4,
    DOWN: 5,
    LEFT: 6,
    RIGHT: 7,
  };
  runCount(arybuf, count, info) {
    if (!this.init(arybuf)) return;
    for (let i = 0; i < count; i++) {
      this.cycle(info);
    }
  }
}
