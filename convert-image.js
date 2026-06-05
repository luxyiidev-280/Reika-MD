import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const inputPath = 'src/midias/fotobot.png';
const outputPath = 'src/midias/fotobot.jpg';

async function convertPngToJpg() {
  try {
    await sharp(inputPath)
      .jpeg({ quality: 90, progressive: true })
      .toFile(outputPath);
    
    console.log(`✅ Conversão concluída! ${inputPath} → ${outputPath}`);
    
    // Remove o arquivo PNG original
    await fs.unlink(inputPath);
    console.log(`✅ Arquivo PNG removido.`);
  } catch (error) {
    console.error('❌ Erro na conversão:', error.message);
  }
}

convertPngToJpg();
