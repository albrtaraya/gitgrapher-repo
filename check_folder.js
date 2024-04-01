const fs = require('fs');
const path = require('path');

const gitFolderPath = path.join(__dirname, '..','..','.git');

// Verifica si la carpeta .git existe
console.log('\x1b[32m%s\x1b[0m', '|||||||||| GitGrapher-png ||||||||||');
console.log('- Verifying requirements...');
fs.access(gitFolderPath, fs.constants.F_OK, (err) => {
  if (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: The .git folder was not found in your repository.');
    console.log('\x1b[31m%s\x1b[0m', 'Message: Please make sure you are installing this package to a Git repository.');
    process.exitCode = 1; // Establece el código de error
    process.exit(1); // Termina el proceso para cancelar la instalación
  }
  console.log('- Verification carried out!');
  console.log('\x1b[32m%s\x1b[0m', '- Starting the installation process...');
});