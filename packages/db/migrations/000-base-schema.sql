--
-- PostgreSQL database dump
--

\restrict UUdAPvVNg9WhyM0FU1jK8wn5zKcOn9vxw9LynxVcIbbFCRiXphRFZrw2slNvUFQ

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: location_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.location_type AS ENUM (
    'country',
    'region',
    'city',
    'district',
    'neighborhood'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    name character varying(255),
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amenities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'general'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    icon text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    icon character varying(100),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid,
    participant_ids uuid[] NOT NULL,
    subject character varying(500),
    last_message_at timestamp with time zone,
    last_message_preview text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currencies (
    code character(3) NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    minor_unit smallint DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id text NOT NULL,
    base_code character(3) NOT NULL,
    quote_code character(3) NOT NULL,
    rate numeric(20,10) NOT NULL,
    source text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text,
    phone character varying(20),
    email character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kcca_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kcca_properties (
    object_id bigint NOT NULL,
    camv_id bigint,
    serial_no text,
    house_number text,
    frontage text,
    property_name text,
    division text,
    parish text,
    village text,
    street text,
    payment_status text,
    expiry_date date,
    latitude numeric(10,7),
    longitude numeric(10,7),
    raw jsonb,
    imported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: listing_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    url text NOT NULL,
    thumbnail_url text,
    alt_text character varying(500),
    sort_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    alt text
);


--
-- Name: listing_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_sources (
    code text NOT NULL,
    name text NOT NULL,
    base_url text,
    country_codes character(2)[],
    is_live boolean DEFAULT true NOT NULL,
    is_trusted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    title character varying(500) NOT NULL,
    slug character varying(500) NOT NULL,
    description text,
    type character varying(50) DEFAULT 'property'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    price numeric(12,2),
    currency character varying(3) DEFAULT 'USD'::character varying,
    city character varying(255),
    state character varying(255),
    latitude double precision,
    longitude double precision,
    bedrooms integer,
    bathrooms numeric(3,1),
    square_feet integer,
    property_type character varying(100),
    view_count integer DEFAULT 0,
    favorite_count integer DEFAULT 0,
    average_rating numeric(3,2),
    review_count integer DEFAULT 0,
    ai_tags text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    deleted_at timestamp with time zone,
    main_image_url text,
    image_urls text[] DEFAULT '{}'::text[],
    country character varying(100) DEFAULT 'US'::character varying,
    region character varying(100),
    inquiry_count integer DEFAULT 0,
    source_code text,
    source_listing_id text,
    source_url text,
    last_synced_at timestamp with time zone,
    raw_data jsonb,
    listing_type character varying(32),
    country_code character(2),
    location_id uuid,
    price_period character varying(16),
    price_amount numeric(18,2),
    price_usd_cents numeric(18,2),
    address_line text,
    floor_area_sqm numeric(10,2),
    land_area_sqm numeric(12,2),
    furnishing character varying(16),
    availability character varying(16),
    verification character varying(16) DEFAULT 'unverified'::character varying,
    is_featured boolean DEFAULT false NOT NULL,
    is_seed boolean DEFAULT false NOT NULL,
    video_url text
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    type public.location_type NOT NULL,
    country_code character(2) NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    timezone text DEFAULT 'UTC'::text NOT NULL,
    default_currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    channel text NOT NULL,
    audience text NOT NULL,
    listing_id uuid,
    content text NOT NULL,
    subject text,
    recipient_count integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    opened_count integer DEFAULT 0,
    clicked_count integer DEFAULT 0,
    status text DEFAULT 'queued'::text NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    platform text NOT NULL,
    content text NOT NULL,
    hashtags text[],
    media_urls text[],
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_for timestamp with time zone,
    published_at timestamp with time zone,
    external_url text,
    external_id text,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_preferences (
    user_id uuid NOT NULL,
    auto_generate boolean DEFAULT true NOT NULL,
    auto_schedule boolean DEFAULT false NOT NULL,
    platforms text[] DEFAULT ARRAY['instagram'::text, 'facebook'::text, 'twitter'::text],
    brand_handle text,
    default_hashtags text[] DEFAULT ARRAY['#HavenFinder'::text, '#Uganda'::text, '#RealEstate'::text, '#Kampala'::text],
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) DEFAULT 'in_app'::character varying,
    title character varying(500) NOT NULL,
    body text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    purpose text NOT NULL,
    reference_id uuid,
    provider text NOT NULL,
    provider_reference text,
    amount numeric(18,2) NOT NULL,
    currency character(3) DEFAULT 'UGX'::bpchar NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    tier text NOT NULL,
    price_amount numeric(18,2) NOT NULL,
    currency character(3) DEFAULT 'UGX'::bpchar NOT NULL,
    duration_days integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    payment_provider text,
    payment_reference text,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    token_hash text,
    user_agent text,
    ip_address text
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reporter_id uuid NOT NULL,
    listing_id uuid,
    reason character varying(255),
    description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    rating integer,
    content text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255),
    filters jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    query character varying(500),
    filters jsonb,
    results_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    full_name character varying(255) NOT NULL,
    avatar_url text,
    email_verified boolean DEFAULT false,
    role character varying(50) DEFAULT 'user'::character varying,
    preferences jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    is_banned boolean DEFAULT false,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    phone_e164 text,
    phone_verified_at timestamp with time zone,
    email_verified_at timestamp with time zone,
    country_code character varying(2),
    locale character varying(10) DEFAULT 'en-UG'::character varying,
    timezone character varying(64) DEFAULT 'Africa/Kampala'::character varying,
    preferred_currency character varying(3) DEFAULT 'UGX'::character varying,
    verification character varying(16) DEFAULT 'unverified'::character varying,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'owner'::character varying, 'provider'::character varying, 'admin'::character varying, 'super_admin'::character varying])::text[])))
);


