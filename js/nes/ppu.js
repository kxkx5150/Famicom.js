'use strict';
class PPU {
  constructor(nes, ctx) {
    this.nes = nes;
    this.width = 256;
    this.height = 224;
    this.regs = new Array(8);
    this.VRAM = new Array(16);
    this.VRAMS = new Array(16);
    this.SPRITE_RAM = new Array(0x100);
    this.Palette = new Array(33);
    this.BgLineBuffer = new Array(256 + 8);
    this.SPBitArray = new Array(256);
    this.SpriteLineBuffer = new Array(256);
    this.PPUReadBuffer = 0;
    this.PpuX = 0;
    this.PpuY = 0;
    this.Sprite0Line = false;
    this.PaletteTable = [
      [101, 101, 101],
      [0, 45, 105],
      [19, 31, 127],
      [60, 19, 124],
      [96, 11, 98],
      [115, 10, 55],
      [113, 15, 7],
      [90, 26, 0],
      [52, 40, 0],
      [11, 52, 0],
      [0, 60, 0],
      [0, 61, 16],
      [0, 56, 64],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [174, 174, 174],
      [15, 99, 179],
      [64, 81, 208],
      [120, 65, 204],
      [167, 54, 169],
      [192, 52, 112],
      [189, 60, 48],
      [159, 74, 0],
      [109, 92, 0],
      [54, 109, 0],
      [7, 119, 4],
      [0, 121, 61],
      [0, 114, 125],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [254, 254, 255],
      [93, 179, 255],
      [143, 161, 255],
      [200, 144, 255],
      [247, 133, 250],
      [255, 131, 192],
      [255, 139, 127],
      [239, 154, 73],
      [189, 172, 44],
      [133, 188, 47],
      [85, 199, 83],
      [60, 201, 140],
      [62, 194, 205],
      [78, 78, 78],
      [0, 0, 0],
      [0, 0, 0],
      [254, 254, 255],
      [188, 223, 255],
      [209, 216, 255],
      [232, 209, 255],
      [251, 205, 253],
      [255, 204, 229],
      [255, 207, 202],
      [248, 213, 180],
      [228, 220, 168],
      [204, 227, 169],
      [185, 232, 184],
      [174, 232, 208],
      [175, 229, 234],
      [182, 182, 182],
      [0, 0, 0],
      [0, 0, 0],
    ];
    this.PaletteArray = [
      0x10,
      0x01,
      0x02,
      0x03,
      0x10,
      0x05,
      0x06,
      0x07,
      0x10,
      0x09,
      0x0a,
      0x0b,
      0x10,
      0x0d,
      0x0e,
      0x0f,
    ];
    this.ctx = ctx;
    this.ImageData = this.ctx.createImageData(this.width, this.height);
    this.framebuffer_u32 = new Uint32Array(this.ImageData.data.buffer);
    this.initCanvas();
    this.clearArray();
  }
  reset() {
    this.ScrollRegisterFlag = false;
    this.PPUAddressRegisterFlag = false;
    this.HScrollTmp = 0;
    this.PPUAddress = 0;
    this.PPUAddressBuffer = 0;
    this.PpuX = 341;
    this.PpuY = 0;
    this.Sprite0Line = false;
    this.clearArray();
  }
  init() {
    this.ScrollRegisterFlag = false;
    this.PPUAddressRegisterFlag = false;
    this.HScrollTmp = 0;
    this.PPUAddress = 0;
    this.PPUAddressBuffer = 0;
    this.Palette = new Array(33);

    for (var i = 0; i < this.Palette.length; i++) {
      this.Palette[i] = 0x0f;
    }
    for (var i = 0; i < this.SpriteLineBuffer.length; i++) {
      this.SpriteLineBuffer[i] = 0;
    }

    this.PPUReadBuffer = 0;
    if (this.nes.FourScreen) {
      this.SetMirrors(0, 1, 2, 3);
    } else {
      this.SetMirror(this.nes.HMirror);
    }

    this.PpuX = 341;
    this.PpuY = 0;
    this.Sprite0Line = false;
  }
  PpuRun() {
    var tmpx = this.PpuX;
    this.PpuX += this.nes.cpu.CPUClock * 3;

    while (this.PpuX >= 341) {
      this.PpuX -= 341;
      this.PpuY++;
      tmpx = 0;
      this.Sprite0Line = false;

      if (this.PpuY === 262) {
        this.postRender();
      }

      // this.nes.mapper.HSync(this.PpuY);

      if (this.PpuY === 240) {
        this.inVblank();
        continue;
      } else if (this.PpuY < 240) {
        this.renderFrame();
      }
      // if (this.nes.BRAK) break;
    }

    if (this.Sprite0Line && (this.regs[0x02] & 0x40) !== 0x40) {
      var i = this.PpuX > 255 ? 255 : this.PpuX;
      for (; tmpx <= i; tmpx++) {
        if (this.SpriteLineBuffer[tmpx] === 0) {
          this.regs[0x02] |= 0x40;
          break;
        }
      }
    }
  }
  renderFrame() {
    if (this.IsScreenEnable || this.IsSpriteEnable) {
      this.PPUAddress = (this.PPUAddress & 0xfbe0) | (this.PPUAddressBuffer & 0x041f);

      if (8 <= this.PpuY && this.PpuY < 232) {
        this.BuildBGLine();
        this.BuildSpriteLine();

        let tmpDist = (this.PpuY - 8) << 10;
        const fb = this.framebuffer_u32;
        for (var p = 0; p < 256; p++, tmpDist += 4) {
          let idx = this.Palette[this.BgLineBuffer[p]];
          let tmpPal = this.PaletteTable[idx];
          this.setImageData(fb, tmpDist, tmpPal);
        }
      } else {
        for (var p = 0; p < 264; p++) this.BgLineBuffer[p] = 0x10;

        this.BuildSpriteLine();
      }

      if ((this.PPUAddress & 0x7000) == 0x7000) {
        this.PPUAddress &= 0x8fff;

        if ((this.PPUAddress & 0x03e0) == 0x03a0) {
          this.PPUAddress = (this.PPUAddress ^ 0x0800) & 0xfc1f;
        } else if ((this.PPUAddress & 0x03e0) == 0x03e0) {
          this.PPUAddress &= 0xfc1f;
        } else {
          this.PPUAddress += 0x0020;
        }
      } else {
        this.PPUAddress += 0x1000;
      }

    } else if (8 <= this.PpuY && this.PpuY < 232) {
      let tmpDist = (this.PpuY - 8) << 10;
      const fb = this.framebuffer_u32;
      let tmpPal = this.PaletteTable[this.Palette[0x10]];
      for (var p = 0; p < 256; p++, tmpDist += 4) {
        this.setImageData(fb, tmpDist, tmpPal);
      }
    }
  }
  inVblank() {
    this.nes.DrawFlag = true;
    if (this.nes.speedCount <= 1) this.ctx.putImageData(this.ImageData, 0, 0);
    this.ScrollRegisterFlag = false;
    this.regs[0x02] &= 0x1f;
    this.regs[0x02] |= 0x80;
    if ((this.regs[0x00] & 0x80) === 0x80) this.nes.irq.nmiWanted = true;
  }
  postRender() {
    this.PpuY = 0;
    if (this.IsScreenEnable || this.IsSpriteEnable) {
      this.PPUAddress = this.PPUAddressBuffer;
    }
    this.regs[0x02] &= 0x7f;
  }
  setImageData(fb, dist, plt) {
    fb[dist / 4] = (255 << 24) | (plt[2] << 16) | (plt[1] << 8) | plt[0];
  }
  BuildBGLine() {
    if ((this.regs[0x01] & 0x08) !== 0x08) {
      for (let p = 0; p < 264; p++) this.BgLineBuffer[p] = 0x10;
      return;
    }

    this.BuildBGLine_SUB();
    if ((this.regs[0x01] & 0x02) !== 0x02) {
      for (let p = 0; p < 8; p++) this.BgLineBuffer[p] = 0x10;
    }
  }
  BuildBGLine_SUB() {
    let nameAddr = 0x2000 | (this.PPUAddress & 0x0fff);
    let tableAddr =
      ((this.PPUAddress & 0x7000) >> 12) | (((this.regs[0x00] & 0x10)) << 8);
    let nameAddrHigh = nameAddr >> 10;
    let nameAddrLow = nameAddr & 0x03ff;
    let pre_name_addrh = nameAddrHigh;
    let s = this.HScrollTmp;
    let q = 0;

    for (let p = 0; p < 33; p++) {
      let tmpVRAMHigh = this.VRAM[pre_name_addrh];
      let ptnDist = ((tmpVRAMHigh[nameAddrLow]) << 4) | tableAddr;
      let tmpSrcV = this.VRAM[(ptnDist >> 10)];
      ptnDist &= 0x03ff;

      let lval = (nameAddrLow & 0x0380) >> 4;
      let rval = ((nameAddrLow & 0x001c) >> 2) + 0x03c0;

      let lval2 = (nameAddrLow & 0x0040) >> 4;
      let rval2 = nameAddrLow & 0x0002;
      let attr = ((tmpVRAMHigh[lval | rval] << 2) >> (lval2 | rval2)) & 0x0c;

      let spbidx1 = tmpSrcV[ptnDist];
      let spbidx2 = tmpSrcV[(ptnDist + 8)];
      let ptn = this.SPBitArray[spbidx1][spbidx2];

      while (s < 8) {
        let idx = ptn[s] | attr;
        this.BgLineBuffer[q] = this.PaletteArray[idx];
        q += 1;
        s += 1;
      }
      s = 0;

      if ((nameAddrLow & 0x001f) == 0x001f) {
        nameAddrLow &= 0xffe0;
        nameAddrHigh ^= 0x01;
        pre_name_addrh = nameAddrHigh;
      } else {
        nameAddrLow += 1;
      }
    }
  }
  BuildSpriteLine() {
    var SpriteClipping = (this.regs[0x01] & 0x04) === 0x04 ? 0 : 8;

    if ((this.regs[0x01] & 0x10) === 0x10) {
      this.SpriteLineBuffer.fill(256)
      var spptableaddr = (this.regs[0x00] & 0x08) << 9;
      var count = 0;
      let bzsize = this.isBigSize;

      for (var i = 0; i <= 252; i += 4) {
        var isy = this.SPRITE_RAM[i] + 1;
        if (isy > this.PpuY || isy + bzsize <= this.PpuY) {
          continue;
        }

        if (i === 0) {
          this.Sprite0Line = true;
        }

        if (++count === 9) {
          break;
        }

        var attr = this.SPRITE_RAM[i + 2];
        var attribute = ((attr & 0x03) << 2) | 0x10;
        var bgsp = (attr & 0x20) === 0x00;

        var x = this.SPRITE_RAM[i + 3];
        var ex = x + 8;
        if (ex > 256) ex = 256;

        var iy = (attr & 0x80) === 0x80 ? bzsize - 1 - (this.PpuY - isy) : this.PpuY - isy;

        let lval = (this.SPRITE_RAM[i + 1] << 4) + spptableaddr;
        let rval = ((this.SPRITE_RAM[i + 1] & 0xfe) << 4) + ((this.SPRITE_RAM[i + 1] & 0x01) << 12);

        let sval = bzsize === 8
          ? lval
          : rval;

        var tileNum = ((iy & 0x08) << 1) + (iy & 0x07) + sval;
        var tmpLow = tileNum & 0x03ff;

        if ((attr & 0x40) === 0x00) {
          var is = 0;
          var ia = 1;
        } else {
          var is = 7;
          var ia = -1;
        }

        let ptnidxl = this.VRAM[tileNum >> 10][tmpLow];
        let ptnidxr = this.VRAM[tileNum >> 10][tmpLow + 8]
        var ptn = this.SPBitArray[ptnidxl][ptnidxr];



        for (; x < ex; x++, is += ia) {
          var tmpPtn = ptn[is];

          if (tmpPtn !== 0x00 && this.SpriteLineBuffer[x] === 256) {
            this.SpriteLineBuffer[x] = i;
            if (x >= SpriteClipping && (bgsp || this.BgLineBuffer[x] === 0x10))
              this.BgLineBuffer[x] = tmpPtn | attribute;
          }
        }

        console.log("");
      }

      if (count >= 8) this.regs[0x02] |= 0x20;
      else this.regs[0x02] &= 0xdf;
    }
  }


