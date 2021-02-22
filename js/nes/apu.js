'use strict';
class APU {
  constructor(nes) {
    this.nes = nes;
    this.square1 = new ChannelSquare(this, true);
    this.square2 = new ChannelSquare(this, false);
    this.triangle = new ChannelTriangle(this);
    this.noise = new ChannelNoise(this);
    this.dmc = new ChannelDM(this);
    this.frameIrqCounter = null;
    this.frameIrqCounterMax = 4;
    this.initCounter = 2048;
    this.channelEnableValue = null;
    this.sampleRate = 44100;
    this.lengthLookup = null;
    this.dmcFreqLookup = null;
    this.noiseWavelengthLookup = null;
    this.square_table = null;
    this.tnd_table = null;
    this.frameIrqEnabled = false;
    this.frameIrqActive = null;
    this.frameClockNow = null;
    this.startedPlaying = false;
    this.recordOutput = false;
    this.initingHardware = false;
    this.masterFrameCounter = null;
    this.derivedFrameCounter = null;
    this.countSequence = null;
    this.sampleTimer = null;
    this.frameTime = null;
    this.sampleTimerMax = null;
    this.sampleCount = null;
    this.triValue = 0;
    this.smpSquare1 = null;
    this.smpSquare2 = null;
    this.smpTriangle = null;
    this.smpDmc = null;
    this.accCount = null;
    this.prevSampleL = 0;
    this.prevSampleR = 0;
    this.smpAccumL = 0;
    this.smpAccumR = 0;
    this.dacRange = 0;
    this.dcValue = 0;
    this.masterVolume = 256;
    this.stereoPosLSquare1 = null;
    this.stereoPosLSquare2 = null;
    this.stereoPosLTriangle = null;
    this.stereoPosLNoise = null;
    this.stereoPosLDMC = null;
    this.stereoPosRSquare1 = null;
    this.stereoPosRSquare2 = null;
    this.stereoPosRTriangle = null;
    this.stereoPosRNoise = null;
    this.stereoPosRDMC = null;
    this.extraCycles = null;
    this.maxSample = null;
    this.minSample = null;
    this.panning = [80, 170, 100, 150, 128];
    this.setPanning(this.panning);
    this.initLengthLookup();
    this.initDmcFrequencyLookup();
    this.initNoiseWavelengthLookup();
    this.initDACtables();
    for (var i = 0; i < 0x14; i++) {
      if (i === 0x10) {
        this.writeReg(0x4010, 0x10);
      } else {
        this.writeReg(0x4000 + i, 0);
      }
    }
    this.reset();
  }
  reset() {
    this.sampleRate = this.nes.sampleRate;
    this.sampleTimerMax = Math.floor((1024.0 * 1789772.5 * this.nes.fps) / (this.sampleRate * 60.0));
    this.frameTime = Math.floor((14915.0 * this.nes.fps) / 60.0);
    this.sampleTimer = 0;
    this.updateChannelEnable(0);
    this.masterFrameCounter = 0;
    this.derivedFrameCounter = 0;
    this.countSequence = 0;
    this.sampleCount = 0;
    this.initCounter = 2048;
    this.frameIrqEnabled = false;
    this.initingHardware = false;
    this.resetCounter();
    this.square1.reset();
    this.square2.reset();
    this.triangle.reset();
    this.noise.reset();
    this.dmc.reset();
    this.accCount = 0;
    this.smpSquare1 = 0;
    this.smpSquare2 = 0;
    this.smpTriangle = 0;
    this.smpDmc = 0;
    this.frameIrqEnabled = false;
    this.frameIrqCounterMax = 4;
    this.channelEnableValue = 0xff;
    this.startedPlaying = false;
    this.prevSampleL = 0;
    this.prevSampleR = 0;
    this.smpAccumL = 0;
    this.smpAccumR = 0;
    this.maxSample = -500000;
    this.minSample = 500000;
  }
  readReg(address) {
    var tmp = 0;
    tmp |= this.square1.getLengthStatus();
    tmp |= this.square2.getLengthStatus() << 1;
    tmp |= this.triangle.getLengthStatus() << 2;
    tmp |= this.noise.getLengthStatus() << 3;
    tmp |= this.dmc.getLengthStatus() << 4;
    tmp |= (this.frameIrqActive && this.frameIrqEnabled ? 1 : 0) << 6;
    tmp |= this.dmc.getIrqStatus() << 7;
    this.frameIrqActive = false;
    this.dmc.irqGenerated = false;
    return tmp & 0xffff;
  }
  writeReg(address, value) {
    if (address >= 0x4000 && address < 0x4004) {
      this.square1.writeReg(address, value);
    } else if (address >= 0x4004 && address < 0x4008) {
      this.square2.writeReg(address, value);
    } else if (address >= 0x4008 && address < 0x400c) {
      this.triangle.writeReg(address, value);
    } else if (address >= 0x400c && address <= 0x400f) {
      this.noise.writeReg(address, value);
    } else if (address === 0x4010) {
      this.dmc.writeReg(address, value);
    } else if (address === 0x4011) {
      this.dmc.writeReg(address, value);
    } else if (address === 0x4012) {
      this.dmc.writeReg(address, value);
    } else if (address === 0x4013) {
      this.dmc.writeReg(address, value);
    } else if (address === 0x4015) {
      this.updateChannelEnable(value);
      if (value !== 0 && this.initCounter > 0) {
        this.initingHardware = true;
      }
      this.dmc.writeReg(address, value);
    } else if (address === 0x4017) {
      this.countSequence = (value >> 7) & 1;
      this.masterFrameCounter = 0;
      this.frameIrqActive = false;
      if (((value >> 6) & 0x1) === 0) {
        this.frameIrqEnabled = true;
      } else {
        this.frameIrqEnabled = false;
      }
      if (this.countSequence === 0) {
        this.frameIrqCounterMax = 4;
        this.derivedFrameCounter = 4;
      } else {
        this.frameIrqCounterMax = 5;
        this.derivedFrameCounter = 0;
        this.frameCounterTick();
      }
    }
  }
  resetCounter() {
    if (this.countSequence === 0) {
      this.derivedFrameCounter = 4;
    } else {
      this.derivedFrameCounter = 0;
    }
  }
  updateChannelEnable(value) {
    this.channelEnableValue = value & 0xffff;
    this.square1.setEnabled((value & 1) !== 0);
    this.square2.setEnabled((value & 2) !== 0);
    this.triangle.setEnabled((value & 4) !== 0);
    this.noise.setEnabled((value & 8) !== 0);
    this.dmc.setEnabled((value & 16) !== 0);
  }
  clockFrameCounter(nCycles) {
    if (this.initCounter > 0) {
      if (this.initingHardware) {
        this.initCounter -= nCycles;
        if (this.initCounter <= 0) {
          this.initingHardware = false;
        }
        return;
      }
    }
    nCycles += this.extraCycles;
    var maxCycles = this.sampleTimerMax - this.sampleTimer;
    if (nCycles << 10 > maxCycles) {
      this.extraCycles = ((nCycles << 10) - maxCycles) >> 10;
      nCycles -= this.extraCycles;
    } else {
      this.extraCycles = 0;
    }
    var dmc = this.dmc;
    var triangle = this.triangle;
    var square1 = this.square1;
    var square2 = this.square2;
    var noise = this.noise;
    if (dmc.isEnabled) {
      dmc.shiftCounter -= nCycles << 3;
      while (dmc.shiftCounter <= 0 && dmc.dmaFrequency > 0) {
        dmc.shiftCounter += dmc.dmaFrequency;
        dmc.clockDmc();
      }
    }
    if (triangle.progTimerMax > 0) {
      triangle.progTimerCount -= nCycles;
      while (triangle.progTimerCount <= 0) {
        triangle.progTimerCount += triangle.progTimerMax + 1;
        if (triangle.linearCounter > 0 && triangle.lengthCounter > 0) {
          triangle.triangleCounter++;
          triangle.triangleCounter &= 0x1f;
          if (triangle.isEnabled) {
            if (triangle.triangleCounter >= 0x10) {
              triangle.sampleValue = triangle.triangleCounter & 0xf;
            } else {
              triangle.sampleValue = 0xf - (triangle.triangleCounter & 0xf);
            }
            triangle.sampleValue <<= 4;
          }
        }
      }
    }
    square1.progTimerCount -= nCycles;
    if (square1.progTimerCount <= 0) {
      square1.progTimerCount += (square1.progTimerMax + 1) << 1;
      square1.squareCounter++;
      square1.squareCounter &= 0x7;
      square1.updateSampleValue();
    }
    square2.progTimerCount -= nCycles;
    if (square2.progTimerCount <= 0) {
      square2.progTimerCount += (square2.progTimerMax + 1) << 1;
      square2.squareCounter++;
      square2.squareCounter &= 0x7;
      square2.updateSampleValue();
    }
    var acc_c = nCycles;
    if (noise.progTimerCount - acc_c > 0) {
      noise.progTimerCount -= acc_c;
      noise.accCount += acc_c;
      noise.accValue += acc_c * noise.sampleValue;
    } else {
      while (acc_c-- > 0) {
        if (--noise.progTimerCount <= 0 && noise.progTimerMax > 0) {
          noise.shiftReg <<= 1;
          noise.tmp = ((noise.shiftReg << (noise.randomMode === 0 ? 1 : 6)) ^ noise.shiftReg) & 0x8000;
          if (noise.tmp !== 0) {
            noise.shiftReg |= 0x01;
            noise.randomBit = 0;
            noise.sampleValue = 0;
          } else {
            noise.randomBit = 1;
            if (noise.isEnabled && noise.lengthCounter > 0) {
              noise.sampleValue = noise.masterVolume;
            } else {
              noise.sampleValue = 0;
            }
          }
          noise.progTimerCount += noise.progTimerMax;
        }
        noise.accValue += noise.sampleValue;
        noise.accCount++;
      }
    }
    if (this.frameIrqEnabled && this.frameIrqActive) {
      this.nes.irq.irqWanted = true;
    }
    this.masterFrameCounter += nCycles << 1;
    if (this.masterFrameCounter >= this.frameTime) {
      this.masterFrameCounter -= this.frameTime;
      this.frameCounterTick();
    }
    this.accSample(nCycles);
    this.sampleTimer += nCycles << 10;
    if (this.sampleTimer >= this.sampleTimerMax) {
      this.sample();
      this.sampleTimer -= this.sampleTimerMax;
    }
  }
  accSample(cycles) {
    if (this.triangle.sampleCondition) {
      this.triValue = Math.floor((this.triangle.progTimerCount << 4) / (this.triangle.progTimerMax + 1));
      if (this.triValue > 16) {
        this.triValue = 16;
      }
      if (this.triangle.triangleCounter >= 16) {
        this.triValue = 16 - this.triValue;
      }
      this.triValue += this.triangle.sampleValue;
    }
    if (cycles === 2) {
      this.smpTriangle += this.triValue << 1;
      this.smpDmc += this.dmc.sample << 1;
      this.smpSquare1 += this.square1.sampleValue << 1;
      this.smpSquare2 += this.square2.sampleValue << 1;
      this.accCount += 2;
    } else if (cycles === 4) {
      this.smpTriangle += this.triValue << 2;
      this.smpDmc += this.dmc.sample << 2;
      this.smpSquare1 += this.square1.sampleValue << 2;
      this.smpSquare2 += this.square2.sampleValue << 2;
      this.accCount += 4;
    } else {
      this.smpTriangle += cycles * this.triValue;
      this.smpDmc += cycles * this.dmc.sample;
      this.smpSquare1 += cycles * this.square1.sampleValue;
      this.smpSquare2 += cycles * this.square2.sampleValue;
      this.accCount += cycles;
    }
  }
  frameCounterTick() {
    this.derivedFrameCounter++;
    if (this.derivedFrameCounter >= this.frameIrqCounterMax) {
      this.derivedFrameCounter = 0;
    }
    if (this.derivedFrameCounter === 1 || this.derivedFrameCounter === 3) {
      this.triangle.clockLengthCounter();
      this.square1.clockLengthCounter();
      this.square2.clockLengthCounter();
      this.noise.clockLengthCounter();
      this.square1.clockSweep();
      this.square2.clockSweep();
    }
    if (this.derivedFrameCounter >= 0 && this.derivedFrameCounter < 4) {
      this.square1.clockEnvDecay();
      this.square2.clockEnvDecay();
      this.noise.clockEnvDecay();
      this.triangle.clockLinearCounter();
    }
    if (this.derivedFrameCounter === 3 && this.countSequence === 0) {
      this.frameIrqActive = true;
    }
  }
  sample() {
    var sq_index, tnd_index;
    if (this.accCount > 0) {
      this.smpSquare1 <<= 4;
      this.smpSquare1 = Math.floor(this.smpSquare1 / this.accCount);
      this.smpSquare2 <<= 4;
      this.smpSquare2 = Math.floor(this.smpSquare2 / this.accCount);
      this.smpTriangle = Math.floor(this.smpTriangle / this.accCount);
      this.smpDmc <<= 4;
      this.smpDmc = Math.floor(this.smpDmc / this.accCount);
      this.accCount = 0;
    } else {
      this.smpSquare1 = this.square1.sampleValue << 4;
      this.smpSquare2 = this.square2.sampleValue << 4;
      this.smpTriangle = this.triangle.sampleValue;
      this.smpDmc = this.dmc.sample << 4;
    }
    var smpNoise = Math.floor((this.noise.accValue << 4) / this.noise.accCount);
    this.noise.accValue = smpNoise >> 4;
    this.noise.accCount = 1;
    sq_index = (this.smpSquare1 * this.stereoPosLSquare1 + this.smpSquare2 * this.stereoPosLSquare2) >> 8;
    tnd_index =
      (3 * this.smpTriangle * this.stereoPosLTriangle +
        (smpNoise << 1) * this.stereoPosLNoise +
        this.smpDmc * this.stereoPosLDMC) >>
      8;
    if (sq_index >= this.square_table.length) {
      sq_index = this.square_table.length - 1;
    }
    if (tnd_index >= this.tnd_table.length) {
      tnd_index = this.tnd_table.length - 1;
    }
    var sampleValueL = this.square_table[sq_index] + this.tnd_table[tnd_index] - this.dcValue;
    sq_index = (this.smpSquare1 * this.stereoPosRSquare1 + this.smpSquare2 * this.stereoPosRSquare2) >> 8;
    tnd_index =
      (3 * this.smpTriangle * this.stereoPosRTriangle +
        (smpNoise << 1) * this.stereoPosRNoise +
        this.smpDmc * this.stereoPosRDMC) >>
      8;
    if (sq_index >= this.square_table.length) {
      sq_index = this.square_table.length - 1;
    }
    if (tnd_index >= this.tnd_table.length) {
      tnd_index = this.tnd_table.length - 1;
    }
    var sampleValueR = this.square_table[sq_index] + this.tnd_table[tnd_index] - this.dcValue;
    var smpDiffL = sampleValueL - this.prevSampleL;
    this.prevSampleL += smpDiffL;
    this.smpAccumL += smpDiffL - (this.smpAccumL >> 10);
    sampleValueL = this.smpAccumL;
    var smpDiffR = sampleValueR - this.prevSampleR;
    this.prevSampleR += smpDiffR;
    this.smpAccumR += smpDiffR - (this.smpAccumR >> 10);
    sampleValueR = this.smpAccumR;
    if (sampleValueL > this.maxSample) {
      this.maxSample = sampleValueL;
    }
    if (sampleValueL < this.minSample) {
      this.minSample = sampleValueL;
    }
    this.nes.onAudioSample(sampleValueL / 32768, sampleValueR / 32768);
    this.smpSquare1 = 0;
    this.smpSquare2 = 0;
    this.smpTriangle = 0;
    this.smpDmc = 0;
  }
  getLengthMax(value) {
    return this.lengthLookup[value >> 3];
  }
  getDmcFrequency(value) {
    if (value >= 0 && value < 0x10) {
      return this.dmcFreqLookup[value];
    }
    return 0;
  }
  getNoiseWaveLength(value) {
    if (value >= 0 && value < 0x10) {
      return this.noiseWavelengthLookup[value];
    }
    return 0;
  }
  setPanning(pos) {
    for (var i = 0; i < 5; i++) {
      this.panning[i] = pos[i];
    }
    this.updateStereoPos();
  }
  setMasterVolume(value) {
    if (value < 0) {
      value = 0;
    }
    if (value > 256) {
      value = 256;
    }
    this.masterVolume = value;
    this.updateStereoPos();
  }
  updateStereoPos() {
    this.stereoPosLSquare1 = (this.panning[0] * this.masterVolume) >> 8;
    this.stereoPosLSquare2 = (this.panning[1] * this.masterVolume) >> 8;
    this.stereoPosLTriangle = (this.panning[2] * this.masterVolume) >> 8;
    this.stereoPosLNoise = (this.panning[3] * this.masterVolume) >> 8;
    this.stereoPosLDMC = (this.panning[4] * this.masterVolume) >> 8;
    this.stereoPosRSquare1 = this.masterVolume - this.stereoPosLSquare1;
    this.stereoPosRSquare2 = this.masterVolume - this.stereoPosLSquare2;
    this.stereoPosRTriangle = this.masterVolume - this.stereoPosLTriangle;
    this.stereoPosRNoise = this.masterVolume - this.stereoPosLNoise;
    this.stereoPosRDMC = this.masterVolume - this.stereoPosLDMC;
  }
  initLengthLookup() {
    this.lengthLookup = [
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
  }
  initDmcFrequencyLookup() {
    this.dmcFreqLookup = new Array(16);
    this.dmcFreqLookup[0x0] = 0xd60;
    this.dmcFreqLookup[0x1] = 0xbe0;
    this.dmcFreqLookup[0x2] = 0xaa0;
    this.dmcFreqLookup[0x3] = 0xa00;
    this.dmcFreqLookup[0x4] = 0x8f0;
    this.dmcFreqLookup[0x5] = 0x7f0;
    this.dmcFreqLookup[0x6] = 0x710;
    this.dmcFreqLookup[0x7] = 0x6b0;
    this.dmcFreqLookup[0x8] = 0x5f0;
    this.dmcFreqLookup[0x9] = 0x500;
    this.dmcFreqLookup[0xa] = 0x470;
    this.dmcFreqLookup[0xb] = 0x400;
    this.dmcFreqLookup[0xc] = 0x350;
    this.dmcFreqLookup[0xd] = 0x2a0;
    this.dmcFreqLookup[0xe] = 0x240;
    this.dmcFreqLookup[0xf] = 0x1b0;
  }
  initNoiseWavelengthLookup() {
    this.noiseWavelengthLookup = new Array(16);
    this.noiseWavelengthLookup[0x0] = 0x004;
    this.noiseWavelengthLookup[0x1] = 0x008;
    this.noiseWavelengthLookup[0x2] = 0x010;
    this.noiseWavelengthLookup[0x3] = 0x020;
    this.noiseWavelengthLookup[0x4] = 0x040;
    this.noiseWavelengthLookup[0x5] = 0x060;
    this.noiseWavelengthLookup[0x6] = 0x080;
    this.noiseWavelengthLookup[0x7] = 0x0a0;
    this.noiseWavelengthLookup[0x8] = 0x0ca;
    this.noiseWavelengthLookup[0x9] = 0x0fe;
    this.noiseWavelengthLookup[0xa] = 0x17c;
    this.noiseWavelengthLookup[0xb] = 0x1fc;
    this.noiseWavelengthLookup[0xc] = 0x2fa;
    this.noiseWavelengthLookup[0xd] = 0x3f8;
    this.noiseWavelengthLookup[0xe] = 0x7f2;
    this.noiseWavelengthLookup[0xf] = 0xfe4;
  }
  initDACtables() {
    var value, ival, i;
    var max_sqr = 0;
    var max_tnd = 0;
    this.square_table = new Array(32 * 16);
    this.tnd_table = new Array(204 * 16);
    for (i = 0; i < 32 * 16; i++) {
      value = 95.52 / (8128.0 / (i / 16.0) + 100.0);
      value *= 0.98411;
      value *= 50000.0;
      ival = Math.floor(value);
      this.square_table[i] = ival;
      if (ival > max_sqr) {
        max_sqr = ival;
      }
    }
    for (i = 0; i < 204 * 16; i++) {
      value = 163.67 / (24329.0 / (i / 16.0) + 100.0);
      value *= 0.98411;
      value *= 50000.0;
      ival = Math.floor(value);
      this.tnd_table[i] = ival;
      if (ival > max_tnd) {
        max_tnd = ival;
      }
    }
    this.dacRange = max_sqr + max_tnd;
    this.dcValue = this.dacRange / 2;
  }
}
class ChannelDM {
  constructor(apu) {
    this.apu = apu;

    this.MODE_NORMAL = 0;
    this.MODE_LOOP = 1;
    this.MODE_IRQ = 2;

    this.isEnabled = null;
    this.hasSample = null;
    this.irqGenerated = false;

    this.playMode = null;
    this.dmaFrequency = null;
    this.dmaCounter = null;
    this.deltaCounter = null;
    this.playStartAddress = null;
    this.playAddress = null;
    this.playLength = null;
    this.playLengthCounter = null;
    this.shiftCounter = null;
    this.reg4012 = null;
    this.reg4013 = null;
    this.sample = null;
    this.dacLsb = null;
    this.data = null;

    this.reset();
  }
  clockDmc() {
    if (this.hasSample) {
      if ((this.data & 1) === 0) {
        if (this.deltaCounter > 0) {
          this.deltaCounter--;
        }
      } else {
        if (this.deltaCounter < 63) {
          this.deltaCounter++;
        }
      }

      this.sample = this.isEnabled ? (this.deltaCounter << 1) + this.dacLsb : 0;

      this.data >>= 1;
    }

    this.dmaCounter--;
    if (this.dmaCounter <= 0) {
      this.hasSample = false;
      this.endOfSample();
      this.dmaCounter = 8;
    }

    if (this.irqGenerated) {
      this.apu.nes.irq.irqWanted = true;
    }
  }
  endOfSample() {
    if (this.playLengthCounter === 0 && this.playMode === this.MODE_LOOP) {
      this.playAddress = this.playStartAddress;
      this.playLengthCounter = this.playLength;
    }

    if (this.playLengthCounter > 0) {
      this.nextSample();

      if (this.playLengthCounter === 0) {
        if (this.playMode === this.MODE_IRQ) {
          this.irqGenerated = true;
        }
      }
    }
  }
  nextSample() {
    this.data = this.apu.nes.mem.Get(this.playAddress);
    this.apu.nes.cpu.CPUClock += 4;

    this.playLengthCounter--;
    this.playAddress++;
    if (this.playAddress > 0xffff) {
      this.playAddress = 0x8000;
    }

    this.hasSample = true;
  }
  writeReg(address, value) {
    if (address === 0x4010) {
      if (value >> 6 === 0) {
        this.playMode = this.MODE_NORMAL;
      } else if (((value >> 6) & 1) === 1) {
        this.playMode = this.MODE_LOOP;
      } else if (value >> 6 === 2) {
        this.playMode = this.MODE_IRQ;
      }

      if ((value & 0x80) === 0) {
        this.irqGenerated = false;
      }

      this.dmaFrequency = this.apu.getDmcFrequency(value & 0xf);
    } else if (address === 0x4011) {
      this.deltaCounter = (value >> 1) & 63;
      this.dacLsb = value & 1;
      this.sample = (this.deltaCounter << 1) + this.dacLsb;
    } else if (address === 0x4012) {
      this.playStartAddress = (value << 6) | 0x0c000;
      this.playAddress = this.playStartAddress;
      this.reg4012 = value;
    } else if (address === 0x4013) {
      this.playLength = (value << 4) + 1;
      this.playLengthCounter = this.playLength;
      this.reg4013 = value;
    } else if (address === 0x4015) {
      if (((value >> 4) & 1) === 0) {
        this.playLengthCounter = 0;
      } else {
        this.playAddress = this.playStartAddress;
        this.playLengthCounter = this.playLength;
      }
      this.irqGenerated = false;
    }
  }
  setEnabled(value) {
    if (!this.isEnabled && value) {
      this.playLengthCounter = this.playLength;
    }
    this.isEnabled = value;
  }
  getLengthStatus() {
    return this.playLengthCounter === 0 || !this.isEnabled ? 0 : 1;
  }
  getIrqStatus() {
    return this.irqGenerated ? 1 : 0;
  }
  reset() {
    this.isEnabled = false;
    this.irqGenerated = false;
    this.playMode = this.MODE_NORMAL;
    this.dmaFrequency = 0;
    this.dmaCounter = 0;
    this.deltaCounter = 0;
    this.playStartAddress = 0;
    this.playAddress = 0;
    this.playLength = 0;
    this.playLengthCounter = 0;
    this.sample = 0;
    this.dacLsb = 0;
    this.shiftCounter = 0;
    this.reg4012 = 0;
    this.reg4013 = 0;
    this.data = 0;
  }
}
class ChannelNoise {
  constructor(apu) {
    this.apu = apu;

    this.isEnabled = null;
    this.envDecayDisable = null;
    this.envDecayLoopEnable = null;
    this.lengthCounterEnable = null;
    this.envReset = null;
    this.shiftNow = null;

    this.lengthCounter = null;
    this.progTimerCount = null;
    this.progTimerMax = null;
    this.envDecayRate = null;
    this.envDecayCounter = null;
    this.envVolume = null;
    this.masterVolume = null;
    this.shiftReg = 1 << 14;
    this.randomBit = null;
    this.randomMode = null;
    this.sampleValue = null;
    this.accValue = 0;
    this.accCount = 1;
    this.tmp = null;

    this.reset();
  }
  reset() {
    this.progTimerCount = 0;
    this.progTimerMax = 0;
    this.isEnabled = false;
    this.lengthCounter = 0;
    this.lengthCounterEnable = false;
    this.envDecayDisable = false;
    this.envDecayLoopEnable = false;
    this.shiftNow = false;
    this.envDecayRate = 0;
    this.envDecayCounter = 0;
    this.envVolume = 0;
    this.masterVolume = 0;
    this.shiftReg = 1;
    this.randomBit = 0;
    this.randomMode = 0;
    this.sampleValue = 0;
    this.tmp = 0;
  }
  clockLengthCounter() {
    if (this.lengthCounterEnable && this.lengthCounter > 0) {
      this.lengthCounter--;
      if (this.lengthCounter === 0) {
        this.updateSampleValue();
      }
    }
  }
  clockEnvDecay() {
    if (this.envReset) {
      this.envReset = false;
      this.envDecayCounter = this.envDecayRate + 1;
      this.envVolume = 0xf;
    } else if (--this.envDecayCounter <= 0) {
      this.envDecayCounter = this.envDecayRate + 1;
      if (this.envVolume > 0) {
        this.envVolume--;
      } else {
        this.envVolume = this.envDecayLoopEnable ? 0xf : 0;
      }
    }
    if (this.envDecayDisable) {
      this.masterVolume = this.envDecayRate;
    } else {
      this.masterVolume = this.envVolume;
    }
    this.updateSampleValue();
  }
  updateSampleValue() {
    if (this.isEnabled && this.lengthCounter > 0) {
      this.sampleValue = this.randomBit * this.masterVolume;
    }
  }
  writeReg(address, value) {
    if (address === 0x400c) {
      this.envDecayDisable = (value & 0x10) !== 0;
      this.envDecayRate = value & 0xf;
      this.envDecayLoopEnable = (value & 0x20) !== 0;
      this.lengthCounterEnable = (value & 0x20) === 0;
      if (this.envDecayDisable) {
        this.masterVolume = this.envDecayRate;
      } else {
        this.masterVolume = this.envVolume;
      }
    } else if (address === 0x400e) {
      this.progTimerMax = this.apu.getNoiseWaveLength(value & 0xf);
      this.randomMode = value >> 7;
    } else if (address === 0x400f) {
      this.lengthCounter = this.apu.getLengthMax(value & 248);
      this.envReset = true;
    }
  }
  setEnabled(value) {
    this.isEnabled = value;
    if (!value) {
      this.lengthCounter = 0;
    }
    this.updateSampleValue();
  }
  getLengthStatus() {
    return this.lengthCounter === 0 || !this.isEnabled ? 0 : 1;
  }
}
class ChannelSquare {
  constructor(apu, square1) {
    this.apu = apu;

    this.dutyLookup = [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1];

    this.impLookup = [
      1,
      -1,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      -1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      -1,
      0,
      0,
      0,
      -1,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
    ];

    this.sqr1 = square1;
    this.isEnabled = null;
    this.lengthCounterEnable = null;
    this.sweepActive = null;
    this.envDecayDisable = null;
    this.envDecayLoopEnable = null;
    this.envReset = null;
    this.sweepCarry = null;
    this.updateSweepPeriod = null;

    this.progTimerCount = null;
    this.progTimerMax = null;
    this.lengthCounter = null;
    this.squareCounter = null;
    this.sweepCounter = null;
    this.sweepCounterMax = null;
    this.sweepMode = null;
    this.sweepShiftAmount = null;
    this.envDecayRate = null;
    this.envDecayCounter = null;
    this.envVolume = null;
    this.masterVolume = null;
    this.dutyMode = null;
    this.sweepResult = null;
    this.sampleValue = null;
    this.vol = null;

    this.reset();
  }
  reset() {
    this.progTimerCount = 0;
    this.progTimerMax = 0;
    this.lengthCounter = 0;
    this.squareCounter = 0;
    this.sweepCounter = 0;
    this.sweepCounterMax = 0;
    this.sweepMode = 0;
    this.sweepShiftAmount = 0;
    this.envDecayRate = 0;
    this.envDecayCounter = 0;
    this.envVolume = 0;
    this.masterVolume = 0;
    this.dutyMode = 0;
    this.vol = 0;

    this.isEnabled = false;
    this.lengthCounterEnable = false;
    this.sweepActive = false;
    this.sweepCarry = false;
    this.envDecayDisable = false;
    this.envDecayLoopEnable = false;
  }
  clockLengthCounter() {
    if (this.lengthCounterEnable && this.lengthCounter > 0) {
      this.lengthCounter--;
      if (this.lengthCounter === 0) {
        this.updateSampleValue();
      }
    }
  }
  clockEnvDecay() {
    if (this.envReset) {
      this.envReset = false;
      this.envDecayCounter = this.envDecayRate + 1;
      this.envVolume = 0xf;
    } else if (--this.envDecayCounter <= 0) {
      this.envDecayCounter = this.envDecayRate + 1;
      if (this.envVolume > 0) {
        this.envVolume--;
      } else {
        this.envVolume = this.envDecayLoopEnable ? 0xf : 0;
      }
    }

    if (this.envDecayDisable) {
      this.masterVolume = this.envDecayRate;
    } else {
      this.masterVolume = this.envVolume;
    }
    this.updateSampleValue();
  }
  clockSweep() {
    if (--this.sweepCounter <= 0) {
      this.sweepCounter = this.sweepCounterMax + 1;
      if (this.sweepActive && this.sweepShiftAmount > 0 && this.progTimerMax > 7) {
        this.sweepCarry = false;
        if (this.sweepMode === 0) {
          this.progTimerMax += this.progTimerMax >> this.sweepShiftAmount;
          if (this.progTimerMax > 4095) {
            this.progTimerMax = 4095;
            this.sweepCarry = true;
          }
        } else {
          this.progTimerMax = this.progTimerMax - ((this.progTimerMax >> this.sweepShiftAmount) - (this.sqr1 ? 1 : 0));
        }
      }
    }

    if (this.updateSweepPeriod) {
      this.updateSweepPeriod = false;
      this.sweepCounter = this.sweepCounterMax + 1;
    }
  }
  updateSampleValue() {
    if (this.isEnabled && this.lengthCounter > 0 && this.progTimerMax > 7) {
      if (this.sweepMode === 0 && this.progTimerMax + (this.progTimerMax >> this.sweepShiftAmount) > 4095) {
        this.sampleValue = 0;
      } else {
        this.sampleValue = this.masterVolume * this.dutyLookup[(this.dutyMode << 3) + this.squareCounter];
      }
    } else {
      this.sampleValue = 0;
    }
  }
  writeReg(address, value) {
    var addrAdd = this.sqr1 ? 0 : 4;
    if (address === 0x4000 + addrAdd) {
      this.envDecayDisable = (value & 0x10) !== 0;
      this.envDecayRate = value & 0xf;
      this.envDecayLoopEnable = (value & 0x20) !== 0;
      this.dutyMode = (value >> 6) & 0x3;
      this.lengthCounterEnable = (value & 0x20) === 0;
      if (this.envDecayDisable) {
        this.masterVolume = this.envDecayRate;
      } else {
        this.masterVolume = this.envVolume;
      }
      this.updateSampleValue();
    } else if (address === 0x4001 + addrAdd) {
      this.sweepActive = (value & 0x80) !== 0;
      this.sweepCounterMax = (value >> 4) & 7;
      this.sweepMode = (value >> 3) & 1;
      this.sweepShiftAmount = value & 7;
      this.updateSweepPeriod = true;
    } else if (address === 0x4002 + addrAdd) {
      this.progTimerMax &= 0x700;
      this.progTimerMax |= value;
    } else if (address === 0x4003 + addrAdd) {
      this.progTimerMax &= 0xff;
      this.progTimerMax |= (value & 0x7) << 8;

      if (this.isEnabled) {
        this.lengthCounter = this.apu.getLengthMax(value & 0xf8);
      }

      this.envReset = true;
    }
  }
  setEnabled(value) {
    this.isEnabled = value;
    if (!value) {
      this.lengthCounter = 0;
    }
    this.updateSampleValue();
  }
  getLengthStatus() {
    return this.lengthCounter === 0 || !this.isEnabled ? 0 : 1;
  }
}

class ChannelTriangle {
  constructor(apu) {
    this.apu = apu;

    this.isEnabled = null;
    this.sampleCondition = null;
    this.lengthCounterEnable = null;
    this.lcHalt = null;
    this.lcControl = null;

    this.progTimerCount = null;
    this.progTimerMax = null;
    this.triangleCounter = null;
    this.lengthCounter = null;
    this.linearCounter = null;
    this.lcLoadValue = null;
    this.sampleValue = null;
    this.tmp = null;

    this.reset();
  }
  reset() {
    this.progTimerCount = 0;
    this.progTimerMax = 0;
    this.triangleCounter = 0;
    this.isEnabled = false;
    this.sampleCondition = false;
    this.lengthCounter = 0;
    this.lengthCounterEnable = false;
    this.linearCounter = 0;
    this.lcLoadValue = 0;
    this.lcHalt = true;
    this.lcControl = false;
    this.tmp = 0;
    this.sampleValue = 0xf;
  }
  clockLengthCounter() {
    if (this.lengthCounterEnable && this.lengthCounter > 0) {
      this.lengthCounter--;
      if (this.lengthCounter === 0) {
        this.updateSampleCondition();
      }
    }
  }
  clockLinearCounter() {
    if (this.lcHalt) {
      this.linearCounter = this.lcLoadValue;
      this.updateSampleCondition();
    } else if (this.linearCounter > 0) {
      this.linearCounter--;
      this.updateSampleCondition();
    }
    if (!this.lcControl) {
      this.lcHalt = false;
    }
  }
  getLengthStatus() {
    return this.lengthCounter === 0 || !this.isEnabled ? 0 : 1;
  }

