'use strict';
class Mapper1 extends Base {
  constructor(nes) {
    super(nes);
    this.nes = nes;
    this.MAPPER_REG = new Array(16);
  }
  Init() {
    var i;
    for (i = 0; i < this.MAPPER_REG.length; i++) this.MAPPER_REG[i] = 0;

    this.MAPPER_REG[13] = 0;
    this.MAPPER_REG[14] = 0x00;
    this.MAPPER_REG[0] = 0x0c;
    this.MAPPER_REG[1] = 0x00;
    this.MAPPER_REG[2] = 0x00;
    this.MAPPER_REG[3] = 0x00;

    if (this.nes.PrgRomPageCount === 64) {
      this.MAPPER_REG[10] = 2;
    } else if (this.nes.PrgRomPageCount === 32) {
      this.MAPPER_REG[10] = 1;
    } else {
      this.MAPPER_REG[10] = 0;
    }
    this.MAPPER_REG[11] = 0;
    this.MAPPER_REG[12] = 0;

    if (this.MAPPER_REG[10] === 0) {
      this.MAPPER_REG[8] = this.nes.PrgRomPageCount * 2 - 2;
      this.MAPPER_REG[9] = this.nes.PrgRomPageCount * 2 - 1;
    } else {
      this.MAPPER_REG[8] = 30;
      this.MAPPER_REG[9] = 31;
    }

    this.MAPPER_REG[4] = 0;
    this.MAPPER_REG[5] = 1;
    this.MAPPER_REG[6] = this.MAPPER_REG[8];
    this.MAPPER_REG[7] = this.MAPPER_REG[9];

    this.nes.SetPrgRomPages8K(this.MAPPER_REG[4], this.MAPPER_REG[5], this.MAPPER_REG[6], this.MAPPER_REG[7]);
  }
  Write(address, data) {
    var reg_num;

    if ((address & 0x6000) !== (this.MAPPER_REG[15] & 0x6000)) {
      this.MAPPER_REG[13] = 0;
      this.MAPPER_REG[14] = 0x00;
    }
    this.MAPPER_REG[15] = address;

    if ((data & 0x80) !== 0) {
      this.MAPPER_REG[13] = 0;
      this.MAPPER_REG[14] = 0x00;
      return;
    }

    if ((data & 0x01) !== 0) this.MAPPER_REG[14] |= 1 << this.MAPPER_REG[13];
    this.MAPPER_REG[13]++;
    if (this.MAPPER_REG[13] < 5) return;

    reg_num = (address & 0x7fff) >> 13;
    this.MAPPER_REG[reg_num] = this.MAPPER_REG[14];

    this.MAPPER_REG[13] = 0;
    this.MAPPER_REG[14] = 0x00;

    var bank_num;

    switch (reg_num) {
      case 0:
        if ((this.MAPPER_REG[0] & 0x02) !== 0) {
          if ((this.MAPPER_REG[0] & 0x01) !== 0) {
            this.nes.ppu.SetMirror(true);
          } else {
            this.nes.ppu.SetMirror(false);
          }
        } else {
          if ((this.MAPPER_REG[0] & 0x01) !== 0) {
            this.nes.ppu.SetMirrors(1, 1, 1, 1);
          } else {
            this.nes.ppu.SetMirrors(0, 0, 0, 0);
          }
        }
        break;

      case 1:
        bank_num = this.MAPPER_REG[1];
        if (this.MAPPER_REG[10] === 2) {
          if ((this.MAPPER_REG[0] & 0x10) !== 0) {
            if (this.MAPPER_REG[12] !== 0) {
              this.MAPPER_REG[11] = (this.MAPPER_REG[1] & 0x10) >> 4;
              if ((this.MAPPER_REG[0] & 0x08) !== 0) {
                this.MAPPER_REG[11] |= (this.MAPPER_REG[2] & 0x10) >> 3;
              }
              this.SetPrgRomPages8K_Mapper01();
              this.MAPPER_REG[12] = 0;
            } else {
              this.MAPPER_REG[12] = 1;
            }
          } else {
            this.MAPPER_REG[11] = (this.MAPPER_REG[1] & 0x10) !== 0 ? 3 : 0;
            this.SetPrgRomPages8K_Mapper01();
          }
        } else if (this.MAPPER_REG[10] === 1 && this.nes.ChrRomPageCount === 0) {
          this.MAPPER_REG[11] = (this.MAPPER_REG[1] & 0x10) >> 4;
          this.SetPrgRomPages8K_Mapper01();
        } else if (this.nes.ChrRomPageCount !== 0) {
          if ((this.MAPPER_REG[0] & 0x10) !== 0) {
            bank_num <<= 2;
            this.nes.ppu.SetChrRomPage1K(0, bank_num + 0);
            this.nes.ppu.SetChrRomPage1K(1, bank_num + 1);
            this.nes.ppu.SetChrRomPage1K(2, bank_num + 2);
            this.nes.ppu.SetChrRomPage1K(3, bank_num + 3);
          } else {
            bank_num <<= 2;
            this.nes.ppu.SetChrRomPages1K(
              bank_num + 0,
              bank_num + 1,
              bank_num + 2,
              bank_num + 3,
              bank_num + 4,
              bank_num + 5,
              bank_num + 6,
              bank_num + 7
            );
          }
        } else {
          if ((this.MAPPER_REG[0] & 0x10) !== 0) {
            bank_num <<= 2;
            this.nes.ppu.VRAM[0] = this.nes.ppu.VRAMS[bank_num + 0];
            this.nes.ppu.VRAM[1] = this.nes.ppu.VRAMS[bank_num + 1];
            this.nes.ppu.VRAM[2] = this.nes.ppu.VRAMS[bank_num + 2];
            this.nes.ppu.VRAM[3] = this.nes.ppu.VRAMS[bank_num + 3];
          }
        }
        break;

      case 2:
        bank_num = this.MAPPER_REG[2];

        if (this.MAPPER_REG[10] === 2 && (this.MAPPER_REG[0] & 0x08) !== 0) {
          if (this.MAPPER_REG[12] !== 0) {
            this.MAPPER_REG[11] = (this.MAPPER_REG[1] & 0x10) >> 4;
            this.MAPPER_REG[11] |= (this.MAPPER_REG[2] & 0x10) >> 3;
            this.SetPrgRomPages8K_Mapper01();
            this.MAPPER_REG[12] = 0;
          } else {
            this.MAPPER_REG[12] = 1;
          }
        }

        if (this.nes.ChrRomPageCount === 0) {
          if ((this.MAPPER_REG[0] & 0x10) !== 0) {
            bank_num <<= 2;
            this.nes.ppu.VRAM[4] = this.nes.ppu.VRAMS[bank_num + 0];
            this.nes.ppu.VRAM[5] = this.nes.ppu.VRAMS[bank_num + 1];
            this.nes.ppu.VRAM[6] = this.nes.ppu.VRAMS[bank_num + 2];
            this.nes.ppu.VRAM[7] = this.nes.ppu.VRAMS[bank_num + 3];
            break;
          }
        }

        if ((this.MAPPER_REG[0] & 0x10) !== 0) {
          bank_num <<= 2;
          this.nes.ppu.SetChrRomPage1K(4, bank_num + 0);
          this.nes.ppu.SetChrRomPage1K(5, bank_num + 1);
          this.nes.ppu.SetChrRomPage1K(6, bank_num + 2);
          this.nes.ppu.SetChrRomPage1K(7, bank_num + 3);
        }
        break;

      case 3:
        bank_num = this.MAPPER_REG[3];

        if ((this.MAPPER_REG[0] & 0x08) !== 0) {
          bank_num <<= 1;

          if ((this.MAPPER_REG[0] & 0x04) !== 0) {
            this.MAPPER_REG[4] = bank_num;
            this.MAPPER_REG[5] = bank_num + 1;
            this.MAPPER_REG[6] = this.MAPPER_REG[8];
            this.MAPPER_REG[7] = this.MAPPER_REG[9];
          } else {
            if (this.MAPPER_REG[10] === 0) {
              this.MAPPER_REG[4] = 0;
              this.MAPPER_REG[5] = 1;
              this.MAPPER_REG[6] = bank_num;
              this.MAPPER_REG[7] = bank_num + 1;
            }
          }
        } else {
          bank_num <<= 1;
          this.MAPPER_REG[4] = bank_num;
          this.MAPPER_REG[5] = bank_num + 1;
          if (this.MAPPER_REG[10] === 0) {
            this.MAPPER_REG[6] = bank_num + 2;
            this.MAPPER_REG[7] = bank_num + 3;
          }
        }

        this.SetPrgRomPages8K_Mapper01();
        break;
    }
  }
  SetPrgRomPages8K_Mapper01() {
    this.nes.SetPrgRomPage8K(0, (this.MAPPER_REG[11] << 5) + (this.MAPPER_REG[4] & 31));
    this.nes.SetPrgRomPage8K(1, (this.MAPPER_REG[11] << 5) + (this.MAPPER_REG[5] & 31));
    this.nes.SetPrgRomPage8K(2, (this.MAPPER_REG[11] << 5) + (this.MAPPER_REG[6] & 31));
    this.nes.SetPrgRomPage8K(3, (this.MAPPER_REG[11] << 5) + (this.MAPPER_REG[7] & 31));
  }
}
