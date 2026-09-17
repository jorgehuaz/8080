# Libro-Guía Didáctica: Programación en Bajo Nivel e Intel 8080

**Diseñado para estudiantes de lenguajes de alto nivel**

¡Bienvenido a la guía didáctica definitiva para dominar el funcionamiento interno de una computadora! Si ya sabes programar en lenguajes como Python, Java, JavaScript o C++, estás acostumbrado a pensar en términos de variables, objetos, condicionales `if-else`, bucles `for`/`while` y funciones.

En este manual, no asumimos que sepas nada sobre electrónica o lenguaje ensamblador (*Assembly*). En su lugar, utilizaremos tus conocimientos de alto nivel como un puente para entender cómo el procesador (CPU) traduce esas construcciones lógicas abstractas en instrucciones físicas reales.

---

## Índice

1. [Introducción: Del Alto Nivel al Bajo Nivel](#introducción-del-alto-nivel-al-bajo-nivel)
2. [Capítulo 1: Operando el Entorno de Simulación](#capítulo-1-operando-el-entorno-de-simulación)
3. [Capítulo 2: Primer Grupo - Aritmética Básica y Abstracciones](#capítulo-2-primer-grupo---aritmética-básica-y-abstracciones)
4. [Capítulo 3: Segundo Grupo - Estructuras de Control y Lógica de Bits](#capítulo-3-segundo-grupo---estructuras-de-control-y-lógica-de-bits)
5. [Capítulo 4: Tercer Grupo - Operando la Pila (Stack) y Funciones](#capítulo-4-tercer-grupo---operando-la-pila-stack-y-funciones)
6. [Capítulo 5: Desafío Avanzado - Operaciones de 16 Bits en un CPU de 8 Bits](#capítulo-5-desafío-avanzado---operaciones-de-16-bits-en-un-cpu-de-8-bits)
7. [Capítulo 6: El Coprocesador Matemático de Punto Flotante (FPU)](#capítulo-6-el-coprocesador-matemático-de-punto-flotante-fpu)

---

## Introducción: Del Alto Nivel al Bajo Nivel

Cuando escribes código de alto nivel, el compilador o intérprete oculta los detalles físicos del procesador. Aquí veremos cómo se corresponden exactamente tus conceptos diarios con el hardware:

| Concepto de Alto Nivel | Equivalente en Bajo Nivel | ¿Qué es y cómo funciona? |
| :--- | :--- | :--- |
| **Variables simples** (ej. `x = 5`) | **Registros** (`A`, `B`, `C`, etc.) o **Celdas de Memoria RAM** | Los registros son casillas de almacenamiento ultrarrápido dentro del propio CPU. Para variables de uso constante, usamos registros; para almacenar más datos, usamos direcciones de la memoria RAM. |
| **Condicionales** (`if / else`) | **Comparaciones (`CMP`) + Banderas (*Flags*) + Saltos Condicionales** | El CPU realiza una resta interna invisible. Si el resultado es cero, se activa la bandera de cero (`Z = 1`). Luego, una instrucción de salto como `JZ` (Salta si es Cero) redirige el flujo del programa. |
| **Bucles** (`while`, `for`) | **Decremento (`DCR`) + Salto si no es cero (`JNZ`)** | Se establece un registro como contador. En cada ciclo, se decrementa en 1 y se salta al inicio del ciclo mientras el contador no sea cero. |
| **Listas o Vectores** (ej. `array[3]`) | **Punteros de Memoria** (`HL`) | La pareja de registros `H` y `L` se unen para almacenar una dirección de memoria completa de 16 bits. Al acceder al registro virtual `M`, el CPU lee o escribe en la celda a la que apunta `HL`. |
| **Funciones / Métodos** | **Subrutinas (`CALL` / `RET`) + Pila (`Stack`)** | Al llamar a una función, el CPU guarda la dirección de retorno en la Pila de memoria (LIFO), salta al código de la función y, al encontrar un `RET`, recupera la dirección para continuar donde estaba. |

---

## Capítulo 1: Operando el Entorno de Simulación

Antes de escribir tu primer programa, familiarízate con los mandos del simulador (Panel Derecho):

1. **Assemble & Load (Ensamblar y Cargar):** Toma el código del editor, lo traduce a código de máquina hexadecimal (opcodes) y lo escribe en la memoria RAM del simulador.
2. **Clear Code (Limpiar Código):** Vacía el área de escritura del ensamblador y sus salidas para que puedas empezar de nuevo limpiamente.
3. **Run (Ejecutar):** Inicia la ejecución automática del programa a alta velocidad. Si no hay una instrucción `HLT` (Halt/Detener), el programa seguirá ejecutándose indefinidamente en un bucle de instrucciones `NOP`.
4. **Stop (Detener):** Pausa el programa en cualquier momento para inspeccionar qué valores han quedado en los registros y la memoria.
5. **Step (Paso a Paso):** Ejecuta una sola instrucción. Es la herramienta de depuración (*debugging*) más potente. Te permite ver exactamente qué efecto tiene cada línea en el CPU.
6. **Reset (Reiniciar):** Detiene ejecuciones activas, rellena toda la memoria RAM con ceros, limpia la consola y devuelve todos los registros y banderas a sus estados por defecto (`PC = 0000`, `SP = FFFF`).
7. **Banderas Explicadas (Flags Tooltips):** Al pasar el ratón por encima de los indicadores de banderas (`S`, `Z`, `AC`, `P`, `CY`), verás una explicación interactiva de su significado lógico.
8. **Stack View (Vista de la Pila):** Ubicado abajo de los flags. Muestra un corte de la memoria RAM alrededor de la dirección del puntero de pila (`SP`). El renglón amarillo representa la cima de la pila (`Top of Stack`).

---

## Capítulo 2: Primer Grupo - Aritmética Básica y Abstracciones

El Intel 8080 es un procesador de **8 bits**. Esto significa que sus registros de propósito general (como `A`, `B`, `C`) solo pueden almacenar números enteros entre `0` y `255` (en decimal) o de `00H` a `FFH` (en hexadecimal).

A continuación, veremos cómo implementar operaciones aritméticas básicas que en alto nivel haces de forma directa.

### 2.1 Adición (Suma)
*   **Abstracción de Alto Nivel:** `resultado = a + b`
*   **Enfoque de Bajo Nivel:** El CPU realiza sumas usando el **Acumulador (Registro `A`)** como protagonista. Cargamos el primer número en `A`, y le sumamos el segundo desde otro registro o como un valor inmediato.

```assembly
; --- PROGRAMA DE SUMA ---
ORG 0000H          ; Inicia el programa en la dirección de memoria 0000H
MVI A, 15          ; Variable A = 15 (Carga 15 decimal en el acumulador A)
MVI B, 27          ; Variable B = 27 (Carga 27 decimal en el registro B)
ADD B              ; A = A + B (El resultado, 42, se almacena en el acumulador A)
STA 2000H          ; resultado = A (Guarda el valor 42 en la celda de memoria 2000H)
HLT                ; Detiene el CPU
```

---

### 2.2 Resta
*   **Abstracción de Alto Nivel:** `resultado = a - b`
*   **Enfoque de Bajo Nivel:** De forma similar a la suma, el minuendo debe cargarse en `A` y el sustraendo se resta usando la instrucción `SUB` (desde un registro) o `SUI` (valor inmediato).

```assembly
; --- PROGRAMA DE RESTA ---
ORG 0000H
MVI A, 50          ; Minuendo A = 50
MVI B, 18          ; Sustraendo B = 18
SUB B              ; A = A - B (El resultado, 32 / 20H, queda en A)
STA 2000H          ; Guarda el resultado en la celda de memoria 2000H
HLT
```

---

### 2.3 Resta con Resultado Negativo (Entendiendo el Complemento a 2)
*   **Abstracción de Alto Nivel:** `resultado = 5 - 8` (Esperamos `-3`)
*   **La Realidad del Bajo Nivel:** Dado que el procesador solo entiende bytes (`0` a `255`), representa los números negativos mediante el sistema de **Complemento a 2**.
    *   Si realizamos una resta donde el sustraendo es mayor, se activará la bandera de acarreo/préstamo (**`CY = 1`**) y la bandera de signo (**`S = 1`**), indicando que el resultado es negativo.
    *   El valor obtenido en `A` será `FDH` (`253` en decimal sin signo). En complemento a 2 de 8 bits, `FDH` representa exactamente `-3` (ya que `256 - 3 = 253`).

```assembly
; --- RESTA CON RESULTADO NEGATIVO ---
ORG 0000H
MVI A, 5           ; Carga 5 en el acumulador
MVI B, 8           ; Carga 8 en el registro B
SUB B              ; A = A - B. Resultado en A = FDH (que es -3 en Complemento a 2)
                   ; Se activarán las banderas S (Signo = 1) y CY (Carry/Borrow = 1)
STA 2000H          ; Almacena FDH en la dirección 2000H
HLT
```

---

### 2.4 Multiplicación (Mediante Sumas Sucesivas)
*   **Abstracción de Alto Nivel:** `resultado = multiplicando * multiplicador` (ej. `6 * 4`)
*   **Abstracción Algorítmica:** El Intel 8080 no posee una instrucción física para multiplicar. Por ende, debemos crear un ciclo que sume el *multiplicando* tantas veces como indique el *multiplicador*.
*   **Equivalencia en pseudocódigo:**
    ```python
    acumulador = 0
    multiplicando = 6
    multiplicador = 4
    while multiplicador > 0:
        acumulador += multiplicando
        multiplicador -= 1
    ```

```assembly
; --- PROGRAMA DE MULTIPLICACIÓN ---
ORG 0000H
MVI A, 0           ; Inicializa el acumulador (A = 0) para llevar la suma total
MVI B, 6           ; Registro B = Multiplicando (6)
MVI C, 4           ; Registro C = Multiplicador / Contador (4)

BUCLE_MULT:
    CPI 0          ; Compara si el contador en C ha llegado a 0 (Nota: el acumulador debe preservarse,
                   ; pero para no perder la suma temporal, sumamos y evaluamos el contador)
    MOV A, A       ; NOP virtual
    ADD B          ; Suma el multiplicando a la cuenta: A = A + B
    DCR C          ; Decrementa el contador en C: C = C - 1
    JNZ BUCLE_MULT ; Si C no es cero, repite el ciclo de suma

STA 2000H          ; Guarda el resultado (24 / 18H) en la celda 2000H
HLT
```

---

### 2.5 División (Mediante Restas Sucesivas)
*   **Abstracción de Alto Nivel:** `cociente, residuo = dividendo / divisor` (ej. `17 / 5` ➔ Cociente: `3`, Residuo: `2`)
*   **Abstracción Algorítmica:** Restamos repetidamente el *divisor* al *dividendo* hasta que lo que quede en el dividendo sea menor que el divisor. El número de restas realizadas será el **cociente**, y lo que reste en el dividendo será el **residuo**.
*   **Equivalencia en pseudocódigo:**
    ```python
    dividendo = 17
    divisor = 5
    cociente = 0
    while dividendo >= divisor:
        dividendo -= divisor
        cociente += 1
    residuo = dividendo
    ```

```assembly
; --- PROGRAMA DE DIVISIÓN ---
ORG 0000H
MVI A, 17          ; Acumulador A = Dividendo (17)
MVI B, 5           ; Registro B = Divisor (5)
MVI C, 0           ; Registro C = Cociente (inicia en 0)

BUCLE_DIV:
    CMP B          ; Compara el acumulador (dividendo actual) con el divisor (B)
    JC FIN_DIV     ; Si A < B, se activa la bandera de Carry (CY=1). Saltamos al final.

    SUB B          ; A = A - B (Resta el divisor)
    INR C          ; Incrementa el cociente: C = C + 1
    JMP BUCLE_DIV  ; Repite el proceso de comparación y resta

FIN_DIV:
    STA 2001H      ; Guarda el Residuo (lo que quedó en A, que es 2) en 2001H
    MOV A, C       ; Pasa el Cociente (C) al acumulador para poder guardarlo
    STA 2000H      ; Guarda el Cociente (3) en la dirección 2000H
    HLT
```

---

### 2.6 Exponente (Base elevada a un Exponente)
*   **Abstracción de Alto Nivel:** `resultado = base^exponente` (ej. `3^3` ➔ `27`)
*   **Abstracción Algorítmica:** La potenciación es una multiplicación repetida. Para calcular `3^3`, multiplicamos la base por sí misma `exponente - 1` veces. Dado que la multiplicación ya es un ciclo de sumas sucesivas, la potenciación se convierte en un **bucle anidado** (un bucle dentro de otro bucle).
*   **Equivalencia en pseudocódigo:**
    ```python
    base = 3
    exponente = 3
    resultado = base
    # Multiplicamos el resultado por la base tantas veces como el exponente demande
    for i in range(exponente - 1):
        temp = 0
        for j in range(base):
            temp += resultado
        resultado = temp
    ```

```assembly
; --- PROGRAMA DE EXPONENCIACIÓN (POTENCIA) ---
; Calcula 3^3 = 27 (1BH)
; Registro D: Base (3)
; Registro E: Exponente restante / Contador externo (restan 2 multiplicaciones)
; Registro C: Resultado acumulado (inicia con el valor de la base: 3)

ORG 0000H
MVI D, 3           ; Base = 3
MVI E, 2           ; Multiplicaciones a realizar (Exponente - 1 = 2)
MVI C, 3           ; Inicializa resultado temporal con la base (3)

BUCLE_POT:
    MOV A, E       ; Verifica si el contador del exponente llegó a 0
    CPI 0
    JZ FIN_POT     ; Si es cero, terminar.

    ; --- Multiplicar C (Resultado temporal) por D (Base) ---
    MVI B, 0       ; Limpia B (guardará el resultado de la multiplicación actual)
    MOV H, D       ; H = Contador interno (número de sumas = Base)

SUMA_REP:
    MOV A, B
    ADD C          ; Suma el resultado acumulado anterior
    MOV B, A       ; Guarda la suma parcial en B
    DCR H          ; Decrementa contador de sumas
    JNZ SUMA_REP   ; Repite la suma hasta sumar 'Base' veces

    MOV C, B       ; C = Nuevo resultado acumulado
    DCR E          ; Decrementa el contador externo de multiplicaciones
    JMP BUCLE_POT

FIN_POT:
    MOV A, C       ; Copia resultado final a A
    STA 2000H      ; Almacena 27 (1BH) en la dirección de memoria 2000H
    HLT
```

---

## Capítulo 3: Segundo Grupo - Estructuras de Control y Lógica de Bits

En los lenguajes de alto nivel, tomas decisiones lógicas complejas con palabras clave simples. En bajo nivel, dependes enteramente de evaluar banderas aritméticas o manipular bits de forma individual.

### 3.1 Condicionales (`If / Else`)
*   **Abstracción de Alto Nivel:**
    ```python
    if x == y:
        registro_a = 100
    else:
        registro_a = 200
    ```
*   **Enfoque de Bajo Nivel:** Usamos la instrucción de comparación `CMP`. Esta resta temporalmente los valores y ajusta las banderas. Si los números son iguales, la resta da cero y activa la bandera `Z = 1`. Evaluamos esto mediante saltos condicionales (`JZ` o `JNZ`).

```assembly
; --- ESTRUCTURA CONDICIONAL (IF / ELSE) ---
ORG 0000H
MVI B, 15          ; Variable x = 15
MVI C, 15          ; Variable y = 15

MOV A, B           ; Mueve x al acumulador para la comparación
CMP C              ; Compara A (x) con C (y). Si x == y, se activa Z (Z = 1)
JZ CASO_IGUAL      ; Si Z = 1, salta a la etiqueta CASO_IGUAL (Bloque IF)

; --- BLOQUE ELSE ---
MVI A, 200         ; Si no fueron iguales, carga 200 en A
JMP FIN_IF         ; Salta para no ejecutar el bloque IF

CASO_IGUAL:
; --- BLOQUE IF ---
MVI A, 100         ; Si fueron iguales, carga 100 en A

FIN_IF:
STA 2000H          ; Almacena el resultado de la decisión en la dirección 2000H
HLT
```

---

### 3.2 Ciclos / Bucles (Estructuras de Repetición)
*   **Abstracción de Alto Nivel:**
    ```python
    for i in range(5, 0, -1):
        # hacer algo
    ```
*   **Enfoque de Bajo Nivel:** Establecemos un registro como contador (ej. 5), realizamos las tareas de cuerpo del bucle, decrementamos el registro con `DCR` y evaluamos si ha llegado a cero usando `JNZ` (Salta si No es Cero) para repetir.

```assembly
; --- BUCLE DE CONTEO REGRESIVO (5 a 1) ---
ORG 0000H
LXI HL, 2000H      ; HL apunta a la dirección de memoria inicial de escritura (2000H)
MVI B, 5           ; Inicializa contador en 5

BUCLE_REP:
    MOV A, B       ; Copia el contador actual al acumulador
    MOV M, A       ; Guarda el número en la celda de memoria apuntada por HL
    INX HL         ; Incrementa HL (apunta a la siguiente posición de memoria)

    DCR B          ; Decrementa el contador: B = B - 1 (Afecta la bandera Z si llega a 0)
    JNZ BUCLE_REP  ; Si el contador B no es cero (Z = 0), repite el ciclo

HLT                ; Al finalizar, la memoria desde 2000H tendrá los valores [05, 04, 03, 02, 01]
```

---

### 3.3 Operadores Lógicos de Bits (NOT, XOR, vaciar registro)
La manipulación de compuertas lógicas es la base de la optimización en ensamblador:

*   **Operador NOT (Bitwise Inversion - `CMA`):** Invierte individualmente cada bit de un número (los 0s se vuelven 1s y viceversa). Esto es el complemento a 1 de un número.
*   **Operador XOR (Exclusive OR - `XRA` / `XRI`):** Compara dos secuencias de bits. Si los bits son diferentes devuelve 1, si son iguales devuelve 0.
    *   **Truco Maestro de Optimización:** En ensamblador, hacer `XRA A` (XOR del acumulador consigo mismo) es la forma más rápida y óptima de **vaciar el acumulador a cero (`A = 0`)** y poner la bandera `Z` en 1 en un solo ciclo de instrucción.

```assembly
; --- DEMOSTRACIÓN DE OPERADORES LÓGICOS ---
ORG 0000H

; 1. Operación NOT
MVI A, 0F0H        ; Carga 11110000B en el acumulador
CMA                ; Invierte todos los bits de A. Ahora A = 00001111B (0FH)
STA 2000H          ; Guarda 0FH en 2000H

; 2. Operación XOR para enmascarar / alternar
MVI A, 0AAH        ; A = 10101010B
XRI 0FFH           ; XOR inmediato con 11111111B. Invierte todos los bits.
                   ; Ahora A = 01010101B (55H)
STA 2001H          ; Guarda 55H en 2001H

; 3. Vaciar el registro (XRA A)
XRA A              ; XOR A con A. Como todos los bits son idénticos, el resultado es 00H.
                   ; Es el equivalente de bajo nivel a "A = 0" de alto rendimiento.
STA 2002H          ; Guarda 00H en 2002H
HLT
```

---

## Capítulo 4: Tercer Grupo - Operando la Pila (Stack) y Funciones

Cuando programas en alto nivel, llamas a funciones de forma anidada y el sistema se encarga de recordar dónde regresar. En esta sección veremos cómo la **Pila (*Stack*)** hace posible esta magia mediante una estructura de memoria **LIFO (Last In, First Out)**.

### 4.1 Operando la Pila (`PUSH` y `POP`)
La pila es una zona especial de la memoria RAM que se gestiona mediante el registro **Stack Pointer (`SP`)**.
*   **`PUSH` (Guardar):** Decrementa `SP` y guarda temporalmente el valor de un par de registros en la pila.
*   **`POP` (Recuperar):** Recupera el último valor guardado en la pila, lo deposita en un par de registros e incrementa `SP`.
*   *Usa el panel de **Stack View** en el simulador para observar cómo suben y bajan los valores físicamente con cada instrucción.*

```assembly
; --- USO BÁSICO DE LA PILA ---
ORG 0000H
LXI SP, FFFFH      ; Inicializa el puntero de pila en la dirección más alta de memoria

MVI B, 12H         ; Carga datos en el par BC
MVI C, 34H
MVI D, 56H         ; Carga datos en el par DE
MVI E, 78H

PUSH BC            ; Guarda el valor de BC (1234H) en la pila. SP decrece en 2.
PUSH DE            ; Guarda el valor de DE (5678H) en la pila. SP decrece en 2.

; Ahora cambiaremos los registros para simular que realizamos otras tareas
MVI B, 00H
MVI C, 00H
MVI D, 00H
MVI E, 00H

POP HL             ; Recupera el último valor de la pila (5678H, que estaba en DE) y lo carga en HL
POP BC             ; Recupera el siguiente valor (1234H, que estaba en BC) y lo deposita en BC

HLT
```

---

### 4.2 Subrutinas y Funciones (`CALL` y `RET`)
*   **Abstracción de Alto Nivel:**
    ```python
    def duplicar(n):
        return n * 2

    x = duplicar(5)
    ```
*   **Enfoque de Bajo Nivel:**
    *   `CALL` escribe en la pila la dirección del Program Counter (`PC`) actual (la dirección de retorno) y salta a la dirección de la subrutina.
    *   La subrutina realiza su trabajo y finaliza con `RET`.
    *   `RET` extrae de la pila la dirección de retorno guardada y salta de vuelta a ella para continuar la ejecución del programa principal.

```assembly
; --- PROGRAMA PRINCIPAL CON LLAMADA A FUNCIÓN ---
ORG 0000H
LXI SP, FFFFH      ; Inicializa la pila

MVI A, 5           ; Pasamos el parámetro de la función cargándolo en A (A = 5)
CALL DUPLICAR      ; Llama a la función "DUPLICAR". Guarda la dirección del "STA" en la pila y salta.

STA 2000H          ; Guarda el resultado final (10 / 0AH) en la celda de memoria 2000H
HLT

; ==================================================
; SUBRUTINA: DUPLICAR
; Duplica el valor del acumulador A (A = A + A)
; ==================================================
DUPLICAR:
    ADD A          ; Suma el acumulador a sí mismo: A = A + A
    RET            ; Extrae la dirección de retorno de la pila y vuelve al programa principal
```

---

## Capítulo 5: Desafío Avanzado - Operaciones de 16 Bits en un CPU de 8 Bits

¿Cómo puede una calculadora o procesador de 8 bits realizar operaciones matemáticas con números mayores a `255`? La respuesta es encadenando operaciones.

Para operar con 16 bits (valores hasta `65535`), dividimos el número en dos bytes: el **Byte Alto (High Byte)** y el **Byte Bajo (Low Byte)**, y los procesamos consecutivamente trasladando el acarreo (*Carry*) del byte bajo al alto.

### 5.1 Suma de 16 Bits usando Acarreo Encadenado
*   **Abstracción:** Sumaremos `1000` (03E8H) y `500` (01F4H) para obtener `1500` (05DCH).
    *   **Número 1:** `03E8H` ➔ Byte Alto: `03H`, Byte Bajo: `E8H`
    *   **Número 2:** `01F4H` ➔ Byte Alto: `01H`, Byte Bajo: `F4H`
*   **Lógica:**
    1. Sumamos los Bytes Bajos (`E8H + F4H = 1DCH`). El resultado del byte bajo es `DCH` y se genera un acarreo (`CY = 1`).
    2. Sumamos los Bytes Altos considerando el acarreo usando **`ADC`** (Suma con Acarreo): `03H + 01H + CY (1) = 05H`.
    3. El resultado final en 16 bits es `05DCH` (1500).

```assembly
; --- SUMA MANUAL DE 16 BITS CON CARREO ENCADENADO ---
ORG 0000H

; Carga el Número 1 (03E8H) en los registros B (alto) y C (bajo)
MVI B, 03H
MVI C, E8H

; Carga el Número 2 (01F4H) en los registros D (alto) y E (bajo)
MVI D, 01H
MVI E, F4H

; 1. Sumar los Bytes Bajos
MOV A, C           ; A = E8H
ADD E              ; A = E8H + F4H. Resultado en A = DCH, Carry CY se activa (CY = 1)
MOV L, A           ; Guarda el Byte Bajo del resultado final en el registro L

; 2. Sumar los Bytes Altos con Acarreo
MOV A, B           ; A = 03H
ADC D              ; A = 03H + 01H + CY (1) = 05H
MOV H, A           ; Guarda el Byte Alto del resultado final en el registro H

; En este punto, la pareja de registros HL contiene el resultado de 16 bits: 05DCH (1500)
SHLD 2000H         ; Almacena el par HL de forma automática en las celdas 2000H (L) y 2001H (H)
HLT
```

---

### 5.2 Suma de 16 Bits utilizando la Instrucción Nativa `DAD`
El procesador Intel 8080 incluye un registro de 16 bits virtualizado uniendo los registros `H` y `L` (`HL`), y provee una instrucción especial llamada **`DAD` (Double Add)** que suma directamente otra pareja de registros de 16 bits al par `HL` en un solo paso.

```assembly
; --- SUMA DE 16 BITS CON LA INSTRUCCIÓN NATIVA DAD ---
ORG 0000H

; Carga el Número 1 (03E8H) directamente en la pareja HL
LXI HL, 03E8H      ; HL = 03E8H (1000)

; Carga el Número 2 (01F4H) directamente en la pareja DE
LXI DE, 01F4H      ; DE = 01F4H (500)

DAD DE             ; HL = HL + DE. Suma automáticamente en 16 bits.
                   ; El par HL ahora contiene 05DCH (1500).

SHLD 2000H         ; Guarda el resultado en las posiciones 2000H y 2001H
HLT
```

---

## Capítulo 6: El Coprocesador Matemático de Punto Flotante (FPU)

### 6.1 El problema: el 8080 solo sabe sumar enteros

Todo lo que vimos hasta ahora —`ADD`, `SUB`, `DAD`— trabaja exclusivamente con **números enteros** de 8 o 16 bits. El Intel 8080 real no tenía ninguna forma nativa de representar `3.14` o `-0.5`. Cuando en los años 70-80 se necesitaban cálculos con decimales (hojas de cálculo, simulaciones científicas), se usaban dos caminos:

1. **Software**: rutinas escritas a mano que emulan la aritmética decimal usando solo enteros (lento, pero no requiere hardware extra).
2. **Un coprocesador matemático dedicado**: un chip aparte, conectado al mismo bus que la CPU, especializado únicamente en aritmética de punto flotante. Ejemplos históricos: el **AMD 9511** (1978) y, más adelante, el famoso **Intel 8087** que acompañaba al 8086/8088.

Este proyecto simula conceptualmente esa segunda opción: un **FPU8080** que vive junto a la CPU, conectado al mismo bus de memoria, con sus propios registros internos (`F0`-`F3`).

### 6.2 IEEE 754: cómo se representa un número decimal en binario

Un número de punto flotante de precisión simple (32 bits) se divide en tres campos, siguiendo el estándar **IEEE 754**:

| Campo | Bits | Significado |
| :--- | :--- | :--- |
| **Signo (S)** | 1 bit (bit 31) | `0` = positivo, `1` = negativo |
| **Exponente (E)** | 8 bits (bits 30-23) | Exponente de la potencia de 2, con un *sesgo* (*bias*) de 127 |
| **Mantisa (M)** | 23 bits (bits 22-0) | La parte fraccionaria del número, asumiendo un "1." implícito al inicio |

La fórmula para reconstruir el valor real es:

```
valor = (-1)^S  ×  1.M (en binario)  ×  2^(E - 127)
```

**Ejemplo paso a paso: representar 1.5**

1. `1.5` en binario es `1.1`.
2. Normalizado en notación científica binaria: `1.1 × 2^0`.
3. Signo: positivo → `S = 0`.
4. Exponente: `0 + 127 (sesgo) = 127 = 01111111` en binario.
5. Mantisa: la parte después del punto (`1`), rellenada con ceros a 23 bits → `10000000000000000000000`.
6. Bits completos: `0 01111111 10000000000000000000000`.

El panel "Coprocesador FPU" de este simulador muestra exactamente esta descomposición (S, E y M) para cada registro flotante, en tiempo real, cada vez que corres una operación — así se puede verificar a mano cualquier resultado.

### 6.3 Arquitectura: el Bus compartido

Antes, la CPU tenía su propio array de memoria (`this.memory`). Ahora existe una clase `Bus` (`bus.js`) que es la **única** propietaria de la memoria RAM de 64KB. Tanto `Intel8080` como `FPU8080` reciben una referencia al **mismo** objeto `Bus` en su constructor:

```js
const bus = new Bus();
const cpu = new Intel8080(bus);
const fpu = new FPU8080(bus);
cpu.fpu = fpu;
```

Esto es fiel a cómo funcionaba un coprocesador real: no tenía su propia RAM, competía por el mismo bus de direcciones/datos que la CPU para leer y escribir los operandos.

### 6.4 Las instrucciones nuevas de la ISA

Se agregó un **opcode de escape**: `0xED` (la misma técnica que usa el procesador Z80 para sus instrucciones extendidas). El byte que sigue a `0xED` indica qué operación flotante ejecutar:

| Mnemónico | Bytes | Descripción |
| :--- | :--- | :--- |
| `FLD Fn, addr` | 4 | Carga 4 bytes desde `addr` (vía el Bus) al registro flotante `Fn`, interpretándolos como IEEE 754 |
| `FST Fn, addr` | 4 | Guarda el registro flotante `Fn` (4 bytes IEEE 754) en `addr` (vía el Bus) |
| `FADD Fd, Fs` | 2 | `Fd = Fd + Fs` |
| `FSUB Fd, Fs` | 2 | `Fd = Fd - Fs` |
| `FMUL Fd, Fs` | 2 | `Fd = Fd * Fs` |
| `FDIV Fd, Fs` | 2 | `Fd = Fd / Fs` |

También se agregó la directiva `DF` (Define Float), hermana de `DB` (Define Byte), para colocar constantes flotantes directamente en memoria en formato IEEE 754:

```assembly
ORG 3000H
DF 2.5      ; escribe 4 bytes: la representación IEEE754 de 2.5
DF 1.25
```

**Ejemplo completo: sumar 2.5 + 1.25 con el coprocesador**

```assembly
ORG 3000H
DF 2.5             ; constante flotante en 3000H
DF 1.25            ; constante flotante en 3004H
ORG 0000H
FLD F0, 3000H      ; F0 = 2.5  (leído del bus)
FLD F1, 3004H      ; F1 = 1.25 (leído del bus)
FADD F0, F1        ; F0 = F0 + F1 = 3.75
FST F0, 3008H      ; guarda 3.75 (IEEE754) en 3008H, vía el bus
HLT
```

Este mismo programa está disponible en el selector "Demostraciones" del simulador (`FPU: sumar 2.5 + 1.25`), junto con una demo de multiplicación/división.

### 6.5 Entrada/Salida real: `IN` y `OUT`

El 8080 real ya definía `IN puerto` (lee un byte desde un puerto externo hacia `A`) y `OUT puerto` (escribe `A` hacia un puerto externo). En este simulador, esos "puertos" están conectados a la interfaz web:

- `OUT 01H` → el valor de `A` aparece en el panel "Entrada / Salida" como la última salida.
- `IN 00H` → `A` toma el valor que el usuario escribió en el campo "Valor para IN (hex)" del mismo panel.

```assembly
MVI A, 05H
MVI B, 03H
ADD B          ; A = 8
OUT 01H        ; el 8 aparece en el panel de E/S
HLT
```

### 6.6 La Traza de Ejecución: leyendo la "historia" de un programa

En vez de mirar 4 tablas sueltas (registros, flags, pila, memoria) y deducir por tu cuenta qué pasó, el panel **"Traza de Ejecución"** narra cada instrucción en lenguaje simple, en el orden real en que ocurrió: qué instrucción se ejecutó, y si involucró al FPU o al bus de E/S, el detalle interno de esa operación (qué bytes se leyeron, qué cálculo IEEE 754 se hizo, qué resultado se guardó). Es la forma más directa de verificar, instrucción por instrucción, que la teoría del Capítulo 6 se cumple en la práctica.

---

¡Felicidades! Has completado el recorrido completo por el funcionamiento interno del microprocesador — desde la aritmética entera más básica hasta un coprocesador matemático de punto flotante conectado por bus compartido. Ahora tienes la capacidad intelectual y práctica de diseñar programas de gran rendimiento, depurar flujos paso a paso y, lo más importante, comprender exactamente cómo interactúa el software de alto nivel con el hardware subyacente.

**¡Es hora de experimentar en el simulador!**
