/*
  # WhatsApp Broadcast Scheduler Schema

  ## Overview
  Complete database schema for WhatsApp broadcast scheduling system for local businesses.

  ## 1. New Tables

  ### `business_profiles`
  Business account information
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key to auth.users) - Account owner
  - `business_name` (text) - Business name
  - `whatsapp_number` (text) - WhatsApp Business number
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `contacts`
  Contact/customer information
  - `id` (uuid, primary key) - Unique identifier
  - `business_id` (uuid, foreign key) - Associated business
  - `name` (text) - Contact name
  - `phone` (text) - WhatsApp phone number
  - `tags` (text[]) - Array of tags for segmentation
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Contact added timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `contact_lists`
  Segmented lists for targeted broadcasts
  - `id` (uuid, primary key) - Unique identifier
  - `business_id` (uuid, foreign key) - Associated business
  - `name` (text) - List name
  - `description` (text) - List description
  - `created_at` (timestamptz) - List creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `list_contacts`
  Many-to-many relationship between lists and contacts
  - `list_id` (uuid, foreign key) - Associated list
  - `contact_id` (uuid, foreign key) - Associated contact
  - `added_at` (timestamptz) - When contact was added to list
  - Primary key: (list_id, contact_id)

  ### `broadcasts`
  Scheduled broadcast messages
  - `id` (uuid, primary key) - Unique identifier
  - `business_id` (uuid, foreign key) - Associated business
  - `list_id` (uuid, foreign key) - Target list
  - `message` (text) - Message content
  - `scheduled_at` (timestamptz) - When to send
  - `status` (text) - draft/scheduled/sending/completed/failed
  - `sent_count` (integer) - Number of messages sent
  - `failed_count` (integer) - Number of failed sends
  - `created_at` (timestamptz) - Broadcast creation timestamp
  - `completed_at` (timestamptz) - When broadcast finished

  ### `message_analytics`
  Click tracking and engagement metrics
  - `id` (uuid, primary key) - Unique identifier
  - `broadcast_id` (uuid, foreign key) - Associated broadcast
  - `contact_id` (uuid, foreign key) - Recipient
  - `sent_at` (timestamptz) - When message was sent
  - `delivered` (boolean) - Delivery status
  - `link_clicks` (integer) - Number of link clicks
  - `last_clicked_at` (timestamptz) - Last click timestamp

  ## 2. Security

  All tables have Row Level Security (RLS) enabled with policies that:
  - Restrict access to authenticated users only
  - Ensure users can only access data for their own business
  - Prevent unauthorized data access or modification

  ## 3. Indexes

  Performance indexes added for:
  - Contact lookups by business
  - List associations
  - Broadcast scheduling queries
  - Analytics aggregation
*/

-- Create business_profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name text NOT NULL,
  whatsapp_number text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business profile"
  ON business_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own business profile"
  ON business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business profile"
  ON business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own business profile"
  ON business_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  tags text[] DEFAULT '{}',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(business_id, phone)
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts for own business"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Create contact_lists table
CREATE TABLE IF NOT EXISTS contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business lists"
  ON contact_lists FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lists for own business"
  ON contact_lists FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business lists"
  ON contact_lists FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business lists"
  ON contact_lists FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Create list_contacts junction table
CREATE TABLE IF NOT EXISTS list_contacts (
  list_id uuid REFERENCES contact_lists(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (list_id, contact_id)
);

ALTER TABLE list_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business list contacts"
  ON list_contacts FOR SELECT
  TO authenticated
  USING (
    list_id IN (
      SELECT id FROM contact_lists WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add contacts to own business lists"
  ON list_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    list_id IN (
      SELECT id FROM contact_lists WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can remove contacts from own business lists"
  ON list_contacts FOR DELETE
  TO authenticated
  USING (
    list_id IN (
      SELECT id FROM contact_lists WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE NOT NULL,
  list_id uuid REFERENCES contact_lists(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  sent_count integer DEFAULT 0 NOT NULL,
  failed_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed'))
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business broadcasts"
  ON broadcasts FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create broadcasts for own business"
  ON broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own business broadcasts"
  ON broadcasts FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own business broadcasts"
  ON broadcasts FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Create message_analytics table
CREATE TABLE IF NOT EXISTS message_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,
  delivered boolean DEFAULT false NOT NULL,
  link_clicks integer DEFAULT 0 NOT NULL,
  last_clicked_at timestamptz
);

ALTER TABLE message_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for own business broadcasts"
  ON message_analytics FOR SELECT
  TO authenticated
  USING (
    broadcast_id IN (
      SELECT id FROM broadcasts WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create analytics for own business broadcasts"
  ON message_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    broadcast_id IN (
      SELECT id FROM broadcasts WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update analytics for own business broadcasts"
  ON message_analytics FOR UPDATE
  TO authenticated
  USING (
    broadcast_id IN (
      SELECT id FROM broadcasts WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    broadcast_id IN (
      SELECT id FROM broadcasts WHERE business_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contact_lists_business_id ON contact_lists(business_id);
CREATE INDEX IF NOT EXISTS idx_list_contacts_list_id ON list_contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_list_contacts_contact_id ON list_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_business_id ON broadcasts(business_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_at ON broadcasts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_message_analytics_broadcast_id ON message_analytics(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_contact_id ON message_analytics(contact_id);
