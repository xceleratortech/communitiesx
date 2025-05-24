--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4 (Ubuntu 17.4-1.pgdg22.04+2)
-- Dumped by pg_dump version 17.4 (Ubuntu 17.4-1.pgdg22.04+2)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp without time zone,
    refresh_token_expires_at timestamp without time zone,
    scope text,
    password text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text NOT NULL,
    post_id integer NOT NULL,
    author_id text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    parent_id integer,
    is_deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: hello; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hello (
    id integer NOT NULL,
    greeting text NOT NULL
);


ALTER TABLE public.hello OWNER TO postgres;

--
-- Name: hello_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hello_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hello_id_seq OWNER TO postgres;

--
-- Name: hello_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hello_id_seq OWNED BY public.hello.id;


--
-- Name: orgs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orgs (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.orgs OWNER TO postgres;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    author_id text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id text NOT NULL,
    group_id text,
    is_deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reactions (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reactions OWNER TO postgres;

--
-- Name: reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reactions_id_seq OWNER TO postgres;

--
-- Name: reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reactions_id_seq OWNED BY public.reactions.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean NOT NULL,
    image text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    org_id text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verifications (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.verifications OWNER TO postgres;

--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: hello id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hello ALTER COLUMN id SET DEFAULT nextval('public.hello_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: reactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reactions ALTER COLUMN id SET DEFAULT nextval('public.reactions_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at) FROM stdin;
account-97604ba1-2a61-4d47-b3fd-eb0a2a60573e	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	credential	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	\N	\N	\N	\N	\N	\N	e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f	2025-05-20 11:09:55.575	2025-05-20 11:09:55.575
account-e05ade95-1e65-4b3e-b80e-b5330f899d10	user-ac18d0cb-895d-45c5-b512-f0616d505419	credential	user-ac18d0cb-895d-45c5-b512-f0616d505419	\N	\N	\N	\N	\N	\N	e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f	2025-05-20 11:09:55.583	2025-05-20 11:09:55.583
account-d3e88f90-a3e4-41d2-b49e-af47034cf79c	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	credential	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	\N	\N	\N	\N	\N	\N	e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f	2025-05-20 11:09:55.588	2025-05-20 11:09:55.588
account-8a2f9eea-d03b-4570-bd0b-1cfcbf4c0c76	user-53796c67-9033-4999-8adb-5c9003eb81d7	credential	user-53796c67-9033-4999-8adb-5c9003eb81d7	\N	\N	\N	\N	\N	\N	e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f	2025-05-20 11:09:55.592	2025-05-20 11:09:55.592
account-7c46a2bb-0cbb-4e11-a0e7-70477f00754c	user-fca08953-998c-4e1e-a595-0a1f8b4db6a3	credential	user-fca08953-998c-4e1e-a595-0a1f8b4db6a3	\N	\N	\N	\N	\N	\N	e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f	2025-05-20 11:09:55.596	2025-05-20 11:09:55.596
account-0759bbd9-f460-4780-95af-d86446b98e40	user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d	credential	user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d	\N	\N	\N	\N	\N	\N	e18bb84aee2c5dd391e0252c4d1e4524:b8463ac6d03716b73a2470bcd4a85976655ce7f72e6595ade1ff0ac03b2b80c01c852e0d7d46b2bfbbe734193993a15748958534d451ff77a985ccaa8c346c3f	2025-05-20 11:09:55.6	2025-05-20 11:09:55.6
k8To7qGeTYdMyZwEdkuc9	john@xcelerator.co.in	email	mMH-VV7UZsnmVCAPn-U4j	\N	\N	\N	\N	\N	\N	$2b$10$FERiFJ2v3EyqKDDLhmzYuO3LYx4hMvbsimgzYZBzRD4tpAm.0xoXe	2025-05-23 07:57:18.984	2025-05-23 07:57:18.984
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, content, post_id, author_id, created_at, updated_at, parent_id, is_deleted) FROM stdin;
116	Great post! This is a comment from Raj Sharma.	47	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.63	2025-05-20 11:09:55.63	\N	f
117	Great post! This is a comment from Ranjan Bhat.	47	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.633	2025-05-20 11:09:55.633	\N	f
118	Great post! This is a comment from Neeraj Gowda.	47	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.635	2025-05-20 11:09:55.635	\N	f
119	Great post! This is a comment from Raj Sharma.	48	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.637	2025-05-20 11:09:55.637	\N	f
120	Great post! This is a comment from Ranjan Bhat.	48	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.639	2025-05-20 11:09:55.639	\N	f
121	Great post! This is a comment from Neeraj Gowda.	48	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.641	2025-05-20 11:09:55.641	\N	f
122	Great post! This is a comment from Demo Admin.	49	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.643	2025-05-20 11:09:55.643	\N	f
123	Great post! This is a comment from Ranjan Bhat.	49	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.645	2025-05-20 11:09:55.645	\N	f
124	Great post! This is a comment from Neeraj Gowda.	49	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.646	2025-05-20 11:09:55.646	\N	f
125	Great post! This is a comment from Demo Admin.	50	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.648	2025-05-20 11:09:55.648	\N	f
126	Great post! This is a comment from Ranjan Bhat.	50	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.65	2025-05-20 11:09:55.65	\N	f
127	Great post! This is a comment from Neeraj Gowda.	50	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.652	2025-05-20 11:09:55.652	\N	f
128	Great post! This is a comment from Demo Admin.	51	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.654	2025-05-20 11:09:55.654	\N	f
129	Great post! This is a comment from Raj Sharma.	51	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.656	2025-05-20 11:09:55.656	\N	f
130	Great post! This is a comment from Neeraj Gowda.	51	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.657	2025-05-20 11:09:55.657	\N	f
131	Great post! This is a comment from Demo Admin.	52	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.659	2025-05-20 11:09:55.659	\N	f
132	Great post! This is a comment from Raj Sharma.	52	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.661	2025-05-20 11:09:55.661	\N	f
134	Great post! This is a comment from Demo Admin.	53	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.665	2025-05-20 11:09:55.665	\N	f
135	Great post! This is a comment from Raj Sharma.	53	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.667	2025-05-20 11:09:55.667	\N	f
136	Great post! This is a comment from Ranjan Bhat.	53	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.669	2025-05-20 11:09:55.669	\N	f
137	Great post! This is a comment from Demo Admin.	54	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.671	2025-05-20 11:09:55.671	\N	f
138	Great post! This is a comment from Raj Sharma.	54	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.672	2025-05-20 11:09:55.672	\N	f
139	Great post! This is a comment from Ranjan Bhat.	54	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.674	2025-05-20 11:09:55.674	\N	f
140	Great post! This is a comment from Demo Admin.	55	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.675	2025-05-20 11:09:55.675	\N	f
141	Great post! This is a comment from Raj Sharma.	55	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.677	2025-05-20 11:09:55.677	\N	f
142	Great post! This is a comment from Ranjan Bhat.	55	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.678	2025-05-20 11:09:55.678	\N	f
143	Great post! This is a comment from Demo Admin.	56	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.679	2025-05-20 11:09:55.679	\N	f
144	Great post! This is a comment from Raj Sharma.	56	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.681	2025-05-20 11:09:55.681	\N	f
145	Great post! This is a comment from Ranjan Bhat.	56	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.683	2025-05-20 11:09:55.683	\N	f
146	Great post! This is a comment from Demo Admin.	57	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.684	2025-05-20 11:09:55.684	\N	f
147	Great post! This is a comment from Raj Sharma.	57	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.685	2025-05-20 11:09:55.685	\N	f
148	Great post! This is a comment from Ranjan Bhat.	57	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.687	2025-05-20 11:09:55.687	\N	f
149	Great post! This is a comment from Demo Admin.	58	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.689	2025-05-20 11:09:55.689	\N	f
150	Great post! This is a comment from Raj Sharma.	58	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.691	2025-05-20 11:09:55.691	\N	f
151	Great post! This is a comment from Ranjan Bhat.	58	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.693	2025-05-20 11:09:55.693	\N	f
133	Great post man! This is a comment from Neeraj Gowda.	52	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.663	2025-05-21 10:27:39.152	\N	f
160	Testing.	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 05:53:41.799	2025-05-22 06:40:02.434	157	f
153	Nice insight	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-21 12:00:30.133	2025-05-21 12:00:30.133	\N	f
161	Testing2	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 06:45:47.031	2025-05-22 06:45:47.031	157	f
152	Very insightful	52	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-21 10:27:58.209	2025-05-21 10:28:08.977	\N	f
154	Good work	62	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-21 12:19:12.415	2025-05-21 12:19:12.415	153	f
162	Testing 3	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 06:46:07.161	2025-05-22 06:46:07.161	160	f
155	Thanks	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-21 12:42:13.126	2025-05-21 12:42:13.126	154	f
156	Keep supporting	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-21 12:43:52.803	2025-05-21 12:43:52.803	154	f
157	Thank you	62	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-22 05:52:10.89	2025-05-22 05:52:10.89	153	f
158	He always does a great job	62	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-22 05:52:53.289	2025-05-22 05:52:53.289	157	f
159	Test	62	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 05:53:27.708	2025-05-22 05:53:27.708	158	f
163	🔥 This is such a game-changer for TypeScript developers. One of the biggest pain points in full-stack apps has always been maintaining the contract between frontend and backend — especially when dealing with REST or even GraphQL. You end up duplicating types, writing boilerplate schemas, and constantly worrying about things falling out of sync.\n\nWhat I love about tRPC is that it just removes that entire category of bugs. Since your server-side procedures are typed and consumed directly by the client using generated hooks (thanks to createTRPCReact), you get end-to-end type safety with zero additional effort.\n\nAnother underrated benefit is the developer experience. You get full IntelliSense, autocomplete, and validation in your IDE across the entire stack. And because you're using Zod for input validation, the API feels super clean and expressive without needing a separate schema layer like you would in GraphQL.\n\nPair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.\n\nOnly thing to keep in mind is that tRPC works best within a monorepo or tightly coupled full-stack app — it's not intended for public APIs where decoupling is essential. But for internal tools, dashboards, SaaS apps, and developer products? It's honestly hard to beat.\n\n🚀 Highly recommend giving it a spin if you haven’t already!	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 06:55:02.623	2025-05-22 06:55:02.623	\N	f
164	Sure. Let me give it a reading. It looks promising.	63	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-22 06:56:01.429	2025-05-22 06:56:01.429	163	f
166	You are welcome	63	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-22 07:04:26.018	2025-05-22 07:04:26.018	165	f
167	This is a great post. Everyone should read this	63	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-22 07:05:13.656	2025-05-22 07:05:13.656	\N	f
168	I appreciate your support	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 07:05:34.731	2025-05-22 07:05:34.731	167	f
169	.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 07:06:37.373	2025-05-22 07:06:57.424	165	f
170	Will keep posting such posts	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 07:07:16.211	2025-05-22 07:07:16.211	164	f
171	That would be a great initiative. Keep doing	63	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-22 07:07:46.884	2025-05-22 07:07:46.884	170	f
165	Thanks. Good to hear	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 07:01:17.266	2025-05-22 08:08:11.311	164	t
172	Testing Comments	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 08:09:06.163	2025-05-22 08:09:06.163	\N	f
173	Testing Comments 1	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 08:09:18.861	2025-05-22 08:09:18.861	172	f
174	Testing Comments 2	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 08:09:27.765	2025-05-22 08:09:27.765	173	f
176	Testing Comments 4	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 08:09:41.96	2025-05-22 08:09:41.96	175	f
177	Testing Comments 5	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 08:09:50.791	2025-05-22 08:09:50.791	176	f
175	Testing Comments 3	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 08:09:34.258	2025-05-22 08:10:10.772	174	t
178	thank you	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:03:25.621	2025-05-22 10:03:25.621	167	f
179	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:04:09.091	2025-05-22 10:04:09.091	171	f
180	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:04:23.156	2025-05-22 10:04:23.156	171	f
181	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:04:40.111	2025-05-22 10:04:40.111	179	f
182	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:04:49.736	2025-05-22 10:04:49.736	181	f
183	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:05:00.202	2025-05-22 10:05:00.202	182	f
184	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:05:11.277	2025-05-22 10:05:11.277	183	f
185	Test comment	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:27:19.497	2025-05-22 10:27:19.497	170	f
186	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:37:06.893	2025-05-22 10:37:06.893	184	f
187	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:37:17.201	2025-05-22 10:37:17.201	186	f
188	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:41:48.227	2025-05-22 10:41:48.227	187	f
189	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:41:59.071	2025-05-22 10:41:59.071	188	f
190	Pair it with next-auth, drizzle-orm, and react-query, and you’ve got a modern, scalable full-stack TypeScript app with minimal friction.	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 10:42:08.446	2025-05-22 10:42:08.446	189	f
191	Hello	63	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-23 06:35:51.906	2025-05-23 06:35:51.906	\N	f
\.


--
-- Data for Name: hello; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hello (id, greeting) FROM stdin;
\.


--
-- Data for Name: orgs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orgs (id, name) FROM stdin;
org-935fb015-1621-4514-afcf-8cf8c759ec27	Xcelerator
THWrGxwfA0F3PpjULmmXp	Atria University
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, title, content, author_id, created_at, updated_at, org_id, group_id, is_deleted) FROM stdin;
47	Demo Admin's Post 1	This is a demo post 1 by Demo Admin. It contains some sample content for demonstration purposes.	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.602	2025-05-20 11:09:55.602	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
48	Demo Admin's Post 2	This is a demo post 2 by Demo Admin. It contains some sample content for demonstration purposes.	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	2025-05-20 11:09:55.606	2025-05-20 11:09:55.606	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
49	Raj Sharma's Post 1	This is a demo post 1 by Raj Sharma. It contains some sample content for demonstration purposes.	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.608	2025-05-20 11:09:55.608	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
50	Raj Sharma's Post 2	This is a demo post 2 by Raj Sharma. It contains some sample content for demonstration purposes.	user-ac18d0cb-895d-45c5-b512-f0616d505419	2025-05-20 11:09:55.61	2025-05-20 11:09:55.61	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
51	Ranjan Bhat's Post 1	This is a demo post 1 by Ranjan Bhat. It contains some sample content for demonstration purposes.	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.613	2025-05-20 11:09:55.613	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
52	Ranjan Bhat's Post 2	This is a demo post 2 by Ranjan Bhat. It contains some sample content for demonstration purposes.	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:09:55.615	2025-05-20 11:09:55.615	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
53	Neeraj Gowda's Post 1	This is a demo post 1 by Neeraj Gowda. It contains some sample content for demonstration purposes.	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.617	2025-05-20 11:09:55.617	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
55	Anju Reddy's Post 1	This is a demo post 1 by Anju Reddy. It contains some sample content for demonstration purposes.	user-fca08953-998c-4e1e-a595-0a1f8b4db6a3	2025-05-20 11:09:55.621	2025-05-20 11:09:55.621	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
56	Anju Reddy's Post 2	This is a demo post 2 by Anju Reddy. It contains some sample content for demonstration purposes.	user-fca08953-998c-4e1e-a595-0a1f8b4db6a3	2025-05-20 11:09:55.624	2025-05-20 11:09:55.624	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
57	Surya Murugan's Post 1	This is a demo post 1 by Surya Murugan. It contains some sample content for demonstration purposes.	user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d	2025-05-20 11:09:55.626	2025-05-20 11:09:55.626	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
58	Surya Murugan's Post 2	This is a demo post 2 by Surya Murugan. It contains some sample content for demonstration purposes.	user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d	2025-05-20 11:09:55.628	2025-05-20 11:09:55.628	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
61	Riders Safety guidelines.	Safety tips for long rides	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 12:05:00.605	2025-05-21 07:29:28.146	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
54	Neeraj Gowda's Post 2	This is a demo post 2 by Neeraj Gowda. It contains some sample content for demonstration purposes only.	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-20 11:09:55.619	2025-05-21 07:39:32.82	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
63	Getting Started with tRPC: Type-Safe APIs Without the Boilerplate	If you’re building a full-stack TypeScript app and tired of writing and maintaining separate API contracts — check out tRPC.\n\nWith tRPC, you can:\n✅ Define backend procedures in one place\n✅ Get fully type-safe access to them in the frontend\n✅ Skip REST and GraphQL schemas entirely\n\nIt works seamlessly with libraries like React Query, Next.js, and Zod, making it perfect for modern TypeScript stacks.\n\n\nEx-\n// Server\nconst appRouter = router({\n  getUser: publicProcedure\n    .input(z.string())\n    .query(({ input }) => getUserById(input)),\n});\n\n// Client\nconst { data } = trpc.getUser.useQuery('user-id-123');	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-22 06:52:29.103	2025-05-22 06:52:29.103	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
62	NextJs Project	NextJs is too awesome	user-53796c67-9033-4999-8adb-5c9003eb81d7	2025-05-21 11:59:56.305	2025-05-23 06:17:44.589	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	t
67	Check Post	<ul class="list-disc ml-4"><li><p>Check Post</p></li><li><p>Check Post 2</p></li></ul><ol class="list-decimal ml-4"><li><p>Check Post 1</p></li><li><p>Check Post 2</p></li></ol><p></p><h1>Content Of the Post</h1><blockquote><p><em>Content Content COntent s Content Content</em></p></blockquote><p></p>	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-23 10:50:34.661	2025-05-23 10:50:43.444	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
60	Test Post.	Test Post Content	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-20 11:59:44.887	2025-05-23 07:01:50.735	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	t
64	AI-powered productivity	<p>Get work done faster with the only AI-powered assistant tailored to your role.</p><p></p><ul><li><p>Get work done faster with the only AI-powered assistant tailored to your role.</p></li><li><p>Get work done faster with the only AI-powered assistant tailored to your role.</p></li><li><p>Get work done faster with the only AI-powered assistant tailored to your role.</p></li><li><p>Get work done faster with the only AI-powered assistant tailored to your role.</p></li><li><p></p></li></ul>	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-23 09:59:07.539	2025-05-23 09:59:07.539	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
65	Test Post	<ol><li><p>Test 123</p></li><li><p>Test 234</p></li><li><p>Test 345</p></li></ol>	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-23 10:33:51.591	2025-05-23 10:34:28.175	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
66	Testing posts	<ul class="list-disc ml-4"><li><p>Testing1</p></li><li><p>Testing2</p></li><li><p>Testing3</p></li></ul><ol class="list-decimal ml-4"><li><p>Test1</p></li><li><p>Test2 </p></li></ol>	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	2025-05-23 10:40:36.821	2025-05-23 10:40:56.634	org-935fb015-1621-4514-afcf-8cf8c759ec27	\N	f
\.


--
-- Data for Name: reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reactions (id, post_id, user_id, type, created_at) FROM stdin;
74	47	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.695
75	47	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	love	2025-05-20 11:09:55.697
76	48	user-ac18d0cb-895d-45c5-b512-f0616d505419	love	2025-05-20 11:09:55.698
77	48	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	like	2025-05-20 11:09:55.7
78	49	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	like	2025-05-20 11:09:55.702
79	49	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	like	2025-05-20 11:09:55.704
80	50	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.707
81	50	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	like	2025-05-20 11:09:55.708
82	51	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	like	2025-05-20 11:09:55.71
83	51	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.712
84	52	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.713
85	52	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.715
86	53	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.717
87	53	user-ac18d0cb-895d-45c5-b512-f0616d505419	love	2025-05-20 11:09:55.718
88	54	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.72
89	54	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.722
90	55	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.724
91	55	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.726
92	56	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	like	2025-05-20 11:09:55.727
93	56	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.728
94	57	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.73
95	57	user-ac18d0cb-895d-45c5-b512-f0616d505419	love	2025-05-20 11:09:55.731
96	58	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	love	2025-05-20 11:09:55.733
97	58	user-ac18d0cb-895d-45c5-b512-f0616d505419	like	2025-05-20 11:09:55.735
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id) FROM stdin;
egrmG1wZmPljRJ9GiPGrKAjnww17jy7W	2025-05-27 11:36:50.164	Qn0LkPJoDu4Y36wU9M8f4g3fbDp0aay3	2025-05-20 11:36:50.164	2025-05-20 11:36:50.164		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6
6V22FHyeCpjd9J3evRSJaneocxtrwiY5	2025-05-27 11:43:16.046	mF07Otizv1nkLYiSeqpTIvXE8c51GQgo	2025-05-20 11:43:16.046	2025-05-20 11:43:16.046		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6
Z8tSJX7j7fSjn7X01QhrpTbjlPYGtDm9	2025-05-30 07:00:54.113	EjQbZchvgqq9pLpGQ3KU5lDVsjgnbouk	2025-05-22 06:53:42.989	2025-05-22 06:53:42.989		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6
0wmuvxVHqMngVDm8tb6EzEjyrctkaIyL	2025-05-30 07:27:57.405	z2wgclewXDHzE2JQGKp5I9bNrG4hSQEQ	2025-05-23 07:27:57.406	2025-05-23 07:27:57.406		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36	admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad
2CDPvxxXBmgk32ElSNuyH51xErn5dyNu	2025-05-30 09:50:23.006	d8nx4LHlSbpKttMK2N0aSfqexwtS5mni	2025-05-23 09:50:23.006	2025-05-23 09:50:23.006		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36	user-133dd0be-1eee-4599-bab3-1b427b3b8ab6
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, email_verified, image, created_at, updated_at, org_id, role) FROM stdin;
admin-4b422564-cf2c-4dfa-86ee-e1369d8264ad	Demo Admin	it@xcelerator.co.in	t	\N	2025-05-20 11:09:55.569	2025-05-20 11:09:55.569	org-935fb015-1621-4514-afcf-8cf8c759ec27	admin
user-ac18d0cb-895d-45c5-b512-f0616d505419	Raj Sharma	raj@xcelerator.co.in	t	\N	2025-05-20 11:09:55.579	2025-05-20 11:09:55.579	org-935fb015-1621-4514-afcf-8cf8c759ec27	user
user-133dd0be-1eee-4599-bab3-1b427b3b8ab6	Ranjan Bhat	ranjan@xcelerator.co.in	t	\N	2025-05-20 11:09:55.585	2025-05-20 11:09:55.585	org-935fb015-1621-4514-afcf-8cf8c759ec27	user
user-53796c67-9033-4999-8adb-5c9003eb81d7	Neeraj Gowda	neeraj@xcelerator.co.in	t	\N	2025-05-20 11:09:55.59	2025-05-20 11:09:55.59	org-935fb015-1621-4514-afcf-8cf8c759ec27	user
user-fca08953-998c-4e1e-a595-0a1f8b4db6a3	Anju Reddy	anju@xcelerator.co.in	t	\N	2025-05-20 11:09:55.594	2025-05-20 11:09:55.594	org-935fb015-1621-4514-afcf-8cf8c759ec27	user
user-a5f3d2e6-eb3a-4f52-95dd-2544fa32fb6d	Surya Murugan	surya@xcelerator.co.in	t	\N	2025-05-20 11:09:55.598	2025-05-20 11:09:55.598	org-935fb015-1621-4514-afcf-8cf8c759ec27	user
mMH-VV7UZsnmVCAPn-U4j	John	john@xcelerator.co.in	t	\N	2025-05-23 07:57:18.984	2025-05-23 07:57:18.984	THWrGxwfA0F3PpjULmmXp	user
\.


--
-- Data for Name: verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verifications (id, identifier, value, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 191, true);


--
-- Name: hello_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hello_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 67, true);


--
-- Name: reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reactions_id_seq', 97, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: hello hello_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hello
    ADD CONSTRAINT hello_pkey PRIMARY KEY (id);


--
-- Name: orgs orgs_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orgs
    ADD CONSTRAINT orgs_name_unique UNIQUE (name);


--
-- Name: orgs orgs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orgs
    ADD CONSTRAINT orgs_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_parent_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_comments_id_fk FOREIGN KEY (parent_id) REFERENCES public.comments(id);


--
-- Name: comments comments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: posts posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: posts posts_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- Name: reactions reactions_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_org_id_orgs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_orgs_id_fk FOREIGN KEY (org_id) REFERENCES public.orgs(id);


--
-- PostgreSQL database dump complete
--

