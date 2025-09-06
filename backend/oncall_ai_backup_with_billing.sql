--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-1.pgdg120+1)
-- Dumped by pg_dump version 15.13 (Debian 15.13-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: alertseverity; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.alertseverity AS ENUM (
    'INFO',
    'WARNING',
    'ERROR',
    'CRITICAL'
);


ALTER TYPE public.alertseverity OWNER TO admin;

--
-- Name: alertstatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.alertstatus AS ENUM (
    'ACTIVE',
    'RESOLVED',
    'SUPPRESSED'
);


ALTER TYPE public.alertstatus OWNER TO admin;

--
-- Name: auditaction; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.auditaction AS ENUM (
    'INCIDENT_CREATED',
    'INCIDENT_ACKNOWLEDGED',
    'INCIDENT_RESOLVED',
    'INCIDENT_CLOSED',
    'ALERT_RECEIVED',
    'ALERT_SUPPRESSED',
    'USER_LOGIN',
    'USER_LOGOUT',
    'INTEGRATION_CREATED',
    'INTEGRATION_UPDATED',
    'ESCALATION_TRIGGERED',
    'NOTIFICATION_SENT'
);


ALTER TYPE public.auditaction OWNER TO admin;

--
-- Name: incidentseverity; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.incidentseverity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public.incidentseverity OWNER TO admin;

--
-- Name: incidentstatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.incidentstatus AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public.incidentstatus OWNER TO admin;

--
-- Name: integrationtype; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.integrationtype AS ENUM (
    'DATADOG',
    'GRAFANA',
    'AWS_CLOUDWATCH',
    'NEW_RELIC',
    'PAGERDUTY',
    'SLACK',
    'TEAMS',
    'WEBHOOK',
    'EMAIL',
    'SMS'
);


ALTER TYPE public.integrationtype OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO admin;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.alerts (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    incident_id uuid,
    integration_id uuid,
    external_id character varying(255),
    fingerprint character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    severity public.alertseverity NOT NULL,
    status public.alertstatus NOT NULL,
    source character varying(100) NOT NULL,
    service_name character varying(255),
    environment character varying(100),
    host character varying(255),
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    raw_data jsonb NOT NULL,
    labels jsonb
);


ALTER TABLE public.alerts OWNER TO admin;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    incident_id uuid,
    action public.auditaction NOT NULL,
    description text NOT NULL,
    ip_address inet,
    user_agent character varying(500),
    extra_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO admin;

--
-- Name: escalation_policies; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.escalation_policies (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean,
    escalation_rules jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.escalation_policies OWNER TO admin;

--
-- Name: gdpr_requests; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.gdpr_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    request_type character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    request_details jsonb,
    processing_log jsonb,
    verification_token character varying(255),
    ip_address character varying(45),
    user_agent text
);


ALTER TABLE public.gdpr_requests OWNER TO admin;

--
-- Name: incidents; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.incidents (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    severity public.incidentseverity NOT NULL,
    status public.incidentstatus NOT NULL,
    assigned_to_id uuid,
    created_by_id uuid,
    acknowledged_by_id uuid,
    resolved_by_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    ai_summary text,
    ai_suggested_actions jsonb,
    ai_confidence_score integer,
    tags jsonb,
    extra_data jsonb
);


ALTER TABLE public.incidents OWNER TO admin;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.integrations (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type public.integrationtype NOT NULL,
    is_active boolean,
    config jsonb NOT NULL,
    webhook_url character varying(500),
    webhook_secret character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sync_at timestamp with time zone
);


ALTER TABLE public.integrations OWNER TO admin;

--
-- Name: mfa_secrets; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.mfa_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    encrypted_secret text NOT NULL,
    backup_codes jsonb,
    enabled boolean,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_used timestamp with time zone
);


ALTER TABLE public.mfa_secrets OWNER TO admin;

