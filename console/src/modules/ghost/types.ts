export interface Root {
  db: Db[]
}

export interface Db {
  data: Data
  meta: Meta
}

export interface Data {
  benefits: any[]
  custom_theme_settings: CustomThemeSetting[]
  newsletters: Newsletter[]
  offer_redemptions: any[]
  offers: any[]
  posts: Post[]
  posts_authors: PostsAuthor[]
  posts_meta: any[]
  posts_products: PostsProduct[]
  posts_tags: PostsTag[]
  products: Product[]
  products_benefits: any[]
  roles: Role[]
  roles_users: RolesUser[]
  settings: Setting[]
  snippets: any[]
  stripe_prices: any[]
  stripe_products: any[]
  tags: Tag[]
  users: User[]
}

export interface CustomThemeSetting {
  id: string
  key: string
  theme: string
  type: string
  value?: string
}

export interface Newsletter {
  background_color: string
  body_font_category: string
  border_color: any
  created_at: string
  description: any
  feedback_enabled: number
  footer_content: any
  header_image: any
  id: string
  name: string
  sender_email: any
  sender_name: any
  sender_reply_to: string
  show_badge: number
  show_comment_cta: number
  show_feature_image: number
  show_header_icon: number
  show_header_name: number
  show_header_title: number
  show_latest_posts: number
  show_post_title_section: number
  show_subscription_details: number
  slug: string
  sort_order: number
  status: string
  subscribe_on_signup: number
  title_alignment: string
  title_color: any
  title_font_category: string
  updated_at: string
  uuid: string
  visibility: string
}

export interface Post {
  canonical_url: any
  codeinjection_foot: any
  codeinjection_head: any
  comment_id: string
  created_at: string
  custom_excerpt: any
  custom_template: any
  email_recipient_filter: string
  feature_image?: string
  featured: number
  html: string
  id: string
  lexical?: string
  locale: any
  mobiledoc?: string
  newsletter_id: any
  plaintext: string
  published_at?: string
  show_title_and_feature_image: number
  slug: string
  status: string
  title: string
  type: 'post' | 'page'
  updated_at: string
  uuid: string
  visibility: 'public' | 'members' | 'paid' | 'tiers'
}

export interface PostsAuthor {
  author_id: string
  id: string
  post_id: string
  sort_order: number
}

export interface PostsProduct {
  id: string
  post_id: string
  product_id: string
  sort_order: number
}

export interface PostsTag {
  id: string
  post_id: string
  sort_order: number
  tag_id: string
}

export interface Product {
  active: number
  created_at: string
  currency?: string
  description: any
  id: string
  monthly_price?: number
  monthly_price_id: any
  name: string
  slug: string
  trial_days: number
  type: string
  updated_at: string
  visibility: string
  welcome_page_url: any
  yearly_price?: number
  yearly_price_id: any
}

export interface Role {
  created_at: string
  description: string
  id: string
  name: string
  updated_at: string
}

export interface RolesUser {
  id: string
  role_id: string
  user_id: string
}

export interface Setting {
  created_at: string
  flags?: string
  group: string
  id: string
  key: string
  type: string
  updated_at: string
  value?: string
}

export interface Tag {
  accent_color: any
  canonical_url: any
  codeinjection_foot: any
  codeinjection_head: any
  created_at: string
  description: any
  feature_image: any
  id: string
  meta_description: any
  meta_title: any
  name: string
  og_description: any
  og_image: any
  og_title: any
  parent_id: any
  slug: string
  twitter_description: any
  twitter_image: any
  twitter_title: any
  updated_at: string
  visibility: string
}

export interface User {
  accessibility: string
  bio: any
  comment_notifications: number
  cover_image: any
  created_at: string
  donation_notifications: number
  email: string
  facebook: any
  free_member_signup_notification: number
  id: string
  last_seen: string
  locale: any
  location: any
  mention_notifications: number
  meta_description: any
  meta_title: any
  milestone_notifications: number
  name: string
  paid_subscription_canceled_notification: number
  paid_subscription_started_notification: number
  password: string
  profile_image: string
  recommendation_notifications: number
  slug: string
  status: string
  tour: any
  twitter: any
  updated_at: string
  visibility: string
  website: any
}

export interface Meta {
  exported_on: number
  version: string
}
