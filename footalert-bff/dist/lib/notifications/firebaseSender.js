function createDisabledSender() {
    return {
        sendMulticast: async (request) => ({
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
function normalizePrivateKey(rawValue) {
    return rawValue.replace(/\\n/g, '\n');
}
export async function createFirebaseNotificationsSender(options) {
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
    const firebaseAdmin = imported;
    if (!firebaseAdmin.initializeApp || !firebaseAdmin.credential?.cert || !firebaseAdmin.app) {
        return createDisabledSender();
    }
    const appName = 'footalert-notifications-worker';
    const existingApp = (firebaseAdmin.apps ?? []).find((appCandidate) => {
        const maybeName = appCandidate?.name;
        return maybeName === appName;
    });
    if (!existingApp) {
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({
                projectId: options.projectId,
                clientEmail: options.clientEmail,
                privateKey: normalizePrivateKey(options.privateKey),
            }),
            projectId: options.projectId,
        }, appName);
    }
    return {
        sendMulticast: async (request) => {
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
                    token: request.tokens[index],
                    success: response.success,
                    messageId: response.messageId ?? null,
                    errorCode: response.error?.code ?? null,
                    errorMessage: response.error?.message ?? null,
                })),
            };
        },
    };
}
