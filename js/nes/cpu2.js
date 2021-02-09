class CPU2 {
  constructor(nes,mem) {
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
    this.opcodes = [
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
  initCpu() {
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
  runCpu(test) {
		const val = this.nes.irq.checkCpuIrqWanted();
		if (val === "nmi") {
			this.nes.irq.nmiWanted = false;
			this.NMI();
    } else if (val === "irq") {
			this.nes.irq.irqWanted = false;
			// this.toIRQ = 0x00;
			this.IRQ();
		}
		var oldpc = this.PC;
		var opcode = this.mem.Get(this.PC++);
		this.CPUClock += this.CycleTable[opcode];
		if(test)this.showInfo(oldpc,opcode);
		return opcode;
  }
	showInfo(oldpc,opcode){
    console.log(oldpc.toString(16).toUpperCase() + " : " +  opcode);
	}
  exec(opcode) {
    this.ExecuteOpCode(opcode);
  }
  ExecuteOpCode(opcode) {
    switch (opcode) {
      case 0xa1:
        this.LDA(this.GetAddressIndirectX());
        break;
      case 0xa5:
        this.LDA(this.GetAddressZeroPage());
        break;
      case 0xa9:
        this.LDA(this.GetAddressImmediate());
        break;
      case 0xad:
        this.LDA(this.GetAddressAbsolute());
        break;
      case 0xb1:
        this.LDA(this.GetAddressIndirectY());
        break;
      case 0xb5:
        this.LDA(this.GetAddressZeroPageX());
        break;
      case 0xb9:
        this.LDA(this.GetAddressAbsoluteY());
        break;
      case 0xbd:
        this.LDA(this.GetAddressAbsoluteX());
        break;
      case 0xa2:
        this.LDX(this.GetAddressImmediate());
        break;
      case 0xa6:
        this.LDX(this.GetAddressZeroPage());
        break;
      case 0xae:
        this.LDX(this.GetAddressAbsolute());
        break;
      case 0xb6:
        this.LDX(this.GetAddressZeroPageY());
        break;
      case 0xbe:
        this.LDX(this.GetAddressAbsoluteY());
        break;
      case 0xa0:
        this.LDY(this.GetAddressImmediate());
        break;
      case 0xa4:
        this.LDY(this.GetAddressZeroPage());
        break;
      case 0xac:
        this.LDY(this.GetAddressAbsolute());
        break;
      case 0xb4:
        this.LDY(this.GetAddressZeroPageX());
        break;
      case 0xbc:
        this.LDY(this.GetAddressAbsoluteX());
        break;
      case 0x81:
        this.STA(this.GetAddressIndirectX());
        break;
      case 0x85:
        this.STA(this.GetAddressZeroPage());
        break;
      case 0x8d:
        this.STA(this.GetAddressAbsolute());
        break;
      case 0x91:
        this.STA(this.GetAddressIndirectY());
        break;
      case 0x95:
        this.STA(this.GetAddressZeroPageX());
        break;
      case 0x99:
        this.STA(this.GetAddressAbsoluteY());
        break;
      case 0x9d:
        this.STA(this.GetAddressAbsoluteX());
        break;
      case 0x86:
        this.STX(this.GetAddressZeroPage());
        break;
      case 0x8e:
        this.STX(this.GetAddressAbsolute());
        break;
      case 0x96:
        this.STX(this.GetAddressZeroPageY());
        break;
      case 0x84:
        this.STY(this.GetAddressZeroPage());
        break;
      case 0x8c:
        this.STY(this.GetAddressAbsolute());
        break;
      case 0x94:
        this.STY(this.GetAddressZeroPageX());
        break;
      case 0x8a:
        this.TXA();
        break;
      case 0x98:
        this.TYA();
        break;
      case 0x9a:
        this.TXS();
        break;
      case 0xa8:
        this.TAY();
        break;
      case 0xaa:
        this.TAX();
        break;
      case 0xba:
        this.TSX();
        break;
      case 0x08:
        this.PHP();
        break;
      case 0x28:
        this.PLP();
        break;
      case 0x48:
        this.PHA();
        break;
      case 0x68:
        this.PLA();
        break;
      case 0x61:
        this.ADC(this.GetAddressIndirectX());
        break;
      case 0x65:
        this.ADC(this.GetAddressZeroPage());
        break;
      case 0x69:
        this.ADC(this.GetAddressImmediate());
        break;
      case 0x6d:
        this.ADC(this.GetAddressAbsolute());
        break;
      case 0x71:
        this.ADC(this.GetAddressIndirectY());
        break;
      case 0x75:
        this.ADC(this.GetAddressZeroPageX());
        break;
      case 0x79:
        this.ADC(this.GetAddressAbsoluteY());
        break;
      case 0x7d:
        this.ADC(this.GetAddressAbsoluteX());
        break;
      case 0xe1:
        this.SBC(this.GetAddressIndirectX());
        break;
      case 0xe5:
        this.SBC(this.GetAddressZeroPage());
        break;
      case 0xe9:
        this.SBC(this.GetAddressImmediate());
        break;
      case 0xed:
        this.SBC(this.GetAddressAbsolute());
        break;
      case 0xf1:
        this.SBC(this.GetAddressIndirectY());
        break;
      case 0xf5:
        this.SBC(this.GetAddressZeroPageX());
        break;
      case 0xf9:
        this.SBC(this.GetAddressAbsoluteY());
        break;
      case 0xfd:
        this.SBC(this.GetAddressAbsoluteX());
        break;
      case 0xc1:
        this.CMP(this.GetAddressIndirectX());
        break;
      case 0xc5:
        this.CMP(this.GetAddressZeroPage());
        break;
      case 0xc9:
        this.CMP(this.GetAddressImmediate());
        break;
      case 0xcd:
        this.CMP(this.GetAddressAbsolute());
        break;
      case 0xd1:
        this.CMP(this.GetAddressIndirectY());
        break;
      case 0xd5:
        this.CMP(this.GetAddressZeroPageX());
        break;
      case 0xd9:
        this.CMP(this.GetAddressAbsoluteY());
        break;
      case 0xdd:
        this.CMP(this.GetAddressAbsoluteX());
        break;
      case 0xe0:
        this.CPX(this.GetAddressImmediate());
        break;
      case 0xe4:
        this.CPX(this.GetAddressZeroPage());
        break;
      case 0xec:
        this.CPX(this.GetAddressAbsolute());
        break;
      case 0xc0:
        this.CPY(this.GetAddressImmediate());
        break;
      case 0xc4:
        this.CPY(this.GetAddressZeroPage());
        break;
      case 0xcc:
        this.CPY(this.GetAddressAbsolute());
        break;
      case 0x21:
        this.AND(this.GetAddressIndirectX());
        break;
      case 0x25:
        this.AND(this.GetAddressZeroPage());
        break;
      case 0x29:
        this.AND(this.GetAddressImmediate());
        break;
      case 0x2d:
        this.AND(this.GetAddressAbsolute());
        break;
      case 0x31:
        this.AND(this.GetAddressIndirectY());
        break;
      case 0x35:
        this.AND(this.GetAddressZeroPageX());
        break;
      case 0x39:
        this.AND(this.GetAddressAbsoluteY());
        break;
      case 0x3d:
        this.AND(this.GetAddressAbsoluteX());
        break;
      case 0x41:
        this.EOR(this.GetAddressIndirectX());
        break;
      case 0x45:
        this.EOR(this.GetAddressZeroPage());
        break;
      case 0x49:
        this.EOR(this.GetAddressImmediate());
        break;
      case 0x4d:
        this.EOR(this.GetAddressAbsolute());
        break;
      case 0x51:
        this.EOR(this.GetAddressIndirectY());
        break;
      case 0x55:
        this.EOR(this.GetAddressZeroPageX());
        break;
      case 0x59:
        this.EOR(this.GetAddressAbsoluteY());
        break;
      case 0x5d:
        this.EOR(this.GetAddressAbsoluteX());
        break;
      case 0x01:
        this.ORA(this.GetAddressIndirectX());
        break;
      case 0x05:
        this.ORA(this.GetAddressZeroPage());
        break;
      case 0x09:
        this.ORA(this.GetAddressImmediate());
        break;
      case 0x0d:
        this.ORA(this.GetAddressAbsolute());
        break;
      case 0x11:
        this.ORA(this.GetAddressIndirectY());
        break;
      case 0x15:
        this.ORA(this.GetAddressZeroPageX());
        break;
      case 0x19:
        this.ORA(this.GetAddressAbsoluteY());
        break;
      case 0x1d:
        this.ORA(this.GetAddressAbsoluteX());
        break;
      case 0x24:
        this.BIT(this.GetAddressZeroPage());
        break;
      case 0x2c:
        this.BIT(this.GetAddressAbsolute());
        break;
      case 0x06:
        this.ASL(this.GetAddressZeroPage());
        break;
      case 0x0a:
        this.A = this.ASL_Sub(this.A);
        break;
      case 0x0e:
        this.ASL(this.GetAddressAbsolute());
        break;
      case 0x16:
        this.ASL(this.GetAddressZeroPageX());
        break;
      case 0x1e:
        this.ASL(this.GetAddressAbsoluteX());
        break;
      case 0x46:
        this.LSR(this.GetAddressZeroPage());
        break;
      case 0x4a:
        this.A = this.LSR_Sub(this.A);
        break;
      case 0x4e:
        this.LSR(this.GetAddressAbsolute());
        break;
      case 0x56:
        this.LSR(this.GetAddressZeroPageX());
        break;
      case 0x5e:
        this.LSR(this.GetAddressAbsoluteX());
        break;
      case 0x26:
        this.ROL(this.GetAddressZeroPage());
        break;
      case 0x2a:
        this.A = this.ROL_Sub(this.A);
        break;
      case 0x2e:
        this.ROL(this.GetAddressAbsolute());
        break;
      case 0x36:
        this.ROL(this.GetAddressZeroPageX());
        break;
      case 0x3e:
        this.ROL(this.GetAddressAbsoluteX());
        break;
      case 0x66:
        this.ROR(this.GetAddressZeroPage());
        break;
      case 0x6a:
        this.A = this.ROR_Sub(this.A);
        break;
      case 0x6e:
        this.ROR(this.GetAddressAbsolute());
        break;
      case 0x76:
        this.ROR(this.GetAddressZeroPageX());
        break;
      case 0x7e:
        this.ROR(this.GetAddressAbsoluteX());
        break;
      case 0xe6:
        this.INC(this.GetAddressZeroPage());
        break;
      case 0xee:
        this.INC(this.GetAddressAbsolute());
        break;
      case 0xf6:
        this.INC(this.GetAddressZeroPageX());
        break;
      case 0xfe:
        this.INC(this.GetAddressAbsoluteX());
        break;
      case 0xe8:
        this.INX();
        break;
      case 0xc8:
        this.INY();
        break;
      case 0xc6:
        this.DEC(this.GetAddressZeroPage());
        break;
      case 0xce:
        this.DEC(this.GetAddressAbsolute());
        break;
      case 0xd6:
        this.DEC(this.GetAddressZeroPageX());
        break;
      case 0xde:
        this.DEC(this.GetAddressAbsoluteX());
        break;
      case 0xca:
        this.DEX();
        break;
      case 0x88:
        this.DEY();
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
        this.NOP();
        break;
      case 0x00:
        this.BRK();
        break;
      case 0x4c:
        this.JMP(this.GetAddressAbsolute());
        break;
      case 0x6c:
        var address = this.GetAddressAbsolute();
        var tmp = ((address + 1) & 0x00ff) | (address & 0xff00);
        this.JMP(this.mem.Get(address) | (this.mem.Get(tmp) << 8));
        break;
      case 0x20:
        this.JSR();
        break;
      case 0x60:
        this.RTS();
        break;
      case 0x40:
        this.RTI();
        break;
      case 0x10:
        this.BPL();
        break;
      case 0x30:
        this.BMI();
        break;
      case 0x50:
        this.BVC();
        break;
      case 0x70:
        this.BVS();
        break;
      case 0x90:
        this.BCC();
        break;
      case 0xb0:
        this.BCS();
        break;
      case 0xd0:
        this.BNE();
        break;
      case 0xf0:
        this.BEQ();
        break;
      case 0x0b:
      case 0x2b:
        this.ANC(this.GetAddressImmediate());
        break;
      case 0x8b:
        this.ANE(this.GetAddressImmediate());
        break;
      case 0x6b:
        this.ARR(this.GetAddressImmediate());
        break;
      case 0x4b:
        this.ASR(this.GetAddressImmediate());
        break;
      case 0xc7:
        this.DCP(this.GetAddressZeroPage());
        break;
      case 0xd7:
        this.DCP(this.GetAddressZeroPageX());
        break;
      case 0xcf:
        this.DCP(this.GetAddressAbsolute());
        break;
      case 0xdf:
        this.DCP(this.GetAddressAbsoluteX());
        break;
      case 0xdb:
        this.DCP(this.GetAddressAbsoluteY());
        break;
      case 0xc3:
        this.DCP(this.GetAddressIndirectX());
        break;
      case 0xd3:
        this.DCP(this.GetAddressIndirectY());
        break;
      case 0xe7:
        this.ISB(this.GetAddressZeroPage());
        break;
      case 0xf7:
        this.ISB(this.GetAddressZeroPageX());
        break;
      case 0xef:
        this.ISB(this.GetAddressAbsolute());
        break;
      case 0xff:
        this.ISB(this.GetAddressAbsoluteX());
        break;
      case 0xfb:
        this.ISB(this.GetAddressAbsoluteY());
        break;
      case 0xe3:
        this.ISB(this.GetAddressIndirectX());
        break;
      case 0xf3:
        this.ISB(this.GetAddressIndirectY());
        break;
      case 0xbb:
        this.LAS(this.GetAddressAbsoluteY());
        break;
      case 0xa7:
        this.LAX(this.GetAddressZeroPage());
        break;
      case 0xb7:
        this.LAX(this.GetAddressZeroPageY());
        break;
      case 0xaf:
        this.LAX(this.GetAddressAbsolute());
        break;
      case 0xbf:
        this.LAX(this.GetAddressAbsoluteY());
        break;
      case 0xa3:
        this.LAX(this.GetAddressIndirectX());
        break;
      case 0xb3:
        this.LAX(this.GetAddressIndirectY());
        break;
      case 0xab:
        this.LXA(this.GetAddressImmediate());
        break;
      case 0x27:
        this.RLA(this.GetAddressZeroPage());
        break;
      case 0x37:
        this.RLA(this.GetAddressZeroPageX());
        break;
      case 0x2f:
        this.RLA(this.GetAddressAbsolute());
        break;
      case 0x3f:
        this.RLA(this.GetAddressAbsoluteX());
        break;
      case 0x3b:
        this.RLA(this.GetAddressAbsoluteY());
        break;
      case 0x23:
        this.RLA(this.GetAddressIndirectX());
        break;
      case 0x33:
        this.RLA(this.GetAddressIndirectY());
        break;
      case 0x67:
        this.RRA(this.GetAddressZeroPage());
        break;
      case 0x77:
        this.RRA(this.GetAddressZeroPageX());
        break;
      case 0x6f:
        this.RRA(this.GetAddressAbsolute());
        break;
      case 0x7f:
        this.RRA(this.GetAddressAbsoluteX());
        break;
      case 0x7b:
        this.RRA(this.GetAddressAbsoluteY());
        break;
      case 0x63:
        this.RRA(this.GetAddressIndirectX());
        break;
      case 0x73:
        this.RRA(this.GetAddressIndirectY());
        break;
      case 0x87:
        this.SAX(this.GetAddressZeroPage());
        break;
      case 0x97:
        this.SAX(this.GetAddressZeroPageY());
        break;
      case 0x8f:
        this.SAX(this.GetAddressAbsolute());
        break;
      case 0x83:
        this.SAX(this.GetAddressIndirectX());
        break;
      case 0xcb:
        this.SBX(this.GetAddressImmediate());
        break;
      case 0x9f:
        this.SHA(this.GetAddressAbsoluteY());
        break;
      case 0x93:
        this.SHA(this.GetAddressIndirectY());
        break;
      case 0x9b:
        this.SHS(this.GetAddressAbsoluteY());
        break;
      case 0x9e:
        this.SHX(this.GetAddressAbsoluteY());
        break;
      case 0x9c:
        this.SHY(this.GetAddressAbsoluteX());
        break;
      case 0x07:
        this.SLO(this.GetAddressZeroPage());
        break;
      case 0x17:
        this.SLO(this.GetAddressZeroPageX());
        break;
      case 0x0f:
        this.SLO(this.GetAddressAbsolute());
        break;
      case 0x1f:
        this.SLO(this.GetAddressAbsoluteX());
        break;
      case 0x1b:
        this.SLO(this.GetAddressAbsoluteY());
        break;
      case 0x03:
        this.SLO(this.GetAddressIndirectX());
        break;
      case 0x13:
        this.SLO(this.GetAddressIndirectY());
        break;
      case 0x47:
        this.SRE(this.GetAddressZeroPage());
        break;
      case 0x57:
        this.SRE(this.GetAddressZeroPageX());
        break;
      case 0x4f:
        this.SRE(this.GetAddressAbsolute());
        break;
      case 0x5f:
        this.SRE(this.GetAddressAbsoluteX());
        break;
      case 0x5b:
        this.SRE(this.GetAddressAbsoluteY());
        break;
      case 0x43:
        this.SRE(this.GetAddressIndirectX());
        break;
      case 0x53:
        this.SRE(this.GetAddressIndirectY());
        break;
      case 0xeb:
        this.SBC(this.GetAddressImmediate());
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
  SetNegativeFlag() {
    this.P |= this.REG_P_NEGATIVE;
  }
  ClearNegativeFlag() {
    this.P &= ~this.REG_P_NEGATIVE;
  }
  SetOverflowFlag() {
    this.P |= this.REG_P_OVERFLOW;
  }
  ClearOverflowFlag() {
    this.P &= ~this.REG_P_OVERFLOW;
  }
  SetBreakFlag() {
    this.P |= this.REG_P_BREAK;
  }
  ClearBreakFlag() {
    this.P &= ~this.REG_P_BREAK;
  }
  SetDecimalModeFlag() {
    this.P |= this.REG_P_DECIMAL;
  }
  ClearDecimalModeFlag() {
    this.P &= ~this.REG_P_DECIMAL;
  }
  SetInterruptFlag() {
    this.P |= this.REG_P_INTERRUPT;
  }
  ClearInterruptFlag() {
    this.P &= ~this.REG_P_INTERRUPT;
  }
  SetZeroFlag() {
    this.P |= this.REG_P_INTERRUPT;
  }
  ClearZeroFlag() {
    this.P &= ~this.REG_P_INTERRUPT;
  }
  SetCarryFlag() {
    this.P |= this.REG_P_CARRY;
  }
  ClearCarryFlag() {
    this.P &= ~this.REG_P_CARRY;
  }
  NMI() {
    this.CPUClock += 7;
    this.Push((this.PC >> 8) & 0xff);
    this.Push(this.PC & 0xff);
    this.Push((this.P & 0xef) | 0x20);
    this.P = (this.P | 0x04) & 0xef;
    this.PC = this.mem.Get16(this.IRQ_NMI_ADDR);
  }
  IRQ() {
    this.CPUClock += 7;
    this.Push((this.PC >> 8) & 0xff);
    this.Push(this.PC & 0xff);
    this.Push((this.P & 0xef) | 0x20);
    this.P = (this.P | 0x04) & 0xef;
    this.PC = this.mem.Get16(this.IRQ_BRK_ADDR);
  }
  BRK() {
    this.PC++;
    this.Push(this.PC >> 8);
    this.Push(this.PC & 0xff);
    this.Push(this.P | 0x30);
    this.P |= 0x14;
    this.PC = this.mem.Get16(this.IRQ_BRK_ADDR);
  }
  GetAddressZeroPage() {
    return this.mem.Get(this.PC++);
  }
  GetAddressImmediate() {
    return this.PC++;
  }
  GetAddressAbsolute() {
    var address = this.mem.Get16(this.PC);
    this.PC += 2;
    return address;
  }
  GetAddressZeroPageX() {
    return (this.GetAddressZeroPage() + this.X) & 0xff;
  }
  GetAddressZeroPageY() {
    return (this.GetAddressZeroPage() + this.Y) & 0xff;
  }
  GetAddressIndirectX() {
    var tmp = (this.GetAddressZeroPage() + this.X) & 0xff;
    return this.mem.Get(tmp) | (this.mem.Get((tmp + 1) & 0xff) << 8);
  }
  GetAddressIndirectY() {
    var tmp = this.GetAddressZeroPage();
    tmp = this.mem.Get(tmp) | (this.mem.Get((tmp + 1) & 0xff) << 8);
    var address = tmp + this.Y;
    if (((address ^ tmp) & 0x100) > 0) {
      this.CPUClock += 1;
    }
    return address;
  }
  GetAddressAbsoluteX() {
    var tmp = this.GetAddressAbsolute();
    var address = tmp + this.X;
    if (((address ^ tmp) & 0x100) > 0) {
      this.CPUClock += 1;
    }
    return address;
  }
  GetAddressAbsoluteY() {
    var tmp = this.GetAddressAbsolute();
    var address = tmp + this.Y;
    if (((address ^ tmp) & 0x100) > 0) {
      this.CPUClock += 1;
    }
    return address;
  }
  Push(data) {
    this.mem.ram[0x100 + this.S] = data;
    this.S = (this.S - 1) & 0xff;
  }
  Pop() {
    this.S = (this.S + 1) & 0xff;
    return this.mem.ram[0x100 + this.S];
  }
  LDA(address) {
    this.A = this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  LDX(address) {
    this.X = this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
  }
  LDY(address) {
    this.Y = this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.Y];
  }
  STA(address) {
    this.mem.Set(address, this.A);
  }
  STX(address) {
    this.mem.Set(address, this.X);
  }
  STY(address) {
    this.mem.Set(address, this.Y);
  }
  TXA() {
    this.A = this.X;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  TYA() {
    this.A = this.Y;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  TXS() {
    this.S = this.X;
  }
  TAY() {
    this.Y = this.A;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  TAX() {
    this.X = this.A;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  TSX() {
    this.X = this.S;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
  }
  PHP() {
    this.Push(this.P | 0x30);
  }
  PLP() {
    this.P = this.Pop();
  }
  PHA() {
    this.Push(this.A);
  }
  PLA() {
    this.A = this.Pop();
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  Adder(data) {
    var carry_flag = this.P & 0x01;
    var tmp = this.A + data + carry_flag;
    this.P = this.P & 0x3c;
    this.P |= (~(this.A ^ data) & (this.A ^ tmp) & 0x80) >>> 1;
    this.P |= tmp >>> 8;
    this.P |= this.ZNCacheTable[tmp & 0xff];
    this.A = tmp & 0xff;
  }
  ADC(address) {
    this.Adder(this.mem.Get(address));
  }
  SBC(address) {
    this.Adder(~this.mem.Get(address) & 0xff);
  }
  CMP(address) {
    this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.A - this.mem.Get(address)) & 0x1ff];
  }
  CPX(address) {
    this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.X - this.mem.Get(address)) & 0x1ff];
  }
  CPY(address) {
    this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.Y - this.mem.Get(address)) & 0x1ff];
  }
  AND(address) {
    this.A &= this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  EOR(address) {
    this.A ^= this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  ORA(address) {
    this.A |= this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  BIT(address) {
    var x = this.mem.Get(address);
    this.P = (this.P & 0x3d) | (this.ZNCacheTable[x & this.A] & 0x02) | (x & 0xc0);
  }
  ASL_Sub(data) {
    this.P = (this.P & 0xfe) | (data >> 7);
    data = (data << 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[data];
    return data;
  }
  ASL(address) {
    this.mem.Set(address, this.ASL_Sub(this.mem.Get(address)));
  }
  LSR_Sub(data) {
    this.P = (this.P & 0x7c) | (data & 0x01);
    data >>= 1;
    this.P |= this.ZNCacheTable[data];
    return data;
  }
  LSR(address) {
    this.mem.Set(address, this.LSR_Sub(this.mem.Get(address)));
  }
  ROL_Sub(data) {
    var carry = data >> 7;
    data = ((data << 1) & 0xff) | (this.P & 0x01);
    this.P = (this.P & 0x7c) | carry | this.ZNCacheTable[data];
    return data;
  }
  ROL(address) {
    this.mem.Set(address, this.ROL_Sub(this.mem.Get(address)));
  }
  ROR_Sub(data) {
    var carry = data & 0x01;
    data = (data >> 1) | ((this.P & 0x01) << 7);
    this.P = (this.P & 0x7c) | carry | this.ZNCacheTable[data];
    return data;
  }
  ROR(address) {
    this.mem.Set(address, this.ROR_Sub(this.mem.Get(address)));
  }
  INC(address) {
    var data = (this.mem.Get(address) + 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[data];
    this.mem.Set(address, data);
  }
  DEC(address) {
    var data = (this.mem.Get(address) - 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[data];
    this.mem.Set(address, data);
  }
  INX() {
    this.X = (this.X + 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
  }
  INY() {
    this.Y = (this.Y + 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.Y];
  }
  DEX() {
    this.X = (this.X - 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
  }
  DEY() {
    this.Y = (this.Y - 1) & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.Y];
  }
  NOP() {}
  CLC() {
    this.P &= 0xfe;
  }
  CLV() {
    this.P &= 0xbf;
  }
  CLD() {
    this.P &= 0xf7;
  }
  SEC() {
    this.P |= 0x01;
  }
  SEI() {
    this.P |= 0x04;
  }
  SED() {
    this.P |= 0x08;
  }
  JMP(address) {
    this.PC = address;
  }
  JSR() {
    var PC = (this.PC + 1) & 0xffff;
    this.Push(PC >> 8);
    this.Push(PC & 0xff);
    this.JMP(this.GetAddressAbsolute());
  }
  RTS() {
    this.PC = (this.Pop() | (this.Pop() << 8)) + 1;
  }
  RTI() {
    this.P = this.Pop();
    this.PC = this.Pop() | (this.Pop() << 8);
  }
  BCC() {
    this.Branch((this.P & 0x01) === 0);
  }
  BCS() {
    this.Branch((this.P & 0x01) !== 0);
  }
  BPL() {
    this.Branch((this.P & 0x80) === 0);
  }
  BMI() {
    this.Branch((this.P & 0x80) !== 0);
  }
  BVC() {
    this.Branch((this.P & 0x40) === 0);
  }
  BVS() {
    this.Branch((this.P & 0x40) !== 0);
  }
  BNE() {
    this.Branch((this.P & 0x02) === 0);
  }
  BEQ() {
    this.Branch((this.P & 0x02) !== 0);
  }
  Branch(state) {
    if (!state) {
      this.PC++;
      return;
    }
    var displace = this.mem.Get(this.PC);
    var tmp = this.PC + 1;
    this.PC = (tmp + (displace >= 128 ? displace - 256 : displace)) & 0xffff;
    this.CPUClock += ((tmp ^ this.PC) & 0x100) > 0 ? 2 : 1;
  }
  ANC(address) {
    this.A &= this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    this.P = (this.P & 0xfe) | (this.A >>> 7);
  }
  ANE(address) {
    this.A = (this.A | 0xee) & this.X & this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  ARR(address) {
    this.A &= this.mem.Get(address);
    this.A = (this.A >> 1) | ((this.P & 0x01) << 7);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    this.P = (this.P & 0xfe) | ((this.A & 0x40) >> 6);
    var tmp = (this.A ^ (this.A << 1)) & 0x40;
    this.P = (this.P & 0xbf) | tmp;
  }
  ASR(address) {
    this.A &= this.mem.Get(address);
    this.P = (this.P & 0xfe) | (this.A & 0x01);
    this.A = this.A >> 1;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  DCP(address) {
    var tmp = (this.mem.Get(address) - 1) & 0xff;
    this.P = (this.P & 0x7c) | this.ZNCacheTableCMP[(this.A - tmp) & 0x1ff];
    this.mem.Set(address, tmp);
  }
  ISB(address) {
    var tmp = (this.mem.Get(address) + 1) & 0xff;
    this.Adder(~tmp & 0xff);
    this.mem.Set(address, tmp);
  }
  LAS(address) {
    var tmp = this.mem.Get(address) & this.S;
    this.A = this.X = this.S = tmp;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  LAX(address) {
    this.A = this.X = this.mem.Get(address);
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  LXA(address) {
    var tmp = (this.A | 0xee) & this.mem.Get(address);
    this.A = this.X = tmp;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
  }
  RLA(address) {
    var tmp = this.mem.Get(address);
    tmp = (tmp << 1) | (this.P & 0x01);
    this.P = (this.P & 0xfe) | (tmp >> 8);
    this.A &= tmp;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    this.mem.Set(address, tmp);
  }
  RRA(address) {
    var tmp = this.mem.Get(address);
    var c = tmp & 0x01;
    tmp = (tmp >> 1) | ((this.P & 0x01) << 7);
    this.P = (this.P & 0xfe) | c;
    this.Adder(tmp);
    this.mem.Set(address, tmp);
  }
  SAX(address) {
    var tmp = this.A & this.X;
    this.mem.Set(address, tmp);
  }
  SBX(address) {
    var tmp = (this.A & this.X) - this.mem.Get(address);
    this.P = (this.P & 0xfe) | ((~tmp >> 8) & 0x01);
    this.X = tmp & 0xff;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.X];
  }
  SHA(address) {
    var tmp = this.A & this.X & ((address >> 8) + 1);
    this.mem.Set(address, tmp);
  }
  SHS(address) {
    this.S = this.A & this.X;
    var tmp = this.S & ((address >> 8) + 1);
    this.mem.Set(address, tmp);
  }
  SHX(address) {
    var tmp = this.X & ((address >> 8) + 1);
    this.mem.Set(address, tmp);
  }
  SHY(address) {
    var tmp = this.Y & ((address >> 8) + 1);
    this.mem.Set(address, tmp);
  }
  SLO(address) {
    var tmp = this.mem.Get(address);
    this.P = (this.P & 0xfe) | (tmp >> 7);
    tmp = (tmp << 1) & 0xff;
    this.A |= tmp;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    this.mem.Set(address, tmp);
  }
  SRE(address) {
    var tmp = this.mem.Get(address);
    this.P = (this.P & 0xfe) | (tmp & 0x01);
    tmp >>= 1;
    this.A ^= tmp;
    this.P = (this.P & 0x7d) | this.ZNCacheTable[this.A];
    this.mem.Set(address, tmp);
  }
  CLC() {
    this.P &= 0xfb;
  }
}
