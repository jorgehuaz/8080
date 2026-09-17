// FPU8080 - Coprocesador matematico de punto flotante (concepto historico: AMD 9511 / Intel 8087)
// Comparte memoria con la CPU a traves del mismo Bus (bus.js). No tiene memoria propia.
// Usa Float32Array para los registros: JS redondea automaticamente al formato IEEE 754
// de precision simple (32 bits) en cada asignacion, igual que lo haria el hardware real.
class FPU8080 {
    constructor(bus) {
        this.bus = bus;
        this.regs = new Float32Array(4); // F0, F1, F2, F3
        this.trace = [];
    }

    reset() {
        this.regs.fill(0);
        this.trace = [];
    }

    log(msg) {
        this.trace.push(msg);
    }

    // Descompone un float32 en signo / exponente / mantisa (IEEE 754) para fines didacticos
    decompose(value) {
        const buf = new ArrayBuffer(4);
        const dv = new DataView(buf);
        dv.setFloat32(0, value, false);
        const bits = dv.getUint32(0, false);
        const sign = (bits >>> 31) & 1;
        const exponent = (bits >>> 23) & 0xFF;
        const mantissa = bits & 0x7FFFFF;
        return {
            value,
            bits: bits.toString(2).padStart(32, '0'),
            hex: bits.toString(16).toUpperCase().padStart(8, '0'),
            sign,
            exponent,
            exponentUnbiased: exponent - 127,
            mantissa: mantissa.toString(2).padStart(23, '0')
        };
    }

    readFloatFromBus(addr) {
        const buf = new ArrayBuffer(4);
        const dv = new DataView(buf);
        dv.setUint8(0, this.bus.read(addr));
        dv.setUint8(1, this.bus.read(addr + 1));
        dv.setUint8(2, this.bus.read(addr + 2));
        dv.setUint8(3, this.bus.read(addr + 3));
        return dv.getFloat32(0, false);
    }

    writeFloatToBus(addr, value) {
        const buf = new ArrayBuffer(4);
        const dv = new DataView(buf);
        dv.setFloat32(0, value, false);
        this.bus.write(addr, dv.getUint8(0));
        this.bus.write(addr + 1, dv.getUint8(1));
        this.bus.write(addr + 2, dv.getUint8(2));
        this.bus.write(addr + 3, dv.getUint8(3));
    }

    // subop viene del byte que sigue al prefijo de escape 0xED en la ISA del 8080.
    // cpu es la CPU que disparo esta instruccion: se usa solo para seguir leyendo
    // bytes del flujo de codigo (fetch16), nunca para acceder a memoria directamente
    // (eso siempre pasa por this.bus, que es el mismo bus que usa la CPU).
    execute(subop, cpu) {
        const group = subop & 0xF0;
        const low = subop & 0x0F;

        if (group === 0x00) { // FLD Fn, addr
            const n = low & 0x03;
            const addr = cpu.fetch16();
            const val = this.readFloatFromBus(addr);
            this.regs[n] = val;
            this.log(`FLD F${n}, ${addr.toString(16).toUpperCase().padStart(4, '0')}H -> lee 4 bytes del bus (IEEE754) = ${val} -> F${n}`);
            return;
        }
        if (group === 0x10) { // FST Fn, addr
            const n = low & 0x03;
            const addr = cpu.fetch16();
            this.writeFloatToBus(addr, this.regs[n]);
            this.log(`FST F${n}, ${addr.toString(16).toUpperCase().padStart(4, '0')}H -> escribe F${n}=${this.regs[n]} (4 bytes IEEE754) en el bus`);
            return;
        }

        const d = (low >> 2) & 0x03;
        const s = low & 0x03;
        const a = this.regs[d];
        const b = this.regs[s];

        switch (group) {
            case 0x20:
                this.regs[d] = a + b;
                this.log(`FADD F${d}, F${s} -> F${d}(${a}) + F${s}(${b}) = ${this.regs[d]}`);
                return;
            case 0x30:
                this.regs[d] = a - b;
                this.log(`FSUB F${d}, F${s} -> F${d}(${a}) - F${s}(${b}) = ${this.regs[d]}`);
                return;
            case 0x40:
                this.regs[d] = a * b;
                this.log(`FMUL F${d}, F${s} -> F${d}(${a}) * F${s}(${b}) = ${this.regs[d]}`);
                return;
            case 0x50:
                this.regs[d] = b !== 0 ? a / b : NaN;
                this.log(`FDIV F${d}, F${s} -> F${d}(${a}) / F${s}(${b}) = ${this.regs[d]}`);
                return;
            default:
                this.log(`Opcode FPU desconocido: ED ${subop.toString(16).toUpperCase()}`);
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = FPU8080;
}
