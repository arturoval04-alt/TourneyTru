import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        super({ log: ['error'] });
    }

    async onModuleInit() {
        await this.$connect();
        // Ping cada 4 minutos para evitar que SQL Server cierre la conexión idle
        this.keepAliveInterval = setInterval(async () => {
            try {
                await this.$queryRaw`SELECT 1`;
            } catch (e) {
                this.logger.warn('Keep-alive falló, reconectando a la DB...');
                try {
                    await this.$disconnect();
                    await this.$connect();
                    this.logger.log('Reconexión exitosa.');
                } catch (reconnErr) {
                    this.logger.error('Error al reconectar:', reconnErr);
                }
            }
        }, 4 * 60 * 1000);
    }

    async onModuleDestroy() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        await this.$disconnect();
    }
}
