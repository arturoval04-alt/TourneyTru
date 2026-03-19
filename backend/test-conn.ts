import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Intentando conectar con:', process.env.DATABASE_URL?.split('@')[1]);
    await prisma.$connect();
    console.log('✅ Conexión exitosa a Supabase!');
    const usersCount = await prisma.user.count();
    console.log(`✅ Usuarios en la base de datos: ${usersCount}`);
  } catch (e) {
    console.error('❌ Error de conexión:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
