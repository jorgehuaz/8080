class Assembler8080 {
    constructor() {
        this.opcodes = {
            'NOP': { code: 0x00, bytes: 1 },
            'LXI': { bytes: 3 },
            'STAX': { bytes: 1 },
            'INX': { bytes: 1 },
            'INR': { bytes: 1 },
            'DCR': { bytes: 1 },
            'MVI': { bytes: 2 },
            'RLC': { code: 0x07, bytes: 1 },
            'DAD': { bytes: 1 },
            'LDAX': { bytes: 1 },
            'DCX': { bytes: 1 },
            'RRC': { code: 0x0F, bytes: 1 },
            'RAL': { code: 0x17, bytes: 1 },
            'RAR': { code: 0x1F, bytes: 1 },
            'SHLD': { code: 0x22, bytes: 3 },
            'DAA': { code: 0x27, bytes: 1 },
            'LHLD': { code: 0x2A, bytes: 3 },
            'CMA': { code: 0x2F, bytes: 1 },
            'STA': { code: 0x32, bytes: 3 },
            'STC': { code: 0x37, bytes: 1 },
            'LDA': { code: 0x3A, bytes: 3 },
            'CMC': { code: 0x3F, bytes: 1 },
            'MOV': { bytes: 1 },
            'HLT': { code: 0x76, bytes: 1 },
            'ADD': { bytes: 1 },
            'ADC': { bytes: 1 },
            'SUB': { bytes: 1 },
            'SBB': { bytes: 1 },
            'ANA': { bytes: 1 },
            'XRA': { bytes: 1 },
            'ORA': { bytes: 1 },
            'CMP': { bytes: 1 },
            'RNZ': { code: 0xC0, bytes: 1 },
            'POP': { bytes: 1 },
            'JNZ': { code: 0xC2, bytes: 3 },
            'JMP': { code: 0xC3, bytes: 3 },
            'CNZ': { code: 0xC4, bytes: 3 },
            'PUSH': { bytes: 1 },
            'ADI': { code: 0xC6, bytes: 2 },
            'RZ': { code: 0xC8, bytes: 1 },
            'RET': { code: 0xC9, bytes: 1 },
            'JZ': { code: 0xCA, bytes: 3 },
            'CZ': { code: 0xCC, bytes: 3 },
            'CALL': { code: 0xCD, bytes: 3 },
            'ACI': { code: 0xCE, bytes: 2 },
            'RNC': { code: 0xD0, bytes: 1 },
            'JNC': { code: 0xD2, bytes: 3 },
            'OUT': { code: 0xD3, bytes: 2 },
            'CNC': { code: 0xD4, bytes: 3 },
            'SUI': { code: 0xD6, bytes: 2 },
            'RC': { code: 0xD8, bytes: 1 },
            'JC': { code: 0xDA, bytes: 3 },
            'IN': { code: 0xDB, bytes: 2 },
            'CC': { code: 0xDC, bytes: 3 },
            'SBI': { code: 0xDE, bytes: 2 },
            'RPO': { code: 0xE0, bytes: 1 },
            'JPO': { code: 0xE2, bytes: 3 },
            'XTHL': { code: 0xE3, bytes: 1 },
            'CPO': { code: 0xE4, bytes: 3 },
            'ANI': { code: 0xE6, bytes: 2 },
            'RPE': { code: 0xE8, bytes: 1 },
            'PCHL': { code: 0xE9, bytes: 1 },
            'JPE': { code: 0xEA, bytes: 3 },
            'XCHG': { code: 0xEB, bytes: 1 },
            'CPE': { code: 0xEC, bytes: 3 },
            'XRI': { code: 0xEE, bytes: 2 },
            'RP': { code: 0xF0, bytes: 1 },
            'JP': { code: 0xF2, bytes: 3 },
            'DI': { code: 0xF3, bytes: 1 },
            'CP': { code: 0xF4, bytes: 3 },
            'ORI': { code: 0xF6, bytes: 2 },
            'RM': { code: 0xF8, bytes: 1 },
            'SPHL': { code: 0xF9, bytes: 1 },
            'JM': { code: 0xFA, bytes: 3 },
            'EI': { code: 0xFB, bytes: 1 },
            'CM': { code: 0xFC, bytes: 3 },
            'CPI': { code: 0xFE, bytes: 2 },
            'RST': { bytes: 1 },
            // Coprocesador FPU: todas usan el prefijo de escape 0xED (ver cpu.js/fpu.js).
            // FLD/FST cargan/guardan un registro flotante desde/hacia una direccion de memoria
            // (4 bytes = 0xED, subop, addrLo, addrHi). Las aritmeticas son de 2 bytes.
            'FLD': { bytes: 4 },
            'FST': { bytes: 4 },
            'FADD': { bytes: 2 },
            'FSUB': { bytes: 2 },
            'FMUL': { bytes: 2 },
            'FDIV': { bytes: 2 },
        };
        this.regs = { 'B': 0, 'C': 1, 'D': 2, 'E': 3, 'H': 4, 'L': 5, 'M': 6, 'A': 7 };
        this.rps = { 'B': 0, 'C': 0, 'D': 1, 'E': 1, 'H': 2, 'L': 2, 'SP': 3, 'PSW': 3, 'BC': 0, 'DE': 1, 'HL': 2 };
        this.fregs = { 'F0': 0, 'F1': 1, 'F2': 2, 'F3': 3 };
    }

    assemble(source) {
        const lines = source.split('\n');
        const labels = {};
        let currentPC = 0;

        // First pass: Resolve labels
        const passes = lines.map(line => {
            line = line.split(';')[0].trim();
            if (!line) return null;

            let label = null;
            if (line.includes(':')) {
                const parts = line.split(':');
                label = parts[0].trim();
                line = parts[1].trim();
                if (label) labels[label] = currentPC;
            }
            if (!line) return null;

            const tokens = line.split(/[\s,]+/).filter(t => t);
            const mnemonic = tokens[0].toUpperCase();

            if (mnemonic === 'ORG') {
                currentPC = this.parseValue(tokens[1]);
                if (label) labels[label] = currentPC;
                return { type: 'directive', mnemonic, tokens, pc: currentPC };
            }
            if (mnemonic === 'DB') {
                const pc = currentPC;
                currentPC += tokens.length - 1;
                return { type: 'data', mnemonic, tokens, pc };
            }
            if (mnemonic === 'DF') { // Define Float: cada valor ocupa 4 bytes (IEEE 754 simple)
                const pc = currentPC;
                currentPC += (tokens.length - 1) * 4;
                return { type: 'data-float', mnemonic, tokens, pc };
            }

            const info = this.opcodes[mnemonic];
            if (!info) throw new Error(`Unknown mnemonic: ${mnemonic}`);
            const pc = currentPC;
            currentPC += info.bytes;
            return { type: 'instruction', mnemonic, tokens, pc, info };
        }).filter(l => l);

        // Second pass: Generate code
        const binary = new Uint8Array(65536);
        let maxAddr = 0;

        passes.forEach(line => {
            if (line.type === 'directive') return;
            let pc = line.pc;
            if (line.type === 'data') {
                for (let i = 1; i < line.tokens.length; i++) {
                    binary[pc++] = this.parseValue(line.tokens[i], labels);
                }
            } else if (line.type === 'data-float') {
                for (let i = 1; i < line.tokens.length; i++) {
                    const val = parseFloat(line.tokens[i]);
                    if (isNaN(val)) throw new Error(`Valor flotante invalido: ${line.tokens[i]}`);
                    const buf = new ArrayBuffer(4);
                    const dv = new DataView(buf);
                    dv.setFloat32(0, val, false);
                    binary[pc++] = dv.getUint8(0);
                    binary[pc++] = dv.getUint8(1);
                    binary[pc++] = dv.getUint8(2);
                    binary[pc++] = dv.getUint8(3);
                }
            } else {
                const code = this.generateOpcode(line, labels);
                for (let i = 0; i < code.bytes.length; i++) {
                    binary[pc++] = code.bytes[i] & 0xFF;
                }
            }
            if (pc > maxAddr) maxAddr = pc;
        });

        return { binary, maxAddr };
    }

    generateOpcode(line, labels) {
        const mnemonic = line.mnemonic;
        const tokens = line.tokens;
        let byte1 = line.info.code;
        let byte2 = 0, byte3 = 0;

        const r1 = tokens[1] ? tokens[1].toUpperCase() : null;
        const r2 = tokens[2] ? tokens[2].toUpperCase() : null;

        if (mnemonic === 'MOV') {
            if (this.regs[r1] === undefined) throw new Error(`Invalid register: ${r1} in MOV instruction`);
            if (this.regs[r2] === undefined) throw new Error(`Invalid register: ${r2} in MOV instruction`);
            if (r1 === 'M' && r2 === 'M') throw new Error(`Cannot use MOV M, M (invalid instruction)`);
            byte1 = 0x40 | (this.regs[r1] << 3) | this.regs[r2];
        } else if (mnemonic === 'MVI') {
            if (this.regs[r1] === undefined) throw new Error(`Invalid register: ${r1} in MVI instruction`);
            byte1 = 0x06 | (this.regs[r1] << 3);
            byte2 = this.parseValue(tokens[2], labels) & 0xFF;
        } else if (mnemonic === 'LXI') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in LXI instruction`);
            byte1 = 0x01 | (this.rps[r1] << 4);
            const val = this.parseValue(tokens[2], labels);
            byte2 = val & 0xFF;
            byte3 = (val >> 8) & 0xFF;
        } else if (['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP'].includes(mnemonic)) {
            if (this.regs[r1] === undefined) throw new Error(`Invalid register: ${r1} in ${mnemonic} instruction`);
            const base = { 'ADD': 0x80, 'ADC': 0x88, 'SUB': 0x90, 'SBB': 0x98, 'ANA': 0xA0, 'XRA': 0xA8, 'ORA': 0xB0, 'CMP': 0xB8 };
            byte1 = base[mnemonic] | this.regs[r1];
        } else if (mnemonic === 'INR') {
            if (this.regs[r1] === undefined) throw new Error(`Invalid register: ${r1} in INR instruction`);
            byte1 = 0x04 | (this.regs[r1] << 3);
        } else if (mnemonic === 'DCR') {
            if (this.regs[r1] === undefined) throw new Error(`Invalid register: ${r1} in DCR instruction`);
            byte1 = 0x05 | (this.regs[r1] << 3);
        } else if (mnemonic === 'INX') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in INX instruction`);
            byte1 = 0x03 | (this.rps[r1] << 4);
        } else if (mnemonic === 'DCX') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in DCX instruction`);
            byte1 = 0x0B | (this.rps[r1] << 4);
        } else if (mnemonic === 'DAD') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in DAD instruction`);
            byte1 = 0x09 | (this.rps[r1] << 4);
        } else if (mnemonic === 'PUSH') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in PUSH instruction`);
            byte1 = 0xC5 | (this.rps[r1] << 4);
        } else if (mnemonic === 'POP') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in POP instruction`);
            byte1 = 0xC1 | (this.rps[r1] << 4);
        } else if (mnemonic === 'STAX') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in STAX instruction`);
            byte1 = 0x02 | (this.rps[r1] << 4);
        } else if (mnemonic === 'LDAX') {
            if (this.rps[r1] === undefined) throw new Error(`Invalid register pair: ${r1} in LDAX instruction`);
            byte1 = 0x0A | (this.rps[r1] << 4);
        } else if (mnemonic === 'RST') {
            const val = this.parseValue(tokens[1], labels);
            if (isNaN(val) || val < 0 || val > 7) {
                throw new Error(`Invalid RST number: ${tokens[1]}. Must be 0-7.`);
            }
            byte1 = 0xC7 | (val << 3);
        } else if (mnemonic === 'FLD' || mnemonic === 'FST') {
            const n = this.fregs[r1];
            if (n === undefined) throw new Error(`Invalid float register: ${r1} in ${mnemonic} instruction`);
            const addr = this.parseValue(tokens[2], labels);
            const subop = (mnemonic === 'FLD' ? 0x00 : 0x10) | n;
            return { bytes: [0xED, subop, addr & 0xFF, (addr >> 8) & 0xFF] };
        } else if (['FADD', 'FSUB', 'FMUL', 'FDIV'].includes(mnemonic)) {
            const d = this.fregs[r1];
            const s = this.fregs[r2];
            if (d === undefined) throw new Error(`Invalid float register: ${r1} in ${mnemonic} instruction`);
            if (s === undefined) throw new Error(`Invalid float register: ${r2} in ${mnemonic} instruction`);
            const base = { 'FADD': 0x20, 'FSUB': 0x30, 'FMUL': 0x40, 'FDIV': 0x50 };
            return { bytes: [0xED, base[mnemonic] | (d << 2) | s] };
        } else if (line.info.bytes === 3) { // JMP, CALL, etc.
            const val = this.parseValue(tokens[1], labels);
            byte2 = val & 0xFF;
            byte3 = (val >> 8) & 0xFF;
        } else if (line.info.bytes === 2) { // ADI, OUT, etc.
            byte2 = this.parseValue(tokens[1], labels) & 0xFF;
        }

        const bytes = [byte1];
        if (line.info.bytes > 1) bytes.push(byte2);
        if (line.info.bytes > 2) bytes.push(byte3);
        return { bytes };
    }

    parseValue(val, labels = {}) {
        if (!val) return 0;
        if (labels[val] !== undefined) return labels[val];

        // If it starts with a letter and is not a hex constant, it might be an undefined label
        const isHexConstant = val.endsWith('H') || val.endsWith('h') || val.startsWith('0X') || val.startsWith('0x');

        let parsed;
        if (val.endsWith('H') || val.endsWith('h')) {
            parsed = parseInt(val.slice(0, -1), 16);
        } else if (val.startsWith('0X') || val.startsWith('0x')) {
            parsed = parseInt(val, 16);
        } else {
            parsed = parseInt(val, 10);
        }

        if (isNaN(parsed)) {
            // Check if it looks like a label (starts with letter)
            if (/^[A-Za-z_]/.test(val)) {
                throw new Error(`Undefined label: ${val}`);
            } else {
                throw new Error(`Invalid numeric value or token: ${val}`);
            }
        }
        return parsed;
    }
}

if (typeof module !== 'undefined') {
    module.exports = Assembler8080;
}
