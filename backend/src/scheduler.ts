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
      orderBy: { lastQueuedAt: 'asc' }
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

    if (remaining === 0) {
      // toma el favorito más antiguo y lo vuelve visible
      const fav = await prisma.image.findFirst({
        where: { isFavorite: true },
        orderBy: { lastQueuedAt: 'asc' }
      });
      if (fav) {
        await prisma.image.update({
          where: { id: fav.id },
          data: { isVisible: true, lastQueuedAt: new Date() }
        });
        console.log(`Re-queued favorite ${fav.id}`);
      }
    }

    // 3) Obtiene configuración dinámica de rotación
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const totalCycleHours = settings?.rotationIntervalHours || 100;

    // 4) Calcula intervalo en horas (totalCycleHours/remaining), entre 1h y 24h
    const hours = remaining > 0
      ? Math.max(1, Math.min(24, totalCycleHours / remaining))
      : 24;
    const ms = Math.ceil(hours) * 60 * 60 * 1000;
    console.log(`Next rotation in ${hours.toFixed(2)}h (${ms/1000}s)`);

    // 4) Establece timestamp para el próximo run
    const nextDate = new Date(Date.now() + ms);
    await saveNextRun(nextDate);
    nextRunTimestamp = nextDate.getTime();
    setTimeout(rotateAndReschedule, ms);

  } catch (err) {
    console.error('Error rotating images:', err);
    // reintenta en 1h si falla
    const retryMs = 60 * 60 * 1000;
    nextRunTimestamp = Date.now() + retryMs;
    setTimeout(rotateAndReschedule, retryMs);
  }
}

async function saveNextRun(at: Date) {
  await prisma.scheduler.upsert({
    where: { id: 1 },
    create: { id: 1, nextRunAt: at },
    update: { nextRunAt: at },
  });
}


// Arranca el ciclo cuando la app inicie
async function initScheduler() {
  const sched = await prisma.scheduler.findUnique({ where: { id: 1 } });
  if (sched) {
    nextRunTimestamp = sched.nextRunAt.getTime()
    const delay = sched.nextRunAt.getTime() - Date.now();
    if (delay > 0) {
      console.log(`Next rotation in ${Math.ceil(delay/1000)}s`);
      return setTimeout(rotateAndReschedule, delay);
    }
  }
  // si no hay schedule o ya pasó: arranca de una vez
  rotateAndReschedule();
}

initScheduler();

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
