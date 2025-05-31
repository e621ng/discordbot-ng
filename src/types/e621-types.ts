export type E621User = {
  wiki_page_version_count: number
  artist_version_count: number
  pool_version_count: number
  forum_post_count: number
  comment_count: number
  flag_count: number
  favorite_count: number
  positive_feedback_count: number
  neutral_feedback_count: number
  negative_feedback_count: number
  upload_limit: number
  profile_about: string
  profile_artinfo: string
  id: number
  created_at: string
  name: string
  level: number
  base_upload_limit: number
  post_upload_count: number
  post_update_count: number
  note_update_count: number
  is_banned: boolean
  can_approve_posts: boolean
  can_upload_free: boolean
  level_string: string
  avatar_id: number
}

export type E621Post = {
  id: number
  created_at: string
  updated_at: string
  file: E621File
  preview: E621PreviewFile
  sample: E621SampleFile
  score: E621ScoreData
  tags: E621Tags
  locked_tags: string[]
  change_seq: number
  flags: E621FlagData
  rating: 's' | 'q' | 'e'
  fav_count: number
  sources: string[]
  pools: number[]
  relationships: E621PostRelationships
  approver_id: number
  uploader_id: number
  description: string
  comment_count: number
  is_favorited: boolean
  has_notes: boolean
  duration: number | null
}

export type E621File = {
  width: number
  height: number
  ext: 'png' | 'jpg' | 'mp4' | 'webm'
  size: number
  md5: string
  url: string | null
}

export type E621PreviewFile = {
  width: number
  height: number
  url: string | null
}

export type E621SampleFile = {
  has: boolean
  height: number
  width: number
  url: string | null
  // Typing this will be a pain in the ass, so I skipped it for now.
  alternates: any
}

export type E621ScoreData = {
  up: number
  down: number
  total: number
}

export type E621Tags = {
  general: string[]
  artist: string[]
  contributor: string[]
  copyright: string[]
  character: string[]
  species: string[]
  invalid: string[]
  meta: string[]
  lore: string[]
}

export type E621FlagData = {
  pending: boolean
  flagged: boolean
  note_locked: boolean
  status_locked: boolean
  rating_locked: boolean
  deleted: boolean
}

export type E621PostRelationships = {
  parent_id: number | null
  has_children: boolean
  has_active_children: boolean
  children: number[]
}

export type Ticket = {
  id: number
  user_id: number
  user: string
  claimant: string | null
  target?: string
  status: 'pending' | 'partial' | 'approved'
  category: 'blip' | 'comment' | 'dmail' | 'forum' | 'pool' | 'post' | 'set' | 'user' | 'wiki'
  reason: string
};

export type TicketUpdate = {
  action: 'claim' | 'create' | 'unclaim' | 'update'
  ticket: Ticket
};

export type Ban = {
  id: number
  user_id: number
  banner_id: number
  expires_at: string
  reason: string
};

export type BanUpdate = {
  action: 'create' | 'update' | 'delete'
  ban: Ban
};

export type RecordCategory = 'positive' | 'negative' | 'neutral'

export type Record = {
  id: number
  user_id: number
  creator_id: number
  created_at: string
  body: string
  category: RecordCategory
  updated_at: string
  updater_id: number
  is_deleted: boolean
}