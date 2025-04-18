import { ErrorTypes } from "../consts/errorTypes";

export class InvalidCredentialsError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'InvalidCredentialsError';
        this.errorType = ErrorTypes.InvalidCredentials;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidRequestError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'InvalidRequestError';
        this.errorType = ErrorTypes.InvalidRequest;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class UnauthorizedError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'UnauthorizedError';
        this.errorType = ErrorTypes.Unauthorized;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ForbiddenError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'ForbiddenError';
        this.errorType = ErrorTypes.Forbidden;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
        this.errorType = ErrorTypes.NotFound;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ConflictError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
        this.errorType = ErrorTypes.Conflict;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ServerError extends Error {
    errorType: string;

    constructor(message: string) {
        super(message);
        this.name = 'ServerError';
        this.errorType = ErrorTypes.ServerError;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
