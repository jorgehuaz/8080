// Un unico Bus compartido: tanto la CPU como el FPU leen/escriben la misma memoria a traves de el.
const bus = new Bus();
const cpu = new Intel8080(bus);
const fpu = new FPU8080(bus);
cpu.fpu = fpu; // la CPU delega en el FPU las instrucciones con prefijo 0xED
const assembler = new Assembler8080();

let runInterval = null;
let memoryStart = 0;
const executionLog = [];
const MAX_LOG_LINES = 300;

const DEMOS = {
    io_out:
`; Demo E/S: suma A+B y la envia por el puerto 1 (salida)
MVI A, 05H
MVI B, 03H
ADD B
OUT 01H
HLT`,
    io_in:
`; Demo E/S: lee el valor del puerto 0 (ver panel de E/S) y lo guarda en memoria
IN 00H
STA 3000H
OUT 01H
HLT`,
    fpu_add:
`; Escenario FPU 1/4 - SUMA: 2.5 + 1.25 con el coprocesador
ORG 3000H
DF 2.5
DF 1.25
ORG 0000H
FLD F0, 3000H
FLD F1, 3004H
FADD F0, F1
FST F0, 3008H
HLT`,
    fpu_sub:
`; Escenario FPU 2/4 - RESTA: 5.0 - 1.5 con el coprocesador
ORG 3000H
DF 5.0
DF 1.5
ORG 0000H
FLD F0, 3000H
FLD F1, 3004H
FSUB F0, F1
FST F0, 3008H
HLT`,
    fpu_mul:
`; Escenario FPU 3/4 - MULTIPLICACION: 4.0 * 2.0 con el coprocesador
ORG 3000H
DF 4.0
DF 2.0
ORG 0000H
FLD F0, 3000H
FLD F1, 3004H
FMUL F0, F1
FST F0, 3008H
HLT`,
    fpu_div:
`; Escenario FPU 4/4 - DIVISION: 4.0 / 2.0 con el coprocesador
ORG 3000H
DF 4.0
DF 2.0
ORG 0000H
FLD F0, 3000H
FLD F1, 3004H
FDIV F0, F1
FST F0, 3008H
HLT`
};

function pushLog(text, cls) {
    executionLog.push({ text, cls });
    if (executionLog.length > MAX_LOG_LINES) executionLog.shift();
}

cpu.onOutput = (port, val) => {
    const display = document.getElementById('io-output-display');
    if (display) display.textContent = `puerto ${port} = ${val.toString(16).toUpperCase().padStart(2, '0')}H (${val})`;
    pushLog(`OUT ${port.toString(16).toUpperCase()}H: A=${val.toString(16).toUpperCase().padStart(2, '0')}H sale por el bus de E/S`, 'trace-io');
};

cpu.onInput = (port) => {
    const el = document.getElementById('io-input-value');
    const v = el ? (parseInt(el.value, 16) || 0) : 0;
    pushLog(`IN ${port.toString(16).toUpperCase()}H: el bus de E/S entrega ${v.toString(16).toUpperCase().padStart(2, '0')}H -> A`, 'trace-io');
    return v;
};

function updateUI() {
    // Registers
    document.getElementById('reg-a').textContent = cpu.registers.a.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-b').textContent = cpu.registers.b.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-c').textContent = cpu.registers.c.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-d').textContent = cpu.registers.d.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-e').textContent = cpu.registers.e.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-h').textContent = cpu.registers.h.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-l').textContent = cpu.registers.l.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-pc').textContent = cpu.registers.pc.toString(16).toUpperCase().padStart(4, '0');
    document.getElementById('reg-sp').textContent = cpu.registers.sp.toString(16).toUpperCase().padStart(4, '0');
    document.getElementById('reg-f').textContent = cpu.getFlagByte().toString(16).toUpperCase().padStart(2, '0');

    // Flags
    document.getElementById('flag-s').textContent = cpu.flags.s ? '1' : '0';
    document.getElementById('flag-z').textContent = cpu.flags.z ? '1' : '0';
    document.getElementById('flag-ac').textContent = cpu.flags.ac ? '1' : '0';
    document.getElementById('flag-p').textContent = cpu.flags.p ? '1' : '0';
    document.getElementById('flag-cy').textContent = cpu.flags.cy ? '1' : '0';

    document.getElementById('status-badge').textContent = cpu.halted ? 'Halted' : (runInterval ? 'Running' : 'Idle');
    document.getElementById('status-badge').style.backgroundColor = cpu.halted ? '#fee2e2' : (runInterval ? '#f0fdf4' : '#e2e8f0');

    renderMemory();
    renderStack();
    renderFPU();
    renderTrace();
}

function renderFPU() {
    for (let i = 0; i < 4; i++) {
        const d = fpu.decompose(fpu.regs[i]);
        const valEl = document.getElementById(`fpu-f${i}-val`);
        const bitsEl = document.getElementById(`fpu-f${i}-bits`);
        if (valEl) valEl.textContent = fpu.regs[i];
        if (bitsEl) bitsEl.textContent = `S:${d.sign} E:${d.exponent}(${d.exponentUnbiased >= 0 ? '+' : ''}${d.exponentUnbiased}) M:${d.mantissa}`;
    }
}

function renderTrace() {
    const el = document.getElementById('trace-log');
    if (!el) return;
    el.innerHTML = '';
    executionLog.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'trace-line' + (entry.cls ? ' ' + entry.cls : '');
        div.textContent = entry.text;
        el.appendChild(div);
    });
    el.scrollTop = el.scrollHeight;
}

