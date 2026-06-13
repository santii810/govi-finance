# ADR-0001: Todos los servicios con Docker

## Estado
Aceptado

## Contexto
El proyecto despliega NocoDB y en el futuro la aplicación web y posibles servicios auxiliares.

## Decisión
**Todo servicio del proyecto se levanta y opera mediante Docker** (Docker Compose como mínimo).

## Consecuencias
- `infra/docker-compose.yml` es la fuente de verdad de infraestructura.
- Nuevos servicios (front en dev, proxy, auth, etc.) se añaden como servicios compose.
- No se asumen instalaciones locales de runtimes como requisito para el usuario.

## Alternativas descartadas
- Instalación nativa de dependencias en el host.
