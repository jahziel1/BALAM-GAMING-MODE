// 📝 FRAGMENTO PARA ACTUALIZAR wdio.conf.ts
// Reemplazar la línea 129 en beforeSession()

// ❌ ANTES (líneas 129-131):
/*
tauriDriver = spawn(tauriDriverPath, [], {
  stdio: [null, process.stdout, process.stderr],
});
*/

// ✅ DESPUÉS:
const msedgedriverPath = path.join(__dirname, 'node_modules', '.bin', 'msedgedriver.exe');
tauriDriver = spawn(tauriDriverPath, ['--native-driver', msedgedriverPath], {
  stdio: [null, process.stdout, process.stderr],
});
