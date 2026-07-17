-- Migration: 006_add_ratings_reviews_approval_fields
-- Description: Add approval workflow fields to ratings and reviews tables
-- Date: 2025-12-20

-- Add columns to ratings table
DO $$ 
BEGIN
    -- Add transactionId column (UUID to match transactions.id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'transactionId'
    ) THEN
        ALTER TABLE public.ratings ADD COLUMN "transactionId" UUID;
    END IF;
    
    -- Add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.ratings ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    -- Add rejectionReason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'rejectionReason'
    ) THEN
        ALTER TABLE public.ratings ADD COLUMN "rejectionReason" TEXT;
    END IF;
    
    -- Add approvedBy column (UUID to match users.id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'approvedBy'
    ) THEN
        ALTER TABLE public.ratings ADD COLUMN "approvedBy" UUID;
    END IF;
    
    -- Add approvedAt column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ratings' AND column_name = 'approvedAt'
    ) THEN
        ALTER TABLE public.ratings ADD COLUMN "approvedAt" TIMESTAMPTZ;
    END IF;
END $$;

-- Add foreign key constraint for transactionId in ratings (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ratings_transactionId_fkey' 
        AND table_name = 'ratings'
    ) THEN
        ALTER TABLE public.ratings 
        ADD CONSTRAINT ratings_transactionId_fkey 
        FOREIGN KEY ("transactionId") 
        REFERENCES public.transactions(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for approvedBy in ratings (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ratings_approvedBy_fkey' 
        AND table_name = 'ratings'
    ) THEN
        ALTER TABLE public.ratings 
        ADD CONSTRAINT ratings_approvedBy_fkey 
        FOREIGN KEY ("approvedBy") 
        REFERENCES public.users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add columns to reviews table
DO $$ 
BEGIN
    -- Add transactionId column (UUID to match transactions.id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'transactionId'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN "transactionId" UUID;
    END IF;
    
    -- Add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    -- Add rejectionReason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'rejectionReason'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN "rejectionReason" TEXT;
    END IF;
    
    -- Add approvedBy column (UUID to match users.id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'approvedBy'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN "approvedBy" UUID;
    END IF;
    
    -- Add approvedAt column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'approvedAt'
    ) THEN
        ALTER TABLE public.reviews ADD COLUMN "approvedAt" TIMESTAMPTZ;
    END IF;
END $$;

-- Add foreign key constraint for transactionId in reviews (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_transactionId_fkey' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_transactionId_fkey 
        FOREIGN KEY ("transactionId") 
        REFERENCES public.transactions(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for approvedBy in reviews (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_approvedBy_fkey' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_approvedBy_fkey 
        FOREIGN KEY ("approvedBy") 
        REFERENCES public.users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Update existing ratings/reviews to approved status (for backward compatibility)
UPDATE public.ratings SET status = 'approved' WHERE status IS NULL OR status = '';
UPDATE public.reviews SET status = 'approved' WHERE status IS NULL OR status = '';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_transaction_id ON public.ratings("transactionId");
CREATE INDEX IF NOT EXISTS idx_ratings_status ON public.ratings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction_id ON public.reviews("transactionId");
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

