# RLS (Row-Level Security) — Pasos para desplegar y verificar

Este documento contiene los pasos recomendados para habilitar RLS por tenant en Postgres (Supabase) y cómo validar la configuración.

Requisitos previos
- Tu esquema debe tener la columna `negocio_id` (tipo `uuid`) en todas las tablas tenant-scoped (ej. `productos`, `pedidos`, `shop_config`).
- Tu flujo de autenticación debe inyectar `negocio_id` en el JWT como `jwt.claims.negocio_id`. En Supabase esto se puede mapear en las reglas de autenticación o mediante un backend que firme tokens.

Pasos para desplegar
1) Ejecutar `db/policies.sql` en el SQL editor de Supabase o mediante `psql` conectado al esquema `public` del proyecto (primero en staging):

```sql
-- En SQL editor: copia y pega el contenido de db/policies.sql y ejecútalo
```

2) Verificar que RLS está habilitado:

```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('productos','pedidos','shop_config');
```

3) Probar la política simulando un claim en sesión (útil en psql o SQL editor):

```sql
-- Establece el claim para la sesión actual
SELECT set_config('jwt.claims.negocio_id', '00000000-0000-0000-0000-000000000000', true);

-- Ejecuta una consulta que debería estar filtrada por el tenant
SELECT * FROM public.productos LIMIT 10;
```

4) Contrastá con un token real en tu app front-end que incluya el claim `negocio_id` y ejecutá operaciones de lectura/escritura para verificar que:
- Los SELECT sólo devuelven filas del tenant.
- Las INSERT / UPDATE / DELETE sólo funcionan si `negocio_id` coincide con el claim (por la cláusula WITH CHECK).

Notas operacionales
- No uses triggers como única defensa. RLS debe ser la capa principal. Los triggers son una capa secundaria opcional.
- Asegurate de que los roles que usan service_role o funciones administrativas no quiebren las políticas (es decir, las funciones que deben ignorar RLS deben usar `SECURITY DEFINER` y ser cuidadosamente controladas).
- Recomendado: habilitar auditoría en Postgres o registrar las operaciones de administrador para revisiones.

Rollback

Si necesitas desactivar RLS temporalmente:

```sql
ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS productos_tenant_isolation ON public.productos;
```

Soporte
- Si desplegás en Supabase, usá el SQL editor del dashboard y probá con la sección 'API' para confirmación adicional.
