import { Request, Response, NextFunction } from 'express';
import { Store } from '../services/Store';
import { hashPassword, comparePassword } from '../services/Hash';
import { signToken, verifyToken } from '../services/Jwt';
import { User } from '../models/types';

// Extended request interface to store user object
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * Middleware to authenticate requests via JWT.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Authentication failed' });
  }
}

/**
 * Register a new user.
 */
export function signup(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const existingEmail = Store.getUserByEmail(email);
  if (existingEmail) {
    return res.status(400).json({ error: 'Email is already registered' });
  }

  const passwordHash = hashPassword(password);
  
  // Simulated 6-digit email verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const newUser: User = {
    id: 'usr-' + Math.random().toString(36).substr(2, 9),
    username,
    email,
    passwordHash,
    isVerified: false,
    verificationCode,
    createdAt: new Date().toISOString()
  };

  Store.saveUser(newUser);

  const token = signToken({
    id: newUser.id,
    email: newUser.email,
    username: newUser.username
  });

  // Return the code in response so the simulator frontend can display it in UI
  return res.status(201).json({
    message: 'User registered. Please verify your email.',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      isVerified: newUser.isVerified
    },
    verificationCode // Simulated email delivery output
  });
}

/**
 * Verify user email via code.
 */
export function verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const user = Store.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.verificationCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  Store.saveUser(user);

  const token = signToken({
    id: user.id,
    email: user.email,
    username: user.username
  });

  return res.json({
    message: 'Email verified successfully',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified
    }
  });
}

/**
 * Login user.
 */
export function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = Store.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!comparePassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    username: user.username
  });

  return res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified
    }
  });
}

/**
 * Request password reset (Forgot Password).
 */
export function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = Store.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Email is not registered' });
  }

  // Simulated password reset code
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  const resetExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetExpires;
  Store.saveUser(user);

  return res.json({
    message: 'Reset instructions generated.',
    email,
    resetToken, // Return the code so simulator UI can auto-populate/display
    expiresAt: resetExpires
  });
}

/**
 * Reset password.
 */
export function resetPassword(req: Request, res: Response) {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  const user = Store.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.resetPasswordToken !== token) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }

  if (user.resetPasswordExpires && new Date(user.resetPasswordExpires).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Reset code has expired' });
  }

  user.passwordHash = hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  Store.saveUser(user);

  return res.json({ message: 'Password has been reset successfully' });
}

/**
 * Fetch current user profile from token.
 */
export function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'User session not found' });
  }

  const user = Store.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User details not found' });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified
    }
  });
}
