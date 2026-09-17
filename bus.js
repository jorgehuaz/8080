class Bus {
    constructor(size = 65536) {
        this.memory = new Uint8Array(size);
    }

    read(addr) {
        return this.memory[addr & 0xFFFF];
    }

    write(addr, val) {
        this.memory[addr & 0xFFFF] = val & 0xFF;
    }

    reset() {
        this.memory.fill(0);
    }
}

if (typeof module !== 'undefined') {
    module.exports = Bus;
}
