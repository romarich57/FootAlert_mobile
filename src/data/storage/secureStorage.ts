import * as Keychain from 'react-native-keychain';

const USERNAME = 'footalert';

export async function setSecureValue(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(USERNAME, value, { service: key });
}

export async function getSecureValue(key: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({ service: key });

  if (!result) {
    return null;
  }

  return result.password;
}

export async function removeSecureValue(key: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: key });
}
