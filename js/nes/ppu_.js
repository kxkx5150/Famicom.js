class Ppu {
  mapper = null;
  irq = null;
  buffer = null;
  nes = null;

  paletteRam = new Uint8Array(0x20);
  oamRam = new Uint8Array(0x100);
  secondaryOam = new Uint8Array(0x20);
  spriteTiles = new Uint8Array(0x10);

  t = 0;
  v = 0;
  w = 0;
  x = 0;

  line = 0;
  cycles = 0;
  evenFrame = true;

  oamAddress = 0;
  readBuffer = 0;

  spriteZero = false;
  spriteOverflow = false;
  inVblank = false;

  vramIncrement = 1;
  spritePatternBase = 0;
  bgPatternBase = 0;
  spriteHeight = 8;
  slave = false;
  generateNmi = false;

  greyScale = false;
  bgInLeft = false;
  sprInLeft = false;
  bgRendering = false;
  sprRendering = false;
  emphasis = 0;

  atl = 0;
  atr = 0;
  tl = 0;
  th = 0;
  spriteZeroIn = false;
  spriteCount = 0;








  constructor(nes,buffer) {
    this.nes = nes;
    this.buffer = new Uint32Array(buffer);


    this.reset()

  }
  setMapper(mapper) {
    this.mapper = mapper;
  }
  setIrq(irq) {
    this.irq = irq;
  }
  reset() {
    // Memory
    let i = 0;
    this.vramMem = new Array(0x8000);
    this.spriteMem = new Array(0x100);
    for (i = 0; i < this.vramMem.length; i++) {
      this.vramMem[i] = 0;
    }
    for (i = 0; i < this.spriteMem.length; i++) {
      this.spriteMem[i] = 0;
    }
    this.vramMirrorTable = new Array(0x8000);
    for (i = 0; i < 0x8000; i++) {
      this.vramMirrorTable[i] = i;
    }
        // Create pattern table tile buffers:
    this.ptTile = new Array(512);
    for (i = 0; i < 512; i++) {
      this.ptTile[i] = new Tile();
    }




    
    







    this.paletteRam.fill(0);
    this.oamRam.fill(0);
    this.secondaryOam.fill(0);
    this.spriteTiles.fill(0);

    this.t = 0;
    this.v = 0;
    this.w = 0;
    this.x = 0;

    this.line = 0;
    this.cycles = 0;
    this.evenFrame = true;

    this.oamAddress = 0;
    this.readBuffer = 0;

    this.spriteZero = false;
    this.spriteOverflow = false;
    this.inVblank = false;

    this.vramIncrement = 1;
    this.spritePatternBase = 0;
    this.bgPatternBase = 0;
    this.spriteHeight = 8;
    this.slave = false;
    this.generateNmi = false;

    this.greyScale = false;
    this.bgInLeft = false;
    this.sprInLeft = false;
    this.bgRendering = false;
    this.sprRendering = false;
    this.emphasis = 0;

    this.atl = 0;
    this.atr = 0;
    this.tl = 0;
    this.th = 0;
    this.spriteZeroIn = false;
    this.spriteCount = 0;
  }









  run() {
    if (this.line < 240) {
      this.preRender();
    } else if (this.line === 241) {
      this.VblankLoop();
    } else if (this.line === 261) {
      this.postRender();
    }
    this.cycles++;
    if (this.cycles === 341 || (this.cycles === 340 && this.line === 261 && !this.evenFrame)) {
      this.cycles = 0;
      this.line++;
      if (this.line === 262) this.line = 0;
    }
  }
  preRender() {
    if (this.cycles < 256) {
      this.generateDot();
      if (((this.cycles + 1) & 0x7) === 0) {
        if (this.bgRendering || this.sprRendering) {
          this.readTileBuffers();
          this.incrementVx();
        }
      }
    } else if (this.cycles === 256) {
      if (this.bgRendering || this.sprRendering) {
        this.incrementVy();
      }
    } else if (this.cycles === 257) {
      if (this.bgRendering || this.sprRendering) {
        this.v &= 0x7be0;
        this.v |= this.t & 0x41f;
      }
    } else if (this.cycles === 270) {
      this.spriteZeroIn = false;
      this.spriteCount = 0;
      if (this.bgRendering || this.sprRendering) {
        this.evaluateSprites();
      }
    } else if (this.cycles === 321 || this.cycles === 329) {
      if (this.bgRendering || this.sprRendering) {
        this.readTileBuffers();
        this.incrementVx();
      }
    }
  }
  VblankLoop() {
    if (this.cycles === 1) {
      this.inVblank = true;
      if (this.generateNmi) {
        this.irq.nmiWanted = true;
      }
      if (this.bgRendering || this.sprRendering) {
        this.evenFrame = !this.evenFrame;
      } else {
        this.evenFrame = true;
      }
    }
  }
  postRender() {
    if (this.cycles === 1) {
      this.inVblank = false;
      this.spriteZero = false;
      this.spriteOverflow = false;
    } else if (this.cycles === 257) {
      if (this.bgRendering || this.sprRendering) {
        this.v &= 0x7be0;
        this.v |= this.t & 0x41f;
      }
    } else if (this.cycles === 270) {
      this.spriteZeroIn = false;
      this.spriteCount = 0;
      if (this.bgRendering || this.sprRendering) {
        let base = this.spriteHeight === 16 ? 0x1000 : this.spritePatternBase;
        this.readInternal(base + 0xfff);
      }
    } else if (this.cycles === 280) {
      if (this.bgRendering || this.sprRendering) {
        this.v &= 0x41f;
        this.v |= this.t & 0x7be0;
      }
    } else if (this.cycles === 321 || this.cycles === 329) {
      if (this.bgRendering || this.sprRendering) {
        this.readTileBuffers();
        this.incrementVx();
      }
    }
  }
  evaluateSprites() {
    for (let i = 0; i < 256; i += 4) {
      let sprY = this.oamRam[i];
      let sprRow = this.line - sprY;
      if (sprRow >= 0 && sprRow < this.spriteHeight) {
        if (this.spriteCount === 8) {
          this.spriteOverflow = true;
          break;
        } else {
          if (i === 0) {
            this.spriteZeroIn = true;
          }
          this.secondaryOam[this.spriteCount * 4] = this.oamRam[i];
          this.secondaryOam[this.spriteCount * 4 + 1] = this.oamRam[i + 1];
          this.secondaryOam[this.spriteCount * 4 + 2] = this.oamRam[i + 2];
          this.secondaryOam[this.spriteCount * 4 + 3] = this.oamRam[i + 3];

          if ((this.oamRam[i + 2] & 0x80) > 0) {
            sprRow = this.spriteHeight - 1 - sprRow;
          }
          let base = this.spritePatternBase;
          let tileNum = this.oamRam[i + 1];
          if (this.spriteHeight === 16) {
            base = (tileNum & 0x1) * 0x1000;
            tileNum = tileNum & 0xfe;
            tileNum += (sprRow & 0x8) >> 3;
            sprRow &= 0x7;
          }
          this.spriteTiles[this.spriteCount] = this.readInternal(base + tileNum * 16 + sprRow);
          this.spriteTiles[this.spriteCount + 8] = this.readInternal(base + tileNum * 16 + sprRow + 8);
          this.spriteCount++;
        }
      }
    }
    if (this.spriteCount < 8) {
      let base = this.spriteHeight === 16 ? 0x1000 : this.spritePatternBase;
      this.readInternal(base + 0xfff);
    }
  }
  readTileBuffers() {
    let tileNum = this.readInternal(0x2000 + (this.v & 0xfff));

    this.atl = this.atr;
    let attAdr = 0x23c0;
    attAdr |= (this.v & 0x1c) >> 2;
    attAdr |= (this.v & 0x380) >> 4;
    attAdr |= this.v & 0xc00;
    this.atr = this.readInternal(attAdr);
    if ((this.v & 0x40) > 0) {
      this.atr >>= 4;
    }
    this.atr &= 0xf;
    if ((this.v & 0x02) > 0) {
      this.atr >>= 2;
    }
    this.atr &= 0x3;

    let fineY = (this.v & 0x7000) >> 12;
    this.tl &= 0xff;
    this.tl <<= 8;
    this.tl |= this.readInternal(this.bgPatternBase + tileNum * 16 + fineY);
    this.th &= 0xff;
    this.th <<= 8;
    this.th |= this.readInternal(this.bgPatternBase + tileNum * 16 + fineY + 8);
  }
  generateDot() {
    let color;
    const bgPixel = this.getnerateBgDot()
    const sprobj = this.generateSpriteDot();

    if (!this.bgRendering && !this.sprRendering) {
      if ((this.v & 0x3fff) >= 0x3f00) {
        color = this.readPalette(this.v & 0x1f);
      } else {
        color = this.readPalette(0);
      }
    } else if (bgPixel === 0) {
      if (sprobj.sprPixel > 0) {
        color = this.readPalette(sprobj.sprPixel + 0x10);
      } else {
        color = this.readPalette(0);
      }
    } else if (sprobj.sprPixel > 0 && sprobj.sprPriority === 0) {
      color = this.readPalette(sprobj.sprPixel + 0x10);
    } else {
      color = this.readPalette(bgPixel);
    }
    this.setColorPalette(color);
  }
  generateSpriteDot(){
    let sprobj ={
      sprPixel:0,
      sprPriority:0
    }
    let sprNum = -1;
    if (this.sprRendering && (this.cycles > 7 || this.sprInLeft)) {
      for (let j = 0; j < this.spriteCount; j++) {
        let xPos = this.secondaryOam[j * 4 + 3];
        let xCol = this.cycles - xPos;
        if (xCol >= 0 && xCol < 8) {
          if ((this.secondaryOam[j * 4 + 2] & 0x40) > 0) {
            xCol = 7 - xCol;
          }
          let shift = 7 - xCol;
          let pixel = (this.spriteTiles[j] >> shift) & 1;
          pixel |= ((this.spriteTiles[j + 8] >> shift) & 1) << 1;
          if (pixel > 0) {
            sprobj.sprPixel = pixel | ((this.secondaryOam[j * 4 + 2] & 0x3) << 2);
            sprobj.sprPriority = (this.secondaryOam[j * 4 + 2] & 0x20) >> 5;
            sprNum = j;
            break;
          }
        }
      }
    }
    if (sprNum === 0 && this.spriteZeroIn && this.cycles !== 255) {
      this.spriteZero = true;
    }
    return sprobj;
  }
  getnerateBgDot(){
    let i = this.cycles & 0x7;
    let bgPixel = 0;
    if (this.bgRendering && (this.cycles > 7 || this.bgInLeft)) {
      let shiftAmount = 15 - i - this.x;
      bgPixel = (this.tl >> shiftAmount) & 1;
      bgPixel |= ((this.th >> shiftAmount) & 1) << 1;
      let atrOff;
      if (this.x + i > 7) {
        atrOff = this.atr * 4;
      } else {
        atrOff = this.atl * 4;
      }
      if (bgPixel > 0) {
        bgPixel += atrOff;
      }
    }
    return bgPixel;
  }
  setColorPalette(color) {
    let clr = (this.emphasis << 6) | (color & 0x3f);
    let r = this.nesColorPalette[clr & 0x3f][0];
    let g = this.nesColorPalette[clr & 0x3f][1];
    let b = this.nesColorPalette[clr & 0x3f][2];
    if ((clr & 0x40) > 0) {
      r = r * 1.1;
      g = g * 0.9;
      b = b * 0.9;
    }
    if ((clr & 0x80) > 0) {
      r = r * 0.9;
      g = g * 1.1;
      b = b * 0.9;
    }
    if ((clr & 0x100) > 0) {
      r = r * 0.9;
      g = g * 0.9;
      b = b * 1.1;
    }
    this.buffer[this.line * 256 + this.cycles] = r | (g << 8) | (b << 16) | (255 << 24);
  }
  incrementVx() {
    if ((this.v & 0x1f) === 0x1f) {
      this.v &= 0x7fe0;
      this.v ^= 0x400;
    } else {
      this.v++;
    }
  }
  incrementVy() {
    if ((this.v & 0x7000) !== 0x7000) {
      this.v += 0x1000;
    } else {
      this.v &= 0xfff;
      let coarseY = (this.v & 0x3e0) >> 5;
      if (coarseY === 29) {
        coarseY = 0;
        this.v ^= 0x800;
      } else if (coarseY === 31) {
        coarseY = 0;
      } else {
        coarseY++;
      }
      this.v &= 0x7c1f;
      this.v |= coarseY << 5;
    }
  }
  readInternal(adr) {
    adr &= 0x3fff;
    return this.mapper.ppuRead(adr);
  }
  writeInternal(adr, value) {
    adr &= 0x3fff;
    this.mapper.ppuWrite(adr, value);
  }
  readPalette(adr) {
    let palAdr = adr & 0x1f;
    if (palAdr >= 0x10 && (palAdr & 0x3) === 0) {
      palAdr -= 0x10;
    }
    let ret = this.paletteRam[palAdr];
    if (this.greyScale) {
      ret &= 0x30;
    }
    return ret;
  }
  writePalette(adr, value) {
    let palAdr = adr & 0x1f;
    if (palAdr >= 0x10 && (palAdr & 0x3) === 0) {
      palAdr -= 0x10;
    }
    this.paletteRam[palAdr] = value;
  }
  read(adr) {
    switch (adr) {
      case 0: {
        return 0;
      }
      case 1: {
        return 0;
      }
      case 2: {
        this.w = 0;
        let ret = 0;
        if (this.inVblank) {
          ret |= 0x80;
          this.inVblank = false;
        }
        ret |= this.spriteZero ? 0x40 : 0;
        ret |= this.spriteOverflow ? 0x20 : 0;
        return ret;
      }
      case 3: {
        return 0;
      }
      case 4: {
        return this.oamRam[this.oamAddress];
      }
      case 5: {
        return 0;
      }
      case 6: {
        return 0;
      }
      case 7: {
        let adr = this.v & 0x3fff;
        if ((this.bgRendering || this.sprRendering) && (this.line < 240 || this.line === 261)) {
          this.incrementVy();
          this.incrementVx();
        } else {
          this.v += this.vramIncrement;
          this.v &= 0x7fff;
        }
        let temp = this.readBuffer;
        if (adr >= 0x3f00) {
          temp = this.readPalette(adr);
        }
        this.readBuffer = this.readInternal(adr);
        return temp;
      }
    }
  }
  write(adr, value) {
    switch (adr) {
      case 0: {
        this.t &= 0x73ff;
        this.t |= (value & 0x3) << 10;

        this.vramIncrement = (value & 0x04) > 0 ? 32 : 1;
        this.spritePatternBase = (value & 0x08) > 0 ? 0x1000 : 0;
        this.bgPatternBase = (value & 0x10) > 0 ? 0x1000 : 0;
        this.spriteHeight = (value & 0x20) > 0 ? 16 : 8;
        let oldNmi = this.generateNmi;
        this.slave = (value & 0x40) > 0;
        this.generateNmi = (value & 0x80) > 0;

        if (this.generateNmi && !oldNmi && this.inVblank) {
          this.irq.nmiWanted = true;
        }
        return;
      }
      case 1: {
        this.greyScale = (value & 0x01) > 0;
        this.bgInLeft = (value & 0x02) > 0;
        this.sprInLeft = (value & 0x04) > 0;
        this.bgRendering = (value & 0x08) > 0;
        this.sprRendering = (value & 0x10) > 0;
        this.emphasis = (value & 0xe0) >> 5;
        return;
      }
      case 2: {
        return;
      }
      case 3: {
        this.oamAddress = value;
        return;
      }
      case 4: {
        this.oamRam[this.oamAddress++] = value;
        this.oamAddress &= 0xff;
        return;
      }
      case 5: {
        if (this.w === 0) {
          this.t &= 0x7fe0;
          this.t |= (value & 0xf8) >> 3;
          this.x = value & 0x7;
          this.w = 1;
        } else {
          this.t &= 0x0c1f;
          this.t |= (value & 0x7) << 12;
          this.t |= (value & 0xf8) << 2;
          this.w = 0;
        }
        return;
      }
      case 6: {
        if (this.w === 0) {
          this.t &= 0xff;
          this.t |= (value & 0x3f) << 8;
          this.w = 1;
        } else {
          this.t &= 0x7f00;
          this.t |= value;
          this.v = this.t;
          this.w = 0;
        }
        return;
      }
      case 7: {
        let adr = this.v & 0x3fff;
        if ((this.bgRendering || this.sprRendering) && (this.line < 240 || this.line === 261)) {
          this.incrementVy();
          this.incrementVx();
        } else {
          this.v += this.vramIncrement;
          this.v &= 0x7fff;
        }
        if (adr >= 0x3f00) {
          this.writePalette(adr, value);
          return;
        }
        this.writeInternal(adr, value);
        return;
      }
    }
  }
  // empty functions
  triggerRendering(){
  }




  nesColorPalette = [
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
}
