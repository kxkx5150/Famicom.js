class Cpu {
  mem = null;
  irq = null;

  constructor(mem) {
    this.mem = mem;
  }
  setIrq(irq) {
    this.irq = irq;
  }
  A = new Uint8Array(1);
  X = new Uint8Array(1);
  Y = new Uint8Array(1);
  SP = new Uint8Array(1);
  PC = new Uint16Array(1);

  negative = false;
  overflow = false;
  decimal = false;
  interrupt = true;
  zero = false;
  carry = false;

  cycles = 7;

  reset() {
    this.A[0] = 0;
    this.X[0] = 0;
    this.Y[0] = 0;
    this.SP[0] = 0xfd;
    this.PC[0] = this.mem.read(0xfffc) | (this.mem.read(0xfffd) << 8);

    this.negative = false;
    this.overflow = false;
    this.decimal = false;
    this.interrupt = true;
    this.zero = false;
    this.carry = false;

    this.cycles = 7;
  }

  run() {
    if (this.cycles === 0) {
      const val = this.irq.checkCpuIrqWanted();
      if (val) {
        if (val === "nmi") {
          let iop = this.opcodes[0x100].op;
          this.execInstruction(iop);
        } else if (val === "irq") {
          let iop = this.opcodes[0x101].op;
          this.execInstruction(iop);
        }
        this.irq.irqWanted = false;
        this.irq.nmiWanted = false;
      }

      let instr = this.mem.read(this.PC[0]++);
      const opobj = this.opcodes[instr];
      this.cycles = opobj.cycle;
      let addr = this.getAddr(opobj.adm);
      this.execInstruction(opobj.op, addr);
    }
    this.cycles--;
  }

  setPC = function (addr) {
    this.PC[0] = addr;
  };
  showRegisters = function () {
    console.log("========= cpu_info =========");
    console.log("A        : " + this.A[0].toString(16));
    console.log("X        : " + this.X[0].toString(16));
    console.log("Y        : " + this.Y[0].toString(16));
    console.log("SP       : " + this.SP[0].toString(16));
    console.log("PC       : " + this.PC[0].toString(16));
    console.log("");
    console.log("negative : " + this.negative);
    console.log("overflow : " + this.overflow);
    console.log("decimal  : " + this.decimal);
    console.log("interrupt: " + this.interrupt);
    console.log("zero     : " + this.zero);
    console.log("carry    : " + this.carry);
    console.log("");
  };
  getP(bFlag) {
    let value = 0;

    value |= this.negative ? 0x80 : 0;
    value |= this.overflow ? 0x40 : 0;
    value |= this.decimal ? 0x08 : 0;
    value |= this.interrupt ? 0x04 : 0;
    value |= this.zero ? 0x02 : 0;
    value |= this.carry ? 0x01 : 0;
    value |= 0x20;
    value |= bFlag ? 0x10 : 0;

    return value;
  }
  setP(value) {
    this.negative = (value & 0x80) > 0;
    this.overflow = (value & 0x40) > 0;
    this.decimal = (value & 0x08) > 0;
    this.interrupt = (value & 0x04) > 0;
    this.zero = (value & 0x02) > 0;
    this.carry = (value & 0x01) > 0;
  }
  setZandN(value) {
    value &= 0xff;
    this.zero = value === 0;
    this.negative = value > 0x7f;
  }
  getSigned(value) {
    if (value > 127) {
      return -(256 - value);
    }
    return value;
  }
  doBranch(test, rel) {
    if (test) {
      this.cycles++;
      if (this.PC[0] >> 8 !== (this.PC[0] + rel) >> 8) {
        this.cycles++;
      }
      this.PC[0] += rel;
    }
  }
  getAddr(mode) {
    switch (mode) {
      case "IMP": {
        return 0;
      }
      case "IMM": {
        return this.PC[0]++;
      }
      case "ZP": {
        return this.mem.read(this.PC[0]++);
      }
      case "ZPX": {
        let adr = this.mem.read(this.PC[0]++);
        return (adr + this.X[0]) & 0xff;
      }
      case "ZPY": {
        let adr = this.mem.read(this.PC[0]++);
        return (adr + this.Y[0]) & 0xff;
      }
      case "IZX": {
        let adr = (this.mem.read(this.PC[0]++) + this.X[0]) & 0xff;
        return this.mem.read(adr) | (this.mem.read((adr + 1) & 0xff) << 8);
      }
      case "IZY": {
        let adr = this.mem.read(this.PC[0]++);
        let radr = this.mem.read(adr) | (this.mem.read((adr + 1) & 0xff) << 8);
        return (radr + this.Y[0]) & 0xffff;
      }
      case "IZYr": {
        let adr = this.mem.read(this.PC[0]++);
        let radr = this.mem.read(adr) | (this.mem.read((adr + 1) & 0xff) << 8);
        if (radr >> 8 < (radr + this.Y[0]) >> 8) {
          this.cycles++;
        }
        return (radr + this.Y[0]) & 0xffff;
      }
      case "ABS": {
        let adr = this.mem.read(this.PC[0]++);
        adr |= this.mem.read(this.PC[0]++) << 8;
        return adr;
      }
      case "ABX": {
        let adr = this.mem.read(this.PC[0]++);
        adr |= this.mem.read(this.PC[0]++) << 8;
        return (adr + this.X[0]) & 0xffff;
      }
      case "ABXr": {
        let adr = this.mem.read(this.PC[0]++);
        adr |= this.mem.read(this.PC[0]++) << 8;
        if (adr >> 8 < (adr + this.X[0]) >> 8) {
          this.cycles++;
        }
        return (adr + this.X[0]) & 0xffff;
      }
      case "ABY": {
        let adr = this.mem.read(this.PC[0]++);
        adr |= this.mem.read(this.PC[0]++) << 8;
        return (adr + this.Y[0]) & 0xffff;
      }
      case "ABYr": {
        let adr = this.mem.read(this.PC[0]++);
        adr |= this.mem.read(this.PC[0]++) << 8;
        if (adr >> 8 < (adr + this.Y[0]) >> 8) {
          this.cycles++;
        }
        return (adr + this.Y[0]) & 0xffff;
      }
      case "IND": {
        let adrl = this.mem.read(this.PC[0]++);
        let adrh = this.mem.read(this.PC[0]++);
        let radr = this.mem.read(adrl | (adrh << 8));
        radr |= this.mem.read(((adrl + 1) & 0xff) | (adrh << 8)) << 8;
        return radr;
      }
      case "REL": {
        let rel = this.mem.read(this.PC[0]++);
        return this.getSigned(rel);
      }
    }
  }
  execInstruction(opcode, adr) {
    switch (opcode) {
      case "UNI": {
        console.log("unimplemented instruction");
        return;
      }
      case "ORA": {
        this.A[0] |= this.mem.read(adr);
        this.setZandN(this.A[0]);
        return;
      }
      case "AND": {
        this.A[0] &= this.mem.read(adr);
        this.setZandN(this.A[0]);
        return;
      }
      case "EOR": {
        this.A[0] ^= this.mem.read(adr);
        this.setZandN(this.A[0]);
        return;
      }
      case "ADC": {
        let value = this.mem.read(adr);
        let result = this.A[0] + value + (this.carry ? 1 : 0);
        this.carry = result > 0xff;
        this.overflow = (this.A[0] & 0x80) === (value & 0x80) && (value & 0x80) !== (result & 0x80);
        this.A[0] = result;
        this.setZandN(this.A[0]);
        return;
      }
      case "SBC": {
        let value = this.mem.read(adr) ^ 0xff;
        let result = this.A[0] + value + (this.carry ? 1 : 0);
        this.carry = result > 0xff;
        this.overflow = (this.A[0] & 0x80) === (value & 0x80) && (value & 0x80) !== (result & 0x80);
        this.A[0] = result;
        this.setZandN(this.A[0]);
        return;
      }
      case "CMP": {
        let value = this.mem.read(adr) ^ 0xff;
        let result = this.A[0] + value + 1;
        this.carry = result > 0xff;
        this.setZandN(result & 0xff);
        return;
      }
      case "CPX": {
        let value = this.mem.read(adr) ^ 0xff;
        let result = this.X[0] + value + 1;
        this.carry = result > 0xff;
        this.setZandN(result & 0xff);
        return;
      }
      case "CPY": {
        let value = this.mem.read(adr) ^ 0xff;
        let result = this.Y[0] + value + 1;
        this.carry = result > 0xff;
        this.setZandN(result & 0xff);
        return;
      }
      case "DEC": {
        let result = (this.mem.read(adr) - 1) & 0xff;
        this.setZandN(result);
        this.mem.write(adr, result);
        return;
      }
      case "DEX": {
        this.X[0]--;
        this.setZandN(this.X[0]);
        return;
      }
      case "DEY": {
        this.Y[0]--;
        this.setZandN(this.Y[0]);
        return;
      }
      case "INC": {
        let result = (this.mem.read(adr) + 1) & 0xff;
        this.setZandN(result);
        this.mem.write(adr, result);
        return;
      }
      case "INX": {
        this.X[0]++;
        this.setZandN(this.X[0]);
        return;
      }
      case "INY": {
        this.Y[0]++;
        this.setZandN(this.Y[0]);
        return;
      }
      case "ASLA": {
        let result = this.A[0] << 1;
        this.carry = result > 0xff;
        this.setZandN(result);
        this.A[0] = result;
        return;
      }
      case "ASL": {
        let result = this.mem.read(adr) << 1;
        this.carry = result > 0xff;
        this.setZandN(result);
        this.mem.write(adr, result);
        return;
      }
      case "ROLA": {
        let result = (this.A[0] << 1) | (this.carry ? 1 : 0);
        this.carry = result > 0xff;
        this.setZandN(result);
        this.A[0] = result;
        return;
      }
      case "ROL": {
        let result = (this.mem.read(adr) << 1) | (this.carry ? 1 : 0);
        this.carry = result > 0xff;
        this.setZandN(result);
        this.mem.write(adr, result);
        return;
      }
      case "LSRA": {
        let carry = this.A[0] & 0x1;
        let result = this.A[0] >> 1;
        this.carry = carry > 0;
        this.setZandN(result);
        this.A[0] = result;
        return;
      }
      case "LSR": {
        let value = this.mem.read(adr);
        let carry = value & 0x1;
        let result = value >> 1;
        this.carry = carry > 0;
        this.setZandN(result);
        this.mem.write(adr, result);
        return;
      }
      case "RORA": {
        let carry = this.A[0] & 0x1;
        let result = (this.A[0] >> 1) | ((this.carry ? 1 : 0) << 7);
        this.carry = carry > 0;
        this.setZandN(result);
        this.A[0] = result;
        return;
      }
      case "ROR": {
        let value = this.mem.read(adr);
        let carry = value & 0x1;
        let result = (value >> 1) | ((this.carry ? 1 : 0) << 7);
        this.carry = carry > 0;
        this.setZandN(result);
        this.mem.write(adr, result);
        return;
      }
      case "LDA": {
        this.A[0] = this.mem.read(adr);
        this.setZandN(this.A[0]);
        return;
      }
      case "STA": {
        this.mem.write(adr, this.A[0]);
        return;
      }
      case "LDX": {
        this.X[0] = this.mem.read(adr);
        this.setZandN(this.X[0]);
        return;
      }
      case "STX": {
        this.mem.write(adr, this.X[0]);
        return;
      }
      case "LDY": {
        this.Y[0] = this.mem.read(adr);
        this.setZandN(this.Y[0]);
        return;
      }
      case "STY": {
        this.mem.write(adr, this.Y[0]);
        return;
      }
      case "TAX": {
        this.X[0] = this.A[0];
        this.setZandN(this.X[0]);
        return;
      }
      case "TXA": {
        this.A[0] = this.X[0];
        this.setZandN(this.A[0]);
        return;
      }
      case "TAY": {
        this.Y[0] = this.A[0];
        this.setZandN(this.Y[0]);
        return;
      }
      case "TYA": {
        this.A[0] = this.Y[0];
        this.setZandN(this.A[0]);
        return;
      }
      case "TSX": {
        this.X[0] = this.SP[0];
        this.setZandN(this.X[0]);
        return;
      }
      case "TXS": {
        this.SP[0] = this.X[0];
        return;
      }
      case "PLA": {
        this.A[0] = this.mem.read(0x100 + (++this.SP[0] & 0xff));
        this.setZandN(this.A[0]);
        return;
      }
      case "PHA": {
        this.mem.write(0x100 + this.SP[0]--, this.A[0]);
        return;
      }
      case "PLP": {
        this.setP(this.mem.read(0x100 + (++this.SP[0] & 0xff)));
        return;
      }
      case "PHP": {
        this.mem.write(0x100 + this.SP[0]--, this.getP(true));
        return;
      }
      case "BPL": {
        this.doBranch(!this.negative, adr);
        return;
      }
      case "BMI": {
        this.doBranch(this.negative, adr);
        return;
      }
      case "BVC": {
        this.doBranch(!this.overflow, adr);
        return;
      }
      case "BVS": {
        this.doBranch(this.overflow, adr);
        return;
      }
      case "BCC": {
        this.doBranch(!this.carry, adr);
        return;
      }
      case "BCS": {
        this.doBranch(this.carry, adr);
        return;
      }
      case "BNE": {
        this.doBranch(!this.zero, adr);
        return;
      }
      case "BEQ": {
        this.doBranch(this.zero, adr);
        return;
      }
      case "BRK": {
        let pushPc = (this.PC[0] + 1) & 0xffff;
        this.mem.write(0x100 + this.SP[0]--, pushPc >> 8);
        this.mem.write(0x100 + this.SP[0]--, pushPc & 0xff);
        this.mem.write(0x100 + this.SP[0]--, this.getP(true));
        this.interrupt = true;
        this.PC[0] = this.mem.read(0xfffe) | (this.mem.read(0xffff) << 8);
        return;
      }
      case "RTI": {
        this.setP(this.mem.read(0x100 + (++this.SP[0] & 0xff)));
        let pullPc = this.mem.read(0x100 + (++this.SP[0] & 0xff));
        pullPc |= this.mem.read(0x100 + (++this.SP[0] & 0xff)) << 8;
        this.PC[0] = pullPc;
        return;
      }
      case "JSR": {
        let pushPc = (this.PC[0] - 1) & 0xffff;
        this.mem.write(0x100 + this.SP[0]--, pushPc >> 8);
        this.mem.write(0x100 + this.SP[0]--, pushPc & 0xff);
        this.PC[0] = adr;
        return;
      }
      case "RTS": {
        let pullPc = this.mem.read(0x100 + (++this.SP[0] & 0xff));
        pullPc |= this.mem.read(0x100 + (++this.SP[0] & 0xff)) << 8;
        this.PC[0] = pullPc + 1;
        return;
      }
      case "JMP": {
        this.PC[0] = adr;
        return;
      }
      case "BIT": {
        let value = this.mem.read(adr);
        this.negative = (value & 0x80) > 0;
        this.overflow = (value & 0x40) > 0;
        let res = this.A[0] & value;
        this.zero = res === 0;
        return;
      }
      case "CLC": {
        this.carry = false;
        return;
      }
      case "SEC": {
        this.carry = true;
        return;
      }
      case "CLD": {
        this.decimal = false;
        return;
      }
      case "SED": {
        this.decimal = true;
        return;
      }
      case "CLI": {
        this.interrupt = false;
        return;
      }
      case "SEI": {
        this.interrupt = true;
        return;
      }
      case "CLV": {
        this.overflow = false;
        return;
      }
      case "NOP": {
        return;
      }
      case "IRQ": {
        let pushPc = this.PC[0];
        this.mem.write(0x100 + this.SP[0]--, pushPc >> 8);
        this.mem.write(0x100 + this.SP[0]--, pushPc & 0xff);
        this.mem.write(0x100 + this.SP[0]--, this.getP(false));
        this.interrupt = true;
        this.PC[0] = this.mem.read(0xfffe) | (this.mem.read(0xffff) << 8);
        return;
      }
      case "NMI": {
        let pushPc = this.PC[0];
        this.mem.write(0x100 + this.SP[0]--, pushPc >> 8);
        this.mem.write(0x100 + this.SP[0]--, pushPc & 0xff);
        this.mem.write(0x100 + this.SP[0]--, this.getP(false));
        this.interrupt = true;
        this.PC[0] = this.mem.read(0xfffa) | (this.mem.read(0xfffb) << 8);
        return;
      }
      // undocumented opcodes
      case "KIL": {
        this.PC[0]--;
        return;
      }
      case "SLO": {
        let result = this.mem.read(adr) << 1;
        this.carry = result > 0xff;
        this.mem.write(adr, result);
        this.A[0] |= result;
        this.setZandN(this.A[0]);
        return;
      }
      case "RLA": {
        let result = (this.mem.read(adr) << 1) | (this.carry ? 1 : 0);
        this.carry = result > 0xff;
        this.mem.write(adr, result);
        this.A[0] &= result;
        this.setZandN(this.A[0]);
        return;
      }
      case "SRE": {
        let value = this.mem.read(adr);
        let carry = value & 0x1;
        let result = value >> 1;
        this.carry = carry > 0;
        this.mem.write(adr, result);
        this.A[0] ^= result;
        this.setZandN(this.A[0]);
        return;
      }
      case "RRA": {
        let value = this.mem.read(adr);
        let carry = value & 0x1;
        let result = (value >> 1) | ((this.carry ? 1 : 0) << 7);
        this.mem.write(adr, result);
        let addResult = this.A[0] + result + carry;
        this.carry = addResult > 0xff;
        this.overflow = (this.A[0] & 0x80) === (result & 0x80) && (result & 0x80) !== (addResult & 0x80);
        this.A[0] = addResult;
        this.setZandN(this.A[0]);
        return;
      }
      case "SAX": {
        this.mem.write(adr, this.A[0] & this.X[0]);
        return;
      }
      case "LAX": {
        this.A[0] = this.mem.read(adr);
        this.X[0] = this.A[0];
        this.setZandN(this.X[0]);
        return;
      }
      case "DCP": {
        let value = (this.mem.read(adr) - 1) & 0xff;
        this.mem.write(adr, value);
        value ^= 0xff;
        let result = this.A[0] + value + 1;
        this.carry = result > 0xff;
        this.setZandN(result & 0xff);
        return;
      }
      case "ISC": {
        let value = (this.mem.read(adr) + 1) & 0xff;
        this.mem.write(adr, value);
        value ^= 0xff;
        let result = this.A[0] + value + (this.carry ? 1 : 0);
        this.carry = result > 0xff;
        this.overflow = (this.A[0] & 0x80) === (value & 0x80) && (value & 0x80) !== (result & 0x80);
        this.A[0] = result;
        this.setZandN(this.A[0]);
        return;
      }
      case "ANC": {
        this.A[0] &= this.mem.read(adr);
        this.setZandN(this.A[0]);
        this.carry = this.negative;
        return;
      }
      case "ALR": {
        this.A[0] &= this.mem.read(adr);
        let carry = this.A[0] & 0x1;
        let result = this.A[0] >> 1;
        this.carry = carry > 0;
        this.setZandN(result);
        this.A[0] = result;
        return;
      }
      case "ARR": {
        this.A[0] &= this.mem.read(adr);
        let result = (this.A[0] >> 1) | ((this.carry ? 1 : 0) << 7);
        this.setZandN(result);
        this.carry = (result & 0x40) > 0;
        this.overflow = ((result & 0x40) ^ ((result & 0x20) << 1)) > 0;
        this.A[0] = result;
        return;
      }
      case "AXS": {
        let value = this.mem.read(adr) ^ 0xff;
        let andedA = this.A[0] & this.X[0];
        let result = andedA + value + 1;
        this.carry = result > 0xff;
        this.X[0] = result;
        this.setZandN(this.X[0]);
        return;
      }
    }
  }
  opcodes = [
    { int: 0, hex: "0", op: "BRK", adm: "IMP", cycle: 7 },
    { int: 1, hex: "1", op: "ORA", adm: "IZX", cycle: 6 },
    { int: 2, hex: "2", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 3, hex: "3", op: "SLO", adm: "IZX", cycle: 8 },
    { int: 4, hex: "4", op: "NOP", adm: "ZP", cycle: 3 },
    { int: 5, hex: "5", op: "ORA", adm: "ZP", cycle: 3 },
    { int: 6, hex: "6", op: "ASL", adm: "ZP", cycle: 5 },
    { int: 7, hex: "7", op: "SLO", adm: "ZP", cycle: 5 },
    { int: 8, hex: "8", op: "PHP", adm: "IMP", cycle: 3 },
    { int: 9, hex: "9", op: "ORA", adm: "IMM", cycle: 2 },
    { int: 10, hex: "a", op: "ASLA", adm: "IMP", cycle: 2 },
    { int: 11, hex: "b", op: "ANC", adm: "IMM", cycle: 2 },
    { int: 12, hex: "c", op: "NOP", adm: "ABS", cycle: 4 },
    { int: 13, hex: "d", op: "ORA", adm: "ABS", cycle: 4 },
    { int: 14, hex: "e", op: "ASL", adm: "ABS", cycle: 6 },
    { int: 15, hex: "f", op: "SLO", adm: "ABS", cycle: 6 },
    { int: 16, hex: "10", op: "BPL", adm: "REL", cycle: 2 },
    { int: 17, hex: "11", op: "ORA", adm: "IZYr", cycle: 5 },
    { int: 18, hex: "12", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 19, hex: "13", op: "SLO", adm: "IZY", cycle: 8 },
    { int: 20, hex: "14", op: "NOP", adm: "ZPX", cycle: 4 },
    { int: 21, hex: "15", op: "ORA", adm: "ZPX", cycle: 4 },
    { int: 22, hex: "16", op: "ASL", adm: "ZPX", cycle: 6 },
    { int: 23, hex: "17", op: "SLO", adm: "ZPX", cycle: 6 },
    { int: 24, hex: "18", op: "CLC", adm: "IMP", cycle: 2 },
    { int: 25, hex: "19", op: "ORA", adm: "ABYr", cycle: 4 },
    { int: 26, hex: "1a", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 27, hex: "1b", op: "SLO", adm: "ABY", cycle: 7 },
    { int: 28, hex: "1c", op: "NOP", adm: "ABXr", cycle: 4 },
    { int: 29, hex: "1d", op: "ORA", adm: "ABXr", cycle: 4 },
    { int: 30, hex: "1e", op: "ASL", adm: "ABX", cycle: 7 },
    { int: 31, hex: "1f", op: "SLO", adm: "ABX", cycle: 7 },
    { int: 32, hex: "20", op: "JSR", adm: "ABS", cycle: 6 },
    { int: 33, hex: "21", op: "AND", adm: "IZX", cycle: 6 },
    { int: 34, hex: "22", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 35, hex: "23", op: "RLA", adm: "IZX", cycle: 8 },
    { int: 36, hex: "24", op: "BIT", adm: "ZP", cycle: 3 },
    { int: 37, hex: "25", op: "AND", adm: "ZP", cycle: 3 },
    { int: 38, hex: "26", op: "ROL", adm: "ZP", cycle: 5 },
    { int: 39, hex: "27", op: "RLA", adm: "ZP", cycle: 5 },
    { int: 40, hex: "28", op: "PLP", adm: "IMP", cycle: 4 },
    { int: 41, hex: "29", op: "AND", adm: "IMM", cycle: 2 },
    { int: 42, hex: "2a", op: "ROLA", adm: "IMP", cycle: 2 },
    { int: 43, hex: "2b", op: "ANC", adm: "IMM", cycle: 2 },
    { int: 44, hex: "2c", op: "BIT", adm: "ABS", cycle: 4 },
    { int: 45, hex: "2d", op: "AND", adm: "ABS", cycle: 4 },
    { int: 46, hex: "2e", op: "ROL", adm: "ABS", cycle: 6 },
    { int: 47, hex: "2f", op: "RLA", adm: "ABS", cycle: 6 },
    { int: 48, hex: "30", op: "BMI", adm: "REL", cycle: 2 },
    { int: 49, hex: "31", op: "AND", adm: "IZYr", cycle: 5 },
    { int: 50, hex: "32", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 51, hex: "33", op: "RLA", adm: "IZY", cycle: 8 },
    { int: 52, hex: "34", op: "NOP", adm: "ZPX", cycle: 4 },
    { int: 53, hex: "35", op: "AND", adm: "ZPX", cycle: 4 },
    { int: 54, hex: "36", op: "ROL", adm: "ZPX", cycle: 6 },
    { int: 55, hex: "37", op: "RLA", adm: "ZPX", cycle: 6 },
    { int: 56, hex: "38", op: "SEC", adm: "IMP", cycle: 2 },
    { int: 57, hex: "39", op: "AND", adm: "ABYr", cycle: 4 },
    { int: 58, hex: "3a", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 59, hex: "3b", op: "RLA", adm: "ABY", cycle: 7 },
    { int: 60, hex: "3c", op: "NOP", adm: "ABXr", cycle: 4 },
    { int: 61, hex: "3d", op: "AND", adm: "ABXr", cycle: 4 },
    { int: 62, hex: "3e", op: "ROL", adm: "ABX", cycle: 7 },
    { int: 63, hex: "3f", op: "RLA", adm: "ABX", cycle: 7 },
    { int: 64, hex: "40", op: "RTI", adm: "IMP", cycle: 6 },
    { int: 65, hex: "41", op: "EOR", adm: "IZX", cycle: 6 },
    { int: 66, hex: "42", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 67, hex: "43", op: "SRE", adm: "IZX", cycle: 8 },
    { int: 68, hex: "44", op: "NOP", adm: "ZP", cycle: 3 },
    { int: 69, hex: "45", op: "EOR", adm: "ZP", cycle: 3 },
    { int: 70, hex: "46", op: "LSR", adm: "ZP", cycle: 5 },
    { int: 71, hex: "47", op: "SRE", adm: "ZP", cycle: 5 },
    { int: 72, hex: "48", op: "PHA", adm: "IMP", cycle: 3 },
    { int: 73, hex: "49", op: "EOR", adm: "IMM", cycle: 2 },
    { int: 74, hex: "4a", op: "LSRA", adm: "IMP", cycle: 2 },
    { int: 75, hex: "4b", op: "ALR", adm: "IMM", cycle: 2 },
    { int: 76, hex: "4c", op: "JMP", adm: "ABS", cycle: 3 },
    { int: 77, hex: "4d", op: "EOR", adm: "ABS", cycle: 4 },
    { int: 78, hex: "4e", op: "LSR", adm: "ABS", cycle: 6 },
    { int: 79, hex: "4f", op: "SRE", adm: "ABS", cycle: 6 },
    { int: 80, hex: "50", op: "BVC", adm: "REL", cycle: 2 },
    { int: 81, hex: "51", op: "EOR", adm: "IZYr", cycle: 5 },
    { int: 82, hex: "52", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 83, hex: "53", op: "SRE", adm: "IZY", cycle: 8 },
    { int: 84, hex: "54", op: "NOP", adm: "ZPX", cycle: 4 },
    { int: 85, hex: "55", op: "EOR", adm: "ZPX", cycle: 4 },
    { int: 86, hex: "56", op: "LSR", adm: "ZPX", cycle: 6 },
    { int: 87, hex: "57", op: "SRE", adm: "ZPX", cycle: 6 },
    { int: 88, hex: "58", op: "CLI", adm: "IMP", cycle: 2 },
    { int: 89, hex: "59", op: "EOR", adm: "ABYr", cycle: 4 },
    { int: 90, hex: "5a", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 91, hex: "5b", op: "SRE", adm: "ABY", cycle: 7 },
    { int: 92, hex: "5c", op: "NOP", adm: "ABXr", cycle: 4 },
    { int: 93, hex: "5d", op: "EOR", adm: "ABXr", cycle: 4 },
    { int: 94, hex: "5e", op: "LSR", adm: "ABX", cycle: 7 },
    { int: 95, hex: "5f", op: "SRE", adm: "ABX", cycle: 7 },
    { int: 96, hex: "60", op: "RTS", adm: "IMP", cycle: 6 },
    { int: 97, hex: "61", op: "ADC", adm: "IZX", cycle: 6 },
    { int: 98, hex: "62", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 99, hex: "63", op: "RRA", adm: "IZX", cycle: 8 },
    { int: 100, hex: "64", op: "NOP", adm: "ZP", cycle: 3 },
    { int: 101, hex: "65", op: "ADC", adm: "ZP", cycle: 3 },
    { int: 102, hex: "66", op: "ROR", adm: "ZP", cycle: 5 },
    { int: 103, hex: "67", op: "RRA", adm: "ZP", cycle: 5 },
    { int: 104, hex: "68", op: "PLA", adm: "IMP", cycle: 4 },
    { int: 105, hex: "69", op: "ADC", adm: "IMM", cycle: 2 },
    { int: 106, hex: "6a", op: "RORA", adm: "IMP", cycle: 2 },
    { int: 107, hex: "6b", op: "ARR", adm: "IMM", cycle: 2 },
    { int: 108, hex: "6c", op: "JMP", adm: "IND", cycle: 5 },
    { int: 109, hex: "6d", op: "ADC", adm: "ABS", cycle: 4 },
    { int: 110, hex: "6e", op: "ROR", adm: "ABS", cycle: 6 },
    { int: 111, hex: "6f", op: "RRA", adm: "ABS", cycle: 6 },
    { int: 112, hex: "70", op: "BVS", adm: "REL", cycle: 2 },
    { int: 113, hex: "71", op: "ADC", adm: "IZYr", cycle: 5 },
    { int: 114, hex: "72", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 115, hex: "73", op: "RRA", adm: "IZY", cycle: 8 },
    { int: 116, hex: "74", op: "NOP", adm: "ZPX", cycle: 4 },
    { int: 117, hex: "75", op: "ADC", adm: "ZPX", cycle: 4 },
    { int: 118, hex: "76", op: "ROR", adm: "ZPX", cycle: 6 },
    { int: 119, hex: "77", op: "RRA", adm: "ZPX", cycle: 6 },
    { int: 120, hex: "78", op: "SEI", adm: "IMP", cycle: 2 },
    { int: 121, hex: "79", op: "ADC", adm: "ABYr", cycle: 4 },
    { int: 122, hex: "7a", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 123, hex: "7b", op: "RRA", adm: "ABY", cycle: 7 },
    { int: 124, hex: "7c", op: "NOP", adm: "ABXr", cycle: 4 },
    { int: 125, hex: "7d", op: "ADC", adm: "ABXr", cycle: 4 },
    { int: 126, hex: "7e", op: "ROR", adm: "ABX", cycle: 7 },
    { int: 127, hex: "7f", op: "RRA", adm: "ABX", cycle: 7 },
    { int: 128, hex: "80", op: "NOP", adm: "IMM", cycle: 2 },
    { int: 129, hex: "81", op: "STA", adm: "IZX", cycle: 6 },
    { int: 130, hex: "82", op: "NOP", adm: "IMM", cycle: 2 },
    { int: 131, hex: "83", op: "SAX", adm: "IZX", cycle: 6 },
    { int: 132, hex: "84", op: "STY", adm: "ZP", cycle: 3 },
    { int: 133, hex: "85", op: "STA", adm: "ZP", cycle: 3 },
    { int: 134, hex: "86", op: "STX", adm: "ZP", cycle: 3 },
    { int: 135, hex: "87", op: "SAX", adm: "ZP", cycle: 3 },
    { int: 136, hex: "88", op: "DEY", adm: "IMP", cycle: 2 },
    { int: 137, hex: "89", op: "NOP", adm: "IMM", cycle: 2 },
    { int: 138, hex: "8a", op: "TXA", adm: "IMP", cycle: 2 },
    { int: 139, hex: "8b", op: "UNI", adm: "IMM", cycle: 2 },
    { int: 140, hex: "8c", op: "STY", adm: "ABS", cycle: 4 },
    { int: 141, hex: "8d", op: "STA", adm: "ABS", cycle: 4 },
    { int: 142, hex: "8e", op: "STX", adm: "ABS", cycle: 4 },
    { int: 143, hex: "8f", op: "SAX", adm: "ABS", cycle: 4 },
    { int: 144, hex: "90", op: "BCC", adm: "REL", cycle: 2 },
    { int: 145, hex: "91", op: "STA", adm: "IZY", cycle: 6 },
    { int: 146, hex: "92", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 147, hex: "93", op: "UNI", adm: "IZY", cycle: 6 },
    { int: 148, hex: "94", op: "STY", adm: "ZPX", cycle: 4 },
    { int: 149, hex: "95", op: "STA", adm: "ZPX", cycle: 4 },
    { int: 150, hex: "96", op: "STX", adm: "ZPY", cycle: 4 },
    { int: 151, hex: "97", op: "SAX", adm: "ZPY", cycle: 4 },
    { int: 152, hex: "98", op: "TYA", adm: "IMP", cycle: 2 },
    { int: 153, hex: "99", op: "STA", adm: "ABY", cycle: 5 },
    { int: 154, hex: "9a", op: "TXS", adm: "IMP", cycle: 2 },
    { int: 155, hex: "9b", op: "UNI", adm: "ABY", cycle: 5 },
    { int: 156, hex: "9c", op: "UNI", adm: "ABX", cycle: 5 },
    { int: 157, hex: "9d", op: "STA", adm: "ABX", cycle: 5 },
    { int: 158, hex: "9e", op: "UNI", adm: "ABY", cycle: 5 },
    { int: 159, hex: "9f", op: "UNI", adm: "ABY", cycle: 5 },
    { int: 160, hex: "a0", op: "LDY", adm: "IMM", cycle: 2 },
    { int: 161, hex: "a1", op: "LDA", adm: "IZX", cycle: 6 },
    { int: 162, hex: "a2", op: "LDX", adm: "IMM", cycle: 2 },
    { int: 163, hex: "a3", op: "LAX", adm: "IZX", cycle: 6 },
    { int: 164, hex: "a4", op: "LDY", adm: "ZP", cycle: 3 },
    { int: 165, hex: "a5", op: "LDA", adm: "ZP", cycle: 3 },
    { int: 166, hex: "a6", op: "LDX", adm: "ZP", cycle: 3 },
    { int: 167, hex: "a7", op: "LAX", adm: "ZP", cycle: 3 },
    { int: 168, hex: "a8", op: "TAY", adm: "IMP", cycle: 2 },
    { int: 169, hex: "a9", op: "LDA", adm: "IMM", cycle: 2 },
    { int: 170, hex: "aa", op: "TAX", adm: "IMP", cycle: 2 },
    { int: 171, hex: "ab", op: "UNI", adm: "IMM", cycle: 2 },
    { int: 172, hex: "ac", op: "LDY", adm: "ABS", cycle: 4 },
    { int: 173, hex: "ad", op: "LDA", adm: "ABS", cycle: 4 },
    { int: 174, hex: "ae", op: "LDX", adm: "ABS", cycle: 4 },
    { int: 175, hex: "af", op: "LAX", adm: "ABS", cycle: 4 },
    { int: 176, hex: "b0", op: "BCS", adm: "REL", cycle: 2 },
    { int: 177, hex: "b1", op: "LDA", adm: "IZYr", cycle: 5 },
    { int: 178, hex: "b2", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 179, hex: "b3", op: "LAX", adm: "IZYr", cycle: 5 },
    { int: 180, hex: "b4", op: "LDY", adm: "ZPX", cycle: 4 },
    { int: 181, hex: "b5", op: "LDA", adm: "ZPX", cycle: 4 },
    { int: 182, hex: "b6", op: "LDX", adm: "ZPY", cycle: 4 },
    { int: 183, hex: "b7", op: "LAX", adm: "ZPY", cycle: 4 },
    { int: 184, hex: "b8", op: "CLV", adm: "IMP", cycle: 2 },
    { int: 185, hex: "b9", op: "LDA", adm: "ABYr", cycle: 4 },
    { int: 186, hex: "ba", op: "TSX", adm: "IMP", cycle: 2 },
    { int: 187, hex: "bb", op: "UNI", adm: "ABYr", cycle: 4 },
    { int: 188, hex: "bc", op: "LDY", adm: "ABXr", cycle: 4 },
    { int: 189, hex: "bd", op: "LDA", adm: "ABXr", cycle: 4 },
    { int: 190, hex: "be", op: "LDX", adm: "ABYr", cycle: 4 },
    { int: 191, hex: "bf", op: "LAX", adm: "ABYr", cycle: 4 },
    { int: 192, hex: "c0", op: "CPY", adm: "IMM", cycle: 2 },
    { int: 193, hex: "c1", op: "CMP", adm: "IZX", cycle: 6 },
    { int: 194, hex: "c2", op: "NOP", adm: "IMM", cycle: 2 },
    { int: 195, hex: "c3", op: "DCP", adm: "IZX", cycle: 8 },
    { int: 196, hex: "c4", op: "CPY", adm: "ZP", cycle: 3 },
    { int: 197, hex: "c5", op: "CMP", adm: "ZP", cycle: 3 },
    { int: 198, hex: "c6", op: "DEC", adm: "ZP", cycle: 5 },
    { int: 199, hex: "c7", op: "DCP", adm: "ZP", cycle: 5 },
    { int: 200, hex: "c8", op: "INY", adm: "IMP", cycle: 2 },
    { int: 201, hex: "c9", op: "CMP", adm: "IMM", cycle: 2 },
    { int: 202, hex: "ca", op: "DEX", adm: "IMP", cycle: 2 },
    { int: 203, hex: "cb", op: "AXS", adm: "IMM", cycle: 2 },
    { int: 204, hex: "cc", op: "CPY", adm: "ABS", cycle: 4 },
    { int: 205, hex: "cd", op: "CMP", adm: "ABS", cycle: 4 },
    { int: 206, hex: "ce", op: "DEC", adm: "ABS", cycle: 6 },
    { int: 207, hex: "cf", op: "DCP", adm: "ABS", cycle: 6 },
    { int: 208, hex: "d0", op: "BNE", adm: "REL", cycle: 2 },
    { int: 209, hex: "d1", op: "CMP", adm: "IZYr", cycle: 5 },
    { int: 210, hex: "d2", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 211, hex: "d3", op: "DCP", adm: "IZY", cycle: 8 },
    { int: 212, hex: "d4", op: "NOP", adm: "ZPX", cycle: 4 },
    { int: 213, hex: "d5", op: "CMP", adm: "ZPX", cycle: 4 },
    { int: 214, hex: "d6", op: "DEC", adm: "ZPX", cycle: 6 },
    { int: 215, hex: "d7", op: "DCP", adm: "ZPX", cycle: 6 },
    { int: 216, hex: "d8", op: "CLD", adm: "IMP", cycle: 2 },
    { int: 217, hex: "d9", op: "CMP", adm: "ABYr", cycle: 4 },
    { int: 218, hex: "da", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 219, hex: "db", op: "DCP", adm: "ABY", cycle: 7 },
    { int: 220, hex: "dc", op: "NOP", adm: "ABXr", cycle: 4 },
    { int: 221, hex: "dd", op: "CMP", adm: "ABXr", cycle: 4 },
    { int: 222, hex: "de", op: "DEC", adm: "ABX", cycle: 7 },
    { int: 223, hex: "df", op: "DCP", adm: "ABX", cycle: 7 },
    { int: 224, hex: "e0", op: "CPX", adm: "IMM", cycle: 2 },
    { int: 225, hex: "e1", op: "SBC", adm: "IZX", cycle: 6 },
    { int: 226, hex: "e2", op: "NOP", adm: "IMM", cycle: 2 },
    { int: 227, hex: "e3", op: "ISC", adm: "IZX", cycle: 8 },
    { int: 228, hex: "e4", op: "CPX", adm: "ZP", cycle: 3 },
    { int: 229, hex: "e5", op: "SBC", adm: "ZP", cycle: 3 },
    { int: 230, hex: "e6", op: "INC", adm: "ZP", cycle: 5 },
    { int: 231, hex: "e7", op: "ISC", adm: "ZP", cycle: 5 },
    { int: 232, hex: "e8", op: "INX", adm: "IMP", cycle: 2 },
    { int: 233, hex: "e9", op: "SBC", adm: "IMM", cycle: 2 },
    { int: 234, hex: "ea", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 235, hex: "eb", op: "SBC", adm: "IMM", cycle: 2 },
    { int: 236, hex: "ec", op: "CPX", adm: "ABS", cycle: 4 },
    { int: 237, hex: "ed", op: "SBC", adm: "ABS", cycle: 4 },
    { int: 238, hex: "ee", op: "INC", adm: "ABS", cycle: 6 },
    { int: 239, hex: "ef", op: "ISC", adm: "ABS", cycle: 6 },
    { int: 240, hex: "f0", op: "BEQ", adm: "REL", cycle: 2 },
    { int: 241, hex: "f1", op: "SBC", adm: "IZYr", cycle: 5 },
    { int: 242, hex: "f2", op: "KIL", adm: "IMP", cycle: 2 },
    { int: 243, hex: "f3", op: "ISC", adm: "IZY", cycle: 8 },
    { int: 244, hex: "f4", op: "NOP", adm: "ZPX", cycle: 4 },
    { int: 245, hex: "f5", op: "SBC", adm: "ZPX", cycle: 4 },
    { int: 246, hex: "f6", op: "INC", adm: "ZPX", cycle: 6 },
    { int: 247, hex: "f7", op: "ISC", adm: "ZPX", cycle: 6 },
    { int: 248, hex: "f8", op: "SED", adm: "IMP", cycle: 2 },
    { int: 249, hex: "f9", op: "SBC", adm: "ABYr", cycle: 4 },
    { int: 250, hex: "fa", op: "NOP", adm: "IMP", cycle: 2 },
    { int: 251, hex: "fb", op: "ISC", adm: "ABY", cycle: 7 },
    { int: 252, hex: "fc", op: "NOP", adm: "ABXr", cycle: 4 },
    { int: 253, hex: "fd", op: "SBC", adm: "ABXr", cycle: 4 },
    { int: 254, hex: "fe", op: "INC", adm: "ABX", cycle: 7 },
    { int: 255, hex: "ff", op: "ISC", adm: "ABX", cycle: 7 },
    { int: 256, hex: "100", op: "NMI" },
    { int: 257, hex: "101", op: "IRQ" },
  ];
}
