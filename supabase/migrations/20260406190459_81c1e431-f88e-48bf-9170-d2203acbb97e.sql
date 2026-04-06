
-- Add type column and make order_id nullable
ALTER TABLE public.transactions 
  ADD COLUMN type text NOT NULL DEFAULT 'debit',
  ALTER COLUMN order_id DROP NOT NULL;

-- Update reset_user_balance to log a credit transaction
CREATE OR REPLACE FUNCTION public.reset_user_balance(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_balance numeric;
  _credit_amount numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'pharmacist') THEN
    RAISE EXCEPTION 'Unauthorized: only pharmacists can reset balances';
  END IF;

  SELECT balance INTO _current_balance FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  _credit_amount := 1000 - _current_balance;

  UPDATE public.profiles SET balance = 1000 WHERE user_id = _user_id;

  -- Log the credit transaction
  IF _credit_amount > 0 THEN
    INSERT INTO public.transactions (user_id, order_id, amount, type)
    VALUES (_user_id, NULL, _credit_amount, 'credit');
  END IF;

  RETURN TRUE;
END;
$$;
