export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  family: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface MembershipResponse {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  disabledAt: string | null;
  memberships: MembershipResponse[];
}

export interface LoginResponse {
  accessToken: string;
  user: UserProfileResponse;
}
