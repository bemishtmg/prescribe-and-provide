
CREATE OR REPLACE FUNCTION public.reset_user_balance(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only pharmacists can reset balances
  IF NOT public.has_role(auth.uid(), 'pharmacist') THEN
    RAISE EXCEPTION 'Unauthorized: only pharmacists can reset balances';
  END IF;

  UPDATE public.profiles SET balance = 1000 WHERE user_id = _user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN TRUE;
END;
$$;
