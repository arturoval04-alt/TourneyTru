import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({ include: { role: true } });
    console.log('\n👥 Usuarios en la base de datos:\n');
    users.forEach(u => {
        const isBcrypt = u.passwordHash.startsWith('$2b$') || u.passwordHash.startsWith('$2a$');
        console.log(`  Email: ${u.email}`);
        console.log(`  Rol:   ${u.role.name}`);
        console.log(`  Hash:  ${isBcrypt ? '✅ bcrypt válido' : '❌ texto plano / inválido: "' + u.passwordHash + '"'}`);
        console.log('');
    });
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