--
-- Name: oauth_accounts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.oauth_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    provider_user_id character varying(255) NOT NULL,
    email character varying(255),
    name character varying(255),
    avatar_url character varying(500),
    access_token text,
    refresh_token text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.oauth_accounts OWNER TO admin;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100),
    plan character varying(50),
    is_active boolean,
    max_users integer,
    max_incidents_per_month integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    stripe_customer_id character varying(100),
    subscription_id character varying(100),
    plan_type character varying(20) DEFAULT 'free'::character varying,
    subscription_status character varying(20) DEFAULT 'active'::character varying,
    current_period_end timestamp without time zone
);


ALTER TABLE public.organizations OWNER TO admin;

--
-- Name: runbooks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.runbooks (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    created_by_id uuid,
    title character varying(255) NOT NULL,
    description text,
    content text NOT NULL,
    tags jsonb,
    service_names character varying[],
    alert_patterns jsonb,
    is_active boolean,
    usage_count integer,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.runbooks OWNER TO admin;

--
-- Name: security_events; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    user_id uuid,
    ip_address character varying(45),
    user_agent text,
    risk_level character varying(20) NOT NULL,
    details jsonb,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved boolean,
    resolved_at timestamp with time zone,
    resolved_by uuid
);


ALTER TABLE public.security_events OWNER TO admin;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.team_members (
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50),
    joined_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_members OWNER TO admin;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.teams (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(500),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO admin;

--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    purpose character varying(50) NOT NULL,
    consent_status character varying(20) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    user_agent text,
    metadata jsonb
);


ALTER TABLE public.user_consents OWNER TO admin;

--
-- Name: user_privacy_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_privacy_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analytics_consent boolean,
    marketing_consent boolean,
    third_party_sharing boolean,
    data_retention_preference interval,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_privacy_settings OWNER TO admin;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    device_fingerprint character varying(64),
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean
);


ALTER TABLE public.user_sessions OWNER TO admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(50),
    is_active boolean,
    is_verified boolean,
    phone_number character varying(20),
    timezone character varying(50),
    notification_preferences json,
    skills json,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    last_login_at timestamp with time zone,
    on_call_start timestamp with time zone,
    on_call_end timestamp with time zone,
    is_currently_on_call boolean,
    mfa_enabled boolean,
    last_password_change timestamp with time zone,
    failed_login_attempts integer,
    account_locked_until timestamp with time zone
);


ALTER TABLE public.users OWNER TO admin;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.alembic_version (version_num) FROM stdin;
4a0e7974dec9
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.alerts (id, organization_id, incident_id, integration_id, external_id, fingerprint, title, description, severity, status, source, service_name, environment, host, started_at, ended_at, created_at, updated_at, raw_data, labels) FROM stdin;
929c9ce6-a535-416d-b7da-5d80e2111a4b	6433e6e3-6f33-44c4-97d1-71a84ba23f74	d3bab64c-a764-4423-a35f-20875755a931	\N	cpu-high-001	9caecca6aa2a9d70095409da52a10928	High CPU Usage Detected	CPU usage has been above 90% for 5 minutes	CRITICAL	ACTIVE	generic	web-server	production	\N	2025-07-22 10:39:53.695798+00	\N	2025-07-22 16:09:53.683263+00	2025-07-22 16:09:53.706295+00	{}	{"tags": ["cpu", "performance", "production"], "alert_url": "https://monitoring.example.com/alert/cpu-high-001", "runbook_url": null, "dashboard_url": null}
9724899e-5775-4761-9fcf-e6efdd972f12	6433e6e3-6f33-44c4-97d1-71a84ba23f74	f01c58b8-6ad1-4d2d-8531-d4675607286f	\N	datadog-123	098b988942ddd4b9093001638a814d9b	Memory usage is high	Memory usage is above 85% for the last 10 minutes	ERROR	ACTIVE	datadog	\N	\N	\N	2025-07-22 10:42:39.989434+00	\N	2025-07-22 16:12:39.976918+00	2025-07-22 16:12:40.001117+00	{"body": "Memory usage is above 85% for the last 10 minutes", "link": "https://app.datadoghq.com/alerts/123", "tags": ["env:production", "service:api"], "title": "Memory usage is high", "alert_id": "datadog-123", "priority": "P2", "aggreg_key": null, "alert_type": "metric alert", "event_type": "triggered", "last_updated": null, "source_type_name": null}	{"tags": ["env:production", "service:api"], "alert_url": "https://app.datadoghq.com/alerts/123", "runbook_url": null, "dashboard_url": null}
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.audit_logs (id, organization_id, user_id, incident_id, action, description, ip_address, user_agent, extra_data, created_at) FROM stdin;
\.


