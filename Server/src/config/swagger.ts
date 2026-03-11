export const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'R&M Trucking Backend API',
            version: '1.0.0',
            description: 'API documentation for R&M Trucking Backend',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: [__dirname + '/../swagger/*.yaml'],
};