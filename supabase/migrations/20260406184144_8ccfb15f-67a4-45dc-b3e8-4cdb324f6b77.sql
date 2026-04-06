
-- 1. Make prescriptions bucket private
UPDATE storage.buckets SET public = false WHERE id = 'prescriptions';

-- 2. Drop the public SELECT policy on prescriptions
DROP POLICY IF EXISTS "Anyone can view prescriptions" ON storage.objects;

-- 3. Add pharmacist-only read policy for prescriptions
CREATE POLICY "Pharmacists can view prescriptions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'prescriptions'
  AND public.has_role(auth.uid(), 'pharmacist')
);

-- 4. Keep authenticated upload policy (already exists, but ensure it's correct)
DROP POLICY IF EXISTS "Authenticated users can upload prescriptions" ON storage.objects;
CREATE POLICY "Authenticated users can upload prescriptions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prescriptions'
  AND auth.role() = 'authenticated'
);

-- 5. Remove the purchaser self-update policy on orders (they should only use process_payment RPC)
DROP POLICY IF EXISTS "Purchasers can update own orders for payment" ON storage.objects;
DROP POLICY IF EXISTS "Purchasers can update own orders for payment" ON public.orders;

-- 6. Trigger: prevent purchasers from setting status to paid/processing/shipped
CREATE OR REPLACE FUNCTION public.validate_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if the caller is a pharmacist
  IF public.has_role(auth.uid(), 'pharmacist') THEN
    RETURN NEW;
  END IF;

  -- Block purchasers from escalating status to paid, processing, or shipped
  IF NEW.status IN ('paid', 'processing', 'shipped') AND 
     (OLD.status IS DISTINCT FROM NEW.status) THEN
    RAISE EXCEPTION 'Only pharmacists or the system can change order status to %', NEW.status;
  END IF;

  -- Block purchasers from changing status at all (they should use process_payment RPC)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'Purchasers cannot modify order status directly';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_order_status_change
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_status_change();

-- 7. Trigger: validate prescription requirement on order insert
CREATE OR REPLACE FUNCTION public.validate_prescription_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_rx_items BOOLEAN;
BEGIN
  -- Check if any items in the order require a prescription
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.medicines m ON m.id = oi.medicine_id
    WHERE oi.order_id = NEW.id
    AND m.requires_prescription = true
  ) INTO _has_rx_items;

  -- If Rx items exist but no prescription URL, reject
  IF _has_rx_items AND (NEW.prescription_url IS NULL OR NEW.prescription_url = '') THEN
    RAISE EXCEPTION 'Orders containing prescription medicines must include a prescription file';
  END IF;

  RETURN NEW;
END;
$$;

-- Use a constraint trigger so order_items are already inserted
CREATE CONSTRAINT TRIGGER enforce_prescription_requirement
AFTER INSERT ON public.orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_prescription_on_order();
