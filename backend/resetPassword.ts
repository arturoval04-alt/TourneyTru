/**
 * Script para actualizar la contraseña de un usuario existente a bcrypt.
 * Uso: npx ts-node resetPassword.ts <email> <nuevaContraseña>
 * Ejemplo: npx ts-node resetPassword.ts admin@tourneytru.com MiClave123
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
        console.error('Uso: npx ts-node resetPassword.ts <email> <nuevaContraseña>');
        process.exit(1);
    }

    if (newPassword.length < 8) {
        console.error('La contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error(`No se encontró usuario con email: ${email}`);
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { email },
        data: { passwordHash },
    });

    console.log(`✅ Contraseña actualizada correctamente para: ${email}`);
    console.log(`   Rol actual: buscando...`);

    const fullUser = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
    });
    console.log(`   Rol: ${fullUser?.role.name}`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error('Error:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
