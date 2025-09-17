-- FINAL SECURITY FIX: Ensure shop_info is completely private
-- The previous test showed that shop_info is still accessible, which means the RLS isn't working as expected

-- Let's check if RLS is actually enabled and fix any issues
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shop_info';