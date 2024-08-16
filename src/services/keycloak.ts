import { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';



declare module 'fastify' {
  interface FastifyRequest {
    user?: KeycloakUser;
  }
}

declare module 'jose' {
  interface JWTPayload {
    email?: string;
    preferred_username?: string;
    family_name?: string;
    given_name?: string;
    middle_name?: string;
  }
}

export interface KeycloakUser {
  id: string;
  email: string;
  username: string;
  middleName?: string;
  familyName?: string;
  givenName?: string;
}

export interface KeycloakOptions {
  url: string;
  realm: string;
}

export class KeycloakService {
  readonly options: KeycloakOptions;

  constructor(options: KeycloakOptions) {
    this.options = options;
  }

  static async authorize(req: FastifyRequest, rep: FastifyReply) {
    try {
      if (!req.headers.authorization) {
        throw Error('No authorization header.');
      }

      const authHeaderWords = req.headers.authorization.split(' ');

      if (!authHeaderWords[1]) {
        throw Error('No bearer token.');
      }

      const JWKSet = createRemoteJWKSet(
        new URL(
          `${'http://localhost:8080'}/realms/${'todolist'}/protocol/openid-connect/certs`
        )
      );
      const { payload } = await jwtVerify(authHeaderWords[1], JWKSet);

      if (!payload) {
        throw Error('Unauthorized.');
      }

      req.user = {
        id: payload['sub'] ?? '',
        email: payload['email'] ?? '',
        username: payload['preferred_username'] ?? '',
        familyName: payload['family_name'],
        givenName: payload['given_name'],
        middleName: payload['middle_name'],
      };
    } catch (err) {
      //rep.unauthorized(err instanceof Error ? err.message : undefined);
    }
  }
}
