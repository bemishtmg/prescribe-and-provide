
-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending_validation', 'awaiting_payment', 'paid', 'processing', 'shipped', 'rejected');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('pharmacist', 'purchaser');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create medicines table
CREATE TABLE public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
    requires_prescription BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchaser_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status order_status NOT NULL DEFAULT 'pending_validation',
    prescription_url TEXT,
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create order_items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase NUMERIC(10,2) NOT NULL CHECK (price_at_purchase >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create prescriptions storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', true);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get current user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- user_roles: users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- medicines: everyone can read, only pharmacists can modify
CREATE POLICY "Anyone can view medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Pharmacists can insert medicines" ON public.medicines FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Pharmacists can update medicines" ON public.medicines FOR UPDATE USING (public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Pharmacists can delete medicines" ON public.medicines FOR DELETE USING (public.has_role(auth.uid(), 'pharmacist'));

-- orders: purchasers see own orders, pharmacists see all
CREATE POLICY "Purchasers can view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = purchaser_id OR public.has_role(auth.uid(), 'pharmacist')
);
CREATE POLICY "Purchasers can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = purchaser_id);
CREATE POLICY "Pharmacists can update orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Purchasers can update own orders for payment" ON public.orders FOR UPDATE USING (auth.uid() = purchaser_id);

-- order_items: same visibility as orders
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id
    AND (orders.purchaser_id = auth.uid() OR public.has_role(auth.uid(), 'pharmacist'))
  )
);
CREATE POLICY "Purchasers can insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.purchaser_id = auth.uid()
  )
);

-- Storage policies for prescriptions
CREATE POLICY "Anyone can view prescriptions" ON storage.objects FOR SELECT USING (bucket_id = 'prescriptions');
CREATE POLICY "Authenticated users can upload prescriptions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- Function to process payment and deduct stock (transaction)
CREATE OR REPLACE FUNCTION public.process_payment(order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order RECORD;
  _item RECORD;
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

  RETURN TRUE;
END;
$$;
