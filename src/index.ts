// Wire types shared by ile-api (responses it produces, request bodies it
// accepts) and ile-app (what it sends and renders). Field names are
// camelCase on the wire; the API maps from snake_case DB columns.
//
// Timestamps are ISO-8601 strings. Money is a number in major units
// (e.g. 1250.5 = £1,250.50) alongside an explicit currency code.

export type UserRole = 'renter' | 'landlord' | 'institution_admin' | 'platform_admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

export interface RenterProfileSummary {
  kind: 'renter';
  bio: string | null;
  institutionId: string | null;
  createdAt: string;
}

export interface LandlordProfileSummary {
  kind: 'landlord';
  companyName: string | null;
  // 'unverified' until landlord verification exists; drives the publish
  // gate in the app (and on the API when REQUIRE_VERIFICATION=true).
  verificationStatus: string;
  createdAt: string;
}

export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  profile: RenterProfileSummary | LandlordProfileSummary | null;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type TrustPillar = 'community' | 'affordability' | 'reliability' | 'stability';
export type EvidenceStatus = 'submitted' | 'verified' | 'rejected' | 'withdrawn';

export interface EvidenceItem {
  id: string;
  renterId: string;
  pillar: TrustPillar;
  pathwayType: string;
  payload: Record<string, unknown>;
  status: EvidenceStatus;
  createdAt: string;
}

export interface SubmitEvidenceRequest {
  pillar: TrustPillar;
  pathwayType: string;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

export type PropertyStatus = 'draft' | 'published' | 'archived';

// Slugs, not display labels — the app maps these to its own copy
// ('no_smoking' -> "No smoking" etc).
export type PropertyRule = 'no_smoking' | 'no_pets' | 'sharers_ok';
export const PROPERTY_RULES: readonly PropertyRule[] = ['no_smoking', 'no_pets', 'sharers_ok'];

export interface Property {
  id: string;
  landlordId: string;
  title: string | null;
  description: string | null;
  addressLine1: string;
  city: string;
  postcode: string;
  bedrooms: number;
  rentAmount: number;
  currency: string;
  propertyRules: PropertyRule[];
  status: PropertyStatus;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyRequest {
  title?: string | null;
  description?: string | null;
  addressLine1: string;
  city: string;
  postcode: string;
  bedrooms: number;
  rentAmount: number;
  propertyRules?: PropertyRule[];
}

// No `status` — status only changes via POST /properties/:id/publish and
// POST /properties/:id/archive.
export type UpdatePropertyRequest = Partial<CreatePropertyRequest>;

export interface PropertyFeedResponse {
  items: Property[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// GET /landlords/:id — renter-facing landlord profile
// ---------------------------------------------------------------------------

// Public fields only: no email, phone, company or verification status.
// Only returned for a landlord with at least one published property.
export interface LandlordPublicProperty {
  id: string;
  addressLine1: string;
  city: string;
  bedrooms: number;
  rentAmount: number;
}

export interface LandlordPublicProfile {
  id: string;
  displayName: string;
  memberSince: string;
  // Published properties only, newest first.
  properties: LandlordPublicProperty[];
}

// ---------------------------------------------------------------------------
// Tenancy interests (mutual matching)
// ---------------------------------------------------------------------------

// 'withdrawn' exists in the DB enum but no endpoint reaches it yet.
export type TenancyInterestStatus = 'pending' | 'matched' | 'declined' | 'withdrawn';

export interface ExpressInterestRequest {
  propertyId: string;
  // Required when the caller is a landlord (which applicant they're
  // interested in). Ignored when the caller is a renter.
  renterId?: string;
}

// The two sides get different views of the same row. Neither ever
// includes evidence, pillar, trust or compatibility data.

// Landlord view: enough to recognise which of their properties it is.
export interface TenancyInterestPropertySummary {
  addressLine1: string;
  city: string;
  postcode: string;
  bedrooms: number;
  rentAmount: number;
  currency: string;
}

// Renter view: the listing itself.
export interface TenancyInterestPropertyDetails extends TenancyInterestPropertySummary {
  title: string | null;
  description: string | null;
  propertyRules: PropertyRule[];
}

interface TenancyInterestBase {
  id: string;
  renterId: string;
  propertyId: string;
  // A 'declined' row is only ever returned to the side that declined it.
  status: TenancyInterestStatus;
  renterInterestedAt: string | null;
  landlordInterestedAt: string | null;
  matchedAt: string | null;
  createdAt: string;
}

export interface RenterTenancyInterest extends TenancyInterestBase {
  viewerSide: 'renter';
  // The landlord's display name. null if the property is no longer
  // visible to the renter.
  counterparty: { displayName: string | null };
  // null when the renter can no longer see the property (it was archived
  // after they expressed interest).
  property: TenancyInterestPropertyDetails | null;
}

export interface LandlordTenancyInterest extends TenancyInterestBase {
  viewerSide: 'landlord';
  // The renter's display name.
  counterparty: { displayName: string | null };
  // Always present: a landlord can always see their own properties.
  property: TenancyInterestPropertySummary;
}

// Narrow on viewerSide.
export type TenancyInterest = RenterTenancyInterest | LandlordTenancyInterest;