  WriteScrollRegister(value) {
    this.regs[0x05] = value;
    if (this.ScrollRegisterFlag) {
      this.PPUAddressBuffer = (this.PPUAddressBuffer & 0x8c1f)
        | ((value & 0xf8) << 2)
        | ((value & 0x07) << 12);
    } else {
      this.PPUAddressBuffer =
        (this.PPUAddressBuffer & 0xffe0) | ((value & 0xf8) >> 3);
      this.HScrollTmp = value & 7;
    }
    this.ScrollRegisterFlag = !this.ScrollRegisterFlag;
  }
  WritePPUControlRegister0(value) {
    this.regs[0x00] = value;
    this.PPUAddressBuffer = (this.PPUAddressBuffer & 0xf3ff) | (((value & 0x03)) << 10);
  }
  WritePPUControlRegister1(value) {
    this.regs[0x01] = value;
  }
  WritePPUAddressRegister(value) {
    this.regs[0x06] = value;
    if (this.PPUAddressRegisterFlag) {
      this.PPUAddressBuffer = (this.PPUAddressBuffer & 0xff00) | value;
      this.PPUAddress = this.PPUAddressBuffer;
    } else {
      this.PPUAddressBuffer =
        (this.PPUAddressBuffer & 0x00ff) | ((value & 0x3f) << 8);
    }
    this.PPUAddressRegisterFlag = !this.PPUAddressRegisterFlag;
  }
  ReadPPUStatus() {
    let result = this.regs[0x02];
    this.regs[0x02] &= 0x1f;
    this.ScrollRegisterFlag = false;
    this.PPUAddressRegisterFlag = false;
    return result;
  }
  ReadPPUData() {
    let tmp = this.PPUReadBuffer;
    let addr = this.PPUAddress & 0x3fff;
    this.PPUReadBuffer = this.VRAM[(addr >> 10)][addr & 0x03ff];
    let val = (this.regs[0x00] & 0x04) == 0x04 ? 32 : 1;
    this.PPUAddress = (this.PPUAddress + val) & 0xffff;
    return tmp;
  }
  WritePPUData(value) {
    this.regs[0x07] = value;
    let tmpPPUAddress = this.PPUAddress & 0x3fff;
    this.VRAM[tmpPPUAddress >> 10][tmpPPUAddress & 0x03ff] = value;

    if (tmpPPUAddress < 0x3000) {
      let val = (this.regs[0x00] & 0x04) == 0x04 ? 32 : 1;
      this.PPUAddress = (this.PPUAddress + val) & 0xffff;
      return;
    }

    if (tmpPPUAddress < 0x3eff) {
      this.VRAM[(tmpPPUAddress - 0x1000) >> 10][(tmpPPUAddress - 0x1000) & 0x03ff] = value;
      let val = (this.regs[0x00] & 0x04) == 0x04 ? 32 : 1;
      this.PPUAddress = (this.PPUAddress + val) & 0xffff;
      return;
    }

    let palNo = tmpPPUAddress & 0x001f;
    if (palNo == 0x00 || palNo == 0x10) {
      this.Palette[0x10] = (value & 0x3f);
      this.Palette[0x00] = this.Palette[0x10];
    } else {
      this.Palette[palNo] = value & 0x3f;
    }
    let val = (this.regs[0x00] & 0x04) == 0x04 ? 32 : 1;
    this.PPUAddress = (this.PPUAddress + val) & 0xffff;
  }
  WriteSpriteData(data) {
    this.SPRITE_RAM[this.regs[0x03]] = data;
    this.regs[0x03] = (this.regs[0x03] + 1) & 0xff;
  }
  WriteSpriteAddressRegister(data) {
    this.regs[0x03] = data;
  }
  get IsScreenEnable() {
    return (this.regs[0x01] & 0x08) === 0x08;
  }
  get IsSpriteEnable() {
    return (this.regs[0x01] & 0x10) === 0x10;
  }
  get isBigSize() {
    return (this.regs[0x00] & 0x20) === 0x20 ? 16 : 8;
  }