--
-- Data for Name: escalation_policies; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.escalation_policies (id, organization_id, name, description, is_active, escalation_rules, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gdpr_requests; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.gdpr_requests (id, user_id, request_type, status, requested_at, processed_at, completed_at, request_details, processing_log, verification_token, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.incidents (id, organization_id, title, description, severity, status, assigned_to_id, created_by_id, acknowledged_by_id, resolved_by_id, created_at, acknowledged_at, resolved_at, updated_at, ai_summary, ai_suggested_actions, ai_confidence_score, tags, extra_data) FROM stdin;
3a955443-e1de-4975-b57e-1f5cda977ca8	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Database Connection Timeout	Database connection pool exhausted. Investigation in progress.	HIGH	ACKNOWLEDGED	d5602019-b767-405b-b432-3ae1d1ca71fe	d5602019-b767-405b-b432-3ae1d1ca71fe	\N	\N	2025-07-22 13:58:39.673325+00	\N	\N	2025-07-22 14:05:52.762156+00	\N	\N	\N	["database", "timeout", "production"]	{}
c448439f-975f-4ff5-8eeb-f3b8b77de74e	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Database Connection Timeout	Users unable to connect to primary database	HIGH	OPEN	\N	d5602019-b767-405b-b432-3ae1d1ca71fe	\N	\N	2025-07-22 13:56:24.183518+00	\N	\N	2025-07-24 14:08:20.595165+00	\N	\N	\N	["database", "timeout", "production"]	{"escalation_level": 3, "last_escalated_at": "2025-07-24T14:08:20.608477+00:00"}
d22eec29-21f5-4903-a2e6-2711f7524f81	6433e6e3-6f33-44c4-97d1-71a84ba23f74	API Gateway Down	All API requests returning 503	CRITICAL	OPEN	\N	d5602019-b767-405b-b432-3ae1d1ca71fe	\N	\N	2025-07-22 14:00:06.500885+00	\N	\N	2025-07-24 14:08:21.508869+00	\N	\N	\N	["api", "gateway", "outage"]	{"escalation_level": 3, "last_escalated_at": "2025-07-24T14:08:21.521728+00:00"}
b307a87b-7e6f-4102-9b27-80f3ab7f2a40	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Redis Cache Down	Redis cluster is not responding	CRITICAL	OPEN	\N	d5602019-b767-405b-b432-3ae1d1ca71fe	\N	\N	2025-07-22 14:06:01.557208+00	\N	\N	2025-07-24 14:09:06.637529+00	\N	\N	\N	["redis", "cache", "infrastructure"]	{"escalation_level": 3, "last_escalated_at": "2025-07-24T14:09:06.650278+00:00"}
d3bab64c-a764-4423-a35f-20875755a931	6433e6e3-6f33-44c4-97d1-71a84ba23f74	[web-server] High CPU Usage Detected (production)	CPU usage has been above 90% for 5 minutes\n\nAlert URL: https://monitoring.example.com/alert/cpu-high-001	CRITICAL	OPEN	\N	\N	\N	\N	2025-07-22 16:09:53.683263+00	\N	\N	2025-07-24 14:10:30.977405+00	\N	\N	\N	["cpu", "performance", "production", "source:generic", "alert_id:929c9ce6-a535-416d-b7da-5d80e2111a4b", "service:web-server", "env:production"]	{"escalation_level": 3, "last_escalated_at": "2025-07-24T14:10:30.989654+00:00"}
f01c58b8-6ad1-4d2d-8531-d4675607286f	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Memory usage is high	Memory usage is above 85% for the last 10 minutes\n\nAlert URL: https://app.datadoghq.com/alerts/123	HIGH	OPEN	\N	\N	\N	\N	2025-07-22 16:12:39.976918+00	\N	\N	2025-07-24 14:10:34.019958+00	\N	\N	\N	["env:production", "service:api", "source:datadog", "alert_id:9724899e-5775-4761-9fcf-e6efdd972f12"]	{"escalation_level": 3, "last_escalated_at": "2025-07-24T14:10:34.032686+00:00"}
70af3d5a-eb81-466f-a0c3-12c4fe77253f	8c6599e2-f76f-4f8f-86e8-227f4693ca68	Test Database Connection Issue	Testing incident creation with real token	HIGH	OPEN	\N	1f4debc1-5d92-4368-88d2-b2e7f5f8e4b6	\N	\N	2025-07-30 17:24:55.290748+00	\N	\N	2025-07-30 17:24:55.290748+00	\N	\N	\N	[]	{}
f743c76e-f455-4dc7-8d0c-65ac4b9f5657	9e5bf63c-8a05-4c9a-89ae-90dbe64d3d5c	Test Database Connection Issue	Testing incident creation with real token	HIGH	OPEN	\N	f13ec98f-ccfa-4b8a-97ee-f65eef56781c	\N	\N	2025-07-31 10:22:44.565989+00	\N	\N	2025-07-31 10:22:44.565989+00	\N	\N	\N	[]	{}
656b3acb-0840-4e77-8739-52e1357d152a	902888b5-d939-4081-a83e-2a79c353ceaf	Test Database Connection Issue	Testing incident creation with real token	HIGH	OPEN	\N	0bea99f4-429f-473a-af3c-53e2251e0e8b	\N	\N	2025-07-31 10:25:48.067233+00	\N	\N	2025-07-31 10:25:48.067233+00	\N	\N	\N	[]	{}
9cbdc291-7214-4041-8d5a-4711812dc917	e9235fb1-4414-4213-a7c5-0fbaf7414d3e	Test Database Connection Issue	Testing incident creation with real token	HIGH	OPEN	\N	2a7f0e2b-1bb3-4c47-8ad8-27b0b2aca49f	\N	\N	2025-08-01 15:29:31.513568+00	\N	\N	2025-08-01 15:29:31.513568+00	\N	\N	\N	[]	{}
b4ca59d4-1e31-49f8-82f2-d9d993135227	23cc289e-9c0b-4b90-8e39-f28cbfa30723	ec2 overload		CRITICAL	OPEN	\N	1eddc93f-a2c4-4f5f-a61e-64b5177c288e	\N	\N	2025-08-01 15:34:48.630847+00	\N	\N	2025-08-01 15:34:48.630847+00	\N	\N	\N	[]	{}
\.


--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.integrations (id, organization_id, name, type, is_active, config, webhook_url, webhook_secret, created_at, updated_at, last_sync_at) FROM stdin;
\.


--
-- Data for Name: mfa_secrets; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.mfa_secrets (id, user_id, encrypted_secret, backup_codes, enabled, created_at, last_used) FROM stdin;
\.


--
-- Data for Name: oauth_accounts; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.oauth_accounts (id, user_id, provider, provider_user_id, email, name, avatar_url, access_token, refresh_token, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.organizations (id, name, slug, plan, is_active, max_users, max_incidents_per_month, created_at, updated_at, stripe_customer_id, subscription_id, plan_type, subscription_status, current_period_end) FROM stdin;
d94b98e6-9b2c-4cd0-8715-57af865f35fa	Acme Corp	acme-corp	free	t	5	100	2025-07-22 13:10:25.596808+00	\N	\N	\N	free	active	\N
46759b20-7f76-4337-9bc1-611cbbdeeea0	Tech Startup Inc	tech-startup-inc	free	t	5	100	2025-07-22 13:11:54.736528+00	\N	\N	\N	free	active	\N
6433e6e3-6f33-44c4-97d1-71a84ba23f74	OnCall AI Corp	oncall-ai-corp	free	t	5	100	2025-07-22 13:39:14.409424+00	\N	\N	\N	free	active	\N
23cc289e-9c0b-4b90-8e39-f28cbfa30723	Oncall	oncall	free	t	5	100	2025-07-23 15:30:00.217793+00	\N	\N	\N	free	active	\N
fe7fb4fd-b160-4038-864b-2cbeeede6c74	OnCall AI Security	\N	free	t	5	100	2025-07-29 05:59:15.185134+00	2025-07-29 05:59:15.185135+00	\N	\N	free	active	\N
d2e6759b-e986-4dcd-b189-f0e4a4c20ef0	Test Organization	\N	free	t	5	100	2025-07-30 08:50:30.366953+00	2025-07-30 08:50:30.366955+00	\N	\N	free	active	\N
37e3bf1c-0d6c-4ffd-9d5f-98b164ef1f1f	Test Organization	\N	free	t	5	100	2025-07-30 08:54:45.731725+00	2025-07-30 08:54:45.731725+00	\N	\N	free	active	\N
e313b80c-011d-4a42-a81e-999b9893beba	Test Organization	\N	free	t	5	100	2025-07-30 08:58:38.021476+00	2025-07-30 08:58:38.021477+00	\N	\N	free	active	\N
b775bb42-ca4c-4e7f-a2bf-b0981c1f25e4	Test Organization	\N	free	t	5	100	2025-07-30 09:22:10.647758+00	2025-07-30 09:22:10.64776+00	\N	\N	free	active	\N
8c6599e2-f76f-4f8f-86e8-227f4693ca68	Test Organization	\N	free	t	5	100	2025-07-30 11:54:55.027014+00	2025-07-30 11:54:55.027015+00	\N	\N	free	active	\N
9e5bf63c-8a05-4c9a-89ae-90dbe64d3d5c	Test Organization	\N	free	t	5	100	2025-07-31 04:52:44.29831+00	2025-07-31 04:52:44.29831+00	\N	\N	free	active	\N
902888b5-d939-4081-a83e-2a79c353ceaf	Test Organization	\N	free	t	5	100	2025-07-31 04:55:47.815864+00	2025-07-31 04:55:47.815865+00	\N	\N	free	active	\N
e9235fb1-4414-4213-a7c5-0fbaf7414d3e	Test Organization	\N	free	t	5	100	2025-08-01 09:59:31.249093+00	2025-08-01 09:59:31.249095+00	\N	\N	free	active	\N
\.


--
-- Data for Name: runbooks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.runbooks (id, organization_id, created_by_id, title, description, content, tags, service_names, alert_patterns, is_active, usage_count, last_used_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: security_events; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.security_events (id, event_type, user_id, ip_address, user_agent, risk_level, details, "timestamp", resolved, resolved_at, resolved_by) FROM stdin;
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.team_members (team_id, user_id, role, joined_at) FROM stdin;
770ab373-904b-41d5-b5b7-3e4a842d1a4c	d5602019-b767-405b-b432-3ae1d1ca71fe	lead	2025-07-23 13:30:14.788433+00
199a078a-65d7-40e0-abe1-e11d98940f53	d5602019-b767-405b-b432-3ae1d1ca71fe	lead	2025-07-23 13:31:31.652925+00
60a81d7b-08ba-4b36-9380-ac0b784b5f81	d5602019-b767-405b-b432-3ae1d1ca71fe	lead	2025-07-23 13:33:11.365127+00
7fe27c43-028f-4b03-972e-acead5c4e5ff	d5602019-b767-405b-b432-3ae1d1ca71fe	lead	2025-07-23 13:34:33.568729+00
4186047c-cfee-470d-8e3c-e02adb245266	d5602019-b767-405b-b432-3ae1d1ca71fe	lead	2025-07-23 13:35:02.233497+00
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.teams (id, organization_id, name, description, is_active, created_at, updated_at) FROM stdin;
770ab373-904b-41d5-b5b7-3e4a842d1a4c	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Backend Team	Core API development team	t	2025-07-23 13:30:14.788433+00	2025-07-23 13:30:14.788433+00
199a078a-65d7-40e0-abe1-e11d98940f53	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Backend Team	Core API development team	t	2025-07-23 13:31:31.652925+00	2025-07-23 13:31:31.652925+00
60a81d7b-08ba-4b36-9380-ac0b784b5f81	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Backend Team	Core API development team	t	2025-07-23 13:33:11.365127+00	2025-07-23 13:33:11.365127+00
7fe27c43-028f-4b03-972e-acead5c4e5ff	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Backend Team	Core API development team	t	2025-07-23 13:34:33.568729+00	2025-07-23 13:34:33.568729+00
4186047c-cfee-470d-8e3c-e02adb245266	6433e6e3-6f33-44c4-97d1-71a84ba23f74	Frontend Team	UI/UX development team	t	2025-07-23 13:35:02.233497+00	2025-07-23 13:35:02.233497+00
\.


--
-- Data for Name: user_consents; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.user_consents (id, user_id, purpose, consent_status, "timestamp", ip_address, user_agent, metadata) FROM stdin;
\.


--
-- Data for Name: user_privacy_settings; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.user_privacy_settings (id, user_id, analytics_consent, marketing_consent, third_party_sharing, data_retention_preference, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.user_sessions (id, user_id, session_token, device_fingerprint, ip_address, user_agent, created_at, last_activity, expires_at, is_active) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users (id, organization_id, email, password_hash, full_name, role, is_active, is_verified, phone_number, timezone, notification_preferences, skills, created_at, updated_at, last_login_at, on_call_start, on_call_end, is_currently_on_call, mfa_enabled, last_password_change, failed_login_attempts, account_locked_until) FROM stdin;
b9b77fc5-4074-4500-a605-013260899a6b	d94b98e6-9b2c-4cd0-8715-57af865f35fa	john@example.com	$2b$12$QA0SqlCm3PV2mZfjM/p5HuTawctKwyrURZO8zL6IJD7zMjxZqQJ7C	John Doe	admin	t	t	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-22 13:10:25.596808+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
bacb4b4b-ed80-419b-9ed5-a897c6a264b9	46759b20-7f76-4337-9bc1-611cbbdeeea0	jane@example.com	$2b$12$1B6Qdq5cz4Nj.Bfzwskw/ugAA.u.7jGEfFmqgOKo2iAv6DI/rxgTW	Jane Smith	admin	t	t	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-22 13:11:54.736528+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
d5602019-b767-405b-b432-3ae1d1ca71fe	6433e6e3-6f33-44c4-97d1-71a84ba23f74	admin@oncall.ai	$2b$12$dR7NRWrXxbjZluJXlctxC.OzjnioUlwAy3ER0YiyreJe7hRHAC/HS	OnCall Admin	admin	t	t	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-22 13:39:14.409424+00	\N	\N	\N	\N	\N	\N	\N	\N	\N
1eddc93f-a2c4-4f5f-a61e-64b5177c288e	23cc289e-9c0b-4b90-8e39-f28cbfa30723	cbrahmam@gmail.com	$2b$12$2NH8CZHRQolYOAKjbjAc7Oo32quOCl.Ydj4ibiPdljO4KQ4CNQBD2	Brahmam	admin	t	t	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-23 15:30:00.217793+00	2025-08-03 13:59:45.448408+00	2025-08-03 08:29:45.660346+00	\N	\N	f	\N	\N	\N	\N
b90fddca-d6fe-4677-972c-1740a355ca9b	fe7fb4fd-b160-4038-864b-2cbeeede6c74	admin@oncall-ai.com	$2b$12$Ku/RtIWfPndSQsQZxyaRHeDGL.BqYWwP7F069ArHv9iiHvT6zpq6.	Security Admin	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-29 05:59:15.379198+00	2025-07-29 11:46:03.840676+00	2025-07-29 06:16:04.04591+00	\N	\N	f	\N	\N	\N	\N
3fcc4a23-8d94-4249-afc8-2b4b18bea84a	d2e6759b-e986-4dcd-b189-f0e4a4c20ef0	test1753885230@example.com	$2b$12$PMukPUKR/ZuyTyiuEkeaZOlArSnCe8/AyHstgJQZEckTocvHcb8tG	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-30 08:50:30.562537+00	2025-07-30 08:50:30.562537+00	\N	\N	\N	f	\N	\N	\N	\N
c168af0c-34de-4207-913a-3762ca2ba551	37e3bf1c-0d6c-4ffd-9d5f-98b164ef1f1f	test1753885485@example.com	$2b$12$SONY8H/ZcXBjdrXK4ZxHjeRqPU1.Q96OKhZrIcZWq5647PGqUe60S	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-30 08:54:45.924586+00	2025-07-30 08:54:45.924589+00	\N	\N	\N	f	\N	\N	\N	\N
4aeb5a3e-77c8-4977-b11e-f89718edc8d0	e313b80c-011d-4a42-a81e-999b9893beba	test1753885717@example.com	$2b$12$dH7CjLtwywIWxLYfOwxiOOB3iIi4XJt3fhTpl1dfyr0HeXzHrV3eu	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-30 08:58:38.214729+00	2025-07-30 08:58:38.214731+00	\N	\N	\N	f	\N	\N	\N	\N
ac685150-966d-4e90-a03f-59441c2b975c	b775bb42-ca4c-4e7f-a2bf-b0981c1f25e4	test1753887130@example.com	$2b$12$cdm.m4OSpsR5TPFBr.rhNeeWhy2FUJLSCh0e2xqTD8kwISstUMXgS	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-30 09:22:10.847713+00	2025-07-30 09:22:10.847714+00	\N	\N	\N	f	\N	\N	\N	\N
1f4debc1-5d92-4368-88d2-b2e7f5f8e4b6	8c6599e2-f76f-4f8f-86e8-227f4693ca68	test1753896294@example.com	$2b$12$ZB4NPbTxqrmMfKT.WrFNyeCV9tzyR8qPh8g3p/2IDb6rtQy3akbcq	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-30 11:54:55.227918+00	2025-07-30 11:54:55.22792+00	\N	\N	\N	f	\N	\N	\N	\N
f13ec98f-ccfa-4b8a-97ee-f65eef56781c	9e5bf63c-8a05-4c9a-89ae-90dbe64d3d5c	test1753957364@example.com	$2b$12$YwHCCXYzshcu3EE8Z587TuaPZkEtx9pfUk.059DGT//E45Z538vhK	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-31 04:52:44.498415+00	2025-07-31 04:52:44.498417+00	\N	\N	\N	f	\N	\N	\N	\N
0bea99f4-429f-473a-af3c-53e2251e0e8b	902888b5-d939-4081-a83e-2a79c353ceaf	test1753957547@example.com	$2b$12$CxQ1ZGbhc3eqBZKfyKbV/evlLKsfKqDMYq/qVGOj6rHtBxwOXC/3G	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-07-31 04:55:48.013487+00	2025-07-31 04:55:48.013489+00	\N	\N	\N	f	\N	\N	\N	\N
2a7f0e2b-1bb3-4c47-8ad8-27b0b2aca49f	e9235fb1-4414-4213-a7c5-0fbaf7414d3e	test1754062171@example.com	$2b$12$1f5vUSxagzlWRbXbkh3xAeGUllbOGyvYmLv/ziZqcML636GJJzvBO	Test User	admin	t	f	\N	UTC	{"email": true, "sms": true, "slack": true, "push": true}	[]	2025-08-01 09:59:31.447166+00	2025-08-01 09:59:31.447168+00	\N	\N	\N	f	\N	\N	\N	\N
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: escalation_policies escalation_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.escalation_policies
    ADD CONSTRAINT escalation_policies_pkey PRIMARY KEY (id);


--
-- Name: gdpr_requests gdpr_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: mfa_secrets mfa_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.mfa_secrets
    ADD CONSTRAINT mfa_secrets_pkey PRIMARY KEY (id);


--
-- Name: mfa_secrets mfa_secrets_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.mfa_secrets
    ADD CONSTRAINT mfa_secrets_user_id_key UNIQUE (user_id);


--
-- Name: oauth_accounts oauth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: runbooks runbooks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.runbooks
    ADD CONSTRAINT runbooks_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: oauth_accounts unique_provider_user; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT unique_provider_user UNIQUE (provider, provider_user_id);


--
-- Name: user_consents unique_user_purpose_consent; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT unique_user_purpose_consent UNIQUE (user_id, purpose);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: user_privacy_settings user_privacy_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_privacy_settings
    ADD CONSTRAINT user_privacy_settings_pkey PRIMARY KEY (id);


--
-- Name: user_privacy_settings user_privacy_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_privacy_settings
    ADD CONSTRAINT user_privacy_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_gdpr_requests_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_gdpr_requests_status ON public.gdpr_requests USING btree (status);


--
-- Name: idx_gdpr_requests_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_gdpr_requests_user_id ON public.gdpr_requests USING btree (user_id);


--
-- Name: idx_oauth_accounts_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_oauth_accounts_user_id ON public.oauth_accounts USING btree (user_id);


--
-- Name: idx_security_events_risk_level; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_security_events_risk_level ON public.security_events USING btree (risk_level);


--
-- Name: idx_security_events_timestamp; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_security_events_timestamp ON public.security_events USING btree ("timestamp");


--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: idx_user_consents_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_consents_user_id ON public.user_consents USING btree (user_id);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: ix_organizations_slug; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX ix_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: alerts alerts_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id);


--
-- Name: alerts alerts_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id);


--
-- Name: alerts alerts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: audit_logs audit_logs_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id);


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: escalation_policies escalation_policies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.escalation_policies
    ADD CONSTRAINT escalation_policies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: gdpr_requests gdpr_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.gdpr_requests
    ADD CONSTRAINT gdpr_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: incidents incidents_acknowledged_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_acknowledged_by_id_fkey FOREIGN KEY (acknowledged_by_id) REFERENCES public.users(id);


--
-- Name: incidents incidents_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);


--
-- Name: incidents incidents_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: incidents incidents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: incidents incidents_resolved_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_resolved_by_id_fkey FOREIGN KEY (resolved_by_id) REFERENCES public.users(id);


--
-- Name: integrations integrations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: mfa_secrets mfa_secrets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.mfa_secrets
    ADD CONSTRAINT mfa_secrets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_accounts oauth_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: runbooks runbooks_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.runbooks
    ADD CONSTRAINT runbooks_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: runbooks runbooks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.runbooks
    ADD CONSTRAINT runbooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: security_events security_events_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: teams teams_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: user_consents user_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_privacy_settings user_privacy_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_privacy_settings
    ADD CONSTRAINT user_privacy_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

