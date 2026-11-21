import { ErrorRequestHandler } from "express";
import { AppError } from "../config/appError.js";
// import jwt from "jsonwebtoken";
// import multer from "multer";

// eslint-disable-next-line
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    console.error(error);

    // Errores propios de la aplicación
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    }

    // Errores multer para un futuro
    // if (error instanceof multer.MulterError) {
    //     if (error.code === "LIMIT_FILE_SIZE") {

    //         return res.status(400).json({
    //             success: false,
    //             error: {
    //                 code: "LIMIT_FILE_SIZE",
    //                 message: `Una de las imágenes es muy pesada. El tamaño máximo permitido es 5MB`,
    //             },
    //         });
    //     }

    //     if (error.code === "LIMIT_UNEXPECTED_FILE") {
    //         return res.status(400).json({
    //             success: false,
    //             error: {
    //                 code: "LIMIT_UNEXPECTED_FILE",
    //                 message: `Excediste la cantidad de imágenes permitidas para subir.`,
    //             },
    //         });
    //     }
    // }


    // Errores de JWT para un futuro
    // if (error instanceof jwt.TokenExpiredError) {
    //     return res.status(401).json({
    //         success: false,
    //         error: {
    //             code: "TOKEN_EXPIRED",
    //             message: "El token ha expirado",
    //         },
    //     });
    // }

    // if (error instanceof jwt.JsonWebTokenError) {
    //     return res.status(401).json({
    //         success: false,
    //         error: {
    //             code: "INVALID_TOKEN",
    //             message: "El token no es válido",
    //         },
    //     });
    // }

    // Error desconocido
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        },
    });
};