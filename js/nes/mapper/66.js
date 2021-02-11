class Mapper66 extends Base{
	constructor(nes) {
    super(nes);
    this.nes = nes;
	}
	Init() {
		this.nes.SetPrgRomPage(0, 0);
		this.nes.SetPrgRomPage(1, 1);
		this.nes.ppu.SetChrRomPage(0);
	}
	Write(address, data) {
		var tmp = (data & 0x30) >> 3;
		this.nes.SetPrgRomPage(0, tmp);
		this.nes.SetPrgRomPage(1, tmp + 1);

		this.nes.ppu.SetChrRomPage(data & 0x03);
	}
}

