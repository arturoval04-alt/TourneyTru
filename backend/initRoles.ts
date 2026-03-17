/**
 * Script para crear los roles del sistema y un usuario admin inicial.
 * Uso: npx ts-node initRoles.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Inicializando roles del sistema...\n');

    // Crear los 4 roles del sistema
    const roles = ['admin', 'scorekeeper', 'organizer', 'general'];

    for (const roleName of roles) {
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
        });
        console.log(`✅ Rol "${role.name}" listo (id: ${role.id})`);
    }

    console.log('\n📋 Resumen de roles:\n');
    console.log('  • admin      → Acceso total al sistema');
    console.log('  • scorekeeper → Vinculado a un torneo, puede crear y registrar jugadas en juegos');
    console.log('  • organizer  → Vinculado a un torneo, puede gestionar equipos y jugadores');
    console.log('  • general    → Solo lectura (aficionados)');

    // Verificar si ya hay un admin
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    const existingAdmin = await prisma.user.findFirst({
        where: { role: { name: 'admin' } },
        include: { role: true }
    });

    if (existingAdmin) {
        console.log(`\n👤 Admin existente: ${existingAdmin.email}`);
        console.log('   Si no puedes iniciar sesión, ejecuta:');
        console.log(`   npx ts-node resetPassword.ts ${existingAdmin.email} TuNuevaContraseña123`);
    } else {
        console.log('\n⚠️  No hay usuario admin. Creando uno por defecto...');
        const passwordHash = await bcrypt.hash('Admin123!', 12);
        const admin = await prisma.user.create({
            data: {
                email: 'admin@tourneytru.com',
                passwordHash,
                firstName: 'Admin',
                lastName: 'TourneyTru',
                roleId: adminRole!.id,
            }
        });
        console.log(`✅ Admin creado: ${admin.email} / contraseña: Admin123!`);
        console.log('   ¡Cambia la contraseña después de iniciar sesión!');
    }

    console.log('\n✅ Inicialización completada.\n');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error('Error:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
