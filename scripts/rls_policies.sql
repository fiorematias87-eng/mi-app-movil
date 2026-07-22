-- scripts/rls_policies.sql
-- Referencia de políticas RLS para aislamiento multi-tenant en Supabase
-- Ejecutar en el SQL editor de Supabase o en una migración con psql.

BEGIN;

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Política base: cada tenant solo accede a sus propios registros.
-- Requiere que el JWT del usuario traiga el claim `negocio_id`.
CREATE POLICY IF NOT EXISTS productos_tenant_isolation
  ON public.productos
  FOR ALL
  USING (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid)
  WITH CHECK (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid);

CREATE POLICY IF NOT EXISTS shop_config_tenant_isolation
  ON public.shop_config
  FOR ALL
  USING (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid)
  WITH CHECK (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid);

CREATE POLICY IF NOT EXISTS configuracion_tenant_isolation
  ON public.configuracion
  FOR ALL
  USING (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid)
  WITH CHECK (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid);

CREATE POLICY IF NOT EXISTS pedidos_tenant_isolation
  ON public.pedidos
  FOR ALL
  USING (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid)
  WITH CHECK (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid);

CREATE POLICY IF NOT EXISTS perfiles_tenant_isolation
  ON public.perfiles
  FOR ALL
  USING (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid)
  WITH CHECK (negocio_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'negocio_id')::uuid);

-- Opción recomendada para forzar integridad en producción.
-- Ejecutar sólo si la columna negocio_id ya está completa.
-- ALTER TABLE public.productos ALTER COLUMN negocio_id SET NOT NULL;
-- ALTER TABLE public.shop_config ALTER COLUMN negocio_id SET NOT NULL;
-- ALTER TABLE public.configuracion ALTER COLUMN negocio_id SET NOT NULL;
-- ALTER TABLE public.pedidos ALTER COLUMN negocio_id SET NOT NULL;
-- ALTER TABLE public.perfiles ALTER COLUMN negocio_id SET NOT NULL;

-- FKs recomendadas para el aislamiento real.
-- ALTER TABLE public.productos
--   ADD CONSTRAINT productos_negocio_id_fkey
--   FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

-- ALTER TABLE public.shop_config
--   ADD CONSTRAINT shop_config_negocio_id_fkey
--   FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

-- ALTER TABLE public.pedidos
--   ADD CONSTRAINT pedidos_negocio_id_fkey
--   FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

-- ALTER TABLE public.perfiles
--   ADD CONSTRAINT perfiles_negocio_id_fkey
--   FOREIGN KEY (negocio_id) REFERENCES public.negocios(id) ON DELETE CASCADE;

COMMIT;
