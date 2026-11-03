import { HttpException, HttpStatus } from "@nestjs/common";

export function ok (message: string, data?: any, extra: Record <string, any> = {}){
    return {success: true, message, data, ...extra};
}

export function fail(
    status: HttpStatus,
    message: string,
    extra: Record<string, any> = {},
): never {
    throw new HttpException(
        {success: false, statusCode: status, message, ...extra},
        status,
    );
}