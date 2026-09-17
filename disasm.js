// disasm.js - Desensamblador de solo lectura para la Traza de Ejecucion de la UI.
// No avanza PC ni modifica estado: solo interpreta bytes de memoria via cpu.readMemory,
// para poder mostrar "que va a hacer" la CPU antes de ejecutar el paso de verdad.
function disassemble(cpu, addr) {
    const b = (a) => cpu.readMemory(a & 0xFFFF);
    const hex = (v, w) => v.toString(16).toUpperCase().padStart(w, '0');
    const opcode = b(addr);
    const regNames = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A'];

    if (opcode === 0xED) {
        const subop = b(addr + 1);
        const group = subop & 0xF0;
        const low = subop & 0x0F;
        if (group === 0x00) {
            const a16 = b(addr + 2) | (b(addr + 3) << 8);
            return { text: `FLD F${low & 3}, ${hex(a16, 4)}H`, length: 4 };
        }
        if (group === 0x10) {
            const a16 = b(addr + 2) | (b(addr + 3) << 8);
            return { text: `FST F${low & 3}, ${hex(a16, 4)}H`, length: 4 };
        }
        const fpuNames = { 0x20: 'FADD', 0x30: 'FSUB', 0x40: 'FMUL', 0x50: 'FDIV' };
        if (fpuNames[group]) {
            const d = (low >> 2) & 3, s = low & 3;
            return { text: `${fpuNames[group]} F${d}, F${s}`, length: 2 };
        }
        return { text: `ED ${hex(subop, 2)}H (opcode FPU desconocido)`, length: 2 };
    }

    if (opcode >= 0x40 && opcode <= 0x7F && opcode !== 0x76) {
        return { text: `MOV ${regNames[(opcode >> 3) & 7]}, ${regNames[opcode & 7]}`, length: 1 };
    }
    if ((opcode & 0xC7) === 0x06) {
        return { text: `MVI ${regNames[(opcode >> 3) & 7]}, ${hex(b(addr + 1), 2)}H`, length: 2 };
    }
    if (opcode >= 0x80 && opcode <= 0xBF) {
        const names = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'];
        return { text: `${names[(opcode >> 3) & 7]} ${regNames[opcode & 7]}`, length: 1 };
    }
    if ((opcode & 0xC7) === 0xC6) {
        const names = ['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI'];
        return { text: `${names[(opcode >> 3) & 7]} ${hex(b(addr + 1), 2)}H`, length: 2 };
    }
    if ((opcode & 0xC7) === 0x04) return { text: `INR ${regNames[(opcode >> 3) & 7]}`, length: 1 };
    if ((opcode & 0xC7) === 0x05) return { text: `DCR ${regNames[(opcode >> 3) & 7]}`, length: 1 };

    const table = {
        0x00: ['NOP', 1], 0x76: ['HLT', 1],
        0x01: ['LXI BC,', 3], 0x11: ['LXI DE,', 3], 0x21: ['LXI HL,', 3], 0x31: ['LXI SP,', 3],
        0x3A: ['LDA', 3], 0x32: ['STA', 3], 0x2A: ['LHLD', 3], 0x22: ['SHLD', 3],
        0x0A: ['LDAX BC', 1], 0x1A: ['LDAX DE', 1], 0x02: ['STAX BC', 1], 0x12: ['STAX DE', 1],
        0xEB: ['XCHG', 1],
        0x03: ['INX BC', 1], 0x13: ['INX DE', 1], 0x23: ['INX HL', 1], 0x33: ['INX SP', 1],
        0x0B: ['DCX BC', 1], 0x1B: ['DCX DE', 1], 0x2B: ['DCX HL', 1], 0x3B: ['DCX SP', 1],
        0x09: ['DAD BC', 1], 0x19: ['DAD DE', 1], 0x29: ['DAD HL', 1], 0x39: ['DAD SP', 1],
        0xC3: ['JMP', 3], 0xC2: ['JNZ', 3], 0xCA: ['JZ', 3], 0xD2: ['JNC', 3], 0xDA: ['JC', 3],
        0xE2: ['JPO', 3], 0xEA: ['JPE', 3], 0xF2: ['JP', 3], 0xFA: ['JM', 3],
        0xCD: ['CALL', 3], 0xC4: ['CNZ', 3], 0xCC: ['CZ', 3], 0xD4: ['CNC', 3], 0xDC: ['CC', 3],
        0xE4: ['CPO', 3], 0xEC: ['CPE', 3], 0xF4: ['CP', 3], 0xFC: ['CM', 3],
        0xC9: ['RET', 1], 0xC0: ['RNZ', 1], 0xC8: ['RZ', 1], 0xD0: ['RNC', 1], 0xD8: ['RC', 1],
        0xE0: ['RPO', 1], 0xE8: ['RPE', 1], 0xF0: ['RP', 1], 0xF8: ['RM', 1],
        0xC5: ['PUSH BC', 1], 0xD5: ['PUSH DE', 1], 0xE5: ['PUSH HL', 1], 0xF5: ['PUSH PSW', 1],
        0xC1: ['POP BC', 1], 0xD1: ['POP DE', 1], 0xE1: ['POP HL', 1], 0xF1: ['POP PSW', 1],
        0xE3: ['XTHL', 1], 0xF9: ['SPHL', 1], 0xE9: ['PCHL', 1],
        0x07: ['RLC', 1], 0x0F: ['RRC', 1], 0x17: ['RAL', 1], 0x1F: ['RAR', 1],
        0x2F: ['CMA', 1], 0x27: ['DAA', 1], 0x37: ['STC', 1], 0x3F: ['CMC', 1],
        0xDB: ['IN', 2], 0xD3: ['OUT', 2], 0xFB: ['EI', 1], 0xF3: ['DI', 1]
    };

    if (table[opcode]) {
        const [name, len] = table[opcode];
        if (len === 3) return { text: `${name} ${hex(b(addr + 1) | (b(addr + 2) << 8), 4)}H`, length: 3 };
        if (len === 2) return { text: `${name} ${hex(b(addr + 1), 2)}H`, length: 2 };
        return { text: name, length: 1 };
    }

    return { text: `DB ${hex(opcode, 2)}H (?)`, length: 1 };
}

if (typeof module !== 'undefined') {
    module.exports = disassemble;
}
