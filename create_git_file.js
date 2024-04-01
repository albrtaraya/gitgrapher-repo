const fs = require('fs');
const path = require('path');

// Ruta al archivo que quieres leer y copiar
const sourceFilePathCommit = path.join(__dirname, 'resources', 'post-commit');
const sourceFilePathMerge = path.join(__dirname, 'resources', 'post-merge-commit');
const sourceFilePathRebase = path.join(__dirname, 'resources', 'post-rebase');

// Ruta de destino dentro de la carpeta .git
const destinationFilePathCommit = path.join(__dirname, '..', '..', '.git', 'hooks', 'post-commit');
const destinationFilePathMerge = path.join(__dirname, '..', '..', '.git', 'hooks', 'post-merge-commit');
const destinationFilePathRebase = path.join(__dirname, '..', '..', '.git', 'hooks', 'post-rebase');

// Función para limpiar la línea anterior en la consola

// Lee el contenido del archivo origen
fs.readFile(sourceFilePathMerge, 'utf8', (err, data) => {
  fs.writeFile(destinationFilePathMerge, data, 'utf8', (err) => {});
});
fs.readFile(sourceFilePathRebase, 'utf8', (err, data) => {
  fs.writeFile(destinationFilePathRebase, data, 'utf8', (err) => {});
});
fs.readFile(sourceFilePathCommit, 'utf8', (err, data) => {
  // Escribe el contenido en el archivo de destino
  fs.writeFile(destinationFilePathCommit, data, 'utf8', (err) => {
    console.log('\x1b[32m%s\x1b[0m', 'Installation complete!');
  });
});
