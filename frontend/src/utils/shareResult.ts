import { Alert, Share } from 'react-native';

/** 결과 공유 문구. 카카오톡 공유(L-03) 전까지 시스템 공유 시트로 보낸다 */
export const buildShareMessage = (menu: { name: string; emoji: string }, reasons: string[]) => {
  const why = reasons.length > 0 ? `\n이유: ${reasons.join(' · ')}` : '';
  return `오늘 메뉴는 ${menu.emoji} ${menu.name}!${why}\n\n메추리가 골라 줬어요 🐣`;
};

export const shareResult = async (menu: { name: string; emoji: string }, reasons: string[]) => {
  try {
    await Share.share({ message: buildShareMessage(menu, reasons) });
  } catch (e) {
    console.log('Share failed', e);
    Alert.alert('공유하지 못했어요', '잠시 후 다시 시도해 주세요.');
  }
};
