import { Request, Response, NextFunction } from 'express';
import { ErrorTypes } from '../consts/errorTypes';
import {
    ForbiddenError,
    InvalidCredentialsError,
    InvalidRequestError,
    NotFoundError,
    UnauthorizedError,
    ConflictError, CastError
} from '../services/errorService';
import log from '../heplers/logger';
import {JsonWebTokenError} from "jsonwebtoken";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    log.error(err);

    if(err instanceof CastError) {
        return res.status(400).json({
            errorType: ErrorTypes.InvalidRequest,
            message: err.message,
        });
    }

    if (err instanceof NotFoundError) {
        return res.status(404).json({
            errorType: err.errorType,
            message: err.message,
        });
    }

    if (err instanceof InvalidCredentialsError) {
        return res.status(401).json({
            errorType: err.errorType,
            message: err.message,
        });
    }

    if (err instanceof InvalidRequestError) {
        return res.status(400).json({
            errorType: err.errorType,
            message: err.message,
        });
    }

    if (err instanceof UnauthorizedError) {
        return res.status(401).json({
            errorType: err.errorType,
            message: err.message,
        });
    }

    if (err instanceof ForbiddenError) {
        return res.status(403).json({
            errorType: err.errorType,
            message: err.message,
        });
    }

    if (err instanceof ConflictError) {
        return res.status(409).json({
            errorType: err.errorType,
            message: err.message,
        });
    }

    if (err instanceof JsonWebTokenError) {
        res.status(401).json({
            errorType: ErrorTypes.Unauthorized,
            message: err.message
        })
    }

    // Fallback for unknown errors
    return res.status(500).json({
        errorType: ErrorTypes.ServerError,
        message: err?.message || 'Internal Server Error',
    });
}
