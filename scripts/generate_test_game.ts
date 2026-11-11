import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

async function generateTestZip() {
  const zip = new AdmZip();
  
  const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Game</title>
    <style>
        body { background: #111; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
        .box { padding: 20px; background: #222; border-radius: 10px; text-align: center; }
    </style>
</head>
<body>
    <div class="box">
        <h1>🎮 Test Game Loaded!</h1>
        <p>This is a test game for Cobra Games Jr.</p>
        <button id="finish">Finish Game</button>
    </div>
    <script>
        // Simulate bridge
        window.parent.postMessage({ type: 'CG_LOAD_PROGRESS', data: { progress: 50 } }, '*');
        setTimeout(() => {
            window.parent.postMessage({ type: 'CG_LOAD_PROGRESS', data: { progress: 100 } }, '*');
            window.parent.postMessage({ type: 'CG_GAME_READY', data: { version: '1.0.0' } }, '*');
        }, 1000);

        document.getElementById('finish').onclick = () => {
            window.parent.postMessage({ type: 'CG_GAME_OVER', data: { score: 1000 } }, '*');
        };
    </script>
</body>
</html>
  `;

  zip.addFile('index.html', Buffer.from(indexHtml));
  zip.addFile('assets/test.png', Buffer.from('fake image data'));
  
  const outputPath = path.join(process.cwd(), 'public', 'test-game.zip');
  zip.writeZip(outputPath);
  console.log(`Test game ZIP generated at: ${outputPath}`);
}

generateTestZip();