// Ejecuta un paso de CPU pero primero desensambla la instruccion actual (sin mutar estado)
// para poder narrar "que va a pasar", y despues drena fpu.trace para narrar el detalle
// interno de la operacion flotante (lectura de bus, calculo IEEE754, resultado).
function stepAndTrace() {
    if (cpu.halted) return;
    const pc = cpu.registers.pc;
    const info = disassemble(cpu, pc);
    pushLog(`[${pc.toString(16).toUpperCase().padStart(4, '0')}H] ${info.text}`);
    cpu.step(); // los callbacks onOutput/onInput y fpu.log() escriben en el log durante este paso
    while (fpu.trace.length) {
        pushLog(fpu.trace.shift(), 'trace-fpu');
    }
}

function renderStack() {
    const table = document.getElementById('stack-table');
    if (!table) return;
    table.innerHTML = '';

    const currentSP = cpu.registers.sp;

    // Show 5 slots (2-byte aligned) from SP - 4 to SP + 6
    for (let offset = 6; offset >= -4; offset -= 2) {
        const addr = (currentSP + offset) & 0xFFFF;

        const row = document.createElement('div');
        row.className = 'stack-row';
        if (offset === 0) {
            row.classList.add('active');
        }

        const addrSpan = document.createElement('span');
        addrSpan.className = 'stack-addr';
        addrSpan.textContent = (offset === 0 ? 'SP ➔ ' : '     ') + addr.toString(16).toUpperCase().padStart(4, '0') + ':';

        const low = cpu.readMemory(addr);
        const high = cpu.readMemory((addr + 1) & 0xFFFF);
        const val16 = (high << 8) | low;

        const valSpan = document.createElement('span');
        valSpan.className = 'stack-val';
        valSpan.textContent = val16.toString(16).toUpperCase().padStart(4, '0') + 'H (' + high.toString(16).toUpperCase().padStart(2, '0') + ' ' + low.toString(16).toUpperCase().padStart(2, '0') + ')';

        row.appendChild(addrSpan);
        row.appendChild(valSpan);
        table.appendChild(row);
    }
}

function renderMemory() {
    const table = document.getElementById('memory-table');
    table.innerHTML = '';

    // Header
    const empty = document.createElement('div');
    empty.className = 'mem-cell mem-header';
    empty.textContent = '';
    table.appendChild(empty);

    for (let i = 0; i < 16; i++) {
        const h = document.createElement('div');
        h.className = 'mem-cell mem-header';
        h.textContent = i.toString(16).toUpperCase();
        table.appendChild(h);
    }

    // Rows
    for (let row = 0; row < 8; row++) {
        const addr = (memoryStart + row * 16) & 0xFFFF;
        const h = document.createElement('div');
        h.className = 'mem-cell mem-addr';
        h.textContent = addr.toString(16).toUpperCase().padStart(4, '0');
        table.appendChild(h);

        for (let col = 0; col < 16; col++) {
            const cellAddr = (addr + col) & 0xFFFF;
            const c = document.createElement('div');
            c.className = 'mem-cell';
            if (cellAddr === cpu.registers.pc) c.style.backgroundColor = '#fde047';
            c.textContent = cpu.readMemory(cellAddr).toString(16).toUpperCase().padStart(2, '0');
            table.appendChild(c);
        }
    }
}

document.getElementById('btn-assemble').addEventListener('click', () => {
    const source = document.getElementById('code-editor').value;
    const output = document.getElementById('assembler-output');
    try {
        const result = assembler.assemble(source);
        bus.memory.set(result.binary);
        output.textContent = 'Assembly successful! Loaded into memory.';
        output.className = 'success';
        updateUI();
    } catch (e) {
        output.textContent = 'Error: ' + e.message;
        output.className = 'error';
    }
});

document.getElementById('btn-clear-code').addEventListener('click', () => {
    document.getElementById('code-editor').value = '';
    const output = document.getElementById('assembler-output');
    if (output) {
        output.textContent = '';
        output.className = '';
    }
});

document.getElementById('btn-step').addEventListener('click', () => {
    stepAndTrace();
    updateUI();
});

document.getElementById('btn-run').addEventListener('click', () => {
    if (runInterval) return;
    runInterval = setInterval(() => {
        if (cpu.halted) {
            clearInterval(runInterval);
            runInterval = null;
            updateUI();
            return;
        }
        for (let i = 0; i < 100; i++) { // Execute in bursts
            stepAndTrace();
            if (cpu.halted) break;
        }
        updateUI();
    }, 10);
    updateUI();
});

document.getElementById('btn-stop').addEventListener('click', () => {
    if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
        updateUI();
    }
});

document.getElementById('btn-reset').addEventListener('click', () => {
    if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
    }
    cpu.reset();
    fpu.reset();
    executionLog.length = 0;
    const ioDisplay = document.getElementById('io-output-display');
    if (ioDisplay) ioDisplay.textContent = '—';

    // Clear assembler output
    const output = document.getElementById('assembler-output');
    if (output) {
        output.textContent = '';
        output.className = '';
    }

    // Reset memory start address and variable
    const memStartInput = document.getElementById('mem-start-addr');
    if (memStartInput) {
        memStartInput.value = '0000';
    }
    memoryStart = 0;

    updateUI();
});

document.getElementById('btn-mem-go').addEventListener('click', () => {
    const val = document.getElementById('mem-start-addr').value;
    memoryStart = parseInt(val, 16) || 0;
    renderMemory();
});

document.getElementById('demo-select').addEventListener('change', (e) => {
    const key = e.target.value;
    if (DEMOS[key]) {
        document.getElementById('code-editor').value = DEMOS[key];
    }
});

// Initial UI update
updateUI();
