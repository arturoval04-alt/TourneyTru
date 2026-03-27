import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones para Tourney Tru.
 * - Errores HTTP conocidos (4xx): devuelve el mensaje limpio al cliente.
 * - Errores inesperados (5xx): loguea internamente y devuelve mensaje genérico
 *   sin exponer detalles del stack ni del ORM al cliente.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        const isHttpException = exception instanceof HttpException;
        const status = isHttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        let message: string | string[];

        if (isHttpException) {
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            } else if (typeof body === 'object' && body !== null) {
                const msg = (body as any).message;
                message = msg ?? exception.message;
            } else {
                message = exception.message;
            }
        } else {
            // Error inesperado — loguear internamente, NUNCA exponer al cliente
            this.logger.error(
                `[${req.method}] ${req.url} → Error no controlado`,
                exception instanceof Error ? exception.stack : String(exception),
            );
            message = 'Ocurrió un error en el servidor. Intenta de nuevo en unos momentos.';
        }

        res.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: req.url,
        });
    }
}
