# MANUAL DE USUARIO
# OPTIMIZADOR DE CORTES 2D PARA SECCIONADORA SELCO WNT 600
**Compatibilidad total con Biesse / Selco OSI / Optiplanning**

---

## 1. INTRODUCCIÓN

El **Optimizador de Cortes Selco WNT 600** es un software industrial de optimización de despieces de melamina y placas de madera diseñado específicamente para seccionadoras horizontales de control numérico (CNC) como la **Biesse Selco WNT 600**, **WNT 200**, **SK 4** y sistemas que operan mediante **Optiplanning**.

### Características Principales:
- **Algoritmo de Corte Guillotina 2D:** Genera patrones de corte por fases (tiras longitudinales y cortes transversales de guillotina completa de borde a borde), garantizando que el carro de sierra de la seccionadora pueda ejecutar cada corte sin colisiones ni restricciones mecánicas.
- **Carga Masiva Inteligente (Excel / Portapapeles):** Permite copiar directamente celdas desde Excel, Google Sheets, WhatsApp o archivos `.xlsx`, `.xls` y `.csv` con detección automática de columnas (*Nombre, Largo, Ancho, Cantidad, Veta, Material, Espesor*).
- **Control Estricto de Sentido de Veta:** Respeta la dirección de la veta de la melamina para frentes, puertas y laterales visibles, o permite el giro libre (90°) en piezas sin veta para maximizar el aprovechamiento.
- **Visualizador 2D Interactivo:** Gráfico milimétrico en alta definición con cotas de cota, numeración secuencial de corte, indicación de retazos y zoom/pan interactivo.
- **Generación Nativa de Archivos Selco `.001`, `.002`, `.00X`:** Exporta archivos con formato idéntico al que entrega Optiplanning (bloques `B_SCH`, `B_CUT`, `E_SCH`, encabezados `HP=9000`, terminación DOS/Windows CRLF), listos para cargar en el control de la máquina.

---

## 2. PUESTA EN MARCHA EN COMPUTADORAS CON WINDOWS

Para trasladar y ejecutar este sistema en cualquier computadora con Windows en la oficina técnica o al pie de la seccionadora:

### Método A: Ejecución Directa con 1 Clic (Recomendado)
1. Copia la carpeta `Optimizador_Selco_Windows` a tu disco (ejemplo: `C:\Optimizador` o en tu Escritorio).
2. Haz doble clic en el archivo:
   ```cmd
   INICIAR_EN_WINDOWS.bat
   ```
3. El script detectará automáticamente la instalación de PHP (sea de XAMPP, Laragon o el sistema), iniciará el servidor local y abrirá tu navegador web predeterminado en:
   ```text
   http://localhost:8080/
   ```

### Método B: Utilizando XAMPP para Windows
1. Descarga e instala XAMPP (con PHP 8.1 o superior) si no lo tienes instalado.
2. Copia la carpeta completa del optimizador dentro de la ruta pública de XAMPP:
   ```text
   C:\xampp\htdocs\Optimizador
   ```
3. Abre el **XAMPP Control Panel** y presiona **Start** en el módulo **Apache**.
4. Abre Google Chrome, Edge o Firefox e ingresa la dirección:
   ```text
   http://localhost/Optimizador/
   ```

---

## 3. GUÍA DE USO PASO A PASO

### PASO 1: Configurar la Placa Base (Materia Prima)
En el panel lateral izquierdo (*"Parámetros de Placa Base"*), configura las dimensiones de la placa que colocarás sobre la mesa de la seccionadora:

| Parámetro | Valor Habitual | Descripción |
| :--- | :--- | :--- |
| **Placa Predefinida** | `2500 x 1830 mm` | Medida comercial estándar en melaminas (Faplac, Egger, Masisa, etc.). También disponible `2750 x 1830` o `2600 x 1830`. |
| **Largo X (mm)** | `2500` | Dimensión sobre el eje longitudinal de la mesa de rodillos. |
| **Ancho Y (mm)** | `1830` | Dimensión sobre el eje transversal empujador. |
| **Espesor Z (mm)** | `18` | Espesor nominal de la placa (15mm, 18mm, 25mm, etc.). |
| **Material** | `ROBLE PROVENZAL 18` | Nombre del diseño melamínico (se grabará en la cabecera Selco `MAT=`). |
| **Refilo Perimetral** | `10 mm` | Corte inicial de saneamiento en los 4 bordes de la placa para retirar esquinas golpeadas o desescuadradas. |
| **Ancho de Corte (Kerf)**| `4.4 mm` | Espesor del disco de corte principal de la Selco WNT 600. |
| **Código de Trabajo** | `002ROB15` | Nombre del trabajo (máximo 8 caracteres). Los archivos generados serán `002ROB15.001`, `002ROB15.002`, etc. |

