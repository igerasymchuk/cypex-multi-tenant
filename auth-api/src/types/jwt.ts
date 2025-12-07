export type NoteScope = 'notes:read' | 'notes:write';

export interface JwtPayload {
  sub: string;        // User ID
  org_id: string;     // Organization ID
  role: string;       // User role (admin, editor)
  scopes: NoteScope[]; // Permission scopes
  email: string;      // User email
  iss: string;        // Issuer
  aud: string;        // Audience
  iat: number;        // Issued at
  exp: number;        // Expiration
}

export interface JwtClaims {
  sub: string;
  org_id: string;
  role: string;
  scopes: NoteScope[];
  email: string;
}
