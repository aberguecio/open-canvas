import { PrismaClient } from '@prisma/client';

// scheduler.ts: rotación dinámica sin cron fijo con cálculo de tiempo restante
const prisma = new PrismaClient();
let nextRunTimestamp: number = Date.now();

/**
 * Ejecuta la rotación de la imagen "current" y se reprograma dinámicamente.
 */
async function rotateAndReschedule() {
  try {
    // 1) Busca la "current": la más reciente visible
    const current = await prisma.image.findFirst({
      where: { isVisible: true },
      orderBy: { createdAt: 'asc' }
    });

    if (current) {
      await prisma.image.update({
        where: { id: current.id },
        data: { isVisible: false }
      });
      console.log(`Rotated out image ${current.id}`);
    } else {
      console.log('No visible images to rotate out');
    }

    // 2) Cuenta cuántas siguen visibles
    const remaining = await prisma.image.count({ where: { isVisible: true } });

    // 3) Calcula intervalo en horas (24h/remaining), entre 1h y 24h
    const hours = remaining > 0
      ? Math.max(1, Math.min(12, 100 / remaining))
      : 12;
    const ms = Math.ceil(hours) * 60 * 60 * 1000;
    console.log(`Next rotation in ${hours.toFixed(2)}h (${ms/1000}s)`);

    // 4) Establece timestamp para el próximo run
    nextRunTimestamp = Date.now() + ms;

    // 5) Reprograma esta función
    setTimeout(rotateAndReschedule, ms);
  } catch (err) {
    console.error('Error rotating images:', err);
    // reintenta en 1h si falla
    const retryMs = 60 * 60 * 1000;
    nextRunTimestamp = Date.now() + retryMs;
    setTimeout(rotateAndReschedule, retryMs);
  }
}

// Arranca el ciclo cuando la app inicie
rotateAndReschedule();

/**
 * Devuelve los milisegundos que faltan hasta la próxima rotación.
 */
export function getRemainingMs(): number {
  return Math.max(0, nextRunTimestamp - Date.now());
}

// Manejo de señales para desconectar Prisma limpiamente
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