---

### PASO 2: Carga Masiva desde Excel o Portapapeles (¡La forma más rápida!)

El Optimizador incluye un motor de auto-detección flexible que entiende cualquier orden de columnas que utilices en tu planilla Excel:

1. **Copiar y Pegar Directo:**
   - Abre tu planilla en Excel o Google Sheets.
   - Selecciona todas las filas con tus piezas (puedes incluir los encabezados).
   - Presiona `Ctrl + C` en Excel.
   - Ve a la ventana del Optimizador y presiona **`Ctrl + V`** (o haz clic en el botón azul **`[📂 CARGA MASIVA / EXCEL]`**).

2. **Subir Archivo Excel:**
   - Dentro del modal de Carga Masiva, arrastra tu archivo `.xlsx`, `.xls` o `.csv` a la zona punteada o haz clic en **`📁 Seleccionar Archivo Excel`**.

3. **Auto-Detección Inteligente de Columnas:**
   - El sistema analiza de inmediato las columnas y detecta automáticamente:
     - 🏷️ **Pieza / Detalle:** Nombre descriptivo (ej. *"Lateral Izquierdo"*).
     - ↔ **Largo X (mm):** Dimensión de corte longitudinal.
     - ↕ **Ancho Y (mm):** Dimensión de corte transversal.
     - 🔢 **Cantidad:** Unidades a cortar.
     - 🔄 **Sentido Veta:** Detecta palabras como *"Con Veta"*, *"Sin Veta"*, *"Largo"*, *"Ancho"*.
     - 🎨 **Material y Espesor:** Si tu planilla tiene columnas de material (ej. *"Roble 18"*), el sistema las detecta y las aplica a la placa base automáticamente.
   - Si deseas cambiar alguna asignación, puedes ajustar los selectores en el **Mapeador de Columnas** superior.

4. **Confirmar Importación:**
   - Revisa la vista previa de las piezas detectadas.
   - Haz clic en **`[✓ Importar Piezas]`**.
   - El modal se cerrará automáticamente, las piezas aparecerán en la lista con un efecto luminoso esmeralda y la insignia `[Excel]`, y el plano de corte 2D se optimizará en tiempo real.

---

### PASO 3: Carga Manual y Configuración de Sentido de Veta

Si necesitas añadir o retocar piezas individuales en la lista:
- **Agregar Fila:** Haz clic en **`[+ Agregar Pieza]`**.
- **Duplicar Pieza:** Haz clic en el icono de duplicar (dos hojas) junto a la pieza.
- **Eliminar Fila:** Haz clic en el icono de la papelera roja.

#### Configuración de Veta y Giro:
- **🔄 Sin Veta (Permite Girar):** Recomendado para fondos, estantes interiores, zócalos o melaminas lisas (blanco, gris, negro). El optimizador podrá rotar la pieza 90° si eso reduce la cantidad de placas necesarias.
- **↔ Con Veta (Sentido Largo):** La dirección de la textura o veta de la madera correrá obligatoriamente a lo largo de la pieza (dimensión X). La pieza **no se rotará** fuera del sentido de la placa.
- **↕ Con Veta (Sentido Ancho):** La textura correrá a lo ancho de la pieza (dimensión Y).

---

### PASO 4: Optimización y Visualización 2D

Al presionar el botón principal **`OPTIMIZAR PLACAS (SELCO GUILLOTINE 2D)`**:
1. **Panel de Indicadores (KPIs):**
   - **Placas Necesarias:** Cantidad total de tableros de melamina requeridos.
   - **Rendimiento Global (%):** Porcentaje de superficie útil aprovechada (meta industrial > 85%).
   - **Área Útil vs Desperdicio:** Superficie en metros cuadrados de las piezas cortadas frente a retazos/sobrantes.
   - **Cortes Totales:** Cantidad exacta de pasadas del carro sierra.

