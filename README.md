# Hematología Intensiva HGGB

App de evoluciones e ingresos. Funciona sin internet una vez abierta.
Los datos de pacientes quedan solo en cada dispositivo (almacenamiento del navegador). Este repositorio contiene solo código.

**Nunca subir respaldos (.json) ni archivos con datos de pacientes.** El repositorio lo bloquea (`.gitignore`) y avisa con error si aparece uno (revisión automática en Actions).

Archivos:
- `index.html`: la app.
- `lote.js`: carga en lote (partir notas, huellas cifradas de nombre y RUT, combinar el día, novedades por sistema, reglas aprendidas, informe enmascarado). Sin IA: solo reglas.
- `sw.js`: funcionamiento sin internet. Cambiar `VERSION` en cada actualización.
- `manifest.webmanifest` e íconos: instalación en pantalla de inicio.

## Lector de fotos (carpeta `ocr/`)
Lee la hoja de enfermería (signos vitales, diuresis parcial, BH) en el mismo dispositivo, sin internet.
- Motor: PaddleOCR PP-OCRv6 (detector tiny + reconocedor medium, sin comprimir), licencia Apache 2.0.
- ONNX Runtime Web 1.22.0 (MIT), OpenCV.js 4.10 (Apache 2.0), Clipper 6.4.2 (Boost).
- `ocr-core.js`: réplica del flujo de RapidOCR; `hoja.js`: interpretación de la hoja; `ocr-worker.js`: proceso en segundo plano.
- Se descarga una vez (~100 MB) y queda guardado. Si se cambian los modelos, cambiar `OCR_CACHE` en `sw.js`.
- SHA-256 det.onnx 193bab7a04fca699a6c82e6abb5b81bdb28177f0abd4062552b04908dafb19f8 · rec.onnx 9c09abf0957f7968c7586464b7397b84ad2387a0497a351af40e9acc71b673ba
