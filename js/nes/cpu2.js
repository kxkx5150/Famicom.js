class CPU2 {
  constructor(nes, mem) {
    this.nes = nes;
    this.mem = mem;

    this.A = 0;
    this.X = 0;
    this.Y = 0;
    this.S = 0;
    this.P = 0;
    this.PC = 0;

    this.REG_P_NEGATIVE = 0x80;
    this.REG_P_OVERFLOW = 0x40;
    this.REG_P_NOTUSED = 0x20;
    this.REG_P_BREAK = 0x10;
    this.REG_P_DECIMAL = 0x08;
    this.REG_P_INTERRUPT = 0x04;
    this.REG_P_ZERO = 0x02;
    this.REG_P_CARRY = 0x01;
    this.IRQ_NMI_ADDR = 0xfffa;
    this.IRQ_RESET_ADDR = 0xfffc;
    this.IRQ_BRK_ADDR = 0xfffe;

    this.toIRQ = 0x00;
    this.CPUClock = 0;
    this.cycles = 0;
    this.CycleTable = [
      7,
      6,
      2,
      8,
      3,
      3,
      5,
      5,
      3,
      2,
      2,
      2,
      4,
      4,
      6,
      6,
      2,
      5,
      2,
      8,
      4,
      4,
      6,
      6,
      2,
      4,
      2,
      7,
      4,
      4,
      6,
      7,
      6,
      6,
      2,
      8,
      3,
      3,
      5,
      5,
      4,
      2,
      2,
      2,
      4,
      4,
      6,
      6,
      2,
      5,
      2,
      8,
      4,
      4,
      6,
      6,
      2,
      4,
      2,
      7,
      4,
      4,
      6,
      7,
      6,
      6,
      2,
      8,
      3,
      3,
      5,
      5,
      3,
      2,
      2,
      2,
      3,
      4,
      6,
      6,
      2,
      5,
      2,
      8,
      4,
      4,
      6,
      6,
      2,
      4,
      2,
      7,
      4,
      4,
      6,
      7,
      6,
      6,
      2,
      8,
      3,
      3,
      5,
      5,
      4,
      2,
      2,
      2,
      5,
      4,
      6,
      6,
      2,
      5,
      2,
      8,
      4,
      4,
      6,
      6,
      2,
      4,
      2,
      7,
      4,
      4,
      6,
      7,
      2,
      6,
      2,
      6,
      3,
      3,
      3,
      3,
      2,
      2,
      2,
      2,
      4,
      4,
      4,
      4,
      2,
      5,
      2,
      6,
      4,
      4,
      4,
      4,
      2,
      4,
      2,
      5,
      5,
      4,
      5,
      5,
      2,
      6,
      2,
      6,
      3,
      3,
      3,
      3,
      2,
      2,
      2,
      2,
      4,
      4,
      4,
      4,
      2,
      5,
      2,
      5,
      4,
      4,
      4,
      4,
      2,
      4,
      2,
      4,
      4,
      4,
      4,
      4,
      2,
      6,
      2,
      8,
      3,
      3,
      5,
      5,
      2,
      2,
      2,
      2,
      4,
      4,
      6,
      6,
      2,
      5,
      2,
      8,
      4,
      4,
      6,
      6,
      2,
      4,
      2,
      7,
      4,
      4,
      6,
      7,
      2,
      6,
      2,
      8,
      3,
      3,
      5,
      5,
      2,
      2,
      2,
      2,
      4,
      4,
      6,
      6,
      2,
      5,
      2,
      8,
      4,
      4,
      6,
      6,
      2,
      4,
      2,
      7,
      4,
      4,
      6,
      7,
    ];
    this.ZNCacheTable = new Array(256);
    this.ZNCacheTable[0] = 0x02;
    this.ZNCacheTableCMP = new Array(512);

    for (var i = 1; i < 256; i++) {
      this.ZNCacheTable[i] = i & 0x80;
    }
    for (var i = 0; i < 256; i++) {
      this.ZNCacheTableCMP[i] = this.ZNCacheTable[i] | 0x01;
      this.ZNCacheTableCMP[i + 256] = this.ZNCacheTable[i];
    }
  }
  reset() {
    this.A = 0;
    this.X = 0;
    this.Y = 0;
    this.S = (this.S - 3) & 0xff;
    this.P |= 0x04;
    this.toIRQ = 0x00;
    this.PC = 0;
    this.CPUClock = 0;
  }
  init() {
    this.A = 0;
    this.X = 0;
    this.Y = 0;
    this.S = 0xfd;
    this.P = 0x34;
    this.PC = this.mem.Get16(this.IRQ_RESET_ADDR);
    this.toIRQ = 0x00;
    this.CPUClock = 0;
    this.mem.Set(0x0008, 0xf7);
    this.mem.Set(0x0009, 0xef);
    this.mem.Set(0x000a, 0xdf);
    this.mem.Set(0x000f, 0xbf);
  }
  run(test) {
    const val = this.nes.irq.checkCpuIrqWanted();
    if (val === "nmi") {
      this.nes.irq.nmiWanted = false;
      this.NMI();
    } else if (val === "irq") {
      this.nes.irq.irqWanted = false;
      this.toIRQ = 0x00;
      this.IRQ();
    }
    var oldpc = this.PC;
    var opcode = this.mem.Get(this.PC++);
    this.CPUClock += this.CycleTable[opcode];
    if (test) this.showInfo(oldpc, opcode);
    return opcode;
  }
  exec(opcode) {
    this.execInstruction(opcode);
  }
  showInfo(oldpc, opcode) {
    console.log(oldpc.toString(16).toUpperCase() + " : " + opcode);
  }
  showRegisters() {
    console.log("========= cpu_info =========");
    console.log("A        : " + this.A.toString(16));
    console.log("X        : " + this.X.toString(16));
    console.log("Y        : " + this.Y.toString(16));
    console.log("S        : " + this.S.toString(16));
    console.log("P       : " + this.P.toString(16));
    console.log("PC       : " + this.PC.toString(16));
    console.log("");
  }
  getAddr(mode) {
    switch (mode) {
      case "GetAddressZeroPage": {
        return this.mem.Get(this.PC++);
      }
      case "GetAddressImmediate": {
        return this.PC++;
      }
      case "GetAddressAbsolute": {
        var address = this.mem.Get16(this.PC);
        this.PC += 2;
        return address;
      }
      case "GetAddressZeroPageX": {
        return (this.mem.Get(this.PC++) + this.X) & 0xff;
      }
      case "GetAddressZeroPageY": {
        return (this.mem.Get(this.PC++) + this.Y) & 0xff;
      }
      case "GetAddressIndirectX": {
        var tmp = (this.mem.Get(this.PC++) + this.X) & 0xff;
        return this.mem.Get(tmp) | (this.mem.Get((tmp + 1) & 0xff) << 8);
      }
      case "GetAddressIndirectY": {
        var tmp = this.mem.Get(this.PC++);
        tmp = this.mem.Get(tmp) | (this.mem.Get((tmp + 1) & 0xff) << 8);
        var address = tmp + this.Y;
        if (((address ^ tmp) & 0x100) > 0) {
          this.CPUClock += 1;
        }
        return address;
      }
      case "GetAddressAbsoluteX": {
        var tmp = this.mem.Get16(this.PC);
        this.PC += 2;
        var address = tmp + this.X;
        if (((address ^ tmp) & 0x100) > 0) {
          this.CPUClock += 1;
        }
        return address;
      }
      case "GetAddressAbsoluteY": {
        var tmp = this.mem.Get16(this.PC);
        this.PC += 2;
        var address = tmp + this.Y;
        if (((address ^ tmp) & 0x100) > 0) {
          this.CPUClock += 1;
        }
        return address;
      }
    }
  }
  execInstruction(opcode) {
    switch (opcode) {
      case 0xa1:
        this.Func.LDA(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xa5:
        this.Func.LDA(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xa9:
        this.Func.LDA(this.getAddr("GetAddressImmediate"));
        break;
      case 0xad:
        this.Func.LDA(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xb1:
        this.Func.LDA(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xb5:
        this.Func.LDA(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xb9:
        this.Func.LDA(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xbd:
        this.Func.LDA(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xa2:
        this.Func.LDX(this.getAddr("GetAddressImmediate"));
        break;
      case 0xa6:
        this.Func.LDX(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xae:
        this.Func.LDX(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xb6:
        this.Func.LDX(this.getAddr("GetAddressZeroPageY"));
        break;
      case 0xbe:
        this.Func.LDX(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xa0:
        this.Func.LDY(this.getAddr("GetAddressImmediate"));
        break;
      case 0xa4:
        this.Func.LDY(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xac:
        this.Func.LDY(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xb4:
        this.Func.LDY(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xbc:
        this.Func.LDY(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x81:
        this.Func.STA(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x85:
        this.Func.STA(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x8d:
        this.Func.STA(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x91:
        this.Func.STA(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x95:
        this.Func.STA(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x99:
        this.Func.STA(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x9d:
        this.Func.STA(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x86:
        this.Func.STX(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x8e:
        this.Func.STX(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x96:
        this.Func.STX(this.getAddr("GetAddressZeroPageY"));
        break;
      case 0x84:
        this.Func.STY(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x8c:
        this.Func.STY(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x94:
        this.Func.STY(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x8a:
        this.Func.TXA();
        break;
      case 0x98:
        this.Func.TYA();
        break;
      case 0x9a:
        this.Func.TXS();
        break;
      case 0xa8:
        this.Func.TAY();
        break;
      case 0xaa:
        this.Func.TAX();
        break;
      case 0xba:
        this.Func.TSX();
        break;
      case 0x08:
        this.Func.PHP();
        break;
      case 0x28:
        this.Func.PLP();
        break;
      case 0x48:
        this.Func.PHA();
        break;
      case 0x68:
        this.Func.PLA();
        break;
      case 0x61:
        this.Func.ADC(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x65:
        this.Func.ADC(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x69:
        this.Func.ADC(this.getAddr("GetAddressImmediate"));
        break;
      case 0x6d:
        this.Func.ADC(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x71:
        this.Func.ADC(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x75:
        this.Func.ADC(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x79:
        this.Func.ADC(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x7d:
        this.Func.ADC(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xe1:
        this.Func.SBC(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xe5:
        this.Func.SBC(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xe9:
        this.Func.SBC(this.getAddr("GetAddressImmediate"));
        break;
      case 0xed:
        this.Func.SBC(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xf1:
        this.Func.SBC(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xf5:
        this.Func.SBC(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xf9:
        this.Func.SBC(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xfd:
        this.Func.SBC(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xc1:
        this.Func.CMP(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xc5:
        this.Func.CMP(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xc9:
        this.Func.CMP(this.getAddr("GetAddressImmediate"));
        break;
      case 0xcd:
        this.Func.CMP(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xd1:
        this.Func.CMP(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xd5:
        this.Func.CMP(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xd9:
        this.Func.CMP(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xdd:
        this.Func.CMP(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xe0:
        this.Func.CPX(this.getAddr("GetAddressImmediate"));
        break;
      case 0xe4:
        this.Func.CPX(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xec:
        this.Func.CPX(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xc0:
        this.Func.CPY(this.getAddr("GetAddressImmediate"));
        break;
      case 0xc4:
        this.Func.CPY(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xcc:
        this.Func.CPY(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x21:
        this.Func.AND(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x25:
        this.Func.AND(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x29:
        this.Func.AND(this.getAddr("GetAddressImmediate"));
        break;
      case 0x2d:
        this.Func.AND(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x31:
        this.Func.AND(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x35:
        this.Func.AND(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x39:
        this.Func.AND(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x3d:
        this.Func.AND(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x41:
        this.Func.EOR(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x45:
        this.Func.EOR(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x49:
        this.Func.EOR(this.getAddr("GetAddressImmediate"));
        break;
      case 0x4d:
        this.Func.EOR(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x51:
        this.Func.EOR(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x55:
        this.Func.EOR(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x59:
        this.Func.EOR(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x5d:
        this.Func.EOR(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x01:
        this.Func.ORA(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x05:
        this.Func.ORA(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x09:
        this.Func.ORA(this.getAddr("GetAddressImmediate"));
        break;
      case 0x0d:
        this.Func.ORA(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x11:
        this.Func.ORA(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x15:
        this.Func.ORA(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x19:
        this.Func.ORA(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x1d:
        this.Func.ORA(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x24:
        this.Func.BIT(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x2c:
        this.Func.BIT(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x06:
        this.Func.ASL(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x0a:
        this.A = this.Func.ASL_Sub(this.A);
        break;
      case 0x0e:
        this.Func.ASL(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x16:
        this.Func.ASL(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x1e:
        this.Func.ASL(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x46:
        this.Func.LSR(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x4a:
        this.A = this.Func.LSR_Sub(this.A);
        break;
      case 0x4e:
        this.Func.LSR(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x56:
        this.Func.LSR(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x5e:
        this.Func.LSR(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x26:
        this.Func.ROL(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x2a:
        this.A = this.Func.ROL_Sub(this.A);
        break;
      case 0x2e:
        this.Func.ROL(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x36:
        this.Func.ROL(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x3e:
        this.Func.ROL(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x66:
        this.Func.ROR(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x6a:
        this.A = this.Func.ROR_Sub(this.A);
        break;
      case 0x6e:
        this.Func.ROR(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x76:
        this.Func.ROR(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x7e:
        this.Func.ROR(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xe6:
        this.Func.INC(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xee:
        this.Func.INC(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xf6:
        this.Func.INC(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xfe:
        this.Func.INC(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xe8:
        this.Func.INX();
        break;
      case 0xc8:
        this.Func.INY();
        break;
      case 0xc6:
        this.Func.DEC(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xce:
        this.Func.DEC(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xd6:
        this.Func.DEC(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xde:
        this.Func.DEC(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xca:
        this.Func.DEX();
        break;
      case 0x88:
        this.Func.DEY();
        break;
      case 0x18:
        this.P &= 0xfe;
        break;
      case 0x58:
        this.P &= 0xfb;
        break;
      case 0xb8:
        this.P &= 0xbf;
        break;
      case 0xd8:
        this.P &= 0xf7;
        break;
      case 0x38:
        this.P |= 0x01;
        break;
      case 0x78:
        this.P |= 0x04;
        break;
      case 0xf8:
        this.P |= 0x08;
        break;
      case 0xea:
        this.Func.NOP();
        break;
      case 0x00:
        this.BRK();
        break;
      case 0x4c:
        this.Func.JMP(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x6c:
        var address = this.getAddr("GetAddressAbsolute");
        var tmp = ((address + 1) & 0x00ff) | (address & 0xff00);
        this.Func.JMP(this.mem.Get(address) | (this.mem.Get(tmp) << 8));
        break;
      case 0x20:
        this.Func.JSR();
        break;
      case 0x60:
        this.Func.RTS();
        break;
      case 0x40:
        this.Func.RTI();
        break;
      case 0x10:
        this.Func.BPL();
        break;
      case 0x30:
        this.Func.BMI();
        break;
      case 0x50:
        this.Func.BVC();
        break;
      case 0x70:
        this.Func.BVS();
        break;
      case 0x90:
        this.Func.BCC();
        break;
      case 0xb0:
        this.Func.BCS();
        break;
      case 0xd0:
        this.Func.BNE();
        break;
      case 0xf0:
        this.Func.BEQ();
        break;
      case 0x0b:
      case 0x2b:
        this.Func.ANC(this.getAddr("GetAddressImmediate"));
        break;
      case 0x8b:
        this.Func.ANE(this.getAddr("GetAddressImmediate"));
        break;
      case 0x6b:
        this.Func.ARR(this.getAddr("GetAddressImmediate"));
        break;
      case 0x4b:
        this.Func.ASR(this.getAddr("GetAddressImmediate"));
        break;
      case 0xc7:
        this.Func.DCP(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xd7:
        this.Func.DCP(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xcf:
        this.Func.DCP(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xdf:
        this.Func.DCP(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xdb:
        this.Func.DCP(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xc3:
        this.Func.DCP(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xd3:
        this.Func.DCP(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xe7:
        this.Func.ISB(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xf7:
        this.Func.ISB(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0xef:
        this.Func.ISB(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xff:
        this.Func.ISB(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0xfb:
        this.Func.ISB(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xe3:
        this.Func.ISB(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xf3:
        this.Func.ISB(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xbb:
        this.Func.LAS(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xa7:
        this.Func.LAX(this.getAddr("GetAddressZeroPage"));
        break;
      case 0xb7:
        this.Func.LAX(this.getAddr("GetAddressZeroPageY"));
        break;
      case 0xaf:
        this.Func.LAX(this.getAddr("GetAddressAbsolute"));
        break;
      case 0xbf:
        this.Func.LAX(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0xa3:
        this.Func.LAX(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xb3:
        this.Func.LAX(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xab:
        this.Func.LXA(this.getAddr("GetAddressImmediate"));
        break;
      case 0x27:
        this.Func.RLA(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x37:
        this.Func.RLA(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x2f:
        this.Func.RLA(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x3f:
        this.Func.RLA(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x3b:
        this.Func.RLA(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x23:
        this.Func.RLA(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x33:
        this.Func.RLA(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x67:
        this.Func.RRA(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x77:
        this.Func.RRA(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x6f:
        this.Func.RRA(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x7f:
        this.Func.RRA(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x7b:
        this.Func.RRA(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x63:
        this.Func.RRA(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x73:
        this.Func.RRA(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x87:
        this.Func.SAX(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x97:
        this.Func.SAX(this.getAddr("GetAddressZeroPageY"));
        break;
      case 0x8f:
        this.Func.SAX(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x83:
        this.Func.SAX(this.getAddr("GetAddressIndirectX"));
        break;
      case 0xcb:
        this.Func.SBX(this.getAddr("GetAddressImmediate"));
        break;
      case 0x9f:
        this.Func.SHA(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x93:
        this.Func.SHA(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x9b:
        this.Func.SHS(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x9e:
        this.Func.SHX(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x9c:
        this.Func.SHY(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x07:
        this.Func.SLO(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x17:
        this.Func.SLO(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x0f:
        this.Func.SLO(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x1f:
        this.Func.SLO(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x1b:
        this.Func.SLO(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x03:
        this.Func.SLO(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x13:
        this.Func.SLO(this.getAddr("GetAddressIndirectY"));
        break;
      case 0x47:
        this.Func.SRE(this.getAddr("GetAddressZeroPage"));
        break;
      case 0x57:
        this.Func.SRE(this.getAddr("GetAddressZeroPageX"));
        break;
      case 0x4f:
        this.Func.SRE(this.getAddr("GetAddressAbsolute"));
        break;
      case 0x5f:
        this.Func.SRE(this.getAddr("GetAddressAbsoluteX"));
        break;
      case 0x5b:
        this.Func.SRE(this.getAddr("GetAddressAbsoluteY"));
        break;
      case 0x43:
        this.Func.SRE(this.getAddr("GetAddressIndirectX"));
        break;
      case 0x53:
        this.Func.SRE(this.getAddr("GetAddressIndirectY"));
        break;
      case 0xeb:
        this.Func.SBC(this.getAddr("GetAddressImmediate"));
        break;
      case 0x1a:
      case 0x3a:
      case 0x5a:
      case 0x7a:
      case 0xda:
      case 0xfa:
        break;
      case 0x80:
      case 0x82:
      case 0x89:
      case 0xc2:
      case 0xe2:
      case 0x04:
      case 0x44:
      case 0x64:
      case 0x14:
      case 0x34:
      case 0x54:
      case 0x74:
      case 0xd4:
      case 0xf4:
        this.PC++;
        break;
      case 0x0c:
      case 0x1c:
      case 0x3c:
      case 0x5c:
      case 0x7c:
      case 0xdc:
      case 0xfc:
        this.PC += 2;
        break;
      case 0x02:
      case 0x12:
      case 0x22:
      case 0x32:
      case 0x42:
      case 0x52:
      case 0x62:
      case 0x72:
      case 0x92:
      case 0xb2:
      case 0xd2:
      case 0xf2:
      default:
        // console.log("Unknown opcode: " + opcode.toString(16));
        // console.log("PC : "+ this.PC.toString(16).toUpperCase());
        // this.PC--;
        break;
    }
  }
  Func = {
    LDA: (address) => {
      this.A = this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    LDX: (address) => {
      this.X = this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
    },
    LDY: (address) => {
      this.Y = this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.Y];
    },
    STA: (address) => {
      this.mem.Set(address, this.A);
    },
    STX: (address) => {
      this.mem.Set(address, this.X);
    },
    STY: (address) => {
      this.mem.Set(address, this.Y);
    },
    TXA: () => {
      this.A = this.X;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    TYA: () => {
      this.A = this.Y;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    TXS: () => {
      this.S = this.X;
    },
    TAY: () => {
      this.Y = this.A;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    TAX: () => {
      this.X = this.A;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    TSX: () => {
      this.X = this.S;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
    },
    PHP: () => {
      this.PUSH(this.P | 0x30);
    },
    PLP: () => {
      this.P = this.POP();
    },
    PHA: () => {
      this.PUSH(this.A);
    },
    PLA: () => {
      this.A = this.POP();
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    ADC: (address) => {
      this.ADDER(this.mem.Get(address));
    },
    SBC: (address) => {
      this.ADDER(~this.mem.Get(address) & 0xff);
    },
    CMP: (address) => {
      this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.A - this.mem.Get(address)) & 0x1ff];
    },
    CPX: (address) => {
      this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.X - this.mem.Get(address)) & 0x1ff];
    },
    CPY: (address) => {
      this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.Y - this.mem.Get(address)) & 0x1ff];
    },
    AND: (address) => {
      this.A &= this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    EOR: (address) => {
      this.A ^= this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    ORA: (address) => {
      this.A |= this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    BIT: (address) => {
      var x = this.mem.Get(address);
      this.P = (this.P & 0x3d) | (this.ZNCacheTable[x & this.A] & 0x02) | (x & 0xc0);
    },
    ASL_Sub: (data) => {
      this.P = (this.P & 0xfe) | (data >> 7);
      data = (data << 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[data];
      return data;
    },
    ASL: (address) => {
      this.mem.Set(address, this.Func.ASL_Sub(this.mem.Get(address)));
    },
    LSR_Sub: (data) => {
      this.P = (this.P & 0x7c) | (data & 0x01);
      data >>= 1;
      this.P |= this.ZNCacheTable[data];
      return data;
    },
    LSR: (address) => {
      this.mem.Set(address, this.Func.LSR_Sub(this.mem.Get(address)));
    },
    ROL_Sub: (data) => {
      var carry = data >> 7;
      data = ((data << 1) & 0xff) | (this.P & 0x01);
      this.P = (this.P & 0x7c) | carry | this.ZNCacheTable[data];
      return data;
    },
    ROL: (address) => {
      this.mem.Set(address, this.Func.ROL_Sub(this.mem.Get(address)));
    },
    ROR_Sub: (data) => {
      var carry = data & 0x01;
      data = (data >> 1) | ((this.P & 0x01) << 7);
      this.P = (this.P & 0x7c) | carry | this.ZNCacheTable[data];
      return data;
    },
    ROR: (address) => {
      this.mem.Set(address, this.Func.ROR_Sub(this.mem.Get(address)));
    },
    INC: (address) => {
      var data = (this.mem.Get(address) + 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[data];
      this.mem.Set(address, data);
    },
    DEC: (address) => {
      var data = (this.mem.Get(address) - 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[data];
      this.mem.Set(address, data);
    },
    INX: () => {
      this.X = (this.X + 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
    },
    INY: () => {
      this.Y = (this.Y + 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.Y];
    },
    DEX: () => {
      this.X = (this.X - 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
    },
    DEY: () => {
      this.Y = (this.Y - 1) & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.Y];
    },
    NOP: () => {},
    CLC: () => {
      this.P &= 0xfe;
    },
    CLV: () => {
      this.P &= 0xbf;
    },
    CLD: () => {
      this.P &= 0xf7;
    },
    SEC: () => {
      this.P |= 0x01;
    },
    SEI: () => {
      this.P |= 0x04;
    },
    SED: () => {
      this.P |= 0x08;
    },
    JMP: (address) => {
      this.PC = address;
    },
    JSR: () => {
      var PC = (this.PC + 1) & 0xffff;
      this.PUSH(PC >> 8);
      this.PUSH(PC & 0xff);
      this.Func.JMP(this.getAddr("GetAddressAbsolute"));
    },
    RTS: () => {
      this.PC = (this.POP() | (this.POP() << 8)) + 1;
    },
    RTI: () => {
      this.P = this.POP();
      this.PC = this.POP() | (this.POP() << 8);
    },
    BCC: () => {
      this.BRANCH((this.P & 0x01) === 0);
    },
    BCS: () => {
      this.BRANCH((this.P & 0x01) !== 0);
    },
    BPL: () => {
      this.BRANCH((this.P & 0x80) === 0);
    },
    BMI: () => {
      this.BRANCH((this.P & 0x80) !== 0);
    },
    BVC: () => {
      this.BRANCH((this.P & 0x40) === 0);
    },
    BVS: () => {
      this.BRANCH((this.P & 0x40) !== 0);
    },
    BNE: () => {
      this.BRANCH((this.P & 0x02) === 0);
    },
    BEQ: () => {
      this.BRANCH((this.P & 0x02) !== 0);
    },
    ANC: (address) => {
      this.A &= this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
      this.P = (this.P & 0xfe) | (this.A >>> 7);
    },
    ANE: (address) => {
      this.A = (this.A | 0xee) & this.X & this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    ARR: (address) => {
      this.A &= this.mem.Get(address);
      this.A = (this.A >> 1) | ((this.P & 0x01) << 7);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
      this.P = (this.P & 0xfe) | ((this.A & 0x40) >> 6);
      var tmp = (this.A ^ (this.A << 1)) & 0x40;
      this.P = (this.P & 0xbf) | tmp;
    },
    ASR: (address) => {
      this.A &= this.mem.Get(address);
      this.P = (this.P & 0xfe) | (this.A & 0x01);
      this.A = this.A >> 1;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    DCP: (address) => {
      var tmp = (this.mem.Get(address) - 1) & 0xff;
      this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.A - tmp) & 0x1ff];
      this.mem.Set(address, tmp);
    },
    ISB: (address) => {
      var tmp = (this.mem.Get(address) + 1) & 0xff;
      this.ADDER(~tmp & 0xff);
      this.mem.Set(address, tmp);
    },
    LAS: (address) => {
      var tmp = this.mem.Get(address) & this.S;
      this.A = this.X = this.S = tmp;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    LAX: (address) => {
      this.A = this.X = this.mem.Get(address);
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    LXA: (address) => {
      var tmp = (this.A | 0xee) & this.mem.Get(address);
      this.A = this.X = tmp;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    },
    RLA: (address) => {
      var tmp = this.mem.Get(address);
      tmp = (tmp << 1) | (this.P & 0x01);
      this.P = (this.P & 0xfe) | (tmp >> 8);
      this.A &= tmp;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
      this.mem.Set(address, tmp);
    },
    RRA: (address) => {
      var tmp = this.mem.Get(address);
      var c = tmp & 0x01;
      tmp = (tmp >> 1) | ((this.P & 0x01) << 7);
      this.P = (this.P & 0xfe) | c;
      this.ADDER(tmp);
      this.mem.Set(address, tmp);
    },
    SAX: (address) => {
      var tmp = this.A & this.X;
      this.mem.Set(address, tmp);
    },
    SBX: (address) => {
      var tmp = (this.A & this.X) - this.mem.Get(address);
      this.P = (this.P & 0xfe) | ((~tmp >> 8) & 0x01);
      this.X = tmp & 0xff;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
    },
    SHA: (address) => {
      var tmp = this.A & this.X & ((address >> 8) + 1);
      this.mem.Set(address, tmp);
    },
    SHS: (address) => {
      this.S = this.A & this.X;
      var tmp = this.S & ((address >> 8) + 1);
      this.mem.Set(address, tmp);
    },
    SHX: (address) => {
      var tmp = this.X & ((address >> 8) + 1);
      this.mem.Set(address, tmp);
    },
    SHY: (address) => {
      var tmp = this.Y & ((address >> 8) + 1);
      this.mem.Set(address, tmp);
    },
    SLO: (address) => {
      var tmp = this.mem.Get(address);
      this.P = (this.P & 0xfe) | (tmp >> 7);
      tmp = (tmp << 1) & 0xff;
      this.A |= tmp;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
      this.mem.Set(address, tmp);
    },
    SRE: (address) => {
      var tmp = this.mem.Get(address);
      this.P = (this.P & 0xfe) | (tmp & 0x01);
      tmp >>= 1;
      this.A ^= tmp;
      this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
      this.mem.Set(address, tmp);
    },
    CLC: () => {
      this.P &= 0xfb;
    },
  }
  NMI() {
    this.CPUClock += 7;
    this.PUSH((this.PC >> 8) & 0xff);
    this.PUSH(this.PC & 0xff);
    this.PUSH((this.P & 0xef) | 0x20);
    this.P = (this.P | 0x04) & 0xef;
    this.PC = this.mem.Get16(this.IRQ_NMI_ADDR);
  }
  IRQ() {
    this.CPUClock += 7;
    this.PUSH((this.PC >> 8) & 0xff);
    this.PUSH(this.PC & 0xff);
    this.PUSH((this.P & 0xef) | 0x20);
    this.P = (this.P | 0x04) & 0xef;
    this.PC = this.mem.Get16(this.IRQ_BRK_ADDR);
  }
  BRK() {
    this.PC++;
    this.PUSH(this.PC >> 8);
    this.PUSH(this.PC & 0xff);
    this.PUSH(this.P | 0x30);
    this.P |= 0x14;
    this.PC = this.mem.Get16(this.IRQ_BRK_ADDR);
  }
  PUSH(data) {
    this.mem.ram[0x100 + this.S] = data;
    this.S = (this.S - 1) & 0xff;
  }
  POP() {
    this.S = (this.S + 1) & 0xff;
    return this.mem.ram[0x100 + this.S];
  }
  BRANCH(state) {
    if (!state) {
      this.PC++;
      return;
    }
    var displace = this.mem.Get(this.PC);
    var tmp = this.PC + 1;
    this.PC = (tmp + (displace >= 128 ? displace - 256 : displace)) & 0xffff;
    this.CPUClock += ((tmp ^ this.PC) & 0x100) > 0 ? 2 : 1;
  }
  ADDER(data) {
    var carry_flag = this.P & 0x01;
    var tmp = this.A + data + carry_flag;
    this.P = this.P & 0x3c;
    this.P |= (~(this.A ^ data) & (this.A ^ tmp) & 0x80) >>> 1;
    this.P |= tmp >>> 8;
    this.P |= this.ZNCacheTable[tmp & 0xff];
    this.A = tmp & 0xff;
  }
}
