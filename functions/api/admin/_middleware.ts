import { adminGuard } from '../../_lib/access';

export const onRequest = adminGuard;
