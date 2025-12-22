export interface BackendUser {
  id: string;
  email: string;
  name: string;
  orgId: string | null;
}

export interface BackendOrg {
  id: string;
  name: string;
  country: string;
  role: 'buyer' | 'supplier' | 'both';
}

export interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: BackendUser;
  org: BackendOrg;
  tokens: BackendTokens;
}

interface Org {
  id: string;
  name: string;
  country: string;
  role: 'buyer' | 'supplier' | 'both';
  kybStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  createdAt: string;
}
