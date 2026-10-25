import { Linking } from 'react-native';

export const BAEMIN_WEB_URL = 'https://m.baemin.com';

export const baeminAppUrl = (menuName: string) => `baemin://search?keyword=${encodeURIComponent(menuName)}`;

/**
 * 배달의민족 앱으로 메뉴를 검색한다. 앱이 없으면 웹을 연다 (US-20).
 * canOpenURL은 Android 11+와 iOS에서 앱 목록 선언이 없으면 항상 false라서 쓰지 않고,
 * 앱 주소를 먼저 열어 보고 실패하면 웹으로 넘어간다.
 * 돌려주는 값: 'app' | 'web' | 'failed'
 */
export const openDelivery = async (menuName: string): Promise<'app' | 'web' | 'failed'> => {
  try {
    await Linking.openURL(baeminAppUrl(menuName));
    return 'app';
  } catch {
    try {
      await Linking.openURL(BAEMIN_WEB_URL);
      return 'web';
    } catch {
      return 'failed';
    }
  }
};
