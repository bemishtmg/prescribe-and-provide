
-- 1. Add balance column to profiles
ALTER TABLE public.profiles ADD COLUMN balance numeric NOT NULL DEFAULT 1000;

-- 2. Create transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Purchasers see own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Only system (security definer functions) inserts transactions
-- No direct insert policy needed; process_payment handles it

-- Pharmacists can view all transactions
CREATE POLICY "Pharmacists can view all transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'pharmacist'));

-- 3. Replace process_payment to use wallet
CREATE OR REPLACE FUNCTION public.process_payment(order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _item RECORD;
  _balance numeric;
BEGIN
  -- Get order and verify status
  SELECT * INTO _order FROM public.orders WHERE id = order_id AND status = 'awaiting_payment';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not awaiting payment';
  END IF;

  -- Verify the caller is the purchaser
  IF _order.purchaser_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check balance
  SELECT balance INTO _balance FROM public.profiles WHERE user_id = auth.uid();
  IF _balance < _order.total_price THEN
    RAISE EXCEPTION 'Insufficient funds. Your balance is $% but the order costs $%', _balance, _order.total_price;
  END IF;

  -- Deduct balance
  UPDATE public.profiles SET balance = balance - _order.total_price WHERE user_id = auth.uid();

  -- Deduct stock for each item
  FOR _item IN SELECT * FROM public.order_items WHERE order_items.order_id = process_payment.order_id
  LOOP
    UPDATE public.medicines
    SET stock_level = stock_level - _item.quantity
    WHERE id = _item.medicine_id AND stock_level >= _item.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for medicine %', _item.medicine_id;
    END IF;
  END LOOP;

  -- Update order status
  UPDATE public.orders SET status = 'paid' WHERE id = order_id;

  -- Log transaction
  INSERT INTO public.transactions (user_id, order_id, amount)
  VALUES (auth.uid(), order_id, _order.total_price);

  RETURN TRUE;
END;
$$;
