import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SECRET_KEY = process.env.JWT_SECRET || 'secret-chave-terapeutica-super-segura-2026';

// Hashing de Senhas
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedValue: string): boolean {
  try {
    const [salt, originalHash] = storedValue.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (err) {
    return false;
  }
}

// Interface de Payload de Sessão
export interface TokenPayload {
  id: string;
  role: 'profissional' | 'paciente';
  email: string;
}

// Geração de Token HMAC-SHA256 (compatível com estrutura JWT)
export function generateToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadData = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 24 * 60 * 60 * 1000 // Expira em 24h
    })
  ).toString('base64url');

  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(`${header}.${payloadData}`);
  const signature = hmac.digest('base64url');

  return `${header}.${payloadData}.${signature}`;
}

// Verificação de Token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [header, payloadData, signature] = token.split('.');
    if (!header || !payloadData || !signature) return null;

    // Validar assinatura
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(`${header}.${payloadData}`);
    const expectedSignature = hmac.digest('base64url');

    if (signature !== expectedSignature) return null;

    // Ler Payload e verificar expiração
    const payload = JSON.parse(
      Buffer.from(payloadData, 'base64url').toString('utf8')
    );

    if (Date.now() > payload.exp) {
      return null; // Token expirado
    }

    return {
      id: payload.id,
      role: payload.role,
      email: payload.email
    };
  } catch (err) {
    return null;
  }
}

// Middleware de Autenticação para Express
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ erro: 'Acesso negado. Token inválido ou expirado.' });
  }

  (req as AuthenticatedRequest).user = decoded;
  next();
}
