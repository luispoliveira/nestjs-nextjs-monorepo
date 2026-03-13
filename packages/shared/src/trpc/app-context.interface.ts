import { Request, Response } from 'express';

export interface AppContextInterface {
  req: Request;
  res: Response;
  user: unknown;
  session: unknown;
}
