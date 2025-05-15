# Open Canvas

Una plataforma colaborativa para compartir imágenes en comunidad, con rotación de una imagen destacada a la vez.

## Características

- **Compartir imágenes**: Una imagen por usuario al día, con opciones para recortar y rotar
- **Rotación automática**: Cambio periódico de la imagen destacada
- **Sistema de favoritos**: Los administradores pueden destacar imágenes para rotación futura
- **Administración**: Panel para gestionar imágenes (eliminar, reencolar, marcar favoritos)
- **Autenticación**: Login con Google
- **Tecnologías**:
    - Frontend: React, Vite, TypeScript
    - Backend: Node.js, Express, Prisma, PostgreSQL
    - Almacenamiento: S3 (compatible)
    - Despliegue: Docker y Docker Compose

## Instalación

### Desarrollo

1. **Clonar repositorio**
     ```bash
     git clone https://github.com/tuusuario/open-canvas.git
     cd open-canvas
     ```

2. **Configurar variables de entorno**
     - Copiar y editar `.env` en las carpetas `backend/` y `frontend/`

3. **Iniciar con Docker Compose**
     ```bash
     docker-compose up --build
     ```
     - Frontend: http://localhost:5173
     - API: http://localhost:4000

### Producción

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## Configuración

- **Administrador**: Definir `ADMIN_EMAIL` en ambos archivos `.env`
- **S3**: Configurar credenciales y bucket en las variables del backend
- **Google OAuth**: Registrar app en Google Cloud y configurar `GOOGLE_CLIENT_ID`

## Scripts

### Backend
- `npm run dev`: Desarrollo con hot reload
- `npm run build`: Compilar TypeScript
- `npm start`: Ejecutar backend compilado

### Frontend
- `npm run dev`: Desarrollo con hot reload
- `npm run build`: Compilar para producción
- `npm run preview`: Previsualizar build

## Estructura

```
open-paper/
    ├─ backend/
    │   ├─ src/
    │   ├─ prisma/
    │   ├─ dockerfile
    │   ├─ dockerfile.prod
    │   └─ package.json
    ├─ frontend/
    │   ├─ src/
    │   ├─ dockerfile
    │   ├─ dockerfile.prod
    │   └─ package.json
    ├─ docker-compose.yml
    └─ docker-compose.prod.yml
```

## Licencia

MIT