import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Datos inválidos',
          detalles: error.errors.map(e => ({
            campo: e.path.join('.'),
            mensaje: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}