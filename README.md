# Hematología Intensiva HGGB

App de evoluciones e ingresos. Funciona sin internet una vez abierta.
Los datos de pacientes quedan solo en cada dispositivo (almacenamiento del navegador). Este repositorio contiene solo código.

**Nunca subir respaldos (.json) ni archivos con datos de pacientes.** El repositorio lo bloquea (`.gitignore`) y avisa con error si aparece uno (revisión automática en Actions).

Archivos:
- `index.html`: la app.
- `sw.js`: funcionamiento sin internet. Cambiar `VERSION` en cada actualización.
- `manifest.webmanifest` e íconos: instalación en pantalla de inicio.