  initCanvas() {
    for (var i = 0; i < this.width * this.height * 4; i += 4) {
      this.ImageData.data[i + 3] = 0xff;
    }
    this.ctx.putImageData(this.ImageData, 0, 0);
  }
  clearArray() {
    for (var i = 0; i < this.regs.length; i++) {
      this.regs[i] = 0;
    }
    for (var i = 0; i < this.VRAM.length; i++) {
      this.VRAM[i] = 0;
    }
    for (var i = 0; i < 16; i++) this.VRAMS[i] = new Array(0x0400);
    for (var i = 0; i < this.VRAMS.length; i++) {
      for (j = 0; j < this.VRAMS[i].length; j++) {
        this.VRAMS[i][j] = 0;
      }
      this.SetChrRomPage1K(i, i + 0x0100);
    }
    for (var i = 0; i < this.SPRITE_RAM.length; i++) {
      this.SPRITE_RAM[i] = 0;
    }
    for (var i = 0; i < this.Palette.length; i++) {
      this.Palette[i] = 0x0f;
    }
    for (var i = 0; i < this.BgLineBuffer.length; i++) {
      this.BgLineBuffer[i] = 0;
    }



    for (var i = 0; i < 256; i++) {
      this.SPBitArray[i] = new Array(256);
      for (var j = 0; j < 256; j++) {
        this.SPBitArray[i][j] = new Array(8);
        for (var k = 0; k < 8; k++) {

          let lval = (((i << k) & 0x80) >> 7);
          let rval = (((j << k) & 0x80) >> 6);
          let val = (lval | rval);

          this.SPBitArray[i][j][k] = val;

        }
      }
    }

    for (var i = 0; i < this.SpriteLineBuffer.length; i++) {
      this.SpriteLineBuffer[i] = 0;
    }
  }
  SetMirror(value) {
    if (value) this.SetMirrors(0, 0, 1, 1);
    else this.SetMirrors(0, 1, 0, 1);
  }
  SetMirrors(value0, value1, value2, value3) {
    this.SetChrRomPage1K(8, value0 + 8 + 0x0100);
    this.SetChrRomPage1K(9, value1 + 8 + 0x0100);
    this.SetChrRomPage1K(10, value2 + 8 + 0x0100);
    this.SetChrRomPage1K(11, value3 + 8 + 0x0100);
  }
  SetChrRomPage1K(page, romPage) {
    if (romPage >= 0x0100) {
      this.nes.CHRROM_STATE[page] = romPage;
      this.VRAM[page] = this.VRAMS[romPage & 0xff].concat();
    } else {
      if (this.nes.ChrRomPageCount > 0) {
        this.nes.CHRROM_STATE[page] = romPage % (this.nes.ChrRomPageCount * 8);
        this.VRAM[page] = this.nes.CHRROM_PAGES[this.nes.CHRROM_STATE[page]].concat();
      }
    }
  }
  SetChrRomPages1K(romPage0, romPage1, romPage2, romPage3, romPage4, romPage5, romPage6, romPage7) {
    this.SetChrRomPage1K(0, romPage0);
    this.SetChrRomPage1K(1, romPage1);
    this.SetChrRomPage1K(2, romPage2);
    this.SetChrRomPage1K(3, romPage3);
    this.SetChrRomPage1K(4, romPage4);
    this.SetChrRomPage1K(5, romPage5);
    this.SetChrRomPage1K(6, romPage6);
    this.SetChrRomPage1K(7, romPage7);
  }
  SetChrRomPage(num) {
    num <<= 3;
    for (var i = 0; i < 8; i++) {
      this.SetChrRomPage1K(i, num + i);
    }
  }
}