  readReg(address) {
    return 0;
  }
  writeReg(address, value) {
    if (address === 0x4008) {
      this.lcControl = (value & 0x80) !== 0;
      this.lcLoadValue = value & 0x7f;

      this.lengthCounterEnable = !this.lcControl;
    } else if (address === 0x400a) {
      this.progTimerMax &= 0x700;
      this.progTimerMax |= value;
    } else if (address === 0x400b) {
      this.progTimerMax &= 0xff;
      this.progTimerMax |= (value & 0x07) << 8;
      this.lengthCounter = this.apu.getLengthMax(value & 0xf8);
      this.lcHalt = true;
    }

    this.updateSampleCondition();
  }
  clockProgrammableTimer(nCycles) {
    if (this.progTimerMax > 0) {
      this.progTimerCount += nCycles;
      while (this.progTimerMax > 0 && this.progTimerCount >= this.progTimerMax) {
        this.progTimerCount -= this.progTimerMax;
        if (this.isEnabled && this.lengthCounter > 0 && this.linearCounter > 0) {
          this.clockTriangleGenerator();
        }
      }
    }
  }
  clockTriangleGenerator() {
    this.triangleCounter++;
    this.triangleCounter &= 0x1f;
  }
  setEnabled(value) {
    this.isEnabled = value;
    if (!value) {
      this.lengthCounter = 0;
    }
    this.updateSampleCondition();
  }
  updateSampleCondition() {
    this.sampleCondition = this.isEnabled && this.progTimerMax > 7 && this.linearCounter > 0 && this.lengthCounter > 0;
  }
}


