-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: generate_user_code("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."generate_user_code"("p_role" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_prefix text;
  v_seq    int;
BEGIN
  v_prefix := CASE p_role
    WHEN 'superadmin' THEN 'SA'
    WHEN 'admin'      THEN 'ADM'
    WHEN 'manager'    THEN 'MGR'
    WHEN 'backoffice' THEN 'BO'
    WHEN 'engineer'   THEN 'ENG'
    WHEN 'customer'   THEN 'CUS'
    ELSE 'USR'
  END;
  SELECT COALESCE(MAX(
    CASE WHEN employee_code ~ ('^' || v_prefix || '-[0-9]+$')
    THEN CAST(SUBSTRING(employee_code FROM LENGTH(v_prefix)+2) AS int)
    ELSE 0 END
  ), 0) + 1
  INTO v_seq
  FROM public.app_users;
  RETURN v_prefix || '-' || LPAD(v_seq::text, 4, '0');
END;
$_$;


--
-- Name: get_task_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."get_task_stats"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT jsonb_build_object(
    'today_total',       COUNT(*) FILTER (WHERE expected_visit_date = CURRENT_DATE),
    'pending',           COUNT(*) FILTER (WHERE status = 'Pending'),
    'completed_today',   COUNT(*) FILTER (WHERE status = 'Completed'
                           AND DATE(updated_at AT TIME ZONE 'UTC') = CURRENT_DATE),
    'overdue',           COUNT(*) FILTER (WHERE expected_visit_date < CURRENT_DATE
                           AND status NOT IN ('Completed','Closed','Cancelled')),
    'emergency',         COUNT(*) FILTER (WHERE priority = 'Emergency'
                           AND status NOT IN ('Completed','Closed','Cancelled')),
    'waiting_parts',     COUNT(*) FILTER (WHERE status = 'Waiting Parts'),
    'waiting_customer',  COUNT(*) FILTER (WHERE status = 'Waiting Customer')
  )
  FROM tasks
  WHERE status != 'Cancelled';
$$;


--
-- Name: next_amc_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."next_amc_number"() RETURNS "text"
    LANGUAGE "sql"
    AS $$
  SELECT 'AMC-' || LPAD(nextval('amc_code_seq')::text, 6, '0');
$$;


--
-- Name: next_asset_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."next_asset_code"() RETURNS "text"
    LANGUAGE "sql"
    AS $$
  SELECT 'ASSET-' || LPAD(nextval('asset_code_seq')::text, 6, '0');
$$;


--
-- Name: next_customer_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."next_customer_code"() RETURNS "text"
    LANGUAGE "sql"
    AS $$
  SELECT 'CUST-' || LPAD(nextval('cust_code_seq')::text, 6, '0');
$$;


--
-- Name: next_task_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."next_task_number"() RETURNS "text"
    LANGUAGE "sql"
    AS $$
  SELECT 'TASK-' || LPAD(nextval('task_code_seq')::text, 6, '0');
$$;


--
-- Name: search_assets("text", "text", "text", "text", integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."search_assets"("p_customer_id" "text" DEFAULT NULL::"text", "p_query" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 25) RETURNS TABLE("id" "text", "code" "text", "asset_number" "text", "customer_id" "text", "category" "text", "device_type" "text", "brand" "text", "model" "text", "serial_number" "text", "location" "text", "department" "text", "assigned_user" "text", "ip_address" "text", "mac_address" "text", "status" "text", "specifications" "jsonb", "custom_fields" "jsonb", "qr_code" "text", "warranty_expiry" "date", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_offset integer := (p_page - 1) * p_page_size;
  v_total  bigint;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM assets a
  WHERE (p_customer_id IS NULL OR a.customer_id = p_customer_id)
    AND (p_category    IS NULL OR a.category    = p_category)
    AND (p_status      IS NULL OR a.status      = p_status)
    AND (a.deleted_at  IS NULL)
    AND (
      p_query IS NULL OR
      a.code            ILIKE '%' || p_query || '%' OR
      a.asset_number    ILIKE '%' || p_query || '%' OR
      a.serial_number   ILIKE '%' || p_query || '%' OR
      a.brand           ILIKE '%' || p_query || '%' OR
      a.model           ILIKE '%' || p_query || '%' OR
      a.device_type     ILIKE '%' || p_query || '%' OR
      a.location        ILIKE '%' || p_query || '%' OR
      a.department      ILIKE '%' || p_query || '%' OR
      a.assigned_user   ILIKE '%' || p_query || '%' OR
      (a.specifications->>'ip_address')  ILIKE '%' || p_query || '%' OR
      (a.specifications->>'mac_address') ILIKE '%' || p_query || '%' OR
      a.notes           ILIKE '%' || p_query || '%'
    );

  RETURN QUERY
  SELECT
    a.id::text,
    a.code::text,
    a.asset_number::text,
    a.customer_id::text,
    a.category::text,
    a.device_type::text,
    a.brand::text,
    a.model::text,
    a.serial_number::text,
    a.location::text,
    a.department::text,
    a.assigned_user::text,
    (a.specifications->>'ip_address')::text,
    (a.specifications->>'mac_address')::text,
    a.status::text,
    a.specifications,
    COALESCE(a.custom_fields, '{}'::jsonb),
    a.qr_code::text,
    a.warranty_expiry,
    a.created_at,
    v_total
  FROM assets a
  WHERE (p_customer_id IS NULL OR a.customer_id = p_customer_id)
    AND (p_category    IS NULL OR a.category    = p_category)
    AND (p_status      IS NULL OR a.status      = p_status)
    AND (a.deleted_at  IS NULL)
    AND (
      p_query IS NULL OR
      a.code            ILIKE '%' || p_query || '%' OR
      a.asset_number    ILIKE '%' || p_query || '%' OR
      a.serial_number   ILIKE '%' || p_query || '%' OR
      a.brand           ILIKE '%' || p_query || '%' OR
      a.model           ILIKE '%' || p_query || '%' OR
      a.device_type     ILIKE '%' || p_query || '%' OR
      a.location        ILIKE '%' || p_query || '%' OR
      a.department      ILIKE '%' || p_query || '%' OR
      a.assigned_user   ILIKE '%' || p_query || '%' OR
      (a.specifications->>'ip_address')  ILIKE '%' || p_query || '%' OR
      (a.specifications->>'mac_address') ILIKE '%' || p_query || '%' OR
      a.notes           ILIKE '%' || p_query || '%'
    )
  ORDER BY a.code
  LIMIT p_page_size OFFSET v_offset;
END;
$$;


--
-- Name: amc_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS "public"."amc_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: amc_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."amc_documents" (
    "id" "text" DEFAULT ('adoc_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "amc_id" "text" NOT NULL,
    "document_type" "text" DEFAULT 'Supporting Files'::"text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer DEFAULT 0 NOT NULL,
    "url" "text" NOT NULL,
    "uploaded_by" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: amc_renewals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."amc_renewals" (
    "id" "text" DEFAULT ('arenewal_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "amc_id" "text" NOT NULL,
    "previous_end_date" "date" NOT NULL,
    "new_end_date" "date" NOT NULL,
    "renewed_by" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: amc_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."amc_timeline" (
    "id" "text" DEFAULT ('atl_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "amc_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "old_value" "text",
    "new_value" "text",
    "performed_by" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: amc_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."amc_visits" (
    "id" "text" DEFAULT ('avisit_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "amc_id" "text" NOT NULL,
    "visit_number" integer DEFAULT 1 NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "task_id" "text",
    "completed_date" "date",
    "engineer_id" "text",
    "engineer_name" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: amcs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."amcs" (
    "id" "text" DEFAULT ('amc_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "amc_number" "text" NOT NULL,
    "customer_id" "text" NOT NULL,
    "customer_name" "text" DEFAULT ''::"text" NOT NULL,
    "contract_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "visit_frequency" "text" DEFAULT 'Quarterly'::"text" NOT NULL,
    "number_of_included_visits" integer DEFAULT 4 NOT NULL,
    "sla_response_time" "text" DEFAULT ''::"text" NOT NULL,
    "sla_resolution_time" "text" DEFAULT ''::"text" NOT NULL,
    "working_hours" "text",
    "holiday_rules" "text",
    "labour_included" boolean DEFAULT true NOT NULL,
    "travel_included" boolean DEFAULT false NOT NULL,
    "emergency_support_included" boolean DEFAULT false NOT NULL,
    "remote_support_included" boolean DEFAULT false NOT NULL,
    "included_services" "text",
    "excluded_services" "text",
    "covered_parts" "text",
    "excluded_parts" "text",
    "covered_asset_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "remarks" "text",
    "created_by" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "id" "text" DEFAULT ('usr_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT 'engineer'::"text" NOT NULL,
    "employee_code" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "department" "text",
    "designation" "text",
    "mobile" "text",
    "profile_photo" "text",
    "require_password_change" boolean DEFAULT false NOT NULL,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "text" DEFAULT 'sectore-001'::"text" NOT NULL,
    "avatar_url" "text",
    "customer_id" "text"
);


--
-- Name: COLUMN "app_users"."customer_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."app_users"."customer_id" IS 'Links this user account to a customers row. Set for role=customer users.';


--
-- Name: application_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."application_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "group_name" "text" DEFAULT 'general'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: asset_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS "public"."asset_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_custom_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."asset_custom_fields" (
    "id" "text" DEFAULT ('acf_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "category" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "field_options" "jsonb",
    "is_required" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: asset_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."asset_history" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "asset_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "field_name" "text",
    "old_value" "text",
    "new_value" "text",
    "performed_by" "text" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


--
-- Name: asset_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."asset_relationships" (
    "id" "text" DEFAULT ('ar_'::"text" || "gen_random_uuid"()) NOT NULL,
    "parent_id" "text" NOT NULL,
    "child_id" "text" NOT NULL,
    "relationship" "text" DEFAULT 'child'::"text" NOT NULL,
    "created_by" "text" DEFAULT 'system'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: asset_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."asset_templates" (
    "id" "text" DEFAULT ('at_'::"text" || "gen_random_uuid"()) NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "device_type" "text" NOT NULL,
    "brand" "text",
    "model" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "text" DEFAULT 'system'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: asset_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."asset_timeline" (
    "id" "text" DEFAULT ('tl_'::"text" || "gen_random_uuid"()) NOT NULL,
    "asset_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "performed_by" "text",
    "event_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_id" "text",
    "reference_type" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "text" DEFAULT 'system'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "text" DEFAULT ('asset_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "code" "text" NOT NULL,
    "customer_id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "device_type" "text" NOT NULL,
    "brand" "text",
    "model" "text",
    "serial_number" "text" DEFAULT ''::"text" NOT NULL,
    "asset_tag" "text",
    "location" "text",
    "floor_building" "text",
    "installation_date" "date",
    "purchase_date" "date",
    "warranty_expiry" "date",
    "vendor_name" "text",
    "vendor_contact" "text",
    "condition" "text" DEFAULT 'Good'::"text" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "notes" "text",
    "specifications" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text" DEFAULT ''::"text" NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "text",
    "delete_reason" "text",
    "assigned_user" "text",
    "custom_fields" "jsonb",
    "warranty_start" "date",
    "department" "text",
    "username" "text",
    "password" "text",
    "asset_number" "text",
    "qr_code" "text",
    "barcode" "text",
    "template_id" "text",
    "parent_id" "text"
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "file_size" bigint,
    "storage_path" "text" NOT NULL,
    "public_url" "text",
    "category" "text",
    "uploaded_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "text" DEFAULT ('att_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "engineer_id" "text" NOT NULL,
    "engineer_name" "text" DEFAULT ''::"text" NOT NULL,
    "date" "date" NOT NULL,
    "check_in_time" timestamp with time zone,
    "check_out_time" timestamp with time zone,
    "check_in_location" "text",
    "check_out_location" "text",
    "check_in_lat" numeric,
    "check_in_lng" numeric,
    "check_out_lat" numeric,
    "check_out_lng" numeric,
    "status" "text" DEFAULT 'Present'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "working_hours" numeric,
    "selfie_photo_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "text",
    "app_user_id" "text"
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "text" DEFAULT ('audit_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "text" DEFAULT ''::"text" NOT NULL,
    "user_name" "text" DEFAULT ''::"text" NOT NULL,
    "user_role" "text" DEFAULT ''::"text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "text" DEFAULT '—'::"text" NOT NULL,
    "resource" "text" DEFAULT ''::"text" NOT NULL,
    "resource_id" "text",
    "old_value" "text",
    "new_value" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "metadata" "jsonb"
);


--
-- Name: bikes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."bikes" (
    "id" "text" DEFAULT ('bike_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "registration_number" "text" NOT NULL,
    "make" "text" DEFAULT ''::"text" NOT NULL,
    "model" "text" DEFAULT ''::"text" NOT NULL,
    "color" "text",
    "year" integer,
    "assigned_engineer_id" "text",
    "fuel_type" "text" DEFAULT 'Petrol'::"text" NOT NULL,
    "service_due_date" "date",
    "insurance_expiry_date" "date",
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "initial_odometer" numeric DEFAULT 0 NOT NULL,
    "average_mileage" numeric DEFAULT 0 NOT NULL,
    "puc_expiry_date" "date",
    "current_odometer" numeric DEFAULT 0 NOT NULL,
    "assigned_engineer_name" "text"
);


--
-- Name: catalog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."catalog_categories" (
    "id" "text" DEFAULT ('cat_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: catalog_device_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."catalog_device_types" (
    "id" "text" DEFAULT ('dt_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "category_id" "text" NOT NULL,
    "category_name" "text" DEFAULT ''::"text" NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: company_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."company_profile" (
    "id" "text" DEFAULT 'profile_001'::"text" NOT NULL,
    "name" "text" DEFAULT 'Sectore Tecknologies'::"text" NOT NULL,
    "tagline" "text" DEFAULT 'Securing Today. Powering Tomorrow.'::"text" NOT NULL,
    "business_line" "text" DEFAULT 'Computers • Servers • Storage • CCTV • Networking • Firewalls • Cloud • AMC'::"text" NOT NULL,
    "footer_text" "text" DEFAULT 'Design • Deploy • Secure • Support'::"text" NOT NULL,
    "logo_url" "text",
    "favicon_url" "text",
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "contact_person" "text" DEFAULT ''::"text" NOT NULL,
    "primary_phone" "text" DEFAULT ''::"text" NOT NULL,
    "secondary_phone" "text" DEFAULT ''::"text" NOT NULL,
    "support_email" "text" DEFAULT ''::"text" NOT NULL,
    "emergency_phone" "text" DEFAULT ''::"text" NOT NULL,
    "website" "text" DEFAULT ''::"text" NOT NULL,
    "gst" "text" DEFAULT ''::"text" NOT NULL,
    "working_hours" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "text"
);


--
-- Name: cust_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS "public"."cust_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."customer_documents" (
    "id" "text" DEFAULT ('doc_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "customer_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" DEFAULT ''::"text" NOT NULL,
    "file_size" integer DEFAULT 0 NOT NULL,
    "url" "text" NOT NULL,
    "description" "text",
    "uploaded_by" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text" DEFAULT 'Other'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "entity_type" "text" DEFAULT 'customer'::"text" NOT NULL,
    "entity_id" "text"
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "text" DEFAULT ('cust_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "code" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "customer_type" "text" DEFAULT 'Call Based'::"text" NOT NULL,
    "amc_status" "text" DEFAULT 'No AMC'::"text" NOT NULL,
    "lead_source" "text",
    "contact_person" "text" DEFAULT ''::"text" NOT NULL,
    "designation" "text",
    "primary_mobile" "text" DEFAULT ''::"text" NOT NULL,
    "secondary_mobile" "text",
    "whatsapp_number" "text",
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "website" "text",
    "gst_number" "text",
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "state" "text" DEFAULT ''::"text" NOT NULL,
    "country" "text" DEFAULT 'India'::"text" NOT NULL,
    "pincode" "text" DEFAULT ''::"text" NOT NULL,
    "google_map_link" "text",
    "latitude" numeric,
    "longitude" numeric,
    "notes" "text",
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text" DEFAULT ''::"text" NOT NULL
);


--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."daily_reports" (
    "id" "text" DEFAULT ('dr_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "engineer_id" "text" NOT NULL,
    "engineer_name" "text" DEFAULT ''::"text" NOT NULL,
    "attendance_id" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "parts_required" "text",
    "customer_followup" "text",
    "issues_faced" "text",
    "tomorrow_priority" "text",
    "remarks" "text",
    "site_photo_urls" "text"[] DEFAULT '{}'::"text"[],
    "bill_urls" "text"[] DEFAULT '{}'::"text"[],
    "document_urls" "text"[] DEFAULT '{}'::"text"[],
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "text",
    "reviewed_at" timestamp with time zone,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_reports_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'approved'::"text", 'sent_back'::"text"])))
);


--
-- Name: engineer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."engineer_profiles" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "mobile" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text",
    "profile_photo" "text",
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "skills" "text"[],
    "certifications" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "text"
);


--
-- Name: entity_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."entity_timeline" (
    "id" "text" DEFAULT ('tl_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "entity_id" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "performed_by" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: fuel_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."fuel_logs" (
    "id" "text" DEFAULT ('fuel_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "engineer_id" "text" NOT NULL,
    "engineer_name" "text" DEFAULT ''::"text" NOT NULL,
    "date" "date" NOT NULL,
    "bike_id" "text",
    "odometer" numeric DEFAULT 0 NOT NULL,
    "liters" numeric DEFAULT 0 NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "fuel_station" "text",
    "bill_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE,
    "opening_km" numeric,
    "closing_km" numeric,
    "distance_travelled" numeric,
    "fuel_filled" numeric,
    "fuel_cost" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "invoice_number" "text",
    "mileage" numeric,
    "fuel_cost_per_km" numeric,
    "bike_id_ref" "text",
    "added_by_admin" "text"
);


--
-- Name: master_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."master_data" (
    "id" "text" DEFAULT ('md_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "master_type" "text" NOT NULL,
    "value" "text" NOT NULL,
    "code" "text",
    "parent_id" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text" DEFAULT ''::"text" NOT NULL
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "text" DEFAULT ('ntpl_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "type" "text" NOT NULL,
    "recipient_role" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message_body" "text" NOT NULL,
    "action_link" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "text",
    "type" "text" DEFAULT 'General'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "link" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: odometer_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."odometer_photos" (
    "id" "text" DEFAULT ('odo_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "engineer_id" "text" NOT NULL,
    "engineer_name" "text" DEFAULT ''::"text" NOT NULL,
    "bike_id" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "photo_type" "text" NOT NULL,
    "photo_url" "text" NOT NULL,
    "gps_lat" numeric,
    "gps_lng" numeric,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attendance_id" "text",
    CONSTRAINT "odometer_photos_photo_type_check" CHECK (("photo_type" = ANY (ARRAY['morning'::"text", 'evening'::"text"])))
);


--
-- Name: odometer_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."odometer_verifications" (
    "id" "text" DEFAULT ('odv_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "engineer_id" "text" NOT NULL,
    "engineer_name" "text" DEFAULT ''::"text" NOT NULL,
    "bike_id" "text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "morning_photo_id" "text",
    "evening_photo_id" "text",
    "morning_reading" numeric,
    "evening_reading" numeric,
    "km_travelled" numeric GENERATED ALWAYS AS (
CASE
    WHEN (("evening_reading" IS NOT NULL) AND ("morning_reading" IS NOT NULL)) THEN ("evening_reading" - "morning_reading")
    ELSE NULL::numeric
END) STORED,
    "verified_by" "text",
    "verified_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "odometer_verifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text"])))
);


--
-- Name: parts_used; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."parts_used" (
    "id" "text" DEFAULT ('part_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_id" "text" NOT NULL,
    "engineer_id" "text" NOT NULL,
    "part_name" "text" NOT NULL,
    "part_number" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_by" "text" DEFAULT 'System'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: recycle_bin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."recycle_bin" (
    "id" "text" DEFAULT ('rb_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "entity_code" "text",
    "entity_name" "text",
    "snapshot" "jsonb" NOT NULL,
    "deleted_by" "text" NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "delete_reason" "text",
    "restored_at" timestamp with time zone,
    "restored_by" "text"
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "report_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "storage_path" "text",
    "generated_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_activity" (
    "id" "text" DEFAULT ('tact_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_id" "text" NOT NULL,
    "user_id" "text" DEFAULT ''::"text" NOT NULL,
    "user_name" "text" DEFAULT ''::"text" NOT NULL,
    "action" "text" NOT NULL,
    "details" "text",
    "ip_address" "text" DEFAULT '—'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_checklist" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "task_id" "text" NOT NULL,
    "item_text" "text" NOT NULL,
    "is_done" boolean DEFAULT false NOT NULL,
    "done_at" timestamp with time zone,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS "public"."task_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_documents" (
    "id" "text" DEFAULT ('tdoc_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_id" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" DEFAULT ''::"text" NOT NULL,
    "file_size" integer DEFAULT 0 NOT NULL,
    "url" "text" NOT NULL,
    "uploaded_by" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_by_id" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_materials" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "task_id" "text" NOT NULL,
    "part_name" "text" NOT NULL,
    "part_code" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,2),
    "notes" "text",
    "added_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_notes" (
    "id" "text" DEFAULT ('tnote_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_id" "text" NOT NULL,
    "note_type" "text" DEFAULT 'Internal'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "added_by" "text" DEFAULT ''::"text" NOT NULL,
    "added_by_id" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_photos" (
    "id" "text" DEFAULT ('tphoto_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_id" "text" NOT NULL,
    "category" "text" DEFAULT 'Before'::"text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer DEFAULT 0 NOT NULL,
    "url" "text" NOT NULL,
    "uploaded_by" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_by_id" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."task_timeline" (
    "id" "text" DEFAULT ('ttl_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "old_value" "text",
    "new_value" "text",
    "performed_by" "text" DEFAULT ''::"text" NOT NULL,
    "performed_by_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "text" DEFAULT ('task_'::"text" || ("gen_random_uuid"())::"text") NOT NULL,
    "task_number" "text" NOT NULL,
    "customer_id" "text" NOT NULL,
    "asset_id" "text" NOT NULL,
    "task_type" "text" NOT NULL,
    "priority" "text" DEFAULT 'Medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "issue_description" "text" DEFAULT ''::"text" NOT NULL,
    "engineer_id" "text",
    "engineer_name" "text",
    "expected_visit_date" "date",
    "expected_visit_time" "text",
    "remarks" "text",
    "internal_notes" "text",
    "customer_notes" "text",
    "amc_id" "text",
    "amc_number" "text",
    "completed_at" timestamp with time zone,
    "rejection_reason" "text",
    "escalation_reason" "text",
    "deleted_at" timestamp with time zone,
    "created_by" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_start_time" timestamp with time zone,
    "service_end_time" timestamp with time zone,
    "site_time_minutes" integer,
    "customer_remarks" "text",
    "customer_feedback" "text",
    "contact_person" "text",
    "contact_mobile" "text"
);


--
-- Name: amc_documents amc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_documents_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_documents"
    ADD CONSTRAINT "amc_documents_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_renewals amc_renewals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_renewals_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_renewals'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_renewals"
    ADD CONSTRAINT "amc_renewals_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_timeline amc_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_timeline_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_timeline"
    ADD CONSTRAINT "amc_timeline_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_visits amc_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_visits_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_visits'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_visits"
    ADD CONSTRAINT "amc_visits_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs amcs_amc_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amcs_amc_number_key'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amcs"
    ADD CONSTRAINT "amcs_amc_number_key" UNIQUE ("amc_number");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs amcs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amcs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amcs"
    ADD CONSTRAINT "amcs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users app_users_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'app_users_employee_code_key'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_employee_code_key" UNIQUE ("employee_code");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'app_users_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users app_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'app_users_username_key'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_username_key" UNIQUE ("username");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_config application_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_config_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_config'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_config"
    ADD CONSTRAINT "application_config_pkey" PRIMARY KEY ("key");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_custom_fields asset_custom_fields_category_field_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_custom_fields_category_field_key_key'
      AND n.nspname = 'public'
      AND c.relname = 'asset_custom_fields'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_custom_fields"
    ADD CONSTRAINT "asset_custom_fields_category_field_key_key" UNIQUE ("category", "field_key");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_custom_fields asset_custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_custom_fields_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_custom_fields'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_custom_fields"
    ADD CONSTRAINT "asset_custom_fields_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_history asset_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_history_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_history"
    ADD CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships asset_relationships_parent_id_child_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_relationships_parent_id_child_id_key'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_relationships"
    ADD CONSTRAINT "asset_relationships_parent_id_child_id_key" UNIQUE ("parent_id", "child_id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships asset_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_relationships_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_relationships"
    ADD CONSTRAINT "asset_relationships_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_templates asset_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_templates_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_templates"
    ADD CONSTRAINT "asset_templates_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline asset_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_timeline_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_timeline"
    ADD CONSTRAINT "asset_timeline_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets assets_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'assets_code_key'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_code_key" UNIQUE ("code");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'assets_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'attachments_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'attachments'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attendance attendance_engineer_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'attendance_engineer_id_date_key'
      AND n.nspname = 'public'
      AND c.relname = 'attendance'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_engineer_id_date_key" UNIQUE ("engineer_id", "date");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'attendance_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'attendance'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'audit_logs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bikes bikes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bikes_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'bikes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bikes"
    ADD CONSTRAINT "bikes_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bikes bikes_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'bikes_registration_number_key'
      AND n.nspname = 'public'
      AND c.relname = 'bikes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."bikes"
    ADD CONSTRAINT "bikes_registration_number_key" UNIQUE ("registration_number");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories catalog_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'catalog_categories_name_key'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_categories'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."catalog_categories"
    ADD CONSTRAINT "catalog_categories_name_key" UNIQUE ("name");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories catalog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'catalog_categories_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_categories'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."catalog_categories"
    ADD CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types catalog_device_types_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'catalog_device_types_category_id_name_key'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."catalog_device_types"
    ADD CONSTRAINT "catalog_device_types_category_id_name_key" UNIQUE ("category_id", "name");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types catalog_device_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'catalog_device_types_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."catalog_device_types"
    ADD CONSTRAINT "catalog_device_types_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: company_profile company_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'company_profile_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'company_profile'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."company_profile"
    ADD CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents customer_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'customer_documents_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers customers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'customers_code_key'
      AND n.nspname = 'public'
      AND c.relname = 'customers'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_code_key" UNIQUE ("code");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'customers_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'customers'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_reports daily_reports_engineer_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'daily_reports_engineer_id_date_key'
      AND n.nspname = 'public'
      AND c.relname = 'daily_reports'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_engineer_id_date_key" UNIQUE ("engineer_id", "date");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'daily_reports_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'daily_reports'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."daily_reports"
    ADD CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles engineer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'engineer_profiles_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."engineer_profiles"
    ADD CONSTRAINT "engineer_profiles_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline entity_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'entity_timeline_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."entity_timeline"
    ADD CONSTRAINT "entity_timeline_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fuel_logs fuel_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'fuel_logs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'fuel_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data master_data_master_type_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'master_data_master_type_value_key'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."master_data"
    ADD CONSTRAINT "master_data_master_type_value_key" UNIQUE ("master_type", "value");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data master_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'master_data_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."master_data"
    ADD CONSTRAINT "master_data_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'notification_templates_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'notification_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates notification_templates_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'notification_templates_type_key'
      AND n.nspname = 'public'
      AND c.relname = 'notification_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_type_key" UNIQUE ("type");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'notifications_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'notifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_photos odometer_photos_engineer_id_date_photo_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'odometer_photos_engineer_id_date_photo_type_key'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."odometer_photos"
    ADD CONSTRAINT "odometer_photos_engineer_id_date_photo_type_key" UNIQUE ("engineer_id", "date", "photo_type");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_photos odometer_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'odometer_photos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."odometer_photos"
    ADD CONSTRAINT "odometer_photos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_verifications odometer_verifications_engineer_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'odometer_verifications_engineer_id_date_key'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."odometer_verifications"
    ADD CONSTRAINT "odometer_verifications_engineer_id_date_key" UNIQUE ("engineer_id", "date");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_verifications odometer_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'odometer_verifications_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."odometer_verifications"
    ADD CONSTRAINT "odometer_verifications_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used parts_used_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'parts_used_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."parts_used"
    ADD CONSTRAINT "parts_used_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin recycle_bin_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'recycle_bin_entity_type_entity_id_key'
      AND n.nspname = 'public'
      AND c.relname = 'recycle_bin'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."recycle_bin"
    ADD CONSTRAINT "recycle_bin_entity_type_entity_id_key" UNIQUE ("entity_type", "entity_id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin recycle_bin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'recycle_bin_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'recycle_bin'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."recycle_bin"
    ADD CONSTRAINT "recycle_bin_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'reports_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'reports'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity task_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_activity_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_activity'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_activity"
    ADD CONSTRAINT "task_activity_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_checklist task_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_checklist_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_checklist'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_checklist"
    ADD CONSTRAINT "task_checklist_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_documents task_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_documents_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_documents"
    ADD CONSTRAINT "task_documents_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_materials task_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_materials_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_materials'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_materials"
    ADD CONSTRAINT "task_materials_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_notes task_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_notes_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_notes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_notes"
    ADD CONSTRAINT "task_notes_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_photos task_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_photos_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_photos"
    ADD CONSTRAINT "task_photos_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_timeline task_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_timeline_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_timeline"
    ADD CONSTRAINT "task_timeline_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tasks_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks tasks_task_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tasks_task_number_key'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_task_number_key" UNIQUE ("task_number");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline_asset_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "asset_timeline_asset_id_idx" ON "public"."asset_timeline" USING "btree" ("asset_id", "event_date" DESC);


--
-- Name: assets_asset_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "assets_asset_number_idx" ON "public"."assets" USING "btree" ("asset_number");


--
-- Name: assets_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "assets_category_idx" ON "public"."assets" USING "btree" ("category");


--
-- Name: assets_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "assets_code_idx" ON "public"."assets" USING "btree" ("code");


--
-- Name: assets_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "assets_customer_id_idx" ON "public"."assets" USING "btree" ("customer_id");


--
-- Name: assets_serial_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "assets_serial_idx" ON "public"."assets" USING "btree" ("serial_number");


--
-- Name: assets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "public"."assets" USING "btree" ("status");


--
-- Name: idx_acf_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_acf_category" ON "public"."asset_custom_fields" USING "btree" ("category", "is_active");


--
-- Name: idx_amc_documents_amc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amc_documents_amc_id" ON "public"."amc_documents" USING "btree" ("amc_id");


--
-- Name: idx_amc_renewals_amc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amc_renewals_amc_id" ON "public"."amc_renewals" USING "btree" ("amc_id");


--
-- Name: idx_amc_timeline_amc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amc_timeline_amc_id" ON "public"."amc_timeline" USING "btree" ("amc_id");


--
-- Name: idx_amc_visits_amc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amc_visits_amc_id" ON "public"."amc_visits" USING "btree" ("amc_id");


--
-- Name: idx_amc_visits_scheduled_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amc_visits_scheduled_date" ON "public"."amc_visits" USING "btree" ("scheduled_date");


--
-- Name: idx_amcs_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amcs_customer_id" ON "public"."amcs" USING "btree" ("customer_id");


--
-- Name: idx_amcs_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amcs_end_date" ON "public"."amcs" USING "btree" ("end_date");


--
-- Name: idx_amcs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amcs_status" ON "public"."amcs" USING "btree" ("status");


--
-- Name: idx_amcs_status_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_amcs_status_end_date" ON "public"."amcs" USING "btree" ("status", "end_date");


--
-- Name: idx_app_users_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_app_users_customer_id" ON "public"."app_users" USING "btree" ("customer_id");


--
-- Name: idx_app_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_app_users_email" ON "public"."app_users" USING "btree" ("email");


--
-- Name: idx_app_users_mobile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_app_users_mobile" ON "public"."app_users" USING "btree" ("mobile");


--
-- Name: idx_app_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_app_users_role" ON "public"."app_users" USING "btree" ("role");


--
-- Name: idx_app_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_app_users_username" ON "public"."app_users" USING "btree" ("username");


--
-- Name: idx_asset_history_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_asset_history_asset_id" ON "public"."asset_history" USING "btree" ("asset_id");


--
-- Name: idx_asset_history_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_asset_history_performed_at" ON "public"."asset_history" USING "btree" ("performed_at" DESC);


--
-- Name: idx_assets_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_assets_code" ON "public"."assets" USING "btree" ("code");


--
-- Name: idx_assets_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_assets_customer_id" ON "public"."assets" USING "btree" ("customer_id");


--
-- Name: idx_assets_customer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_assets_customer_status" ON "public"."assets" USING "btree" ("customer_id", "status");


--
-- Name: idx_assets_serial_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_assets_serial_number" ON "public"."assets" USING "btree" ("serial_number");


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "public"."assets" USING "btree" ("status");


--
-- Name: idx_attendance_engineer_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_attendance_engineer_date" ON "public"."attendance" USING "btree" ("engineer_id", "date" DESC);


--
-- Name: idx_audit_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_audit_logs_event_type" ON "public"."audit_logs" USING "btree" ("event_type");


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");


--
-- Name: idx_customer_documents_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_customer_documents_customer" ON "public"."customer_documents" USING "btree" ("customer_id");


--
-- Name: idx_customers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_customers_code" ON "public"."customers" USING "btree" ("code");


--
-- Name: idx_customers_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_customers_company_name" ON "public"."customers" USING "btree" ("company_name");


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_customers_status" ON "public"."customers" USING "btree" ("status");


--
-- Name: idx_engineer_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_engineer_profiles_user_id" ON "public"."engineer_profiles" USING "btree" ("user_id");


--
-- Name: idx_entity_timeline_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_entity_timeline_entity" ON "public"."entity_timeline" USING "btree" ("entity_id", "entity_type");


--
-- Name: idx_fuel_logs_engineer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_fuel_logs_engineer" ON "public"."fuel_logs" USING "btree" ("engineer_id", "date" DESC);


--
-- Name: idx_master_data_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_master_data_parent" ON "public"."master_data" USING "btree" ("parent_id");


--
-- Name: idx_master_data_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_master_data_type" ON "public"."master_data" USING "btree" ("master_type");


--
-- Name: idx_master_data_type_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_master_data_type_active" ON "public"."master_data" USING "btree" ("master_type", "is_active");


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "is_read");


--
-- Name: idx_odometer_photos_attendance_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_odometer_photos_attendance_id" ON "public"."odometer_photos" USING "btree" ("attendance_id");


--
-- Name: idx_parts_used_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_parts_used_task_id" ON "public"."parts_used" USING "btree" ("task_id");


--
-- Name: idx_rb_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_rb_entity_type" ON "public"."recycle_bin" USING "btree" ("entity_type", "deleted_at" DESC);


--
-- Name: idx_task_activity_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_task_activity_task_id" ON "public"."task_activity" USING "btree" ("task_id");


--
-- Name: idx_task_documents_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_task_documents_task_id" ON "public"."task_documents" USING "btree" ("task_id");


--
-- Name: idx_task_notes_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_task_notes_task_id" ON "public"."task_notes" USING "btree" ("task_id");


--
-- Name: idx_task_photos_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_task_photos_task_id" ON "public"."task_photos" USING "btree" ("task_id");


--
-- Name: idx_task_timeline_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_task_timeline_task_id" ON "public"."task_timeline" USING "btree" ("task_id");


--
-- Name: idx_tasks_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_asset_id" ON "public"."tasks" USING "btree" ("asset_id");


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at" DESC);


--
-- Name: idx_tasks_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_customer_id" ON "public"."tasks" USING "btree" ("customer_id");


--
-- Name: idx_tasks_customer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_customer_status" ON "public"."tasks" USING "btree" ("customer_id", "status");


--
-- Name: idx_tasks_engineer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_engineer_id" ON "public"."tasks" USING "btree" ("engineer_id");


--
-- Name: idx_tasks_expected_visit_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_expected_visit_date" ON "public"."tasks" USING "btree" ("expected_visit_date");


--
-- Name: idx_tasks_service_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_service_start" ON "public"."tasks" USING "btree" ("service_start_time");


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");


--
-- Name: idx_tasks_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_status_created" ON "public"."tasks" USING "btree" ("status", "created_at" DESC);


--
-- Name: idx_tasks_task_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_task_number" ON "public"."tasks" USING "btree" ("task_number");


--
-- Name: idx_tasks_task_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_tasks_task_type" ON "public"."tasks" USING "btree" ("task_type");


--
-- Name: master_data_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "master_data_type_idx" ON "public"."master_data" USING "btree" ("master_type", "is_active");


--
-- Name: amc_documents amc_documents_amc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_documents_amc_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_documents"
    ADD CONSTRAINT "amc_documents_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."amcs"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_renewals amc_renewals_amc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_renewals_amc_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_renewals'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_renewals"
    ADD CONSTRAINT "amc_renewals_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."amcs"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_timeline amc_timeline_amc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_timeline_amc_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_timeline"
    ADD CONSTRAINT "amc_timeline_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."amcs"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_visits amc_visits_amc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amc_visits_amc_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'amc_visits'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amc_visits"
    ADD CONSTRAINT "amc_visits_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "public"."amcs"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs amcs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'amcs_customer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."amcs"
    ADD CONSTRAINT "amcs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users app_users_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'app_users_customer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_history asset_history_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_history_asset_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_history"
    ADD CONSTRAINT "asset_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships asset_relationships_child_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_relationships_child_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_relationships"
    ADD CONSTRAINT "asset_relationships_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships asset_relationships_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_relationships_parent_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_relationships"
    ADD CONSTRAINT "asset_relationships_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline asset_timeline_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'asset_timeline_asset_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'asset_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."asset_timeline"
    ADD CONSTRAINT "asset_timeline_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets assets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'assets_customer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets assets_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'assets_template_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."asset_templates"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types catalog_device_types_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'catalog_device_types_category_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."catalog_device_types"
    ADD CONSTRAINT "catalog_device_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents customer_documents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'customer_documents_customer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."customer_documents"
    ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles engineer_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'engineer_profiles_user_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."engineer_profiles"
    ADD CONSTRAINT "engineer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fuel_logs fuel_logs_bike_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'fuel_logs_bike_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'fuel_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data master_data_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'master_data_parent_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."master_data"
    ADD CONSTRAINT "master_data_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."master_data"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'notifications_user_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'notifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used parts_used_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'parts_used_engineer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."parts_used"
    ADD CONSTRAINT "parts_used_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "public"."engineer_profiles"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used parts_used_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'parts_used_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."parts_used"
    ADD CONSTRAINT "parts_used_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity task_activity_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_activity_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_activity'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_activity"
    ADD CONSTRAINT "task_activity_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_checklist task_checklist_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_checklist_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_checklist'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_checklist"
    ADD CONSTRAINT "task_checklist_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_documents task_documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_documents_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_documents"
    ADD CONSTRAINT "task_documents_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_materials task_materials_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_materials_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_materials'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_materials"
    ADD CONSTRAINT "task_materials_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_notes task_notes_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_notes_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_notes'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_notes"
    ADD CONSTRAINT "task_notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_photos task_photos_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_photos_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_photos"
    ADD CONSTRAINT "task_photos_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_timeline task_timeline_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'task_timeline_task_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'task_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."task_timeline"
    ADD CONSTRAINT "task_timeline_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks tasks_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tasks_customer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks tasks_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'tasks_engineer_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "public"."app_users"("id") ON DELETE SET NULL;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."amc_documents" ENABLE ROW LEVEL SECURITY;

--
-- Name: amc_renewals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."amc_renewals" ENABLE ROW LEVEL SECURITY;

--
-- Name: amc_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."amc_timeline" ENABLE ROW LEVEL SECURITY;

--
-- Name: amc_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."amc_visits" ENABLE ROW LEVEL SECURITY;

--
-- Name: amcs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."amcs" ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_custom_fields anon_delete_acf; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_acf'
      AND n.nspname = 'public'
      AND c.relname = 'asset_custom_fields'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_acf" ON "public"."asset_custom_fields" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_documents anon_delete_amc_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_amc_documents'
      AND n.nspname = 'public'
      AND c.relname = 'amc_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_amc_documents" ON "public"."amc_documents" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_renewals anon_delete_amc_renewals; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_amc_renewals'
      AND n.nspname = 'public'
      AND c.relname = 'amc_renewals'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_amc_renewals" ON "public"."amc_renewals" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_timeline anon_delete_amc_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_amc_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'amc_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_amc_timeline" ON "public"."amc_timeline" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_visits anon_delete_amc_visits; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_amc_visits'
      AND n.nspname = 'public'
      AND c.relname = 'amc_visits'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_amc_visits" ON "public"."amc_visits" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs anon_delete_amcs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_amcs'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_amcs" ON "public"."amcs" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users anon_delete_app_users; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_app_users'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_app_users" ON "public"."app_users" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets anon_delete_assets; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_assets'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_assets" ON "public"."assets" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs anon_delete_audit_logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_audit_logs'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_audit_logs" ON "public"."audit_logs" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories anon_delete_catalog_categories; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_catalog_categories'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_categories'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_catalog_categories" ON "public"."catalog_categories" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types anon_delete_catalog_device_types; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_catalog_device_types'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_catalog_device_types" ON "public"."catalog_device_types" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: company_profile anon_delete_company_profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_company_profile'
      AND n.nspname = 'public'
      AND c.relname = 'company_profile'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_company_profile" ON "public"."company_profile" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents anon_delete_customer_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_customer_documents'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_customer_documents" ON "public"."customer_documents" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers anon_delete_customers; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_customers'
      AND n.nspname = 'public'
      AND c.relname = 'customers'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_customers" ON "public"."customers" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles anon_delete_engineer_profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_engineer_profiles'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_engineer_profiles" ON "public"."engineer_profiles" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline anon_delete_entity_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_entity_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_entity_timeline" ON "public"."entity_timeline" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data anon_delete_master_data; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_master_data'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_master_data" ON "public"."master_data" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates anon_delete_notification_templates; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_notification_templates'
      AND n.nspname = 'public'
      AND c.relname = 'notification_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_notification_templates" ON "public"."notification_templates" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used anon_delete_parts_used; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_parts_used'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_parts_used" ON "public"."parts_used" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin anon_delete_recycle_bin; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_recycle_bin'
      AND n.nspname = 'public'
      AND c.relname = 'recycle_bin'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_recycle_bin" ON "public"."recycle_bin" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity anon_delete_task_activity; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_task_activity'
      AND n.nspname = 'public'
      AND c.relname = 'task_activity'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_task_activity" ON "public"."task_activity" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_documents anon_delete_task_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_task_documents'
      AND n.nspname = 'public'
      AND c.relname = 'task_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_task_documents" ON "public"."task_documents" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_notes anon_delete_task_notes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_task_notes'
      AND n.nspname = 'public'
      AND c.relname = 'task_notes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_task_notes" ON "public"."task_notes" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_photos anon_delete_task_photos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_task_photos'
      AND n.nspname = 'public'
      AND c.relname = 'task_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_task_photos" ON "public"."task_photos" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_timeline anon_delete_task_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_task_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'task_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_task_timeline" ON "public"."task_timeline" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks anon_delete_tasks; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_delete_tasks'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_delete_tasks" ON "public"."tasks" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_custom_fields anon_insert_acf; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_acf'
      AND n.nspname = 'public'
      AND c.relname = 'asset_custom_fields'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_acf" ON "public"."asset_custom_fields" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_documents anon_insert_amc_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_amc_documents'
      AND n.nspname = 'public'
      AND c.relname = 'amc_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_amc_documents" ON "public"."amc_documents" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_renewals anon_insert_amc_renewals; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_amc_renewals'
      AND n.nspname = 'public'
      AND c.relname = 'amc_renewals'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_amc_renewals" ON "public"."amc_renewals" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_timeline anon_insert_amc_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_amc_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'amc_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_amc_timeline" ON "public"."amc_timeline" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_visits anon_insert_amc_visits; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_amc_visits'
      AND n.nspname = 'public'
      AND c.relname = 'amc_visits'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_amc_visits" ON "public"."amc_visits" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs anon_insert_amcs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_amcs'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_amcs" ON "public"."amcs" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users anon_insert_app_users; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_app_users'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_app_users" ON "public"."app_users" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_history anon_insert_asset_history; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_asset_history'
      AND n.nspname = 'public'
      AND c.relname = 'asset_history'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_asset_history" ON "public"."asset_history" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets anon_insert_assets; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_assets'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_assets" ON "public"."assets" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs anon_insert_audit_logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_audit_logs'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_audit_logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories anon_insert_catalog_categories; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_catalog_categories'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_categories'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_catalog_categories" ON "public"."catalog_categories" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types anon_insert_catalog_device_types; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_catalog_device_types'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_catalog_device_types" ON "public"."catalog_device_types" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: company_profile anon_insert_company_profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_company_profile'
      AND n.nspname = 'public'
      AND c.relname = 'company_profile'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_company_profile" ON "public"."company_profile" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents anon_insert_customer_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_customer_documents'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_customer_documents" ON "public"."customer_documents" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers anon_insert_customers; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_customers'
      AND n.nspname = 'public'
      AND c.relname = 'customers'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_customers" ON "public"."customers" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles anon_insert_engineer_profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_engineer_profiles'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_engineer_profiles" ON "public"."engineer_profiles" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline anon_insert_entity_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_entity_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_entity_timeline" ON "public"."entity_timeline" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data anon_insert_master_data; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_master_data'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_master_data" ON "public"."master_data" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates anon_insert_notification_templates; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_notification_templates'
      AND n.nspname = 'public'
      AND c.relname = 'notification_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_notification_templates" ON "public"."notification_templates" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used anon_insert_parts_used; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_parts_used'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_parts_used" ON "public"."parts_used" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin anon_insert_recycle_bin; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_recycle_bin'
      AND n.nspname = 'public'
      AND c.relname = 'recycle_bin'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_recycle_bin" ON "public"."recycle_bin" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity anon_insert_task_activity; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_task_activity'
      AND n.nspname = 'public'
      AND c.relname = 'task_activity'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_task_activity" ON "public"."task_activity" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_documents anon_insert_task_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_task_documents'
      AND n.nspname = 'public'
      AND c.relname = 'task_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_task_documents" ON "public"."task_documents" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_notes anon_insert_task_notes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_task_notes'
      AND n.nspname = 'public'
      AND c.relname = 'task_notes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_task_notes" ON "public"."task_notes" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_photos anon_insert_task_photos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_task_photos'
      AND n.nspname = 'public'
      AND c.relname = 'task_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_task_photos" ON "public"."task_photos" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_timeline anon_insert_task_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_task_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'task_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_task_timeline" ON "public"."task_timeline" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks anon_insert_tasks; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_insert_tasks'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_insert_tasks" ON "public"."tasks" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_custom_fields anon_select_acf; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_acf'
      AND n.nspname = 'public'
      AND c.relname = 'asset_custom_fields'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_acf" ON "public"."asset_custom_fields" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_documents anon_select_amc_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_amc_documents'
      AND n.nspname = 'public'
      AND c.relname = 'amc_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_amc_documents" ON "public"."amc_documents" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_renewals anon_select_amc_renewals; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_amc_renewals'
      AND n.nspname = 'public'
      AND c.relname = 'amc_renewals'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_amc_renewals" ON "public"."amc_renewals" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_timeline anon_select_amc_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_amc_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'amc_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_amc_timeline" ON "public"."amc_timeline" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_visits anon_select_amc_visits; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_amc_visits'
      AND n.nspname = 'public'
      AND c.relname = 'amc_visits'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_amc_visits" ON "public"."amc_visits" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs anon_select_amcs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_amcs'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_amcs" ON "public"."amcs" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users anon_select_app_users; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_app_users'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_app_users" ON "public"."app_users" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_history anon_select_asset_history; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_asset_history'
      AND n.nspname = 'public'
      AND c.relname = 'asset_history'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_asset_history" ON "public"."asset_history" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets anon_select_assets; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_assets'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_assets" ON "public"."assets" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs anon_select_audit_logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_audit_logs'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_audit_logs" ON "public"."audit_logs" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories anon_select_catalog_categories; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_catalog_categories'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_categories'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_catalog_categories" ON "public"."catalog_categories" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types anon_select_catalog_device_types; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_catalog_device_types'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_catalog_device_types" ON "public"."catalog_device_types" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: company_profile anon_select_company_profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_company_profile'
      AND n.nspname = 'public'
      AND c.relname = 'company_profile'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_company_profile" ON "public"."company_profile" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents anon_select_customer_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_customer_documents'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_customer_documents" ON "public"."customer_documents" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers anon_select_customers; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_customers'
      AND n.nspname = 'public'
      AND c.relname = 'customers'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_customers" ON "public"."customers" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles anon_select_engineer_profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_engineer_profiles'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_engineer_profiles" ON "public"."engineer_profiles" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline anon_select_entity_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_entity_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_entity_timeline" ON "public"."entity_timeline" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data anon_select_master_data; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_master_data'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_master_data" ON "public"."master_data" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates anon_select_notification_templates; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_notification_templates'
      AND n.nspname = 'public'
      AND c.relname = 'notification_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_notification_templates" ON "public"."notification_templates" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used anon_select_parts_used; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_parts_used'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_parts_used" ON "public"."parts_used" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin anon_select_recycle_bin; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_recycle_bin'
      AND n.nspname = 'public'
      AND c.relname = 'recycle_bin'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_recycle_bin" ON "public"."recycle_bin" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity anon_select_task_activity; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_task_activity'
      AND n.nspname = 'public'
      AND c.relname = 'task_activity'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_task_activity" ON "public"."task_activity" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_documents anon_select_task_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_task_documents'
      AND n.nspname = 'public'
      AND c.relname = 'task_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_task_documents" ON "public"."task_documents" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_notes anon_select_task_notes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_task_notes'
      AND n.nspname = 'public'
      AND c.relname = 'task_notes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_task_notes" ON "public"."task_notes" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_photos anon_select_task_photos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_task_photos'
      AND n.nspname = 'public'
      AND c.relname = 'task_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_task_photos" ON "public"."task_photos" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_timeline anon_select_task_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_task_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'task_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_task_timeline" ON "public"."task_timeline" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks anon_select_tasks; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_select_tasks'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_select_tasks" ON "public"."tasks" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_custom_fields anon_update_acf; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_acf'
      AND n.nspname = 'public'
      AND c.relname = 'asset_custom_fields'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_acf" ON "public"."asset_custom_fields" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_documents anon_update_amc_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_amc_documents'
      AND n.nspname = 'public'
      AND c.relname = 'amc_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_amc_documents" ON "public"."amc_documents" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_renewals anon_update_amc_renewals; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_amc_renewals'
      AND n.nspname = 'public'
      AND c.relname = 'amc_renewals'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_amc_renewals" ON "public"."amc_renewals" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_timeline anon_update_amc_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_amc_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'amc_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_amc_timeline" ON "public"."amc_timeline" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amc_visits anon_update_amc_visits; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_amc_visits'
      AND n.nspname = 'public'
      AND c.relname = 'amc_visits'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_amc_visits" ON "public"."amc_visits" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: amcs anon_update_amcs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_amcs'
      AND n.nspname = 'public'
      AND c.relname = 'amcs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_amcs" ON "public"."amcs" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users anon_update_app_users; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_app_users'
      AND n.nspname = 'public'
      AND c.relname = 'app_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_app_users" ON "public"."app_users" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: assets anon_update_assets; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_assets'
      AND n.nspname = 'public'
      AND c.relname = 'assets'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_assets" ON "public"."assets" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs anon_update_audit_logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_audit_logs'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_audit_logs" ON "public"."audit_logs" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories anon_update_catalog_categories; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_catalog_categories'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_categories'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_catalog_categories" ON "public"."catalog_categories" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_device_types anon_update_catalog_device_types; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_catalog_device_types'
      AND n.nspname = 'public'
      AND c.relname = 'catalog_device_types'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_catalog_device_types" ON "public"."catalog_device_types" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: company_profile anon_update_company_profile; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_company_profile'
      AND n.nspname = 'public'
      AND c.relname = 'company_profile'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_company_profile" ON "public"."company_profile" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents anon_update_customer_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_customer_documents'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_customer_documents" ON "public"."customer_documents" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers anon_update_customers; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_customers'
      AND n.nspname = 'public'
      AND c.relname = 'customers'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_customers" ON "public"."customers" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles anon_update_engineer_profiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_engineer_profiles'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_engineer_profiles" ON "public"."engineer_profiles" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline anon_update_entity_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_entity_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_entity_timeline" ON "public"."entity_timeline" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data anon_update_master_data; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_master_data'
      AND n.nspname = 'public'
      AND c.relname = 'master_data'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_master_data" ON "public"."master_data" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates anon_update_notification_templates; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_notification_templates'
      AND n.nspname = 'public'
      AND c.relname = 'notification_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_notification_templates" ON "public"."notification_templates" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used anon_update_parts_used; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_parts_used'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_parts_used" ON "public"."parts_used" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin anon_update_recycle_bin; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_recycle_bin'
      AND n.nspname = 'public'
      AND c.relname = 'recycle_bin'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_recycle_bin" ON "public"."recycle_bin" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity anon_update_task_activity; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_task_activity'
      AND n.nspname = 'public'
      AND c.relname = 'task_activity'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_task_activity" ON "public"."task_activity" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_documents anon_update_task_documents; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_task_documents'
      AND n.nspname = 'public'
      AND c.relname = 'task_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_task_documents" ON "public"."task_documents" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_notes anon_update_task_notes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_task_notes'
      AND n.nspname = 'public'
      AND c.relname = 'task_notes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_task_notes" ON "public"."task_notes" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_photos anon_update_task_photos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_task_photos'
      AND n.nspname = 'public'
      AND c.relname = 'task_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_task_photos" ON "public"."task_photos" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_timeline anon_update_task_timeline; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_task_timeline'
      AND n.nspname = 'public'
      AND c.relname = 'task_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_task_timeline" ON "public"."task_timeline" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: tasks anon_update_tasks; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'anon_update_tasks'
      AND n.nspname = 'public'
      AND c.relname = 'tasks'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "anon_update_tasks" ON "public"."tasks" FOR UPDATE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: app_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;

--
-- Name: application_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."application_config" ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_custom_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."asset_custom_fields" ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."asset_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_relationships asset_rel_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_rel_delete'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_rel_delete" ON "public"."asset_relationships" FOR DELETE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships asset_rel_read; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_rel_read'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_rel_read" ON "public"."asset_relationships" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships asset_rel_write; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_rel_write'
      AND n.nspname = 'public'
      AND c.relname = 'asset_relationships'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_rel_write" ON "public"."asset_relationships" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."asset_relationships" ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."asset_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_templates asset_templates_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_templates_delete'
      AND n.nspname = 'public'
      AND c.relname = 'asset_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_templates_delete" ON "public"."asset_templates" FOR DELETE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_templates asset_templates_read; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_templates_read'
      AND n.nspname = 'public'
      AND c.relname = 'asset_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_templates_read" ON "public"."asset_templates" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_templates asset_templates_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_templates_update'
      AND n.nspname = 'public'
      AND c.relname = 'asset_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_templates_update" ON "public"."asset_templates" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_templates asset_templates_write; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'asset_templates_write'
      AND n.nspname = 'public'
      AND c.relname = 'asset_templates'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "asset_templates_write" ON "public"."asset_templates" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."asset_timeline" ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments att_all_anon; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'att_all_anon'
      AND n.nspname = 'public'
      AND c.relname = 'attachments'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "att_all_anon" ON "public"."attachments" TO "anon" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attachments att_all_auth; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'att_all_auth'
      AND n.nspname = 'public'
      AND c.relname = 'attachments'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "att_all_auth" ON "public"."attachments" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance attendance_anon_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'attendance_anon_delete'
      AND n.nspname = 'public'
      AND c.relname = 'attendance'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "attendance_anon_delete" ON "public"."attendance" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attendance attendance_anon_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'attendance_anon_insert'
      AND n.nspname = 'public'
      AND c.relname = 'attendance'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "attendance_anon_insert" ON "public"."attendance" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attendance attendance_anon_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'attendance_anon_select'
      AND n.nspname = 'public'
      AND c.relname = 'attendance'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "attendance_anon_select" ON "public"."attendance" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: attendance attendance_anon_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'attendance_anon_update'
      AND n.nspname = 'public'
      AND c.relname = 'attendance'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "attendance_anon_update" ON "public"."attendance" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: bikes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bikes" ENABLE ROW LEVEL SECURITY;

--
-- Name: bikes bikes_anon_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'bikes_anon_delete'
      AND n.nspname = 'public'
      AND c.relname = 'bikes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "bikes_anon_delete" ON "public"."bikes" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bikes bikes_anon_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'bikes_anon_insert'
      AND n.nspname = 'public'
      AND c.relname = 'bikes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "bikes_anon_insert" ON "public"."bikes" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bikes bikes_anon_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'bikes_anon_select'
      AND n.nspname = 'public'
      AND c.relname = 'bikes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "bikes_anon_select" ON "public"."bikes" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: bikes bikes_anon_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'bikes_anon_update'
      AND n.nspname = 'public'
      AND c.relname = 'bikes'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "bikes_anon_update" ON "public"."bikes" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: catalog_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."catalog_categories" ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_device_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."catalog_device_types" ENABLE ROW LEVEL SECURITY;

--
-- Name: application_config cfg_all_anon; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'cfg_all_anon'
      AND n.nspname = 'public'
      AND c.relname = 'application_config'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "cfg_all_anon" ON "public"."application_config" TO "anon" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_config cfg_all_auth; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'cfg_all_auth'
      AND n.nspname = 'public'
      AND c.relname = 'application_config'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "cfg_all_auth" ON "public"."application_config" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: company_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."company_profile" ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."customer_documents" ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_documents customer_documents_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'customer_documents_delete'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "customer_documents_delete" ON "public"."customer_documents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents customer_documents_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'customer_documents_insert'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "customer_documents_insert" ON "public"."customer_documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customer_documents customer_documents_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'customer_documents_select'
      AND n.nspname = 'public'
      AND c.relname = 'customer_documents'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "customer_documents_select" ON "public"."customer_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."daily_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_reports dr_anon_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'dr_anon_delete'
      AND n.nspname = 'public'
      AND c.relname = 'daily_reports'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "dr_anon_delete" ON "public"."daily_reports" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_reports dr_anon_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'dr_anon_insert'
      AND n.nspname = 'public'
      AND c.relname = 'daily_reports'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "dr_anon_insert" ON "public"."daily_reports" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_reports dr_anon_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'dr_anon_select'
      AND n.nspname = 'public'
      AND c.relname = 'daily_reports'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "dr_anon_select" ON "public"."daily_reports" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: daily_reports dr_anon_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'dr_anon_update'
      AND n.nspname = 'public'
      AND c.relname = 'daily_reports'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "dr_anon_update" ON "public"."daily_reports" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: engineer_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."engineer_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: engineer_profiles engineer_profiles_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'engineer_profiles_select'
      AND n.nspname = 'public'
      AND c.relname = 'engineer_profiles'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "engineer_profiles_select" ON "public"."engineer_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."entity_timeline" ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_timeline entity_timeline_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'entity_timeline_insert'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "entity_timeline_insert" ON "public"."entity_timeline" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: entity_timeline entity_timeline_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'entity_timeline_select'
      AND n.nspname = 'public'
      AND c.relname = 'entity_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "entity_timeline_select" ON "public"."entity_timeline" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fuel_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."fuel_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: fuel_logs fuel_logs_anon_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fuel_logs_anon_delete'
      AND n.nspname = 'public'
      AND c.relname = 'fuel_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fuel_logs_anon_delete" ON "public"."fuel_logs" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fuel_logs fuel_logs_anon_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fuel_logs_anon_insert'
      AND n.nspname = 'public'
      AND c.relname = 'fuel_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fuel_logs_anon_insert" ON "public"."fuel_logs" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fuel_logs fuel_logs_anon_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fuel_logs_anon_select'
      AND n.nspname = 'public'
      AND c.relname = 'fuel_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fuel_logs_anon_select" ON "public"."fuel_logs" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: fuel_logs fuel_logs_anon_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'fuel_logs_anon_update'
      AND n.nspname = 'public'
      AND c.relname = 'fuel_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "fuel_logs_anon_update" ON "public"."fuel_logs" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: master_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."master_data" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notif_all_anon; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'notif_all_anon'
      AND n.nspname = 'public'
      AND c.relname = 'notifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "notif_all_anon" ON "public"."notifications" TO "anon" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notifications notif_all_auth; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'notif_all_auth'
      AND n.nspname = 'public'
      AND c.relname = 'notifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "notif_all_auth" ON "public"."notifications" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: notification_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: odometer_photos odo_photos_anon_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odo_photos_anon_delete'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odo_photos_anon_delete" ON "public"."odometer_photos" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_photos odo_photos_anon_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odo_photos_anon_insert'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odo_photos_anon_insert" ON "public"."odometer_photos" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_photos odo_photos_anon_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odo_photos_anon_select'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odo_photos_anon_select" ON "public"."odometer_photos" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_photos odo_photos_anon_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odo_photos_anon_update'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_photos'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odo_photos_anon_update" ON "public"."odometer_photos" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."odometer_photos" ENABLE ROW LEVEL SECURITY;

--
-- Name: odometer_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."odometer_verifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: odometer_verifications odv_anon_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odv_anon_delete'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odv_anon_delete" ON "public"."odometer_verifications" FOR DELETE USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_verifications odv_anon_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odv_anon_insert'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odv_anon_insert" ON "public"."odometer_verifications" FOR INSERT WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_verifications odv_anon_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odv_anon_select'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odv_anon_select" ON "public"."odometer_verifications" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: odometer_verifications odv_anon_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'odv_anon_update'
      AND n.nspname = 'public'
      AND c.relname = 'odometer_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "odv_anon_update" ON "public"."odometer_verifications" FOR UPDATE USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."parts_used" ENABLE ROW LEVEL SECURITY;

--
-- Name: parts_used parts_used_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'parts_used_delete'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "parts_used_delete" ON "public"."parts_used" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used parts_used_insert; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'parts_used_insert'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "parts_used_insert" ON "public"."parts_used" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: parts_used parts_used_select; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'parts_used_select'
      AND n.nspname = 'public'
      AND c.relname = 'parts_used'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "parts_used_select" ON "public"."parts_used" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_users" "u"
  WHERE (("u"."id" = (("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'sub'::"text")) AND ("u"."status" = 'Active'::"text")))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: recycle_bin; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."recycle_bin" ENABLE ROW LEVEL SECURITY;

--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: reports rpt_all_anon; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'rpt_all_anon'
      AND n.nspname = 'public'
      AND c.relname = 'reports'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "rpt_all_anon" ON "public"."reports" TO "anon" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: reports rpt_all_auth; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'rpt_all_auth'
      AND n.nspname = 'public'
      AND c.relname = 'reports'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "rpt_all_auth" ON "public"."reports" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_activity" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_checklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_checklist" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_documents" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_materials" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_photos" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."task_timeline" ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: task_checklist tc_all_anon; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'tc_all_anon'
      AND n.nspname = 'public'
      AND c.relname = 'task_checklist'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "tc_all_anon" ON "public"."task_checklist" TO "anon" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_checklist tc_all_auth; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'tc_all_auth'
      AND n.nspname = 'public'
      AND c.relname = 'task_checklist'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "tc_all_auth" ON "public"."task_checklist" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline timeline_delete; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'timeline_delete'
      AND n.nspname = 'public'
      AND c.relname = 'asset_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "timeline_delete" ON "public"."asset_timeline" FOR DELETE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline timeline_read; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'timeline_read'
      AND n.nspname = 'public'
      AND c.relname = 'asset_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "timeline_read" ON "public"."asset_timeline" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline timeline_update; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'timeline_update'
      AND n.nspname = 'public'
      AND c.relname = 'asset_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "timeline_update" ON "public"."asset_timeline" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: asset_timeline timeline_write; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'timeline_write'
      AND n.nspname = 'public'
      AND c.relname = 'asset_timeline'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "timeline_write" ON "public"."asset_timeline" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_materials tm_all_anon; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'tm_all_anon'
      AND n.nspname = 'public'
      AND c.relname = 'task_materials'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "tm_all_anon" ON "public"."task_materials" TO "anon" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: task_materials tm_all_auth; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'tm_all_auth'
      AND n.nspname = 'public'
      AND c.relname = 'task_materials'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "tm_all_auth" ON "public"."task_materials" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- PostgreSQL database dump complete
--




-- ============================================================
-- SECTION: DIFF FILTER OBJECTS
-- ============================================================
-- Objects that match diff-filter.json but cannot be represented
-- precisely by pg_dump --filter.

-- policy: storage_anon_delete on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_anon_delete'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_anon_delete ON storage.objects AS PERMISSIVE FOR DELETE TO anon USING (true);';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_anon_insert on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_anon_insert'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_anon_insert ON storage.objects AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_anon_update on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_anon_update'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_anon_update ON storage.objects AS PERMISSIVE FOR UPDATE TO anon USING (true);';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_public_delete on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_public_delete'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_public_delete ON storage.objects AS PERMISSIVE FOR DELETE TO PUBLIC USING (true);';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_public_insert on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_public_insert'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_public_insert ON storage.objects AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_public_read on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_public_read'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_public_read ON storage.objects AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = ANY (ARRAY[''company-logo''::text, ''engineer-photo''::text, ''customer-logo''::text, ''task-photo''::text, ''signatures''::text])));';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_public_select on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_public_select'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_public_select ON storage.objects AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);';
  END IF;
END
$pg_schema_restore$;
-- policy: storage_public_update on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'storage_public_update'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY storage_public_update ON storage.objects AS PERMISSIVE FOR UPDATE TO PUBLIC USING (true);';
  END IF;
END
$pg_schema_restore$;

-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('attachments', 'attachments', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'false', 'false', '20971520', NULL, NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('company-logo', 'company-logo', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'true', 'false', '5242880', '{image/png,image/jpeg,image/webp,image/svg+xml}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('customer-logo', 'customer-logo', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'true', 'false', '2097152', '{image/png,image/jpeg,image/webp}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('daily-report-files', 'daily-report-files', NULL, '2026-07-25 02:47:38.553087+00', '2026-07-25 02:47:38.553087+00', 'true', 'false', NULL, NULL, NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('engineer-photo', 'engineer-photo', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'true', 'false', '2097152', '{image/png,image/jpeg,image/webp}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('fuel-bills', 'fuel-bills', NULL, '2026-07-25 02:47:38.553087+00', '2026-07-25 02:47:38.553087+00', 'true', 'false', NULL, NULL, NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('generated-pdf', 'generated-pdf', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'false', 'false', '20971520', '{application/pdf}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('odometer-photos', 'odometer-photos', NULL, '2026-07-25 02:47:38.553087+00', '2026-07-25 02:47:38.553087+00', 'true', 'false', NULL, NULL, NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('signatures', 'signatures', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'true', 'false', '1048576', '{image/png,image/jpeg,image/webp}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('task-photo', 'task-photo', NULL, '2026-07-22 10:19:45.321843+00', '2026-07-22 10:19:45.321843+00', 'true', 'false', '10485760', '{image/png,image/jpeg,image/webp}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";

-- ============================================================
-- SECTION: CRON JOBS
-- ============================================================
-- 用户自定义 pg_cron 任务。

