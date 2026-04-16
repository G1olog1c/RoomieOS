CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.flats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.flat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID REFERENCES public.flats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    last_seen_expenses TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_seen_shopping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(flat_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID REFERENCES public.flats(id) ON DELETE CASCADE,
    payer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    title TEXT NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'Zakupy',
    -- For Smart Settlement: list of expense IDs that were consolidated in the run
    source_expense_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Smart Settlement / Historia Rozliczeń - dodatkowe pola w expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_type TEXT NOT NULL DEFAULT 'Zakupy';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS source_expense_ids UUID[];

CREATE TABLE IF NOT EXISTS public.chores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID REFERENCES public.flats(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID REFERENCES public.flats(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.flats FOR ALL TO authenticated USING (true);
CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.flat_members FOR ALL TO authenticated USING (true);
CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.expense_splits FOR ALL TO authenticated USING (true);
CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.chores FOR ALL TO authenticated USING (true);
CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.notes FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flat_id UUID REFERENCES public.flats(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zezwól na wszystko autoryzowanym" ON public.shopping_items FOR ALL TO authenticated USING (true);

-- RPC: profile list for flat members (Dashboard / UI)
DROP FUNCTION IF EXISTS public.get_flat_members_profiles(UUID);

CREATE FUNCTION public.get_flat_members_profiles(p_flat_id UUID)
RETURNS TABLE (
    user_id UUID,
    role TEXT,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    fm.user_id,
    fm.role,
    au.email,
    au.raw_user_meta_data->>'display_name' AS display_name,
    au.raw_user_meta_data->>'avatar_url' AS avatar_url
  FROM public.flat_members fm
  JOIN auth.users au ON au.id = fm.user_id
  WHERE fm.flat_id = p_flat_id;
$$;

-- Backendowe reguły walidacji (Check Constraints)

-- 1. Mieszkania (Flats)
ALTER TABLE public.flats ADD CONSTRAINT check_flat_name_not_empty CHECK (trim(name) != '');
ALTER TABLE public.flats ADD CONSTRAINT check_invite_code_length CHECK (char_length(invite_code) = 6);

-- 2. Wydatki (Expenses)
ALTER TABLE public.expenses ADD CONSTRAINT check_expense_title_not_empty CHECK (trim(title) != '');
ALTER TABLE public.expenses ADD CONSTRAINT check_expense_amount_positive CHECK (amount > 0);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS check_expense_type_valid;
ALTER TABLE public.expenses ADD CONSTRAINT check_expense_type_valid CHECK (expense_type IN ('Zakupy','Rachunki','Inne'));
ALTER TABLE public.expense_splits ADD CONSTRAINT check_split_amount_positive CHECK (amount > 0);

-- 3. Zakupy (Shopping Items)
ALTER TABLE public.shopping_items ADD CONSTRAINT check_shopping_title_not_empty CHECK (trim(title) != '');

-- 4. Obowiązki (Chores) i Notatki (Notes)
ALTER TABLE public.chores ADD CONSTRAINT check_chore_title_not_empty CHECK (trim(title) != '');
ALTER TABLE public.notes ADD CONSTRAINT check_note_content_not_empty CHECK (trim(content) != '');
