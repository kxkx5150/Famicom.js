'use strict';
class Mapper19 extends Base{
	constructor(nes) {
    super(nes);
    this.nes = nes;
		this.MAPPER_REG = new Array(5);
		this.EX_VRAM = new Array(32);
	}
	Init() {
		var i;
		for (i = 0; i < this.MAPPER_REG.length; i++)
			this.MAPPER_REG[i] = 0;

		for (i = 0; i < this.EX_VRAM.length; i++) {
			this.EX_VRAM[i] = new Array(0x0400);
			for (var j = 0; j < this.EX_VRAM[i].length; j++)
				this.EX_VRAM[i][j] = 0x00;
		}

		this.nes.SetPrgRomPages8K(0, 1, this.nes.PrgRomPageCount * 2 - 2, this.nes.PrgRomPageCount * 2 - 1);

		if (this.nes.ChrRomPageCount >= 1) {
			this.nes.ppu.SetChrRomPages1K(this.nes.ChrRomPageCount * 8 - 8, this.nes.ChrRomPageCount * 8 - 7,
				this.nes.ChrRomPageCount * 8 - 6, this.nes.ChrRomPageCount * 8 - 5,
				this.nes.ChrRomPageCount * 8 - 4, this.nes.ChrRomPageCount * 8 - 3,
				this.nes.ChrRomPageCount * 8 - 2, this.nes.ChrRomPageCount * 8 - 1);
		}

	}
	ReadLow(address) {
		switch (address & 0xF800) {
			case 0x4800:
				return this.nes.Read_N163_RAM();
			case 0x5000:
				this.ClearIRQ();
				return (this.MAPPER_REG[4] & 0x00FF);
			case 0x5800:
				this.ClearIRQ();
				return (this.MAPPER_REG[3] << 7) | ((this.MAPPER_REG[4] & 0x7F00) >> 8);
		}
		return 0x00;
	}
	WriteLow(address, data) {
		switch (address & 0xF800) {
			case 0x4800:
				if (address === 0x4800) {
					this.nes.Write_N163_RAM(data);
				}
				break;

			case 0x5000:
				this.MAPPER_REG[4] = (this.MAPPER_REG[4] & 0xFF00) | data;
				this.ClearIRQ();
				break;

			case 0x5800:
				this.MAPPER_REG[4] = (this.MAPPER_REG[4] & 0x00FF) | ((data & 0x7F) << 8);
				this.MAPPER_REG[3] = (data & 0x80) >> 7;
				this.ClearIRQ();
				break;
		}
	}
	Write(address, data) {
		switch (address & 0xF800) {
			case 0x8000:
				if (data < 0xE0 || this.MAPPER_REG[0] === 1) {
					this.nes.ppu.SetChrRomPage1K(0, data);
				} else {
					this.nes.ppu.VRAM[0] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0x8800:
				if (data < 0xE0 || this.MAPPER_REG[0] === 1) {
					this.nes.ppu.SetChrRomPage1K(1, data);
				} else {
					this.nes.ppu.VRAM[1] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0x9000:
				if (data < 0xE0 || this.MAPPER_REG[0] === 1) {
					this.nes.ppu.SetChrRomPage1K(2, data);
				} else {
					this.nes.ppu.VRAM[2] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0x9800:
				if (data < 0xE0 || this.MAPPER_REG[0] === 1) {
					this.nes.ppu.SetChrRomPage1K(3, data);
				} else {
					this.nes.ppu.VRAM[3] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0xA000:
				if (data < 0xE0 || this.MAPPER_REG[1] === 1) {
					this.nes.ppu.SetChrRomPage1K(4, data);
				} else {
					this.nes.ppu.VRAM[4] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0xA800:
				if (data < 0xE0 || this.MAPPER_REG[1] === 1) {
					this.nes.ppu.SetChrRomPage1K(5, data);
				} else {
					this.nes.ppu.VRAM[5] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0xB000:
				if (data < 0xE0 || this.MAPPER_REG[1] === 1) {
					this.nes.ppu.SetChrRomPage1K(6, data);
				} else {
					this.nes.ppu.VRAM[6] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0xB800:
				if (data < 0xE0 || this.MAPPER_REG[1] === 1) {
					this.nes.ppu.SetChrRomPage1K(7, data);
				} else {
					this.nes.ppu.VRAM[7] = this.EX_VRAM[data & 0xE0];
				}
				break;

			case 0xC000:
				if (data < 0xE0) {
					this.nes.ppu.SetChrRomPage1K(8, data);
				} else {
					this.nes.ppu.VRAM[8] = this.nes.ppu.VRAMS[(data & 0x01) + 8];
				}
				break;

			case 0xC800:
				if (data < 0xE0) {
					this.nes.ppu.SetChrRomPage1K(9, data);
				} else {
					this.nes.ppu.VRAM[9] = this.nes.ppu.VRAMS[(data & 0x01) + 8];
				}
				break;

			case 0xD000:
				if (data < 0xE0) {
					this.nes.ppu.SetChrRomPage1K(10, data);
				} else {
					this.nes.ppu.VRAM[10] = this.nes.ppu.VRAMS[(data & 0x01) + 8];
				}
				break;

			case 0xD800:
				if (data < 0xE0) {
					this.nes.ppu.SetChrRomPage1K(11, data);
				} else {
					this.nes.ppu.VRAM[11] = this.nes.ppu.VRAMS[(data & 0x01) + 8];
				}
				break;

			case 0xE000:
				this.nes.SetPrgRomPage8K(0, data & 0x3F);
				break;

			case 0xE800:
				this.nes.SetPrgRomPage8K(1, data & 0x3F);
				this.MAPPER_REG[0] = (data & 0x40) >> 6;
				this.MAPPER_REG[1] = (data & 0x80) >> 7;
				break;

			case 0xF000:
				this.nes.SetPrgRomPage8K(2, data & 0x3F);
				break;

			case 0xF800:
				if (address === 0xF800) {
					this.nes.N163_Address = data;
				}
				break;
		}
	}
	CPUSync(clock) {
		if (this.MAPPER_REG[3] !== 0) {
			this.MAPPER_REG[4] += clock;
			if (this.MAPPER_REG[4] >= 0x7FFF) {
				this.MAPPER_REG[4] -= 0x7FFF;
				this.SetIRQ();
			}
		}
	}
	OutEXSound(soundin) {
		return (soundin >> 1) + (this.nes.Out_N163() >> 1);
	}
	EXSoundSync(clock) {
		this.nes.Count_N163(clock);
	}
}