--
-- Name: verification_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    requested_tier text DEFAULT 'basic'::text NOT NULL,
    price_amount numeric(18,2) NOT NULL,
    currency character(3) DEFAULT 'UGX'::bpchar NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_id uuid,
    admin_note text,
    payment_provider text,
    payment_reference text,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    paid_at timestamp with time zone,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: viewing_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viewing_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    preferred_date date NOT NULL,
    preferred_time text NOT NULL,
    message text,
    contact_phone text,
    status text DEFAULT 'pending'::text NOT NULL,
    owner_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Name: _migrations _migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_name_key UNIQUE (name);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: amenities amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT amenities_pkey PRIMARY KEY (id);


--
-- Name: amenities amenities_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT amenities_slug_key UNIQUE (slug);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (code);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, listing_id);


--
-- Name: favorites favorites_user_listing_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_listing_unique UNIQUE (user_id, listing_id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: kcca_properties kcca_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kcca_properties
    ADD CONSTRAINT kcca_properties_pkey PRIMARY KEY (object_id);


--
-- Name: listing_images listing_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_pkey PRIMARY KEY (id);


--
-- Name: listing_sources listing_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_sources
    ADD CONSTRAINT listing_sources_pkey PRIMARY KEY (code);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: listings listings_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_slug_key UNIQUE (slug);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketing_posts marketing_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_posts
    ADD CONSTRAINT marketing_posts_pkey PRIMARY KEY (id);


--
-- Name: marketing_preferences marketing_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_preferences
    ADD CONSTRAINT marketing_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_listing_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_listing_id_reviewer_id_key UNIQUE (listing_id, reviewer_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: search_history search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_requests verification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_pkey PRIMARY KEY (id);


--
-- Name: viewing_requests viewing_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewing_requests
    ADD CONSTRAINT viewing_requests_pkey PRIMARY KEY (id);


--
-- Name: conversations_last_msg_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_last_msg_idx ON public.conversations USING btree (last_message_at DESC NULLS LAST);


--
-- Name: conversations_participants_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_participants_idx ON public.conversations USING gin (participant_ids);


--
-- Name: exchange_rates_pair_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exchange_rates_pair_idx ON public.exchange_rates USING btree (base_code, quote_code, fetched_at);


--
-- Name: favorites_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorites_listing_idx ON public.favorites USING btree (listing_id);


--
-- Name: favorites_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorites_user_idx ON public.favorites USING btree (user_id, created_at DESC);


--
-- Name: idx_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user ON public.favorites USING btree (user_id);


--
-- Name: idx_listings_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_city ON public.listings USING btree (city, state);


--
-- Name: idx_listings_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_price ON public.listings USING btree (price);


--
-- Name: idx_listings_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_slug ON public.listings USING btree (slug);


--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_status ON public.listings USING btree (status);


--
-- Name: idx_listings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_user ON public.listings USING btree (user_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, created_at);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_reviews_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_listing ON public.reviews USING btree (listing_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: kcca_division_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kcca_division_idx ON public.kcca_properties USING btree (division);


--
-- Name: kcca_latlng_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kcca_latlng_idx ON public.kcca_properties USING btree (latitude, longitude);


--
-- Name: kcca_parish_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kcca_parish_idx ON public.kcca_properties USING btree (parish);


--
-- Name: kcca_village_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kcca_village_idx ON public.kcca_properties USING btree (village);


--
-- Name: locations_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_country_idx ON public.locations USING btree (country_code);


--
-- Name: locations_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX locations_parent_idx ON public.locations USING btree (parent_id);


--
-- Name: locations_slug_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX locations_slug_uniq ON public.locations USING btree (country_code, parent_id, slug);


--
-- Name: marketing_campaigns_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_campaigns_status_idx ON public.marketing_campaigns USING btree (status, scheduled_for);


--
-- Name: marketing_posts_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_posts_listing_idx ON public.marketing_posts USING btree (listing_id);


--
-- Name: marketing_posts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_posts_status_idx ON public.marketing_posts USING btree (status, scheduled_for);


--
-- Name: marketing_posts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_posts_user_idx ON public.marketing_posts USING btree (user_id, created_at DESC);


--
-- Name: messages_sender_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_sender_idx ON public.messages USING btree (sender_id, created_at DESC);


--
-- Name: payment_transactions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_transactions_status_idx ON public.payment_transactions USING btree (status);


--
-- Name: payment_transactions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_transactions_user_idx ON public.payment_transactions USING btree (user_id, created_at DESC);


--
-- Name: promotions_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_expiry_idx ON public.promotions USING btree (expires_at) WHERE (status = 'active'::text);


--
-- Name: promotions_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_listing_idx ON public.promotions USING btree (listing_id);


--
-- Name: promotions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_status_idx ON public.promotions USING btree (status);


--
-- Name: promotions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_user_idx ON public.promotions USING btree (user_id, created_at DESC);


--
-- Name: properties_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_country_idx ON public.listings USING btree (country_code);


--
-- Name: properties_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_listing_idx ON public.listings USING btree (listing_type);


--
-- Name: properties_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_location_idx ON public.listings USING btree (location_id);


--
-- Name: properties_price_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_price_idx ON public.listings USING btree (price_usd_cents);


--
-- Name: properties_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_source_idx ON public.listings USING btree (source_code, source_listing_id);


--
-- Name: properties_source_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX properties_source_uniq ON public.listings USING btree (source_code, source_listing_id);


--
-- Name: properties_verification_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_verification_idx ON public.listings USING btree (verification);


--
-- Name: refresh_tokens_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_hash_idx ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_user_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: verification_requests_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_requests_listing_idx ON public.verification_requests USING btree (listing_id);


--
-- Name: verification_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_requests_status_idx ON public.verification_requests USING btree (status);


--
-- Name: viewing_requests_listing_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viewing_requests_listing_idx ON public.viewing_requests USING btree (listing_id);


--
-- Name: viewing_requests_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viewing_requests_owner_idx ON public.viewing_requests USING btree (owner_id, created_at DESC);


--
-- Name: viewing_requests_requester_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viewing_requests_requester_idx ON public.viewing_requests USING btree (requester_id, created_at DESC);


--
-- Name: viewing_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX viewing_requests_status_idx ON public.viewing_requests USING btree (status);


--
-- Name: conversations conversations_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: favorites favorites_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inquiries inquiries_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: inquiries inquiries_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: listing_images listing_images_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: listings listings_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: listings listings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: locations locations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: marketing_campaigns marketing_campaigns_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;


--
-- Name: marketing_campaigns marketing_campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: marketing_posts marketing_posts_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_posts
    ADD CONSTRAINT marketing_posts_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: marketing_posts marketing_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_posts
    ADD CONSTRAINT marketing_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: marketing_preferences marketing_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_preferences
    ADD CONSTRAINT marketing_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: promotions promotions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: saved_searches saved_searches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: search_history search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_history
    ADD CONSTRAINT search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: verification_requests verification_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: verification_requests verification_requests_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: verification_requests verification_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: viewing_requests viewing_requests_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewing_requests
    ADD CONSTRAINT viewing_requests_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: viewing_requests viewing_requests_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewing_requests
    ADD CONSTRAINT viewing_requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: viewing_requests viewing_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viewing_requests
    ADD CONSTRAINT viewing_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict UUdAPvVNg9WhyM0FU1jK8wn5zKcOn9vxw9LynxVcIbbFCRiXphRFZrw2slNvUFQ

