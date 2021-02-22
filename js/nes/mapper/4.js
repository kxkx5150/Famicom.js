'use strict';
class Mapper4 extends Base{
	constructor(nes) {
		super(nes);
		this.nes = nes;
		this.MAPPER_REG = new Array(20);
	}
	Init() {
		for (var i = 0; i < this.MAPPER_REG.length; i++)
			this.MAPPER_REG[i] = 0;

		this.MAPPER_REG[16] = 0;
		this.MAPPER_REG[17] = 1;
		this.MAPPER_REG[18] = (this.nes.PrgRomPageCount - 1) * 2;
		this.MAPPER_REG[19] = (this.nes.PrgRomPageCount - 1) * 2 + 1;
		this.nes.SetPrgRomPages8K(this.MAPPER_REG[16], this.MAPPER_REG[17], this.MAPPER_REG[18], this.MAPPER_REG[19]);

		this.MAPPER_REG[8] = 0;
		this.MAPPER_REG[9] = 1;
		this.MAPPER_REG[10] = 2;
		this.MAPPER_REG[11] = 3;
		this.MAPPER_REG[12] = 4;
		this.MAPPER_REG[13] = 5;
		this.MAPPER_REG[14] = 6;
		this.MAPPER_REG[15] = 7;
		this.nes.ppu.SetChrRomPages1K(this.MAPPER_REG[8], this.MAPPER_REG[9], this.MAPPER_REG[10], this.MAPPER_REG[11],
			this.MAPPER_REG[12], this.MAPPER_REG[13], this.MAPPER_REG[14], this.MAPPER_REG[15]);
	}
	Write(address, data) {
		switch (address & 0xE001) {
			case 0x8000:
				this.MAPPER_REG[0] = data;
				if ((data & 0x80) === 0x80) {
					this.nes.ppu.SetChrRomPages1K(this.MAPPER_REG[12], this.MAPPER_REG[13], this.MAPPER_REG[14], this.MAPPER_REG[15],
						this.MAPPER_REG[8], this.MAPPER_REG[9], this.MAPPER_REG[10], this.MAPPER_REG[11]);
				} else {
					this.nes.ppu.SetChrRomPages1K(this.MAPPER_REG[8], this.MAPPER_REG[9], this.MAPPER_REG[10], this.MAPPER_REG[11],
						this.MAPPER_REG[12], this.MAPPER_REG[13], this.MAPPER_REG[14], this.MAPPER_REG[15]);
				}

				if ((data & 0x40) === 0x40) {
					this.nes.SetPrgRomPages8K(this.MAPPER_REG[18], this.MAPPER_REG[17], this.MAPPER_REG[16], this.MAPPER_REG[19]);
				} else {
					this.nes.SetPrgRomPages8K(this.MAPPER_REG[16], this.MAPPER_REG[17], this.MAPPER_REG[18], this.MAPPER_REG[19]);
				}
				break;
			case 0x8001:
				this.MAPPER_REG[1] = data;
				switch (this.MAPPER_REG[0] & 0x07) {
					case 0:
						data &= 0xFE;
						this.MAPPER_REG[8] = data;
						this.MAPPER_REG[9] = data + 1;
						break;
					case 1:
						data &= 0xFE;
						this.MAPPER_REG[10] = data;
						this.MAPPER_REG[11] = data + 1;
						break;
					case 2:
						this.MAPPER_REG[12] = data;
						break;
					case 3:
						this.MAPPER_REG[13] = data;
						break;
					case 4:
						this.MAPPER_REG[14] = data;
						break;
					case 5:
						this.MAPPER_REG[15] = data;
						break;
					case 6:
						this.MAPPER_REG[16] = data;
						break;
					case 7:
						this.MAPPER_REG[17] = data;
						break;
				}

				if ((this.MAPPER_REG[0] & 0x80) === 0x80) {
					this.nes.ppu.SetChrRomPages1K(this.MAPPER_REG[12], this.MAPPER_REG[13], this.MAPPER_REG[14], this.MAPPER_REG[15],
						this.MAPPER_REG[8], this.MAPPER_REG[9], this.MAPPER_REG[10], this.MAPPER_REG[11]);
				} else {
					this.nes.ppu.SetChrRomPages1K(this.MAPPER_REG[8], this.MAPPER_REG[9], this.MAPPER_REG[10], this.MAPPER_REG[11],
						this.MAPPER_REG[12], this.MAPPER_REG[13], this.MAPPER_REG[14], this.MAPPER_REG[15]);
				}

				if ((this.MAPPER_REG[0] & 0x40) === 0x40) {
					this.nes.SetPrgRomPages8K(this.MAPPER_REG[18], this.MAPPER_REG[17], this.MAPPER_REG[16], this.MAPPER_REG[19]);
				} else {
					this.nes.SetPrgRomPages8K(this.MAPPER_REG[16], this.MAPPER_REG[17], this.MAPPER_REG[18], this.MAPPER_REG[19]);
				}
				break;

			case 0xA000:
				if ((data & 0x01) === 0x01)
					this.nes.ppu.SetMirror(true);

				else
					this.nes.ppu.SetMirror(false);
				this.MAPPER_REG[2] = data;
				break;
			case 0xA001:
				this.MAPPER_REG[3] = data;
				break;

			case 0xC000:
				this.MAPPER_REG[4] = data;
				break;
			case 0xC001:
				this.MAPPER_REG[5] = data;
				break;

			case 0xE000:
				this.MAPPER_REG[4] = this.MAPPER_REG[5];
				this.MAPPER_REG[7] = 0;
				this.ClearIRQ();
				break;
			case 0xE001:
				this.MAPPER_REG[7] = 1;
				break;
		}
	}
	HSync(y) {
		if (this.MAPPER_REG[7] === 1 && y < 240 && (this.nes.ppu.IO1[0x01] & 0x08) === 0x08) {
			if (--this.MAPPER_REG[4] === 0)
				this.SetIRQ();
			this.MAPPER_REG[4] &= 0xFF;
		}
	}
}

