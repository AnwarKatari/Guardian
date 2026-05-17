import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, customUser?: any) {
  const targetUser = customUser || auth.currentUser;
  
  let userFriendlyMessage = 'An unexpected database error occurred.';
  let errorCode = '';

  if (error && typeof error === 'object' && 'code' in error) {
    errorCode = (error as any).code;
    switch (errorCode) {
      case 'permission-denied':
        userFriendlyMessage = 'You do not have permission to perform this action. Your session may have expired or you may be accessing restricted data.';
        break;
      case 'unauthenticated':
        userFriendlyMessage = 'Please sign in to continue.';
        break;
      case 'not-found':
        userFriendlyMessage = 'The requested information could not be found.';
        break;
      case 'already-exists':
        userFriendlyMessage = 'This record already exists.';
        break;
      case 'resource-exhausted':
        userFriendlyMessage = 'Daily limit reached. Please try again tomorrow.';
        break;
      case 'deadline-exceeded':
        userFriendlyMessage = 'The operation took too long. Please check your connection and try again.';
        break;
      case 'unavailable':
        userFriendlyMessage = 'The database is temporarily unavailable. Please try again in a few moments.';
        break;
      case 'failed-precondition':
        userFriendlyMessage = 'The operation failed because the system is in an unexpected state. This often happens if a required index is missing.';
        break;
      case 'aborted':
        userFriendlyMessage = 'The operation was aborted. Please try again.';
        break;
      case 'out-of-range':
        userFriendlyMessage = 'Data is out of range.';
        break;
      case 'unimplemented':
        userFriendlyMessage = 'This operation is not yet implemented or enabled.';
        break;
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: targetUser?.uid,
      email: targetUser?.email,
      emailVerified: targetUser?.emailVerified,
      isAnonymous: targetUser?.isAnonymous,
      tenantId: targetUser?.tenantId,
      providerInfo: targetUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const detailedLog = JSON.stringify(errInfo);
  console.error('Firestore Error Detailed Log:', detailedLog);
  
  // Create a new error with the user-friendly message but attach the detailed log for system debugging
  const finalError = new Error(userFriendlyMessage);
  (finalError as any).details = errInfo;
  (finalError as any).code = errorCode;
  
  // NOTE: We still throw the JSON string as per instructions for the system to diagnose
  // but we can also use the user-friendly message in UI if we want.
  // Actually the instruction says: "The new error's message MUST be a JSON string"
  throw new Error(detailedLog);
}