2. **Herramientas del Lienzo Gráfico 2D:**
   - **Zoom:** Usa la rueda del ratón o los botones `[+]` y `[-]`.
   - **Paneo:** Haz clic sostenido sobre el lienzo y arrastra para mover la placa.
   - **Ajustar Pantalla:** Botón `[⤢]` para encuadrar la placa completa en tu monitor.
   - **Navegación entre Placas:** Si el corte requiere 2 o más placas, usa las flechas `<` y `>` o el menú desplegable para cambiar entre la *Placa 1*, *Placa 2*, etc.
   - **Inspección de Piezas:** Pasa el cursor sobre cualquier pieza para ver un tooltip flotante con el nombre, dimensiones exactas y si está rotada o alineada a veta.

---

### PASO 5: Exportación a la Seccionadora Selco WNT 600

Una vez conforme con la distribución, dirígete a la barra inferior de exportación:

1. **Descargar Archivo Individual (`.00X`):**
   - Descarga únicamente la placa activa que estés visualizando (ej. `002ROB15.001`).
2. **Descargar Paquete ZIP Completo:**
   - Botón **`Descargar Todas las Placas (.ZIP)`**.
   - Descarga un único archivo `.zip` que contiene todas las placas (`.001`, `.002`, `.003`...) listo para descomprimir en un pendrive USB.
3. **Guardar en Servidor CNC:**
   - Guarda los archivos directamente en la carpeta local compartida en red (`export/`) accesible por la seccionadora.
4. **Ver / Copiar Código Selco:**
   - Abre una ventana con el texto plano del código Selco estructurado para auditoría o copia directa al portapapeles.

---

## 4. CÓMO CARGAR LOS ARCHIVOS EN LA SECCIONADORA SELCO

1. **Conexión por Pendrive USB:**
   - Copia los archivos generados (`002ROB15.001`, `002ROB15.002`, etc.) en la raíz de un pendrive formateado en FAT32 o NTFS.
   - Conéctalo en el puerto USB del panel de control de la Selco WNT 600.
   - En el software de control de la máquina (Biesse OSI / Optiplanning), ve a **Cargar Esquema de Corte / Importar**.
   - Selecciona la unidad USB y elige el archivo correspondiente a la placa a cortar.

2. **Conexión por Carpeta Compartida de Red (Recomendada):**
   - Si la computadora de la seccionadora está en red local (LAN o WiFi), comparte la carpeta `export/` del optimizador.
   - En la seccionadora, abre la unidad de red mapeada y carga directamente los archivos sin necesidad de pendrive.

3. **Ejecución en Máquina:**
   - La máquina cargará el esquema mostrando las tiras longitudinales y los cortes de tronzado.
   - Carga la placa sobre la mesa empujadora, alinea contra la guía de escuadra y presiona el ciclo de inicio en la botonera de la Selco.

---

## 5. ESTRUCTURA TÉCNICA DEL FORMATO SELCO / OPTIPLANNING

Los archivos generados por este sistema cumplen 100% con el estándar Selco OSI:
```text
B_SCH
L=250000        ; Longitud de placa en décimas de milímetro (2500.00 mm)
W=183000        ; Ancho de placa en décimas de milímetro (1830.00 mm)
T=1800          ; Espesor en décimas de mm (18.00 mm)
MAT="ROBLE PROVENZAL 18     "  ; Cadena fija de 23 caracteres
HP=9000         ; Altura de paquete / presión estándar Selco
NP=1            ; Número de placas
B_CUT
C=1 P_X=0 P_Y=0 L=250000 W=580000 T=1 ...  ; Cortes de tira y tronzado
...
E_SCH
```
*Terminaciones de línea estrictas en formato DOS/Windows CRLF (`\r\n`).*

---

## 6. PREGUNTAS FRECUENTES (FAQ)

- **¿Por qué el sistema no gira una pieza aunque sobre espacio en otro sentido?**
  Verifica si la pieza tiene configurado *"Con Veta (Largo)"* o *"Con Veta (Ancho)"*. Si tiene veta obligatoria, el optimizador no la girará para no arruinar la estética del mueble. Cambia la opción a *"🔄 Sin Veta"* si deseas que pueda girar.

- **¿Puedo cambiar las medidas de la hoja a cualquier dimensión?**
  Sí. Solo debes escribir el Largo X y Ancho Y en el panel izquierdo (ejemplo: 2600 x 1830, o 2440 x 1220 mm) y re-optimizar.

- **¿Qué pasa con el ancho del disco de corte?**
  El valor por defecto es `4.4 mm`, que corresponde al disco Widia industrial estándar de seccionadoras Selco WNT 600. El optimizador descuenta exactamente esta cantidad en cada pasada de sierra para que las medidas finales de las piezas salgan a la décima de milímetro exacta.
