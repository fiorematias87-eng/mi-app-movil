-- db/policies.sql
-- Políticas RLS y snippets recomendados para aislamiento multitenant (productos, pedidos, shop_config)
-- ADVERTENCIA: revisá y ejecutá en staging antes de producción.

-- 1) Habilitar RLS en tablas tenant-scoped
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_config ENABLE ROW LEVEL SECURITY;

-- 2) Política principal basada en el claim `negocio_id` del JWT
-- Requiere que la autenticación inyecte `negocio_id` en `jwt.claims.negocio_id`
CREATE POLICY productos_tenant_isolation
  ON public.productos
  FOR ALL
  USING (negocio_id = (current_setting('jwt.claims.negocio_id')::uuid))
  WITH CHECK (negocio_id = (current_setting('jwt.claims.negocio_id')::uuid));

CREATE POLICY pedidos_tenant_isolation
  ON public.pedidos
  FOR ALL
  USING (negocio_id = (current_setting('jwt.claims.negocio_id')::uuid))
  WITH CHECK (negocio_id = (current_setting('jwt.claims.negocio_id')::uuid));

CREATE POLICY shop_config_tenant_isolation
  ON public.shop_config
  FOR ALL
  USING (negocio_id = (current_setting('jwt.claims.negocio_id')::uuid))
  WITH CHECK (negocio_id = (current_setting('jwt.claims.negocio_id')::uuid));

-- 3) (Opcional) Asegurar la columna y FK — ejecutar sólo si todos los registros ya tienen negocio_id válido
-- ALTER TABLE public.productos ALTER COLUMN negocio_id SET NOT NULL;
-- ALTER TABLE public.productos
--   ADD CONSTRAINT productos_fk_negocio FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

-- 4) (Opcional) Trigger que inyecta negocio_id desde el claim cuando viene NULL
-- Use con precaución: esto no sustituye a RLS y requiere permisos adecuados (SECURITY DEFINER).
-- CREATE OR REPLACE FUNCTION set_negocio_id_from_jwt()
-- RETURNS trigger AS $$
-- BEGIN
--   IF NEW.negocio_id IS NULL THEN
--     NEW.negocio_id := current_setting('jwt.claims.negocio_id')::uuid;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER set_negocio_id_before_insert
-- BEFORE INSERT ON public.productos
-- FOR EACH ROW EXECUTE FUNCTION set_negocio_id_from_jwt();

-- 5) Comandos de prueba (ejecutar en SQL editor de Supabase o psql)
-- Simular claim en sesión (útil para pruebas en psql):
-- SELECT set_config('jwt.claims.negocio_id', 'PUT-TEST-UUID-HERE', true);
-- Luego:
-- SELECT * FROM public.productos;

-- 6) Rollback (si es necesario)
-- ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS productos_tenant_isolation ON public.productos;

-- Nota: adaptar nombres de tablas/columnas según tu esquema real.
