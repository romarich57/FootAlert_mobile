export type FirebaseMulticastRequest = {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
};

export type FirebaseMulticastResultItem = {
  token: string;
  success: boolean;
  messageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type FirebaseMulticastResult = {
  successCount: number;
  failureCount: number;
  responses: FirebaseMulticastResultItem[];
};

export type FirebaseNotificationsSender = {
  sendMulticast: (request: FirebaseMulticastRequest) => Promise<FirebaseMulticastResult>;
};

function createDisabledSender(): FirebaseNotificationsSender {
  return {
    sendMulticast: async request => ({
      successCount: 0,
      failureCount: request.tokens.length,
      responses: request.tokens.map(token => ({
        token,
        success: false,
        messageId: null,
        errorCode: 'firebase_not_configured',
        errorMessage: 'Firebase sender is not configured.',
      })),
    }),
  };
}

function normalizePrivateKey(rawValue: string): string {
  return rawValue.replace(/\\n/g, '\n');
}

export async function createFirebaseNotificationsSender(options: {
  projectId: string | null;
  clientEmail: string | null;
  privateKey: string | null;
}): Promise<FirebaseNotificationsSender> {
  if (!options.projectId || !options.clientEmail || !options.privateKey) {
    return createDisabledSender();
  }

  const moduleName = 'firebase-admin';
  const imported = await import(moduleName).catch(error => {
    console.warn('[notifications.sender] firebase-admin unavailable, sender disabled.', error);
    return null;
  });

  if (!imported) {
    return createDisabledSender();
  }

  const firebaseAdmin = imported as {
    apps?: unknown[];
    app?: (name?: string) => { messaging: () => { sendEachForMulticast: (input: Record<string, unknown>) => Promise<{
      responses: Array<{ success: boolean; messageId?: string; error?: { code?: string; message?: string } }>;
      successCount: number;
      failureCount: number;
    }> } };
    credential?: { cert: (credential: Record<string, string>) => unknown };
    initializeApp?: (options: Record<string, unknown>, name?: string) => unknown;
  };

  if (!firebaseAdmin.initializeApp || !firebaseAdmin.credential?.cert || !firebaseAdmin.app) {
    return createDisabledSender();
  }

  const appName = 'footalert-notifications-worker';
  const existingApp = (firebaseAdmin.apps ?? []).find((appCandidate: unknown) => {
    const maybeName = (appCandidate as { name?: string } | undefined)?.name;
    return maybeName === appName;
  });

  if (!existingApp) {
    firebaseAdmin.initializeApp(
      {
        credential: firebaseAdmin.credential.cert({
          projectId: options.projectId,
          clientEmail: options.clientEmail,
          privateKey: normalizePrivateKey(options.privateKey),
        }),
        projectId: options.projectId,
      },
      appName,
    );
  }

  return {
    sendMulticast: async request => {
      const appAccessor = firebaseAdmin.app;
      if (!appAccessor) {
        return createDisabledSender().sendMulticast(request);
      }

      const messaging = appAccessor(appName).messaging();
      const result = await messaging.sendEachForMulticast({
        tokens: request.tokens,
        notification: {
          title: request.title,
          body: request.body,
        },
        data: request.data,
      });

      return {
        successCount: result.successCount,
        failureCount: result.failureCount,
        responses: result.responses.map((response, index) => ({
          token: request.tokens[index] as string,
          success: response.success,
          messageId: response.messageId ?? null,
          errorCode: response.error?.code ?? null,
          errorMessage: response.error?.message ?? null,
        })),
      };
    },
  };
}
